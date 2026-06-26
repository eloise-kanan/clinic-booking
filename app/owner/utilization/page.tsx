import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import { loadTerminalConfig } from "@/lib/terminal-theme";

export const dynamic = "force-dynamic";

// Convert a #RRGGBB hex to "r, g, b" for rgba() — used to fade the heatmap
// cells while keeping them tinted with the active theme's accent colour.
function hexToRgbTriplet(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export default async function UtilizationPage() {
  const { profile } = await requireStaff(["owner"]);
  const admin = createAdminClient();
  const { theme } = await loadTerminalConfig();
  const accentRgb = hexToRgbTriplet(theme.staffAccent);

  // Last 30 days of confirmed bookings (incl. future scheduled within window)
  const since = new Date();
  since.setDate(since.getDate() - 30);

  // Two queries — joining doctors() inline silently dropped rows when the FK
  // relation wasn't named the way Postgrest expected, leaving the heatmap
  // empty. Fetching separately is robust + faster.
  const [{ data: rows }, { data: docs }] = await Promise.all([
    admin.from("bookings")
      .select("doctor_id, slot_start")
      .eq("status", "confirmed")
      .gte("slot_start", since.toISOString()),
    admin.from("doctors").select("id, display_name"),
  ]);
  const docName = new Map<string, string>();
  (docs || []).forEach((d) => docName.set(d.id, d.display_name));

  // Per-doctor count
  const byDoctor = new Map<string, { name: string; count: number }>();
  // Heatmap: weekday(0..6) x hour(9..21)
  const heat: Record<string, number> = {};
  let max = 0;
  (rows || []).forEach((r) => {
    if (!r.doctor_id || !r.slot_start) return;
    const name = docName.get(r.doctor_id) || "Unknown";
    const cur = byDoctor.get(r.doctor_id) || { name, count: 0 };
    cur.count++;
    byDoctor.set(r.doctor_id, cur);

    const d = new Date(r.slot_start);
    const key = `${d.getDay()}-${d.getHours()}`;
    heat[key] = (heat[key] || 0) + 1;
    if (heat[key] > max) max = heat[key];
  });

  const sortedDoctors = Array.from(byDoctor.values()).sort((a, b) => b.count - a.count);
  const peak = sortedDoctors[0]?.count || 1;
  const totalRows = (rows || []).length;

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = Array.from({ length: 13 }, (_, i) => 9 + i);

  // Inline style instead of Tailwind classes so dynamic colours always paint
  // (Tailwind JIT only includes statically-detected utilities; we already
  // had the bg-purple-* strings present, but moving to rgba keeps the heat
  // map themed AND robust to future refactors).
  function heatStyle(v: number) {
    if (v === 0) return { background: "#f5f5f4" }; // stone-100
    const ratio = v / Math.max(max, 1);
    // Min opacity 0.18 so even one-booking cells are clearly tinted.
    const opacity = 0.18 + ratio * 0.82;
    return { background: `rgba(${accentRgb}, ${opacity.toFixed(2)})` };
  }

  return (
    <StaffShell
      role="owner"
      userName={profile.full_name}
      nav={await staffNav(profile.role)}
    >
      <h2 className="text-base font-medium mb-1">Doctor utilization (last 30 days)</h2>
      <p className="text-xs text-stone-500 mb-4">
        {totalRows === 0
          ? "No confirmed bookings in the last 30 days yet — heatmap will populate as bookings accrue."
          : `Based on ${totalRows} confirmed bookings. Peak hour: ${peak} bookings at the busiest slot.`}
      </p>

      <div className="bg-white border border-stone-200 rounded-lg p-5 mb-6">
        <h3 className="text-xs uppercase text-stone-500 font-medium mb-3 tracking-wide">By doctor</h3>
        <div className="space-y-2">
          {sortedDoctors.length === 0 ? (
            <p className="text-xs text-stone-500">No bookings yet.</p>
          ) : (
            sortedDoctors.map((d) => {
              const pct = Math.round((d.count / peak) * 100);
              return (
                <div key={d.name} className="grid grid-cols-[140px_1fr_50px] gap-3 items-center text-xs">
                  <div className="truncate">{d.name}</div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: theme.staffAccent }}
                    />
                  </div>
                  <div className="text-right tabular-nums">{d.count}</div>
                </div>
              );
            })
          )}
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
                  className="aspect-square rounded"
                  style={heatStyle(v)}
                  title={`${day} ${h}:00 — ${v} booking${v !== 1 ? "s" : ""}`}
                ></div>
              );
            })}
          </div>
        ))}
        <div className="flex items-center gap-3 text-[10px] text-stone-500 mt-3">
          <span>Idle</span>
          <div className="w-3 h-3 rounded" style={heatStyle(0)} />
          <div className="w-3 h-3 rounded" style={heatStyle(Math.max(1, Math.ceil(max * 0.25)))} />
          <div className="w-3 h-3 rounded" style={heatStyle(Math.max(1, Math.ceil(max * 0.5)))} />
          <div className="w-3 h-3 rounded" style={heatStyle(Math.max(1, Math.ceil(max * 0.75)))} />
          <div className="w-3 h-3 rounded" style={heatStyle(max)} />
          <span>Peak</span>
        </div>
      </div>
    </StaffShell>
  );
}
