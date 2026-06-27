import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { normalizeIc } from "@/lib/utils";

// POST /api/patients/lookup-public
// body: { nationality, id_type, id_number }
// Public — no auth required. Used by the /book patient flow to detect whether
// this is a returning patient so we can greet them by name + suggest their
// last doctor. Returns only the minimum needed for that UI; full_name is
// echoed back so the form can confirm the spelling.

export async function POST(req: Request) {
  const { nationality, id_type, id_number } = await req.json();
  if (!id_type || !id_number || !nationality) {
    return NextResponse.json({ error: "id_type, id_number, nationality required" }, { status: 400 });
  }
  const normalized = id_type === "ic" ? normalizeIc(id_number) : String(id_number).trim();
  if (!normalized) return NextResponse.json({ existing: false });

  const admin = createAdminClient();
  const { data: patient } = await admin
    .from("patients")
    .select("id, full_name, last_visit_at, visit_count")
    .eq("id_type", id_type)
    .eq("id_number", normalized)
    .maybeSingle();

  if (!patient) return NextResponse.json({ existing: false });

  // Find their most recent confirmed/attended booking to surface the doctor.
  const { data: lastBooking } = await admin
    .from("bookings")
    .select("doctor_id, slot_start, doctor:doctors(id, display_name)")
    .eq("patient_id", patient.id)
    .in("status", ["confirmed", "completed"])
    .order("slot_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  const doctor = lastBooking?.doctor as { id?: string; display_name?: string } | { id?: string; display_name?: string }[] | null;
  const doc = Array.isArray(doctor) ? doctor[0] : doctor;

  return NextResponse.json({
    existing: true,
    full_name: patient.full_name,
    visit_count: patient.visit_count || 0,
    last_visit_at: patient.last_visit_at,
    last_doctor: doc ? { id: doc.id, display_name: doc.display_name } : null,
  });
}
