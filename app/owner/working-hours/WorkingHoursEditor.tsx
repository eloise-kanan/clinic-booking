"use client";

import { useEffect, useState } from "react";

type Doctor = { id: string; display_name: string; default_slot_minutes: number };
type Block = { id?: string; weekday: number; start_time: string; end_time: string };

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function trim5(t: string): string {
  // "09:00:00" -> "09:00"
  return t.length > 5 ? t.slice(0, 5) : t;
}

export default function WorkingHoursEditor({ doctors }: { doctors: Doctor[] }) {
  const [doctorId, setDoctorId] = useState<string>(doctors[0]?.id || "");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function load() {
    if (!doctorId) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/working-hours?doctor_id=${doctorId}`);
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "err", text: data.error || "Failed to load" });
        return;
      }
      setBlocks(
        (data.blocks || []).map((b: Block) => ({
          ...b,
          start_time: trim5(b.start_time),
          end_time: trim5(b.end_time),
        }))
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  function addBlock(weekday: number) {
    setBlocks((bs) => [...bs, { weekday, start_time: "09:00", end_time: "21:00" }]);
  }
  function removeBlock(idx: number) {
    setBlocks((bs) => bs.filter((_, i) => i !== idx));
  }
  function updateBlock(idx: number, patch: Partial<Block>) {
    setBlocks((bs) => bs.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  }

  function copyMonToAllWeekdays() {
    if (!confirm("Copy Monday's blocks to Tue–Fri (overwrites existing)?")) return;
    const monday = blocks.filter((b) => b.weekday === 1);
    setBlocks([
      ...blocks.filter((b) => b.weekday < 1 || b.weekday > 5),
      ...monday,
      ...[2, 3, 4, 5].flatMap((wd) =>
        monday.map((b) => ({ weekday: wd, start_time: b.start_time, end_time: b.end_time }))
      ),
    ]);
  }

  function clearAll() {
    if (!confirm("Remove all working hours for this doctor? They'll be unavailable for any booking.")) return;
    setBlocks([]);
  }

  function setDefault9to9() {
    if (!confirm("Reset to default 09:00–21:00 every day?")) return;
    setBlocks(
      Array.from({ length: 7 }, (_, wd) => ({ weekday: wd, start_time: "09:00", end_time: "21:00" }))
    );
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      // Sort and basic validation
      const sorted = [...blocks].sort(
        (a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)
      );
      for (const b of sorted) {
        if (b.start_time >= b.end_time) {
          setMsg({ type: "err", text: `Invalid time range on ${WEEKDAY_NAMES[b.weekday]}` });
          return;
        }
      }
      const res = await fetch("/api/working-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: doctorId,
          blocks: sorted.map((b) => ({
            weekday: b.weekday,
            start_time: b.start_time,
            end_time: b.end_time,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "err", text: data.error || "Failed to save" });
      } else {
        setMsg({ type: "ok", text: "Saved." });
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  // Group blocks by weekday for display
  const byDay: Block[][] = Array.from({ length: 7 }, () => []);
  blocks.forEach((b, i) => byDay[b.weekday]?.push({ ...b, id: String(i) }));

  if (doctors.length === 0) {
    return <p className="text-sm text-stone-500">No active doctors. Add doctors via Doctors &amp; nurses first.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="input max-w-xs"
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
        >
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.display_name} · {d.default_slot_minutes} min default slot
            </option>
          ))}
        </select>
        <button type="button" onClick={setDefault9to9} className="btn">
          Reset to 09:00–21:00 daily
        </button>
        <button type="button" onClick={copyMonToAllWeekdays} className="btn">
          Copy Mon → Tue–Fri
        </button>
        <button type="button" onClick={clearAll} className="btn">
          Clear all
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-stone-500">Loading…</p>
      ) : (
        <div className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-200">
          {byDay.map((dayBlocks, wd) => (
            <div key={wd} className="p-3 grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 items-start">
              <div className="text-sm font-medium text-stone-700">{WEEKDAY_NAMES[wd]}</div>
              <div className="space-y-2">
                {dayBlocks.length === 0 ? (
                  <span className="text-xs text-stone-400">Off</span>
                ) : (
                  dayBlocks.map((b) => {
                    const idx = blocks.findIndex(
                      (bb, i) => bb.weekday === b.weekday && String(i) === b.id
                    );
                    return (
                      <div key={b.id} className="flex flex-wrap items-center gap-2">
                        <input
                          type="time"
                          className="input max-w-[120px]"
                          value={b.start_time}
                          onChange={(e) => updateBlock(idx, { start_time: e.target.value })}
                        />
                        <span className="text-stone-400 text-xs">to</span>
                        <input
                          type="time"
                          className="input max-w-[120px]"
                          value={b.end_time}
                          onChange={(e) => updateBlock(idx, { end_time: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => removeBlock(idx)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })
                )}
                <button type="button" onClick={() => addBlock(wd)} className="text-xs text-brand-700 hover:underline">
                  + Add block
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="btn-primary">
          {saving ? "Saving…" : "Save working hours"}
        </button>
        {msg && (
          <span className={`text-xs ${msg.type === "ok" ? "text-emerald-700" : "text-red-600"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
