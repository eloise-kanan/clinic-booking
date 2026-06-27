"use client";

import { useEffect, useState } from "react";
import { COUNTRIES, dialCodeFor } from "@/lib/countries";
import { TREATMENTS, treatmentMinutes } from "@/lib/treatments";
import { composePhone, normalizeIc } from "@/lib/utils";
import { localYmd, addDaysYmd } from "@/lib/local-date";
import Calendar from "@/components/Calendar";
import { BOOK_T, LANGS, TREATMENT_LABELS, MONTHS_T, DOW_T, type Lang, type BookKey } from "@/lib/i18n-book";

type RequestType = "booking" | "reschedule" | "cancellation";
type Doctor = {
  id: string;
  display_name: string;
  // Premium-only fields. The /api/doctors endpoint will return them as null
  // when the clinic is on Standard so we don't even render the card UI.
  expertise?: string | null;
  bio?: string | null;
  rating_average?: number | null;
  rating_count?: number | null;
};
type Slot = { slot_start: string; slot_end: string };
type ActiveBooking = {
  id: string;
  doctor_id: string;
  doctor_name: string;
  slot_start: string;
  slot_end: string;
  status: string;
};

const REQUEST_TYPE_KEYS: { value: RequestType; labelKey: BookKey; descKey: BookKey }[] = [
  { value: "booking", labelKey: "type_booking", descKey: "type_booking_desc" },
  { value: "reschedule", labelKey: "type_reschedule", descKey: "type_reschedule_desc" },
  { value: "cancellation", labelKey: "type_cancellation", descKey: "type_cancellation_desc" },
];

