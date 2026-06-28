"use client";

import { useState } from "react";
import { applyTemplate, bookingVars } from "@/lib/utils";

type Template = { key: string; body: string; updated_at: string };

const LABELS: Record<string, { title: string; description: string }> = {
  check: {
    title: "Check with patient (verify booking)",
    description: "Sent when nurse first reaches out to confirm a pending booking.",
  },
  confirm_booking: {
    title: "Confirm new booking",
    description: "Sent after the nurse approves a new booking.",
  },
  confirm_reschedule: {
    title: "Confirm reschedule",
    description: "Sent after the nurse approves a reschedule.",
  },
  confirm_cancellation: {
    title: "Confirm cancellation",
    description: "Sent after a booking is cancelled.",
  },
  reject: {
    title: "Reject booking",
    description: "Sent when a booking is rejected. Use {reject_reason} to insert the rejection reason.",
  },
  reminder: {
    title: "Reminder (day before)",
    description: "Sent the day before an appointment as a friendly reminder.",
  },
  recall: {
    title: "Recall (overdue patient)",
    description: "Sent to patients whose last visit is past their recall interval (default 6 months). Use {months_since_visit} for the gap.",
  },
};

const PLACEHOLDERS = [
  { key: "{patient_name}", desc: "Patient's full name" },
  { key: "{doctor_name}", desc: "Doctor's display name" },
  { key: "{slot_label}", desc: "Date and time, e.g. 'Mon, 5 May 2026, 11:00 AM–11:30 AM'" },
  { key: "{visit_reason}", desc: "Treatment / reason for visit" },
  { key: "{clinic_name}", desc: "Your clinic name" },
  { key: "{reject_reason}", desc: "(Reject template only) reason for rejection" },
  { key: "{months_since_visit}", desc: "(Recall template only) months since the patient's last visit" },
];

const SAMPLE_VARS = {
  patient_name: "Sample Patient",
  doctor_name: "Dr. Tan",
  slot_label: "Mon, 5 May 2026, 11:00 AM–11:30 AM",
  visit_reason: "Normal treatment / scaling",
  clinic_name: "Goodcare Dental PJ",
  reject_reason: "Doctor unavailable",
  months_since_visit: "7",
};

export default function TemplateEditor({
  initial,
  clinicName,
}: {
  initial: Template[];
  clinicName: string;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    initial.forEach((t) => (m[t.key] = t.body));
    return m;
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedFor, setSavedFor] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  // Override clinic_name in the sample with the real one for a more realistic preview
  const sampleVars = bookingVars({ ...SAMPLE_VARS, clinic_name: clinicName });

  async function save(key: string) {
    setError("");
    setSavingKey(key);
    try {
      const res = await fetch("/api/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, body: drafts[key] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
      } else {
        setSavedFor(key);
        setTimeout(() => setSavedFor(null), 1500);
      }
    } finally {
      setSavingKey(null);
    }
  }

  const orderedKeys = [
    "check",
    "confirm_booking",
    "confirm_reschedule",
    "confirm_cancellation",
    "reject",
    "reminder",
    "recall",
  ].filter((k) => k in drafts);

  return (
    <div className="space-y-5">
      {/* Placeholder reference card */}
      <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
        <h3 className="text-xs font-medium text-stone-700 mb-2">Available placeholders</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          {PLACEHOLDERS.map((p) => (
            <div key={p.key} className="flex gap-2">
              <code className="bg-white border border-stone-200 px-1 rounded text-brand-700">
                {p.key}
              </code>
              <span className="text-stone-500">{p.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {orderedKeys.map((key) => {
        const labels = LABELS[key] || { title: key, description: "" };
        const body = drafts[key] || "";
        const preview = applyTemplate(body, sampleVars);
        return (
          <div key={key} className="bg-white border border-stone-200 rounded-lg p-4">
            <div className="mb-2">
              <h3 className="text-sm font-medium">{labels.title}</h3>
              {labels.description && (
                <p className="text-[11px] text-stone-500 mt-0.5">{labels.description}</p>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <label className="label">Template</label>
                <textarea
                  className="input font-mono text-xs"
                  rows={9}
                  value={body}
                  onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Preview (with sample data)</label>
                <pre className="input font-mono text-xs whitespace-pre-wrap break-words bg-stone-50 min-h-[200px]">
                  {preview}
                </pre>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={() => save(key)}
                disabled={savingKey === key}
                className="btn-primary"
              >
                {savingKey === key ? "Saving…" : "Save"}
              </button>
              {savedFor === key && (
                <span className="text-xs text-emerald-700">Saved.</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
