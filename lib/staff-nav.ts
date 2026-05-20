// Shared, sectioned navigation for staff pages.
// Each section can have an optional title — items render under it.
// Items can carry an optional `feature` key — when set, they only appear
// for clinics whose plan tier includes that feature.

import { hasFeature, type FeatureKey, type Plan } from "@/lib/plan";
import { loadPlan } from "@/lib/branding-server";

export type NavItem = {
  href: string;
  label: string;
  badge?: number;
  feature?: FeatureKey;
};
export type NavSection = { title?: string; items: NavItem[] };

function filterByPlan(sections: NavSection[], plan: Plan | undefined): NavSection[] {
  if (!plan) return sections;
  return sections
    .map((s) => ({
      ...s,
      items: s.items.filter((it) => !it.feature || hasFeature(plan, it.feature)),
    }))
    .filter((s) => s.items.length > 0);
}

export async function staffNav(role: string, pendingCount = 0): Promise<NavSection[]> {
  const plan = await loadPlan();
  return staffNavSync(role, pendingCount, plan);
}

function staffNavSync(role: string, pendingCount = 0, plan?: Plan): NavSection[] {
  let sections: NavSection[] = [];

  if (role === "doctor") {
    sections = [
      {
        items: [
          { href: "/home", label: "🏠 Home" },
          { href: "/doctor", label: "Today" },
          { href: "/doctor/calendar", label: "My calendar", feature: "calendar.clinical" },
          { href: "/doctor/patients", label: "My patients", feature: "patients" },
        ],
      },
      {
        title: "My schedule",
        items: [
          { href: "/doctor/breaks", label: "Block time" },
          { href: "/staff/duty", label: "Shift changes", feature: "staff.shift_changes" },
          { href: "/staff/leave", label: "Leave", feature: "staff.leave" },
          { href: "/staff/duty-calendar", label: "Duty calendar", feature: "calendar.duty" },
        ],
      },
      {
        title: "Account",
        items: [{ href: "/staff/profile", label: "My account" }],
      },
    ];
  } else if (role === "owner") {
    sections = [
      {
        items: [
          { href: "/home", label: "🏠 Home" },
          { href: "/owner", label: "Overview", feature: "analytics.overview" },
          { href: "/owner/utilization", label: "Utilization", feature: "analytics.utilization" },
        ],
      },
      {
        title: "Bookings",
        items: [
          { href: "/owner/bookings", label: "All bookings", feature: "bookings.all" },
          { href: "/staff/new", label: "New booking", feature: "bookings.new" },
          { href: "/staff/reminders", label: "Send reminders", feature: "bookings.reminders" },
          { href: "/owner/patients", label: "Patients", feature: "patients" },
        ],
      },
      {
        title: "Calendars",
        items: [
          { href: "/owner/calendar", label: "Clinical calendar", feature: "calendar.clinical" },
          { href: "/staff/duty-calendar", label: "Duty calendar", feature: "calendar.duty" },
        ],
      },
      {
        title: "Staff",
        items: [
          { href: "/owner/staff", label: "Doctors & nurses", feature: "staff.management" },
          { href: "/owner/working-hours", label: "Working hours", feature: "staff.working_hours" },
          { href: "/staff/duty", label: "Shift changes", feature: "staff.shift_changes" },
          { href: "/staff/leave", label: "Leave", feature: "staff.leave" },
        ],
      },
      {
        title: "Settings",
        items: [
          { href: "/owner/plan", label: "Plan & tier" },
          { href: "/owner/branding", label: "Branding & theme", feature: "settings.branding" },
          { href: "/staff/templates", label: "WhatsApp templates", feature: "settings.templates" },
          { href: "/owner/backup", label: "Backup & export", feature: "backup" },
          { href: "/owner/audit", label: "Audit log", feature: "settings.audit_log" },
        ],
      },
      {
        title: "Account",
        items: [{ href: "/staff/profile", label: "My account" }],
      },
    ];
  } else {
    // nurse
    sections = [
      {
        items: [{ href: "/home", label: "🏠 Home" }],
      },
      {
        title: "Bookings",
        items: [
          { href: "/nurse", label: "Pending", badge: pendingCount, feature: "bookings.pending" },
          { href: "/nurse/all", label: "All bookings", feature: "bookings.all" },
          { href: "/staff/new", label: "New booking", feature: "bookings.new" },
          { href: "/staff/reminders", label: "Send reminders", feature: "bookings.reminders" },
          { href: "/nurse/patients", label: "Patients", feature: "patients" },
        ],
      },
      {
        title: "Calendars",
        items: [
          { href: "/nurse/calendar", label: "Clinical calendar", feature: "calendar.clinical" },
          { href: "/staff/duty-calendar", label: "Duty calendar", feature: "calendar.duty" },
        ],
      },
      {
        title: "My schedule",
        items: [
          { href: "/staff/duty", label: "Shift changes", feature: "staff.shift_changes" },
          { href: "/staff/leave", label: "Leave", feature: "staff.leave" },
        ],
      },
      {
        title: "Settings",
        items: [
          { href: "/staff/templates", label: "WhatsApp templates", feature: "settings.templates" },
        ],
      },
      {
        title: "Account",
        items: [{ href: "/staff/profile", label: "My account" }],
      },
    ];
  }

  return filterByPlan(sections, plan);
}
