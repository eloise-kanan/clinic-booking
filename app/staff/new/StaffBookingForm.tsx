"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES, dialCodeFor } from "@/lib/countries";
import { TREATMENTS, treatmentMinutes } from "@/lib/treatments";
import { composePhone, normalizeIc } from "@/lib/utils";

type Doctor = { id: string; display_name: string };
type Slot = { slot_start: string; slot_end: string };

type ParentBooking = {
  id: string;
  doctor_id: string;
  slot_start: string;
  visit_reason: string | null;
  patient: {
    full_name: string;
    nationality: string;
    id_type: "ic" | "passport";
    id_number: string;
    whatsapp_number: string;
  } | null;
} | null;

// Strip the +CC prefix off a stored phone so the user-typed input box
// only shows the local digits.
function stripDial(phone: string, dial: string): string {
  if (!phone) return "";
  if (dial && phone.startsWith(dial)) return phone.slice(dial.length);
  return phone.replace(/^\+/, "");
}

export default function StaffBookingForm({
  prefill,
  role,
}: {
  prefill: ParentBooking;
  role: "nurse" | "owner";
}) {
  const router = useRouter();

  const initialNationality = prefill?.patient?.nationality || "Malaysia";
  const initialDial = dialCodeFor(initialNationality) || "+60";

  const [fullName, setFullName] = useState(prefill?.patient?.full_name || "");
  const [nationality, setNationality] = useState(initialNationality);
  const [idNumber, setIdNumber] = useState(prefill?.patient?.id_number || "");
  const [phoneLocal, setPhoneLocal] = useState(
    prefill?.patient?.whatsapp_number ? stripDial(prefill.patient.whatsapp_number, initialDial) : ""
  );
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupNote, setLookupNote] = useState<string>("");

  const [treatment, setTreatment] = useState("");
  const [otherDetail, setOtherDetail] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState<string>(prefill?.doctor_id || "");
  const [date, setDate] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [chosenSlot, setChosenSlot] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [done, setDone] = useState(false);

  const idType: "ic" | "passport" = nationality === "Malaysia" ? "ic" : "passport";
  const dial = dialCodeFor(nationality) || "+";
  const minutes = treatmentMinutes(treatment);

  // Initialize today's date after mount (avoids SSR/client timezone mismatch)
  useEffect(() => {
    setDate(new Date().toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => r.json())
      .then((d) => setDoctors(d.doctors || []))
      .catch(() => {});
  }, []);

  // Slots
  useEffect(() => {
    if (!doctorId || !date || !minutes) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    fetch(`/api/slots?doctor_id=${doctorId}&date=${date}&minutes=${minutes}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [doctorId, date, minutes]);

  // Look up a patient by ID alone (staff-side: no phone-match required)
  async function lookupByIc() {
    if (!idNumber) {
      setLookupNote("Enter the IC or passport number first");
      return;
    }
    setLookupBusy(true);
    setLookupNote("");
    try {
      const idValue = idType === "ic" ? normalizeIc(idNumber) : idNumber;
      const res = await fetch(
        `/api/staff/patient-lookup?id_type=${idType}&id_number=${encodeURIComponent(idValue)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setLookupNote(data.error || "Lookup failed");
        return;
      }
      if (!data.patient) {
        setLookupNote("No record — fill in the form to register a new patient.");
        return;
      }
      const p = data.patient;
      setFullName(p.full_name);
      setNationality(p.nationality || "Malaysia");
      const newDial = dialCodeFor(p.nationality || "Malaysia") || "+60";
      setPhoneLocal(stripDial(p.whatsapp_number || "", newDial));
      setLookupNote(`Loaded existing patient: ${p.full_name}`);
    } finally {
      setLookupBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const composedPhone = composePhone(dial, phoneLocal);
      const idValue = idType === "ic" ? normalizeIc(idNumber) : idNumber;
      const visitReason = treatment === "other"
        ? `Others: ${otherDetail.trim()}`
        : (TREATMENTS.find((t) => t.value === treatment)?.label || "");

      const payload = {
        full_name: fullName,
        nationality,
        id_type: idType,
        id_number: idValue,
        whatsapp_number: composedPhone,
        is_first_time: false,
        doctor_id: doctorId,
        slot_start: chosenSlot,
        visit_reason: visitReason,
        slot_minutes: minutes,
        parent_booking_id: prefill?.id,
      };

      const res = await fetch("/api/bookings/staff-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create");
      } else {
        setDone(true);
        setTimeout(() => {
          router.push(role === "owner" ? "/owner/bookings" : "/nurse/all");
          router.refresh();
        }, 800);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const treatmentReady = !!treatment && (treatment !== "other" || otherDetail.trim().length > 0);
  const canSubmit =
    fullName.trim().length > 1 &&
    !!idNumber &&
    !!phoneLocal &&
    treatmentReady &&
    !!doctorId &&
    !!chosenSlot;

  if (done) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-brand-50 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-brand">
            <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-lg font-medium mb-2">Booking confirmed</h2>
        <p className="text-sm text-stone-600">Redirecting to bookings…</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-stone-200 p-6 space-y-6" autoComplete="off">
      {/* Patient identity */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Nationality</label>
            <select
              className="input"
              value={nationality}
              onChange={(e) => {
                const next = e.target.value;
                setNationality(next);
                // Re-strip the phone using the new dial code if it's still equal to old
                const oldDial = dial;
                const newDial = dialCodeFor(next) || "+";
                if (phoneLocal && (oldDial !== newDial)) {
                  // Leave phoneLocal as-is; user can adjust
                }
              }}
              autoComplete="off"
              name="patient-country"
            >
              {COUNTRIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{idType === "ic" ? "IC number" : "Passport number"}</label>
            <div className="flex gap-2">
              <input
                className="input"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder={idType === "ic" ? "12 digits, no dashes" : "Passport number"}
                inputMode={idType === "ic" ? "numeric" : "text"}
                autoComplete="off"
                name="patient-doc-id"
                data-1p-ignore="true"
                data-lpignore="true"
                required
              />
              <button
                type="button"
                onClick={lookupByIc}
                disabled={lookupBusy}
                className="btn whitespace-nowrap"
              >
                {lookupBusy ? "…" : "Look up"}
              </button>
            </div>
          </div>
        </div>
        {lookupNote && <p className="text-xs text-stone-500">{lookupNote}</p>}

        <div>
          <label className="label">Full name (as per IC/passport)</label>
          <input
            className="input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="off"
            name="patient-name"
            required
          />
        </div>
        <div>
          <label className="label">WhatsApp number</label>
          <div className="flex">
            <span className="inline-flex items-center px-2 rounded-l-md border border-r-0 border-stone-300 bg-stone-50 text-sm text-stone-600 select-none">
              {dial}
            </span>
            <input
              className="input rounded-l-none"
              value={phoneLocal}
              onChange={(e) => setPhoneLocal(e.target.value)}
              placeholder="Mobile number"
              inputMode="numeric"
              autoComplete="off"
              name="patient-wa-local"
              data-1p-ignore="true"
              data-lpignore="true"
              required
            />
          </div>
        </div>
      </div>

      {/* Treatment */}
      <div className="border-t border-stone-200 pt-5 space-y-3">
        <div>
          <label className="label">Reason for visit</label>
          <select
            className="input"
            value={treatment}
            onChange={(e) => {
              setTreatment(e.target.value);
              setChosenSlot("");
            }}
            required
          >
            <option value="">Select a treatment</option>
            {TREATMENTS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label} ({t.minutes} min)
              </option>
            ))}
          </select>
        </div>
        {treatment === "other" && (
          <div>
            <label className="label">Please describe</label>
            <textarea
              className="input"
              rows={2}
              value={otherDetail}
              onChange={(e) => setOtherDetail(e.target.value)}
              placeholder="Describe the visit reason"
              required
            />
          </div>
        )}
      </div>

      {/* Doctor + slot */}
      {treatmentReady && (
        <div className="border-t border-stone-200 pt-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Doctor</label>
              <select
                className="input"
                value={doctorId}
                onChange={(e) => {
                  setDoctorId(e.target.value);
                  setChosenSlot("");
                }}
                required
              >
                <option value="">Select doctor</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.display_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                className="input"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => {
                  setDate(e.target.value);
                  setChosenSlot("");
                }}
                required
              />
            </div>
          </div>

          {doctorId && (
            <div>
              <label className="label">Available slots</label>
              {slotsLoading ? (
                <p className="text-xs text-stone-500">Loading…</p>
              ) : slots.length === 0 ? (
                <p className="text-xs text-stone-500">No available slots for this date.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((s) => {
                    const t = new Date(s.slot_start);
                    const label = t.toLocaleTimeString("en-MY", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    });
                    return (
                      <button
                        type="button"
                        key={s.slot_start}
                        onClick={() => setChosenSlot(s.slot_start)}
                        className={`p-2 text-xs rounded-md border ${
                          chosenSlot === s.slot_start
                            ? "border-brand bg-brand text-white"
                            : "border-stone-200 hover:border-stone-400"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={submitting || !canSubmit} className="btn-primary w-full">
        {submitting ? "Saving…" : prefill ? "Confirm reschedule" : "Confirm booking"}
      </button>
    </form>
  );
}
