"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LastExport = { at: string; by: string } | undefined;

type Counts = {
  patients: number;
  bookings: number;
  audit: number;
};

type EmailSettings = {
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly";
  to: string;
  lastSentAt: string | null;
  lastStatus: string | null;
};

export default function BackupActions({
  counts,
  lastExports,
  emailSettings,
}: {
  counts: Counts;
  lastExports: { patients?: LastExport; bookings?: LastExport; audit?: LastExport };
  emailSettings: EmailSettings;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(emailSettings.enabled);
  const [frequency, setFrequency] = useState<EmailSettings["frequency"]>(
    emailSettings.frequency
  );
  const [emailTo, setEmailTo] = useState(emailSettings.to);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<
    { type: "ok" | "err"; text: string } | null
  >(null);

  async function saveEmailSettings() {
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await fetch("/api/backup/email-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backup_email_enabled: enabled,
          backup_email_frequency: frequency,
          backup_email_to: emailTo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSavedMsg({ type: "err", text: data.error || "Failed to save" });
        return;
      }
      setSavedMsg({ type: "ok", text: "Saved" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function downloadAfter(href: string) {
    return () => {
      // Open in a new tab so the file downloads without leaving the page,
      // then refresh so the "last exported" timestamps update.
      window.open(href, "_blank");
      setTimeout(() => router.refresh(), 800);
    };
  }

  function downloadAll() {
    window.open("/api/backup/patients", "_blank");
    setTimeout(() => window.open("/api/backup/bookings", "_blank"), 400);
    setTimeout(() => window.open("/api/backup/audit", "_blank"), 800);
    setTimeout(() => router.refresh(), 1500);
  }

  const cards: {
    title: string;
    description: string;
    count: number;
    href: string;
    last?: LastExport;
  }[] = [
    {
      title: "Patients",
      description: "Patient directory — name, IC, phone, visit count.",
      count: counts.patients,
      href: "/api/backup/patients",
      last: lastExports.patients,
    },
    {
      title: "Bookings",
      description: "Every booking with patient + doctor + status + attendance.",
      count: counts.bookings,
      href: "/api/backup/bookings",
      last: lastExports.bookings,
    },
    {
      title: "Audit log",
      description: "Complete activity log — who did what, when.",
      count: counts.audit,
      href: "/api/backup/audit",
      last: lastExports.audit,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-stone-200 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold">Download everything</h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Opens 3 CSV downloads in sequence — patients, bookings, audit log.
          </p>
        </div>
        <button type="button" onClick={downloadAll} className="btn-primary">
          💾 Download all CSVs
        </button>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              📬 Auto-email backup
              {emailSettings.enabled && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                  On
                </span>
              )}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Receive all 3 CSVs as email attachments on a schedule. Saves you the manual
              click — useful if you want a hands-off offsite copy.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs text-stone-600">{enabled ? "Enabled" : "Disabled"}</span>
            <span className="relative inline-block w-9 h-5">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span className="block w-9 h-5 bg-stone-300 peer-checked:bg-emerald-500 rounded-full transition-colors" />
              <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-stone-600 mb-1 block">Send to</span>
            <input
              type="email"
              className="input"
              placeholder="owner@clinic.com"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs text-stone-600 mb-1 block">Frequency</span>
            <select
              className="input"
              value={frequency}
              onChange={(e) =>
                setFrequency(e.target.value as EmailSettings["frequency"])
              }
            >
              <option value="daily">Daily (every morning)</option>
              <option value="weekly">Weekly (every Monday)</option>
              <option value="monthly">Monthly (1st of each month)</option>
            </select>
          </label>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={saveEmailSettings}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
          {savedMsg && (
            <span
              className={`text-xs ${
                savedMsg.type === "ok" ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {savedMsg.text}
            </span>
          )}
          <span className="text-[11px] text-stone-500 ml-auto">
            {emailSettings.lastSentAt ? (
              <>
                Last sent{" "}
                {new Date(emailSettings.lastSentAt).toLocaleString("en-MY")} ·{" "}
                {emailSettings.lastStatus || "ok"}
              </>
            ) : (
              "Never sent automatically"
            )}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {cards.map((card) => (
          <div key={card.title} className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="text-sm font-semibold text-stone-900">{card.title}</h3>
              <span className="text-xs text-stone-500">{card.count.toLocaleString()} rows</span>
            </div>
            <p className="text-xs text-stone-600 mb-3 leading-snug">{card.description}</p>
            {card.last ? (
              <p className="text-[11px] text-stone-500 mb-3">
                Last exported {new Date(card.last.at).toLocaleString("en-MY")} by {card.last.by}
              </p>
            ) : (
              <p className="text-[11px] text-stone-400 italic mb-3">Never exported</p>
            )}
            <button
              type="button"
              onClick={downloadAfter(card.href)}
              className="px-3 py-1.5 text-xs rounded-md border border-stone-300 bg-white hover:bg-stone-50 hover:border-stone-400"
            >
              Download CSV
            </button>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-amber-900 mb-1">💡 Backup strategy</h3>
        <ul className="text-xs text-amber-900 space-y-1 list-disc list-inside">
          <li>
            Run a backup weekly and store the CSVs in Google Drive or Dropbox you control.
          </li>
          <li>
            Always download before a major change (working hours, templates, plan tier).
          </li>
          <li>
            Supabase Pro keeps daily database backups for 30 days. These CSVs are <em>your</em> independent copy.
          </li>
          <li>
            Patient data is sensitive — store these CSVs encrypted or behind a password.
          </li>
        </ul>
      </div>
    </div>
  );
}
