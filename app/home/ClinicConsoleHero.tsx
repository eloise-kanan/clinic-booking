"use client";

// iPad-lockscreen-style hero for the clinic terminal home.
// Live-updating time, large readable date, clinic name banner.
// Background defaults to a Kanan-brand navy gradient; an image URL can be
// supplied via env (NEXT_PUBLIC_TERMINAL_BG_URL) or per-clinic setting later.

import { useEffect, useState } from "react";

export default function ClinicConsoleHero({
  clinicName,
  backgroundUrl,
}: {
  clinicName: string;
  backgroundUrl?: string | null;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = now ? String(now.getHours()).padStart(2, "0") : "--";
  const mm = now ? String(now.getMinutes()).padStart(2, "0") : "--";
  const weekday = now
    ? now.toLocaleDateString("en-GB", { weekday: "long" })
    : "";
  const dateLine = now
    ? now.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    : "";

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden mb-4 text-white"
      style={{
        backgroundImage: backgroundUrl
          ? `linear-gradient(180deg, rgba(27,42,74,0.55) 0%, rgba(27,42,74,0.75) 100%), url('${backgroundUrl}')`
          : "linear-gradient(135deg, #1B2A4A 0%, #2B3F70 60%, #C9A227 180%)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Subtle Kanan-gold accent line at the top */}
      <div className="absolute top-0 inset-x-0 h-[3px] bg-[#C9A227]" />

      <div className="px-6 py-8 sm:px-10 sm:py-12 flex flex-col items-center text-center">
        <div className="text-[11px] sm:text-[12px] uppercase tracking-[0.35em] text-white/70 mb-1">
          Clinic console
        </div>
        <div className="text-lg sm:text-xl font-semibold mb-6 sm:mb-8 truncate max-w-full">
          {clinicName}
        </div>

        <div className="text-6xl sm:text-7xl md:text-8xl font-light tabular-nums tracking-tight leading-none">
          {hh}<span className="opacity-80">:</span>{mm}
        </div>
        <div className="mt-2 text-sm sm:text-base text-white/80">
          {weekday}
          {weekday && dateLine && <span className="mx-2 text-white/40">·</span>}
          {dateLine}
        </div>
      </div>
    </div>
  );
}
