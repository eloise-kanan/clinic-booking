// Patient-facing booking page translations: English, Chinese (Simplified), Malay.
// Best-effort starter dictionary — review with a native speaker before relying
// on it for important patient communication. Name input on the form must stay
// romanized (as per IC/passport) regardless of language choice.

export type Lang = "en" | "zh" | "ms";

export const LANGS: { value: Lang; label: string; nativeLabel: string }[] = [
  { value: "en", label: "English", nativeLabel: "English" },
  { value: "zh", label: "Chinese", nativeLabel: "中文" },
  { value: "ms", label: "Malay", nativeLabel: "Bahasa Melayu" },
];

export type BookKey =
  | "subtitle"
  | "lang_label"
  | "request_label"
  | "type_booking"
  | "type_booking_desc"
  | "type_reschedule"
  | "type_reschedule_desc"
  | "type_cancellation"
  | "type_cancellation_desc"
  | "full_name"
  | "nationality"
  | "ic_number"
  | "passport_number"
  | "ic_placeholder"
  | "passport_placeholder"
  | "whatsapp_number"
  | "mobile_placeholder"
  | "whatsapp_hint"
  | "find_active"
  | "active_appointment"
  | "confirm_cancel"
  | "first_time"
  | "yes"
  | "no"
  | "keep_same_doctor"
  | "yes_same"
  | "choose_different"
  | "reason"
  | "select_treatment"
  | "please_describe"
  | "describe_placeholder"
  | "default_30"
  | "doctor"
  | "select_doctor"
  | "date"
  | "five_weeks_hint"
  | "available_slots"
  | "loading"
  | "no_slots"
  | "submitting"
  | "submit"
  | "submitted_heading"
  | "submitted_body_booking"
  | "submitted_body_reschedule"
  | "submitted_body_cancellation"
  | "submitted_ensure_wa"
  | "submitted_hold_note";

