"use client";

import { useEffect, useState } from "react";

type LeaveRequest = {
  id: string;
  profile_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
  profile: { full_name: string; role: string } | { full_name: string; role: string }[] | null;
  reviewer: { full_name: string } | { full_name: string }[] | null;
};

function flat<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  if (Array.isArray(v)) return v[0] || null;
  return v;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function LeaveManager({
  myProfileId,
  role,
}: {
  myProfileId: string;
  role: "nurse" | "owner" | "doctor";
}) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  async function load() {
    const res = await fetch("/api/leave/requests");
    const d = await res.json();
    setRequests(d.requests || []);
  }

  useEffect(() => {
    const t = todayStr();
    setStartDate(t);
    setEndDate(t);
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/leave/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_date: startDate, end_date: endDate, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit");
      } else {
        setReason("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function withdraw(id: string) {
    if (!confirm("Withdraw this leave request?")) return;
    const res = await fetch(`/api/leave/requests/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed");
      return;
    }
    await load();
  }

  async function review(id: string, status: "approved" | "rejected") {
    const notes = prompt(`Optional note (${status}):`) || "";
    const res = await fetch(`/api/leave/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed");
      return;
    }
    await load();
  }

  const mine = requests.filter((r) => r.profile_id === myProfileId);
  const others = requests.filter((r) => r.profile_id !== myProfileId);
  const pendingForReview = role === "owner" ? others.filter((r) => r.status === "pending") : [];

  if (!startDate) {
    return <p className="text-sm text-stone-500">Loading…</p>;
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
        <h3 className="text-sm font-medium">Submit a new request</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="label">From</label>
            <input
              type="date"
              className="input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={todayStr()}
              required
            />
          </div>
          <div>
            <label className="label">To</label>
            <input
              type="date"
              className="input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              required
            />
          </div>
          <div>
            <label className="label">Reason (optional)</label>
            <input
              className="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. medical, family, annual leave"
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Submitting…" : "Submit request"}
        </button>
      </form>

      {role === "owner" && (
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <h3 className="text-sm font-medium mb-2">Pending requests for review</h3>
          {pendingForReview.length === 0 ? (
            <p className="text-xs text-stone-500">No pending requests.</p>
          ) : (
            <ul className="divide-y divide-stone-100 text-sm">
              {pendingForReview.map((r) => {
                const p = flat(r.profile);
                return (
                  <li key={r.id} className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{p?.full_name || "—"}</div>
                      <div className="text-xs text-stone-500 capitalize">
                        {p?.role} · {r.start_date} → {r.end_date}
                      </div>
                      {r.reason && <div className="text-xs text-stone-600 mt-1">Reason: {r.reason}</div>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => review(r.id, "approved")} className="btn-approve">
                        Approve
                      </button>
                      <button onClick={() => review(r.id, "rejected")} className="btn-reject">
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
        <h3 className="text-sm font-medium mb-2">My requests</h3>
        {mine.length === 0 ? (
          <p className="text-xs text-stone-500">No requests submitted.</p>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {mine.map((r) => {
              const reviewer = flat(r.reviewer);
              return (
                <li key={r.id} className="py-2 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-medium">{r.start_date} → {r.end_date}</span>
                    {r.reason && <span className="text-xs text-stone-500 ml-2">· {r.reason}</span>}
                    {reviewer && (
                      <span className="text-xs text-stone-500 ml-2">
                        · reviewed by {reviewer.full_name}
                      </span>
                    )}
                    {r.reviewer_notes && (
                      <div className="text-xs text-stone-500 mt-0.5">Note: {r.reviewer_notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`pill ${
                        r.status === "approved"
                          ? "pill-confirmed"
                          : r.status === "rejected"
                          ? "pill-rejected"
                          : "pill-pending"
                      }`}
                    >
                      {r.status}
                    </span>
                    {r.status === "pending" && (
                      <button onClick={() => withdraw(r.id)} className="text-xs text-red-600 hover:underline">
                        Withdraw
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {others.filter((r) => r.status !== "pending").length > 0 && (
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <h3 className="text-sm font-medium mb-2">Other staff (recently reviewed)</h3>
          <ul className="divide-y divide-stone-100 text-sm">
            {others
              .filter((r) => r.status !== "pending")
              .slice(0, 10)
              .map((r) => {
                const p = flat(r.profile);
                return (
                  <li key={r.id} className="py-2 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-medium">{p?.full_name}</span>{" "}
                      <span className="text-xs text-stone-500">
                        ({p?.role}) · {r.start_date} → {r.end_date}
                      </span>
                    </div>
                    <span
                      className={`pill ${
                        r.status === "approved" ? "pill-confirmed" : "pill-rejected"
                      }`}
                    >
                      {r.status}
                    </span>
                  </li>
                );
              })}
          </ul>
        </div>
      )}
    </div>
  );
}
