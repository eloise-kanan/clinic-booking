// Shared, sectioned navigation for staff pages.
// The sidebar is now structured as: top-level items (Home, Overview)
// + 3 expandable sections (Bookings, Calendar, Settings) that behave
// like an accordion — only one section open at a time.

import { hasFeature, type FeatureKey, type Plan } from "@/lib/plan";
import { loadPlan } from "@/lib/branding-server";

export type NavItem = {
  href: string;
  label: string;
  badge?: number;
  feature?: FeatureKey;
};
export type NavSection = {
  title?: string;
  items: NavItem[];
  expandable?: boolean;
};

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
      // Top-level (always visible)
      {
        items: [{ href: "/home", label: "🏠 Home" }],
      },
      // Expandable: Bookings
      {
        title: "Bookings",
        expandable: true,
        items: [
          { href: "/doctor", label: "Today" },
          { href: "/doctor/patients", label: "My patients", feature: "patients" },
        ],
      },
      // Expandable: Calendar
      {
        title: "Calendar",
        expandable: true,
        items: [
          { href: "/doctor/calendar", label: "My calendar", feature: "calendar.clinical" },
          { href: "/staff/duty-calendar", label: "Duty calendar", feature: "calendar.duty" },
          { href: "/doctor/breaks", label: "Block time" },
        ],
      },
      // Expandable: Settings
      {
        title: "Settings",
        expandable: true,
        items: [
          { href: "/staff/duty", label: "Shift changes", feature: "staff.shift_changes" },
          { href: "/staff/leave", label: "Leave", feature: "staff.leave" },
          { href: "/staff/profile", label: "My account" },
        ],
      },
    ];
  } else if (role === "owner") {
    sections = [
      // Top-level
      {
        items: [
          { href: "/home", label: "🏠 Home" },
          { href: "/owner", label: "📊 Overview", feature: "analytics.overview" },
        ],
      },
      // Expandable: Bookings (includes patients + WhatsApp templates)
      {
        title: "Bookings",
        expandable: true,
        items: [
          { href: "/owner/bookings", label: "All bookings", feature: "bookings.all" },
          { href: "/staff/new", label: "New booking", feature: "bookings.new" },
          { href: "/staff/reminders", label: "Send reminders", feature: "bookings.reminders" },
          { href: "/staff/recalls", label: "Send recalls", feature: "recall" },
          { href: "/owner/patients", label: "Patients", feature: "patients" },
          { href: "/staff/templates", label: "WhatsApp templates", feature: "settings.templates" },
        ],
      },
      // Expandable: Calendar (schedules — view, not configure)
      {
        title: "Calendar",
        expandable: true,
        items: [
          { href: "/owner/calendar", label: "Clinical calendar", feature: "calendar.clinical" },
          { href: "/staff/duty-calendar", label: "Duty calendar", feature: "calendar.duty" },
          { href: "/owner/utilization", label: "Utilization", feature: "analytics.utilization" },
        ],
      },
      // Expandable: Staff (everything about managing doctors + nurses —
      // accounts, hours, approvals)
      {
        title: "Staff",
        expandable: true,
        items: [
          { href: "/owner/staff", label: "Doctors & nurses", feature: "staff.management" },
          { href: "/owner/working-hours", label: "Working hours", feature: "staff.working_hours" },
          { href: "/staff/duty", label: "Shift changes", feature: "staff.shift_changes" },
          { href: "/staff/leave", label: "Leave", feature: "staff.leave" },
        ],
      },
      // Expandable: Settings (clinic-level configuration — non-staff)
      {
        title: "Settings",
        expandable: true,
        items: [
          { href: "/staff/profile", label: "My account" },
          { href: "/owner/plan", label: "Plan & tier" },
          { href: "/owner/branding", label: "Branding & theme", feature: "settings.branding" },
          { href: "/owner/backup", label: "Backup & export", feature: "backup" },
          { href: "/owner/audit", label: "Audit log", feature: "settings.audit_log" },
        ],
      },
    ];
  } else {
    // nurse
    sections = [
      // Top-level
      {
        items: [{ href: "/home", label: "🏠 Home" }],
      },
      // Expandable: Bookings (includes patients + WhatsApp templates)
      {
        title: "Bookings",
        expandable: true,
        items: [
          { href: "/nurse", label: "Pending", badge: pendingCount, feature: "bookings.pending" },
          { href: "/nurse/all", label: "All bookings", feature: "bookings.all" },
          { href: "/staff/new", label: "New booking", feature: "bookings.new" },
          { href: "/staff/reminders", label: "Send reminders", feature: "bookings.reminders" },
          { href: "/staff/recalls", label: "Send recalls", feature: "recall" },
          { href: "/nurse/patients", label: "Patients", feature: "patients" },
          { href: "/staff/templates", label: "WhatsApp templates", feature: "settings.templates" },
        ],
      },
      // Expandable: Calendar
      {
        title: "Calendar",
        expandable: true,
        items: [
          { href: "/nurse/calendar", label: "Clinical calendar", feature: "calendar.clinical" },
          { href: "/staff/duty-calendar", label: "Duty calendar", feature: "calendar.duty" },
        ],
      },
      // Expandable: Settings
      {
        title: "Settings",
        expandable: true,
        items: [
          { href: "/staff/profile", label: "My account" },
          { href: "/staff/duty", label: "Shift changes", feature: "staff.shift_changes" },
          { href: "/staff/leave", label: "Leave", feature: "staff.leave" },
        ],
      },
    ];
  }

  return filterByPlan(sections, plan);
}
