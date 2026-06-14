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

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, role, full_name, active")
    .order("role");

  // For each doctor profile, fetch their doctor row
  const { data: doctors } = await admin
    .from("doctors")
    .select("id, profile_id, display_name, default_slot_minutes, active");

  // Auth user emails
  const { data: authUsers } = await admin.auth.admin.listUsers();
  const emailById = new Map<string, string>();
  authUsers?.users?.forEach((u) => {
    if (u.id && u.email) emailById.set(u.id, u.email);
  });

  const enriched = (profiles || []).map((p) => ({
    ...p,
    email: emailById.get(p.id) || "",
    doctor: doctors?.find((d) => d.profile_id === p.id) || null,
  }));

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
