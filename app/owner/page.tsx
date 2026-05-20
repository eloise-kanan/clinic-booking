import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";

export const dynamic = "force-dynamic";

export default async function OwnerHome() {
  const { profile } = await requireStaff(["owner"]);
  const admin = createAdminClient();

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const { count: weekCount } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .gte("created_at", weekStart.toISOString());

  const { count: pendingCount } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: patientCount } = await admin
    .from("patients")
    .select("id", { count: "exact", head: true });

  const { data: repeatPatients } = await admin
    .from("patients")
    .select("id")
    .gt("visit_count", 1);

  const repeatRate = patientCount && patientCount > 0 ? Math.round(((repeatPatients?.length || 0) / patientCount) * 100) : 0;

  return (
    <StaffShell
      role="owner"
      userName={profile.full_name}
      nav={await staffNav(profile.role)}
    >
      <h2 className="text-base font-medium mb-4">Clinic overview</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="This week" value={String(weekCount || 0)} sub="bookings" />
        <Stat label="Pending" value={String(pendingCount || 0)} sub="awaiting nurse" />
        <Stat label="Total patients" value={String(patientCount || 0)} sub="" />
        <Stat label="Repeat rate" value={`${repeatRate}%`} sub="returning patients" />
      </div>

      <p className="text-sm text-stone-600">
        Use the navigation to drill into utilization heatmaps, patient demographics, all bookings, and staff
        management. As the owner, you can override any booking — confirm, reject, reschedule, or cancel —
        from the All bookings page.
      </p>
    </StaffShell>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="text-2xl font-medium mt-0.5">{value}</div>
      {sub && <div className="text-xs text-stone-500 mt-0.5">{sub}</div>}
    </div>
  );
}
