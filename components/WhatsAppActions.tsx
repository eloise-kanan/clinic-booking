"use client";

import {
  formatSlotLabel,
  tplCheck,
  tplConfirmBooking,
  tplConfirmReschedule,
  tplConfirmCancellation,
  tplReject,
  waLink,
} from "@/lib/utils";

type Booking = {
  type: "booking" | "reschedule" | "cancellation" | string;
  status: string;
  slot_start: string;
  slot_end: string;
  visit_reason: string | null;
};
type Patient = { full_name: string; whatsapp_number: string };
type Doctor = { display_name: string };

// Returns the wa.me link a nurse most likely wants for this booking's status,
// plus a generic fallback so a template is always reachable post-approval.
export function WhatsAppActions({
  booking,
  patient,
  doctor,
  clinicName,
}: {
  booking: Booking;
  patient: Patient | null;
  doctor: Doctor | null;
  clinicName: string;
}) {
  if (!patient || !patient.whatsapp_number) {
    return <span className="text-[11px] text-stone-400">no phone</span>;
  }

  const slotLabel = formatSlotLabel(booking.slot_start, booking.slot_end);
  const ctx = {
    patient_name: patient.full_name,
    doctor_name: doctor?.display_name || "the doctor",
    slot_label: slotLabel,
    visit_reason: booking.visit_reason || undefined,
    clinic_name: clinicName,
  };

  const items: { label: string; href: string }[] = [];

  if (booking.status === "pending") {
    items.push({ label: "Check", href: waLink(patient.whatsapp_number, tplCheck(ctx)) });
  } else if (booking.status === "confirmed") {
    const tpl =
      booking.type === "reschedule" ? tplConfirmReschedule(ctx) : tplConfirmBooking(ctx);
    items.push({ label: "Send confirmation", href: waLink(patient.whatsapp_number, tpl) });
  } else if (booking.status === "cancelled") {
    items.push({
      label: "Send cancellation",
      href: waLink(
        patient.whatsapp_number,
        tplConfirmCancellation({ patient_name: patient.full_name, clinic_name: clinicName })
      ),
    });
  } else if (booking.status === "rejected") {
    items.push({ label: "Send rejection", href: waLink(patient.whatsapp_number, tplReject(ctx)) });
  } else {
    items.push({ label: "Check", href: waLink(patient.whatsapp_number, tplCheck(ctx)) });
  }

  // Generic fallback — direct WhatsApp with no template
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
