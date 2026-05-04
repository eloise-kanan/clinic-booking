"use client";

import { applyTemplate, bookingVars, formatSlotLabel, waLink } from "@/lib/utils";

type Booking = {
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

export function WhatsAppActions({
  booking,
  patient,
  doctor,
  clinicName,
  templates,
}: {
  booking: Booking;
  patient: Patient | null;
  doctor: Doctor | null;
  clinicName: string;
  templates?: Record<string, string>;
}) {
  if (!patient || !patient.whatsapp_number) {
    return <span className="text-[11px] text-stone-400">no phone</span>;
  }

  const slotLabel = formatSlotLabel(booking.slot_start, booking.slot_end);
  const vars = bookingVars({
    patient_name: patient.full_name,
    doctor_name: doctor?.display_name || "the doctor",
    slot_label: slotLabel,
    visit_reason: booking.visit_reason || "",
    clinic_name: clinicName,
  });

  const items: { label: string; href: string }[] = [];

  if (booking.status === "pending") {
    items.push({ label: "Check", href: waLink(patient.whatsapp_number, build(templates, "check", vars)) });
  } else if (booking.status === "confirmed") {
    const key = booking.type === "reschedule" ? "confirm_reschedule" : "confirm_booking";
    items.push({
      label: "Send confirmation",
      href: waLink(patient.whatsapp_number, build(templates, key, vars)),
    });
  } else if (booking.status === "cancelled") {
    items.push({
      label: "Send cancellation",
      href: waLink(patient.whatsapp_number, build(templates, "confirm_cancellation", vars)),
    });
  } else if (booking.status === "rejected") {
    items.push({
      label: "Send rejection",
      href: waLink(patient.whatsapp_number, build(templates, "reject", vars)),
    });
  } else {
    items.push({ label: "Check", href: waLink(patient.whatsapp_number, build(templates, "check", vars)) });
  }

  const digits = patient.whatsapp_number.replace(/\D/g, "");
  items.push({ label: "Open WA", href: `https://wa.me/${digits}` });

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <a key={it.label} href={it.href} target="_blank" rel="noreferrer" className="btn-wa">
          {it.label}
        </a>
      ))}
    </div>
  );
}
