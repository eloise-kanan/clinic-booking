"use client";

// Clinic-terminal home — two-stage flow:
//   1) LOCKED: terminal is signed in but no PIN holder identified. Shows the
//      full lockscreen (big clock + count tiles + "Sign in" / "Owner sign-in"
//      buttons). Count tiles are read-only here; tapping them prompts PIN.
//   2) IDENTIFIED: a nurse/doctor has PIN'd in. Lockscreen shrinks to a
//      compact header; below it, role-specific category cards group the
//      pages this staff member typically uses. "Lock" returns to LOCKED.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import PinChallenge from "@/components/PinChallenge";
import {
  readPinSession,
  writePinSession,
  clearPinSession,
  type PinSession,
} from "@/lib/pin-client";
import type { TerminalTheme } from "@/lib/terminal-theme";

type Counts = {
  pending: number;
  recalls: number;
  today: number;
  reminders: number;
};

// Role-specific category cards on the identified screen. Kept lightweight
// (no DB lookups) — labels/links mirror the staff sidebar nav structure.
type CategoryItem = { href: string; label: string; countKey?: keyof Counts };
type Category = { title: string; items: CategoryItem[] };

const NURSE_CATEGORIES: Category[] = [
  {
    title: "Bookings",
    items: [
      { href: "/nurse", label: "Pending", countKey: "pending" },
      { href: "/staff/new", label: "New booking" },
      { href: "/nurse/all", label: "All bookings" },
      { href: "/nurse/patients", label: "Patients" },
    ],
  },
  {
    title: "Communications",
    items: [
      { href: "/staff/reminders", label: "Send reminders", countKey: "reminders" },
      { href: "/staff/recalls", label: "Send recalls", countKey: "recalls" },
      { href: "/staff/templates", label: "WhatsApp templates" },
    ],
  },
  {
    title: "Calendar",
    items: [
      { href: "/nurse/calendar", label: "Clinical calendar", countKey: "today" },
      { href: "/staff/duty-calendar", label: "Duty calendar" },
    ],
  },
  {
    title: "HR",
    items: [
      { href: "/staff/leave", label: "Leave" },
      { href: "/staff/duty", label: "Shift changes" },
      { href: "/staff/profile", label: "My account" },
    ],
  },
];

const DOCTOR_CATEGORIES: Category[] = [
  {
    title: "My day",
    items: [
      { href: "/doctor", label: "Today's patients" },
      { href: "/doctor/calendar", label: "My calendar" },
      { href: "/doctor/breaks", label: "Block time" },
    ],
  },
  {
    title: "Patients",
    items: [{ href: "/doctor/patients", label: "My patients" }],
  },
  {
    title: "HR",
    items: [
      { href: "/staff/leave", label: "Leave" },
      { href: "/staff/duty", label: "Shift changes" },
      { href: "/staff/profile", label: "My account" },
    ],
  },
];

