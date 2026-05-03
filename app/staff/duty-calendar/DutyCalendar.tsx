"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_START = "09:00";
const DEFAULT_END = "21:00";

type StaffMember = { id: string; full_name: string; role: string };

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

function ymToDateRange(year: number, month0: number) {
  const first = new Date(year, month0, 1);
  const last = new Date(year, month0 + 1, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: fmt(first), to: fmt(last), first, last };
}

function monthLabel(year: number, month0: number) {
  return new Date(year, month0, 1).toLocaleDateString("en-MY", { month: "long", year: "numeric" });
}

function dateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DutyCalendar() {
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);

  useEffect(() => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  }, []);

  const range = useMemo(() => {
    if (year === null || month === null) return null;
    return ymToDateRange(year, month);
  }, [year, month]);

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
    setStaff(staffData.staff || []);
    setShifts(sd.shifts || []);
    setLeaves(ld.requests || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range?.from, range?.to]);

  function shiftMonth(delta: number) {
    if (year === null || month === null) return;
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  }
  function jumpToToday() {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  }

  // Index leaves by profile_id → set of date strings on leave
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

  // Index explicit overrides: profile_id → date → shift
  const shiftByPersonDay = useMemo(() => {
    const map = new Map<string, Map<string, Shift>>();
    for (const s of shifts) {
      if (!map.has(s.profile_id)) map.set(s.profile_id, new Map());
      map.get(s.profile_id)!.set(s.shift_date, s);
    }
    return map;
  }, [shifts]);

  const grid = useMemo(() => {
    if (!range) return [];
    const { first, last } = range;
    const cells: { date: string; inMonth: boolean }[] = [];
    const firstWeekdayMon = (first.getDay() + 6) % 7;
    for (let i = 0; i < firstWeekdayMon; i++) {
      const d = new Date(first);
      d.setDate(first.getDate() - (firstWeekdayMon - i));
      cells.push({ date: dateStr(d), inMonth: false });
    }
    for (let day = 1; day <= last.getDate(); day++) {
      const d = new Date(year as number, month as number, day);
      cells.push({ date: dateStr(d), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const last2 = new Date(cells[cells.length - 1].date + "T00:00:00");
      last2.setDate(last2.getDate() + 1);
      cells.push({ date: dateStr(last2), inMonth: false });
    }
    return cells;
  }, [range, year, month]);

  if (year === null || month === null) {
    return <p className="text-sm text-stone-500">Loading…</p>;
  }

  const todayKey = dateStr(new Date());
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button type="button" className="btn" onClick={() => shiftMonth(-1)}>
          ◀ Prev
        </button>
        <button type="button" className="btn" onClick={jumpToToday}>
          Today
        </button>
        <button type="button" className="btn" onClick={() => shiftMonth(1)}>
          Next ▶
        </button>
        <span className="ml-2 text-base font-medium">{monthLabel(year, month)}</span>
        <span className="ml-auto text-xs text-stone-500">
          Default duty: {DEFAULT_START}–{DEFAULT_END} for everyone
        </span>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
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
                {cell.inMonth &&
                  staff.map((s) => {
                    const onLeave = leaveByProfile.get(s.id)?.has(cell.date) ?? false;
                    if (onLeave) {
                      return (
                        <div
                          key={s.id}
                          className="mb-0.5 px-1.5 py-0.5 rounded bg-red-50 text-red-700 truncate"
                          title={`${s.full_name} on approved leave`}
                        >
                          🏖 {s.full_name}
                        </div>
                      );
                    }
                    const override = shiftByPersonDay.get(s.id)?.get(cell.date);
                    const start = override ? override.start_time.slice(0, 5) : DEFAULT_START;
                    const end = override ? override.end_time.slice(0, 5) : DEFAULT_END;
                    return (
                      <div
                        key={s.id}
                        className={`mb-0.5 px-1.5 py-0.5 rounded truncate ${
                          override
                            ? "bg-amber-50 text-amber-800"
                            : "bg-brand-50 text-brand-800"
                        }`}
                        title={`${s.full_name} (${s.role}) ${start}–${end}${override ? " · custom" : ""}`}
                      >
                        <span className="truncate">{s.full_name}</span>{" "}
                        <span className="text-[10px] opacity-70 whitespace-nowrap">
                          {start}–{end}
                        </span>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-[11px] text-stone-500 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-brand-50 border border-brand-200" /> Default duty (9–9)
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-amber-50 border border-amber-200" /> Custom shift
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-red-50 border border-red-200" /> Approved leave
        </div>
      </div>
    </div>
  );
}
