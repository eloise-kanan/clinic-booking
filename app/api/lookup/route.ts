import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { normalizePhone } from "@/lib/utils";

export async function POST(req: Request) {
  const body = await req.json();
  const { id_type, id_number, whatsapp_number } = body;
  if (!id_type || !id_number || !whatsapp_number) {
    return NextResponse.json({ error: "Missing identification fields" }, { status: 400 });
  }
  const phone = normalizePhone(whatsapp_number);
  const supabase = createAdminClient();

  // Find patient
  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, whatsapp_number")
    .eq("id_type", id_type)
    .eq("id_number", id_number)
    .single();

  if (!patient) return NextResponse.json({ error: "No record found for this ID" }, { status: 404 });
  if (patient.whatsapp_number !== phone) {
    return NextResponse.json(
      { error: "WhatsApp number does not match our records" },
      { status: 403 }
    );
  }

  // Find their most recent confirmed/pending booking
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, doctor_id, slot_start, slot_end, status, doctors(display_name)")
    .eq("patient_id", patient.id)
    .in("status", ["pending", "confirmed"])
    .gte("slot_start", new Date().toISOString())
    .order("slot_start", { ascending: true })
    .limit(1)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "No active appointment found" }, { status: 404 });
  }

  return NextResponse.json({
    booking: {
      id: booking.id,
      doctor_id: booking.doctor_id,
      doctor_name: (booking as any).doctors?.display_name || "",
      slot_start: booking.slot_start,
      slot_end: booking.slot_end,
      status: booking.status,
    },
  });
}
