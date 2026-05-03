"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  id: string;
  type: "booking" | "reschedule" | "cancellation";
  status: string;
  slot_start: string;
  slot_end: string;
  visit_reason: string | null;
  is_first_time: boolean;
  created_at: string;
  expires_at: string;
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
}: {
  initial: Booking[];
  clinicName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<{ [k: string]: string }>({});

  async function act(id: string, action: "approve" | "reject", notes?: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/bookings/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: id, notes }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Action failed");
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
        const ctx = {
          patient_name: b.patient.full_name,
          doctor_name: b.doctor.display_name,
          slot_label: slotLabel,
          visit_reason: b.visit_reason || undefined,
          clinic_name: clinicName,
        };
        const checkLink = waLink(b.patient.whatsapp_number, tplCheck(ctx));
        const confirmTpl =
          b.type === "cancellation"
            ? tplConfirmCancellation({ patient_name: b.patient.full_name, clinic_name: clinicName })
            : b.type === "reschedule"
            ? tplConfirmReschedule(ctx)
            : tplConfirmBooking(ctx);
        const confirmLink = waLink(b.patient.whatsapp_number, confirmTpl);
        const rejectLink = waLink(
          b.patient.whatsapp_number,
          tplReject({ ...ctx, reason: rejectReason[b.id] })
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

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <a href={checkLink} target="_blank" rel="noreferrer" className="btn-wa">
                <WAIcon /> Check with patient
              </a>
              <a href={confirmLink} target="_blank" rel="noreferrer" className="btn-wa">
                <WAIcon /> Send confirmation
              </a>
              <button
                onClick={() => act(b.id, "approve")}
                disabled={busy === b.id}
                className="btn-approve"
              >
                Approve
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
                Reject
              </button>
              <a href={rejectLink} target="_blank" rel="noreferrer" className="btn-wa">
                <WAIcon /> Send rejection
              </a>
            </div>
          </div>
        );
      })}
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
