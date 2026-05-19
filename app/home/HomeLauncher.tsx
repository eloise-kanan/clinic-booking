"use client";

import Link from "next/link";

type Role = "owner" | "nurse" | "doctor";

type Counts = {
  pending: number;
  today: number;
  remindersPending: number;
  pendingLeaves: number;
  pendingShifts: number;
  pastUnmarked: number;
};

type Card = {
  href: string;
  icon: string;
  title: string;
  description: string;
  badge?: number;
  badgeLabel?: string;
  tone?: "default" | "warn" | "info";
};

type Section = {
  title: string;
  cards: Card[];
};

function cardsForRole(role: Role, counts: Counts): Section[] {
  if (role === "doctor") {
    return [
      {
        title: "Today",
        cards: [
          {
            href: "/doctor",
            icon: "📋",
            title: "Today's patients",
            description: "Your appointments scheduled for today, in time order.",
            badge: counts.today,
            badgeLabel: counts.today === 1 ? "appointment" : "appointments",
            tone: "info",
          },
          {
            href: "/doctor/calendar",
            icon: "📅",
            title: "My calendar",
            description: "Week and day view of your own bookings.",
          },
        ],
      },
      {
        title: "My work",
        cards: [
          {
            href: "/doctor/patients",
            icon: "🧑‍⚕️",
            title: "My patients",
            description: "Patients you've treated and their history.",
          },
          {
            href: "/doctor/breaks",
            icon: "🚫",
            title: "Block time",
            description: "Mark lunch, MC, conferences, or any unavailable hours.",
          },
        ],
      },
      {
        title: "Schedule",
        cards: [
          {
            href: "/staff/duty",
            icon: "🔁",
            title: "Shift changes",
            description: "Submit a shift-change request — owner approves.",
          },
          {
            href: "/staff/leave",
            icon: "🏖",
            title: "Leave",
            description: "Submit annual leave or MC. Owner approves.",
          },
          {
            href: "/staff/duty-calendar",
            icon: "📆",
            title: "Duty calendar",
            description: "Who's on duty across the team this week and month.",
          },
        ],
      },
      {
        title: "Account",
        cards: [
          {
            href: "/staff/profile",
            icon: "🔑",
            title: "My account",
            description: "Change password.",
          },
        ],
      },
    ];
  }

  if (role === "owner") {
    return [
      {
        title: "Today",
        cards: [
          {
            href: "/owner",
            icon: "📊",
            title: "Overview",
            description: "This week's bookings, patient stats, repeat rate.",
            badge: counts.today,
            badgeLabel: counts.today === 1 ? "today" : "today",
            tone: "info",
          },
          {
            href: "/owner/utilization",
            icon: "📈",
            title: "Utilization",
            description: "Per-doctor heatmap, where you've got headroom or are full.",
          },
        ],
      },
      {
        title: "Bookings",
        cards: [
          {
            href: "/nurse",
            icon: "⏳",
            title: "Pending approvals",
            description: "New requests waiting for nurse approval.",
            badge: counts.pending,
            badgeLabel: counts.pending === 1 ? "pending" : "pending",
            tone: counts.pending > 0 ? "warn" : "default",
          },
          {
            href: "/owner/bookings",
            icon: "🗂",
            title: "All bookings",
            description: "Filter, sort, search by name or IC. Override any status.",
          },
          {
            href: "/staff/new",
            icon: "➕",
            title: "New booking",
            description: "Book on behalf of a walk-in or phone-in patient.",
          },
          {
            href: "/staff/reminders",
            icon: "🔔",
            title: "Send reminders",
            description: "Tomorrow's confirmed appointments, one-tap WhatsApp.",
            badge: counts.remindersPending,
            badgeLabel: counts.remindersPending === 1 ? "to send" : "to send",
            tone: counts.remindersPending > 0 ? "warn" : "default",
          },
        ],
      },
      {
        title: "Patients & calendars",
        cards: [
          {
            href: "/owner/patients",
            icon: "🧑‍🤝‍🧑",
            title: "Patients",
            description: "Patient list, demographics, visit history.",
          },
          {
            href: "/owner/calendar",
            icon: "🦷",
            title: "Clinical calendar",
            description: "All doctors' bookings, week-by-week.",
          },
          {
            href: "/staff/duty-calendar",
            icon: "📆",
            title: "Duty calendar",
            description: "Who's on duty, who's on leave, who's on custom shift.",
          },
        ],
      },
      {
        title: "Staff & schedule",
        cards: [
          {
            href: "/owner/staff",
            icon: "👥",
            title: "Doctors & nurses",
            description: "Add staff, deactivate, reset passwords.",
          },
          {
            href: "/owner/working-hours",
            icon: "🕘",
            title: "Working hours",
            description: "Configure each doctor's weekly schedule.",
          },
          {
            href: "/staff/duty",
            icon: "🔁",
            title: "Shift changes",
            description: "Approve or reject staff-submitted shift changes.",
            badge: counts.pendingShifts,
            badgeLabel: counts.pendingShifts === 1 ? "request" : "requests",
            tone: counts.pendingShifts > 0 ? "warn" : "default",
          },
          {
            href: "/staff/leave",
            icon: "🏖",
            title: "Leave",
            description: "Approve or reject leave requests.",
            badge: counts.pendingLeaves,
            badgeLabel: counts.pendingLeaves === 1 ? "request" : "requests",
            tone: counts.pendingLeaves > 0 ? "warn" : "default",
          },
        ],
      },
      {
        title: "Settings & control",
        cards: [
          {
            href: "/owner/branding",
            icon: "🎨",
            title: "Branding & theme",
            description: "Colour, logo, font, button shape.",
          },
          {
            href: "/staff/templates",
            icon: "💬",
            title: "WhatsApp templates",
            description: "Customise the 6 message templates.",
          },
          {
            href: "/owner/audit",
            icon: "🛡",
            title: "Audit log",
            description: "Every action, who did it, when.",
          },
        ],
      },
      {
        title: "Account",
        cards: [
          {
            href: "/staff/profile",
            icon: "🔑",
            title: "My account",
            description: "Change password.",
          },
        ],
      },
    ];
  }

  // nurse
  return [
    {
      title: "Today",
      cards: [
        {
          href: "/nurse",
          icon: "⏳",
          title: "Pending approvals",
          description: "Verify with patient via WhatsApp, then approve.",
          badge: counts.pending,
          badgeLabel: counts.pending === 1 ? "pending" : "pending",
          tone: counts.pending > 0 ? "warn" : "default",
        },
        {
          href: "/staff/reminders",
          icon: "🔔",
          title: "Send reminders",
          description: "Tomorrow's confirmed appointments — one-tap WhatsApp.",
          badge: counts.remindersPending,
          badgeLabel: counts.remindersPending === 1 ? "to send" : "to send",
          tone: counts.remindersPending > 0 ? "warn" : "default",
        },
        {
          href: "/nurse/all?quickFilter=past_unmarked",
          icon: "✅",
          title: "Mark attendance",
          description: "Past appointments still without attended / no-show.",
          badge: counts.pastUnmarked,
          badgeLabel: counts.pastUnmarked === 1 ? "to mark" : "to mark",
          tone: counts.pastUnmarked > 0 ? "warn" : "default",
        },
      ],
    },
    {
      title: "Bookings",
      cards: [
        {
          href: "/nurse/all",
          icon: "🗂",
          title: "All bookings",
          description: "Filter, sort, search by name or IC.",
        },
        {
          href: "/staff/new",
          icon: "➕",
          title: "New booking",
          description: "Book on behalf of a walk-in or phone-in patient.",
        },
        {
          href: "/nurse/patients",
          icon: "🧑‍🤝‍🧑",
          title: "Patients",
          description: "Patient list. Search by IC or name.",
        },
      ],
    },
    {
      title: "Calendars",
      cards: [
        {
          href: "/nurse/calendar",
          icon: "🦷",
          title: "Clinical calendar",
          description: "All doctors' bookings, week-by-week.",
        },
        {
          href: "/staff/duty-calendar",
          icon: "📆",
          title: "Duty calendar",
          description: "Who's on duty, on leave, on custom shift.",
        },
      ],
    },
    {
      title: "My schedule",
      cards: [
        {
          href: "/staff/duty",
          icon: "🔁",
          title: "Shift changes",
          description: "Submit a shift change. Owner approves.",
        },
        {
          href: "/staff/leave",
          icon: "🏖",
          title: "Leave",
          description: "Submit a leave request. Owner approves.",
        },
      ],
    },
    {
      title: "Settings",
      cards: [
        {
          href: "/staff/templates",
          icon: "💬",
          title: "WhatsApp templates",
          description: "View and customise message templates.",
        },
        {
          href: "/staff/profile",
          icon: "🔑",
          title: "My account",
          description: "Change password.",
        },
      ],
    },
  ];
}

