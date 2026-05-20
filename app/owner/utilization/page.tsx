import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";

export const dynamic = "force-dynamic";

export default async function UtilizationPage() {
  const { profile } = await requireStaff(["owner"]);
  const admin = createAdminClient();

  // Last 30 days of confirmed bookings
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: rows } = await admin
    .from("bookings")
    .select("doctor_id, slot_start, doctors(display_name)")
    .eq("status", "confirmed")
    .gte("slot_start", since.toISOString());

  // Per-doctor count
  const byDoctor = new Map<string, { name: string; count: number }>();
  // Heatmap: weekday(0..6) x hour(9..21)
  const heat: Record<string, number> = {};
  let max = 0;
  (rows || []).forEach((r: any) => {
    const docName = r.doctors?.display_name || "Unknown";
    const cur = byDoctor.get(r.doctor_id) || { name: docName, count: 0 };
    cur.count++;
    byDoctor.set(r.doctor_id, cur);

    const d = new Date(r.slot_start);
    const key = `${d.getDay()}-${d.getHours()}`;
    heat[key] = (heat[key] || 0) + 1;
    if (heat[key] > max) max = heat[key];
  });

  const sortedDoctors = Array.from(byDoctor.values()).sort((a, b) => b.count - a.count);
  const peak = sortedDoctors[0]?.count || 1;

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = Array.from({ length: 13 }, (_, i) => 9 + i);

  function heatLevel(v: number): string {
    if (v === 0) return "bg-stone-100";
    const ratio = v / Math.max(max, 1);
    if (ratio < 0.25) return "bg-purple-100";
    if (ratio < 0.5) return "bg-purple-200";
    if (ratio < 0.75) return "bg-purple-400";
    return "bg-purple-700";
  }

  return (
    <StaffShell
      role="owner"
      userName={profile.full_name}
      nav={await staffNav(profile.role)}
    >
      <h2 className="text-base font-medium mb-4">Doctor utilization (last 30 days)</h2>

      <div className="bg-white border border-stone-200 rounded-lg p-5 mb-6">
        <h3 className="text-xs uppercase text-stone-500 font-medium mb-3 tracking-wide">By doctor</h3>
        <div className="space-y-2">
          {sortedDoctors.map((d) => {
            const pct = Math.round((d.count / peak) * 100);
            return (
              <div key={d.name} className="grid grid-cols-[140px_1fr_50px] gap-3 items-center text-xs">
                <div>{d.name}</div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-right">{d.count}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg p-5">
        <h3 className="text-xs uppercase text-stone-500 font-medium mb-3 tracking-wide">Busy hours heatmap</h3>
        <div className="grid grid-cols-[40px_repeat(13,1fr)] gap-1 text-[10px] mb-1">
          <div></div>
          {hours.map((h) => (
            <div key={h} className="text-center text-stone-500">{h}</div>
          ))}
        </div>
        {days.map((day, dIdx) => (
          <div key={day} className="grid grid-cols-[40px_repeat(13,1fr)] gap-1 mb-1">
            <div className="text-[10px] text-stone-500 flex items-center justify-end pr-1">{day}</div>
            {hours.map((h) => {
              const v = heat[`${dIdx}-${h}`] || 0;
              return (
                <div
                  key={h}
                  className={`aspect-square rounded ${heatLevel(v)}`}
                  title={`${day} ${h}:00 — ${v} booking${v !== 1 ? "s" : ""}`}
                ></div>
              );
            })}
          </div>
        ))}
        <div className="flex items-center gap-3 text-[10px] text-stone-500 mt-3">
          <span>Idle</span>
          <div className="w-3 h-3 rounded bg-stone-100"></div>
          <div className="w-3 h-3 rounded bg-purple-100"></div>
          <div className="w-3 h-3 rounded bg-purple-200"></div>
          <div className="w-3 h-3 rounded bg-purple-400"></div>
          <div className="w-3 h-3 rounded bg-purple-700"></div>
          <span>Peak</span>
        </div>
      </div>
    </StaffShell>
  );
}
