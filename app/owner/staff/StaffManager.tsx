"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Member = {
  id: string;
  role: "owner" | "nurse" | "doctor";
  full_name: string;
  active: boolean;
  email: string;                  // owner's real email; synthetic @kanan-clinic.local for staff (never shown)
  employee_number: string | null; // null for owner, set for nurse/doctor
  doctor: { id: string; display_name: string; default_slot_minutes: number; active: boolean } | null;
};

export default function StaffManager({ initial }: { initial: Member[] }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [role, setRole] = useState<"nurse" | "doctor">("nurse");
  const [fullName, setFullName] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [password, setPassword] = useState("");
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Suggest the next sequential employee number based on existing ones
  function suggestNextEmpNumber() {
    const existing = initial
      .map((m) => m.employee_number)
      .filter((n): n is string => !!n && /^\d+$/.test(n))
      .map(Number);
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1001;
    return String(next);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        full_name: fullName,
        employee_number: employeeNumber,
        password,
        default_slot_minutes: role === "doctor" ? slotMinutes : undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      setErr(data.error || "Failed");
      return;
    }
    setShow(false);
    setFullName("");
    setEmployeeNumber("");
    setPassword("");
    router.refresh();
  }

  async function toggleActive(m: Member) {
    if (!confirm(`${m.active ? "Deactivate" : "Reactivate"} ${m.full_name}?`)) return;
    await fetch("/api/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: m.id, active: !m.active }),
    });
    router.refresh();
  }

  async function resetPassword(m: Member) {
    const next = prompt(
      `Reset password for ${m.full_name}.\nEnter the new password (min 8 characters).\nThey can change it themselves later.`
    );
    if (!next) return;
    if (next.length < 8) {
      alert("Password must be at least 8 characters");
      return;
    }
    const res = await fetch(`/api/staff/${m.id}/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_password: next }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed");
      return;
    }
    alert(`Password updated. Share the new password with ${m.full_name} securely.`);
  }

  return (
    <div>
      <div className="mb-4">
        {!show ? (
          <button onClick={() => setShow(true)} className="btn-primary">
            + Add staff
          </button>
        ) : (
          <form onSubmit={add} className="bg-white border border-stone-200 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Role</label>
                <select className="input" value={role} onChange={(e) => setRole(e.target.value as any)}>
                  <option value="nurse">Nurse</option>
                  <option value="doctor">Doctor</option>
                </select>
              </div>
              <div>
                <label className="label">Full name</label>
                <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Employee number</label>
                <input
                  className="input"
                  type="text"
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value.toLowerCase().trim())}
                  onFocus={() => { if (!employeeNumber) setEmployeeNumber(suggestNextEmpNumber()); }}
                  placeholder="e.g. 1001 or jenny.tan"
                  minLength={3}
                  maxLength={20}
                  required
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Staff use this + their password to log in. Click the field for a suggestion.
                </p>
              </div>
              <div>
                <label className="label">Initial password</label>
                <input className="input" type="text" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
              </div>
            </div>
            {role === "doctor" && (
              <div>
                <label className="label">Default slot length</label>
                <select className="input max-w-[160px]" value={slotMinutes} onChange={(e) => setSlotMinutes(parseInt(e.target.value))}>
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                </select>
              </div>
            )}
            {err && <p className="text-xs text-red-600">{err}</p>}
            <div className="flex gap-2">
              <button className="btn-primary" disabled={busy}>
                {busy ? "Creating…" : "Create account"}
              </button>
              <button type="button" onClick={() => setShow(false)} className="btn">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="bg-white border border-stone-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Login</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {initial.map((m) => (
              <tr key={m.id} className="border-b border-stone-100 last:border-b-0">
                <td className="px-4 py-3 font-medium">{m.full_name}</td>
                <td className="px-4 py-3 text-xs capitalize">
                  {m.role}
                  {m.role === "doctor" && m.doctor && (
                    <span className="text-stone-500"> · {m.doctor.default_slot_minutes} min slots</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {m.role === "owner" ? m.email : (m.employee_number || "—")}
                </td>
                <td className="px-4 py-3">
                  <span className={`pill ${m.active ? "pill-confirmed" : "pill-cancelled"}`}>
                    {m.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {m.role !== "owner" && (
                      <button onClick={() => resetPassword(m)} className="text-xs text-stone-600 hover:text-stone-900">
                        Reset password
                      </button>
                    )}
                    {m.role !== "owner" && (
                      <button onClick={() => toggleActive(m)} className="text-xs text-stone-600 hover:text-stone-900">
                        {m.active ? "Deactivate" : "Reactivate"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
