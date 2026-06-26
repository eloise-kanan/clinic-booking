// Client-side fire-and-forget logger for WhatsApp template sends.
// Called whenever a nurse opens a wa.me link so the booking row knows
// what was sent, when, and by whom.
//
// Terminal sessions piggyback on the cached PIN session — the caller is
// expected to have already opened the PIN modal for the upstream write
// (reminder-sent, approve, etc.) so by the time we log the WA send, the
// session has a valid {profile_id, pin}. If somehow no session exists, the
// server-side gate will reject the request silently (fire-and-forget).

import { readPinSession } from "@/lib/pin-client";

export type WaKind = "check" | "confirm" | "reject" | "cancel" | "reminder";

export function logWaSent(bookingId: string, kind: WaKind): void {
  const sess = readPinSession();
  const payload: Record<string, unknown> = { booking_id: bookingId, kind };
  if (sess) {
    payload.pin_profile_id = sess.profile_id;
    payload.pin = sess.pin;
  }
  const body = JSON.stringify(payload);
  // Use sendBeacon when available so the request survives the tab opening
  // a new window for wa.me; fall back to a normal fetch.
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/bookings/wa-sent", blob);
    return;
  }
  fetch("/api/bookings/wa-sent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
