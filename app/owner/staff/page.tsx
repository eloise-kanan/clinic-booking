import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import { loadPlan } from "@/lib/branding-server";
import { SEAT_CAPS, PLAN_LABELS, type Plan } from "@/lib/plan";
import StaffManager from "./StaffManager";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const { profile } = await requireStaff(["owner"]);
  const admin = createAdminClient();
  const plan = (await loadPlan()) as Plan;
  const caps = SEAT_CAPS[plan];

  const [profilesRes, doctorsRes, authUsersRes, hoursRes, recentLeavesRes, recentShiftsRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id, role, full_name, active, login_id, pin_hash, annual_leave_balance, mc_balance, emergency_balance")
      .order("role"),
    admin.from("doctors").select("id, profile_id, display_name, default_slot_minutes, active"),
    admin.auth.admin.listUsers(),
    admin.from("working_hours").select("doctor_id, weekday, start_time, end_time"),
    admin
      .from("leave_requests")
      .select("id, profile_id, start_date, end_date, status, leave_type, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("duty_shifts")
      .select("id, profile_id, shift_date, start_time, end_time, status, is_permanent, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const profiles = profilesRes.data;
  const doctors = doctorsRes.data;
  const authUsers = authUsersRes.data;

  const emailById = new Map<string, string>();
  authUsers?.users?.forEach((u) => {
    if (u.id && u.email) emailById.set(u.id, u.email);
  });

  // Index working hours by doctor_id → weekday list
  const hoursByDoctor = new Map<string, { weekday: number; start_time: string; end_time: string }[]>();
  (hoursRes.data || []).forEach((h) => {
    if (!hoursByDoctor.has(h.doctor_id)) hoursByDoctor.set(h.doctor_id, []);
    hoursByDoctor.get(h.doctor_id)!.push({
      weekday: h.weekday,
      start_time: h.start_time,
      end_time: h.end_time,
    });
  });

  // Mix leave + shift history per-profile, keep the 5 most recent each.
  type HistoryItem = {
    type: "leave" | "shift";
    id: string;
    status: string;
    label: string;
    sub: string;
    created_at: string;
  };
  const historyByProfile = new Map<string, HistoryItem[]>();
  (recentLeavesRes.data || []).forEach((r) => {
    const arr = historyByProfile.get(r.profile_id) || [];
    arr.push({
      type: "leave",
      id: r.id,
      status: r.status,
      label: `Leave — ${r.leave_type}`,
      sub: r.start_date === r.end_date ? r.start_date : `${r.start_date} → ${r.end_date}`,
      created_at: r.created_at,
    });
    historyByProfile.set(r.profile_id, arr);
  });
  (recentShiftsRes.data || []).forEach((r) => {
    const arr = historyByProfile.get(r.profile_id) || [];
    arr.push({
      type: "shift",
      id: r.id,
      status: r.status,
      label: r.is_permanent ? "Shift change (permanent)" : "Shift change",
      sub: `${r.shift_date} · ${r.start_time.slice(0, 5)}–${r.end_time.slice(0, 5)}`,
      created_at: r.created_at,
    });
    historyByProfile.set(r.profile_id, arr);
  });
  historyByProfile.forEach((arr, k) => {
    arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
    historyByProfile.set(k, arr.slice(0, 5));
  });

  const enriched = (profiles || []).map((p) => {
    const doc = doctors?.find((d) => d.profile_id === p.id) || null;
    return {
      id: p.id,
      role: p.role,
      full_name: p.full_name,
      active: p.active,
      login_id: p.login_id,
      email: emailById.get(p.id) || "",
      pin_set: !!p.pin_hash,
      doctor: doc,
      working_hours: doc?.id ? hoursByDoctor.get(doc.id) || [] : [],
      balances: {
        annual: p.annual_leave_balance ?? 14,
        mc: p.mc_balance ?? 14,
        emergency: p.emergency_balance ?? 5,
      },
      history: historyByProfile.get(p.id) || [],
    };
  });

  // Active seat usage for the meter strip
  const activeDoctors = enriched.filter((p) => p.role === "doctor" && p.active).length;
  const activeNurses = enriched.filter((p) => p.role === "nurse" && p.active).length;

  return (
    <StaffShell
      role="owner"
      userName={profile.full_name}
      nav={await staffNav(profile.role)}
    >
      <h2 className="text-base font-medium mb-1">Doctors & nurses</h2>
      <p className="text-xs text-stone-500 mb-4">
        Add or deactivate staff accounts. New users receive their login credentials by email.
      </p>

      {/* Seat usage strip — shows the per-role cap of the current plan and
          how many are currently active. Deactivated staff don't consume a seat. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <SeatMeter label="Doctors" used={activeDoctors} cap={caps.doctor} />
        <SeatMeter label="Nurses" used={activeNurses} cap={caps.nurse} />
      </div>
      <p className="text-[11px] text-stone-500 mb-4">
        Plan: <strong>{PLAN_LABELS[plan]}</strong>. Need more seats without upgrading the
        whole tier? Ping us on WhatsApp and we&apos;ll top up your account.
      </p>

      <StaffManager initial={enriched} />
    </StaffShell>
  );
}

function SeatMeter({ label, used, cap }: { label: string; used: number; cap: number }) {
  const full = used >= cap;
  const pct = Math.min(100, (used / cap) * 100);
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-3">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-medium text-stone-700">{label}</span>
        <span className={`text-xs ${full ? "text-red-700 font-semibold" : "text-stone-600"}`}>
          {used} / {cap}
          {full && " · full"}
        </span>
      </div>
      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${full ? "bg-red-500" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
