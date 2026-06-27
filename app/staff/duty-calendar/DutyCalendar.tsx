"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_START = "09:00";
const DEFAULT_END = "21:00";

type ViewMode = "week" | "month";

type StaffMember = { id: string; full_name: string; role: string; typical_hours?: string | null };

type Shift = {
  id: string;
  profile_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  profile: { full_name: string; role: string } | { full_name: string; role: string }[] | null;
};

type LeaveRow = {
  id: string;
  profile_id: string;
  start_date: string;
  end_date: string;
  status: "pending" | "approved" | "rejected";
  profile: { full_name: string; role: string } | { full_name: string; role: string }[] | null;
};

function dateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// New filtered renderer — only renders staff with EXCEPTIONS for the day
// (an approved leave or a custom shift). Days with no exceptions render
// as an empty cell (or "Default duty" hint) so the calendar reads as a
// "what's different today" view instead of a wall of names.
function renderExceptions(
  staff: StaffMember[],
  date: string,
  leaveByProfile: Map<string, Set<string>>,
  shiftByPersonDay: Map<string, Map<string, Shift>>,
  showRoleBadge: boolean
) {
  const out: React.ReactNode[] = [];
  for (const s of staff) {
    const onLeave = leaveByProfile.get(s.id)?.has(date) ?? false;
    const customShift = shiftByPersonDay.get(s.id)?.get(date);
    if (!onLeave && !customShift) continue;  // skip default-duty staff

    const roleBadge = showRoleBadge ? (
      <span
        className={`text-[9px] uppercase tracking-wider px-1 rounded mr-1 ${
          s.role === "doctor"
            ? "bg-blue-100 text-blue-700"
            : "bg-emerald-100 text-emerald-700"
        }`}
      >
        {s.role === "doctor" ? "Dr" : "Nr"}
      </span>
    ) : null;
    if (onLeave) {
      out.push(
        <div
          key={s.id}
          className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 truncate"
          title={`${s.full_name} on approved leave`}
        >
          {roleBadge}🏖 {s.full_name}
        </div>
      );
      continue;
    }
    // Custom shift only (default is skipped above)
    const override = customShift!;
    const start = override.start_time.slice(0, 5);
    const end = override.end_time.slice(0, 5);
    out.push(
      <div
        key={s.id}
        className="px-1.5 py-0.5 rounded truncate bg-amber-50 text-amber-800"
        title={`${s.full_name} (${s.role}) ${start}–${end} · custom shift`}
      >
        {roleBadge}
        <span className="truncate">{s.full_name}</span>{" "}
        <span className="text-[10px] opacity-70 whitespace-nowrap">
          {start}–{end}
        </span>
      </div>
    );
  }
  return out;
}

// Monday of the week containing d
function startOfWeek(d: Date) {
  const x = new Date(d);
  const offset = (x.getDay() + 6) % 7; // 0 = Mon
  x.setDate(x.getDate() - offset);
  x.setHours(0, 0, 0, 0);
  return x;
}

function monthRange(year: number, month0: number) {
  const first = new Date(year, month0, 1);
  const last = new Date(year, month0 + 1, 0);
  return { from: dateStr(first), to: dateStr(last), first, last };
}

function weekRange(anchor: Date) {
  const first = startOfWeek(anchor);
  const last = new Date(first);
  last.setDate(first.getDate() + 6);
  return { from: dateStr(first), to: dateStr(last), first, last };
}

function monthLabel(year: number, month0: number) {
  return new Date(year, month0, 1).toLocaleDateString("en-MY", { month: "long", year: "numeric" });
}

function weekLabel(first: Date, last: Date) {
  const sameMonth = first.getMonth() === last.getMonth();
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-MY", opts);
  if (sameMonth) {
    return `${first.getDate()}–${last.getDate()} ${fmt(first, { month: "short", year: "numeric" })}`;
  }
  return `${fmt(first, { day: "numeric", month: "short" })} – ${fmt(last, { day: "numeric", month: "short", year: "numeric" })}`;
}

