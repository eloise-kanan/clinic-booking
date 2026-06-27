"use client";

import { useEffect, useState } from "react";
import { localYmd as todayStr, addDaysYmd as addDays } from "@/lib/local-date";

type Shift = {
  id: string;
  profile_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  reviewer_notes: string | null;
  profile: { full_name: string; role: string } | { full_name: string; role: string }[] | null;
  reviewer: { full_name: string } | { full_name: string }[] | null;
};

function flat<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  if (Array.isArray(v)) return v[0] || null;
  return v;
}

export default function DutyManager({
  myProfileId,
  role,
}: {
  myProfileId: string;
  myName: string;
  role: "nurse" | "owner" | "doctor";
}) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [shiftDate, setShiftDate] = useState<string>("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("21:00");
  const [notes, setNotes] = useState("");
  const [isPermanent, setIsPermanent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const t = todayStr();
    setFrom(t);
    setTo(addDays(t, 30));
    setShiftDate(t);
  }, []);

  async function load() {
    if (!from || !to) return;
    const res = await fetch(`/api/duty/shifts?from=${from}&to=${to}`);
    const d = await res.json();
    setShifts(d.shifts || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  async function addShift(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/duty/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shift_date: shiftDate,
          start_time: startTime,
          end_time: endTime,
          notes,
          is_permanent: isPermanent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit");
      } else {
        setNotes("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function withdraw(id: string) {
    if (!confirm("Withdraw this request?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/duty/shifts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function review(id: string, status: "approved" | "rejected") {
    const reviewerNotes = prompt(`Optional note (${status}):`) || "";
    const res = await fetch(`/api/duty/shifts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes: reviewerNotes }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed");
      return;
    }
    await load();
  }

  const myShifts = shifts.filter((s) => s.profile_id === myProfileId);
  const otherShifts = shifts.filter((s) => s.profile_id !== myProfileId);
  const pendingForReview = role === "owner" ? otherShifts.filter((s) => s.status === "pending") : [];

  if (!from) {
    return <p className="text-sm text-stone-500">Loading…</p>;
  }

  return (
    <div className="space-y-5">
      <form onSubmit={addShift} className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
        <h3 className="text-sm font-medium">Submit a shift change</h3>
        {role !== "owner" && (
          <p className="text-xs text-stone-500">
            Submitted shifts are <strong>pending</strong> until the owner approves.
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              className="input"
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value)}
              min={todayStr()}
              required
            />
          </div>
          <div>
            <label className="label">Start</label>
            <input
              type="time"
              className="input"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">End</label>
            <input
              type="time"
              className="input"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Reason / notes</label>
            <input
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. covering for X, half-day"
            />
          </div>
        </div>
        {/* Permanent toggle — when on, this becomes a recurring schedule
            change. The picked date supplies the weekday; once approved it
            replaces the staff member's default working hours and does NOT
            show up on the duty calendar (no exception spam). */}
        <label className="flex items-start gap-2.5 p-2.5 rounded-md border border-stone-200 bg-stone-50 cursor-pointer">
          <input
            type="checkbox"
            checked={isPermanent}
            onChange={(e) => setIsPermanent(e.target.checked)}
            className="mt-0.5"
          />
          <div className="flex-1">
            <div className="text-xs font-medium">Make this a permanent change</div>
            <div className="text-[11px] text-stone-500 leading-snug mt-0.5">
              Treat this as my new default for {fmtWeekdayName(shiftDate)}s going forward — owner approval will update my working hours, not the calendar.
            </div>
          </div>
        </label>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Saving…" : role === "owner" ? (isPermanent ? "Add permanent change" : "Add custom shift") : (isPermanent ? "Submit permanent change" : "Submit shift change")}
        </button>
      </form>

      {role === "owner" && (
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <h3 className="text-sm font-medium mb-2">Pending shift changes for review</h3>
          {pendingForReview.length === 0 ? (
            <p className="text-xs text-stone-500">No pending shift changes.</p>
          ) : (
            <ul className="divide-y divide-stone-100 text-sm">
              {pendingForReview.map((s) => {
                const p = flat(s.profile);
                return (
                  <li key={s.id} className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{p?.full_name || "—"}</div>
                      <div className="text-xs text-stone-500 capitalize">
                        {p?.role} · {s.shift_date} · {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                      </div>
                      {s.notes && <div className="text-xs text-stone-600 mt-1">Reason: {s.notes}</div>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => review(s.id, "approved")} className="btn-approve">
                        Approve
                      </button>
                      <button onClick={() => review(s.id, "rejected")} className="btn-reject">
                        Reject
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h3 className="text-sm font-medium">My shift changes</h3>
          <div className="flex items-center gap-2">
            <label className="text-xs text-stone-500">Range</label>
            <input
              type="date"
              className="input max-w-[150px]"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <span className="text-stone-400 text-xs">→</span>
            <input
              type="date"
              className="input max-w-[150px]"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
        {myShifts.length === 0 ? (
          <p className="text-xs text-stone-500 mb-4">No shift changes in this range.</p>
        ) : (
          <ul className="text-sm divide-y divide-stone-100 mb-4">
            {myShifts.map((s) => {
              const reviewer = flat(s.reviewer);
              return (
                <li key={s.id} className="flex items-center justify-between py-2 gap-2">
                  <div>
                    <span className="font-medium">{s.shift_date}</span>{" "}
                    <span className="text-stone-500">
                      {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                    </span>
                    {s.notes && <span className="text-xs text-stone-500 ml-2">· {s.notes}</span>}
                    {reviewer && (
                      <span className="text-xs text-stone-500 ml-2">· reviewed by {reviewer.full_name}</span>
                    )}
                    {s.reviewer_notes && (
                      <div className="text-xs text-stone-500 mt-0.5">Note: {s.reviewer_notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`pill ${
                        s.status === "approved"
                          ? "pill-confirmed"
                          : s.status === "rejected"
                          ? "pill-rejected"
                          : "pill-pending"
                      }`}
                    >
                      {s.status}
                    </span>
                    {s.status === "pending" && (
                      <button onClick={() => withdraw(s.id)} className="text-xs text-red-600 hover:underline">
                        Withdraw
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {role !== "owner" && otherShifts.length > 0 && (
          <>
            <h3 className="text-sm font-medium mb-2 mt-4">Other staff (recent)</h3>
            <ul className="text-sm divide-y divide-stone-100">
              {otherShifts.slice(0, 10).map((s) => {
                const p = flat(s.profile);
                return (
                  <li key={s.id} className="flex items-center justify-between py-2">
                    <div>
                      <span className="font-medium">{p?.full_name || "—"}</span>{" "}
                      <span className="text-xs text-stone-500 capitalize">({p?.role})</span>
                      <span className="text-stone-500"> · {s.shift_date}</span>{" "}
                      <span className="text-stone-500">
                        {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                      </span>
                    </div>
                    <span
                      className={`pill ${
                        s.status === "approved"
                          ? "pill-confirmed"
                          : s.status === "rejected"
                          ? "pill-rejected"
                          : "pill-pending"
                      }`}
                    >
                      {s.status}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {role === "owner" && otherShifts.filter((s) => s.status !== "pending").length > 0 && (
          <>
            <h3 className="text-sm font-medium mb-2 mt-4">Other staff (recently reviewed)</h3>
            <ul className="text-sm divide-y divide-stone-100">
              {otherShifts
                .filter((s) => s.status !== "pending")
                .slice(0, 10)
                .map((s) => {
                  const p = flat(s.profile);
                  return (
                    <li key={s.id} className="flex items-center justify-between py-2">
                      <div>
                        <span className="font-medium">{p?.full_name || "—"}</span>{" "}
                        <span className="text-xs text-stone-500 capitalize">({p?.role})</span>
                        <span className="text-stone-500"> · {s.shift_date}</span>{" "}
                        <span className="text-stone-500">
                          {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`pill ${
                            s.status === "approved" ? "pill-confirmed" : "pill-rejected"
                          }`}
                        >
                          {s.status}
                        </span>
                        <button
                          onClick={() => withdraw(s.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function fmtWeekdayName(dateStr: string): string {
  if (!dateStr) return "the chosen day";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long" });
}
