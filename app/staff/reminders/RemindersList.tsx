"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { applyTemplate, bookingVars, formatSlotLabel, waLink } from "@/lib/utils";
import { logWaSent } from "@/lib/wa-track";

type Row = {
  id: string;
  slot_start: string;
  slot_end: string;
  visit_reason: string | null;
  reminder_sent_at: string | null;
  reminder_sent_by: { full_name: string } | { full_name: string }[] | null;
  patient: { full_name: string; whatsapp_number: string } | null;
  doctor: { display_name: string } | null;
};

function flat<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  if (Array.isArray(v)) return v[0] || null;
  return v;
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function RemindersList({
  initialDate,
  initialRows,
  templateBody,
  clinicName,
}: {
  initialDate: string;
  initialRows: Row[];
  templateBody: string;
  clinicName: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState<string>(initialDate);
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [loading, setLoading] = useState(false);

  // Re-fetch when the date picker changes
  useEffect(() => {
    if (date === initialDate) return;
    setLoading(true);
    fetch(`/api/calendar?date=${date}&days=1`)
      .then((r) => r.json())
      .then((d) => {
        // /api/calendar returns bookings without reminder fields. Bounce through a richer endpoint.
        // Fallback: just filter the response shape
        setRows(d.bookings || []);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [date, initialDate]);

  function shiftDay(delta: number) {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDate(ymd(d));
  }

  async function sendReminder(row: Row) {
    if (!row.patient?.whatsapp_number) {
      alert("This patient has no WhatsApp number.");
      return;
    }
    const slotLabel = formatSlotLabel(row.slot_start, row.slot_end);
    const body = applyTemplate(
      templateBody || "Hi {patient_name}, reminder of your appointment {slot_label} with {doctor_name}.",
      bookingVars({
        patient_name: row.patient.full_name,
        doctor_name: row.doctor?.display_name || "the doctor",
        slot_label: slotLabel,
        visit_reason: row.visit_reason || "",
        clinic_name: clinicName,
      })
    );
    logWaSent(row.id, "reminder");
    window.open(waLink(row.patient.whatsapp_number, body), "_blank");
    setTimeout(() => router.refresh(), 200);
  }

  const sorted = useMemo(() => {
    return [...rows].sort(
      (a, b) => new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime()
    );
  }, [rows]);

  const sentCount = rows.filter((r) => r.reminder_sent_at).length;
  const pendingCount = rows.length - sentCount;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" className="btn" onClick={() => shiftDay(-1)}>
          ◀ Prev day
        </button>
        <input
          type="date"
          className="input max-w-[170px]"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button type="button" className="btn" onClick={() => shiftDay(1)}>
          Next day ▶
        </button>
        <span className="ml-2 text-xs text-stone-500">
          {pendingCount} to send · {sentCount} sent
        </span>
      </div>

      {loading ? (
        <p className="text-xs text-stone-500">Loading…</p>
      ) : sorted.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-lg p-12 text-center text-sm text-stone-500">
          No confirmed appointments on this day.
        </div>
      ) : (
        <ul className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100">
          {sorted.map((r) => {
            const reviewer = flat(r.reminder_sent_by);
            const sent = !!r.reminder_sent_at;
            return (
              <li key={r.id} className="p-3 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {r.patient?.full_name || "—"}{" "}
                    <span className="text-stone-500 text-xs">· {r.doctor?.display_name || "—"}</span>
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5 break-words">
                    {formatSlotLabel(r.slot_start, r.slot_end)}
                    {r.visit_reason ? ` · ${r.visit_reason}` : ""}
                    {r.patient?.whatsapp_number ? ` · ${r.patient.whatsapp_number}` : ""}
                  </div>
                  {sent && (
                    <div className="text-[11px] text-emerald-700 mt-1">
                      ✓ Sent {new Date(r.reminder_sent_at!).toLocaleString("en-MY")}
                      {reviewer ? ` by ${reviewer.full_name}` : ""}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => sendReminder(r)}
                  className={sent ? "btn" : "btn-primary"}
                >
                  {sent ? "Resend" : "Send reminder"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
