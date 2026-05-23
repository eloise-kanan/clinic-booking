"use client";

import { useEffect, useState } from "react";
import { COUNTRIES, dialCodeFor } from "@/lib/countries";
import { TREATMENTS, treatmentMinutes } from "@/lib/treatments";
import { composePhone, normalizeIc } from "@/lib/utils";
import { localYmd, addDaysYmd } from "@/lib/local-date";
import Calendar from "@/components/Calendar";

type RequestType = "booking" | "reschedule" | "cancellation";
type Doctor = { id: string; display_name: string };
type Slot = { slot_start: string; slot_end: string };
type ActiveBooking = {
  id: string;
  doctor_id: string;
  doctor_name: string;
  slot_start: string;
  slot_end: string;
  status: string;
};

const REQUEST_TYPES: { value: RequestType; label: string; description: string }[] = [
  { value: "booking", label: "Booking", description: "Book a new appointment" },
  { value: "reschedule", label: "Reschedule", description: "Change an existing one" },
  { value: "cancellation", label: "Cancel", description: "Cancel an existing one" },
];

export default function BookingForm() {
  const [reqType, setReqType] = useState<RequestType>("booking");

  // Identity
  const [fullName, setFullName] = useState("");
  const [nationality, setNationality] = useState("Malaysia");
  const [idNumber, setIdNumber] = useState("");
  const [phoneLocal, setPhoneLocal] = useState("");

  // Type-specific
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [keepSameDoctor, setKeepSameDoctor] = useState<boolean | null>(null);

  // Treatment + slot
  const [treatment, setTreatment] = useState<string>("");
  const [otherDetail, setOtherDetail] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [chosenSlot, setChosenSlot] = useState<string>("");

  // Reschedule/Cancel: lookup
  const [activeBooking, setActiveBooking] = useState<ActiveBooking | null>(null);
  const [lookupError, setLookupError] = useState<string>("");

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>("");

  const idType: "ic" | "passport" = nationality === "Malaysia" ? "ic" : "passport";
  const dial = dialCodeFor(nationality) || "+";
  const minutes = treatmentMinutes(treatment);

  // Today (local timezone) — re-checked whenever the tab regains visibility so
  // a long-open page rolls over at midnight instead of staying frozen on the
  // day it was loaded. Also drives the date picker's `min` so past dates
  // can't be selected.
  const [today, setToday] = useState<string>("");
  useEffect(() => {
    function refresh() {
      const t = localYmd();
      setToday(t);
      setDate((cur) => (!cur || cur < t ? t : cur));
    }
    refresh();
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  // Load doctors
  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => r.json())
      .then((d) => setDoctors(d.doctors || []))
      .catch(() => {});
  }, []);

  // Fetch slots when doctor + date + treatment selected
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

  // Reset when reqType changes
  useEffect(() => {
    setDoctorId("");
    setChosenSlot("");
    setIsFirstTime(null);
    setKeepSameDoctor(null);
    setActiveBooking(null);
    setLookupError("");
    setTreatment("");
    setOtherDetail("");
  }, [reqType]);

  // For reschedule: when "keep same doctor" is yes, pre-fill doctorId
  useEffect(() => {
    if (reqType === "reschedule" && keepSameDoctor && activeBooking) {
      setDoctorId(activeBooking.doctor_id);
    } else if (reqType === "reschedule" && keepSameDoctor === false) {
      setDoctorId("");
    }
  }, [keepSameDoctor, activeBooking, reqType]);

  async function lookupActive() {
    setLookupError("");
    setActiveBooking(null);
    if (!idNumber || !phoneLocal) {
      setLookupError("Please enter your ID and WhatsApp number first");
      return;
    }
    const res = await fetch("/api/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_type: idType,
        id_number: idType === "ic" ? normalizeIc(idNumber) : idNumber,
        whatsapp_number: composePhone(dial, phoneLocal),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLookupError(data.error || "Could not find an active appointment");
      return;
    }
    setActiveBooking(data.booking);
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

      const payload: Record<string, unknown> = {
        type: reqType,
        full_name: fullName,
        nationality,
        id_type: idType,
        id_number: idValue,
        whatsapp_number: composedPhone,
      };
      if (reqType === "booking") {
        payload.is_first_time = isFirstTime;
        payload.doctor_id = doctorId || null;
        payload.slot_start = chosenSlot;
        payload.visit_reason = visitReason;
        payload.slot_minutes = minutes;
      } else if (reqType === "reschedule") {
        payload.parent_booking_id = activeBooking?.id;
        payload.doctor_id = doctorId;
        payload.slot_start = chosenSlot;
        payload.visit_reason = visitReason;
        payload.slot_minutes = minutes;
      } else {
        payload.parent_booking_id = activeBooking?.id;
      }

      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Submission failed");
      } else {
        setSubmitted(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) return <SubmittedView reqType={reqType} />;

  const showTreatment =
    (reqType === "booking" && isFirstTime !== null) ||
    (reqType === "reschedule" && activeBooking && keepSameDoctor !== null);

  const treatmentReady =
    showTreatment && !!treatment && (treatment !== "other" || otherDetail.trim().length > 0);

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-stone-200 p-6 space-y-6" autoComplete="off">
      {/* Request type */}
      <div>
        <div className="grid grid-cols-3 gap-2">
          {REQUEST_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setReqType(t.value)}
              className={`p-2 sm:p-3 text-center rounded-md border transition-colors leading-tight ${
                reqType === t.value
                  ? "border-brand bg-brand text-white"
                  : "border-stone-200 hover:border-stone-300"
              }`}
            >
              <div className="text-xs sm:text-sm font-medium break-words">{t.label}</div>
              <div className={`text-[10px] sm:text-[11px] mt-0.5 break-words ${reqType === t.value ? "text-brand-50" : "text-stone-500"}`}>
                {t.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Identity */}
      <div className="space-y-3">
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
          <label className="label">Nationality</label>
          <select
            className="input"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">{idType === "ic" ? "IC number" : "Passport number"}</label>
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
      </div>

      {/* Reschedule / Cancellation: lookup active booking */}
      {(reqType === "reschedule" || reqType === "cancellation") && (
        <div className="border-t border-stone-200 pt-5">
          {!activeBooking ? (
            <button type="button" onClick={lookupActive} className="btn">
              Find my active appointment
            </button>
          ) : (
            <div className="bg-stone-50 border border-stone-200 rounded-md p-3 text-sm">
              <div className="text-xs text-stone-500 mb-1">Active appointment</div>
              <div className="font-medium">{activeBooking.doctor_name}</div>
              <div className="text-stone-600">{new Date(activeBooking.slot_start).toLocaleString("en-MY")}</div>
            </div>
          )}
          {lookupError && <p className="text-xs text-red-600 mt-2">{lookupError}</p>}
        </div>
      )}

      {/* Cancellation: confirm */}
      {reqType === "cancellation" && activeBooking && (
        <div className="border-t border-stone-200 pt-5">
          <p className="text-sm text-stone-700 mb-3">Confirm you would like to cancel this appointment.</p>
        </div>
      )}

      {/* Booking: first-time? */}
      {reqType === "booking" && (
        <div className="border-t border-stone-200 pt-5">
          <div className="label">First-time patient?</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsFirstTime(true)}
              className={`p-3 rounded-md border text-sm ${
                isFirstTime === true ? "border-brand bg-brand text-white" : "border-stone-200"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setIsFirstTime(false)}
              className={`p-3 rounded-md border text-sm ${
                isFirstTime === false ? "border-brand bg-brand text-white" : "border-stone-200"
              }`}
            >
              No
            </button>
          </div>
        </div>
      )}

      {/* Reschedule: keep same doctor? */}
      {reqType === "reschedule" && activeBooking && (
        <div className="border-t border-stone-200 pt-5">
          <div className="label">Keep the same doctor ({activeBooking.doctor_name})?</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setKeepSameDoctor(true)}
              className={`p-2 sm:p-3 rounded-md border text-xs sm:text-sm break-words leading-tight ${
                keepSameDoctor === true ? "border-brand bg-brand text-white" : "border-stone-200"
              }`}
            >
              Yes, same doctor
            </button>
            <button
              type="button"
              onClick={() => setKeepSameDoctor(false)}
              className={`p-2 sm:p-3 rounded-md border text-xs sm:text-sm break-words leading-tight ${
                keepSameDoctor === false ? "border-brand bg-brand text-white" : "border-stone-200"
              }`}
            >
              Choose different
            </button>
          </div>
        </div>
      )}

      {/* Treatment selection — gates the slot picker */}
      {showTreatment && (
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
                placeholder="Brief description of your visit"
                required
              />
              <p className="text-xs text-stone-500 mt-1">Default 30 minutes — our nurse will adjust if needed.</p>
            </div>
          )}
        </div>
      )}

      {/* Doctor + slot picker — only after treatment is set */}
      {treatmentReady && (
        <div className="border-t border-stone-200 pt-5 space-y-3">
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
            <Calendar
              value={date}
              onChange={(ymd) => {
                setDate(ymd);
                setChosenSlot("");
              }}
              minDate={today}
              maxDate={today ? addDaysYmd(today, 35) : undefined}
            />
            <p className="text-[11px] text-stone-500 mt-1">
              Bookings open for the next 5 weeks.
            </p>
          </div>

          {doctorId && (
            <div>
              <label className="label">Available slots</label>
              {slotsLoading ? (
                <p className="text-xs text-stone-500">Loading…</p>
              ) : slots.length === 0 ? (
                <p className="text-xs text-stone-500">No available slots for this date. Try another day.</p>
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

      <button
        type="submit"
        disabled={submitting || !canSubmit({ reqType, isFirstTime, keepSameDoctor, activeBooking, chosenSlot, treatment, otherDetail })}
        className="btn-primary w-full"
      >
        {submitting ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}

function canSubmit(s: {
  reqType: RequestType;
  isFirstTime: boolean | null;
  keepSameDoctor: boolean | null;
  activeBooking: ActiveBooking | null;
  chosenSlot: string;
  treatment: string;
  otherDetail: string;
}) {
  if (s.reqType === "cancellation") return !!s.activeBooking;
  const treatmentOk = !!s.treatment && (s.treatment !== "other" || s.otherDetail.trim().length > 0);
  if (s.reqType === "booking") return s.isFirstTime !== null && treatmentOk && !!s.chosenSlot;
  if (s.reqType === "reschedule")
    return !!s.activeBooking && s.keepSameDoctor !== null && treatmentOk && !!s.chosenSlot;
  return false;
}

function SubmittedView({ reqType }: { reqType: RequestType }) {
  const messages = {
    booking: "verify your details and confirm your appointment",
    reschedule: "verify your details and confirm your new slot",
    cancellation: "verify your details and confirm the cancellation",
  };
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-brand-50 flex items-center justify-center">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-brand">
          <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="text-lg font-medium mb-2">Request received</h2>
      <p className="text-sm text-stone-600 leading-relaxed max-w-sm mx-auto">
        Your slot is currently under review. Our nurse will contact you on WhatsApp within 24 hours to{" "}
        {messages[reqType]}. <strong className="font-medium text-stone-800">Please ensure the WhatsApp number you provided is accurate.</strong>
      </p>
      <p className="text-xs text-stone-500 mt-4">Until confirmed, the slot is held but not locked.</p>
    </div>
  );
}
