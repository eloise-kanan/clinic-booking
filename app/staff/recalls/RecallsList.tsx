"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { applyTemplate, waLink } from "@/lib/utils";

type Row = {
  id: string;
  full_name: string;
  whatsapp_number: string | null;
  last_visit_at: string | null;
  recall_interval_months: number;
  recall_reminder_sent_at: string | null;
  recall_reminder_sent_by: { full_name: string } | { full_name: string }[] | null;
  months_since_visit: number;
  months_overdue: number;
};

function flat<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  if (Array.isArray(v)) return v[0] || null;
  return v;
}

const DAY = 24 * 60 * 60 * 1000;

export default function RecallsList({
  initial,
  templateBody,
  clinicName,
}: {
  initial: Row[];
  templateBody: string;
  clinicName: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [query, setQuery] = useState("");
  const [hideRecentlySent, setHideRecentlySent] = useState(true);

  async function sendRecall(row: Row) {
    if (!row.whatsapp_number) {
      alert("This patient has no WhatsApp number.");
      return;
    }
    const body = applyTemplate(templateBody || "Hi {patient_name}, it's been a while — time for your checkup at {clinic_name}.", {
      patient_name: row.full_name,
      clinic_name: clinicName,
      months_since_visit: String(row.months_since_visit),
    });
    // Fire-and-forget marking
    fetch("/api/patients/recall-sent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: row.id }),
      keepalive: true,
    }).catch(() => {});
    window.open(waLink(row.whatsapp_number, body), "_blank");
    // Optimistically mark sent in local state
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, recall_reminder_sent_at: new Date().toISOString() }
          : r
      )
    );
    setTimeout(() => router.refresh(), 400);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fourteenDaysAgo = Date.now() - 14 * DAY;
    return rows.filter((r) => {
      if (q && !r.full_name.toLowerCase().includes(q)) return false;
      if (
        hideRecentlySent &&
        r.recall_reminder_sent_at &&
        new Date(r.recall_reminder_sent_at).getTime() > fourteenDaysAgo
      ) {
        return false;
      }
      return true;
    });
  }, [rows, query, hideRecentlySent]);

  const pendingCount = filtered.filter((r) => !r.recall_reminder_sent_at).length;
  const sentInWindow = filtered.length - pendingCount;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by name"
          className="input max-w-[260px]"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideRecentlySent}
            onChange={(e) => setHideRecentlySent(e.target.checked)}
          />
          Hide patients pinged in last 14 days
        </label>
        <span className="ml-auto text-xs text-stone-500">
          {pendingCount} to ping · {sentInWindow} recently sent
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-lg p-12 text-center text-sm text-stone-500">
          {rows.length === 0
            ? "No patients are due for recall right now."
            : "All due patients have been recently contacted, or no name matches your search."}
        </div>
      ) : (
        <ul className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100">
          {filtered.map((r) => {
            const sender = flat(r.recall_reminder_sent_by);
            const recentlySent =
              !!r.recall_reminder_sent_at &&
              Date.now() - new Date(r.recall_reminder_sent_at).getTime() < 14 * DAY;
            const lastVisitLabel = r.last_visit_at
              ? new Date(r.last_visit_at).toLocaleDateString("en-MY", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "—";

            return (
              <li
                key={r.id}
                className="p-3 flex items-start justify-between gap-3 flex-wrap"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                    <span>{r.full_name}</span>
                    {r.months_overdue > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          r.months_overdue >= 6
                            ? "bg-red-100 text-red-700"
                            : r.months_overdue >= 3
                              ? "bg-amber-100 text-amber-800"
                              : "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {r.months_overdue} mo overdue
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    Last visit {lastVisitLabel} · {r.months_since_visit} months ago · recall every{" "}
                    {r.recall_interval_months} mo
                    {r.whatsapp_number ? ` · ${r.whatsapp_number}` : " · no WhatsApp on file"}
                  </div>
                  {r.recall_reminder_sent_at && (
                    <div className="text-[11px] text-emerald-700 mt-1">
                      ✓ Recall sent{" "}
                      {new Date(r.recall_reminder_sent_at).toLocaleString("en-MY")}
                      {sender ? ` by ${sender.full_name}` : ""}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => sendRecall(r)}
                  disabled={!r.whatsapp_number}
                  className={recentlySent ? "btn" : "btn-primary"}
                >
                  {recentlySent ? "Resend" : "Send recall"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
