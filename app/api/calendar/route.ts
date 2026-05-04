import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(req: Request) {
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
  if (!profile?.active) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const daysParam = url.searchParams.get("days");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const days = Math.max(1, Math.min(31, parseInt(daysParam || "1", 10) || 1));
  const dayStart = new Date(date + "T00:00:00").toISOString();
  const endDate = new Date(date + "T00:00:00");
  endDate.setDate(endDate.getDate() + days - 1);
  const dayEnd = new Date(endDate.toISOString().slice(0, 10) + "T23:59:59").toISOString();

  const admin = createAdminClient();
  let query = admin
    .from("bookings")
    .select(
      "id, doctor_id, slot_start, slot_end, status, type, visit_reason, patient:patients(full_name)"
    )
    .gte("slot_start", dayStart)
    .lte("slot_start", dayEnd)
    .in("status", ["pending", "confirmed"])
    .order("slot_start");

  let scopedDoctorId: string | null = null;
  if (profile.role === "doctor") {
    const { data: doc } = await admin.from("doctors").select("id").eq("profile_id", user.id).single();
    if (doc) {
      scopedDoctorId = doc.id;
      query = query.eq("doctor_id", doc.id);
    }
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compute (doctor_id × date) pairs for any approved leave overlapping the range,
  // so the client can flag the doctor's column as "On leave" that day.
  const startDateStr = date;
  const endDateStr = endDate.toISOString().slice(0, 10);

  const { data: doctorsData } = await admin.from("doctors").select("id, profile_id").eq("active", true);
  const profileToDoctor = new Map<string, string>();
  doctorsData?.forEach((d) => {
    if (d.profile_id) profileToDoctor.set(d.profile_id, d.id);
  });

  const { data: leaves } = await admin
    .from("leave_requests")
    .select("profile_id, start_date, end_date")
    .eq("status", "approved")
    .lte("start_date", endDateStr)
    .gte("end_date", startDateStr);

  const onLeave: { doctor_id: string; date: string }[] = [];
  leaves?.forEach((lr) => {
    const doctorId = profileToDoctor.get(lr.profile_id);
    if (!doctorId) return;
    if (scopedDoctorId && scopedDoctorId !== doctorId) return;
    const rangeStart = new Date(
      Math.max(
        new Date(lr.start_date + "T00:00:00").getTime(),
        new Date(startDateStr + "T00:00:00").getTime()
      )
    );
    const rangeEnd = new Date(
      Math.min(
        new Date(lr.end_date + "T00:00:00").getTime(),
        new Date(endDateStr + "T00:00:00").getTime()
      )
    );
    for (const d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      onLeave.push({ doctor_id: doctorId, date: dStr });
    }
  });

  // Approved custom shifts override the default 9–9 duty for that doctor on that day.
  // Anything outside the shift window is "off duty" and should be greyed out.
  const { data: shiftsData } = await admin
    .from("duty_shifts")
    .select("profile_id, shift_date, start_time, end_time")
    .eq("status", "approved")
    .gte("shift_date", startDateStr)
    .lte("shift_date", endDateStr);

  const customShifts: {
    doctor_id: string;
    date: string;
    start_time: string;
    end_time: string;
  }[] = [];
  shiftsData?.forEach((s) => {
    const doctorId = profileToDoctor.get(s.profile_id);
    if (!doctorId) return;
    if (scopedDoctorId && scopedDoctorId !== doctorId) return;
    customShifts.push({
      doctor_id: doctorId,
      date: s.shift_date,
      start_time: s.start_time,
      end_time: s.end_time,
    });
  });

  return NextResponse.json({ bookings: data, onLeave, customShifts });
}
