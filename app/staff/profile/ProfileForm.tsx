"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Tab = "password" | "email" | "pin";

export default function ProfileForm({
  email,
  isOwner,
  hasPin,
}: {
  email: string;
  isOwner: boolean;
  hasPin: boolean;
}) {
  const [tab, setTab] = useState<Tab>("password");
  const showPinTab = !isOwner;
  const showEmailTab = isOwner;

  return (
    <div className="max-w-md">
      <div className="flex gap-1 mb-3 border-b border-stone-200">
        <TabBtn active={tab === "password"} onClick={() => setTab("password")}>
          Change password
        </TabBtn>
        {showPinTab && (
          <TabBtn active={tab === "pin"} onClick={() => setTab("pin")}>
            {hasPin ? "Change PIN" : "Set PIN"}
          </TabBtn>
        )}
        {showEmailTab && (
          <TabBtn active={tab === "email"} onClick={() => setTab("email")}>
            Change email
          </TabBtn>
        )}
      </div>
      {tab === "password" && <PasswordSection />}
      {tab === "pin" && showPinTab && <PinSection hasPin={hasPin} />}
      {tab === "email" && showEmailTab && <EmailSection currentEmail={email} />}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 text-sm -mb-px border-b-2 transition-colors ${
        active
          ? "border-stone-900 text-stone-900 font-medium"
          : "border-transparent text-stone-500 hover:text-stone-900"
      }`}
    >
      {children}
    </button>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next !== confirm) {
      setMsg({ type: "err", text: "New password and confirmation don't match" });
      return;
    }
    if (next.length < 8) {
      setMsg({ type: "err", text: "New password must be at least 8 characters" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "err", text: data.error || "Failed to change password" });
      } else {
        setMsg({ type: "ok", text: "Password changed." });
        setCurrent("");
        setNext("");
        setConfirm("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-stone-200 p-5 space-y-3">
      <div>
        <label className="label">Current password</label>
        <input
          type="password"
          className="input"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      <div>
        <label className="label">New password</label>
        <input
          type="password"
          className="input"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div>
        <label className="label">Confirm new password</label>
        <input
          type="password"
          className="input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      {msg && (
        <p className={`text-xs ${msg.type === "ok" ? "text-emerald-700" : "text-red-600"}`}>
          {msg.text}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}

function PinSection({ hasPin }: { hasPin: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!/^\d{6}$/.test(next)) {
      setMsg({ type: "err", text: "PIN must be exactly 6 digits" });
      return;
    }
    if (next !== confirm) {
      setMsg({ type: "err", text: "New PIN and confirmation don't match" });
      return;
    }
    if (hasPin && !/^\d{6}$/.test(current)) {
      setMsg({ type: "err", text: "Current PIN required" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/account/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_pin: hasPin ? current : undefined,
          new_pin: next,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "err", text: data.error || "Failed to change PIN" });
        return;
      }
      setMsg({ type: "ok", text: hasPin ? "PIN changed." : "PIN set. Use this PIN at the clinic terminal." });
      setCurrent("");
      setNext("");
      setConfirm("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-stone-200 p-5 space-y-3">
      <p className="text-[12px] text-stone-600 -mt-1">
        Your 6-digit PIN unlocks actions at the shared clinic terminal — confirming bookings, sending reminders, opening HR pages. Don&apos;t share it.
      </p>
      {hasPin && (
        <div>
          <label className="label">Current PIN</label>
          <input
            type="password"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            className="input tracking-widest text-center text-lg"
            value={current}
            onChange={(e) => setCurrent(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
          />
        </div>
      )}
      <div>
        <label className="label">New PIN (6 digits)</label>
        <input
          type="password"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          className="input tracking-widest text-center text-lg"
          value={next}
          onChange={(e) => setNext(e.target.value.replace(/\D/g, "").slice(0, 6))}
          required
        />
      </div>
      <div>
        <label className="label">Confirm new PIN</label>
        <input
          type="password"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          className="input tracking-widest text-center text-lg"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
          required
        />
      </div>
      {msg && (
        <p className={`text-xs ${msg.type === "ok" ? "text-emerald-700" : "text-red-600"}`}>
          {msg.text}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "Saving…" : hasPin ? "Change PIN" : "Set PIN"}
      </button>
    </form>
  );
}

function EmailSection({ currentEmail }: { currentEmail: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/account/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: password, new_email: newEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "err", text: data.error || "Failed to change email" });
        return;
      }
      setMsg({
        type: "ok",
        text: `Email changed. Use ${newEmail} from your next login.`,
      });
      setPassword("");
      setNewEmail("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-stone-200 p-5 space-y-3">
      <div>
        <label className="label">Current email</label>
        <input className="input bg-stone-50" value={currentEmail} disabled readOnly />
      </div>
      <div>
        <label className="label">New email</label>
        <input
          type="email"
          className="input"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="new@example.com"
          required
        />
      </div>
      <div>
        <label className="label">Current password</label>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <p className="text-[11px] text-stone-500 mt-1">
          Confirms it&apos;s you. The change is applied immediately — log in with the new email next time.
        </p>
      </div>
      {msg && (
        <p className={`text-xs ${msg.type === "ok" ? "text-emerald-700" : "text-red-600"}`}>
          {msg.text}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "Changing…" : "Change email"}
      </button>
    </form>
  );
}
