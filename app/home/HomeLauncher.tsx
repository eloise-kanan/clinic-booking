"use client";

import Link from "next/link";
import { hasFeature, type FeatureKey, type Plan } from "@/lib/plan";

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
  feature?: FeatureKey;
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
            feature: "calendar.clinical",
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
            feature: "patients",
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
            feature: "staff.shift_changes",
          },
          {
            href: "/staff/leave",
            icon: "🏖",
            title: "Leave",
            description: "Submit annual leave or MC. Owner approves.",
            feature: "staff.leave",
          },
          {
            href: "/staff/duty-calendar",
            icon: "📆",
            title: "Duty calendar",
            description: "Who's on duty across the team this week and month.",
            feature: "calendar.duty",
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
            feature: "analytics.overview",
          },
          {
            href: "/owner/utilization",
            icon: "📈",
            title: "Utilization",
            description: "Per-doctor heatmap, where you've got headroom or are full.",
            feature: "analytics.utilization",
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
            feature: "bookings.pending",
          },
          {
            href: "/owner/bookings",
            icon: "🗂",
            title: "All bookings",
            description: "Filter, sort, search by name or IC. Override any status.",
            feature: "bookings.all",
          },
          {
            href: "/staff/new",
            icon: "➕",
            title: "New booking",
            description: "Book on behalf of a walk-in or phone-in patient.",
            feature: "bookings.new",
          },
          {
            href: "/staff/reminders",
            icon: "🔔",
            title: "Send reminders",
            description: "Tomorrow's confirmed appointments, one-tap WhatsApp.",
            badge: counts.remindersPending,
            badgeLabel: counts.remindersPending === 1 ? "to send" : "to send",
            tone: counts.remindersPending > 0 ? "warn" : "default",
            feature: "bookings.reminders",
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
            feature: "patients",
          },
          {
            href: "/owner/calendar",
            icon: "🦷",
            title: "Clinical calendar",
            description: "All doctors' bookings, week-by-week.",
            feature: "calendar.clinical",
          },
          {
            href: "/staff/duty-calendar",
            icon: "📆",
            title: "Duty calendar",
            description: "Who's on duty, who's on leave, who's on custom shift.",
            feature: "calendar.duty",
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
            feature: "staff.management",
          },
          {
            href: "/owner/working-hours",
            icon: "🕘",
            title: "Working hours",
            description: "Configure each doctor's weekly schedule.",
            feature: "staff.working_hours",
          },
          {
            href: "/staff/duty",
            icon: "🔁",
            title: "Shift changes",
            description: "Approve or reject staff-submitted shift changes.",
            badge: counts.pendingShifts,
            badgeLabel: counts.pendingShifts === 1 ? "request" : "requests",
            tone: counts.pendingShifts > 0 ? "warn" : "default",
            feature: "staff.shift_changes",
          },
          {
            href: "/staff/leave",
            icon: "🏖",
            title: "Leave",
            description: "Approve or reject leave requests.",
            badge: counts.pendingLeaves,
            badgeLabel: counts.pendingLeaves === 1 ? "request" : "requests",
            tone: counts.pendingLeaves > 0 ? "warn" : "default",
            feature: "staff.leave",
          },
        ],
      },
      {
        title: "Settings & control",
        cards: [
          {
            href: "/owner/plan",
            icon: "🎯",
            title: "Plan & tier",
            description: "Switch between Basic / Standard / Pro / Franchise.",
          },
          {
            href: "/owner/branding",
            icon: "🎨",
            title: "Branding & theme",
            description: "Colour, logo, font, button shape.",
            feature: "settings.branding",
          },
          {
            href: "/staff/templates",
            icon: "💬",
            title: "WhatsApp templates",
            description: "Customise the 6 message templates.",
            feature: "settings.templates",
          },
          {
            href: "/owner/backup",
            icon: "💾",
            title: "Backup & export",
            description: "Download patients, bookings, and audit log as CSV.",
            feature: "backup",
          },
          {
            href: "/owner/audit",
            icon: "🛡",
            title: "Audit log",
            description: "Every action, who did it, when.",
            feature: "settings.audit_log",
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
          feature: "bookings.pending",
        },
        {
          href: "/staff/reminders",
          icon: "🔔",
          title: "Send reminders",
          description: "Tomorrow's confirmed appointments — one-tap WhatsApp.",
          badge: counts.remindersPending,
          badgeLabel: counts.remindersPending === 1 ? "to send" : "to send",
          tone: counts.remindersPending > 0 ? "warn" : "default",
          feature: "bookings.reminders",
        },
        {
          href: "/nurse/all?quickFilter=past_unmarked",
          icon: "✅",
          title: "Mark attendance",
          description: "Past appointments still without attended / no-show.",
          badge: counts.pastUnmarked,
          badgeLabel: counts.pastUnmarked === 1 ? "to mark" : "to mark",
          tone: counts.pastUnmarked > 0 ? "warn" : "default",
          feature: "bookings.all",
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
          feature: "bookings.all",
        },
        {
          href: "/staff/new",
          icon: "➕",
          title: "New booking",
          description: "Book on behalf of a walk-in or phone-in patient.",
          feature: "bookings.new",
        },
        {
          href: "/nurse/patients",
          icon: "🧑‍🤝‍🧑",
          title: "Patients",
          description: "Patient list. Search by IC or name.",
          feature: "patients",
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
          feature: "calendar.clinical",
        },
        {
          href: "/staff/duty-calendar",
          icon: "📆",
          title: "Duty calendar",
          description: "Who's on duty, on leave, on custom shift.",
          feature: "calendar.duty",
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
          feature: "staff.shift_changes",
        },
        {
          href: "/staff/leave",
          icon: "🏖",
          title: "Leave",
          description: "Submit a leave request. Owner approves.",
          feature: "staff.leave",
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
          feature: "settings.templates",
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
      className={`group relative block px-3 py-2.5 rounded-lg border hover:shadow-sm hover:border-stone-300 transition-all w-[180px] ${toneClass}`}
    >
      <div className="flex items-start gap-2.5">
        <div className="relative shrink-0">
          <div className="text-xl leading-none">{card.icon}</div>
          {hasBadge && (
            <span
              className={`absolute -top-1 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center shadow-sm ring-2 ring-white ${dotClass}`}
              aria-label={`${card.badge} ${card.badgeLabel || ""}`.trim()}
            >
              {badgeLabel}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-stone-900 leading-tight truncate">{card.title}</div>
          <div className="text-[11px] text-stone-500 leading-snug mt-0.5 line-clamp-2">{card.description}</div>
        </div>
      </div>
    </Link>
  );
}

export default function HomeLauncher({
  role,
  userName,
  clinicName,
  plan,
  counts,
}: {
  role: Role;
  userName: string;
  clinicName: string;
  plan: Plan;
  counts: Counts;
}) {
  // Filter cards by plan tier; drop sections that become empty after filtering.
  const sections = cardsForRole(role, counts)
    .map((s) => ({
      ...s,
      cards: s.cards.filter((c) => !c.feature || hasFeature(plan, c.feature)),
    }))
    .filter((s) => s.cards.length > 0);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();
  const firstName = userName.split(" ")[0] || userName;
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  // OWNER gets a curated summary view focused on what needs their attention
  // (everything else is in the sidebar). Nurses + doctors still see the
  // action-grid below since they navigate from here all day.
  if (role === "owner") {
    return (
      <OwnerSummary
        greeting={greeting}
        firstName={firstName}
        clinicName={clinicName}
        planLabel={planLabel}
        counts={counts}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Slim greeting bar */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-stone-900">
            {greeting}, {firstName}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">{clinicName}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-800 text-[11px] font-medium border border-brand-100">
          {planLabel} plan
        </span>
      </div>

      {/* Action sections — flex-wrap with fixed-width tiles so the last row
          of each section doesn't read as "missing cards". Section header
          has a small theme-accent bar + a count of tiles in that section. */}
      {sections.map((section) => (
        <section key={section.title}>
          <div className="flex items-baseline gap-2 mb-2">
            <span
              className="w-1 h-4 rounded-full"
              style={{ background: "var(--staff-accent, #1B2A4A)" }}
            />
            <h2 className="text-[11px] uppercase tracking-wider font-semibold text-stone-700">
              {section.title}
            </h2>
            <span className="text-[10px] text-stone-400">· {section.cards.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {section.cards.map((card) => (
              <CardItem key={card.href} card={card} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// Owner-only home view — task-oriented summary rather than a duplicate of
// the sidebar. Each panel shows what needs attention + a direct CTA.
function OwnerSummary({
  greeting,
  firstName,
  clinicName,
  planLabel,
  counts,
}: {
  greeting: string;
  firstName: string;
  clinicName: string;
  planLabel: string;
  counts: Counts;
}) {
  const totalAttention =
    counts.pending +
    counts.pendingLeaves +
    counts.pendingShifts +
    counts.remindersPending +
    counts.pastUnmarked;

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-medium tracking-tight text-stone-900">
            {greeting}, {firstName}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            {totalAttention === 0
              ? `Nothing needs your attention at ${clinicName} right now.`
              : `${totalAttention} ${totalAttention === 1 ? "thing" : "things"} need your attention at ${clinicName}.`}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-800 text-[11px] font-medium border border-brand-100">
          {planLabel} plan
        </span>
      </div>

      {/* Needs-decision panels — items where the owner is the actor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SummaryPanel
          accent="amber"
          eyebrow="Needs your decision"
          title={`${counts.pendingLeaves + counts.pendingShifts} HR ${counts.pendingLeaves + counts.pendingShifts === 1 ? "request" : "requests"}`}
          lines={[
            counts.pendingLeaves > 0 ? `${counts.pendingLeaves} leave ${counts.pendingLeaves === 1 ? "request" : "requests"}` : null,
            counts.pendingShifts > 0 ? `${counts.pendingShifts} shift-change ${counts.pendingShifts === 1 ? "request" : "requests"}` : null,
            counts.pendingLeaves + counts.pendingShifts === 0 ? "Nothing pending." : null,
          ].filter(Boolean) as string[]}
          ctas={[
            counts.pendingLeaves > 0
              ? { label: "Review leave", href: "/staff/leave" }
              : null,
            counts.pendingShifts > 0
              ? { label: "Review shifts", href: "/staff/duty" }
              : null,
          ].filter((c): c is { label: string; href: string } => c !== null)}
        />

        <SummaryPanel
          accent="info"
          eyebrow="Today's bookings"
          title={`${counts.today} confirmed`}
          lines={[
            counts.pending > 0 ? `${counts.pending} still pending nurse approval` : null,
            counts.pastUnmarked > 0 ? `${counts.pastUnmarked} past bookings not marked` : null,
            counts.today === 0 && counts.pending === 0 ? "No appointments today." : null,
          ].filter(Boolean) as string[]}
          ctas={[
            { label: "View calendar", href: "/owner/calendar" },
            counts.pending > 0 ? { label: "Pending queue", href: "/nurse" } : null,
          ].filter((c): c is { label: string; href: string } => c !== null)}
        />

        <SummaryPanel
          accent={counts.remindersPending > 0 ? "warn" : "ok"}
          eyebrow="Communications"
          title={
            counts.remindersPending > 0
              ? `${counts.remindersPending} reminders to send`
              : "All reminders sent ✓"
          }
          lines={[
            counts.remindersPending > 0
              ? "Tomorrow's confirmed appointments — patients are waiting."
              : "Nothing to chase right now.",
          ]}
          ctas={
            counts.remindersPending > 0
              ? [{ label: "Send reminders", href: "/staff/reminders" }]
              : []
          }
        />

        <SummaryPanel
          accent="neutral"
          eyebrow="Quick access"
          title="Common tasks"
          lines={[]}
          ctas={[
            { label: "+ New booking", href: "/staff/new" },
            { label: "Patients", href: "/owner/patients" },
            { label: "Overview", href: "/owner" },
          ]}
        />
      </div>
    </div>
  );
}

function SummaryPanel({
  accent,
  eyebrow,
  title,
  lines,
  ctas,
}: {
  accent: "amber" | "info" | "warn" | "ok" | "neutral";
  eyebrow: string;
  title: string;
  lines: string[];
  ctas: { label: string; href: string }[];
}) {
  const eyebrowColor =
    accent === "amber"
      ? "text-amber-700"
      : accent === "warn"
        ? "text-red-700"
        : accent === "info"
          ? "text-blue-700"
          : accent === "ok"
            ? "text-emerald-700"
            : "text-stone-600";
  const dotColor =
    accent === "amber"
      ? "bg-amber-500"
      : accent === "warn"
        ? "bg-red-500"
        : accent === "info"
          ? "bg-blue-500"
          : accent === "ok"
            ? "bg-emerald-500"
            : "bg-stone-400";

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-3">
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          <span className={`text-[10px] uppercase tracking-wider font-medium ${eyebrowColor}`}>
            {eyebrow}
          </span>
        </div>
        <div className="text-base font-semibold text-stone-900 leading-tight">{title}</div>
      </div>
      {lines.length > 0 && (
        <ul className="text-xs text-stone-600 space-y-0.5 leading-snug">
          {lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}
      {ctas.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
          {ctas.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="text-xs px-2.5 py-1 rounded-md border border-stone-300 hover:border-stone-500 hover:bg-stone-50 text-stone-700 transition-colors"
            >
              {c.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