export default function BookingForm({
  doctorProfilesEnabled = false,
}: {
  // Premium: render doctor cards with expertise + rating instead of the
  // plain <select>. Standard tier ignores this and gets the dropdown.
  doctorProfilesEnabled?: boolean;
}) {
  // Language toggle — defaults to English, persists across visits.
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("book_lang")) as Lang | null;
    if (saved && ["en", "zh", "ms"].includes(saved)) setLang(saved);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("book_lang", lang);
  }, [lang]);
  const t = (k: BookKey) => BOOK_T[lang][k];

  const [reqType, setReqType] = useState<RequestType | null>(null);
  // Returning-patient detection — populated after the patient enters their
  // IC/passport. Null = haven't looked up yet; {existing:false} = new
  // patient; {existing:true, ...} = welcome-back with last-doctor hint.
  type LookupResult =
    | { existing: false }
    | { existing: true; full_name: string; visit_count: number; last_visit_at: string | null; last_doctor: { id: string; display_name: string } | null };
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  // When a returning patient wants to switch doctor — show the doctor list
  // instead of locking to their last-visit doctor.
  const [changeDoctor, setChangeDoctor] = useState(false);

  // Identity
  const [fullName, setFullName] = useState("");
  const [nationality, setNationality] = useState("Malaysia");
  const [idNumber, setIdNumber] = useState("");
  const [phoneLocal, setPhoneLocal] = useState("");

  // Type-specific
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [keepSameDoctor, setKeepSameDoctor] = useState<boolean | null>(null);

  // Reset returning-patient detection when identity changes so we don't keep
  // a stale welcome-back banner from a previous IC entry. Also reset when
  // the request type flips off "booking".
  useEffect(() => {
    setLookup(null);
    setChangeDoctor(false);
    setIsFirstTime(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqType, idNumber, nationality, fullName]);

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

  if (submitted) return <SubmittedView reqType={reqType || "booking"} lang={lang} />;

  const showTreatment =
    (reqType === "booking" && isFirstTime !== null) ||
    (reqType === "reschedule" && activeBooking && keepSameDoctor !== null);

  const treatmentReady =
    showTreatment && !!treatment && (treatment !== "other" || otherDetail.trim().length > 0);

  return (
    <>
    {/* Language toggle — segmented buttons, sits OUTSIDE the form box */}
    <div className="flex justify-end mb-3">
      <div className="inline-flex rounded-md border border-stone-200 overflow-hidden text-[11px] bg-white">
        {LANGS.map((l, i) => (
          <button
            key={l.value}
            type="button"
            onClick={() => setLang(l.value)}
            className={`px-2 py-1 transition-colors ${
              lang === l.value
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:bg-stone-50"
            } ${i > 0 ? "border-l border-stone-200" : ""}`}
            aria-pressed={lang === l.value}
            aria-label={l.label}
          >
            {l.shortLabel}
          </button>
        ))}
      </div>
    </div>

    <form onSubmit={submit} className="bg-white rounded-xl border border-stone-200 p-6 space-y-6" autoComplete="off">
      {/* Identity — captured up front so reschedule/cancel can look up the
          existing booking, and so the patient sees a clear "tell us who you
          are" entry point before choosing what they're here to do. */}
      <div className="space-y-3">
        <div>
          <label className="label">{t("full_name")}</label>
          <input
            className="input uppercase"
            value={fullName}
            onChange={(e) => setFullName(e.target.value.toUpperCase())}
            autoComplete="off"
            name="patient-name"
            required
            placeholder="FULL NAME"
          />
        </div>

        <div>
          <label className="label">{t("nationality")}</label>
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
            <label className="label">{idType === "ic" ? t("ic_number") : t("passport_number")}</label>
            <input
              className="input"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder={idType === "ic" ? t("ic_placeholder") : t("passport_placeholder")}
              inputMode={idType === "ic" ? "numeric" : "text"}
              autoComplete="off"
              name="patient-doc-id"
              data-1p-ignore="true"
              data-lpignore="true"
              required
            />
          </div>
          <div>
            <label className="label">{t("whatsapp_number")}</label>
            <div className="flex">
              <span className="inline-flex items-center px-2 rounded-l-md border border-r-0 border-stone-300 bg-stone-50 text-sm text-stone-600 select-none">
                {dial}
              </span>
              <input
                className="input rounded-l-none"
                value={phoneLocal}
                onChange={(e) => setPhoneLocal(e.target.value)}
                placeholder={t("mobile_placeholder")}
                inputMode="numeric"
                autoComplete="off"
                name="patient-wa-local"
                data-1p-ignore="true"
                data-lpignore="true"
                required
              />
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              {t("whatsapp_hint")}
            </p>
          </div>
        </div>
      </div>

      {/* Request type — patient picks what they're here to do AFTER giving us
          their identity, so reschedule/cancel can act on it immediately. */}
      <div>
        <div className="label mb-2">{t("request_label")}</div>
        <div className="grid grid-cols-3 gap-2">
          {REQUEST_TYPE_KEYS.map((rt) => (
            <button
              key={rt.value}
              type="button"
              onClick={() => setReqType(rt.value)}
              className={`p-2 sm:p-3 text-center rounded-md border transition-colors leading-tight ${
                reqType === rt.value
                  ? "border-brand bg-brand text-white"
                  : "border-stone-200 hover:border-stone-300"
              }`}
            >
              <div className="text-xs sm:text-sm font-medium break-words">{t(rt.labelKey)}</div>
              <div className={`text-[10px] sm:text-[11px] mt-0.5 break-words ${reqType === rt.value ? "text-brand-50" : "text-stone-500"}`}>
                {t(rt.descKey)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Reschedule / Cancellation: lookup active booking */}
      {(reqType === "reschedule" || reqType === "cancellation") && (
        <div className="border-t border-stone-200 pt-5">
          {!activeBooking ? (
            <button type="button" onClick={lookupActive} className="btn">
              {t("find_active")}
            </button>
          ) : (
            <div className="bg-stone-50 border border-stone-200 rounded-md p-3 text-sm">
              <div className="text-xs text-stone-500 mb-1">{t("active_appointment")}</div>
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
          <p className="text-sm text-stone-700 mb-3">{t("confirm_cancel")}</p>
        </div>
      )}

      {/* Booking: auto-detect new vs returning patient from name + IC.
          Fired by the "Continue" button below the identity fields. */}
      {reqType === "booking" && !lookup && (
        <div className="border-t border-stone-200 pt-5">
          <button
            type="button"
            disabled={!fullName.trim() || !idNumber.trim() || lookupLoading}
            onClick={async () => {
              setLookupLoading(true);
              try {
                const res = await fetch("/api/patients/lookup-public", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ nationality, id_type: idType, id_number: idNumber }),
                });
                const data = await res.json();
                if (data.existing) {
                  setLookup({
                    existing: true,
                    full_name: data.full_name,
                    visit_count: data.visit_count,
                    last_visit_at: data.last_visit_at,
                    last_doctor: data.last_doctor,
                  });
                  setIsFirstTime(false);
                  // Auto-lock to last doctor (patient can change below).
                  if (data.last_doctor?.id) setDoctorId(data.last_doctor.id);
                } else {
                  setLookup({ existing: false });
                  setIsFirstTime(true);
                }
              } finally {
                setLookupLoading(false);
              }
            }}
            className="btn-primary w-full"
          >
            {lookupLoading ? "Checking…" : "Continue"}
          </button>
        </div>
      )}

      {/* Welcome-back / new-patient banner after lookup */}
      {reqType === "booking" && lookup && (
        <div className="border-t border-stone-200 pt-5">
          {lookup.existing ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="text-sm font-medium text-emerald-900">
                Welcome back, {lookup.full_name}.
              </div>
              <p className="text-xs text-emerald-800 mt-1">
                {lookup.last_doctor
                  ? <>You last saw <strong>{lookup.last_doctor.display_name}</strong>{lookup.last_visit_at ? ` on ${new Date(lookup.last_visit_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : ""}. We&apos;ll book you with them again unless you&apos;d like a change.</>
                  : <>You&apos;ve been here before — pick your doctor below.</>}
              </p>
              {lookup.last_doctor && (
                <button
                  type="button"
                  onClick={() => {
                    setChangeDoctor((v) => !v);
                    if (!changeDoctor) setDoctorId("");
                    else if (lookup.last_doctor) setDoctorId(lookup.last_doctor.id);
                  }}
                  className="mt-2 text-xs text-emerald-800 underline-offset-2 hover:underline font-medium"
                >
                  {changeDoctor ? "← Keep same doctor" : "Change doctor →"}
                </button>
              )}
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-900">
                Welcome, {fullName.split(" ")[0]} 👋
              </div>
              <p className="text-xs text-blue-800 mt-1">
                First visit with us — pick a doctor below to see their next available slots.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reschedule: keep same doctor? */}
      {reqType === "reschedule" && activeBooking && (
        <div className="border-t border-stone-200 pt-5">
          <div className="label">
            {t("keep_same_doctor")} <span className="text-stone-500 text-xs">({activeBooking.doctor_name})</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setKeepSameDoctor(true)}
              className={`p-2 sm:p-3 rounded-md border text-xs sm:text-sm break-words leading-tight ${
                keepSameDoctor === true ? "border-brand bg-brand text-white" : "border-stone-200"
              }`}
            >
              {t("yes_same")}
            </button>
            <button
              type="button"
              onClick={() => setKeepSameDoctor(false)}
              className={`p-2 sm:p-3 rounded-md border text-xs sm:text-sm break-words leading-tight ${
                keepSameDoctor === false ? "border-brand bg-brand text-white" : "border-stone-200"
              }`}
            >
              {t("choose_different")}
            </button>
          </div>
        </div>
      )}

      {/* Treatment selection — gates the slot picker */}
      {showTreatment && (
        <div className="border-t border-stone-200 pt-5 space-y-3">
          <div>
            <label className="label">{t("reason")}</label>
            <select
              className="input"
              value={treatment}
              onChange={(e) => {
                setTreatment(e.target.value);
                setChosenSlot("");
              }}
              required
            >
              <option value="">{t("select_treatment")}</option>
              {TREATMENTS.map((tr) => (
                <option key={tr.value} value={tr.value}>
                  {TREATMENT_LABELS[lang][tr.value] || tr.label} ({tr.minutes} min)
                </option>
              ))}
            </select>
          </div>

          {treatment === "other" && (
            <div>
              <label className="label">{t("please_describe")}</label>
              <textarea
                className="input"
                rows={2}
                value={otherDetail}
                onChange={(e) => setOtherDetail(e.target.value)}
                placeholder={t("describe_placeholder")}
                required
              />
              <p className="text-xs text-stone-500 mt-1">{t("default_30")}</p>
            </div>
          )}
        </div>
      )}

      {/* Doctor + slot picker — only after treatment is set. For returning
          patients who DIDN'T tap "Change doctor", we skip the selector and
          go straight to the calendar with their last doctor pre-selected. */}
      {treatmentReady && (
        <div className="border-t border-stone-200 pt-5 space-y-3">
          {reqType === "booking" && lookup?.existing && lookup.last_doctor && !changeDoctor ? (
            <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
              <span className="text-stone-500 text-xs">{t("doctor")}: </span>
              <span className="font-medium">{lookup.last_doctor.display_name}</span>
            </div>
          ) : (
            <div>
              <label className="label">{t("doctor")}</label>
              {doctorProfilesEnabled ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {doctors.map((d) => {
                    const selected = doctorId === d.id;
                    const rating = d.rating_average ?? 0;
                    const ratingCount = d.rating_count ?? 0;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          setDoctorId(d.id);
                          setChosenSlot("");
                        }}
                        className={`text-left p-3 rounded-xl border-2 transition-all ${
                          selected
                            ? "border-blue-500 bg-blue-50 shadow-sm"
                            : "border-stone-200 bg-white hover:border-blue-300"
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-2 mb-0.5">
                          <span className="text-sm font-semibold truncate">{d.display_name}</span>
                          {ratingCount > 0 && (
                            <span className="text-[11px] text-amber-700 font-medium shrink-0 tabular-nums">
                              ★ {rating.toFixed(1)}
                              <span className="text-stone-500 font-normal"> · {ratingCount}</span>
                            </span>
                          )}
                        </div>
                        {d.expertise && (
                          <p className="text-[11px] text-stone-600 leading-snug">{d.expertise}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <select
                  className="input"
                  value={doctorId}
                  onChange={(e) => {
                    setDoctorId(e.target.value);
                    setChosenSlot("");
                  }}
                  required
                >
                  <option value="">{t("select_doctor")}</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.display_name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
          <div>
            <label className="label">{t("date")}</label>
            <Calendar
              value={date}
              onChange={(ymd) => {
                setDate(ymd);
                setChosenSlot("");
              }}
              minDate={today}
              maxDate={today ? addDaysYmd(today, 35) : undefined}
              monthNames={MONTHS_T[lang]}
              weekdayNames={DOW_T[lang]}
            />
            <p className="text-[11px] text-stone-500 mt-1">
              {t("five_weeks_hint")}
            </p>
          </div>

          {doctorId && (
            <div>
              <label className="label">{t("available_slots")}</label>
              {slotsLoading ? (
                <p className="text-xs text-stone-500">{t("loading")}</p>
              ) : slots.length === 0 ? (
                <p className="text-xs text-stone-500">{t("no_slots")}</p>
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
        {submitting ? t("submitting") : t("submit")}
      </button>
    </form>
    </>
  );
}

function canSubmit(s: {
  reqType: RequestType | null;
  isFirstTime: boolean | null;
  keepSameDoctor: boolean | null;
  activeBooking: ActiveBooking | null;
  chosenSlot: string;
  treatment: string;
  otherDetail: string;
}) {
  if (!s.reqType) return false;
  if (s.reqType === "cancellation") return !!s.activeBooking;
  const treatmentOk = !!s.treatment && (s.treatment !== "other" || s.otherDetail.trim().length > 0);
  if (s.reqType === "booking") return s.isFirstTime !== null && treatmentOk && !!s.chosenSlot;
  if (s.reqType === "reschedule")
    return !!s.activeBooking && s.keepSameDoctor !== null && treatmentOk && !!s.chosenSlot;
  return false;
}

function SubmittedView({ reqType, lang }: { reqType: RequestType; lang: Lang }) {
  const t = (k: BookKey) => BOOK_T[lang][k];
  const bodyKey: BookKey =
    reqType === "reschedule"
      ? "submitted_body_reschedule"
      : reqType === "cancellation"
        ? "submitted_body_cancellation"
        : "submitted_body_booking";
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-brand-50 flex items-center justify-center">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-brand">
          <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="text-lg font-medium mb-2">{t("submitted_heading")}</h2>
      <p className="text-sm text-stone-600 leading-relaxed max-w-sm mx-auto">
        {t(bodyKey)}{" "}
        <strong className="font-medium text-stone-800">{t("submitted_ensure_wa")}</strong>
      </p>
      <p className="text-xs text-stone-500 mt-4">{t("submitted_hold_note")}</p>
    </div>
  );
}
