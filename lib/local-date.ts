// Returns YYYY-MM-DD in the user's local timezone.
// Avoids `new Date().toISOString().slice(0, 10)`, which returns the UTC date
// and is wrong in the user's early-morning hours (e.g. 00:00–08:00 in MY).
export function localYmd(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Adds n days to a YYYY-MM-DD string and returns YYYY-MM-DD. Uses UTC math
// internally so DST transitions and TZ-offset edge cases don't drift the date.
export function addDaysYmd(ymd: string, n: number): string {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
