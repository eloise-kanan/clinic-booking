// Minimal CSV writer. Escapes commas, quotes, and newlines per RFC 4180.

// Format a Date or ISO string as YYYY-MM-DD HH:mm:ss in Asia/Kuala_Lumpur.
// Use this for any timestamp column written to CSV — without it, timestamptz
// values come out as UTC ISO strings and the boss reads them in Excel ~8 hours
// behind the actual appointment time.
export function csvDateMy(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const d = value instanceof Date ? value : new Date(String(value));
  if (isNaN(d.getTime())) return String(value);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

// YYYY-MM-DD in Asia/Kuala_Lumpur — used for CSV file naming so exports run
// near MY midnight don't get the wrong stamp.
export function csvDateOnlyMy(d: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}

// Marker for a cell value that's already in valid CSV form and should be
// emitted verbatim by csvCell (no further escaping). Used for the ="…"
// Excel-text-coercion trick — csvCell would otherwise re-escape the quotes.
class CsvRaw {
  constructor(public value: string) {}
}

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof CsvRaw) return value.value;
  let s: string;
  if (value instanceof Date) {
    s = value.toISOString();
  } else if (typeof value === "object") {
    s = JSON.stringify(value);
  } else {
    s = String(value);
  }
  // Quote if it contains a comma, quote, newline, or carriage return.
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// Force Excel to read a cell as text — useful for IC numbers, passport numbers,
// phone numbers etc. that would otherwise be turned into scientific notation
// (871015013005 → 8.71015E+11). Returns a CsvRaw whose serialised value is
// "=""…""" — Excel honours that as a literal-text formula. Other CSV consumers
// see ="…" as the raw cell (still readable).
export function csvText(value: unknown): CsvRaw {
  if (value === null || value === undefined || value === "") return new CsvRaw("");
  const inner = String(value).replace(/"/g, '""');
  return new CsvRaw(`"=""${inner}"""`);
}

export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(",");
}

export function csvDocument(headers: string[], rows: unknown[][]): string {
  const lines = [csvRow(headers), ...rows.map(csvRow)];
  return lines.join("\r\n") + "\r\n";
}
