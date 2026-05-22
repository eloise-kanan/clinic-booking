"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Doctor = {
  profile_id: string;
  display_name: string;
  default_slot_minutes: number;
};

const OPTIONS = [15, 30, 45, 60] as const;

export default function DoctorSlotEditor({ initial }: { initial: Doctor[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ id: string; type: "ok" | "err"; text: string } | null>(null);

  async function save(d: Doctor, minutes: number) {
    setSavingId(d.profile_id);
    setMsg(null);
    try {
      const res = await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: d.profile_id,
          default_slot_minutes: minutes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ id: d.profile_id, type: "err", text: data.error || "Failed" });
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.profile_id === d.profile_id ? { ...r, default_slot_minutes: minutes } : r
        )
      );
      setMsg({ id: d.profile_id, type: "ok", text: "Saved" });
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
      {rows.map((d) => (
        <div
          key={d.profile_id}
          className="px-4 py-3 flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{d.display_name}</p>
            {msg?.id === d.profile_id && (
              <p
                className={`text-[11px] mt-0.5 ${
                  msg.type === "ok" ? "text-emerald-700" : "text-red-600"
                }`}
              >
                {msg.text}
              </p>
            )}
          </div>
          <select
            className="input max-w-[110px]"
            value={d.default_slot_minutes}
            disabled={savingId === d.profile_id}
            onChange={(e) => save(d, parseInt(e.target.value))}
          >
            {OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt} min
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
