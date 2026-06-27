import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { resolveActor } from "@/lib/pin";

// POST /api/bookings/check-in
// body: { booking_id, room, pin_profile_id?, pin? }
// Premium feature — nurse checks the patient in to a specific room when
// they arrive. Sets bookings.room + checked_in_at + checked_in_by. Distinct
// from /attendance (which fires at visit end to mark attended/no-show).
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role, active").eq("id", user.id).single();
  if (!profile?.active || !["nurse", "owner", "terminal"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { booking_id, room } = body;
  if (!booking_id || !room || typeof room !== "string") {
    return NextResponse.json({ error: "booking_id and room are required" }, { status: 400 });
  }

  // Nurse PIN required from the terminal — check-in is a front-desk action.
  const actor = await resolveActor(user.id, body, { allowedPinRoles: ["nurse"] });
  if (!actor.ok) return NextResponse.json({ error: actor.error }, { status: actor.status });

  const admin = createAdminClient();
  const { error } = await admin
    .from("bookings")
    .update({
      room,
      checked_in_at: new Date().toISOString(),
      checked_in_by: actor.actorId,
    })
    .eq("id", booking_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: actor.actorId,
    action: "patient_check_in",
    entity_type: "booking",
    entity_id: booking_id,
    after_data: { room, via_terminal: actor.isTerminal },
  });

  return NextResponse.json({ ok: true });
}
