import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { resolveActor } from "@/lib/pin";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .single();
  if (!profile?.active || !["nurse", "owner", "terminal"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { booking_id, notes } = body;

  // Booking reject is nurse-only — same clinic policy as approve.
  const actor = await resolveActor(user.id, body, { allowedPinRoles: ["nurse"] });
  if (!actor.ok) return NextResponse.json({ error: actor.error }, { status: actor.status });

  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("status, type")
    .eq("id", booking_id)
    .single();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.status !== "pending") {
    return NextResponse.json({ error: "Already processed" }, { status: 409 });
  }

  const { error } = await admin
    .from("bookings")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: actor.actorId,
      reviewer_notes: notes || null,
    })
    .eq("id", booking_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: actor.actorId,
    action: `reject_${booking.type}`,
    entity_type: "booking",
    entity_id: booking_id,
    after_data: { status: "rejected", notes, via_terminal: actor.isTerminal },
  });

  return NextResponse.json({ ok: true });
}
