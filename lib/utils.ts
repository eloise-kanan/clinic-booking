// Validation utilities + WhatsApp template generation.

import { dialCodeFor } from "./countries";

// Malaysian IC: 12 digits, no dashes
export const IC_REGEX = /^\d{12}$/;
export const PASSPORT_REGEX = /^[A-Z0-9]{6,9}$/i;
// Generic E.164: optional +, 7–15 digits
export const PHONE_REGEX = /^\+?\d{7,15}$/;

// Strip everything that isn't a digit (or leading +)
export function normalizePhone(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? "+" + digits : digits;
}

// Compose a stored phone given a country dial code and the user-typed local part.
// `dial` is "+60", `local` is what the user typed (we strip non-digits and any
// leading 0). Returns "+60123456789".
export function composePhone(dial: string, local: string): string {
  const cleanDial = dial.startsWith("+") ? dial : `+${dial.replace(/\D/g, "")}`;
  let cleanLocal = (local || "").replace(/\D/g, "");
  while (cleanLocal.startsWith("0")) cleanLocal = cleanLocal.slice(1);
  return cleanDial + cleanLocal;
}

// Strip dashes / spaces from an IC entry so the form is forgiving but storage
// is canonical (12 digits).
export function normalizeIc(input: string): string {
  return (input || "").replace(/\D/g, "");
}

export function validateBookingInput(input: {
  full_name: string;
  nationality: string;
  id_type: "ic" | "passport";
  id_number: string;
  whatsapp_number: string;
}): string | null {
  if (!input.full_name || input.full_name.trim().length < 2) return "Full name is required";
  if (!input.nationality) return "Nationality is required";
  if (input.id_type === "ic" && !IC_REGEX.test(input.id_number))
    return "IC must be 12 digits (e.g. 990315041234)";
  if (input.id_type === "passport" && !PASSPORT_REGEX.test(input.id_number))
    return "Passport number is invalid (6–9 alphanumeric characters)";
  if (!PHONE_REGEX.test(input.whatsapp_number))
    return "WhatsApp number is invalid";
  return null;
}

// wa.me link builder. Phone must be digits only (no + or spaces).
export function waLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

// Re-export so callers can resolve a country's dial code without a separate import
export { dialCodeFor };

// ============================================================
// WhatsApp templates — English
// ============================================================

interface BookingCtx {
  patient_name: string;
  doctor_name: string;
  slot_label: string; // e.g. "Mon, 5 May 2026, 11:00 AM"
  visit_reason?: string;
  clinic_name: string;
}

export function tplCheck(ctx: BookingCtx): string {
  return [
    `Hi ${ctx.patient_name},`,
    ``,
    `This is ${ctx.clinic_name}. We received your appointment request:`,
    `• Doctor: ${ctx.doctor_name}`,
    `• Date & time: ${ctx.slot_label}`,
    ctx.visit_reason ? `• Reason: ${ctx.visit_reason}` : null,
    ``,
    `Could you please confirm this is correct? Reply YES to proceed, or let us know if any changes are needed.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function tplConfirmBooking(ctx: BookingCtx): string {
  return [
    `Hi ${ctx.patient_name},`,
    ``,
    `Your appointment is confirmed:`,
    `• Doctor: ${ctx.doctor_name}`,
    `• Date & time: ${ctx.slot_label}`,
    ``,
    `Please arrive 10 minutes early. If you need to reschedule or cancel, let us know as soon as possible.`,
    ``,
    `— ${ctx.clinic_name}`,
  ].join("\n");
}

export function tplConfirmReschedule(ctx: BookingCtx): string {
  return [
    `Hi ${ctx.patient_name},`,
    ``,
    `Your appointment has been rescheduled:`,
    `• Doctor: ${ctx.doctor_name}`,
    `• New date & time: ${ctx.slot_label}`,
    ``,
    `Please arrive 10 minutes early.`,
    ``,
    `— ${ctx.clinic_name}`,
  ].join("\n");
}

export function tplConfirmCancellation(ctx: { patient_name: string; clinic_name: string }): string {
  return [
    `Hi ${ctx.patient_name},`,
    ``,
    `Your appointment has been cancelled. We hope to see you again soon.`,
    ``,
    `— ${ctx.clinic_name}`,
  ].join("\n");
}

export function tplReject(ctx: BookingCtx & { reason?: string }): string {
  return [
    `Hi ${ctx.patient_name},`,
    ``,
    `Unfortunately we are unable to confirm your appointment request for ${ctx.slot_label} with ${ctx.doctor_name}.`,
    ctx.reason ? `Reason: ${ctx.reason}` : null,
    ``,
    `Please submit a new booking and we will do our best to accommodate you.`,
    ``,
    `— ${ctx.clinic_name}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatSlotLabel(slotStart: string | Date, slotEnd: string | Date): string {
  const s = typeof slotStart === "string" ? new Date(slotStart) : slotStart;
  const e = typeof slotEnd === "string" ? new Date(slotEnd) : slotEnd;
  const dateStr = s.toLocaleDateString("en-MY", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeStr = (d: Date) =>
    d.toLocaleTimeString("en-MY", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${dateStr}, ${timeStr(s)}–${timeStr(e)}`;
}
