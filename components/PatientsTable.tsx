"use client";

// Searchable, filterable, sortable patient table — shared by /nurse/patients
// and /owner/patients. All filtering happens client-side over the rows the
// server passed in (which already cap at 500 most-recently-active patients).

import { useMemo, useState } from "react";

export type PatientRow = {
  id: string;
  full_name: string;
  nationality: string;
  id_type: "ic" | "passport";
  id_number: string;
  whatsapp_number: string | null;
  visit_count: number;
  first_seen_at: string;
};

type SortKey = "full_name" | "visit_count" | "first_seen_at" | "nationality";
type SortDir = "asc" | "desc";

export default function PatientsTable({
  rows,
  initialSort = "first_seen_at",
}: {
  rows: PatientRow[];
  initialSort?: SortKey;
}) {
  const [q, setQ] = useState("");
  const [nationality, setNationality] = useState<string>("all");
  const [idType, setIdType] = useState<"all" | "ic" | "passport">("all");
  const [visitFilter, setVisitFilter] = useState<"all" | "first" | "returning" | "loyal">("all");
  const [sortKey, setSortKey] = useState<SortKey>(initialSort);
  const [sortDir, setSortDir] = useState<SortDir>(initialSort === "first_seen_at" ? "desc" : "asc");

  const nationalities = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.nationality));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (term) {
        const hit =
          r.full_name.toLowerCase().includes(term) ||
          r.id_number.toLowerCase().includes(term) ||
          (r.whatsapp_number || "").toLowerCase().includes(term);
        if (!hit) return false;
      }
      if (nationality !== "all" && r.nationality !== nationality) return false;
      if (idType !== "all" && r.id_type !== idType) return false;
      if (visitFilter === "first" && r.visit_count > 1) return false;
      if (visitFilter === "returning" && r.visit_count < 2) return false;
      if (visitFilter === "loyal" && r.visit_count < 5) return false;
      return true;
    });
  }, [rows, q, nationality, idType, visitFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "full_name" || sortKey === "nationality") {
        cmp = a[sortKey].localeCompare(b[sortKey]);
      } else if (sortKey === "visit_count") {
        cmp = a.visit_count - b.visit_count;
      } else if (sortKey === "first_seen_at") {
        cmp = new Date(a.first_seen_at).getTime() - new Date(b.first_seen_at).getTime();
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Sensible defaults: text alpha asc, numbers desc, dates desc
      setSortDir(key === "full_name" || key === "nationality" ? "asc" : "desc");
    }
  }

  const activeFilters =
    (q ? 1 : 0) +
    (nationality !== "all" ? 1 : 0) +
    (idType !== "all" ? 1 : 0) +
    (visitFilter !== "all" ? 1 : 0);

  function clearAll() {
    setQ("");
    setNationality("all");
    setIdType("all");
    setVisitFilter("all");
  }

  return (
    <div>
      {/* Filter strip */}
      <div className="bg-white border border-stone-200 rounded-lg p-3 mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Search name, IC / passport, or WhatsApp"
          className="input flex-1 min-w-[220px]"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="input w-auto"
          value={nationality}
          onChange={(e) => setNationality(e.target.value)}
        >
          <option value="all">All nationalities</option>
          {nationalities.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <select
          className="input w-auto"
          value={idType}
          onChange={(e) => setIdType(e.target.value as typeof idType)}
        >
          <option value="all">Any ID</option>
          <option value="ic">IC only</option>
          <option value="passport">Passport only</option>
        </select>
        <select
          className="input w-auto"
          value={visitFilter}
          onChange={(e) => setVisitFilter(e.target.value as typeof visitFilter)}
        >
          <option value="all">All visits</option>
          <option value="first">First-time (≤1)</option>
          <option value="returning">Returning (2+)</option>
          <option value="loyal">Loyal (5+)</option>
        </select>
        <div className="ml-auto flex items-center gap-2 text-xs text-stone-500">
          <span>{sorted.length} of {rows.length}</span>
          {activeFilters > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-blue-600 hover:underline"
            >
              Clear ({activeFilters})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
              <SortHeader label="Name" col="full_name" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="Nationality" col="nationality" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <th className="px-4 py-2.5 font-medium">ID</th>
              <th className="px-4 py-2.5 font-medium">WhatsApp</th>
              <SortHeader label="Visits" col="visit_count" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
              <SortHeader label="First seen" col="first_seen_at" current={sortKey} dir={sortDir} onClick={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-stone-500">
                  {activeFilters > 0
                    ? "No patients match these filters."
                    : "No patients yet."}
                </td>
              </tr>
            ) : (
              sorted.map((p) => (
                <tr key={p.id} className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium">{p.full_name}</td>
                  <td className="px-4 py-3 text-xs">{p.nationality}</td>
                  <td className="px-4 py-3 text-xs text-stone-600">
                    <span className="text-stone-400 mr-1">{p.id_type === "ic" ? "IC" : "Passport"}</span>
                    {p.id_number}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-600">{p.whatsapp_number || "—"}</td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums">
                    <span
                      className={
                        p.visit_count >= 5
                          ? "inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium"
                          : p.visit_count >= 2
                            ? "inline-block px-1.5 py-0.5 rounded bg-blue-100 text-blue-800"
                            : "text-stone-500"
                      }
                    >
                      {p.visit_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">
                    {new Date(p.first_seen_at).toLocaleDateString("en-MY", {
                      year: "numeric", month: "short", day: "numeric",
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortHeader({
  label, col, current, dir, onClick, align = "left",
}: {
  label: string;
  col: SortKey;
  current: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = current === col;
  return (
    <th className={`px-4 py-2.5 font-medium ${align === "right" ? "text-right" : ""}`}>
      <button
        type="button"
        onClick={() => onClick(col)}
        className={`inline-flex items-center gap-1 ${active ? "text-stone-900" : "text-stone-500 hover:text-stone-900"}`}
      >
        {label}
        {active && (
          <span className="text-[10px]">{dir === "asc" ? "▲" : "▼"}</span>
        )}
      </button>
    </th>
  );
}
