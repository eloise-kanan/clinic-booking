// Plan tier definitions and feature gating helpers.
//
// Each feature has a minimum plan that includes it. If the clinic is on a plan
// at or above that minimum, the feature is visible. Otherwise it's hidden from
// nav and home cards. This is *soft* gating — direct URL access still works,
// since hiding is a UX hint, not an authorization boundary.

export type Plan = "basic" | "standard" | "pro" | "franchise";

export const PLAN_ORDER: Record<Plan, number> = {
  basic: 0,
  standard: 1,
  pro: 2,
  franchise: 3,
};

export const PLAN_LABELS: Record<Plan, string> = {
  basic: "Basic",
  standard: "Standard",
  pro: "Pro",
  franchise: "Franchise",
};

export const PLAN_DESCRIPTIONS: Record<Plan, string> = {
  basic:
    "Bookings, attendance, WhatsApp templates, mobile app. The DoctorPartner sidekick.",
  standard:
    "Adds multi-doctor working hours, leave, shift changes, duty calendar, audit log, branding, backup. Run your clinic, not your spreadsheets.",
  pro:
    "Adds analytics, utilization heatmap, payroll, locum. Manage like a real business.",
  franchise:
    "Adds cross-branch dashboard, royalty tracking, patient transfer. Run multiple clinics like one.",
};

// Every distinct feature in the system, mapped to the minimum plan
// that includes it.
export type FeatureKey =
  // Always-on (Basic tier)
  | "bookings.pending"
  | "bookings.all"
  | "bookings.new"
  | "bookings.reminders"
  | "patients"
  | "calendar.clinical"
  | "settings.templates"
  | "settings.branding"
  | "analytics.overview"
  | "staff.management"
  // Standard
  | "calendar.duty"
  | "staff.working_hours"
  | "staff.shift_changes"
  | "staff.leave"
  | "settings.audit_log"
  | "backup"
  // Standard (planned features, gated even though not built yet)
  | "compliance"
  | "recall"
  | "commission"
  // Pro
  | "analytics.utilization"
  | "payroll"
  // Franchise
  | "multi_branch";

export const FEATURE_REQUIRES: Record<FeatureKey, Plan> = {
  // Basic
  "bookings.pending": "basic",
  "bookings.all": "basic",
  "bookings.new": "basic",
  "bookings.reminders": "basic",
  "patients": "basic",
  "calendar.clinical": "basic",
  "settings.templates": "basic",
  "settings.branding": "basic",
  "analytics.overview": "basic",
  "staff.management": "basic",

  // Standard
  "calendar.duty": "standard",
  "staff.working_hours": "standard",
  "staff.shift_changes": "standard",
  "staff.leave": "standard",
  "settings.audit_log": "standard",
  "backup": "standard",
  "compliance": "standard",
  "recall": "standard",
  "commission": "standard",

  // Pro
  "analytics.utilization": "pro",
  "payroll": "pro",

  // Franchise
  "multi_branch": "franchise",
};

export function hasFeature(plan: Plan, feature: FeatureKey): boolean {
  return PLAN_ORDER[plan] >= PLAN_ORDER[FEATURE_REQUIRES[feature]];
}
