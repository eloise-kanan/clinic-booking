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
          : "Wrong login ID or password. Ask your owner if you've forgotten."
      );
      return;
    }
    // Replace history (not push) so the back button after sign-in doesn't
    // take the user back to /login — for a kiosk terminal especially, the
    // expectation is that back from /home stays on /home (lockscreen).
    router.replace(next);
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white text-stone-900 rounded-2xl shadow-2xl p-6 space-y-4 backdrop-blur-md"
    >
      <div>
        <label className="label">Login ID or email</label>
        <input
          className="input"
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="terminal — or your login ID / email"
          autoComplete="username"
          required
        />
        <p className="text-[11px] text-stone-500 mt-1">
          Most teams sign in here as <code className="bg-stone-100 px-1 rounded">terminal</code>, then identify themselves with a personal PIN on the console.
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
