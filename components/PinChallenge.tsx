"use client";

// PinChallenge — modal used in clinic-terminal mode to authenticate the
// staff member taking an action. Two-step:
//   1. Pick your identity card (nurse / doctor with a PIN set)
//   2. Enter your 6-digit PIN
//
// On success, calls onVerified(profileId, pin, fullName, role). Caller
// stores the {profile_id, pin} in sessionStorage via lib/pin-client.ts and
// includes them in the next write request.

import { useEffect, useState } from "react";

type StaffCard = {
  id: string;
  role: "nurse" | "doctor";
  full_name: string;
  locked: boolean;
  locked_until: string | null;
};

export default function PinChallenge({
  open,
  onClose,
  onVerified,
  actionLabel,
  allowedRoles,
}: {
  open: boolean;
  onClose: () => void;
  onVerified: (s: { profile_id: string; pin: string; full_name: string; role: "nurse" | "doctor" }) => void;
  actionLabel?: string;  // e.g. "to confirm this booking"
  allowedRoles?: ("nurse" | "doctor")[]; // narrows the picker (default: nurse + doctor)
}) {
  const [staff, setStaff] = useState<StaffCard[] | null>(null);
  const [selected, setSelected] = useState<StaffCard | null>(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Load staff list when opening
  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setPin("");
    setErr(null);
    const q = allowedRoles && allowedRoles.length > 0
      ? `?roles=${allowedRoles.join(",")}`
      : "";
    fetch(`/api/pin/staff-list${q}`)
      .then((r) => r.json())
      .then((d) => setStaff(d.staff || []))
      .catch(() => setStaff([]));
  }, [open, allowedRoles]);

  // Auto-submit when 6 digits typed
  useEffect(() => {
    if (selected && pin.length === 6) {
      submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  async function submit() {
    if (!selected) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/pin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: selected.id, pin }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr(
          data.reason === "locked"
            ? "Too many wrong attempts — locked. Try a different staff or wait 5 min."
            : "Wrong PIN. Try again."
        );
        setPin("");
        return;
      }
      onVerified({
        profile_id: selected.id,
        pin,
        full_name: selected.full_name,
        role: selected.role,
      });
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white text-stone-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto">
        <div className="p-5 border-b border-stone-200">
          <h3 className="text-base font-semibold">
            {selected ? `Enter PIN — ${selected.full_name}` : "Who's doing this action?"}
          </h3>
          {actionLabel && !selected && (
            <p className="text-xs text-stone-500 mt-0.5">{actionLabel}</p>
          )}
        </div>

        {/* Step 1: pick identity */}
        {!selected && (
          <div className="p-4">
            {!staff ? (
              <p className="text-xs text-stone-500">Loading…</p>
            ) : staff.length === 0 ? (
              <p className="text-xs text-stone-500">
                No staff with PINs set. The owner needs to set PINs at <code className="bg-stone-100 px-1 rounded">/owner/staff</code>.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {staff.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={s.locked}
                    onClick={() => setSelected(s)}
                    className="text-left p-3 rounded-lg border border-stone-200 hover:border-stone-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-sm font-medium truncate">{s.full_name}</div>
                    <div className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">
                      {s.role}
                      {s.locked && <span className="ml-1 text-red-600">· locked</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: enter PIN */}
        {selected && (
          <div className="p-5 space-y-4">
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              autoFocus
              className="input text-center tracking-[0.4em] text-2xl font-light"
              placeholder="••••••"
              value={pin}
              onChange={(e) => {
                setErr(null);
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
              }}
              disabled={busy}
            />
            {err && <p className="text-xs text-red-600 text-center">{err}</p>}
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setPin("");
                  setErr(null);
                }}
                className="text-stone-600 hover:text-stone-900"
              >
                ← Different staff
              </button>
              <button type="button" onClick={onClose} className="text-stone-600 hover:text-stone-900">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
