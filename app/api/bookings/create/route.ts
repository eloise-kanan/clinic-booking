import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { normalizePhone, validateBookingInput } from "@/lib/utils";

export async function POST(req: Request) {
  const body = await req.json();
  const {
    type,
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
  // Normalise name to ALL CAPS on the server — patient-facing form already
  // uppercases, but defensive for any caller that bypasses the UI.
  const full_name = typeof body.full_name === "string" ? body.full_name.trim().toUpperCase() : body.full_name;

  // Validate identity fields
  const validationError = validateBookingInput({
    full_name,
    nationality,
    id_type,
    id_number,
    whatsapp_number,
  });
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const phone = normalizePhone(whatsapp_number);
  const supabase = createAdminClient();

  // Upsert patient
  let patientId: string;
  const { data: existing } = await supabase
    .from("patients")
    .select("id, visit_count")
    .eq("id_type", id_type)
    .eq("id_number", id_number)
    .maybeSingle();

  if (existing) {
    patientId = existing.id;
    // Update phone & name in case it changed
    await supabase
      .from("patients")
      .update({ whatsapp_number: phone, full_name, nationality })
      .eq("id", patientId);
  } else {
    const { data: created, error: pErr } = await supabase
      .from("patients")
      .insert({ full_name, nationality, id_type, id_number, whatsapp_number: phone })
      .select("id")
      .single();
    if (pErr || !created) {
      return NextResponse.json({ error: pErr?.message || "Could not create patient" }, { status: 500 });
    }
    patientId = created.id;
  }

  // Rate limit: max 2 active bookings per patient
  const { count: activeCount } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .in("status", ["pending", "confirmed"]);
  if ((activeCount || 0) >= 2 && type === "booking") {
    return NextResponse.json(
      { error: "You already have 2 active bookings. Please cancel or reschedule first." },
      { status: 429 }
    );
  }

  // Branch by type
  if (type === "cancellation") {
    if (!parent_booking_id) {
      return NextResponse.json({ error: "Missing booking reference" }, { status: 400 });
    }
    // Insert a cancellation request linked to the parent booking
    const { data: parent } = await supabase
      .from("bookings")
      .select("doctor_id, slot_start, slot_end")
      .eq("id", parent_booking_id)
      .single();
    if (!parent) return NextResponse.json({ error: "Parent booking not found" }, { status: 404 });

    const { error } = await supabase.from("bookings").insert({
      patient_id: patientId,
      doctor_id: parent.doctor_id,
      type: "cancellation",
      status: "pending",
      slot_start: parent.slot_start,
      slot_end: parent.slot_end,
      parent_booking_id,
      visit_reason: "Cancellation request",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Booking or reschedule — both need a slot
  if (!slot_start) return NextResponse.json({ error: "Slot is required" }, { status: 400 });

  let finalDoctorId = doctor_id;
  if (!finalDoctorId && type === "booking") {
    return NextResponse.json({ error: "Doctor is required" }, { status: 400 });
  }

  // Compute slot_end. Prefer the treatment-driven slot_minutes from the
  // public form; fall back to the doctor's default_slot_minutes.
  const { data: doctor } = await supabase
    .from("doctors")
    .select("id, default_slot_minutes")
    .eq("id", finalDoctorId)
    .single();
  if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

  const requestedMinutes = Number.isInteger(slot_minutes) && slot_minutes > 0 ? slot_minutes : null;
  const effectiveMinutes = requestedMinutes ?? doctor.default_slot_minutes;
  const startMs = new Date(slot_start).getTime();
  const endMs = startMs + effectiveMinutes * 60 * 1000;
  const slot_end = new Date(endMs).toISOString();

  // Insert booking — DB unique index prevents overlap
  const { error: bErr } = await supabase.from("bookings").insert({
    patient_id: patientId,
    doctor_id: finalDoctorId,
    type,
    status: "pending",
    slot_start,
    slot_end,
    visit_reason: visit_reason || null,
    is_first_time: !!is_first_time,
    parent_booking_id: parent_booking_id || null,
  });

  if (bErr) {
    // Likely a slot collision
    if (bErr.code === "23505") {
      return NextResponse.json(
        { error: "That slot was just taken. Please pick another." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: bErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