function CardItem({ card }: { card: Card }) {
  const hasBadge = card.badge !== undefined && card.badge > 0;
  const toneClass =
    card.tone === "warn" && hasBadge
      ? "border-amber-300 bg-amber-50/40"
      : card.tone === "info"
        ? "border-brand bg-brand-50/40"
        : "border-stone-200 bg-white";
  // iPhone-style notification badge — red for action-needed (warn),
  // brand-teal for informational (info), red as a safe default for any
  // other non-zero badge.
  const dotClass =
    card.tone === "info"
      ? "bg-brand text-white"
      : "bg-red-500 text-white";
  const badgeLabel =
    card.badge !== undefined && card.badge > 99 ? "99+" : String(card.badge ?? "");

  return (
    <Link
      href={card.href}
      className={`group relative block p-5 rounded-xl border-2 hover:shadow-md hover:-translate-y-0.5 transition-all ${toneClass}`}
    >
      <div className="relative inline-block mb-3">
        <div className="text-4xl leading-none">{card.icon}</div>
        {hasBadge && (
          <span
            className={`absolute -top-1.5 -right-3 min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center shadow-sm ring-2 ring-white ${dotClass}`}
            aria-label={`${card.badge} ${card.badgeLabel || ""}`.trim()}
          >
            {badgeLabel}
          </span>
        )}
      </div>
      <div className="text-sm font-semibold text-stone-900 mb-1">{card.title}</div>
      <div className="text-xs text-stone-600 leading-snug">{card.description}</div>
      {hasBadge && card.badgeLabel && (
        <div className="text-[11px] text-stone-500 mt-1.5">
          {card.badge} {card.badgeLabel}
        </div>
      )}
    </Link>
  );
}

export default function HomeLauncher({
  role,
  userName,
  clinicName,
  counts,
}: {
  role: Role;
  userName: string;
  clinicName: string;
  counts: Counts;
}) {
  const sections = cardsForRole(role, counts);
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();
  const firstName = userName.split(" ")[0] || userName;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-stone-900">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Welcome to {clinicName}. Pick where to go below — or use the side menu for everything else.
        </p>
      </div>

      {sections.map((section) => (
        <div key={section.title}>
          <h2 className="text-[11px] uppercase tracking-wider font-semibold text-stone-500 mb-2">
            {section.title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {section.cards.map((card) => (
              <CardItem key={card.href} card={card} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
