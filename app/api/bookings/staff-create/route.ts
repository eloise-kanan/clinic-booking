import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { normalizePhone, validateBookingInput } from "@/lib/utils";
import { resolveActor } from "@/lib/pin";

// Staff create / reschedule on behalf of a patient. Nurse-only. On the
// shared terminal, a nurse PIN is required and is recorded as the booker.
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
  const actor = await resolveActor(user.id, body, { allowedPinRoles: ["nurse"] });
  if (!actor.ok) return NextResponse.json({ error: actor.error }, { status: actor.status });
  const {
    nationality,
    id_type,
    id_number,
    whatsapp_number,
    is_first_time,
    doctor_id,
    slot_start,
    visit_reason,
    parent_booking_id,
    slot_minutes,
  } = body;
  // Normalise name to ALL CAPS on the server too — defensive against any
  // caller that bypasses the client's uppercase enforcement.
  const full_name = typeof body.full_name === "string" ? body.full_name.trim().toUpperCase() : body.full_name;

  const validationError = validateBookingInput({
    full_name,
    nationality,
    id_type,
    id_number,
    whatsapp_number,
  });
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  if (!doctor_id) return NextResponse.json({ error: "Doctor is required" }, { status: 400 });
  if (!slot_start) return NextResponse.json({ error: "Slot is required" }, { status: 400 });

  const phone = normalizePhone(whatsapp_number);
  const admin = createAdminClient();

  // Upsert patient — staff input wins for fields that change
  let patientId: string;
  const { data: existing } = await admin
    .from("patients")
    .select("id")
    .eq("id_type", id_type)
    .eq("id_number", id_number)
    .maybeSingle();

  if (existing) {
    patientId = existing.id;
    await admin
      .from("patients")
      .update({ whatsapp_number: phone, full_name, nationality })
      .eq("id", patientId);
  } else {
    const { data: created, error: pErr } = await admin
      .from("patients")
      .insert({ full_name, nationality, id_type, id_number, whatsapp_number: phone })
      .select("id")
      .single();
    if (pErr || !created) {
      return NextResponse.json({ error: pErr?.message || "Could not create patient" }, { status: 500 });
    }
    patientId = created.id;
  }

  // Look up doctor for fallback slot length
  const { data: doctor } = await admin
    .from("doctors")
    .select("id, default_slot_minutes")
    .eq("id", doctor_id)
    .single();
  if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

  const requestedMinutes = Number.isInteger(slot_minutes) && slot_minutes > 0 ? slot_minutes : null;
  const effectiveMinutes = requestedMinutes ?? doctor.default_slot_minutes;
  const startMs = new Date(slot_start).getTime();
  const endMs = startMs + effectiveMinutes * 60 * 1000;
  const slot_end = new Date(endMs).toISOString();

  // For a reschedule, cancel the parent first so the original slot frees up
  // (and the unique-overlap index doesn't trip if the new slot equals the old).
  if (parent_booking_id) {
    await admin.from("bookings").update({ status: "cancelled" }).eq("id", parent_booking_id);
  }

  const bookingType = parent_booking_id ? "reschedule" : "booking";

  const { data: inserted, error: bErr } = await admin
    .from("bookings")
    .insert({
      patient_id: patientId,
      doctor_id,
      type: bookingType,
      status: "confirmed",
      slot_start,
      slot_end,
      visit_reason: visit_reason || null,
      is_first_time: !!is_first_time,
      parent_booking_id: parent_booking_id || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: actor.actorId,
      reviewer_notes: "[STAFF BOOKING]",
    })
    .select("id")
    .single();

  if (bErr) {
    if (bErr.code === "23505") {
      return NextResponse.json(
        { error: "That slot is already taken. Please pick another." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: bErr.message }, { status: 500 });
  }

  // visit_count is no longer touched on booking creation. It now reflects
  // actual attended visits only and is updated by /api/bookings/attendance.

  await admin.from("audit_log").insert({
    actor_id: actor.actorId,
    action: parent_booking_id ? "staff_reschedule" : "staff_create",
    entity_type: "booking",
    entity_id: inserted?.id,
    after_data: { status: "confirmed", parent_booking_id: parent_booking_id || null, via_terminal: actor.isTerminal },
  });

  return NextResponse.json({ ok: true, booking_id: inserted?.id });
}
