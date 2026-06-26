import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import Link from "next/link";

export const dynamic = "force-dynamic";

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function pct(num: number, denom: number): number {
  if (denom <= 0) return 0;
  return Math.round((num / denom) * 100);
}

export default async function OwnerHome() {
  const { profile } = await requireStaff(["owner"]);
  const admin = createAdminClient();

  // Time windows we use repeatedly
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfThisWeek = new Date(startOfToday);
  startOfThisWeek.setDate(startOfThisWeek.getDate() - 7);

  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  const startOf30Days = new Date(startOfToday);
  startOf30Days.setDate(startOf30Days.getDate() - 30);

  const startOf14Days = new Date(startOfToday);
  startOf14Days.setDate(startOf14Days.getDate() - 13); // include today = 14 buckets

  // ── PARALLEL QUERIES ────────────────────────────────────────────────────
  const [
    weekCountRes,
    lastWeekCountRes,
    pendingCountRes,
    patientCountRes,
    repeatPatientsRes,
    recent30Res,
    last14Res,
    recallRes,
    doctorsRes,
    nursesRes,
    nurseApprovalsRes,
  ] = await Promise.all([
    admin.from("bookings").select("id", { count: "exact", head: true })
      .gte("created_at", startOfThisWeek.toISOString()),
    admin.from("bookings").select("id", { count: "exact", head: true })
      .gte("created_at", startOfLastWeek.toISOString())
      .lt("created_at", startOfThisWeek.toISOString()),
    admin.from("bookings").select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin.from("patients").select("id", { count: "exact", head: true }),
    admin.from("patients").select("id").gt("visit_count", 1),
    // 30-day window: attended/no-show breakdown + doctor activity
    admin.from("bookings")
      .select("doctor_id, status, attended_at, no_show")
      .gte("slot_start", startOf30Days.toISOString()),
    // 14-day trend: bucket by day (we group in JS after the fetch)
    admin.from("bookings")
      .select("slot_start, status")
      .gte("slot_start", startOf14Days.toISOString())
      .lt("slot_start", new Date(startOfToday.getTime() + 24 * 3600 * 1000).toISOString()),
    // Recall pickup: patients with recall sent in last 60 days + their next visit
    admin.from("patients")
      .select("id, recall_reminder_sent_at, last_visit_at")
      .not("recall_reminder_sent_at", "is", null)
      .gte("recall_reminder_sent_at", new Date(startOfToday.getTime() - 60 * 24 * 3600 * 1000).toISOString()),
    admin.from("doctors").select("id, display_name, active"),
    admin.from("profiles").select("id, full_name").eq("role", "nurse").eq("active", true),
    // Nurse approvals — bookings approved by nurses in last 30 days
    admin.from("bookings")
      .select("reviewed_by, status")
      .in("status", ["confirmed", "rejected"])
      .gte("reviewed_at", startOf30Days.toISOString()),
  ]);

  const weekCount = weekCountRes.count || 0;
  const lastWeekCount = lastWeekCountRes.count || 0;
  const pendingCount = pendingCountRes.count || 0;
  const patientCount = patientCountRes.count || 0;
  const repeatRate = pct((repeatPatientsRes.data?.length || 0), patientCount);
  const weekDeltaPct = lastWeekCount > 0 ? Math.round(((weekCount - lastWeekCount) / lastWeekCount) * 100) : null;

  // 30-day attendance breakdown
  const recent30 = recent30Res.data || [];
  let attended30 = 0, noShow30 = 0, cancelled30 = 0, confirmed30 = 0, pending30 = 0;
  recent30.forEach((b) => {
    if (b.attended_at) attended30++;
    if (b.no_show) noShow30++;
    if (b.status === "cancelled") cancelled30++;
    if (b.status === "confirmed") confirmed30++;
    if (b.status === "pending") pending30++;
  });
  const noShowRate30 = pct(noShow30, attended30 + noShow30);

  // 14-day trend buckets
  const trend: { day: string; label: string; bookings: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(startOf14Days);
    d.setDate(d.getDate() + i);
    trend.push({
      day: ymd(d),
      label: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      bookings: 0,
    });
  }
  const trendIdx = new Map(trend.map((t, i) => [t.day, i]));
  (last14Res.data || []).forEach((b) => {
    const key = ymd(new Date(b.slot_start));
    const i = trendIdx.get(key);
    if (i != null) trend[i].bookings++;
  });
  const trendMax = Math.max(1, ...trend.map((t) => t.bookings));

  // Top doctors (by 30-day bookings, top 5)
  const docMap = new Map<string, { name: string; bookings: number; attended: number; noShow: number }>();
  (doctorsRes.data || []).forEach((d) => {
    docMap.set(d.id, { name: d.display_name, bookings: 0, attended: 0, noShow: 0 });
  });
  recent30.forEach((b) => {
    const e = docMap.get(b.doctor_id);
    if (!e) return;
    e.bookings++;
    if (b.attended_at) e.attended++;
    if (b.no_show) e.noShow++;
  });
  const topDoctors = Array.from(docMap.values())
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 5);
  const topDocMax = Math.max(1, ...topDoctors.map((d) => d.bookings));

  // Top nurses (by 30-day approvals/rejections)
  const nurseMap = new Map<string, { name: string; approved: number }>();
  (nursesRes.data || []).forEach((n) => nurseMap.set(n.id, { name: n.full_name, approved: 0 }));
  (nurseApprovalsRes.data || []).forEach((b) => {
    const e = nurseMap.get(b.reviewed_by);
    if (e) e.approved++;
  });
  const topNurses = Array.from(nurseMap.values())
    .sort((a, b) => b.approved - a.approved)
    .slice(0, 5);
  const topNurseMax = Math.max(1, ...topNurses.map((n) => n.approved));

  // Recall pickup: of patients with recall sent in last 60d, how many came back
  const recallRows = recallRes.data || [];
  const recallSent = recallRows.length;
  const recallPickedUp = recallRows.filter((p) => {
    if (!p.last_visit_at || !p.recall_reminder_sent_at) return false;
    return new Date(p.last_visit_at) > new Date(p.recall_reminder_sent_at);
  }).length;
  const recallPickupRate = pct(recallPickedUp, recallSent);

  return (
    <StaffShell role="owner" userName={profile.full_name} nav={await staffNav(profile.role, pendingCount)}>
      <h2 className="text-base font-medium mb-1">Clinic overview</h2>
      <p className="text-xs text-stone-500 mb-5">
        Snapshot of how the clinic is performing this week + the last 30 days.
      </p>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <Stat
          label="This week"
          value={String(weekCount)}
          sub={
            weekDeltaPct == null
              ? "bookings"
              : weekDeltaPct >= 0
                ? `+${weekDeltaPct}% vs last week`
                : `${weekDeltaPct}% vs last week`
          }
          accent={weekDeltaPct != null ? (weekDeltaPct >= 0 ? "up" : "down") : undefined}
        />
        <Stat label="Pending" value={String(pendingCount)} sub="awaiting nurse" />
        <Stat label="Total patients" value={String(patientCount)} sub="" />
        <Stat label="Repeat rate" value={`${repeatRate}%`} sub="returning patients" />
        <Stat
          label="No-show rate"
          value={`${noShowRate30}%`}
          sub="last 30 days"
          accent={noShowRate30 >= 20 ? "down" : undefined}
        />
        <Stat
          label="Recall pickup"
          value={`${recallPickupRate}%`}
          sub={`${recallPickedUp} of ${recallSent} sent`}
        />
      </div>

      {/* Trend chart */}
      <Card title="Booking trend — last 14 days">
        <BookingTrendChart data={trend} max={trendMax} />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Attendance breakdown */}
        <Card title="Attendance — last 30 days">
          <AttendanceBreakdown
            attended={attended30}
            noShow={noShow30}
            confirmed={confirmed30}
            pending={pending30}
            cancelled={cancelled30}
          />
        </Card>

        {/* Recall pickup card */}
        <Card title="Recall pickup — last 60 days">
          <RecallPickup sent={recallSent} pickedUp={recallPickedUp} rate={recallPickupRate} />
        </Card>
      </div>

      {/* Performance leaderboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Card
          title="Doctor activity — last 30 days"
          footer={
            <Link href="/owner/doctor-performance" className="text-xs text-blue-600 hover:underline">
              Full doctor report →
            </Link>
          }
        >
          <RankedBars rows={topDoctors.map((d) => ({ label: d.name, value: d.bookings, sub: `${d.attended} seen · ${d.noShow} no-show` }))} max={topDocMax} unit="bookings" />
        </Card>

        <Card
          title="Nurse approvals — last 30 days"
          footer={
            <Link href="/owner/nurse-performance" className="text-xs text-blue-600 hover:underline">
              Full nurse report →
            </Link>
          }
        >
          <RankedBars rows={topNurses.map((n) => ({ label: n.name, value: n.approved }))} max={topNurseMax} unit="approvals" />
        </Card>
      </div>
    </StaffShell>
  );
}

// ── COMPONENTS ──────────────────────────────────────────────────────────────

function Stat({
  label, value, sub, accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "up" | "down";
}) {
  const accentColor = accent === "up" ? "text-emerald-600" : accent === "down" ? "text-red-600" : "text-stone-500";
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-3">
      <div className="text-[11px] uppercase tracking-wider text-stone-500">{label}</div>
      <div className="text-2xl font-medium mt-1 tabular-nums">{value}</div>
      {sub && <div className={`text-[11px] mt-0.5 ${accentColor}`}>{sub}</div>}
    </div>
  );
}

function Card({ title, footer, children }: { title: string; footer?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl">
      <div className="px-4 pt-3.5 pb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        {footer}
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}

// SVG vertical bar chart for the 14-day trend.
function BookingTrendChart({ data, max }: { data: { day: string; label: string; bookings: number }[]; max: number }) {
  const W = 720, H = 160, PAD = 8, BAR_GAP = 4;
  const n = data.length;
  const barW = (W - PAD * 2 - BAR_GAP * (n - 1)) / n;
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 28}`} className="w-full h-44">
        {/* Y axis grid (3 lines: 0, max/2, max) */}
        {[0, 0.5, 1].map((p, i) => {
          const y = PAD + (H - PAD * 2) * (1 - p);
          return (
            <g key={i}>
              <line x1={PAD + 30} x2={W - PAD} y1={y} y2={y} stroke="#e7e5e4" strokeDasharray="2 2" />
              <text x={PAD + 26} y={y + 3} textAnchor="end" fontSize="9" fill="#a8a29e">
                {Math.round(max * p)}
              </text>
            </g>
          );
        })}
        {/* Bars */}
        {data.map((d, i) => {
          const h = (d.bookings / max) * (H - PAD * 2);
          const x = PAD + 32 + i * (barW + BAR_GAP);
          const y = H - PAD - h;
          return (
            <g key={d.day}>
              <rect x={x} y={y} width={Math.max(2, barW - 32)} height={Math.max(0, h)} fill="var(--staff-accent, #1B2A4A)" rx="2" />
              <text x={x + (barW - 32) / 2} y={H + 12} textAnchor="middle" fontSize="9" fill="#78716c">
                {d.label}
              </text>
              {d.bookings > 0 && (
                <text x={x + (barW - 32) / 2} y={y - 2} textAnchor="middle" fontSize="9" fill="#44403c" fontWeight="500">
                  {d.bookings}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function AttendanceBreakdown({
  attended, noShow, confirmed, pending, cancelled,
}: { attended: number; noShow: number; confirmed: number; pending: number; cancelled: number }) {
  const total = attended + noShow + confirmed + pending + cancelled;
  if (total === 0) return <p className="text-xs text-stone-500">No bookings in the last 30 days.</p>;
  const segs = [
    { label: "Attended", value: attended, color: "#10b981" },
    { label: "No-show",  value: noShow,   color: "#ef4444" },
    { label: "Upcoming", value: confirmed, color: "#3b82f6" },
    { label: "Pending",  value: pending,   color: "#f59e0b" },
    { label: "Cancelled",value: cancelled, color: "#a8a29e" },
  ];
  return (
    <div className="space-y-3">
      <div className="flex h-3 rounded-full overflow-hidden bg-stone-100">
        {segs.map((s) => (
          s.value > 0 ? (
            <div
              key={s.label}
              style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
              title={`${s.label}: ${s.value}`}
            />
          ) : null
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1 text-[11px]">
        {segs.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            <span className="text-stone-600">{s.label}</span>
            <span className="ml-auto font-medium tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecallPickup({ sent, pickedUp, rate }: { sent: number; pickedUp: number; rate: number }) {
  if (sent === 0) {
    return (
      <p className="text-xs text-stone-500">
        No recalls sent in the last 60 days. Recall worklist lives at <Link href="/staff/recalls" className="text-blue-600 hover:underline">/staff/recalls</Link>.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-3">
        <div className="text-3xl font-medium tabular-nums">{rate}%</div>
        <div className="text-xs text-stone-500">{pickedUp} returned of {sent} contacted</div>
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-stone-100">
        <div className="bg-emerald-500" style={{ width: `${rate}%` }} />
      </div>
      <p className="text-[11px] text-stone-500">
        Returned = patient&apos;s last visit is after the recall message was sent.
      </p>
    </div>
  );
}

function RankedBars({ rows, max, unit }: { rows: { label: string; value: number; sub?: string }[]; max: number; unit: string }) {
  if (rows.length === 0) {
    return <p className="text-xs text-stone-500">No data yet.</p>;
  }
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-2 text-xs mb-1">
            <span className="font-medium truncate">{r.label}</span>
            <span className="tabular-nums text-stone-500">{r.value} {unit}</span>
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden bg-stone-100">
            <div className="bg-stone-700" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          {r.sub && <div className="text-[10px] text-stone-500 mt-0.5">{r.sub}</div>}
        </li>
      ))}
    </ul>
  );
}