export const BOOK_T: Record<Lang, Record<BookKey, string>> = {
  en: {
    subtitle: "Appointment booking",
    lang_label: "Language",
    request_label: "What would you like to do?",
    type_booking: "Booking",
    type_booking_desc: "Book a new appointment",
    type_reschedule: "Reschedule",
    type_reschedule_desc: "Change an existing one",
    type_cancellation: "Cancel",
    type_cancellation_desc: "Cancel an existing one",
    full_name: "Full name (as per IC/passport)",
    nationality: "Nationality",
    ic_number: "IC number",
    passport_number: "Passport number",
    ic_placeholder: "12 digits, no dashes",
    passport_placeholder: "Passport number",
    whatsapp_number: "WhatsApp number",
    mobile_placeholder: "Mobile number",
    whatsapp_hint: "Please make sure this is correct — our nurse will contact you on WhatsApp to confirm.",
    find_active: "Find my active appointment",
    active_appointment: "Active appointment",
    confirm_cancel: "Confirm you would like to cancel this appointment.",
    first_time: "First-time patient?",
    yes: "Yes",
    no: "No",
    keep_same_doctor: "Keep the same doctor?",
    yes_same: "Yes, same doctor",
    choose_different: "Choose different",
    reason: "Reason for visit",
    select_treatment: "Select a treatment",
    please_describe: "Please describe",
    describe_placeholder: "Brief description of your visit",
    default_30: "Default 30 minutes — our nurse will adjust if needed.",
    doctor: "Doctor",
    select_doctor: "Select doctor",
    date: "Date",
    five_weeks_hint: "Bookings open for the next 5 weeks.",
    available_slots: "Available slots",
    loading: "Loading…",
    no_slots: "No available slots for this date. Try another day.",
    submitting: "Submitting…",
    submit: "Submit request",
    submitted_heading: "Request received",
    submitted_body_booking:
      "Your slot is currently under review. Our nurse will contact you on WhatsApp within 24 hours to verify your details and confirm your appointment.",
    submitted_body_reschedule:
      "Your slot is currently under review. Our nurse will contact you on WhatsApp within 24 hours to verify your details and confirm your new slot.",
    submitted_body_cancellation:
      "Your request is currently under review. Our nurse will contact you on WhatsApp within 24 hours to verify your details and confirm the cancellation.",
    submitted_ensure_wa: "Please ensure the WhatsApp number you provided is accurate.",
    submitted_hold_note: "Until confirmed, the slot is held but not locked.",
  },
  zh: {
    subtitle: "预约挂号",
    lang_label: "语言",
    request_label: "您想要做什么？",
    type_booking: "预约",
    type_booking_desc: "预约新的就诊时间",
    type_reschedule: "改期",
    type_reschedule_desc: "更改已有预约",
    type_cancellation: "取消",
    type_cancellation_desc: "取消已有预约",
    full_name: "全名（与身份证／护照一致）",
    nationality: "国籍",
    ic_number: "身份证号码",
    passport_number: "护照号码",
    ic_placeholder: "12 位数字，请勿加横线",
    passport_placeholder: "护照号码",
    whatsapp_number: "WhatsApp 号码",
    mobile_placeholder: "手机号码",
    whatsapp_hint: "请确认号码正确 — 我们的护士将通过 WhatsApp 与您联系确认。",
    find_active: "查找我的现有预约",
    active_appointment: "现有预约",
    confirm_cancel: "请确认您要取消此预约。",
    first_time: "首次就诊？",
    yes: "是",
    no: "否",
    keep_same_doctor: "保留同一位医生？",
    yes_same: "是，保留",
    choose_different: "选择其他医生",
    reason: "就诊原因",
    select_treatment: "请选择项目",
    please_describe: "请简述",
    describe_placeholder: "请简单描述您的就诊原因",
    default_30: "默认 30 分钟 — 护士会视情况调整。",
    doctor: "医生",
    select_doctor: "选择医生",
    date: "日期",
    five_weeks_hint: "可预约未来 5 周内的时间。",
    available_slots: "可预约时段",
    loading: "加载中…",
    no_slots: "当日已无可预约时段，请选择其他日期。",
    submitting: "提交中…",
    submit: "提交申请",
    submitted_heading: "已收到您的申请",
    submitted_body_booking:
      "您的预约正在审核中。我们的护士将在 24 小时内通过 WhatsApp 联系您，核实信息并确认预约。",
    submitted_body_reschedule:
      "您的改期申请正在审核中。我们的护士将在 24 小时内通过 WhatsApp 联系您，核实信息并确认新时段。",
    submitted_body_cancellation:
      "您的取消申请正在审核中。我们的护士将在 24 小时内通过 WhatsApp 联系您，核实信息并确认取消。",
    submitted_ensure_wa: "请确认您提供的 WhatsApp 号码正确无误。",
    submitted_hold_note: "在确认前,时段已为您保留但尚未锁定。",
  },
  ms: {
    subtitle: "Tempahan temujanji",
    lang_label: "Bahasa",
    request_label: "Apa yang anda ingin lakukan?",
    type_booking: "Tempah",
    type_booking_desc: "Tempah temujanji baharu",
    type_reschedule: "Jadual semula",
    type_reschedule_desc: "Tukar temujanji sedia ada",
    type_cancellation: "Batal",
    type_cancellation_desc: "Batalkan temujanji sedia ada",
    full_name: "Nama penuh (seperti dalam IC/pasport)",
    nationality: "Kewarganegaraan",
    ic_number: "Nombor IC",
    passport_number: "Nombor pasport",
    ic_placeholder: "12 digit, tanpa sengkang",
    passport_placeholder: "Nombor pasport",
    whatsapp_number: "Nombor WhatsApp",
    mobile_placeholder: "Nombor telefon bimbit",
    whatsapp_hint: "Sila pastikan nombor ini betul — jururawat kami akan menghubungi anda melalui WhatsApp untuk pengesahan.",
    find_active: "Cari temujanji aktif saya",
    active_appointment: "Temujanji aktif",
    confirm_cancel: "Sahkan anda ingin membatalkan temujanji ini.",
    first_time: "Pesakit kali pertama?",
    yes: "Ya",
    no: "Tidak",
    keep_same_doctor: "Kekal dengan doktor yang sama?",
    yes_same: "Ya, doktor yang sama",
    choose_different: "Pilih doktor lain",
    reason: "Sebab lawatan",
    select_treatment: "Pilih rawatan",
    please_describe: "Sila huraikan",
    describe_placeholder: "Huraian ringkas lawatan anda",
    default_30: "Lalai 30 minit — jururawat akan menyesuaikan jika perlu.",
    doctor: "Doktor",
    select_doctor: "Pilih doktor",
    date: "Tarikh",
    five_weeks_hint: "Tempahan dibuka untuk 5 minggu akan datang.",
    available_slots: "Slot tersedia",
    loading: "Memuatkan…",
    no_slots: "Tiada slot untuk tarikh ini. Sila cuba hari lain.",
    submitting: "Menghantar…",
    submit: "Hantar permohonan",
    submitted_heading: "Permohonan diterima",
    submitted_body_booking:
      "Slot anda sedang dalam semakan. Jururawat kami akan menghubungi anda melalui WhatsApp dalam 24 jam untuk mengesahkan butiran dan temujanji anda.",
    submitted_body_reschedule:
      "Permohonan jadual semula anda sedang dalam semakan. Jururawat kami akan menghubungi anda melalui WhatsApp dalam 24 jam untuk mengesahkan butiran dan slot baharu anda.",
    submitted_body_cancellation:
      "Permohonan pembatalan anda sedang dalam semakan. Jururawat kami akan menghubungi anda melalui WhatsApp dalam 24 jam untuk mengesahkan butiran dan pembatalan.",
    submitted_ensure_wa: "Sila pastikan nombor WhatsApp yang diberikan adalah betul.",
    submitted_hold_note: "Sehingga disahkan, slot tersebut ditahan tetapi belum dikunci.",
  },
};
