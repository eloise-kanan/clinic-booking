import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { resolveActor } from "@/lib/pin";

// POST /api/bookings/reminder-sent
// body: { booking_id, pin_profile_id?, pin? }
// Marks the reminder as sent by the current staff member (or PIN holder on
// the shared terminal). Idempotent — re-clicking refreshes timestamp + actor.
// Nurse-only — front-desk task.
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
  const { booking_id } = body;
  if (!booking_id) return NextResponse.json({ error: "booking_id required" }, { status: 400 });

  const actor = await resolveActor(user.id, body, { allowedPinRoles: ["nurse"] });
  if (!actor.ok) return NextResponse.json({ error: actor.error }, { status: actor.status });

  const admin = createAdminClient();
  const { error } = await admin
    .from("bookings")
    .update({
      reminder_sent_at: new Date().toISOString(),
      reminder_sent_by: actor.actorId,
    })
    .eq("id", booking_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: actor.actorId,
    action: "wa_reminder_sent",
    entity_type: "booking",
    entity_id: booking_id,
    after_data: { via_terminal: actor.isTerminal },
  });

  return NextResponse.json({ ok: true });
}
