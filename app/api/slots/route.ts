import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const doctorId = url.searchParams.get("doctor_id");
  const date = url.searchParams.get("date");
  const minutesParam = url.searchParams.get("minutes");
  if (!doctorId || !date) {
    return NextResponse.json({ error: "doctor_id and date are required" }, { status: 400 });
  }
  const supabase = createAdminClient();
  const params: Record<string, unknown> = { p_doctor_id: doctorId, p_date: date };
  if (minutesParam) {
    const parsed = parseInt(minutesParam, 10);
    if (!Number.isNaN(parsed) && parsed > 0) params.p_slot_minutes = parsed;
  }
  const { data, error } = await supabase.rpc("available_slots", params);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ slots: data });
}
