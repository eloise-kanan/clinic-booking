"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatSlotLabel } from "@/lib/utils";
import { WhatsAppActions } from "@/components/WhatsAppActions";

export type BookingRow = {
  id: string;
  type: string;
  status: string;
  slot_start: string;
  slot_end: string;
  visit_reason: string | null;
  created_at?: string;
  reviewed_at?: string | null;
  attended_at?: string | null;
  no_show?: boolean | null;
  reviewer?: { full_name: string } | { full_name: string }[] | null;
  patient: { id?: string; full_name: string; whatsapp_number: string; id_number?: string } | null;
  doctor: { id?: string; display_name: string } | null;
};

function reviewerName(r: BookingRow): string | null {
  const rev = r.reviewer;
  if (!rev) return null;
  if (Array.isArray(rev)) return rev[0]?.full_name || null;
  return rev.full_name || null;
}

type SortKey = "slot_start" | "patient" | "doctor" | "type" | "status";
type SortDir = "asc" | "desc";
type QuickFilter =
  | "upcoming"
  | "today"
  | "past_unmarked"
  | "attended"
  | "no_show"
  | "all";

const STATUSES = ["pending", "confirmed", "rejected", "cancelled", "expired"];
const TYPES = ["booking", "reschedule", "cancellation"];

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "today", label: "Today" },
  { key: "past_unmarked", label: "Past · unmarked" },
  { key: "attended", label: "Attended" },
  { key: "no_show", label: "No-show" },
  { key: "all", label: "All" },
];

