"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Doctor = { id: string; display_name: string };
type Booking = {
  id: string;
  doctor_id: string;
  slot_start: string;
  slot_end: string;
  status: string;
  type: string;
  visit_reason: string | null;
  patient: { full_name: string } | null;
};

const DAY_BATCH = 7;
const HOURS = Array.from({ length: 13 }, (_, i) => 9 + i); // 09..21

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-MY", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CalendarView({ doctors, scope }: { doctors: Doctor[]; scope: "all" | "own" }) {
  const [startDate, setStartDate] = useState<string>("");
  const [daysCount, setDaysCount] = useState<number>(DAY_BATCH);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pickerDate, setPickerDate] = useState<string>("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initialize "today" only after mount so SSR output and first client render match
  useEffect(() => {
    const t = todayStr();
    setStartDate(t);
    setPickerDate(t);
  }, []);

  // Fetch the whole range in one call
  useEffect(() => {
    if (!startDate) return;
    fetch(`/api/calendar?date=${startDate}&days=${daysCount}`)
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings || []))
      .catch(() => setBookings([]));
  }, [startDate, daysCount]);

  // Date list — empty until startDate is initialized (avoids Invalid Date on first render)
  const days = useMemo(() => {
    if (!startDate) return [];
    return Array.from({ length: daysCount }, (_, i) => addDays(startDate, i));
  }, [startDate, daysCount]);

  // Group bookings by local date string
  const byDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const local = new Date(b.slot_start);
      const key = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return map;
  }, [bookings]);

  // Jump to a date — extend range if needed, then scroll to anchor
  function jumpTo(dateStr: string) {
    setPickerDate(dateStr);
    if (dateStr < startDate) {
      // Anchor the new start at the picked date and show a week from there
      setStartDate(dateStr);
      setDaysCount(DAY_BATCH);
    } else {
      const lastDay = addDays(startDate, daysCount - 1);
      if (dateStr > lastDay) {
        // Extend to include the picked date plus a few extra
        const dStart = new Date(startDate + "T00:00:00");
        const dPick = new Date(dateStr + "T00:00:00");
        const diff = Math.round((dPick.getTime() - dStart.getTime()) / 86400000);
        setDaysCount(diff + DAY_BATCH);
      }
    }
    // After a microtask so the section has rendered
    setTimeout(() => {
      const el = document.getElementById(`day-${dateStr}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 80);
  }

  function shiftWeek(direction: 1 | -1) {
    const next = addDays(startDate, direction * DAY_BATCH);
    setStartDate(next);
    setDaysCount(DAY_BATCH);
    setPickerDate(next);
  }

  if (!startDate) {
    return <p className="text-sm text-stone-500">Loading calendar…</p>;
  }

  return (
    <div ref={containerRef}>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="date"
          className="input max-w-[180px]"
          value={pickerDate}
          onChange={(e) => jumpTo(e.target.value)}
        />
        <button type="button" className="btn" onClick={() => jumpTo(todayStr())}>
          Today
        </button>
        <button type="button" className="btn" onClick={() => shiftWeek(-1)}>
          ◀ Prev 7 days
        </button>
        <button type="button" className="btn" onClick={() => shiftWeek(1)}>
          Next 7 days ▶
        </button>
        <span className="text-xs text-stone-500 ml-auto">
          Showing {daysCount} day{daysCount === 1 ? "" : "s"} from {dayLabel(startDate)}
        </span>
      </div>

      <div className="space-y-6">
        {days.map((dateStr) => (
          <DaySection
            key={dateStr}
            dateStr={dateStr}
            doctors={doctors}
            bookings={byDate.get(dateStr) || []}
            scope={scope}
          />
        ))}
      </div>

      <div className="mt-4 flex justify-center">
        <button type="button" className="btn" onClick={() => setDaysCount((d) => d + DAY_BATCH)}>
          Load {DAY_BATCH} more days
        </button>
      </div>
    </div>
  );
}

function DaySection({
  dateStr,
  doctors,
  bookings,
  scope,
}: {
  dateStr: string;
  doctors: Doctor[];
  bookings: Booking[];
  scope: "all" | "own";
}) {
  const isToday = dateStr === todayStr();
  return (
    <div id={`day-${dateStr}`} className="bg-white border border-stone-200 rounded-lg overflow-hidden">
      <div className={`sticky top-0 z-10 px-4 py-2 border-b border-stone-200 text-sm font-medium ${isToday ? "bg-brand-50 text-brand-800" : "bg-stone-50 text-stone-700"}`}>
        {dayLabel(dateStr)} {isToday && <span className="text-[10px] ml-2 uppercase tracking-wide">today</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-stone-200">
              <th className="px-3 py-2 text-left text-stone-500 font-medium w-16">Time</th>
              {doctors.map((d) => (
                <th key={d.id} className="px-3 py-2 text-left text-stone-500 font-medium">
                  {d.display_name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((h) => (
              <tr key={h} className="border-b border-stone-100 last:border-b-0">
                <td className="px-3 py-2 text-stone-500 align-top">{`${h}:00`}</td>
                {doctors.map((d) => {
                  const cellBookings = bookings.filter(
                    (b) =>
                      b.doctor_id === d.id && new Date(b.slot_start).getHours() === h
                  );
                  return (
                    <td key={d.id} className="px-2 py-1 align-top">
                      {cellBookings.map((b) => (
                        <div
                          key={b.id}
                          className={`mb-1 px-2 py-1 rounded text-[11px] ${
                            b.status === "confirmed"
                              ? "bg-green-50 text-green-800 border-l-2 border-green-500"
                              : "bg-amber-50 text-amber-800 border-l-2 border-amber-500"
                          }`}
                          title={b.visit_reason || undefined}
                        >
                          <div className="font-medium">
                            {new Date(b.slot_start).toLocaleTimeString("en-MY", {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: false,
                            })}
                          </div>
                          <div className="truncate">{b.patient?.full_name || "Patient"}</div>
                          {b.visit_reason && (
                            <div className="truncate text-[10px] opacity-80 mt-0.5">
                              {b.visit_reason}
                            </div>
                          )}
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
