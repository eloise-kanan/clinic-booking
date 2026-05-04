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
type LeaveMark = { doctor_id: string; date: string };
type CustomShift = {
  doctor_id: string;
  date: string;
  start_time: string;
  end_time: string;
};

const DAY_BATCH = 7;
const FIRST_HOUR = 9;
const LAST_HOUR = 21; // 21:00 — last grid line
const PX_PER_MIN = 0.85; // ~51px per hour
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

function offsetForBooking(start: Date, end: Date) {
  const startMin = (start.getHours() - FIRST_HOUR) * 60 + start.getMinutes();
  const endMin = (end.getHours() - FIRST_HOUR) * 60 + end.getMinutes();
  const visStart = Math.max(0, startMin);
  const visEnd = Math.min(TOTAL_MINUTES, endMin > 0 ? endMin : TOTAL_MINUTES);
  if (visEnd <= visStart) return null;
  return {
    top: visStart * PX_PER_MIN,
    height: (visEnd - visStart) * PX_PER_MIN,
  };
}

export default function CalendarView({ doctors, scope }: { doctors: Doctor[]; scope: "all" | "own" }) {
  void scope;
  const [startDate, setStartDate] = useState<string>("");
  const [daysCount, setDaysCount] = useState<number>(DAY_BATCH);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [onLeave, setOnLeave] = useState<LeaveMark[]>([]);
  const [customShifts, setCustomShifts] = useState<CustomShift[]>([]);
  const [pickerDate, setPickerDate] = useState<string>("");
  const [selected, setSelected] = useState<Booking | null>(null);
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
      .then((d) => {
        setBookings(d.bookings || []);
        setOnLeave(d.onLeave || []);
        setCustomShifts(d.customShifts || []);
      })
      .catch(() => {
        setBookings([]);
        setOnLeave([]);
        setCustomShifts([]);
      });
  }, [startDate, daysCount]);

  // Close modal on Escape
  useEffect(() => {
    if (!selected) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

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

  // Set of "doctor_id-date" strings indicating on-leave full-day coverage
  const leaveSet = useMemo(() => {
    const s = new Set<string>();
    for (const lm of onLeave) s.add(`${lm.doctor_id}-${lm.date}`);
    return s;
  }, [onLeave]);

  // Map "doctor_id-date" to the approved custom shift for that day, if any
  const shiftMap = useMemo(() => {
    const m = new Map<string, CustomShift>();
    for (const cs of customShifts) m.set(`${cs.doctor_id}-${cs.date}`, cs);
    return m;
  }, [customShifts]);

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
            leaveSet={leaveSet}
            shiftMap={shiftMap}
            onSelect={setSelected}
          />
        ))}
      </div>

      <div className="mt-4 flex justify-center">
        <button type="button" className="btn" onClick={() => setDaysCount((d) => d + DAY_BATCH)}>
          Load {DAY_BATCH} more days
        </button>
      </div>

      {selected && (
        <BookingDetailsModal
          booking={selected}
          doctors={doctors}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// Convert "HH:MM[:SS]" to minutes since midnight
function hmsToMinutes(s: string): number {
  const [h, m] = s.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

// Convert "minutes since midnight" relative to FIRST_HOUR into a top px,
// clamped to the visible window. Returns 0..TOTAL_HEIGHT.
function minutesToTop(minutesSinceMidnight: number): number {
  const m = Math.max(FIRST_HOUR * 60, Math.min(LAST_HOUR * 60, minutesSinceMidnight));
  return (m - FIRST_HOUR * 60) * PX_PER_MIN;
}

const STRIPE_BG_RED =
  "repeating-linear-gradient(45deg, transparent 0 6px, rgba(239,68,68,0.10) 6px 12px)";
const STRIPE_BG_GREY =
  "repeating-linear-gradient(45deg, transparent 0 6px, rgba(120,113,108,0.10) 6px 12px)";

function DaySection({
  dateStr,
  doctors,
  bookings,
  leaveSet,
  shiftMap,
  onSelect,
}: {
  dateStr: string;
  doctors: Doctor[];
  bookings: Booking[];
  leaveSet: Set<string>;
  shiftMap: Map<string, CustomShift>;
  onSelect: (b: Booking) => void;
}) {
  const isToday = dateStr === todayStr();
  return (
    <div id={`day-${dateStr}`} className="bg-white border border-stone-200 rounded-lg overflow-hidden">
      <div
        className={`px-4 py-2 border-b border-stone-200 text-sm font-medium ${
          isToday ? "bg-brand-50 text-brand-800" : "bg-stone-50 text-stone-700"
        }`}
      >
        {dayLabel(dateStr)}{" "}
        {isToday && <span className="text-[10px] ml-2 uppercase tracking-wide">today</span>}
      </div>

      {doctors.length === 0 ? (
        <p className="p-4 text-xs text-stone-500">No doctors visible.</p>
      ) : (
        <div
          className="grid"
          style={{
            gridTemplateColumns: `44px repeat(${doctors.length}, minmax(0, 1fr))`,
          }}
        >
          <div className="border-b border-stone-200 bg-stone-50" />
          {doctors.map((d) => (
            <div
              key={d.id}
              className="border-b border-stone-200 bg-stone-50 px-1.5 py-1.5 text-[11px] font-medium text-stone-600 truncate"
              title={d.display_name}
            >
              {d.display_name}
            </div>
          ))}

          <div className="relative" style={{ height: TOTAL_HEIGHT }}>
            {HOURS.map((h, i) => (
              <div
                key={h}
                className="absolute left-0 right-0 text-[10px] text-stone-400 px-1"
                style={{ top: i * 60 * PX_PER_MIN }}
              >
                {String(h).padStart(2, "0")}
              </div>
            ))}
          </div>

          {doctors.map((d) => {
            const docBookings = bookings.filter((b) => b.doctor_id === d.id);
            const onLeave = leaveSet.has(`${d.id}-${dateStr}`);
            const shift = shiftMap.get(`${d.id}-${dateStr}`);
            const offDutyZones: { topPx: number; heightPx: number }[] = [];
            if (!onLeave && shift) {
              const startMin = hmsToMinutes(shift.start_time);
              const endMin = hmsToMinutes(shift.end_time);
              const beforeTop = 0;
              const beforeHeight = minutesToTop(startMin) - 0;
              if (beforeHeight > 0) offDutyZones.push({ topPx: beforeTop, heightPx: beforeHeight });
              const afterTop = minutesToTop(endMin);
              const afterHeight = TOTAL_HEIGHT - afterTop;
              if (afterHeight > 0) offDutyZones.push({ topPx: afterTop, heightPx: afterHeight });
            }
            return (
              <div
                key={d.id}
                className="relative border-l border-stone-100"
                style={{ height: TOTAL_HEIGHT }}
              >
                {HOURS.map((h, i) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-stone-100 pointer-events-none"
                    style={{ top: i * 60 * PX_PER_MIN }}
                  />
                ))}
                {HOURS.slice(0, -1).map((h, i) => (
                  <div
                    key={`half-${h}`}
                    className="absolute left-0 right-0 border-t border-dashed border-stone-100/60 pointer-events-none"
                    style={{ top: (i * 60 + 30) * PX_PER_MIN }}
                  />
                ))}

                {/* Off-duty stripes (around a custom shift) */}
                {offDutyZones.map((z, idx) => (
                  <div
                    key={`off-${idx}`}
                    className="absolute left-0 right-0 pointer-events-none"
                    style={{
                      top: z.topPx,
                      height: z.heightPx,
                      backgroundImage: STRIPE_BG_GREY,
                    }}
                  />
                ))}

                {/* On-leave full-day overlay */}
                {onLeave && (
                  <div
                    className="absolute inset-0 pointer-events-none flex items-start justify-center"
                    style={{ backgroundImage: STRIPE_BG_RED }}
                  >
                    <span className="mt-2 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-medium">
                      🏖 On leave
                    </span>
                  </div>
                )}

                {/* "Off duty" pill if there's a custom shift today */}
                {!onLeave && shift && (
                  <div
                    className="absolute left-0 right-0 flex justify-center pointer-events-none"
                    style={{ top: 2 }}
                  >
                    <span className="px-1.5 py-0.5 rounded bg-stone-200/80 text-stone-700 text-[10px] font-medium">
                      Shift {shift.start_time.slice(0, 5)}–{shift.end_time.slice(0, 5)}
                    </span>
                  </div>
                )}

                {/* Bookings */}
                {docBookings.map((b) => {
                  const start = new Date(b.slot_start);
                  const end = new Date(b.slot_end);
                  const pos = offsetForBooking(start, end);
                  if (!pos) return null;
                  const isConfirmed = b.status === "confirmed";
                  const name = b.patient?.full_name || "Patient";
                  const reason = b.visit_reason || "";
                  return (
                    <button
                      type="button"
                      key={b.id}
                      onClick={() => onSelect(b)}
                      className={`absolute left-1 right-1 rounded px-1.5 py-0.5 overflow-hidden text-left text-[11px] leading-tight cursor-pointer hover:brightness-95 transition ${
                        isConfirmed
                          ? "bg-green-50 text-green-800 border-l-2 border-green-500"
                          : "bg-amber-50 text-amber-800 border-l-2 border-amber-500"
                      }`}
                      style={{ top: pos.top, height: pos.height }}
                      title={`${timeLabel(start)}–${timeLabel(end)} · ${name}${reason ? ` · ${reason}` : ""}`}
                    >
                      <div className="truncate font-medium">
                        {name}
                        {reason && <span className="font-normal opacity-80"> — {reason}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BookingDetailsModal({
  booking,
  doctors,
  onClose,
}: {
  booking: Booking;
  doctors: Doctor[];
  onClose: () => void;
}) {
  const start = new Date(booking.slot_start);
  const end = new Date(booking.slot_end);
  const doctor = doctors.find((d) => d.id === booking.doctor_id);
  const dateLine = start.toLocaleDateString("en-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl max-w-md w-full p-5 shadow-lg max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-medium">
              {booking.patient?.full_name || "Patient"}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5 capitalize">{booking.type} · {booking.status}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <dl className="text-sm divide-y divide-stone-100">
          <div className="py-2 grid grid-cols-[100px_1fr] gap-2">
            <dt className="text-xs text-stone-500">Date</dt>
            <dd>{dateLine}</dd>
          </div>
          <div className="py-2 grid grid-cols-[100px_1fr] gap-2">
            <dt className="text-xs text-stone-500">Time</dt>
            <dd>
              {timeLabel(start)} – {timeLabel(end)}
            </dd>
          </div>
          <div className="py-2 grid grid-cols-[100px_1fr] gap-2">
            <dt className="text-xs text-stone-500">Doctor</dt>
            <dd>{doctor?.display_name || "—"}</dd>
          </div>
          {booking.visit_reason && (
            <div className="py-2 grid grid-cols-[100px_1fr] gap-2">
              <dt className="text-xs text-stone-500">Reason</dt>
              <dd className="break-words whitespace-pre-wrap">{booking.visit_reason}</dd>
            </div>
          )}
        </dl>

        <button type="button" onClick={onClose} className="btn-primary w-full mt-5">
          Close
        </button>
      </div>
    </div>
  );
}
