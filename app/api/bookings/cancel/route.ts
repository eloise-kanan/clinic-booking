import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { resolveActor } from "@/lib/pin";

// Staff-driven cancellation. Nurse-only — owner can also use override.
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
  if (!booking_id) return NextResponse.json({ error: "booking_id is required" }, { status: 400 });

  const actor = await resolveActor(user.id, body, { allowedPinRoles: ["nurse"] });
  if (!actor.ok) return NextResponse.json({ error: actor.error }, { status: actor.status });

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("bookings")
    .select("id, status")
    .eq("id", booking_id)
    .single();
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["pending", "confirmed"].includes(before.status)) {
    return NextResponse.json({ error: `Cannot cancel a ${before.status} booking` }, { status: 409 });
  }

  const { error } = await admin
    .from("bookings")
    .update({
      status: "cancelled",
      reviewed_at: new Date().toISOString(),
      reviewed_by: actor.actorId,
      reviewer_notes: notes ? `[STAFF CANCEL] ${notes}` : "[STAFF CANCEL]",
    })
    .eq("id", booking_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: actor.actorId,
    action: "staff_cancel",
    entity_type: "booking",
    entity_id: booking_id,
    before_data: { status: before.status },
    after_data: { status: "cancelled", notes, via_terminal: actor.isTerminal },
  });

  return NextResponse.json({ ok: true });
}
