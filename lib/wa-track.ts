// Client-side fire-and-forget logger for WhatsApp template sends.
// Called whenever a nurse opens a wa.me link so the booking row knows
// what was sent, when, and by whom.

export type WaKind = "check" | "confirm" | "reject" | "cancel" | "reminder";

export function logWaSent(bookingId: string, kind: WaKind): void {
  // Use sendBeacon when available so the request survives the tab opening
  // a new window for wa.me; fall back to a normal fetch.
  const body = JSON.stringify({ booking_id: bookingId, kind });
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
