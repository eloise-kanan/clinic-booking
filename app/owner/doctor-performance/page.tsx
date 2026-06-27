import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import { loadPlan } from "@/lib/branding-server";
import { hasFeature, type Plan } from "@/lib/plan";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

type DoctorPerf = {
  id: string;
  name: string;
  bookings: number;
  attended: number;
  noShow: number;
  cancelled: number;
  attendanceRate: number | null;
};

function pct(num: number, den: number): number | null {
  if (den === 0) return null;
  return Math.round((num / den) * 100);
}

export default async function DoctorPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { profile } = await requireStaff(["owner"]);
  const plan = (await loadPlan()) as Plan;
  if (!hasFeature(plan, "analytics.doctor_perf")) redirect("/home");
  const params = await searchParams;
  const days = Math.max(1, Math.min(365, parseInt(params?.days || "30", 10) || 30));
  const admin = createAdminClient();

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  // Pull every doctor + every booking in the window with their attendance state.
  const [{ data: doctors }, { data: rows }] = await Promise.all([
    admin.from("doctors").select("id, display_name").eq("active", true),
    admin
      .from("bookings")
      .select("doctor_id, status, attended_at, no_show, slot_start")
      .gte("slot_start", sinceIso),
  ]);

  const byDoctor = new Map<string, DoctorPerf>();
  (doctors || []).forEach((d) => {
    byDoctor.set(d.id, {
      id: d.id,
      name: d.display_name,
      bookings: 0,
      attended: 0,
      noShow: 0,
      cancelled: 0,
      attendanceRate: null,
    });
  });
  (rows || []).forEach((r) => {
    const entry = byDoctor.get(r.doctor_id);
    if (!entry) return; // booking against an inactive/deleted doctor
    entry.bookings++;
    if (r.attended_at) entry.attended++;
    if (r.no_show) entry.noShow++;
    if (r.status === "cancelled") entry.cancelled++;
  });
  byDoctor.forEach((d) => {
    d.attendanceRate = pct(d.attended, d.attended + d.noShow);
  });

  const list = Array.from(byDoctor.values()).sort((a, b) => b.bookings - a.bookings);

  // Clinic-wide totals
  const totalBookings = list.reduce((s, d) => s + d.bookings, 0);
  const totalAttended = list.reduce((s, d) => s + d.attended, 0);
  const totalNoShow = list.reduce((s, d) => s + d.noShow, 0);
  const totalCancelled = list.reduce((s, d) => s + d.cancelled, 0);
  const clinicAttendanceRate = pct(totalAttended, totalAttended + totalNoShow);

  const { count: pendingBookings } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <StaffShell role="owner" userName={profile.full_name} nav={await staffNav(profile.role, pendingBookings || 0)}>
      <h2 className="text-base font-medium mb-1">Doctor performance</h2>
      <p className="text-xs text-stone-500 mb-4">
        Per-doctor activity in the last {days} days. Attendance rate excludes pending +
        cancelled bookings (only attended vs no-show count toward the rate).
      </p>

      {/* Window selector */}
      <div className="flex gap-2 mb-4 text-xs">
        {[7, 30, 90, 180].map((d) => (
          <Link
            key={d}
            href={`/owner/doctor-performance?days=${d}`}
            className={`px-3 py-1.5 rounded-md border ${
              d === days
                ? "bg-stone-900 text-white border-stone-900"
                : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
            }`}
          >
            Last {d} days
          </Link>
        ))}
      </div>

      {/* Clinic-wide summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <MetricCard label="Total bookings" value={totalBookings} />
        <MetricCard label="Attended" value={totalAttended} tone="emerald" />
        <MetricCard label="No-shows" value={totalNoShow} tone="red" />
        <MetricCard
          label="Attendance rate"
          value={clinicAttendanceRate === null ? "—" : `${clinicAttendanceRate}%`}
        />
      </div>

      {/* Per-doctor table */}
      <div className="bg-white border border-stone-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
              <th className="px-4 py-2.5 font-medium">Doctor</th>
              <th className="px-4 py-2.5 font-medium text-right">Bookings</th>
              <th className="px-4 py-2.5 font-medium text-right">Attended</th>
              <th className="px-4 py-2.5 font-medium text-right">No-show</th>
              <th className="px-4 py-2.5 font-medium text-right">Cancelled</th>
              <th className="px-4 py-2.5 font-medium text-right">Attendance %</th>
            </tr>
          </thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.id} className="border-b border-stone-100 last:border-b-0">
                <td className="px-4 py-3 font-medium">{d.name}</td>
                <td className="px-4 py-3 text-right">{d.bookings}</td>
                <td className="px-4 py-3 text-right text-emerald-700">{d.attended}</td>
                <td className="px-4 py-3 text-right text-red-700">{d.noShow}</td>
                <td className="px-4 py-3 text-right text-stone-500">{d.cancelled}</td>
                <td className="px-4 py-3 text-right">
                  {d.attendanceRate === null ? (
                    <span className="text-stone-400">—</span>
                  ) : (
                    <span
                      className={
                        d.attendanceRate >= 85
                          ? "text-emerald-700 font-medium"
                          : d.attendanceRate >= 70
                            ? "text-amber-700"
                            : "text-red-700"
                      }
                    >
                      {d.attendanceRate}%
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-400 text-xs">
                  No active doctors yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </StaffShell>
  );
}

function MetricCard({
  label,
  value,
  tone = "stone",
}: {
  label: string;
  value: number | string;
  tone?: "stone" | "emerald" | "red";
}) {
  const toneClass =
    tone === "emerald" ? "text-emerald-700" : tone === "red" ? "text-red-700" : "text-stone-900";
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
      <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
