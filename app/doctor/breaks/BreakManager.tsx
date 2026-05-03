"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function BreakManager({
  doctorId,
  initial,
}: {
  doctorId: string;
  initial: any[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"oneoff" | "recurring">("oneoff");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [weekday, setWeekday] = useState(1);
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const body =
      mode === "oneoff"
        ? { doctor_id: doctorId, start_at: startAt, end_at: endAt, reason }
        : { doctor_id: doctorId, weekday, start_time: startTime, end_time: endTime, reason };
    await fetch("/api/breaks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    setReason("");
    router.refresh();
  }

  async function del(id: string) {
    if (!confirm("Remove this block?")) return;
    await fetch(`/api/breaks?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="bg-white border border-stone-200 rounded-lg p-4 space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("oneoff")}
            className={`px-3 py-1.5 text-xs rounded-md border ${
              mode === "oneoff" ? "bg-stone-900 text-white border-stone-900" : "border-stone-200"
            }`}
          >
            One-off block
          </button>
          <button
            type="button"
            onClick={() => setMode("recurring")}
            className={`px-3 py-1.5 text-xs rounded-md border ${
              mode === "recurring" ? "bg-stone-900 text-white border-stone-900" : "border-stone-200"
            }`}
          >
            Recurring break
          </button>
        </div>

        {mode === "oneoff" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start</label>
              <input type="datetime-local" className="input" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
            </div>
            <div>
              <label className="label">End</label>
              <input type="datetime-local" className="input" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Day</label>
              <select className="input" value={weekday} onChange={(e) => setWeekday(parseInt(e.target.value))}>
                {WEEKDAYS.map((w, i) => (
                  <option key={i} value={i}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Start time</label>
              <input type="time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <label className="label">End time</label>
              <input type="time" className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
        )}

        <div>
          <label className="label">Reason (optional)</label>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lunch, MC, conference..." />
        </div>
        <button className="btn-primary" disabled={busy}>
          {busy ? "Adding…" : "Add block"}
        </button>
      </form>

      <div>
        <h3 className="text-sm font-medium mb-2">Active blocks</h3>
        {initial.length === 0 ? (
          <p className="text-xs text-stone-500">None.</p>
        ) : (
          <div className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100">
            {initial.map((b: any) => (
              <div key={b.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm">
                    {b.weekday !== null
                      ? `Every ${WEEKDAYS[b.weekday]}, ${b.start_time}–${b.end_time}`
                      : `${new Date(b.start_at).toLocaleString("en-MY")} → ${new Date(b.end_at).toLocaleString("en-MY")}`}
                  </div>
                  {b.reason && <div className="text-xs text-stone-500">{b.reason}</div>}
                </div>
                <button onClick={() => del(b.id)} className="text-xs text-red-600 hover:underline">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
