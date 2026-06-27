import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Lightweight list of active staff for the duty calendar.
// Any logged-in active staff member can read this.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("active")
    .eq("id", user.id)
    .single();
  if (!profile?.active) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const [profilesRes, doctorsRes, hoursRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, role")
      .eq("active", true)
      .in("role", ["doctor", "nurse"])
      .order("full_name"),
    admin.from("doctors").select("id, profile_id").eq("active", true),
    admin.from("working_hours").select("doctor_id, weekday, start_time, end_time"),
  ]);
  if (profilesRes.error) return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });

  // Map profile_id → doctor_id → list of weekday blocks, then collapse to a
  // "typical hours" string per profile (earliest start–latest end across the
  // doctor's recurring weekday rows). Nurses share the clinic default and
  // get an empty hours field — the UI falls back to "09:00–21:00".
  const profileToDoctorId = new Map<string, string>();
  (doctorsRes.data || []).forEach((d) => {
    if (d.profile_id) profileToDoctorId.set(d.profile_id, d.id);
  });
  const hoursByDoctor = new Map<string, { start_time: string; end_time: string }[]>();
  (hoursRes.data || []).forEach((h) => {
    if (!hoursByDoctor.has(h.doctor_id)) hoursByDoctor.set(h.doctor_id, []);
    hoursByDoctor.get(h.doctor_id)!.push({ start_time: h.start_time, end_time: h.end_time });
  });

  function summarize(blocks: { start_time: string; end_time: string }[]): string | null {
    if (!blocks.length) return null;
    let minStart = blocks[0].start_time;
    let maxEnd = blocks[0].end_time;
    for (const b of blocks) {
      if (b.start_time < minStart) minStart = b.start_time;
      if (b.end_time > maxEnd) maxEnd = b.end_time;
    }
    return `${minStart.slice(0, 5)}–${maxEnd.slice(0, 5)}`;
  }

  const staff = (profilesRes.data || []).map((p) => {
    let typical_hours: string | null = null;
    if (p.role === "doctor") {
      const docId = profileToDoctorId.get(p.id);
      if (docId) typical_hours = summarize(hoursByDoctor.get(docId) || []);
    }
    return { id: p.id, full_name: p.full_name, role: p.role, typical_hours };
  });
  return NextResponse.json({ staff });
}
