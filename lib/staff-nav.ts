// Shared, sectioned navigation for staff pages.
// Each section can have an optional title — items render under it.

export type NavItem = { href: string; label: string; badge?: number };
export type NavSection = { title?: string; items: NavItem[] };

export function staffNav(role: string, pendingCount = 0): NavSection[] {
  if (role === "doctor") {
    return [
      {
        items: [
          { href: "/home", label: "🏠 Home" },
          { href: "/doctor", label: "Today" },
          { href: "/doctor/calendar", label: "My calendar" },
          { href: "/doctor/patients", label: "My patients" },
        ],
      },
      {
        title: "My schedule",
        items: [
          { href: "/doctor/breaks", label: "Block time" },
          { href: "/staff/duty", label: "Shift changes" },
          { href: "/staff/leave", label: "Leave" },
          { href: "/staff/duty-calendar", label: "Duty calendar" },
        ],
      },
      {
        title: "Account",
        items: [{ href: "/staff/profile", label: "My account" }],
      },
    ];
  }
  // owner + nurse share the bookings/calendars/staff sections; differences below.
  if (role === "owner") {
    return [
      {
        items: [
          { href: "/home", label: "🏠 Home" },
          { href: "/owner", label: "Overview" },
          { href: "/owner/utilization", label: "Utilization" },
        ],
      },
      {
        title: "Bookings",
        items: [
          { href: "/owner/bookings", label: "All bookings" },
          { href: "/staff/new", label: "New booking" },
          { href: "/staff/reminders", label: "Send reminders" },
          { href: "/owner/patients", label: "Patients" },
        ],
      },
      {
        title: "Calendars",
        items: [
          { href: "/owner/calendar", label: "Clinical calendar" },
          { href: "/staff/duty-calendar", label: "Duty calendar" },
        ],
      },
      {
        title: "Staff",
        items: [
          { href: "/owner/staff", label: "Doctors & nurses" },
          { href: "/owner/working-hours", label: "Working hours" },
          { href: "/staff/duty", label: "Shift changes" },
          { href: "/staff/leave", label: "Leave" },
        ],
      },
      {
        title: "Settings",
        items: [
          { href: "/owner/branding", label: "Branding & theme" },
          { href: "/staff/templates", label: "WhatsApp templates" },
          { href: "/owner/audit", label: "Audit log" },
        ],
      },
      {
        title: "Account",
        items: [{ href: "/staff/profile", label: "My account" }],
      },
    ];
  }
  // nurse
  return [
    {
      items: [
        { href: "/home", label: "🏠 Home" },
      ],
    },
    {
      title: "Bookings",
      items: [
        { href: "/nurse", label: "Pending", badge: pendingCount },
        { href: "/nurse/all", label: "All bookings" },
        { href: "/staff/new", label: "New booking" },
        { href: "/staff/reminders", label: "Send reminders" },
        { href: "/nurse/patients", label: "Patients" },
      ],
    },
    {
      title: "Calendars",
      items: [
        { href: "/nurse/calendar", label: "Clinical calendar" },
        { href: "/staff/duty-calendar", label: "Duty calendar" },
      ],
    },
    {
      title: "My schedule",
      items: [
        { href: "/staff/duty", label: "Shift changes" },
        { href: "/staff/leave", label: "Leave" },
      ],
    },
    {
      title: "Settings",
      items: [
        { href: "/staff/templates", label: "WhatsApp templates" },
      ],
    },
    {
      title: "Account",
      items: [{ href: "/staff/profile", label: "My account" }],
    },
  ];
}
