"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { applyTemplate, bookingVars, formatSlotLabel, waLink } from "@/lib/utils";
import { logWaSent } from "@/lib/wa-track";
import { usePinGuardedFetch } from "@/components/usePinGuardedFetch";

const FALLBACK_TEMPLATES: Record<string, string> = {
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
  const body = (templates && templates[key]) || FALLBACK_TEMPLATES[key] || "";
  return applyTemplate(body, vars);
}

type Booking = {
  id: string;
  type: "booking" | "reschedule" | "cancellation";
  status: string;
  slot_start: string;
  slot_end: string;
  visit_reason: string | null;
  is_first_time: boolean;
  created_at: string;
  expires_at: string;
  check_sent_at: string | null;
  confirm_sent_at: string | null;
  reject_sent_at: string | null;
  cancel_sent_at: string | null;
  patient: {
    id: string;
    full_name: string;
    nationality: string;
    id_type: "ic" | "passport";
    id_number: string;
    whatsapp_number: string;
    visit_count: number;
  };
  doctor: { id: string; display_name: string };
};

export default function PendingQueue({
  initial,
  clinicName,
  templates,
  isTerminal,
}: {
  initial: Booking[];
  clinicName: string;
  templates?: Record<string, string>;
  isTerminal: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<{ [k: string]: string }>({});
  const { guardedFetch, pinModal } = usePinGuardedFetch({ isTerminal });

  async function act(id: string, action: "approve" | "reject", notes?: string) {
    setBusy(id);
    try {
      const res = await guardedFetch(
        `/api/bookings/${action}`,
        { booking_id: id, notes },
        {
          allowedRoles: ["nurse"],
          actionLabel: action === "approve" ? "to confirm this booking — nurses only" : "to reject this booking — nurses only",
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status !== 401) alert(data.error || "Action failed");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  if (initial.length === 0) {
    return (
      <div className="bg-white border border-stone-200 rounded-lg p-12 text-center">
        <p className="text-sm text-stone-500">No pending requests right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {initial.map((b) => {
        const slotLabel = formatSlotLabel(b.slot_start, b.slot_end);
        const vars = bookingVars({
          patient_name: b.patient.full_name,
          doctor_name: b.doctor.display_name,
          slot_label: slotLabel,
          visit_reason: b.visit_reason || "",
          clinic_name: clinicName,
        });
        const checkLink = waLink(b.patient.whatsapp_number, build(templates, "check", vars));
        const confirmKey =
          b.type === "cancellation"
            ? "confirm_cancellation"
            : b.type === "reschedule"
            ? "confirm_reschedule"
            : "confirm_booking";
        const confirmLink = waLink(b.patient.whatsapp_number, build(templates, confirmKey, vars));
        const rejectLink = waLink(
          b.patient.whatsapp_number,
          build(templates, "reject", { ...vars, reject_reason: rejectReason[b.id] || "" })
        );

        const typeLabel =
          { booking: "New booking", reschedule: "Reschedule", cancellation: "Cancellation" }[b.type];

        return (
          <div key={b.id} className="bg-white border border-stone-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{b.patient.full_name}</span>
                  {b.is_first_time && b.type === "booking" && (
                    <span className="pill pill-new">First-time</span>
                  )}
                  {b.patient.visit_count > 0 && (
                    <span className="text-[11px] text-stone-500">
                      {b.patient.visit_count} prior visit{b.patient.visit_count > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="text-xs text-stone-500 mt-0.5 break-words">
                  {b.patient.nationality} · {b.patient.id_type === "ic" ? "IC" : "Passport"}{" "}
                  {b.patient.id_number} · {b.patient.whatsapp_number}
                </div>
              </div>
              <span
                className={`pill ${
                  b.type === "cancellation"
                    ? "pill-rejected"
                    : b.type === "reschedule"
                    ? "pill-pending"
                    : "pill-pending"
                }`}
              >
                {typeLabel}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-[80px_1fr] gap-y-1 gap-x-3 text-xs">
              <div className="text-stone-500">Doctor</div>
              <div>{b.doctor.display_name}</div>
              <div className="text-stone-500">Slot</div>
              <div>{slotLabel}</div>
              {b.visit_reason && (
                <>
                  <div className="text-stone-500">Reason</div>
                  <div>{b.visit_reason}</div>
                </>
              )}
              <div className="text-stone-500">Submitted</div>
              <div>{new Date(b.created_at).toLocaleString("en-MY")}</div>
            </div>

            {/* Actions split into two clear groups so they don't read as a
                wall of buttons: Decision (state change) + WhatsApp (comms). */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Group A — Decision */}
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-stone-500 font-medium mb-2">
                  Decision
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => act(b.id, "approve")}
                    disabled={busy === b.id}
                    className="btn-approve"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt("Optional reason for rejection (will be included in WhatsApp template):") || undefined;
                      if (reason !== undefined) {
                        setRejectReason((s) => ({ ...s, [b.id]: reason || "" }));
                      }
                      act(b.id, "reject", reason);
                    }}
                    disabled={busy === b.id}
                    className="btn-reject"
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>

              {/* Group B — WhatsApp comms */}
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-stone-500 font-medium mb-2">
                  WhatsApp comms
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={checkLink}
                    target="_blank"
                    rel="noreferrer"
                    className={b.check_sent_at ? "btn" : "btn-wa"}
                    onClick={() => logWaSent(b.id, "check")}
                    title={b.check_sent_at ? `Last sent ${new Date(b.check_sent_at).toLocaleString("en-MY")}` : undefined}
                  >
                    <WAIcon /> {b.check_sent_at ? "Resend check" : "Check with patient"}
                  </a>
                  <a
                    href={confirmLink}
                    target="_blank"
                    rel="noreferrer"
                    className={(b.type === "cancellation" ? b.cancel_sent_at : b.confirm_sent_at) ? "btn" : "btn-wa"}
                    onClick={() =>
                      logWaSent(b.id, b.type === "cancellation" ? "cancel" : "confirm")
                    }
                    title={(b.type === "cancellation" ? b.cancel_sent_at : b.confirm_sent_at) ? `Last sent ${new Date((b.type === "cancellation" ? b.cancel_sent_at : b.confirm_sent_at)!).toLocaleString("en-MY")}` : undefined}
                  >
                    <WAIcon /> {(b.type === "cancellation" ? b.cancel_sent_at : b.confirm_sent_at) ? "Resend confirmation" : "Send confirmation"}
                  </a>
                  <a
                    href={rejectLink}
                    target="_blank"
                    rel="noreferrer"
                    className={b.reject_sent_at ? "btn" : "btn-wa"}
                    onClick={() => logWaSent(b.id, "reject")}
                    title={b.reject_sent_at ? `Last sent ${new Date(b.reject_sent_at).toLocaleString("en-MY")}` : undefined}
                  >
                    <WAIcon /> {b.reject_sent_at ? "Resend rejection" : "Send rejection"}
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {pinModal}
    </div>
  );
}

function WAIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.2-.7.2-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.7-.9-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.7.4-.3.3-1 1-1 2.5s1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 2.5 1 3 .8 3.6.7.5-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3z" />
    </svg>
  );
}