export default function ClinicConsole({
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
  const [session, setSession] = useState<PinSession | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);

  // Clock tick
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Detect PIN session on mount + when storage changes (e.g. expiry tick)
  useEffect(() => {
    const tick = () => setSession(readPinSession());
    tick();
    const id = setInterval(tick, 5_000);
    return () => clearInterval(id);
  }, []);

  async function endSession() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function lockPersonal() {
    // Clear PIN session + per-page cookie; terminal stays signed in.
    clearPinSession();
    fetch("/api/pin/lock-token", { method: "DELETE" }).catch(() => {});
    setSession(null);
  }

  // Idle auto-signout — 30 min no input → end terminal session entirely.
  useEffect(() => {
    const IDLE_MS = 30 * 60_000;
    let timer: ReturnType<typeof setTimeout>;
    function reset() {
      clearTimeout(timer);
      timer = setTimeout(() => endSession(), IDLE_MS);
    }
    const events = ["mousemove", "keydown", "touchstart", "click", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hh = now ? String(now.getHours()).padStart(2, "0") : "--";
  const mm = now ? String(now.getMinutes()).padStart(2, "0") : "--";
  const weekday = now ? now.toLocaleDateString("en-GB", { weekday: "long" }) : "";
  const dateLine = now
    ? now.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    : "";

  // Shared background painted directly on the parent container's inline
  // style — guaranteed to apply (Tailwind arbitrary-value classes like
  // bg-[#1B2A4A] get JIT-purged when held in variables; inline style is
  // immune). Photo (if any) is an absolute sibling layered on top.
  const parentStyle: React.CSSProperties = backgroundUrl
    ? { background: "#1B2A4A" }
    : { backgroundImage: theme.gradient, backgroundSize: "cover" };

  const bg = (
    <>
      {backgroundUrl && (
        <>
          <div
            className="absolute inset-0 scale-110 blur-2xl"
            style={{
              backgroundImage: `url('${backgroundUrl}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(180deg, ${theme.overlayTop} 0%, ${theme.overlayBottom} 100%)`,
            }}
          />
        </>
      )}
      <div className="absolute top-0 inset-x-0 h-[3px]" style={{ background: theme.accent }} />
    </>
  );

  const categories =
    session?.role === "doctor" ? DOCTOR_CATEGORIES : session?.role === "nurse" ? NURSE_CATEGORIES : [];

  // ── IDENTIFIED LAYOUT ────────────────────────────────────────────────────
  if (session) {
    return (
      <div className="min-h-dvh relative overflow-hidden text-white" style={parentStyle}>
        {bg}
        {/* Compact header (relative + z-10 stacks above the absolute bg layers) */}
        <div className="relative z-10 px-4 pt-6 pb-4 sm:px-6 sm:pt-8 sm:pb-6 flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.35em] text-white/60">
              {clinicName}
            </div>
            <div className="flex items-baseline gap-3 mt-1">
              <div className="text-3xl sm:text-4xl font-light tabular-nums leading-none">
                {hh}<span className="opacity-75">:</span>{mm}
              </div>
              <div className="text-xs sm:text-sm text-white/70">{weekday} · {dateLine}</div>
            </div>
            <div className="mt-2 inline-flex items-center gap-2 text-[12px] sm:text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              <span>
                Signed in as <strong className="font-semibold">{session.full_name}</strong>{" "}
                <span className="text-white/60">({session.role})</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={lockPersonal}
              className="text-[11px] uppercase tracking-wider text-white/70 hover:text-white px-3 py-1.5 rounded border border-white/20 hover:border-white/40"
            >
              Lock
            </button>
            <button
              type="button"
              onClick={endSession}
              className="text-[11px] uppercase tracking-wider text-white/50 hover:text-white px-3 py-1.5 rounded border border-white/15 hover:border-white/40"
              title="Sign out the entire terminal (not just your PIN)"
            >
              End session
            </button>
          </div>
        </div>

        {/* Category cards */}
        <div className="relative z-10 px-4 pb-6 sm:px-6 sm:pb-8 space-y-4">
          {categories.map((cat) => (
            <section key={cat.title}>
              <h3 className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-white/55 mb-2 px-1">
                {cat.title}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {cat.items.map((item) => {
                  const count = item.countKey ? counts[item.countKey] : null;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 hover:border-white/30 rounded-xl px-3 py-3 transition-colors"
                    >
                      <div className="text-sm font-medium leading-tight">{item.label}</div>
                      {count != null && (
                        <div className="mt-1 text-[11px] text-white/70 tabular-nums">{count} pending</div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  }

  // ── LOCKED LAYOUT ────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 flex flex-col text-white overflow-hidden" style={parentStyle}>
      {bg}

      {/* Corner end-session — terminal full sign-out */}
      <button
        type="button"
        onClick={endSession}
        className="absolute top-4 right-4 z-10 text-[11px] uppercase tracking-wider text-white/60 hover:text-white px-3 py-1 rounded border border-white/20 hover:border-white/40 transition-colors"
      >
        End session
      </button>

      {/* Clock */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center min-h-0">
        <div className="text-[11px] sm:text-xs uppercase tracking-[0.4em] text-white/60 mb-2">
          Clinic console
        </div>
        <div className="text-xl sm:text-2xl md:text-3xl font-semibold mb-6 sm:mb-8 max-w-full truncate">
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

        {/* Primary CTA — staff PIN sign-in */}
        <div className="mt-8 flex flex-col items-center gap-2.5">
          <button
            type="button"
            onClick={() => setPinOpen(true)}
            className="bg-white text-stone-900 hover:bg-white/90 rounded-full px-8 py-3 text-sm font-medium shadow-xl"
          >
            Sign in (staff PIN)
          </button>
          <button
            type="button"
            onClick={() => setOwnerOpen(true)}
            className="text-[12px] text-white/70 hover:text-white underline-offset-2 hover:underline"
          >
            Owner sign-in →
          </button>
        </div>
      </div>

      {/* Counts strip */}
      <div className="px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl">
          <div className="grid grid-cols-4 divide-x divide-white/15">
            <CountTile label="Pending" value={counts.pending} />
            <CountTile label="Recalls due" value={counts.recalls} />
            <CountTile label="Today" value={counts.today} />
            <CountTile label="Reminders" value={counts.reminders} />
          </div>
        </div>
        <p className="text-[10px] sm:text-[11px] text-white/55 text-center mt-3">
          Tap <strong>Sign in</strong> with your staff PIN to take action on these.
        </p>
      </div>

      {/* PIN modal — verifies + sets per-page lock-token cookie */}
      <PinChallenge
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        onVerified={async ({ profile_id, pin, full_name, role }) => {
          // Cache locally for action-level PIN gates (90s grace).
          writePinSession({ profile_id, pin, full_name, role });
          // And set the signed cookie for page-level gates (5 min sliding).
          await fetch("/api/pin/lock-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profile_id, pin }),
          }).catch(() => {});
          setPinOpen(false);
          setSession(readPinSession());
        }}
      />

      {/* Owner sign-in — leaves terminal, sends to /login */}
      <OwnerSignInModal
        open={ownerOpen}
        onClose={() => setOwnerOpen(false)}
        onProceed={async () => {
          // Sign out terminal so the next page is /login.
          const supabase = createClient();
          await supabase.auth.signOut();
          router.replace("/login");
        }}
      />
    </div>
  );
}

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="block px-3 py-4 sm:py-5 text-center first:rounded-l-2xl last:rounded-r-2xl">
      <div className="text-3xl sm:text-4xl font-light tabular-nums leading-none">{value}</div>
      <div className="mt-1 sm:mt-1.5 text-[10px] sm:text-[11px] uppercase tracking-wider text-white/70">
        {label}
      </div>
    </div>
  );
}

function OwnerSignInModal({
  open,
  onClose,
  onProceed,
}: {
  open: boolean;
  onClose: () => void;
  onProceed: () => Promise<void>;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white text-stone-900 rounded-2xl shadow-2xl w-full max-w-sm p-5">
        <h3 className="text-base font-semibold mb-1">Owner sign-in</h3>
        <p className="text-xs text-stone-500 mb-4">
          You&apos;ll be signed out of the terminal and sent to the login screen, where you can enter your owner email + password.
        </p>
        <div className="flex items-center gap-2">
          <button onClick={onProceed} className="btn-primary flex-1">
            Continue
          </button>
          <button onClick={onClose} className="btn">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
