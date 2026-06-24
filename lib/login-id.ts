// Staff log in by clinic-issued employee number, not email.
// Supabase Auth needs an email to key on, so we synthesize one per staff:
//   employee number "1001" → auth email "1001@kanan-clinic.local"
// Staff never type or see this; they only ever see/type the bare employee number.
// Owners keep their real email-based login (so they can self-serve password reset
// via email — staff password resets are owner-initiated via /owner/staff).

export const SYNTH_DOMAIN = "kanan-clinic.local";

export function isEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

// Convert "1001" or "drlee" into the Supabase Auth email key.
// Owner sign-in: input is already an email → passes through unchanged.
// Staff sign-in: input is an employee number → synthesize @kanan-clinic.local.
export function resolveAuthEmail(input: string): string {
  const trimmed = input.trim();
  if (isEmail(trimmed)) return trimmed;
  return `${trimmed.toLowerCase()}@${SYNTH_DOMAIN}`;
}

// Owner-side check: is this email a synthetic staff one?
export function isSyntheticStaffEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith(`@${SYNTH_DOMAIN}`);
}

// Pull the employee number out of a synthetic email (for display).
export function employeeNumberFromEmail(email: string): string | null {
  if (!isSyntheticStaffEmail(email)) return null;
  return email.split("@")[0];
}

// Validate an employee number before save.
// Rules: 3–20 chars, lowercase a-z + digits + dots/dashes, no leading/trailing dot.
const EMP_PATTERN = /^[a-z0-9](?:[a-z0-9.-]{1,18}[a-z0-9])?$/;
export function isValidEmployeeNumber(s: string): boolean {
  return EMP_PATTERN.test(s);
}
