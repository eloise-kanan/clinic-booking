// Staff log in by a name-derived login ID, not email.
// Supabase Auth needs an email to key on, so we synthesize one per staff:
//   login_id "tan_ming" → auth email "tan_ming@kanan-clinic.local"
// Staff never type or see this; they only ever see/type the bare login ID.
// Owners keep their real email-based login (so they can self-serve password
// reset via email — staff password resets are owner-initiated via /owner/staff).

export const SYNTH_DOMAIN = "kanan-clinic.local";

export function isEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

// Convert "tan_ming" or "drlee" into the Supabase Auth email key.
// Owner sign-in: input is already an email → passes through unchanged.
// Staff sign-in: input is a login ID → synthesize @kanan-clinic.local.
export function resolveAuthEmail(input: string): string {
  const trimmed = input.trim();
  if (isEmail(trimmed)) return trimmed;
  return `${trimmed.toLowerCase()}@${SYNTH_DOMAIN}`;
}

// Owner-side check: is this email a synthetic staff one?
export function isSyntheticStaffEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith(`@${SYNTH_DOMAIN}`);
}

// Pull the login ID out of a synthetic email (for display).
export function loginIdFromEmail(email: string): string | null {
  if (!isSyntheticStaffEmail(email)) return null;
  return email.split("@")[0];
}

// Validate a login ID before save: 3–30 chars, lowercase a-z + digits + dots
// + dashes + underscores, no leading/trailing punctuation.
const LOGIN_ID_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$/;
export function isValidLoginId(s: string): boolean {
  return LOGIN_ID_PATTERN.test(s);
}

// ─── Derive a login ID from a staff member's full name ──────────────────
//
// Algorithm:
//   1. Strip leading titles (Dr, Mr, Mrs, Ms, Cik, Encik, Puan, Tuan, Dato')
//   2. Check for particles in the middle: bin / binti / a/l / a/p
//        • If found → split at the particle: words on left = "given side",
//          words on right = "family side"; particle is dropped
//        • If absent → assume Chinese family-first ordering, so the first
//          word is the family name and everything after is the given name
//   3. Lowercase + join each side WITHOUT spaces or punctuation
//   4. Output: "{given side}_{family side}"
//
// Examples (validated against user-provided spec):
//   "Tan Wei Ming"                          → weiming_tan
//   "Dr. Lee Chee Hong"                     → cheehong_lee
//   "Norhaiza Binti Ismail"                 → norhaiza_ismail
//   "Muhammad Daniel bin Muhammad Ismail"   → muhammaddaniel_muhammadismail
//   "Rajesh A/L Subramaniam"                → rajesh_subramaniam
//   "Ahmad Faizal Bin Razak"                → ahmadfaizal_razak
//   "Devi A/P Krishnan"                     → devi_krishnan
//
// Edge cases:
//   • A 2-word name with no particle uses Chinese-rule (first = family).
//     If that's wrong (e.g. "Aaron Cheong" where Aaron is the given name),
//     the owner edits the suggestion in the form before saving.
//   • Single-word names pass through ("Aaron" → "aaron").

const TITLE_RE = /^(dato['’]?|tuan|puan|encik|cik|dr|dra|prof|mr|mrs|ms|hj|hjh)\.?\s+/i;
const PARTICLE_SPLIT_RE = /\s+(bin|binti|a\/l|a\/p)\s+/i;

function joinPart(part: string): string {
  return part.toLowerCase().split(/\s+/).filter(Boolean).join("");
}

export function fullNameToLoginId(fullName: string): string {
  let s = fullName.trim();
  // Strip titles (may stack: "Dr. Hj. ...")
  while (TITLE_RE.test(s)) s = s.replace(TITLE_RE, "");

  // If a particle is present, use it as the explicit family/given split point.
  const match = s.match(PARTICLE_SPLIT_RE);
  if (match && match.index !== undefined) {
    const given = joinPart(s.slice(0, match.index));
    const family = joinPart(s.slice(match.index + match[0].length));
    if (!given || !family) return joinPart(s);
    return `${given}_${family}`;
  }

  // No particle — assume Chinese family-first.
  const words = s.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0];
  const family = words[0];
  const given = words.slice(1).join("");
  return `${given}_${family}`;
}
