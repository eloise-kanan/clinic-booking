"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LeaveRow = {
  id: string;
  profile_id: string;
  profile_name: string;
  profile_role: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  leave_type: "annual" | "mc" | "emergency";
  created_at: string;
};

type ShiftRow = {
  id: string;
  profile_id: string;
  profile_name: string;
  profile_role: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  is_permanent: boolean;
  created_at: string;
};

export default function HrApprovalsList({
  leaves,
  shifts,
}: {
  leaves: LeaveRow[];
  shifts: ShiftRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function review(kind: "leave" | "shift", id: string, status: "approved" | "rejected") {
    const note = prompt(`Optional note (${status}):`) || "";
    setBusy(`${kind}:${id}`);
    try {
      const url =
        kind === "leave"
          ? `/api/leave/requests/${id}`
          : `/api/duty/shifts/${id}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewer_notes: note }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const total = leaves.length + shifts.length;

  if (total === 0) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-8 text-center">
        <div className="text-3xl mb-2">✓</div>
        <p className="text-sm text-stone-600 font-medium">All caught up.</p>
        <p className="text-xs text-stone-500 mt-1">No leave or shift-change requests waiting.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {leaves.length > 0 && (
        <section>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <h3 className="text-[11px] uppercase tracking-wider font-semibold text-amber-700">
              Leave requests
            </h3>
            <span className="text-[10px] text-stone-400">· {leaves.length}</span>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
            {leaves.map((r) => (
              <div key={r.id} className="p-4 flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm font-medium">
                    {r.profile_name}
                    <span className="text-stone-500 ml-2 text-xs lowercase">({r.profile_role})</span>
                  </div>
                  <div className="text-xs text-stone-600 mt-1">
                    <strong>{prettyLeaveType(r.leave_type)}</strong> · {fmtDateRange(r.start_date, r.end_date)}
                  </div>
                  {r.reason && (
                    <div className="text-[11px] text-stone-500 mt-1">Reason: {r.reason}</div>
                  )}
                  <div className="text-[10px] text-stone-400 mt-1">
                    Submitted {new Date(r.created_at).toLocaleString("en-MY")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => review("leave", r.id, "approved")}
                    disabled={busy === `leave:${r.id}`}
                    className="btn-approve"
                  >
                    ✓ Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => review("leave", r.id, "rejected")}
                    disabled={busy === `leave:${r.id}`}
                    className="btn-reject"
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {shifts.length > 0 && (
        <section>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <h3 className="text-[11px] uppercase tracking-wider font-semibold text-blue-700">
              Shift change requests
            </h3>
            <span className="text-[10px] text-stone-400">· {shifts.length}</span>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
            {shifts.map((r) => (
              <div key={r.id} className="p-4 flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm font-medium">
                    {r.profile_name}
                    <span className="text-stone-500 ml-2 text-xs lowercase">({r.profile_role})</span>
                  </div>
                  <div className="text-xs text-stone-600 mt-1 flex items-center gap-2 flex-wrap">
                    <strong>{fmtDate(r.shift_date)}</strong> · {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}
                    {r.is_permanent && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-medium">
                        Permanent · {weekdayName(r.shift_date)}s
                      </span>
                    )}
                  </div>
                  {r.reason && (
                    <div className="text-[11px] text-stone-500 mt-1">Reason: {r.reason}</div>
                  )}
                  <div className="text-[10px] text-stone-400 mt-1">
                    Submitted {new Date(r.created_at).toLocaleString("en-MY")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => review("shift", r.id, "approved")}
                    disabled={busy === `shift:${r.id}`}
                    className="btn-approve"
                  >
                    ✓ Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => review("shift", r.id, "rejected")}
                    disabled={busy === `shift:${r.id}`}
                    className="btn-reject"
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function weekdayName(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long" });
}
function prettyLeaveType(t: "annual" | "mc" | "emergency"): string {
  if (t === "mc") return "Medical (MC)";
  if (t === "emergency") return "Emergency";
  return "Annual";
}
function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function fmtDateRange(s: string, e: string): string {
  if (s === e) return fmtDate(s);
  return `${fmtDate(s)} – ${fmtDate(e)}`;
}
