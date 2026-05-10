"use client";

import { useMemo, useState } from "react";

type Row = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
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
              const hasDetails =
                (r.before_data && Object.keys(r.before_data as object).length > 0) ||
                (r.after_data && Object.keys(r.after_data as object).length > 0);
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
                    {r.entity_id && (
                      <div className="text-stone-400 text-[10px] font-mono mt-0.5">
                        {r.entity_id.slice(0, 8)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {hasDetails ? (
                      <div>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : r.id)}
                          className="text-brand-700 hover:underline"
                        >
                          {isExpanded ? "Hide" : "Show"} details
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
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
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
