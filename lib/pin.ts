// Per-staff PIN auth used in clinic-terminal mode.
//
// Threat model:
//   • The shared terminal account is password-authenticated (Supabase Auth).
//   • The terminal is at the clinic's physical reception — trusted location.
//   • PINs identify which staff member did each action (audit) and gate
//     access to HR / doctor pages.
//   • PINs are 6 digits → only 1,000,000 possibilities. Brute force is
//     mitigated by per-profile lockout after 3 failed attempts (5 minutes).
//
// Owners do NOT use PINs — they sign in with their email + password and
// have full access without further challenges. Doctor users on their
// PERSONAL devices keep their full login_id+password auth — PIN is a
// shared-terminal convenience, not a replacement for password auth.

import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase-admin";

const PIN_LENGTH = 6;
const BCRYPT_ROUNDS = 10;
const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 5;

export function isValidPinFormat(pin: string): boolean {
  return typeof pin === "string" && new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

export async function hashPin(pin: string): Promise<string> {
  if (!isValidPinFormat(pin)) {
    throw new Error(`PIN must be exactly ${PIN_LENGTH} digits`);
  }
  return bcrypt.hash(pin, BCRYPT_ROUNDS);
}

export type PinVerifyResult =
  | { ok: true; profileId: string }
  | { ok: false; reason: "no_pin_set" | "wrong_pin" | "locked"; lockedUntil?: string };

// Verify a PIN for a specific profile. Increments failure counter on miss,
// resets it on success. Returns either a success with the profile_id (the
// caller can attribute audit-log entries to this identity) or a typed reason.
export async function verifyPin(profileId: string, pin: string): Promise<PinVerifyResult> {
  if (!isValidPinFormat(pin)) return { ok: false, reason: "wrong_pin" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, pin_hash, pin_failed_attempts, pin_locked_until")
    .eq("id", profileId)
    .single();

  if (!profile || !profile.pin_hash) return { ok: false, reason: "no_pin_set" };

  // Locked out window?
  if (profile.pin_locked_until && new Date(profile.pin_locked_until) > new Date()) {
    return { ok: false, reason: "locked", lockedUntil: profile.pin_locked_until };
  }

  const match = await bcrypt.compare(pin, profile.pin_hash);
  if (!match) {
    const attempts = (profile.pin_failed_attempts || 0) + 1;
    const updates: Record<string, unknown> = { pin_failed_attempts: attempts };
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60_000);
      updates.pin_locked_until = lockUntil.toISOString();
    }
    await admin.from("profiles").update(updates).eq("id", profileId);
    return attempts >= MAX_FAILED_ATTEMPTS
      ? {
          ok: false,
          reason: "locked",
          lockedUntil: (updates.pin_locked_until as string) ?? undefined,
        }
      : { ok: false, reason: "wrong_pin" };
  }

  // Success — clear counters
  if (profile.pin_failed_attempts > 0 || profile.pin_locked_until) {
    await admin
      .from("profiles")
      .update({ pin_failed_attempts: 0, pin_locked_until: null })
      .eq("id", profileId);
  }
  return { ok: true, profileId: profile.id };
}

// Returns true if the auth user is signed in as the shared terminal account
// (role = 'terminal'). The login form auto-resolves a bare "terminal"
// identifier to terminal@kanan-clinic.local under our existing synthesizer.
export async function isTerminalSession(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role === "terminal";
}

// Used by write API routes to resolve the *acting* profile when the request
// is made from a terminal session.
//
// Returns:
//   • If the signed-in user is NOT a terminal session (nurse/doctor/owner
//     on a personal device) → returns { actorId: <user.id> } so the action
//     gets attributed to that user. No PIN required.
//   • If the signed-in user IS the terminal account → validates the
//     supplied pin_profile_id + pin in the body. On success, the action is
//     attributed to the PIN holder. On miss → returns an Error response
//     the route can short-circuit on.
//
// The pin_profile_id + pin are expected at the top level of the request
// body. Write routes call this helper before any side effects.
export type PinActor =
  | { ok: true; actorId: string; isTerminal: boolean }
  | { ok: false; status: number; error: string };

export async function resolveActor(
  userId: string,
  body: { pin_profile_id?: string; pin?: string }
): Promise<PinActor> {
  const isTerminal = await isTerminalSession(userId);
  if (!isTerminal) {
    // Personal device — the auth user is the actor.
    return { ok: true, actorId: userId, isTerminal: false };
  }
  if (!body.pin_profile_id || !body.pin) {
    return { ok: false, status: 401, error: "PIN required for this action on the shared clinic terminal." };
  }
  const result = await verifyPin(body.pin_profile_id, body.pin);
  if (!result.ok) {
    const error =
      result.reason === "locked"
        ? "Too many wrong PIN attempts — locked. Try again in a few minutes."
        : result.reason === "no_pin_set"
          ? "That staff member has no PIN set yet. Ask the owner."
          : "Wrong PIN.";
    return { ok: false, status: result.reason === "locked" ? 423 : 403, error };
  }
  return { ok: true, actorId: result.profileId, isTerminal: true };
}
