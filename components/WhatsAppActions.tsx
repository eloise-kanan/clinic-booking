"use client";

import { applyTemplate, bookingVars, formatSlotLabel, waLink } from "@/lib/utils";
import { logWaSent, type WaKind } from "@/lib/wa-track";

type Booking = {
  id: string;
  type: "booking" | "reschedule" | "cancellation" | string;
  status: string;
  slot_start: string;
  slot_end: string;
  visit_reason: string | null;
};
type Patient = { full_name: string; whatsapp_number: string };
type Doctor = { display_name: string };

const FALLBACK: Record<string, string> = {
  check:
    "Hi {patient_name}, this is {clinic_name}. We received your appointment request:\n• Doctor: {doctor_name}\n• Date & time: {slot_label}\n• Reason: {visit_reason}\n\nCould you please confirm this is correct?",
  confirm_booking:
    "Hi {patient_name}, your appointment is confirmed:\n• Doctor: {doctor_name}\n• Date & time: {slot_label}\n\nPlease arrive 10 minutes early.\n— {clinic_name}",
  confirm_reschedule:
    "Hi {patient_name}, your appointment has been rescheduled:\n• Doctor: {doctor_name}\n• New date & time: {slot_label}\n\n— {clinic_name}",
  confirm_cancellation:
    "Hi {patient_name}, your appointment has been cancelled. We hope to see you again soon.\n— {clinic_name}",
  reject:
    "Hi {patient_name}, unfortunately we are unable to confirm your appointment request for {slot_label} with {doctor_name}.\n— {clinic_name}",
};

function build(
  templates: Record<string, string> | undefined,
  key: string,
  vars: Record<string, string>
): string {
  const body = (templates && templates[key]) || FALLBACK[key] || "";
  return applyTemplate(body, vars);
}

// Single component for ALL patient-facing WhatsApp messaging on a booking.
// Includes status-specific messages (check / confirmation / cancellation /
// rejection) AND the reminder action — previously the reminder lived in a
// separate "Comms" group under Actions, which split related buttons across
// two columns and confused users. Sent pills render at the bottom.
//
// The reminder button uses an onClick callback instead of a direct WA link
// because reminder dispatch is owned by the parent table (it has to log to
// the bookings.reminder_sent_at column after the WA window opens).
export function WhatsAppActions({
  booking,
  patient,
  doctor,
  clinicName,
  templates,
  isPast,
  attended,
  noShow,
  onSendReminder,
}: {
  booking: Booking & {
    reminder_sent_at?: string | null;
  };
  patient: Patient | null;
  doctor: Doctor | null;
  clinicName: string;
  templates?: Record<string, string>;
  isPast?: boolean;
  attended?: boolean;
  noShow?: boolean;
  onSendReminder?: () => void;
}) {
  if (!patient || !patient.whatsapp_number) {
    return <span className="text-[11px] text-stone-400 italic">No WhatsApp number</span>;
  }

  const slotLabel = formatSlotLabel(booking.slot_start, booking.slot_end);
  const vars = bookingVars({
    patient_name: patient.full_name,
    doctor_name: doctor?.display_name || "the doctor",
    slot_label: slotLabel,
    visit_reason: booking.visit_reason || "",
    clinic_name: clinicName,
  });

  type Item =
    | { kind: "link"; label: string; href: string; tone: "primary" | "ghost"; wakind: WaKind | null; title?: string }
    | { kind: "action"; label: string; tone: "primary" | "ghost"; onClick: () => void; title?: string };
  const items: Item[] = [];

  // Status-specific primary message.
  if (booking.status === "pending") {
    items.push({
      kind: "link",
      label: "Check appointment",
      href: waLink(patient.whatsapp_number, build(templates, "check", vars)),
      tone: "primary",
      wakind: "check",
      title: "Open WA with the appointment-check template",
    });
  } else if (booking.status === "confirmed") {
    const key = booking.type === "reschedule" ? "confirm_reschedule" : "confirm_booking";
    items.push({
      kind: "link",
      label: "Send confirmation",
      href: waLink(patient.whatsapp_number, build(templates, key, vars)),
      tone: "primary",
      wakind: "confirm",
      title: "Open WA with the booking-confirmation template",
    });
  } else if (booking.status === "cancelled") {
    items.push({
      kind: "link",
      label: "Send cancellation",
      href: waLink(patient.whatsapp_number, build(templates, "confirm_cancellation", vars)),
      tone: "primary",
      wakind: "cancel",
    });
  } else if (booking.status === "rejected") {
    items.push({
      kind: "link",
      label: "Send rejection",
      href: waLink(patient.whatsapp_number, build(templates, "reject", vars)),
      tone: "primary",
      wakind: "reject",
    });
  }

  // Reminder — only for confirmed-future bookings that haven't been
  // marked attended / no-show yet (matches the parent table's gating).
  const canRemind =
    onSendReminder && booking.status === "confirmed" && !isPast && !attended && !noShow;
  if (canRemind) {
    items.push({
      kind: "action",
      label: booking.reminder_sent_at ? "Resend reminder" : "Send reminder",
      tone: booking.reminder_sent_at ? "ghost" : "primary",
      onClick: onSendReminder!,
      title: booking.reminder_sent_at
        ? `Last sent ${new Date(booking.reminder_sent_at).toLocaleString("en-MY")}`
        : "Open WA with the appointment-reminder template",
    });
  }

  // Generic "open WA chat" shortcut — no template prefilled.
  const digits = patient.whatsapp_number.replace(/\D/g, "");
  items.push({
    kind: "link",
    label: "Open chat",
    href: `https://wa.me/${digits}`,
    tone: "ghost",
    wakind: null,
    title: "Open the patient's WhatsApp chat (no template)",
  });

  return (
    <div className="flex flex-col items-stretch gap-1">
      {items.map((it) =>
        it.kind === "link" ? (
          <a
            key={it.label}
            href={it.href}
            target="_blank"
            rel="noreferrer"
            title={it.title}
            className={
              it.tone === "primary"
                ? "btn-wa text-center"
                : "px-2 py-1 text-xs rounded-md border border-stone-200 hover:border-stone-400 bg-white text-stone-700 text-center"
            }
            onClick={() => {
              if (it.wakind) logWaSent(booking.id, it.wakind);
            }}
          >
            {it.label}
          </a>
        ) : (
          <button
            key={it.label}
            type="button"
            onClick={it.onClick}
            title={it.title}
            className={
              it.tone === "primary"
                ? "btn-wa text-center"
                : "px-2 py-1 text-xs rounded-md border border-stone-200 hover:border-stone-400 bg-white text-stone-700 text-center"
            }
          >
            {it.label}
          </button>
        )
      )}
    </div>
  );
}
