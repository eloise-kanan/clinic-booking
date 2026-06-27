// Plan tier definitions, feature gating, and seat caps.
//
// Tiers (since 2026-06-14):
//   standard    — booking-first single clinic, capped at 2 doctors + 3 nurses
//   premium     — adds analytics, internal reviews, nurse duty calendar,
//                 capped at 4 doctors + 6 nurses
//   franchise   — multi-branch (parked; not for sale yet)
//
// Feature gating is *soft* — UI hides items the clinic isn't paying for, but
// direct URL access still works. The seat caps below ARE enforced server-side
// in /api/staff (POST) so the owner can't over-provision their plan.

export type Plan = "standard" | "premium" | "franchise";

export const PLAN_ORDER: Record<Plan, number> = {
  standard: 0,
  premium: 1,
  franchise: 2,
};

export const PLAN_LABELS: Record<Plan, string> = {
  standard: "Standard",
  premium: "Premium",
  franchise: "Franchise",
};

export const PLAN_DESCRIPTIONS: Record<Plan, string> = {
  standard:
    "Online bookings, WhatsApp comms, recall, duty calendar (doctors), and the daily ops your clinic actually needs. Up to 2 doctors + 3 nurses.",
  premium:
    "Adds owner-side analytics across clinic / doctors / nurses, full duty calendar (incl. nurses), internal review system, audit log. Up to 4 doctors + 6 nurses.",
  franchise:
    "Cross-branch dashboard, patient transfer, central management. For when you run multiple clinics like one. (Not yet released.)",
};

// Hard per-role seat caps. Owner is always 1 (the buyer). Top-ups happen
// out-of-band via WhatsApp to the founder — there's no self-serve upgrade
// path yet, and that's intentional for now.
export const SEAT_CAPS: Record<Plan, { owner: number; doctor: number; nurse: number }> = {
  standard:  { owner: 1, doctor: 2, nurse: 3 },
  premium:   { owner: 1, doctor: 4, nurse: 6 },
  franchise: { owner: 1, doctor: 999, nurse: 999 },
};

export type StaffRole = "owner" | "doctor" | "nurse";

// Whether a new staff of `role` can be added given the current active counts.
export function seatAvailable(
  plan: Plan,
  role: StaffRole,
  currentCount: number
): { ok: true } | { ok: false; cap: number } {
  const cap = SEAT_CAPS[plan][role];
  return currentCount < cap ? { ok: true } : { ok: false, cap };
}

// Every distinct feature in the system, mapped to the minimum plan
// that includes it. Order in the type union mirrors the tier they sit in.
export type FeatureKey =
  // Standard — included with the base subscription
  | "bookings.pending"
  | "bookings.all"
  | "bookings.new"
  | "bookings.reminders"
  | "patients"
  | "calendar.clinical"
  | "calendar.duty"
  | "settings.templates"
  | "settings.branding"
  | "staff.management"
  | "staff.working_hours"
  | "staff.shift_changes"
  | "staff.leave"
  | "backup"
  | "recall"
  | "analytics.overview"
  // Premium — management / insight layer
  | "calendar.duty.nurse"
  | "analytics.doctor_perf"
  | "analytics.nurse_perf"
  | "analytics.utilization"
  | "settings.audit_log"
  | "compliance"
  | "review"
  | "google_review_prompt"
  | "payroll"
  | "commission"
  | "rooms"                  // in-clinic check-in / check-out + room assignment
  | "doctor_profiles"        // patient-facing doctor cards (expertise + rating)
  // Franchise
  | "multi_branch";

export const FEATURE_REQUIRES: Record<FeatureKey, Plan> = {
  // Standard
  "bookings.pending": "standard",
  "bookings.all": "standard",
  "bookings.new": "standard",
  "bookings.reminders": "standard",
  "patients": "standard",
  "calendar.clinical": "standard",
  "calendar.duty": "standard",
  "settings.templates": "standard",
  "settings.branding": "standard",
  "staff.management": "standard",
  "staff.working_hours": "standard",
  "staff.shift_changes": "standard",
  "staff.leave": "standard",
  "backup": "standard",
  "recall": "standard",

  // Premium — entire analytics surface is Premium-only (Standard tier is
  // booking-ops focused; no Overview, no Utilization, no per-role perf).
  "analytics.overview": "premium",
  "calendar.duty.nurse": "premium",
  "analytics.doctor_perf": "premium",
  "analytics.nurse_perf": "premium",
  "analytics.utilization": "premium",
  "settings.audit_log": "premium",
  "compliance": "premium",
  "review": "premium",
  "google_review_prompt": "premium",
  "payroll": "premium",
  "commission": "premium",
  "rooms": "premium",
  "doctor_profiles": "premium",

  // Franchise
  "multi_branch": "franchise",
};

export function hasFeature(plan: Plan, feature: FeatureKey): boolean {
  return PLAN_ORDER[plan] >= PLAN_ORDER[FEATURE_REQUIRES[feature]];
}
