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
const FIRST_HOUR = 9;
const LAST_HOUR = 21; // 21:00 — last grid line
const PX_PER_MIN = 1.4; // ~84px per hour; tune for density
const TOTAL_MINUTES = (LAST_HOUR - FIRST_HOUR) * 60;
const TOTAL_HEIGHT = TOTAL_MINUTES * PX_PER_MIN;
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i);

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

function timeLabel(d: Date) {
  return d.toLocaleTimeString("en-MY", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
}

// Pixel offset for a Date relative to the day's FIRST_HOUR.
// Returns null if the booking is outside the visible window.
function offsetForBooking(start: Date, end: Date) {
  const startMin = (start.getHours() - FIRST_HOUR) * 60 + start.getMinutes();
  const endMin = (end.getHours() - FIRST_HOUR) * 60 + end.getMinutes();
  // Crossing midnight or outside window — clip
  const visStart = Math.max(0, startMin);
  const visEnd = Math.min(TOTAL_MINUTES, endMin > 0 ? endMin : TOTAL_MINUTES);
  if (visEnd <= visStart) return null;
  return {
    top: visStart * PX_PER_MIN,
    height: (visEnd - visStart) * PX_PER_MIN,
  };
}

export default function CalendarView({ doctors, scope }: { doctors: Doctor[]; scope: "all" | "own" }) {
  // scope is reserved for future filtering (e.g. own vs all); kept for compatibility
  void scope;
  const [startDate, setStartDate] = useState<string>("");
  const [daysCount, setDaysCount] = useState<number>(DAY_BATCH);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pickerDate, setPickerDate] = useState<string>("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = todayStr();
    setStartDate(t);
    setPickerDate(t);
  }, []);

  useEffect(() => {
    if (!startDate) return;
    fetch(`/api/calendar?date=${startDate}&days=${daysCount}`)
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings || []))
      .catch(() => setBookings([]));
  }, [startDate, daysCount]);

  const days = useMemo(() => {
    if (!startDate) return [];
    return Array.from({ length: daysCount }, (_, i) => addDays(startDate, i));
  }, [startDate, daysCount]);

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

  function jumpTo(dateStr: string) {
    setPickerDate(dateStr);
    if (dateStr < startDate) {
      setStartDate(dateStr);
      setDaysCount(DAY_BATCH);
    } else {
      const lastDay = addDays(startDate, daysCount - 1);
      if (dateStr > lastDay) {
        const dStart = new Date(startDate + "T00:00:00");
        const dPick = new Date(dateStr + "T00:00:00");
        const diff = Math.round((dPick.getTime() - dStart.getTime()) / 86400000);
        setDaysCount(diff + DAY_BATCH);
      }
    }
    setTimeout(() => {
      const el = document.getElementById(`day-${dateStr}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
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
}: {
  dateStr: string;
  doctors: Doctor[];
  bookings: Booking[];
}) {
  const isToday = dateStr === todayStr();
  return (
    <div id={`day-${dateStr}`} className="bg-white border border-stone-200 rounded-lg overflow-hidden">
      <div
        className={`sticky top-0 z-10 px-4 py-2 border-b border-stone-200 text-sm font-medium ${
          isToday ? "bg-brand-50 text-brand-800" : "bg-stone-50 text-stone-700"
        }`}
      >
        {dayLabel(dateStr)}{" "}
        {isToday && <span className="text-[10px] ml-2 uppercase tracking-wide">today</span>}
      </div>

      {doctors.length === 0 ? (
        <p className="p-4 text-xs text-stone-500">No doctors visible.</p>
      ) : (
        <div className="overflow-x-auto">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `60px repeat(${doctors.length}, minmax(140px, 1fr))`,
              minWidth: doctors.length * 140 + 60,
            }}
          >
            {/* Header row: empty corner + doctor names */}
            <div className="border-b border-stone-200 bg-stone-50" />
            {doctors.map((d) => (
              <div
                key={d.id}
                className="border-b border-stone-200 bg-stone-50 px-2 py-1.5 text-xs font-medium text-stone-600 truncate"
              >
                {d.display_name}
              </div>
            ))}

            {/* Time axis column */}
            <div className="relative" style={{ height: TOTAL_HEIGHT }}>
              {HOURS.map((h, i) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 text-[10px] text-stone-400 px-1.5"
                  style={{ top: i * 60 * PX_PER_MIN }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Doctor columns with absolute-positioned bookings */}
            {doctors.map((d) => {
              const docBookings = bookings.filter((b) => b.doctor_id === d.id);
              return (
                <div
                  key={d.id}
                  className="relative border-l border-stone-100"
                  style={{ height: TOTAL_HEIGHT }}
                >
                  {/* Hour gridlines */}
                  {HOURS.map((h, i) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-stone-100"
                      style={{ top: i * 60 * PX_PER_MIN }}
                    />
                  ))}
                  {/* Half-hour minor gridlines */}
                  {HOURS.slice(0, -1).map((h, i) => (
                    <div
                      key={`half-${h}`}
                      className="absolute left-0 right-0 border-t border-dashed border-stone-100/60"
                      style={{ top: (i * 60 + 30) * PX_PER_MIN }}
                    />
                  ))}

                  {/* Bookings */}
                  {docBookings.map((b) => {
                    const start = new Date(b.slot_start);
                    const end = new Date(b.slot_end);
                    const pos = offsetForBooking(start, end);
                    if (!pos) return null;
                    const isConfirmed = b.status === "confirmed";
                    return (
                      <div
                        key={b.id}
                        className={`absolute left-1 right-1 rounded px-1.5 py-0.5 overflow-hidden text-[11px] leading-tight ${
                          isConfirmed
                            ? "bg-green-50 text-green-800 border-l-2 border-green-500"
                            : "bg-amber-50 text-amber-800 border-l-2 border-amber-500"
                        }`}
                        style={{ top: pos.top, height: pos.height }}
                        title={`${timeLabel(start)}–${timeLabel(end)} · ${b.patient?.full_name || "Patient"}${b.visit_reason ? ` · ${b.visit_reason}` : ""}`}
                      >
                        <div className="font-medium truncate">
                          {timeLabel(start)}–{timeLabel(end)}
                        </div>
                        <div className="truncate">{b.patient?.full_name || "Patient"}</div>
                        {b.visit_reason && pos.height > 38 && (
                          <div className="truncate text-[10px] opacity-80">{b.visit_reason}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
