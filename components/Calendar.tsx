"use client";

import { useState, useEffect } from "react";
import { localYmd, addDaysYmd } from "@/lib/local-date";

type Props = {
  value: string;
  onChange: (ymd: string) => void;
  minDate?: string;
  maxDate?: string;
};

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ymdParts(ymd: string): { y: number; m: number; d: number } {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y, m, d };
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

// Day-of-week with Monday=0. JS Date.getDay() is Sunday=0.
function dowMon(y: number, m: number, d: number): number {
  const js = new Date(y, m - 1, d).getDay();
  return (js + 6) % 7;
}

function toYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function Calendar({ value, onChange, minDate, maxDate }: Props) {
  // Anchor: which month is currently visible.
  const today = localYmd();
  const initialAnchor = value || minDate || today;
  const { y: iy, m: im } = ymdParts(initialAnchor);
  const [view, setView] = useState({ y: iy, m: im });

  // Keep the visible month in sync when `value` changes externally
  // (e.g. midnight rollover bumped it forward).
  useEffect(() => {
    if (!value) return;
    const { y, m } = ymdParts(value);
    setView((cur) => (cur.y === y && cur.m === m ? cur : { y, m }));
  }, [value]);

  const firstDow = dowMon(view.y, view.m, 1);
  const lastDay = daysInMonth(view.y, view.m);

  // Build cells: leading blanks + day numbers, padded out to a multiple of 7.
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function canGoPrev(): boolean {
    if (!minDate) return true;
    const { y, m } = ymdParts(minDate);
    return view.y > y || (view.y === y && view.m > m);
  }
  function canGoNext(): boolean {
    if (!maxDate) return true;
    const { y, m } = ymdParts(maxDate);
    return view.y < y || (view.y === y && view.m < m);
  }

  function shiftMonth(delta: number) {
    setView((cur) => {
      let m = cur.m + delta;
      let y = cur.y;
      while (m < 1) {
        m += 12;
        y -= 1;
      }
      while (m > 12) {
        m -= 12;
        y += 1;
      }
      return { y, m };
    });
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          disabled={!canGoPrev()}
          className="px-2 py-1 text-stone-600 hover:bg-stone-100 rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="text-sm font-medium text-stone-900">
          {MONTHS[view.m - 1]} {view.y}
        </div>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          disabled={!canGoNext()}
          className="px-2 py-1 text-stone-600 hover:bg-stone-100 rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW.map((d) => (
          <div key={d} className="text-[10px] text-stone-400 font-medium text-center py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const cellYmd = toYmd(view.y, view.m, d);
          const isPast = !!minDate && cellYmd < minDate;
          const isFuture = !!maxDate && cellYmd > maxDate;
          const disabled = isPast || isFuture;
          const isToday = cellYmd === today;
          const isSelected = cellYmd === value;

          let cls =
            "h-9 text-sm rounded-md transition-colors flex items-center justify-center ";
          if (disabled) {
            cls +=
              "text-stone-300 cursor-not-allowed bg-stone-50";
          } else if (isSelected) {
            cls += "text-white font-semibold";
          } else if (isToday) {
            cls += "text-stone-900 font-semibold ring-1 ring-stone-300 hover:bg-stone-100";
          } else {
            cls += "text-stone-700 hover:bg-stone-100";
          }

          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onChange(cellYmd)}
              className={cls}
              style={isSelected ? { background: "var(--brand, #0d9488)" } : undefined}
              aria-label={cellYmd}
              aria-pressed={isSelected}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
