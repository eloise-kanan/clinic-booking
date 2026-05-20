"use client";

import { useRouter } from "next/navigation";

type LastExport = { at: string; by: string } | undefined;

type Counts = {
  patients: number;
  bookings: number;
  audit: number;
};

export default function BackupActions({
  counts,
  lastExports,
}: {
  counts: Counts;
  lastExports: { patients?: LastExport; bookings?: LastExport; audit?: LastExport };
}) {
  const router = useRouter();

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
