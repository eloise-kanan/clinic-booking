/**
 * One-shot demo seed script.
 *
 *   - Wipes all operational data (bookings, patients, audit log, leaves, etc.)
 *   - Wipes all non-owner staff (auth + profile + doctor rows)
 *   - Reseeds with the Malaysian sample data set used in the mock screenshots
 *
 *  USAGE:
 *    Dry-run (shows what would change):   node scripts/seed-demo.mjs
 *    Real run:                            node scripts/seed-demo.mjs --confirm
 *
 *  REQUIRES .env.local with:
 *    NEXT_PUBLIC_SUPABASE_URL
 *    SUPABASE_SERVICE_ROLE_KEY
 *
 *  Staff passwords: demo1234 (for all 10 seeded staff). Change immediately
 *  after going live with real clinics.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const CONFIRM = process.argv.includes("--confirm");
const STAFF_PASSWORD = "demo1234";

// ─── Load env from .env.local ─────────────────────────────────────────────
function loadEnv() {
  try {
    const raw = readFileSync(resolve(".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    console.error("Couldn't read .env.local from the project root.");
    process.exit(1);
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

// ─── Sample data (Malaysian dental clinic, mirrors sample_data.py) ────────

// Employee numbers — clinic-issued, staff use these to log in.
// Synthetic auth email is `${empNo}@kanan-clinic.local` (matches lib/login-id.ts).
const DOCTORS = [
  { name: "Dr. Lee Chee Hong",  empNo: "1001", slot: 30 },
  { name: "Dr. Sarah Wong",     empNo: "1002", slot: 30 },
  { name: "Dr. Aiman Rashid",   empNo: "1003", slot: 45 },
  { name: "Dr. Tan Mei Yee",    empNo: "1004", slot: 30 },
];

const NURSES = [
  { name: "Norhaiza Binti Ismail", empNo: "2001" },
  { name: "Jenny Tan Hui Mei",     empNo: "2002" },
  { name: "Priya Devi",            empNo: "2003" },
  { name: "Aini Salleh",           empNo: "2004" },
  { name: "Chong Li Wen",          empNo: "2005" },
  { name: "Farah Liyana",          empNo: "2006" },
];

const SYNTH_DOMAIN = "kanan-clinic.local";
function authEmail(empNo) { return `${empNo}@${SYNTH_DOMAIN}`; }

// last_visit_days drives the recall worklist: anyone past their 6-month
// (=183 days) recall_interval shows up as "due" with overdue colour-coding.
const PATIENTS = [
  // Recently visited — NOT on recall yet
  { ic: "950712102245", name: "Lim Hui Ling",              phone: "+60168824471", visits: 2, last_visit_days: 14  },
  { ic: "010305061129", name: "Muhammad Daniel",           phone: "+60112345689", visits: 1, last_visit_days: 5   },
  { ic: "030519093344", name: "Aaron Cheong",              phone: "+60184411122", visits: 1, last_visit_days: 2   },
  { ic: "961122054476", name: "Devi A/P Krishnan",         phone: "+60163309981", visits: 2, last_visit_days: 30  },
  { ic: "850304079912", name: "Nurul Aini Abdullah",       phone: "+60145528821", visits: 6, last_visit_days: 90  },

  // Due / overdue for recall (last visit > 183 days = 6 months)
  { ic: "920311145421", name: "Tan Wei Ming",              phone: "+60122345678", visits: 5, last_visit_days: 195 },
  { ic: "880425083217", name: "Siti Aisyah Binti Hassan",  phone: "+60174551289", visits: 3, last_visit_days: 215 },
  { ic: "770618081188", name: "Ng Boon Keat",              phone: "+60128876655", visits: 7, last_visit_days: 240 },
  { ic: "991108025544", name: "Chong Mei Xuan",            phone: "+60139987765", visits: 4, last_visit_days: 305 },
  { ic: "780921147765", name: "Rajesh A/L Subramaniam",    phone: "+60196640023", visits: 8, last_visit_days: 395 },

  // Extra patients for fuller demo (~15 total)
  { ic: "871015082266", name: "Goh Choon Lai",             phone: "+60123887766", visits: 3, last_visit_days: 21  },
  { ic: "940228145533", name: "Wong Su Lin",               phone: "+60176551144", visits: 4, last_visit_days: 7   },
  { ic: "820507093398", name: "Kuhan A/L Maniam",          phone: "+60195442031", visits: 5, last_visit_days: 250 },
  { ic: "961204023311", name: "Ahmad Faizal Bin Razak",    phone: "+60133229988", visits: 2, last_visit_days: 18  },
  { ic: "750822081144", name: "Chong Pei Ling",            phone: "+60128876654", visits: 9, last_visit_days: 280 },
];

const TREATMENTS = ["Scaling", "Root canal treatment", "Whitening", "Wisdom tooth surgery", "Crown fitting"];

// ─── Helpers ──────────────────────────────────────────────────────────────

function daysAgo(d) { const x = new Date(); x.setDate(x.getDate() - d); return x; }
function daysAhead(d) { const x = new Date(); x.setDate(x.getDate() + d); return x; }
function atTime(date, h, m) { const x = new Date(date); x.setHours(h, m, 0, 0); return x; }

async function findOwner() {
  const { data: owners } = await admin.from("profiles").select("id, full_name, role").eq("role", "owner").eq("active", true);
  if (!owners || owners.length === 0) {
    throw new Error("No active owner found. Create one via the app first, then re-run.");
  }
  return owners[0];
}

async function wipeData(ownerId) {
  console.log("Wiping operational data...");
  const tables = ["audit_log", "bookings", "leave_requests", "duty_shifts", "breaks", "working_hours", "patients"];
  for (const t of tables) {
    const { error } = await admin.from(t).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) console.warn(`  ! ${t}: ${error.message}`);
    else console.log(`  ✓ cleared ${t}`);
  }

  console.log("Wiping non-owner staff (auth + profile + doctors)...");
  // Delete doctors rows first
  await admin.from("doctors").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  // Delete non-owner profiles
  const { data: nonOwners } = await admin.from("profiles").select("id").neq("id", ownerId);
  for (const p of nonOwners || []) {
    await admin.from("profiles").delete().eq("id", p.id);
    await admin.auth.admin.deleteUser(p.id).catch(() => {});
  }
  console.log(`  ✓ removed ${nonOwners?.length || 0} non-owner staff records`);
}

async function createStaff(role, list) {
  const created = [];
  for (const s of list) {
    const email = authEmail(s.empNo);
    const { data: user, error: cErr } = await admin.auth.admin.createUser({
      email,
      password: STAFF_PASSWORD,
      email_confirm: true,
    });
    if (cErr || !user.user) { console.warn(`  ! ${s.empNo}: ${cErr?.message}`); continue; }
    await admin.from("profiles").insert({
      id: user.user.id,
      role,
      full_name: s.name,
      employee_number: s.empNo,
      active: true,
    });
    if (role === "doctor") {
      await admin.from("doctors").insert({
        profile_id: user.user.id,
        display_name: s.name,
        default_slot_minutes: s.slot ?? 30,
        active: true,
      });
    }
    created.push({ ...s, profileId: user.user.id });
    console.log(`  ✓ ${role} ${s.empNo} — ${s.name}`);
  }
  return created;
}

async function seedWorkingHours(doctors) {
  const rows = [];
  for (const doc of doctors) {
    const { data: d } = await admin.from("doctors").select("id").eq("profile_id", doc.profileId).single();
    if (!d) continue;
    for (let weekday = 1; weekday <= 5; weekday++) {           // Mon-Fri
      rows.push({ doctor_id: d.id, weekday, start_time: "09:00", end_time: "18:00" });
    }
    rows.push({ doctor_id: d.id, weekday: 6, start_time: "09:00", end_time: "13:00" });  // Saturday half-day
  }
  await admin.from("working_hours").insert(rows);
  console.log(`  ✓ working hours for ${doctors.length} doctors`);
}

async function seedPatients() {
  const rows = PATIENTS.map((p) => ({
    full_name: p.name,
    nationality: "Malaysia",
    id_type: "ic",
    id_number: p.ic,
    whatsapp_number: p.phone,
    visit_count: p.visits,
    first_seen_at: daysAgo(p.last_visit_days + 30).toISOString(),
    last_visit_at: daysAgo(p.last_visit_days).toISOString(),
    recall_interval_months: 6,
  }));
  const { data } = await admin.from("patients").insert(rows).select("id, full_name");
  console.log(`  ✓ seeded ${data?.length || 0} patients`);
  return data || [];
}

async function seedBookings(doctors, patients, ownerId, nurses) {
  // Get doctor IDs from the doctors table
  const docRows = [];
  for (const d of doctors) {
    const { data } = await admin.from("doctors").select("id, display_name").eq("profile_id", d.profileId).single();
    if (data) docRows.push(data);
  }
  const nurseIds = nurses.map((n) => n.profileId);
  const pIdx = (name) => patients.find((p) => p.full_name === name)?.id;

  const bookings = [];

  // ── PENDING — submitted today, waiting for nurse review
  bookings.push(
    { patient: "Lim Hui Ling",         status: "pending", date: daysAhead(1), time: [9, 0],   doc: 0, treatment: "Scaling" },
    { patient: "Muhammad Daniel",      status: "pending", date: daysAhead(1), time: [11, 0],  doc: 1, treatment: "Wisdom tooth surgery" },
    { patient: "Chong Mei Xuan",       status: "pending", date: daysAhead(1), time: [14, 30], doc: 3, treatment: "Whitening" },
    { patient: "Aaron Cheong",         status: "pending", date: daysAhead(2), time: [10, 30], doc: 0, treatment: "Scaling" },
    { patient: "Devi A/P Krishnan",    status: "pending", date: daysAhead(2), time: [16, 0],  doc: 2, treatment: "Root canal treatment" },
  );

  // ── CONFIRMED — tomorrow, used by Send Reminders
  bookings.push(
    { patient: "Tan Wei Ming",             status: "confirmed", date: daysAhead(1), time: [9, 0],  doc: 0, treatment: "Scaling",        reminder: true,  reminder_by: 1 },
    { patient: "Siti Aisyah Binti Hassan", status: "confirmed", date: daysAhead(1), time: [10, 0], doc: 1, treatment: "Root canal",     reminder: true,  reminder_by: 0 },
    { patient: "Rajesh A/L Subramaniam",   status: "confirmed", date: daysAhead(1), time: [11, 0], doc: 3, treatment: "Crown fitting" },
    { patient: "Nurul Aini Abdullah",      status: "confirmed", date: daysAhead(1), time: [14, 0], doc: 2, treatment: "Wisdom tooth surgery" },
    { patient: "Ng Boon Keat",             status: "confirmed", date: daysAhead(1), time: [15, 30],doc: 1, treatment: "Scaling" },
  );

  // ── CONFIRMED — spread across next 7 days for "upcoming" view
  bookings.push(
    { patient: "Goh Choon Lai",            status: "confirmed", date: daysAhead(2), time: [9, 30], doc: 0, treatment: "Scaling" },
    { patient: "Wong Su Lin",              status: "confirmed", date: daysAhead(2), time: [11, 0], doc: 2, treatment: "Whitening" },
    { patient: "Ahmad Faizal Bin Razak",   status: "confirmed", date: daysAhead(2), time: [14, 30],doc: 1, treatment: "Scaling" },
    { patient: "Devi A/P Krishnan",        status: "confirmed", date: daysAhead(3), time: [10, 0], doc: 3, treatment: "Root canal treatment" },
    { patient: "Aaron Cheong",             status: "confirmed", date: daysAhead(3), time: [15, 30],doc: 0, treatment: "Scaling" },
    { patient: "Muhammad Daniel",          status: "confirmed", date: daysAhead(4), time: [9, 0],  doc: 1, treatment: "Wisdom tooth surgery" },
    { patient: "Tan Wei Ming",             status: "confirmed", date: daysAhead(4), time: [14, 0], doc: 2, treatment: "Crown fitting" },
    { patient: "Chong Pei Ling",           status: "confirmed", date: daysAhead(5), time: [10, 30],doc: 0, treatment: "Scaling" },
    { patient: "Nurul Aini Abdullah",      status: "confirmed", date: daysAhead(5), time: [15, 0], doc: 3, treatment: "Whitening" },
    { patient: "Wong Su Lin",              status: "confirmed", date: daysAhead(6), time: [11, 0], doc: 1, treatment: "Scaling" },
    { patient: "Goh Choon Lai",            status: "confirmed", date: daysAhead(7), time: [9, 30], doc: 2, treatment: "Root canal treatment" },
  );

  // ── ATTENDED — last 30 days, drives analytics
  const past = [
    { name: "Tan Wei Ming",            d: 3,  h: 10, doc: 0, attended_by: 1, treatment: "Scaling" },
    { name: "Siti Aisyah Binti Hassan",d: 5,  h: 14, doc: 1, attended_by: 0, treatment: "Root canal treatment" },
    { name: "Ng Boon Keat",            d: 8,  h: 11, doc: 3, attended_by: 1, treatment: "Crown fitting" },
    { name: "Chong Mei Xuan",          d: 10, h: 15, doc: 2, attended_by: 2, treatment: "Whitening" },
    { name: "Aaron Cheong",            d: 14, h: 9,  doc: 0, attended_by: 1, treatment: "Scaling" },
    { name: "Tan Wei Ming",            d: 20, h: 16, doc: 0, attended_by: 0, treatment: "Scaling" },
    { name: "Nurul Aini Abdullah",     d: 22, h: 10, doc: 2, attended_by: 3, treatment: "Whitening" },
    { name: "Devi A/P Krishnan",       d: 25, h: 13, doc: 1, attended_by: 2, treatment: "Scaling" },
  ];
  for (const p of past) {
    bookings.push({ patient: p.name, status: "confirmed", date: daysAgo(p.d), time: [p.h, 0], doc: p.doc, treatment: p.treatment, attended: true, attended_by: p.attended_by });
  }

  // ── NO-SHOWS — for analytics colour-coding
  bookings.push(
    { patient: "Lim Hui Ling",         status: "confirmed", date: daysAgo(1),  time: [10, 0], doc: 0, treatment: "Scaling",  no_show: true, no_show_by: 0 },
    { patient: "Muhammad Daniel",      status: "confirmed", date: daysAgo(12), time: [15, 0], doc: 1, treatment: "Wisdom tooth surgery", no_show: true, no_show_by: 1 },
  );

  const inserts = [];
  for (const b of bookings) {
    const start = atTime(b.date, b.time[0], b.time[1]);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 30);
    inserts.push({
      patient_id: pIdx(b.patient),
      doctor_id: docRows[b.doc]?.id,
      type: "booking",
      status: b.status,
      slot_start: start.toISOString(),
      slot_end: end.toISOString(),
      visit_reason: b.treatment,
      is_first_time: false,
      reviewed_at: b.status !== "pending" ? new Date(start.getTime() - 86400000).toISOString() : null,
      reviewed_by: b.status !== "pending" ? nurseIds[0] : null,
      attended_at: b.attended ? new Date(start.getTime() + 1800000).toISOString() : null,
      attended_by: b.attended ? nurseIds[b.attended_by] : null,
      no_show: !!b.no_show,
      no_show_at: b.no_show ? new Date(start.getTime() + 3600000).toISOString() : null,
      no_show_by: b.no_show ? nurseIds[b.no_show_by] : null,
      reminder_sent_at: b.reminder ? new Date(Date.now() - 3600000).toISOString() : null,
      reminder_sent_by: b.reminder ? nurseIds[b.reminder_by] : null,
    });
  }
  await admin.from("bookings").insert(inserts);
  console.log(`  ✓ seeded ${inserts.length} bookings`);
}

async function seedAuditLog(ownerId, nurses) {
  const nurseIds = nurses.map((n) => n.profileId);
  const entries = [
    { actor: nurseIds[1], action: "booking_attended",     entity: "booking", offset_min: 12 },
    { actor: nurseIds[0], action: "approve_booking",       entity: "booking", offset_min: 45 },
    { actor: nurseIds[1], action: "patient_recall_sent",  entity: "patient", offset_min: 90 },
    { actor: ownerId,     action: "branding_update",      entity: "clinic_settings", offset_min: 130 },
    { actor: nurseIds[2], action: "booking_no_show",      entity: "booking", offset_min: 240 },
    { actor: nurseIds[0], action: "approve_reschedule",   entity: "booking", offset_min: 300 },
    { actor: nurseIds[1], action: "send_reminder",        entity: "booking", offset_min: 360 },
  ];
  for (let i = 0; i < 20; i++) {
    const t = entries[i % entries.length];
    await admin.from("audit_log").insert({
      actor_id: t.actor,
      action: t.action,
      entity_type: t.entity,
      created_at: new Date(Date.now() - t.offset_min * 60_000 - i * 1200_000).toISOString(),
    });
  }
  console.log(`  ✓ seeded ~20 audit log entries`);
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nKanan clinic-booking demo data seeder`);
  console.log(`Target: ${url}`);
  console.log(`Mode:   ${CONFIRM ? "REAL RUN" : "DRY-RUN (no changes will be made; add --confirm to apply)"}\n`);

  const owner = await findOwner();
  console.log(`Owner preserved: ${owner.full_name} (${owner.id})\n`);

  if (!CONFIRM) {
    console.log("Would wipe + reseed all operational data + non-owner staff.");
    console.log("Would create 4 doctors + 6 nurses with password 'demo1234'.");
    console.log("Would seed 10 patients + ~22 bookings + ~20 audit entries.");
    console.log("\nRe-run with --confirm to apply.");
    return;
  }

  await wipeData(owner.id);
  console.log("");

  console.log("Creating staff...");
  const doctors = await createStaff("doctor", DOCTORS);
  const nurses  = await createStaff("nurse",  NURSES);
  console.log("");

  console.log("Seeding working hours...");
  await seedWorkingHours(doctors);
  console.log("");

  console.log("Seeding patients...");
  const patients = await seedPatients();
  console.log("");

  console.log("Seeding bookings...");
  await seedBookings(doctors, patients, owner.id, nurses);
  console.log("");

  console.log("Seeding audit log...");
  await seedAuditLog(owner.id, nurses);
  console.log("");

  console.log("✓ Done.");
  console.log(`\nStaff logins (employee number + password '${STAFF_PASSWORD}'):`);
  for (const d of DOCTORS) console.log(`  doctor   ${d.empNo}  ${d.name}`);
  for (const n of NURSES)  console.log(`  nurse    ${n.empNo}  ${n.name}`);
  console.log(`  owner    (unchanged — log in with your email as before)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
