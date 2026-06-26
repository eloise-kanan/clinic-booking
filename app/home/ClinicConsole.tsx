"use client";

// Terminal mode lockscreen. Fills the entire viewport like an iPad lock
// screen — clinic name banner, huge live clock, date — with a single
// rectangle card underneath summarising pending-action counts. No sidebar,
// no nav. Tapping a count tile will open the action (PIN unlock in Phase 4).

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import type { TerminalTheme } from "@/lib/terminal-theme";

type Counts = {
  pending: number;       // pending bookings awaiting confirmation
  recalls: number;       // patients due for recall
  today: number;         // today's confirmed appointments
  reminders: number;     // tomorrow's bookings that still need reminder sent
};

export default function ClinicConsoleLockscreen({
  clinicName,
  theme,
  backgroundUrl,
  counts,
}: {
  clinicName: string;
  theme: TerminalTheme;
  backgroundUrl?: string | null;
  counts: Counts;
}) {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  async function endSession() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const hh = now ? String(now.getHours()).padStart(2, "0") : "--";
  const mm = now ? String(now.getMinutes()).padStart(2, "0") : "--";
  const weekday = now ? now.toLocaleDateString("en-GB", { weekday: "long" }) : "";
  const dateLine = now
    ? now.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    : "";

  return (
    <div className="fixed inset-0 flex flex-col text-white overflow-hidden">
      {/* Background layer 1: either the theme's gradient OR the uploaded photo.
          Photo is heavily blurred + scaled (scale-110 prevents blur-edge gaps). */}
      {backgroundUrl ? (
        <div
          className="absolute inset-0 -z-10 scale-110 blur-2xl"
          style={{
            backgroundImage: `url('${backgroundUrl}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      ) : (
        <div
          className="absolute inset-0 -z-10"
          style={{ backgroundImage: theme.gradient }}
        />
      )}
      {/* Background layer 2: theme-tinted dark overlay so the clock reads
          clearly on top of any image. Only painted when a photo is set;
          gradients are already dark enough. */}
      {backgroundUrl && (
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: `linear-gradient(180deg, ${theme.overlayTop} 0%, ${theme.overlayBottom} 100%)`,
          }}
        />
      )}

      {/* themed accent rail */}
      <div className="absolute top-0 inset-x-0 h-[3px]" style={{ background: theme.accent }} />

      {/* Corner sign-out — small, unobtrusive */}
      <button
        type="button"
        onClick={endSession}
        className="absolute top-4 right-4 z-10 text-[11px] uppercase tracking-wider text-white/60 hover:text-white px-3 py-1 rounded border border-white/20 hover:border-white/40 transition-colors"
      >
        End session
      </button>

      {/* Clock area — fills the viewport above the counts strip */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center min-h-0">
        <div className="text-[11px] sm:text-xs uppercase tracking-[0.4em] text-white/60 mb-2">
          Clinic console
        </div>
        <div className="text-xl sm:text-2xl md:text-3xl font-semibold mb-8 sm:mb-10 max-w-full truncate">
          {clinicName}
        </div>

        <div className="text-[20vw] sm:text-[18vw] md:text-[15vw] lg:text-[13vw] xl:text-[11vw] font-light tabular-nums leading-none tracking-tight">
          {hh}<span className="opacity-75">:</span>{mm}
        </div>
        <div className="mt-4 text-sm sm:text-base md:text-lg text-white/75">
          {weekday}
          {weekday && dateLine && <span className="mx-2 text-white/40">·</span>}
          {dateLine}
        </div>
      </div>

      {/* Counts strip — single rectangle card, edge-to-edge bottom band */}
      <div className="px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl">
          <div className="grid grid-cols-4 divide-x divide-white/15">
            <CountTile label="Pending bookings" value={counts.pending} href="/nurse" />
            <CountTile label="Recalls due" value={counts.recalls} href="/staff/recalls" />
            <CountTile label="Today" value={counts.today} href="/owner/calendar" />
            <CountTile label="Reminders" value={counts.reminders} href="/staff/reminders" />
          </div>
        </div>
        <p className="text-[10px] sm:text-[11px] text-white/55 text-center mt-3">
          Tap a tile to open it — staff PIN required to take action.
        </p>
      </div>
    </div>
  );
}

function CountTile({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="block px-3 py-4 sm:py-5 text-center hover:bg-white/5 transition-colors first:rounded-l-2xl last:rounded-r-2xl"
    >
      <div className="text-3xl sm:text-4xl font-light tabular-nums leading-none">
        {value}
      </div>
      <div className="mt-1 sm:mt-1.5 text-[10px] sm:text-[11px] uppercase tracking-wider text-white/70">
        {label}
      </div>
    </Link>
  );
}