function isToday(d: Date) {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function applyQuickFilter(r: BookingRow, q: QuickFilter): boolean {
  const slot = new Date(r.slot_start);
  const now = new Date();
  switch (q) {
    case "all":
      return true;
    case "upcoming":
      return (
        (r.status === "pending" || r.status === "confirmed") &&
        slot.getTime() >= now.getTime() &&
        !r.attended_at &&
        !r.no_show
      );
    case "today":
      return isToday(slot);
    case "past_unmarked":
      return (
        r.status === "confirmed" &&
        slot.getTime() < now.getTime() &&
        !r.attended_at &&
        !r.no_show
      );
    case "attended":
      return !!r.attended_at;
    case "no_show":
      return !!r.no_show;
  }
}

export default function FilterableBookingsTable({
  rows,
  clinicName,
  enableOverride = false,
}: {
  rows: BookingRow[];
  clinicName: string;
  enableOverride?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  // Quick filter (high-level)
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("upcoming");

  // Detailed filters
  const [patientQuery, setPatientQuery] = useState("");
  const [doctorFilter, setDoctorFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("slot_start");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const doctors = useMemo(() => {
    const seen = new Map<string, string>();
    rows.forEach((r) => {
      if (r.doctor?.display_name) seen.set(r.doctor.display_name, r.doctor.display_name);
    });
    return Array.from(seen.values()).sort();
  }, [rows]);

  // Counts per quick filter — shown inline in tab labels
  const quickCounts = useMemo(() => {
    const counts: Record<QuickFilter, number> = {
      upcoming: 0,
      today: 0,
      past_unmarked: 0,
      attended: 0,
      no_show: 0,
      all: rows.length,
    };
    for (const r of rows) {
      for (const q of ["upcoming", "today", "past_unmarked", "attended", "no_show"] as QuickFilter[]) {
        if (applyQuickFilter(r, q)) counts[q]++;
      }
    }
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    const fromMs = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
    const toMs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;

    return rows.filter((r) => {
      if (!applyQuickFilter(r, quickFilter)) return false;
      if (doctorFilter !== "all" && r.doctor?.display_name !== doctorFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (q) {
        const name = (r.patient?.full_name || "").toLowerCase();
        const phone = (r.patient?.whatsapp_number || "").toLowerCase();
        const ic = (r.patient?.id_number || "").toLowerCase();
        if (!name.includes(q) && !phone.includes(q) && !ic.includes(q)) return false;
      }
      if (fromMs || toMs) {
        const slotMs = new Date(r.slot_start).getTime();
        if (fromMs && slotMs < fromMs) return false;
        if (toMs && slotMs > toMs) return false;
      }
      return true;
    });
  }, [rows, quickFilter, patientQuery, doctorFilter, statusFilter, typeFilter, dateFrom, dateTo]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const cmp = (a: BookingRow, b: BookingRow): number => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sortKey) {
        case "slot_start":
          av = new Date(a.slot_start).getTime();
          bv = new Date(b.slot_start).getTime();
          break;
        case "patient":
          av = a.patient?.full_name?.toLowerCase() || "";
          bv = b.patient?.full_name?.toLowerCase() || "";
          break;
        case "doctor":
          av = a.doctor?.display_name?.toLowerCase() || "";
          bv = b.doctor?.display_name?.toLowerCase() || "";
          break;
        case "type":
          av = a.type;
          bv = b.type;
          break;
        case "status":
          av = a.status;
          bv = b.status;
          break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    };
    arr.sort(cmp);
    return arr;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "slot_start" ? "desc" : "asc");
    }
  }

  function clearAll() {
    setPatientQuery("");
    setDoctorFilter("all");
    setStatusFilter("all");
    setTypeFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  async function override(id: string, status: string) {
    const reason = prompt(`Set status to "${status}". Optional override note:`);
    if (reason === null) return;
    setBusy(id);
    const res = await fetch("/api/bookings/override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: id, new_status: status, notes: reason }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed");
    } else {
      router.refresh();
    }
  }

  async function cancelBooking(id: string) {
    if (!confirm("Cancel this booking? The slot will be freed.")) return;
    const notes = prompt("Optional note (e.g. patient called):") || "";
    setBusy(id);
    const res = await fetch("/api/bookings/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: id, notes }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed");
    } else {
      router.refresh();
    }
  }

  async function markAttendance(id: string, mark: "attended" | "no_show" | "clear") {
    const labels: Record<typeof mark, string> = {
      attended: "Mark patient as ATTENDED (showed up + completed)?",
      no_show: "Mark patient as NO-SHOW (did not come)?",
      clear: "Clear attendance status?",
    };
    if (!confirm(labels[mark])) return;
    setBusy(id);
    const res = await fetch("/api/bookings/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: id, mark }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed");
    } else {
      router.refresh();
    }
  }

  const activeFilterCount =
    (patientQuery ? 1 : 0) +
    (doctorFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Quick filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {QUICK_FILTERS.map((qf) => {
          const active = quickFilter === qf.key;
          const count = quickCounts[qf.key];
          return (
            <button
              key={qf.key}
              type="button"
              onClick={() => setQuickFilter(qf.key)}
              className={`px-3 py-1.5 text-xs rounded-md border ${
                active
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-stone-700 border-stone-200 hover:border-stone-400"
              }`}
            >
              {qf.label}
              <span className={`ml-1.5 ${active ? "text-brand-50" : "text-stone-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-stone-200 rounded-lg p-3 grid grid-cols-2 md:grid-cols-12 gap-2">
        <input
          className="input col-span-2 md:col-span-3"
          placeholder="Search name, IC, or phone"
          value={patientQuery}
          onChange={(e) => setPatientQuery(e.target.value)}
        />
        <select
          className="input col-span-1 md:col-span-2"
          value={doctorFilter}
          onChange={(e) => setDoctorFilter(e.target.value)}
        >
          <option value="all">All doctors</option>
          {doctors.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          className="input col-span-1 md:col-span-2"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="input col-span-2 md:col-span-1"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="input col-span-1 md:col-span-2"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="From"
        />
        <input
          type="date"
          className="input col-span-1 md:col-span-2"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="To"
        />
        <div className="col-span-2 md:col-span-12 flex items-center justify-between text-xs text-stone-500">
          <span>
            {sorted.length} of {rows.length}
            {activeFilterCount > 0 &&
              ` · ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active`}
          </span>
          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="text-brand-700 hover:underline">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
              <SortHeader label="Patient" k="patient" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="Doctor" k="doctor" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="Slot" k="slot_start" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="Type" k="type" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="Status" k="status" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <th className="px-4 py-2.5 font-medium">WhatsApp</th>
              <th className="px-4 py-2.5 font-medium">Actions</th>
              {enableOverride && <th className="px-4 py-2.5 font-medium">Override</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={enableOverride ? 8 : 7}
                  className="px-4 py-12 text-center text-sm text-stone-500"
                >
                  No bookings match the current filters.
                </td>
              </tr>
            )}
            {sorted.map((r) => {
              const slot = new Date(r.slot_start);
              const isPast = slot.getTime() < Date.now();
              const canMarkAttendance =
                r.status === "confirmed" && (isPast || isToday(slot));
              return (
                <tr key={r.id} className="border-b border-stone-100 last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.patient?.full_name || "—"}</div>
                    <div className="text-xs text-stone-500">
                      {r.patient?.id_number && <span>{r.patient.id_number} · </span>}
                      {r.patient?.whatsapp_number}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">{r.doctor?.display_name || "—"}</td>
                  <td className="px-4 py-3 text-xs">{formatSlotLabel(r.slot_start, r.slot_end)}</td>
                  <td className="px-4 py-3 text-xs capitalize">{r.type}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5 items-start">
                      <span className={`pill pill-${r.status}`}>{r.status}</span>
                      {r.attended_at && (
                        <span className="pill pill-confirmed">✓ attended</span>
                      )}
                      {r.no_show && <span className="pill pill-rejected">no-show</span>}
                      {reviewerName(r) && (
                        <div className="text-[10px] text-stone-500">by {reviewerName(r)}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <WhatsAppActions
                      booking={r}
                      patient={r.patient}
                      doctor={r.doctor}
                      clinicName={clinicName}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {(r.status === "pending" || r.status === "confirmed") && (
                        <>
                          <Link
                            href={`/staff/new?reschedule=${r.id}`}
                            className="px-2 py-1 text-xs rounded-md border border-stone-200 hover:border-stone-400 bg-white"
                          >
                            Reschedule
                          </Link>
                          <button
                            type="button"
                            onClick={() => cancelBooking(r.id)}
                            disabled={busy === r.id}
                            className="btn-reject"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {canMarkAttendance && !r.attended_at && !r.no_show && (
                        <>
                          <button
                            type="button"
                            onClick={() => markAttendance(r.id, "attended")}
                            disabled={busy === r.id}
                            className="btn-approve"
                          >
                            ✓ Attended
                          </button>
                          <button
                            type="button"
                            onClick={() => markAttendance(r.id, "no_show")}
                            disabled={busy === r.id}
                            className="px-2 py-1 text-xs rounded-md border border-stone-300 bg-white hover:bg-stone-50"
                          >
                            No-show
                          </button>
                        </>
                      )}
                      {(r.attended_at || r.no_show) && (
                        <button
                          type="button"
                          onClick={() => markAttendance(r.id, "clear")}
                          disabled={busy === r.id}
                          className="text-xs text-stone-500 hover:text-stone-800 hover:underline"
                        >
                          Undo
                        </button>
                      )}
                    </div>
                  </td>
                  {enableOverride && (
                    <td className="px-4 py-3">
                      <select
                        className="text-xs border border-stone-200 rounded px-2 py-1 bg-white"
                        value={r.status}
                        disabled={busy === r.id}
                        onChange={(e) => {
                          if (e.target.value !== r.status) override(r.id, e.target.value);
                        }}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  k,
  current,
  dir,
  onClick,
}: {
  label: string;
  k: SortKey;
  current: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
}) {
  const active = current === k;
  return (
    <th className="px-4 py-2.5 font-medium">
      <button
        type="button"
        onClick={() => onClick(k)}
        className={`inline-flex items-center gap-1 hover:text-stone-800 ${active ? "text-stone-800" : ""}`}
      >
        {label}
        <span className="text-[9px] text-stone-400">{active ? (dir === "asc" ? "▲" : "▼") : "⇅"}</span>
      </button>
    </th>
  );
}
