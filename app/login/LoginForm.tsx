"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { resolveAuthEmail, isEmail } from "@/lib/login-id";

export default function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/home";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    // Staff enter their employee number (e.g. "1001"); owner enters their email.
    // resolveAuthEmail handles either case.
    const authEmail = resolveAuthEmail(identifier);
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
    setLoading(false);
    if (error) {
      setError(
        isEmail(identifier)
          ? error.message
          : "Wrong employee number or password. Ask your owner if you've forgotten."
      );
      return;
    }
    router.push(next);
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
      <div>
        <label className="label">Employee number or owner email</label>
        <input
          className="input"
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="1001 — or your email"
          autoComplete="username"
          required
        />
        <p className="text-[11px] text-stone-500 mt-1">
          Staff: enter the employee number your clinic owner assigned you. Owner: enter your email.
        </p>
      </div>
      <div>
        <label className="label">Password</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