export default function DutyCalendar({ includeNurses = true }: { includeNurses?: boolean }) {
  const [view, setView] = useState<ViewMode | null>(null);
  const [anchor, setAnchor] = useState<Date | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);

  // On mount: default view = week if narrow viewport, else month. Anchor = today.
  useEffect(() => {
    const isNarrow = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
    setView(isNarrow ? "week" : "month");
    setAnchor(new Date());
  }, []);

  const range = useMemo(() => {
    if (!anchor || !view) return null;
    return view === "week"
      ? weekRange(anchor)
      : monthRange(anchor.getFullYear(), anchor.getMonth());
  }, [anchor, view]);

  async function load() {
    if (!range) return;
    const [staffRes, shiftRes, leaveRes] = await Promise.all([
      fetch(`/api/staff/list`),
      fetch(`/api/duty/shifts?from=${range.from}&to=${range.to}&status=approved`),
      fetch(`/api/leave/requests?status=approved`),
    ]);
    const staffData = await staffRes.json();
    const sd = await shiftRes.json();
    const ld = await leaveRes.json();
    const allStaff: StaffMember[] = staffData.staff || [];
    // Filter by plan: Standard tier sees doctors only.
    setStaff(includeNurses ? allStaff : allStaff.filter((s) => s.role === "doctor"));
    setShifts(sd.shifts || []);
    setLeaves(ld.requests || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range?.from, range?.to]);

  function shift(direction: 1 | -1) {
    if (!anchor || !view) return;
    const next = new Date(anchor);
    if (view === "week") next.setDate(anchor.getDate() + 7 * direction);
    else next.setMonth(anchor.getMonth() + direction);
    setAnchor(next);
  }
  function jumpToToday() {
    setAnchor(new Date());
  }

  const leaveByProfile = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const lr of leaves) {
      const start = new Date(lr.start_date + "T00:00:00");
      const end = new Date(lr.end_date + "T00:00:00");
      if (!map.has(lr.profile_id)) map.set(lr.profile_id, new Set());
      const set = map.get(lr.profile_id)!;
      for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        set.add(dateStr(d));
      }
    }
    return map;
  }, [leaves]);

  const shiftByPersonDay = useMemo(() => {
    const map = new Map<string, Map<string, Shift>>();
    for (const s of shifts) {
      if (!map.has(s.profile_id)) map.set(s.profile_id, new Map());
      map.get(s.profile_id)!.set(s.shift_date, s);
    }
    return map;
  }, [shifts]);

  const grid = useMemo(() => {
    if (!range || !view || !anchor) return [];
    const cells: { date: string; inMonth: boolean }[] = [];
    if (view === "week") {
      for (let i = 0; i < 7; i++) {
        const d = new Date(range.first);
        d.setDate(range.first.getDate() + i);
        cells.push({ date: dateStr(d), inMonth: true });
      }
      return cells;
    }
    // Month view
    const { first, last } = range;
    const firstWeekdayMon = (first.getDay() + 6) % 7;
    for (let i = 0; i < firstWeekdayMon; i++) {
      const d = new Date(first);
      d.setDate(first.getDate() - (firstWeekdayMon - i));
      cells.push({ date: dateStr(d), inMonth: false });
    }
    for (let day = 1; day <= last.getDate(); day++) {
      const d = new Date(anchor.getFullYear(), anchor.getMonth(), day);
      cells.push({ date: dateStr(d), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const last2 = new Date(cells[cells.length - 1].date + "T00:00:00");
      last2.setDate(last2.getDate() + 1);
      cells.push({ date: dateStr(last2), inMonth: false });
    }
    return cells;
  }, [range, view, anchor]);

  if (!view || !anchor || !range) {
    return <p className="text-sm text-stone-500">Loading…</p>;
  }

  const todayKey = dateStr(new Date());
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const headerLabel =
    view === "week"
      ? weekLabel(range.first, range.last)
      : monthLabel(anchor.getFullYear(), anchor.getMonth());

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button type="button" className="btn" onClick={() => shift(-1)}>
          ◀ Prev
        </button>
        <button type="button" className="btn" onClick={jumpToToday}>
          Today
        </button>
        <button type="button" className="btn" onClick={() => shift(1)}>
          Next ▶
        </button>
        <span className="ml-2 text-base font-medium">{headerLabel}</span>

        {/* View toggle */}
        <div className="ml-auto inline-flex rounded-md border border-stone-200 overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setView("week")}
            className={`px-3 py-1.5 ${view === "week" ? "bg-stone-900 text-white" : "bg-white text-stone-600 hover:bg-stone-50"}`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setView("month")}
            className={`px-3 py-1.5 border-l border-stone-200 ${view === "month" ? "bg-stone-900 text-white" : "bg-white text-stone-600 hover:bg-stone-50"}`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Default-duty roster — sectionised by role, each staff in a small
          card with name on top + typical-hours under it. Doctors show their
          working_hours summary; nurses fall back to the clinic default. */}
      {(() => {
        const doctors = staff.filter((s) => s.role === "doctor");
        const nurses = staff.filter((s) => s.role === "nurse");
        return (
          <div className="bg-white border border-stone-200 rounded-xl p-4 mb-4">
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
              <div>
                <h3 className="text-sm font-medium">Default duty</h3>
                <p className="text-[11px] text-stone-500">
                  Typical shift per staff. Calendar below shows only exceptions.
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-stone-400">
                Clinic default {DEFAULT_START}–{DEFAULT_END}
              </span>
            </div>
            {staff.length === 0 ? (
              <p className="text-xs text-stone-500">No active staff.</p>
            ) : (
              <div className="space-y-3">
                {doctors.length > 0 && (
                  <RosterSection role="doctor" people={doctors} />
                )}
                {nurses.length > 0 && (
                  <RosterSection role="nurse" people={nurses} />
                )}
              </div>
            )}
          </div>
        );
      })()}

      <div className="text-[11px] text-stone-500 mb-2">
        Calendar below shows <strong>only exceptions</strong> — custom shift changes (amber) and approved leaves (red). Empty cells = everyone on default duty.
      </div>

      {view === "month" ? (
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-7 text-[11px] text-stone-500 border-b border-stone-200">
                {weekDays.map((d) => (
                  <div key={d} className="px-2 py-1.5 text-center font-medium">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {grid.map((cell, i) => {
                  const isToday = cell.date === todayKey;
                  return (
                    <div
                      key={i}
                      className={`min-h-[110px] border-r border-b border-stone-100 last:border-r-0 p-1.5 text-[11px] ${
                        cell.inMonth ? "bg-white" : "bg-stone-50 text-stone-400"
                      } ${isToday ? "ring-2 ring-brand-500 ring-inset" : ""}`}
                    >
                      <div className={`mb-1 font-medium ${isToday ? "text-brand-700" : "text-stone-600"}`}>
                        {parseInt(cell.date.slice(8), 10)}
                      </div>
                      {cell.inMonth && renderExceptions(staff, cell.date, leaveByProfile, shiftByPersonDay, includeNurses)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Week view: each day is a row, full width, listing all staff on that day
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden divide-y divide-stone-200">
          {grid.map((cell) => {
            const isToday = cell.date === todayKey;
            const date = new Date(cell.date + "T00:00:00");
            const dayName = weekDays[(date.getDay() + 6) % 7];
            const dateLabel = date.toLocaleDateString("en-MY", {
              day: "numeric",
              month: "short",
            });
            return (
              <div
                key={cell.date}
                className={`p-3 ${isToday ? "bg-brand-50/50" : "bg-white"}`}
              >
                <div className="flex items-baseline justify-between mb-2">
                  <div className={`text-sm ${isToday ? "text-brand-800 font-medium" : "text-stone-700"}`}>
                    <span className="font-medium">{dayName}</span>
                    <span className="text-stone-500 ml-2">{dateLabel}</span>
                    {isToday && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-brand-700">today</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                  {renderExceptions(staff, cell.date, leaveByProfile, shiftByPersonDay, includeNurses)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex items-center gap-4 text-[11px] text-stone-500 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-amber-50 border border-amber-200" /> Custom shift change
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-red-50 border border-red-200" /> Approved leave
        </div>
      </div>
    </div>
  );
}

// Roster section — one row per role with a small heading + person tiles in
// a responsive grid. Each tile stacks name (top, 13px) and hours (bottom,
// 10px tabular). Doctor + nurse get distinct accent colors on the heading.
function RosterSection({
  role,
  people,
}: {
  role: "doctor" | "nurse";
  people: StaffMember[];
}) {
  const accent =
    role === "doctor"
      ? { dot: "bg-blue-500", label: "Doctors", text: "text-blue-700" }
      : { dot: "bg-emerald-500", label: "Nurses", text: "text-emerald-700" };

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${accent.dot}`} />
        <span className={`text-[10px] uppercase tracking-wider font-medium ${accent.text}`}>
          {accent.label}
        </span>
        <span className="text-[10px] text-stone-400 tabular-nums">({people.length})</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
        {people.map((s) => {
          const hours = s.typical_hours || `${DEFAULT_START}–${DEFAULT_END}`;
          const isDefault = !s.typical_hours; // i.e. falls back to clinic-wide default
          return (
            <div
              key={s.id}
              className="bg-stone-50 border border-stone-200 rounded-md px-2 py-1.5"
            >
              <div className="text-[12px] font-medium leading-tight truncate" title={s.full_name}>
                {s.full_name}
              </div>
              <div
                className={`text-[10px] tabular-nums mt-0.5 ${
                  isDefault ? "text-stone-400" : "text-stone-600 font-medium"
                }`}
              >
                {hours}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
