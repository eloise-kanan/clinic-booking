import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { resolveActor } from "@/lib/pin";

// POST /api/bookings/check-out
// body: { booking_id, treatment_done, pin_profile_id?, pin? }
// Premium feature — doctor marks a patient out after their visit. Sets
// checked_out_at + checked_out_by + treatment_done. Also auto-marks the
// booking as attended (since check-out implies the visit happened) so the
// existing attendance reporting / visit_count + recall logic still works.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role, active").eq("id", user.id).single();
  if (!profile?.active || !["doctor", "nurse", "owner", "terminal"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { booking_id, treatment_done } = body;
  if (!booking_id) {
    return NextResponse.json({ error: "booking_id is required" }, { status: 400 });
  }

  // Check-out is a doctor action (they record what was done).
  const actor = await resolveActor(user.id, body, { allowedPinRoles: ["doctor"] });
  if (!actor.ok) return NextResponse.json({ error: actor.error }, { status: actor.status });

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: prev } = await admin
    .from("bookings")
    .select("patient_id, attended_at")
    .eq("id", booking_id)
    .maybeSingle();
  const wasAttended = !!prev?.attended_at;

  const { error } = await admin
    .from("bookings")
    .update({
      checked_out_at: now,
      checked_out_by: actor.actorId,
      treatment_done: treatment_done || null,
      // Check-out implies the patient was seen; mark attended if not already.
      attended_at: prev?.attended_at || now,
      attended_by: actor.actorId,
      no_show: false,
      no_show_at: null,
      no_show_by: null,
    })
    .eq("id", booking_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Increment visit_count + last_visit_at if this is the first time the
  // booking is being marked attended (matches /attendance behaviour).
  if (prev?.patient_id && !wasAttended) {
    const { data: pat } = await admin
      .from("patients")
      .select("visit_count")
      .eq("id", prev.patient_id)
      .maybeSingle();
    await admin
      .from("patients")
      .update({
        visit_count: (pat?.visit_count || 0) + 1,
        last_visit_at: now,
        recall_reminder_sent_at: null,
      })
      .eq("id", prev.patient_id);
  }

  await admin.from("audit_log").insert({
    actor_id: actor.actorId,
    action: "patient_check_out",
    entity_type: "booking",
    entity_id: booking_id,
    after_data: { treatment_done, via_terminal: actor.isTerminal },
  });

  return NextResponse.json({ ok: true });
}
