"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Premium-only — clinic-wide list of rooms / operatories. The lockscreen
// check-in picker reads from this list; the owner can rename Room 1 →
// "Surgery", add "Hygiene bay 2", etc.
export default function RoomsListEditor({ initial }: { initial: string[] }) {
  const router = useRouter();
  const [rooms, setRooms] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function update(i: number, value: string) {
    setRooms((r) => r.map((x, idx) => (idx === i ? value : x)));
  }
  function add() {
    setRooms((r) => [...r, `Room ${r.length + 1}`]);
  }
  function remove(i: number) {
    setRooms((r) => r.filter((_, idx) => idx !== i));
  }

  async function save() {
    const cleaned = rooms.map((r) => r.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      setMsg("Need at least one room.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/clinic/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rooms: cleaned }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Failed");
        return;
      }
      setRooms(data.rooms);
      setMsg("Saved.");
      router.refresh();
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 2000);
    }
  }

  const dirty = JSON.stringify(rooms) !== JSON.stringify(initial);

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 mb-4">
      <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            🚪 Rooms / operatories
            <span className="text-[10px] uppercase tracking-wider bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full font-medium">
              Premium
            </span>
          </h3>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Used by the lockscreen check-in picker. Rename or add rooms to
            match your clinic layout.
          </p>
        </div>
        {msg && <span className="text-[11px] text-emerald-700">{msg}</span>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {rooms.map((r, i) => (
          <div key={i} className="flex items-center gap-1">
            <input
              className="input text-sm"
              value={r}
              onChange={(e) => update(i, e.target.value)}
              placeholder={`Room ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-stone-400 hover:text-red-600 text-lg leading-none px-1"
              aria-label="Remove"
              disabled={rooms.length <= 1}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <button type="button" onClick={add} className="text-xs text-blue-700 hover:underline">
          + Add room
        </button>
        {dirty && (
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="ml-auto btn-primary text-xs"
          >
            {busy ? "Saving…" : "Save rooms"}
          </button>
        )}
      </div>
    </div>
  );
}
