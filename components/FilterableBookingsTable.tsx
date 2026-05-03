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
  reviewer?: { full_name: string } | { full_name: string }[] | null;
  patient: { id?: string; full_name: string; whatsapp_number: string } | null;
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

const STATUSES = ["pending", "confirmed", "rejected", "cancelled", "expired"];
const TYPES = ["booking", "reschedule", "cancellation"];

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

  // Filters
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

  const filtered = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    const fromMs = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
    const toMs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;

    return rows.filter((r) => {
      if (doctorFilter !== "all" && r.doctor?.display_name !== doctorFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (q) {
        const name = (r.patient?.full_name || "").toLowerCase();
        const phone = (r.patient?.whatsapp_number || "").toLowerCase();
        if (!name.includes(q) && !phone.includes(q)) return false;
      }
      if (fromMs || toMs) {
        const slotMs = new Date(r.slot_start).getTime();
        if (fromMs && slotMs < fromMs) return false;
        if (toMs && slotMs > toMs) return false;
      }
      return true;
    });
  }, [rows, patientQuery, doctorFilter, statusFilter, typeFilter, dateFrom, dateTo]);

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

  const activeFilterCount =
    (patientQuery ? 1 : 0) +
    (doctorFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="bg-white border border-stone-200 rounded-lg p-3 grid grid-cols-2 md:grid-cols-12 gap-2">
        <input
          className="input col-span-2 md:col-span-3"
          placeholder="Search patient name or phone"
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
            {sorted.length} of {rows.length} {activeFilterCount > 0 && `· ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active`}
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
                <td colSpan={enableOverride ? 8 : 7} className="px-4 py-12 text-center text-sm text-stone-500">
                  No bookings match the current filters.
                </td>
              </tr>
            )}
            {sorted.map((r) => (
              <tr key={r.id} className="border-b border-stone-100 last:border-b-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.patient?.full_name || "—"}</div>
                  <div className="text-xs text-stone-500">{r.patient?.whatsapp_number}</div>
                </td>
                <td className="px-4 py-3 text-xs">{r.doctor?.display_name || "—"}</td>
                <td className="px-4 py-3 text-xs">{formatSlotLabel(r.slot_start, r.slot_end)}</td>
                <td className="px-4 py-3 text-xs capitalize">{r.type}</td>
                <td className="px-4 py-3">
                  <span className={`pill pill-${r.status}`}>{r.status}</span>
                  {reviewerName(r) && (
                    <div className="text-[10px] text-stone-500 mt-1">
                      by {reviewerName(r)}
                    </div>
                  )}
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
            ))}
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
