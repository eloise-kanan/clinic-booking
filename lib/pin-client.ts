// Client-side helpers for the per-action PIN flow on the shared clinic
// terminal. Holds a short-lived (~90s) grace window in sessionStorage so a
// staff member confirming several bookings in a row only enters their PIN
// once.
//
// What's stored: { profile_id, pin, full_name, expires_at }.
// Risk profile: 6-digit PIN + clinic terminal at reception. sessionStorage
// dies when the tab closes; the server rate-limits brute force anyway.

export const GRACE_MS = 90_000;
const KEY = "kanan_pin_session";

export type PinSession = {
  profile_id: string;
  pin: string;
  full_name: string;
  role: "nurse" | "doctor";
  expires_at: number;
};

export function readPinSession(): PinSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: PinSession = JSON.parse(raw);
    if (parsed.expires_at < Date.now()) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writePinSession(s: Omit<PinSession, "expires_at">): PinSession {
  const full: PinSession = { ...s, expires_at: Date.now() + GRACE_MS };
  sessionStorage.setItem(KEY, JSON.stringify(full));
  return full;
}

export function clearPinSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}

// Bumps the expiry of an existing session by the full grace window. Called
// after every successful PIN-attributed write so the staff member keeps
// their grace window as long as they're actively working.
export function refreshPinSession() {
  const cur = readPinSession();
  if (!cur) return null;
  return writePinSession({
    profile_id: cur.profile_id,
    pin: cur.pin,
    full_name: cur.full_name,
    role: cur.role,
  });
}
