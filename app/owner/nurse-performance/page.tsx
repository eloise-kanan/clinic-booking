import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import Link from "next/link";

export const dynamic = "force-dynamic";

type NursePerf = {
  id: string;
  name: string;
  bookingsCreated: number;
  approvals: number;
  remindersSent: number;
  recallsSent: number;
  attendanceMarked: number;
  total: number;
};

const APPROVAL_ACTIONS = new Set([
  "approve_booking",
  "approve_reschedule",
  "approve_cancellation",
  "approve_check",
]);
const ATTENDANCE_ACTIONS = new Set(["booking_attended", "booking_no_show", "booking_clear"]);

export default async function NursePerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { profile } = await requireStaff(["owner"]);
  const params = await searchParams;
  const days = Math.max(1, Math.min(365, parseInt(params?.days || "30", 10) || 30));
  const admin = createAdminClient();

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  // Get nurses + audit log entries in the window + reminders attributed to them.
  const [{ data: nurses }, { data: audits }, { data: reminderRows }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name")
      .eq("role", "nurse")
      .eq("active", true)
      .order("full_name"),
    admin
      .from("audit_log")
      .select("actor_id, action")
      .gte("created_at", sinceIso),
    admin
      .from("bookings")
      .select("reminder_sent_by")
      .gte("reminder_sent_at", sinceIso)
      .not("reminder_sent_by", "is", null),
  ]);

  const byNurse = new Map<string, NursePerf>();
  (nurses || []).forEach((n) => {
    byNurse.set(n.id, {
      id: n.id,
      name: n.full_name,
      bookingsCreated: 0,
      approvals: 0,
      remindersSent: 0,
      recallsSent: 0,
      attendanceMarked: 0,
      total: 0,
    });
  });
  (audits || []).forEach((a) => {
    const entry = byNurse.get(a.actor_id);
    if (!entry) return;
    if (a.action === "staff_create" || a.action === "staff_reschedule") entry.bookingsCreated++;
    else if (APPROVAL_ACTIONS.has(a.action)) entry.approvals++;
    else if (a.action === "patient_recall_sent") entry.recallsSent++;
    else if (ATTENDANCE_ACTIONS.has(a.action)) entry.attendanceMarked++;
  });
  (reminderRows || []).forEach((r) => {
    const entry = byNurse.get(r.reminder_sent_by);
    if (entry) entry.remindersSent++;
  });
  byNurse.forEach((n) => {
    n.total = n.bookingsCreated + n.approvals + n.remindersSent + n.recallsSent + n.attendanceMarked;
  });

  const list = Array.from(byNurse.values()).sort((a, b) => b.total - a.total);

  // Clinic-wide nurse totals
  const totBookings = list.reduce((s, n) => s + n.bookingsCreated, 0);
  const totApprovals = list.reduce((s, n) => s + n.approvals, 0);
  const totReminders = list.reduce((s, n) => s + n.remindersSent, 0);
  const totRecalls = list.reduce((s, n) => s + n.recallsSent, 0);
  const totAttendance = list.reduce((s, n) => s + n.attendanceMarked, 0);
  const totActions = totBookings + totApprovals + totReminders + totRecalls + totAttendance;

  const { count: pendingBookings } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <StaffShell role="owner" userName={profile.full_name} nav={await staffNav(profile.role, pendingBookings || 0)}>
      <h2 className="text-base font-medium mb-1">Nurse performance</h2>
      <p className="text-xs text-stone-500 mb-4">
        What each nurse has actually done in the last {days} days. Derived from the audit
        log — every approval, reminder, and recall is attributed to whoever fired it.
      </p>

      <div className="flex gap-2 mb-4 text-xs">
        {[7, 30, 90, 180].map((d) => (
          <Link
            key={d}
            href={`/owner/nurse-performance?days=${d}`}
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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <MetricCard label="New bookings" value={totBookings} />
        <MetricCard label="Approvals" value={totApprovals} />
        <MetricCard label="Reminders" value={totReminders} />
        <MetricCard label="Recalls" value={totRecalls} />
        <MetricCard label="Attendance marks" value={totAttendance} />
      </div>

      <div className="bg-white border border-stone-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
              <th className="px-4 py-2.5 font-medium">Nurse</th>
              <th className="px-4 py-2.5 font-medium text-right">New bookings</th>
              <th className="px-4 py-2.5 font-medium text-right">Approvals</th>
              <th className="px-4 py-2.5 font-medium text-right">Reminders</th>
              <th className="px-4 py-2.5 font-medium text-right">Recalls</th>
              <th className="px-4 py-2.5 font-medium text-right">Attendance</th>
              <th className="px-4 py-2.5 font-medium text-right">Total</th>
              <th className="px-4 py-2.5 font-medium">Share</th>
            </tr>
          </thead>
          <tbody>
            {list.map((n) => {
              const sharePct = totActions === 0 ? 0 : Math.round((n.total / totActions) * 100);
              return (
                <tr key={n.id} className="border-b border-stone-100 last:border-b-0">
                  <td className="px-4 py-3 font-medium">{n.name}</td>
                  <td className="px-4 py-3 text-right">{n.bookingsCreated}</td>
                  <td className="px-4 py-3 text-right">{n.approvals}</td>
                  <td className="px-4 py-3 text-right">{n.remindersSent}</td>
                  <td className="px-4 py-3 text-right">{n.recallsSent}</td>
                  <td className="px-4 py-3 text-right">{n.attendanceMarked}</td>
                  <td className="px-4 py-3 text-right font-semibold">{n.total}</td>
                  <td className="px-4 py-3 min-w-[120px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${sharePct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-stone-500 tabular-nums w-8 text-right">{sharePct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-stone-400 text-xs">
                  No active nurses yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </StaffShell>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
      <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium mb-1">{label}</div>
      <div className="text-2xl font-semibold text-stone-900">{value}</div>
    </div>
  );
}
