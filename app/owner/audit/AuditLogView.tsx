"use client";

import { useMemo, useState } from "react";

type Row = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  // Pre-resolved human label for the entity (e.g. patient full name for a
  // booking or patient row). Falls back to the truncated UUID when null.
  entity_label?: string | null;
  before_data: unknown;
  after_data: unknown;
  created_at: string;
  actor: { full_name: string; role: string } | { full_name: string; role: string }[] | null;
};

function flat<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  if (Array.isArray(v)) return v[0] || null;
  return v;
}

function actionLabel(action: string): string {
  // Convert snake_case to readable text
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function actionPillClass(action: string): string {
  if (action.includes("delete") || action.includes("reject") || action.includes("cancel"))
    return "bg-red-50 text-red-700";
  if (action.includes("approve") || action.includes("confirm") || action.includes("attended"))
    return "bg-emerald-50 text-emerald-700";
  if (action.includes("create") || action.includes("staff_create")) return "bg-blue-50 text-blue-700";
  if (action.includes("override") || action.includes("password") || action.includes("update"))
    return "bg-amber-50 text-amber-700";
  return "bg-stone-100 text-stone-700";
}

export default function AuditLogView({ rows }: { rows: Row[] }) {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const actions = useMemo(() => {
    const set = new Set(rows.map((r) => r.action));
    return Array.from(set).sort();
  }, [rows]);

  const actors = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      const a = flat(r.actor);
      if (a?.full_name) map.set(a.full_name, a.full_name);
    });
    return Array.from(map.values()).sort();
  }, [rows]);

  const entities = useMemo(() => {
    const set = new Set(rows.map((r) => r.entity_type));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (actionFilter !== "all" && r.action !== actionFilter) return false;
      if (entityFilter !== "all" && r.entity_type !== entityFilter) return false;
      const actor = flat(r.actor);
      if (actorFilter !== "all" && actor?.full_name !== actorFilter) return false;
      if (q) {
        const hay =
          (actor?.full_name || "").toLowerCase() +
          " " +
          r.action.toLowerCase() +
          " " +
          r.entity_type.toLowerCase() +
          " " +
          (r.entity_id || "").toLowerCase() +
          " " +
          JSON.stringify(r.before_data || "") +
          " " +
          JSON.stringify(r.after_data || "");
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, actionFilter, actorFilter, entityFilter, search]);

  function clearAll() {
    setActionFilter("all");
    setActorFilter("all");
    setEntityFilter("all");
    setSearch("");
  }

  const activeCount =
    (actionFilter !== "all" ? 1 : 0) +
    (actorFilter !== "all" ? 1 : 0) +
    (entityFilter !== "all" ? 1 : 0) +
    (search ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="bg-white border border-stone-200 rounded-lg p-3 grid grid-cols-2 md:grid-cols-12 gap-2">
        <input
          className="input col-span-2 md:col-span-3"
          placeholder="Search actor, action, entity, IDs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input col-span-1 md:col-span-3"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="all">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {actionLabel(a)}
            </option>
          ))}
        </select>
        <select
          className="input col-span-1 md:col-span-3"
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
        >
          <option value="all">All actors</option>
          {actors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          className="input col-span-2 md:col-span-3"
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
        >
          <option value="all">All entities</option>
          {entities.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <div className="col-span-2 md:col-span-12 flex items-center justify-between text-xs text-stone-500">
          <span>
            {filtered.length} of {rows.length}
            {activeCount > 0 && ` · ${activeCount} filter${activeCount === 1 ? "" : "s"} active`}
          </span>
          {activeCount > 0 && (
            <button onClick={clearAll} className="text-brand-700 hover:underline">
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
              <th className="px-4 py-2.5 font-medium">When</th>
              <th className="px-4 py-2.5 font-medium">Actor</th>
              <th className="px-4 py-2.5 font-medium">Action</th>
              <th className="px-4 py-2.5 font-medium">Entity</th>
              <th className="px-4 py-2.5 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-stone-500">
                  No audit entries match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((r) => {
              const actor = flat(r.actor);
              const isExpanded = expandedId === r.id;
              const hasDetails = Boolean(
                (r.before_data && Object.keys(r.before_data as object).length > 0) ||
                  (r.after_data && Object.keys(r.after_data as object).length > 0)
              );
              const summaryParts: string[] = summarizeChange(r.before_data, r.after_data, r.action);
              return (
                <tr key={r.id} className="border-b border-stone-100 last:border-b-0 align-top">
                  <td className="px-4 py-3 text-xs text-stone-600 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("en-MY")}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {actor ? (
                      <>
                        <span className="font-medium">{actor.full_name}</span>
                        <span className="text-stone-500 ml-1 capitalize">({actor.role})</span>
                      </>
                    ) : (
                      <span className="text-stone-400">— (deactivated)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`pill ${actionPillClass(r.action)}`}>
                      {actionLabel(r.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="capitalize">{r.entity_type}</div>
                    {!r.entity_label && r.entity_id && (
                      <div className="text-stone-400 text-[10px] font-mono mt-0.5">
                        {r.entity_id.slice(0, 8)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {/* Patient name appears as the lead line of the details
                        cell so owners read "Tan Ming · Marked attended" left
                        to right without bouncing between columns. */}
                    {r.entity_label && (
                      <div
                        className="text-stone-900 font-medium mb-0.5"
                        title={r.entity_id || ""}
                      >
                        {r.entity_label}
                      </div>
                    )}
                    {/* Friendly summary line — extracted from before/after.
                        Picks out the fields owners actually care about
                        (status, attendance, no_show etc.) and renders them
                        as "X → Y" rather than making them dig through JSON. */}
                    {summaryParts.length > 0 && (
                      <div className="space-y-0.5">
                        {summaryParts.map((p: string, i: number) => (
                          <div key={i} className="text-stone-700">
                            {p}
                          </div>
                        ))}
                      </div>
                    )}
                    {hasDetails && (
                      <div className="mt-1">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : r.id)}
                          className="text-brand-700 hover:underline text-[11px]"
                        >
                          {isExpanded ? "Hide" : "Show"} raw JSON
                        </button>
                        {isExpanded && (
                          <pre className="mt-2 text-[11px] bg-stone-50 border border-stone-200 rounded p-2 overflow-x-auto max-w-xl whitespace-pre-wrap">
                            {JSON.stringify(
                              { before: r.before_data, after: r.after_data },
                              null,
                              2
                            )}
                          </pre>
                        )}
                      </div>
                    )}
                    {!hasDetails && <span className="text-stone-400">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Reads the before/after payloads and emits a short human summary for the
// fields owners ask about most: status (pending → confirmed), attended_at /
// no_show transitions, and a few common single-field updates. Falls back to
// listing any keys whose values actually changed when no specific handler
// matches, so users get something useful even for novel actions.
function summarizeChange(
  before: unknown,
  after: unknown,
  action: string
): string[] {
  const b: Record<string, unknown> = before && typeof before === "object" ? (before as Record<string, unknown>) : {};
  const a: Record<string, unknown> = after && typeof after === "object" ? (after as Record<string, unknown>) : {};

  const parts: string[] = [];

  // Status transition: pending → confirmed, etc.
  if (b.status !== undefined && a.status !== undefined && b.status !== a.status) {
    parts.push(`Status: ${String(b.status)} → ${String(a.status)}`);
  } else if (a.status !== undefined && b.status === undefined) {
    parts.push(`Status set: ${String(a.status)}`);
  }

  // Attendance markers.
  if (a.attended_at && !b.attended_at) parts.push("Marked attended");
  if (b.attended_at && a.attended_at === null) parts.push("Attended cleared");
  if (a.no_show === true && b.no_show !== true) parts.push("Marked no-show");
  if (b.no_show === true && (a.no_show === false || a.no_show === null)) parts.push("No-show cleared");

  // Check-in / check-out (Premium room flow).
  if (a.checked_in_at && !b.checked_in_at) {
    parts.push(`Checked in${a.room ? ` to ${String(a.room)}` : ""}`);
  }
  if (a.checked_out_at && !b.checked_out_at) {
    parts.push(`Checked out${a.treatment_done ? ` · ${String(a.treatment_done)}` : ""}`);
  }

  // Reschedule / slot change.
  if (b.slot_start && a.slot_start && b.slot_start !== a.slot_start) {
    parts.push(
      `Slot: ${formatSlot(String(b.slot_start))} → ${formatSlot(String(a.slot_start))}`
    );
  }

  // Doctor swap.
  if (b.doctor_id && a.doctor_id && b.doctor_id !== a.doctor_id) {
    parts.push("Doctor changed");
  }

  // Reminder dispatch action specifically.
  if (action === "reminder_sent" && a.reminder_sent_at) {
    parts.push("Reminder sent");
  }

  // Pickup any other obvious fields that changed (cap at 3 for brevity).
  if (parts.length === 0) {
    const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
    let extras = 0;
    for (const k of keys) {
      if (extras >= 3) break;
      if (b[k] === a[k]) continue;
      if (k === "updated_at" || k === "actor_id" || k === "updated_by") continue;
      const bv = formatVal(b[k]);
      const av = formatVal(a[k]);
      if (bv === "" && av === "") continue;
      parts.push(`${k.replace(/_/g, " ")}: ${bv || "∅"} → ${av || "∅"}`);
      extras++;
    }
  }

  return parts;
}

function formatSlot(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-MY", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "string") return v.length > 30 ? v.slice(0, 30) + "…" : v;
  if (typeof v === "number") return String(v);
  return JSON.stringify(v).slice(0, 30);
}
