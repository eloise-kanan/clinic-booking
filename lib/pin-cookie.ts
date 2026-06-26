// Signed cookie used by <PinGate> to grant access to HR / doctor pages on
// the shared clinic terminal. Format:
//   "${profile_id}.${role}.${expires_at_ms}.${hmac}"
// HMAC is SHA-256 over the first three fields using a server secret.
//
// 5-minute TTL, sliding (refreshed on each PinGate render that passes).
// Path-scoped to /, httpOnly, sameSite=lax. Cleared on logout.

import { createHmac } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "kanan_pin_lock";
const TTL_MS = 5 * 60 * 1000;

function secret(): string {
  return (
    process.env.SUPABASE_JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    // Fall back to service-role key — never exposed client-side, so a
    // reasonable HMAC key for this purpose.
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "fallback-not-secure-set-SUPABASE_JWT_SECRET"
  );
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export type PinCookiePayload = {
  profileId: string;
  role: "nurse" | "doctor";
  expiresAt: number;
};

export function encodePinCookie(p: { profileId: string; role: "nurse" | "doctor" }): string {
  const exp = Date.now() + TTL_MS;
  const body = `${p.profileId}.${p.role}.${exp}`;
  return `${body}.${sign(body)}`;
}

export function decodePinCookie(raw: string | undefined): PinCookiePayload | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 4) return null;
  const [profileId, role, expStr, mac] = parts;
  if (role !== "nurse" && role !== "doctor") return null;
  if (sign(`${profileId}.${role}.${expStr}`) !== mac) return null;
  const expiresAt = Number(expStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  return { profileId, role, expiresAt };
}

export async function readPinCookie(): Promise<PinCookiePayload | null> {
  const c = await cookies();
  return decodePinCookie(c.get(COOKIE_NAME)?.value);
}

export async function setPinCookie(p: { profileId: string; role: "nurse" | "doctor" }) {
  const c = await cookies();
  c.set(COOKIE_NAME, encodePinCookie(p), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export async function clearPinCookie() {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}
