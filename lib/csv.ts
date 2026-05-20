// Minimal CSV writer. Escapes commas, quotes, and newlines per RFC 4180.

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
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

export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(",");
}

export function csvDocument(headers: string[], rows: unknown[][]): string {
  const lines = [csvRow(headers), ...rows.map(csvRow)];
  return lines.join("\r\n") + "\r\n";
}
