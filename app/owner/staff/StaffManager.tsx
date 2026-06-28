"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fullNameToLoginId } from "@/lib/login-id";

type HistoryItem = {
  type: "leave" | "shift";
  id: string;
  status: string;
  label: string;
  sub: string;
  created_at: string;
};

type Member = {
  id: string;
  role: "owner" | "nurse" | "doctor" | "terminal";
  full_name: string;
  active: boolean;
  email: string;             // owner's real email; synthetic @kanan-clinic.local for staff (never shown)
  login_id: string | null;   // null for owner; e.g. "tan_ming" for staff; "terminal" for the shared console
  pin_set: boolean;          // true if staff has a PIN configured
  doctor: {
    id: string;
    display_name: string;
    default_slot_minutes: number;
    active: boolean;
    expertise?: string | null;
    bio?: string | null;
    rating_average?: number | null;
    rating_count?: number | null;
  } | null;
  working_hours?: { weekday: number; start_time: string; end_time: string }[];
  balances?: { annual: number; mc: number; emergency: number };
  history?: HistoryItem[];
};

const WEEKDAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function StaffManager({
  initial,
  doctorProfilesEnabled = false,
}: {
  initial: Member[];
  doctorProfilesEnabled?: boolean;
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [role, setRole] = useState<"nurse" | "doctor">("nurse");
  const [fullName, setFullName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [loginIdTouched, setLoginIdTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Auto-derive login ID from full name until the owner edits it directly
  useEffect(() => {
    if (!loginIdTouched) {
      setLoginId(fullNameToLoginId(fullName));
    }
  }, [fullName, loginIdTouched]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        full_name: fullName,
        login_id: loginId,
        password,
        default_slot_minutes: role === "doctor" ? slotMinutes : undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      setErr(data.error || "Failed");
      return;
    }
    setShow(false);
    setFullName("");
    setLoginId("");
    setLoginIdTouched(false);
    setPassword("");
    router.refresh();
  }

  async function toggleActive(m: Member) {
    if (!confirm(`${m.active ? "Deactivate" : "Reactivate"} ${m.full_name}?`)) return;
    await fetch("/api/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: m.id, active: !m.active }),
    });
    router.refresh();
  }

  async function setPin(m: Member) {
    const pin = prompt(
      `Set 6-digit PIN for ${m.full_name}.\n\nThis is what they'll type at the clinic terminal to confirm bookings, send reminders, unlock HR pages, etc.\n\nGive them the PIN privately.`
    );
    if (!pin) return;
    if (!/^\d{6}$/.test(pin)) {
      alert("PIN must be exactly 6 digits");
      return;
    }
    const res = await fetch(`/api/staff/${m.id}/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed");
      return;
    }
    alert(`PIN set for ${m.full_name}. They use ${pin} at the clinic terminal.`);
    router.refresh();
  }

  async function clearPin(m: Member) {
    if (!confirm(`Clear PIN for ${m.full_name}? They won't be able to do PIN-gated actions until you set a new one.`)) return;
    const res = await fetch(`/api/staff/${m.id}/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: true }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed");
      return;
    }
    router.refresh();
  }

  async function resetPassword(m: Member) {
    const next = prompt(
      `Reset password for ${m.full_name}.\nEnter the new password (min 8 characters).\nThey can change it themselves later.`
    );
    if (!next) return;
    if (next.length < 8) {
      alert("Password must be at least 8 characters");
      return;
    }
    const res = await fetch(`/api/staff/${m.id}/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_password: next }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed");
      return;
    }
    alert(`Password updated. Share the new password with ${m.full_name} securely.`);
  }

  async function signOutTerminals() {
    if (!confirm("Sign out the shared clinic terminal? Any device currently signed in as the terminal will need to re-enter the terminal password to continue.")) return;
    const res = await fetch("/api/admin/terminal-signout", { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Failed");
      return;
    }
    alert("All terminal sessions signed out. The next pageload on any terminal device kicks back to /login.");
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        {!show ? (
          <button onClick={() => setShow(true)} className="btn-primary">
            + Add staff
          </button>
        ) : (
          <form onSubmit={add} className="bg-white border border-stone-200 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Role</label>
                <select className="input" value={role} onChange={(e) => setRole(e.target.value as any)}>
                  <option value="nurse">Nurse</option>
                  <option value="doctor">Doctor</option>
                </select>
              </div>
              <div>
                <label className="label">Full name</label>
                <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Login ID</label>
                <input
                  className="input"
                  type="text"
                  value={loginId}
                  onChange={(e) => { setLoginIdTouched(true); setLoginId(e.target.value.toLowerCase().trim()); }}
                  placeholder="e.g. tan_ming"
                  minLength={3}
                  maxLength={30}
                  required
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Auto-derived from the full name. Edit if it collides with someone else.
                </p>
              </div>
              <div>
                <label className="label">Initial password</label>
                <input className="input" type="text" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
              </div>
            </div>
            {role === "doctor" && (
              <div>
                <label className="label">Default slot length</label>
                <select className="input max-w-[160px]" value={slotMinutes} onChange={(e) => setSlotMinutes(parseInt(e.target.value))}>
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                </select>
              </div>
            )}
            {err && <p className="text-xs text-red-600">{err}</p>}
            <div className="flex gap-2">
              <button className="btn-primary" disabled={busy}>
                {busy ? "Creating…" : "Create account"}
              </button>
              <button type="button" onClick={() => setShow(false)} className="btn">
                Cancel
              </button>
            </div>
          </form>
        )}
        {!show && (
          <button
            type="button"
            onClick={signOutTerminals}
            className="ml-auto text-xs text-stone-600 hover:text-red-700 border border-stone-200 hover:border-red-300 rounded px-2.5 py-1.5"
            title="Forcibly sign out every device currently logged in as the shared terminal account"
          >
            Sign out all terminals
          </button>
        )}
      </div>

      {/* Employee cards — one per nurse/doctor. Owner + terminal rows hidden
          since they're managed elsewhere. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {initial
          .filter((m) => m.role === "doctor" || m.role === "nurse")
          .map((m) => (
            <EmployeeCard
              key={m.id}
              member={m}
              doctorProfilesEnabled={doctorProfilesEnabled}
              onSetPin={() => setPin(m)}
              onClearPin={() => clearPin(m)}
              onResetPassword={() => resetPassword(m)}
              onToggleActive={() => toggleActive(m)}
            />
          ))}
      </div>
    </div>
  );
}

function EmployeeCard({
  member,
  doctorProfilesEnabled,
  onSetPin,
  onClearPin,
  onResetPassword,
  onToggleActive,
}: {
  member: Member;
  doctorProfilesEnabled: boolean;
  onSetPin: () => void;
  onClearPin: () => void;
  onResetPassword: () => void;
  onToggleActive: () => void;
}) {
  const router = useRouter();
  const [bal, setBal] = useState(member.balances || { annual: 14, mc: 14, emergency: 5 });
  const [balBusy, setBalBusy] = useState(false);
  const [balMsg, setBalMsg] = useState<string | null>(null);
  const dirty =
    bal.annual !== (member.balances?.annual ?? 14) ||
    bal.mc !== (member.balances?.mc ?? 14) ||
    bal.emergency !== (member.balances?.emergency ?? 5);

  async function saveBalance() {
    setBalBusy(true);
    setBalMsg(null);
    try {
      const res = await fetch(`/api/staff/${member.id}/balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bal),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setBalMsg(d.error || "Failed");
        return;
      }
      setBalMsg("Saved.");
      router.refresh();
    } finally {
      setBalBusy(false);
      setTimeout(() => setBalMsg(null), 2000);
    }
  }

  const initials = member.full_name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Collapsed by default — the grid would be enormous if every card expanded
  // its working-hours grid + activity list at once. Owner clicks the header
  // (or chevron) to expand a single card to edit.
  const [open, setOpen] = useState(false);

  // Hours summary line for the collapsed view.
  const hoursSummary = (() => {
    if (member.role === "doctor" || member.role === "nurse") {
      if (member.working_hours && member.working_hours.length > 0) {
        const days = new Set(member.working_hours.map((h) => h.weekday)).size;
        return `${days} day${days === 1 ? "" : "s"}/wk · custom`;
      }
      return "Default 09:00–21:00";
    }
    return null;
  })();

  return (
    <div
      className={`bg-white border rounded-xl overflow-hidden ${
        member.active ? "border-stone-200" : "border-stone-200 opacity-60"
      }`}
    >
      {/* Header band — name + role + status. Clicking the band toggles open. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 pt-3 pb-2 border-b border-stone-100 flex items-start gap-3 text-left hover:bg-stone-50 transition-colors"
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0 ${
            member.role === "doctor" ? "bg-blue-500" : "bg-emerald-500"
          }`}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-semibold">{member.full_name}</span>
            <span className="text-[10px] uppercase tracking-wider text-stone-500">
              {member.role}
            </span>
            {!member.active && (
              <span className="text-[10px] text-red-600 font-medium">· Inactive</span>
            )}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5 truncate">
            {member.login_id || "—"}
            {member.role === "doctor" && member.doctor && (
              <span> · {member.doctor.default_slot_minutes} min slots</span>
            )}
            {hoursSummary && <span> · {hoursSummary}</span>}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {member.pin_set ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              PIN
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              No PIN
            </span>
          )}
          <span className="text-stone-400 text-sm" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
        </div>
      </button>

      {/* Body — sectioned, only rendered when open to keep the page light */}
      {open && (
        <div className="px-4 py-3 space-y-4 text-sm">
          {/* ── 1. Working hours (doctors AND nurses) ────────────── */}
          <Section title="Working hours">
            <ScheduleEditor
              profileId={member.id}
              role={member.role as "doctor" | "nurse"}
              doctor={
                member.role === "doctor" && member.doctor
                  ? { id: member.doctor.id, default_slot_minutes: member.doctor.default_slot_minutes }
                  : null
              }
              initialBlocks={(member.working_hours || []).map((b) => ({
                weekday: b.weekday,
                start_time: b.start_time.slice(0, 5),
                end_time: b.end_time.slice(0, 5),
              }))}
            />
          </Section>

          {/* ── 2. Doctor profile (Premium, doctors only) ───────────── */}
          {member.role === "doctor" && doctorProfilesEnabled && member.doctor && (
            <Section title="Doctor profile (Premium)">
              <DoctorProfileEditor doctor={member.doctor} />
            </Section>
          )}

          {/* ── 3. Leave entitlement ─────────────────────────────── */}
          <Section
            title="Leave entitlement (days)"
            rightSlot={balMsg && <span className="text-[10px] text-emerald-700">{balMsg}</span>}
          >
            <div className="grid grid-cols-3 gap-2">
              <BalanceField label="Annual" value={bal.annual} onChange={(v) => setBal({ ...bal, annual: v })} />
              <BalanceField label="MC" value={bal.mc} onChange={(v) => setBal({ ...bal, mc: v })} />
              <BalanceField label="Emergency" value={bal.emergency} onChange={(v) => setBal({ ...bal, emergency: v })} />
            </div>
            {dirty && (
              <button
                onClick={saveBalance}
                disabled={balBusy}
                className="mt-1.5 text-[11px] text-blue-700 font-medium hover:underline"
              >
                {balBusy ? "Saving…" : "Save balances"}
              </button>
            )}
          </Section>

          {/* ── 4. Recent activity ──────────────────────────────── */}
          {member.history && member.history.length > 0 && (
            <Section title="Recent activity">
              <ul className="space-y-1 text-[11px]">
                {member.history.map((h) => (
                  <li key={`${h.type}:${h.id}`} className="flex items-baseline gap-2">
                    <span
                      className={`w-1 h-1 rounded-full shrink-0 ${
                        h.status === "approved"
                          ? "bg-emerald-500"
                          : h.status === "rejected"
                            ? "bg-red-500"
                            : "bg-amber-500"
                      }`}
                    />
                    <span className="text-stone-700 truncate flex-1">{h.label}</span>
                    <span className="text-stone-500 tabular-nums">{h.sub}</span>
                    <span
                      className={`text-[9px] uppercase tracking-wider ${
                        h.status === "approved"
                          ? "text-emerald-600"
                          : h.status === "rejected"
                            ? "text-red-600"
                            : "text-amber-600"
                      }`}
                    >
                      {h.status}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* ── 5. Payroll placeholder ──────────────────────────── */}
          <Section title="Payroll (Premium)">
            <p className="text-[11px] text-stone-400 italic">Coming soon.</p>
          </Section>

          {/* ── 6. Account actions ─────────────────────────────── */}
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-stone-100">
          <button onClick={onSetPin} className="text-[11px] text-stone-700 hover:text-stone-900 hover:underline">
            {member.pin_set ? "Reset PIN" : "Set PIN"}
          </button>
          {member.pin_set && (
            <button onClick={onClearPin} className="text-[11px] text-red-600 hover:text-red-800 hover:underline">
              Clear PIN
            </button>
          )}
          <button onClick={onResetPassword} className="text-[11px] text-stone-700 hover:text-stone-900 hover:underline">
            Reset password
          </button>
          <button onClick={onToggleActive} className="text-[11px] text-stone-700 hover:text-stone-900 hover:underline ml-auto">
            {member.active ? "Deactivate" : "Reactivate"}
          </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Tiny wrapper for a labelled body section. The card body is split into 6
// of these (Working hours / Doctor profile / Leave entitlement / Recent
// activity / Payroll / Account actions) — keeps the dense expanded view
// readable and gives sections their own little header strip.
function Section({
  title,
  children,
  rightSlot,
}: {
  title: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <h4 className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
          {title}
        </h4>
        {rightSlot}
      </div>
      {children}
    </div>
  );
}

// Inline working-hours editor used inside the EmployeeCard. Works for both
// doctors AND nurses — the slot-length picker only renders for doctors
// (nurses don't generate booking slots so they don't need one). All writes
// go through /api/staff/[id]/work-hours which routes by role internally.
type Block = { weekday: number; start_time: string; end_time: string };

function ScheduleEditor({
  profileId,
  role,
  doctor,
  initialBlocks,
}: {
  profileId: string;
  role: "doctor" | "nurse";
  doctor: { id: string; default_slot_minutes: number } | null;
  initialBlocks: Block[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [slotMinutes, setSlotMinutes] = useState<number>(doctor?.default_slot_minutes || 30);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const byDay: Block[][] = Array.from({ length: 7 }, () => []);
  blocks.forEach((b) => byDay[b.weekday]?.push(b));

  function addBlock(weekday: number) {
    setBlocks((bs) => [...bs, { weekday, start_time: "09:00", end_time: "21:00" }]);
  }
  function updateBlock(weekday: number, idx: number, patch: Partial<Block>) {
    const localIdx = blocks
      .map((b, i) => ({ b, i }))
      .filter((x) => x.b.weekday === weekday)[idx]?.i;
    if (localIdx === undefined) return;
    setBlocks((bs) => bs.map((b, i) => (i === localIdx ? { ...b, ...patch } : b)));
  }
  function removeBlock(weekday: number, idx: number) {
    const localIdx = blocks
      .map((b, i) => ({ b, i }))
      .filter((x) => x.b.weekday === weekday)[idx]?.i;
    if (localIdx === undefined) return;
    setBlocks((bs) => bs.filter((_, i) => i !== localIdx));
  }
  function applyMonToWeek() {
    if (!confirm("Copy Monday's hours to Tue–Fri (overwrites existing)?")) return;
    const monday = blocks.filter((b) => b.weekday === 1);
    setBlocks([
      ...blocks.filter((b) => b.weekday === 0 || b.weekday === 6),
      ...monday,
      ...[2, 3, 4, 5].flatMap((wd) =>
        monday.map((b) => ({ weekday: wd, start_time: b.start_time, end_time: b.end_time }))
      ),
    ]);
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      for (const b of blocks) {
        if (b.start_time >= b.end_time) {
          setMsg(`Invalid range on ${WEEKDAY_LABEL[b.weekday]}`);
          return;
        }
      }
      const sorted = [...blocks].sort(
        (a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)
      );
      // Unified endpoint — routes by role server-side (doctors → working_hours
      // table, nurses → profiles.default_work_hours JSONB).
      const hoursRes = await fetch(`/api/staff/${profileId}/work-hours`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: sorted }),
      });
      if (!hoursRes.ok) {
        const d = await hoursRes.json().catch(() => ({}));
        setMsg(d.error || "Failed to save hours");
        return;
      }
      // Doctor only: save slot length when changed.
      if (role === "doctor" && doctor && slotMinutes !== doctor.default_slot_minutes) {
        const slotRes = await fetch("/api/staff", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile_id: profileId,
            default_slot_minutes: slotMinutes,
          }),
        });
        if (!slotRes.ok) {
          const d = await slotRes.json().catch(() => ({}));
          setMsg(d.error || "Hours saved, but slot length update failed");
          return;
        }
      }
      setMsg("Saved.");
      router.refresh();
      setTimeout(() => setOpen(false), 400);
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 2000);
    }
  }

  const hasHours = blocks.length > 0;
  const summaryByDay = byDay.map((dayBlocks, wd) => {
    if (dayBlocks.length === 0) return null;
    const sorted = [...dayBlocks].sort((a, b) => a.start_time.localeCompare(b.start_time));
    return (
      <span key={wd} className="tabular-nums">
        <span className="text-stone-400">{WEEKDAY_LABEL[wd]}</span>{" "}
        {sorted.map((b, i) => (
          <span key={i}>
            {i > 0 && ", "}
            {b.start_time}–{b.end_time}
          </span>
        ))}
      </span>
    );
  });

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1 gap-2">
        <div className="text-[10px] text-stone-500">
          {role === "doctor" && doctor ? `${slotMinutes} min slots` : "Custom shift"}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[11px] text-blue-700 hover:underline font-medium"
        >
          {open ? "Done" : "Edit"}
        </button>
      </div>
      {!open ? (
        hasHours ? (
          <div className="text-[11px] text-stone-600 flex flex-wrap gap-x-3 gap-y-0.5">
            {summaryByDay}
          </div>
        ) : (
          <p className="text-[11px] text-stone-400 italic">
            No custom hours — defaults to 09:00–21:00 clinic-wide.
          </p>
        )
      ) : (
        <div className="bg-stone-50 border border-stone-200 rounded-lg p-2 space-y-1.5">
          {/* Slot length picker — doctors only (drives booking slot generation). */}
          {role === "doctor" && (
            <div className="flex items-center gap-2 px-1">
              <span className="text-[10px] uppercase tracking-wider text-stone-500 font-medium">
                Slot length
              </span>
              <div className="flex items-center gap-1">
                {[15, 30, 45, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSlotMinutes(m)}
                    className={`text-[11px] px-2 py-0.5 rounded border ${
                      slotMinutes === m
                        ? "bg-blue-600 border-blue-600 text-white font-medium"
                        : "bg-white border-stone-300 text-stone-700 hover:border-blue-400"
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Per-weekday rows */}
          <div className="divide-y divide-stone-200 border-t border-stone-200">
            {byDay.map((dayBlocks, wd) => (
              <div key={wd} className="py-1.5 grid grid-cols-[40px_1fr] gap-2 items-start text-[11px]">
                <div className="font-medium text-stone-700 pt-1">{WEEKDAY_LABEL[wd]}</div>
                <div className="space-y-1">
                  {dayBlocks.length === 0 ? (
                    <span className="text-stone-400 italic">Off</span>
                  ) : (
                    dayBlocks.map((b, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <input
                          type="time"
                          className="text-[11px] px-1 py-0.5 border border-stone-300 rounded tabular-nums w-[78px]"
                          value={b.start_time}
                          onChange={(e) => updateBlock(wd, i, { start_time: e.target.value })}
                        />
                        <span className="text-stone-400">–</span>
                        <input
                          type="time"
                          className="text-[11px] px-1 py-0.5 border border-stone-300 rounded tabular-nums w-[78px]"
                          value={b.end_time}
                          onChange={(e) => updateBlock(wd, i, { end_time: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => removeBlock(wd, i)}
                          className="text-stone-400 hover:text-red-600 text-base leading-none px-1"
                          aria-label="Remove"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                  <button
                    type="button"
                    onClick={() => addBlock(wd)}
                    className="text-[10px] text-blue-700 hover:underline"
                  >
                    + Add
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1 px-1">
            <button
              type="button"
              onClick={applyMonToWeek}
              className="text-[10px] text-stone-500 hover:text-stone-700 hover:underline"
            >
              Copy Mon → Tue–Fri
            </button>
            {msg && (
              <span className={`text-[10px] ${msg === "Saved." ? "text-emerald-700" : "text-red-600"}`}>
                {msg}
              </span>
            )}
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="ml-auto text-[11px] px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BalanceField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] text-stone-500 block">{label}</span>
      <input
        type="number"
        min={0}
        max={365}
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
        className="input mt-0.5 text-sm tabular-nums"
      />
    </label>
  );
}

// Premium-only — surfaced on doctor employee cards. Editing expertise + bio
// powers the patient-facing doctor cards on /book. Rating is read-only here
// (set by the review flow when patients leave feedback).
function DoctorProfileEditor({
  doctor,
}: {
  doctor: {
    id: string;
    expertise?: string | null;
    bio?: string | null;
    rating_average?: number | null;
    rating_count?: number | null;
  };
}) {
  const router = useRouter();
  const [expertise, setExpertise] = useState(doctor.expertise || "");
  const [bio, setBio] = useState(doctor.bio || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = expertise !== (doctor.expertise || "") || bio !== (doctor.bio || "");

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/doctors/${doctor.id}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expertise, bio }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setMsg(d.error || "Failed");
        return;
      }
      setMsg("Saved.");
      router.refresh();
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 2000);
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-[10px] uppercase tracking-wider text-stone-500 font-medium flex items-center gap-1.5">
          Doctor profile
          <span className="text-[9px] bg-purple-100 text-purple-800 px-1 py-0.5 rounded-full font-medium">
            Premium
          </span>
        </div>
        <div className="flex items-center gap-2">
          {(doctor.rating_count ?? 0) > 0 && (
            <span className="text-[10px] text-amber-700 font-medium tabular-nums">
              ★ {(doctor.rating_average ?? 0).toFixed(1)}
              <span className="text-stone-500 font-normal"> · {doctor.rating_count}</span>
            </span>
          )}
          {msg && <span className="text-[10px] text-emerald-700">{msg}</span>}
        </div>
      </div>
      <input
        className="input text-sm mb-1.5"
        placeholder="Expertise — e.g. Implants, Root canal, Orthodontics"
        value={expertise}
        onChange={(e) => setExpertise(e.target.value)}
      />
      <textarea
        className="input text-sm"
        rows={2}
        placeholder="Short bio (optional)"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
      />
      {dirty && (
        <button
          onClick={save}
          disabled={busy}
          className="mt-1.5 text-[11px] text-blue-700 font-medium hover:underline"
        >
          {busy ? "Saving…" : "Save profile"}
        </button>
      )}
    </div>
  );
}
