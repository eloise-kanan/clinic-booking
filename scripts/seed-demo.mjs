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
import bcrypt from "bcryptjs";

const CONFIRM = process.argv.includes("--confirm");
const STAFF_PASSWORD = "demo1234";
const TERMINAL_PASSWORD = "terminal123";  // owner can change later via /owner/staff

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

// Login IDs derived from full names (algorithm: lib/login-id.ts).
// Synthetic auth email is `${loginId}@kanan-clinic.local`.
// Every staff PIN is the same demo value so the presenter only has to
// remember one number on stage. Change DEMO_PIN below if you want them
// distinct again.
const DEMO_PIN = "123456";

const DOCTORS = [
  { name: "Dr. Lee Chee Hong",  loginId: "cheehong_lee", slot: 30, pin: DEMO_PIN },
  { name: "Dr. Sarah Wong",     loginId: "sarah_wong",   slot: 30, pin: DEMO_PIN },
  { name: "Dr. Aiman Rashid",   loginId: "aiman_rashid", slot: 45, pin: DEMO_PIN },
  { name: "Dr. Tan Mei Yee",    loginId: "meiyee_tan",   slot: 30, pin: DEMO_PIN },
];

const NURSES = [
  { name: "Norhaiza Binti Ismail", loginId: "norhaiza_ismail", pin: DEMO_PIN },
  { name: "Jenny Tan Hui Mei",     loginId: "jenny_tan",       pin: DEMO_PIN },
  { name: "Priya Devi",            loginId: "priya_devi",      pin: DEMO_PIN },
  { name: "Aini Salleh",           loginId: "aini_salleh",     pin: DEMO_PIN },
  { name: "Chong Li Wen",          loginId: "liwen_chong",     pin: DEMO_PIN },
  { name: "Farah Liyana",          loginId: "farah_liyana",    pin: DEMO_PIN },
];

const TERMINAL = { loginId: "terminal", name: "Clinic Terminal" };

const SYNTH_DOMAIN = "kanan-clinic.local";
function authEmail(loginId) { return `${loginId}@${SYNTH_DOMAIN}`; }

// last_visit_days drives the recall worklist: anyone past their 6-month
// (=183 days) recall_interval shows up as "due" with overdue colour-coding.
// Mixed nationalities (Malaysian IC + foreign passports) so the
// nationality filter on /patients has more than one value to show.
const PATIENTS = [
  // ── Malaysian (IC) — recently visited
  { idType: "ic", id: "950712102245", nat: "Malaysia",   name: "Lim Hui Ling",              phone: "+60168824471", visits: 2, last_visit_days: 14  },
  { idType: "ic", id: "010305061129", nat: "Malaysia",   name: "Muhammad Daniel",           phone: "+60112345689", visits: 1, last_visit_days: 5   },
  { idType: "ic", id: "030519093344", nat: "Malaysia",   name: "Aaron Cheong",              phone: "+60184411122", visits: 1, last_visit_days: 2   },
  { idType: "ic", id: "961122054476", nat: "Malaysia",   name: "Devi A/P Krishnan",         phone: "+60163309981", visits: 2, last_visit_days: 30  },
  { idType: "ic", id: "850304079912", nat: "Malaysia",   name: "Nurul Aini Abdullah",       phone: "+60145528821", visits: 6, last_visit_days: 90  },

  // ── Malaysian (IC) — due / overdue for recall (last visit > 6 months)
  { idType: "ic", id: "920311145421", nat: "Malaysia",   name: "Tan Wei Ming",              phone: "+60122345678", visits: 5, last_visit_days: 195 },
  { idType: "ic", id: "880425083217", nat: "Malaysia",   name: "Siti Aisyah Binti Hassan",  phone: "+60174551289", visits: 3, last_visit_days: 215 },
  { idType: "ic", id: "770618081188", nat: "Malaysia",   name: "Ng Boon Keat",              phone: "+60128876655", visits: 7, last_visit_days: 240 },
  { idType: "ic", id: "991108025544", nat: "Malaysia",   name: "Chong Mei Xuan",            phone: "+60139987765", visits: 4, last_visit_days: 305 },
  { idType: "ic", id: "780921147765", nat: "Malaysia",   name: "Rajesh A/L Subramaniam",    phone: "+60196640023", visits: 8, last_visit_days: 395 },

  // ── Malaysian (IC) — extra
  { idType: "ic", id: "871015082266", nat: "Malaysia",   name: "Goh Choon Lai",             phone: "+60123887766", visits: 3, last_visit_days: 21  },
  { idType: "ic", id: "940228145533", nat: "Malaysia",   name: "Wong Su Lin",               phone: "+60176551144", visits: 4, last_visit_days: 7   },
  { idType: "ic", id: "820507093398", nat: "Malaysia",   name: "Kuhan A/L Maniam",          phone: "+60195442031", visits: 5, last_visit_days: 250 },
  { idType: "ic", id: "961204023311", nat: "Malaysia",   name: "Ahmad Faizal Bin Razak",    phone: "+60133229988", visits: 2, last_visit_days: 18  },
  { idType: "ic", id: "750822081144", nat: "Malaysia",   name: "Chong Pei Ling",            phone: "+60128876654", visits: 9, last_visit_days: 280 },

  // ── Foreign nationals (passport) — common in JB / KL clinics
  { idType: "passport", id: "K1234567A", nat: "Singapore",   name: "Lee Wei Jie",            phone: "+6591234567",  visits: 2, last_visit_days: 11  },
  { idType: "passport", id: "K7654321B", nat: "Singapore",   name: "Tan Yi Ling",            phone: "+6598765432",  visits: 1, last_visit_days: 200 },
  { idType: "passport", id: "C8810231",  nat: "Indonesia",   name: "Sari Wulandari",         phone: "+628123456789",visits: 3, last_visit_days: 60  },
  { idType: "passport", id: "C5523109",  nat: "Indonesia",   name: "Budi Santoso",           phone: "+628567890123",visits: 1, last_visit_days: 8   },
  { idType: "passport", id: "P1100392A", nat: "Philippines", name: "Maria Cruz Santos",      phone: "+639175552024",visits: 2, last_visit_days: 45  },
  { idType: "passport", id: "E12345678", nat: "China",       name: "Liu Mei Hua",            phone: "+8613912345678",visits: 1, last_visit_days: 4   },
  { idType: "passport", id: "Z3478912",  nat: "India",       name: "Arjun Sharma",           phone: "+919812345678", visits: 4, last_visit_days: 220 },
  { idType: "passport", id: "Y9921144",  nat: "Bangladesh",  name: "Rahman Hossain",         phone: "+8801712345678",visits: 2, last_visit_days: 16  },
];

const TREATMENTS = ["Scaling", "Root canal treatment", "Whitening", "Wisdom tooth surgery", "Crown fitting", "Consultation", "Filling", "Extraction"];

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

// Delete every row from a table. Robust to id-type differences (some tables
// have UUID ids, some are SERIAL int — the previous `.neq("id", uuid)` hack
// silently failed on int-id tables, leaving stale rows that broke re-seeds).
async function deleteAll(table) {
  // Pull every id, then delete in chunks via .in() — works for any id type.
  const { data, error } = await admin.from(table).select("id");
  if (error) { console.warn(`  ! ${table} (read): ${error.message}`); return; }
  if (!data?.length) { console.log(`  ✓ ${table} already empty`); return; }
  const ids = data.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const { error: dErr } = await admin.from(table).delete().in("id", chunk);
    if (dErr) { console.warn(`  ! ${table} (delete): ${dErr.message}`); return; }
  }
  console.log(`  ✓ cleared ${ids.length} from ${table}`);
}

async function wipeData(ownerId) {
  console.log("Wiping operational data...");
  // Order matters — FKs cascade upward
  const tables = ["audit_log", "bookings", "leave_requests", "duty_shifts", "breaks", "working_hours", "patients"];
  for (const t of tables) await deleteAll(t);

  console.log("Wiping non-owner staff (auth + profile + doctors)...");
  // Delete doctors rows first
  await admin.from("doctors").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  // Delete non-owner profiles
  const { data: nonOwners } = await admin.from("profiles").select("id").neq("id", ownerId);
  for (const p of nonOwners || []) {
    await admin.from("profiles").delete().eq("id", p.id);
    await admin.auth.admin.deleteUser(p.id).catch(() => {});
  }
  console.log(`  ✓ removed ${nonOwners?.length || 0} non-owner profiles`);

  // Also clean up orphan synthetic auth users — these get left behind when
  // a prior seed run created the auth user but failed before/at the profile
  // insert (e.g. the login_id column hadn't been migrated yet).
  let orphans = 0;
  let page = 1;
  while (true) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (!data?.users?.length) break;
    for (const u of data.users) {
      if (u.email?.endsWith("@kanan-clinic.local")) {
        await admin.auth.admin.deleteUser(u.id).catch(() => {});
        orphans++;
      }
    }
    if (data.users.length < 100) break;
    page++;
  }
  if (orphans) console.log(`  ✓ removed ${orphans} orphan synthetic auth user(s)`);
}

async function createStaff(role, list) {
  const created = [];
  for (const s of list) {
    const email = authEmail(s.loginId);
    const { data: user, error: cErr } = await admin.auth.admin.createUser({
      email,
      password: STAFF_PASSWORD,
      email_confirm: true,
    });
    if (cErr || !user.user) {
      throw new Error(`Auth create failed for ${s.loginId}: ${cErr?.message}`);
    }
    const profileRow = {
      id: user.user.id,
      role,
      full_name: s.name,
      login_id: s.loginId,
      active: true,
    };
    // Set demo PIN for nurse/doctor (hash with bcrypt — same as the runtime
    // helper uses). Owner has no PIN; terminal authenticates by password.
    if (s.pin) {
      profileRow.pin_hash = await bcrypt.hash(s.pin, 10);
      profileRow.pin_set_at = new Date().toISOString();
    }
    const { error: pErr } = await admin.from("profiles").insert(profileRow);
    if (pErr) {
      await admin.auth.admin.deleteUser(user.user.id).catch(() => {});
      throw new Error(`Profile insert failed for ${s.loginId}: ${pErr.message}. Did the login_id + terminal_pin migrations run?`);
    }
    if (role === "doctor") {
      const { error: dErr } = await admin.from("doctors").insert({
        profile_id: user.user.id,
        display_name: s.name,
        default_slot_minutes: s.slot ?? 30,
        active: true,
      });
      if (dErr) throw new Error(`Doctor insert failed for ${s.loginId}: ${dErr.message}`);
    }
    created.push({ ...s, profileId: user.user.id });
    console.log(`  ✓ ${role.padEnd(7)} ${s.loginId.padEnd(20)} ${s.name}${s.pin ? "  PIN " + s.pin : ""}`);
  }
  return created;
}

async function createTerminal() {
  const email = authEmail(TERMINAL.loginId);
  const { data: user, error: cErr } = await admin.auth.admin.createUser({
    email,
    password: TERMINAL_PASSWORD,
    email_confirm: true,
  });
  if (cErr || !user.user) {
    throw new Error(`Terminal auth create failed: ${cErr?.message}`);
  }
  const { error: pErr } = await admin.from("profiles").insert({
    id: user.user.id,
    role: "terminal",
    full_name: TERMINAL.name,
    login_id: TERMINAL.loginId,
    active: true,
  });
  if (pErr) {
    await admin.auth.admin.deleteUser(user.user.id).catch(() => {});
    throw new Error(`Terminal profile insert failed: ${pErr.message}. Did the terminal_pin migration run?`);
  }
  console.log(`  ✓ terminal ${TERMINAL.loginId.padEnd(20)} ${TERMINAL.name}  pwd "${TERMINAL_PASSWORD}"`);
  return user.user.id;
}

async function seedWorkingHours(doctors) {
  // A DB trigger auto-creates default 09:00–21:00 rows for every weekday
  // when a doctor is inserted. We delete those first, then insert our
  // demo-friendly schedule (Mon–Fri 09–18, Sat 09–13, closed Sun).
  for (const doc of doctors) {
    const { data: d } = await admin.from("doctors").select("id").eq("profile_id", doc.profileId).single();
    if (!d) continue;
    // Drop trigger-created defaults for this doctor
    const { data: existing } = await admin.from("working_hours").select("id").eq("doctor_id", d.id);
    if (existing?.length) {
      await admin.from("working_hours").delete().in("id", existing.map((r) => r.id));
    }
  }

  const rows = [];
  for (const doc of doctors) {
    const { data: d } = await admin.from("doctors").select("id").eq("profile_id", doc.profileId).single();
    if (!d) continue;
    for (let weekday = 1; weekday <= 5; weekday++) {           // Mon-Fri
      rows.push({ doctor_id: d.id, weekday, start_time: "09:00", end_time: "18:00" });
    }
    rows.push({ doctor_id: d.id, weekday: 6, start_time: "09:00", end_time: "13:00" });  // Saturday half-day
    // Sunday left out → closed
  }
  const { error } = await admin.from("working_hours").insert(rows);
  if (error) throw new Error(`Working hours insert failed: ${error.message}`);
  console.log(`  ✓ working hours for ${doctors.length} doctors (Mon–Fri 09–18, Sat 09–13, closed Sun)`);
}

async function seedPatients() {
  const rows = PATIENTS.map((p) => ({
    full_name: p.name,
    nationality: p.nat,
    id_type: p.idType,
    id_number: p.id,
    whatsapp_number: p.phone,
    visit_count: p.visits,
    first_seen_at: daysAgo(p.last_visit_days + 30).toISOString(),
    last_visit_at: daysAgo(p.last_visit_days).toISOString(),
    recall_interval_months: 6,
  }));
  const { error } = await admin.from("patients").insert(rows);
  if (error) throw new Error(`Patients insert failed: ${error.message}`);
  // Re-query to get IDs reliably (insert().select() can return null under some RLS configs)
  const { data: fresh, error: rErr } = await admin.from("patients").select("id, full_name");
  if (rErr) throw new Error(`Patients read-back failed: ${rErr.message}`);
  console.log(`  ✓ seeded ${fresh?.length || 0} patients (${new Set(PATIENTS.map((p) => p.nat)).size} nationalities)`);
  return fresh || [];
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

  // Programmatic generator — distributes bookings across past 4 weeks
  // (mostly attended, some no-shows) and next 4 weeks (mix of confirmed
  // + pending, denser closer to today). Avoids slot collisions by
  // tracking (doctor, slot_start) keys.
  const HOURS = [9, 10, 11, 14, 15, 16, 17];
  const MINUTES = [0, 30];
  const rng = (() => {
    // Tiny LCG seeded with a fixed value so seed runs are reproducible
    // within a single demo session — re-running the script gives the
    // same data layout, which makes screenshots stable.
    let s = 1234567;
    return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  })();
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  const bookings = [];
  const usedSlots = new Set(); // `${docIndex}|${ISO}`

  function tryAdd(entry) {
    const start = atTime(entry.date, entry.time[0], entry.time[1]);
    const key = `${entry.doc}|${start.toISOString()}`;
    if (usedSlots.has(key)) return false;
    usedSlots.add(key);
    bookings.push(entry);
    return true;
  }

  function generateForDay(dayOffset, isPast, count) {
    const date = isPast ? daysAgo(dayOffset) : daysAhead(dayOffset);
    // Skip Sundays — clinic closed.
    if (date.getDay() === 0) return;
    let attempts = 0;
    let placed = 0;
    while (placed < count && attempts < 50) {
      attempts++;
      const doc = Math.floor(rng() * docRows.length);
      const time = [pick(HOURS), pick(MINUTES)];
      const patient = pick(patients);
      const treatment = pick(TREATMENTS);

      let status = "confirmed";
      let attended = false;
      let no_show = false;
      let reminder = false;

      if (isPast) {
        // 88% attended, 8% no-show, 4% cancelled (skip — keeps the
        // pending+confirmed unique index happy without status churn).
        const r = rng();
        if (r < 0.88) attended = true;
        else if (r < 0.96) no_show = true;
        else continue;
      } else {
        // Future: ~30% pending if within next 3 days, otherwise confirmed.
        // Reminders pre-sent on some next-day bookings.
        if (dayOffset <= 3 && rng() < 0.3) status = "pending";
        if (status === "confirmed" && dayOffset === 1 && rng() < 0.5) reminder = true;
      }

      const added = tryAdd({
        patient: patient.full_name,
        status,
        date,
        time,
        doc,
        treatment,
        attended,
        attended_by: attended ? Math.floor(rng() * nurses.length) : null,
        no_show,
        no_show_by: no_show ? Math.floor(rng() * nurses.length) : null,
        reminder,
        reminder_by: reminder ? Math.floor(rng() * nurses.length) : null,
      });
      if (added) placed++;
    }
  }

  // Past 4 weeks — denser early in the week, lighter on weekends.
  for (let d = 28; d >= 1; d--) {
    const date = daysAgo(d);
    const isWeekend = date.getDay() === 6 || date.getDay() === 0;
    generateForDay(d, true, isWeekend ? 2 : 5);
  }

  // Today + next 4 weeks — denser close to today (kiosk needs filled rows).
  for (let d = 0; d <= 28; d++) {
    const date = daysAhead(d);
    const isWeekend = date.getDay() === 6 || date.getDay() === 0;
    const count = d <= 2 ? 6 : d <= 7 ? 5 : isWeekend ? 1 : 3;
    generateForDay(d, false, count);
  }

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
  // Guard against undefined patient_id or doctor_id (would cause batch insert to silently fail)
  const bad = inserts.filter((r) => !r.patient_id || !r.doctor_id);
  if (bad.length) {
    console.error("  ! some bookings have missing patient_id or doctor_id:", bad.slice(0, 3));
    throw new Error(`${bad.length} booking rows had missing FK — patient or doctor lookup failed`);
  }
  // Pre-flight: catch (doctor_id, slot_start) duplicates among the rows we're
  // about to insert — bookings_no_overlap_idx enforces uniqueness on
  // pending/confirmed bookings and the Postgres error doesn't tell you which row.
  const seen = new Map();
  for (const r of inserts) {
    if (r.status === "cancelled") continue;
    const key = `${r.doctor_id}|${r.slot_start}`;
    if (seen.has(key)) {
      console.error("  ! overlap in seed data:", { docId: r.doctor_id.slice(0, 8), slot: r.slot_start, first: seen.get(key), second: r.visit_reason });
      throw new Error("Two seeded bookings target the same doctor at the same slot_start (would violate bookings_no_overlap_idx).");
    }
    seen.set(key, r.visit_reason);
  }
  const { error } = await admin.from("bookings").insert(inserts);
  if (error) throw new Error(`Bookings insert failed: ${error.message}`);
  console.log(`  ✓ seeded ${inserts.length} bookings`);
}

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function seedLeaveRequests(ownerId, doctors, nurses) {
  // Mix of statuses + leave types so the HR approvals page and the leave
  // history widgets both have realistic data to render.
  const all = [...doctors, ...nurses];
  const rows = [
    // ── PENDING — these surface on /owner/hr-approvals
    {
      profile_id: doctors[2].profileId,
      start_date: ymd(daysAhead(10)),
      end_date: ymd(daysAhead(12)),
      reason: "Family event in Penang",
      leave_type: "annual",
      status: "pending",
    },
    {
      profile_id: nurses[2].profileId,
      start_date: ymd(daysAhead(4)),
      end_date: ymd(daysAhead(4)),
      reason: "Specialist appointment",
      leave_type: "mc",
      status: "pending",
    },

    // ── APPROVED (past)
    {
      profile_id: doctors[1].profileId,
      start_date: ymd(daysAgo(10)),
      end_date: ymd(daysAgo(8)),
      reason: "Annual leave",
      leave_type: "annual",
      status: "approved",
      reviewed_at: daysAgo(15).toISOString(),
      reviewed_by: ownerId,
    },
    {
      profile_id: nurses[0].profileId,
      start_date: ymd(daysAgo(20)),
      end_date: ymd(daysAgo(20)),
      reason: "Fever",
      leave_type: "mc",
      status: "approved",
      reviewed_at: daysAgo(20).toISOString(),
      reviewed_by: ownerId,
    },

    // ── APPROVED (future) — blocks the doctor calendar
    {
      profile_id: doctors[3].profileId,
      start_date: ymd(daysAhead(18)),
      end_date: ymd(daysAhead(18)),
      reason: "Conference",
      leave_type: "annual",
      status: "approved",
      reviewed_at: daysAgo(3).toISOString(),
      reviewed_by: ownerId,
    },

    // ── REJECTED
    {
      profile_id: nurses[4].profileId,
      start_date: ymd(daysAhead(2)),
      end_date: ymd(daysAhead(2)),
      reason: "Late notice",
      leave_type: "annual",
      status: "rejected",
      reviewed_at: daysAgo(1).toISOString(),
      reviewed_by: ownerId,
      reviewer_notes: "Too short notice. Reschedule if possible.",
    },
    // ── EMERGENCY (auto-flagged)
    {
      profile_id: nurses[3].profileId,
      start_date: ymd(daysAgo(2)),
      end_date: ymd(daysAgo(2)),
      reason: "Family emergency",
      leave_type: "emergency",
      status: "approved",
      reviewed_at: daysAgo(2).toISOString(),
      reviewed_by: ownerId,
    },
  ];
  const { data, error } = await admin.from("leave_requests").insert(rows).select("id, profile_id, status, start_date, end_date, reason");
  if (error) throw new Error(`Leave requests insert failed: ${error.message}`);

  // Mirror the API behaviour: for each APPROVED leave belonging to a doctor,
  // also insert a breaks row so the doctor calendar correctly greys out
  // the leave dates (otherwise the doctor's column would still look open).
  const docMap = new Map();
  for (const d of doctors) {
    const { data: dr } = await admin.from("doctors").select("id").eq("profile_id", d.profileId).single();
    if (dr) docMap.set(d.profileId, dr.id);
  }
  const breakRows = [];
  for (const r of data || []) {
    if (r.status !== "approved" || !docMap.has(r.profile_id)) continue;
    breakRows.push({
      doctor_id: docMap.get(r.profile_id),
      start_at: new Date(`${r.start_date}T00:00:00+08:00`).toISOString(),
      end_at: new Date(`${r.end_date}T23:59:59+08:00`).toISOString(),
      reason: `On leave${r.reason ? ` (${r.reason})` : ""}`,
      leave_id: r.id,
    });
  }
  if (breakRows.length > 0) {
    const { error: brErr } = await admin.from("breaks").insert(breakRows);
    if (brErr) console.warn(`  ! breaks insert failed: ${brErr.message}`);
  }
  console.log(`  ✓ seeded ${rows.length} leave requests (${breakRows.length} mirrored to breaks)`);
}

async function seedShiftRequests(ownerId, doctors, nurses) {
  // Same pattern — mix of statuses + one permanent for the variety.
  const rows = [
    // ── PENDING
    {
      profile_id: doctors[0].profileId,
      shift_date: ymd(daysAhead(5)),
      start_time: "11:00",
      end_time: "18:00",
      notes: "Hospital visit in the morning",
      is_permanent: false,
      status: "pending",
    },
    {
      profile_id: nurses[1].profileId,
      shift_date: ymd(daysAhead(7)),
      start_time: "09:00",
      end_time: "13:00",
      notes: "Half day — school event",
      is_permanent: false,
      status: "pending",
    },
    {
      profile_id: doctors[2].profileId,
      shift_date: ymd(daysAhead(14)),
      start_time: "10:00",
      end_time: "17:00",
      notes: "New default — shifting Tuesdays earlier",
      is_permanent: true,
      status: "pending",
    },

    // ── APPROVED (past)
    {
      profile_id: nurses[0].profileId,
      shift_date: ymd(daysAgo(7)),
      start_time: "10:00",
      end_time: "19:00",
      notes: "School run cover",
      is_permanent: false,
      status: "approved",
      reviewed_at: daysAgo(10).toISOString(),
      reviewed_by: ownerId,
    },
    {
      profile_id: doctors[1].profileId,
      shift_date: ymd(daysAhead(3)),
      start_time: "14:00",
      end_time: "21:00",
      notes: "Cover evening clinic",
      is_permanent: false,
      status: "approved",
      reviewed_at: daysAgo(2).toISOString(),
      reviewed_by: ownerId,
    },

    // ── REJECTED
    {
      profile_id: nurses[5].profileId,
      shift_date: ymd(daysAhead(2)),
      start_time: "13:00",
      end_time: "17:00",
      notes: "Need shorter day",
      is_permanent: false,
      status: "rejected",
      reviewed_at: daysAgo(1).toISOString(),
      reviewed_by: ownerId,
      reviewer_notes: "No cover available.",
    },
  ];
  const { error } = await admin.from("duty_shifts").insert(rows);
  if (error) throw new Error(`Duty shifts insert failed: ${error.message}`);
  console.log(`  ✓ seeded ${rows.length} shift change requests`);
}

async function seedAuditLog(ownerId, nurses) {
  const nurseIds = nurses.map((n) => n.profileId);
  // Each entry includes before_data / after_data so the audit log UI has
  // something to display when expanded — matches what the live endpoints
  // store today (status transitions, attendance marks, etc.).
  const entries = [
    {
      actor: nurseIds[1], action: "booking_attended", entity: "booking", offset_min: 12,
      after: { mark: "attended", via_terminal: true },
    },
    {
      actor: nurseIds[0], action: "approve_booking", entity: "booking", offset_min: 45,
      after: { status: "confirmed", via_terminal: false },
    },
    {
      actor: nurseIds[1], action: "patient_recall_sent", entity: "patient", offset_min: 90,
      after: { via_terminal: false },
    },
    {
      actor: ownerId, action: "branding_update", entity: "clinic_settings", offset_min: 130,
      after: { primary_color: "#0d9488", font_family: "Inter" },
    },
    {
      actor: nurseIds[2], action: "booking_no_show", entity: "booking", offset_min: 240,
      after: { mark: "no_show", via_terminal: false },
    },
    {
      actor: nurseIds[0], action: "approve_reschedule", entity: "booking", offset_min: 300,
      after: { status: "confirmed", via_terminal: false },
    },
    {
      actor: nurseIds[1], action: "send_reminder", entity: "booking", offset_min: 360,
      after: { via_terminal: false },
    },
    {
      actor: ownerId, action: "owner_override", entity: "booking", offset_min: 500,
      before: { status: "pending" }, after: { status: "confirmed", notes: "Owner approved by phone" },
    },
    {
      actor: nurseIds[0], action: "staff_cancel", entity: "booking", offset_min: 720,
      before: { status: "confirmed" }, after: { status: "cancelled", notes: "patient called", via_terminal: false },
    },
  ];
  for (let i = 0; i < 20; i++) {
    const t = entries[i % entries.length];
    await admin.from("audit_log").insert({
      actor_id: t.actor,
      action: t.action,
      entity_type: t.entity,
      before_data: t.before || null,
      after_data: t.after || null,
      created_at: new Date(Date.now() - t.offset_min * 60_000 - i * 1200_000).toISOString(),
    });
  }
  console.log(`  ✓ seeded ~20 audit log entries with before/after data`);
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
    console.log(`Would seed ${PATIENTS.length} patients (${new Set(PATIENTS.map((p) => p.nat)).size} nationalities, IC + passport).`);
    console.log("Would seed ~150 bookings spanning past 4 weeks → next 4 weeks.");
    console.log("Would seed 7 leave requests + 6 shift change requests (mix of pending/approved/rejected).");
    console.log("Would seed ~20 audit entries.");
    console.log("\nRe-run with --confirm to apply.");
    return;
  }

  await wipeData(owner.id);
  console.log("");

  console.log("Creating staff...");
  const doctors = await createStaff("doctor", DOCTORS);
  const nurses  = await createStaff("nurse",  NURSES);
  await createTerminal();
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

  console.log("Seeding leave requests...");
  await seedLeaveRequests(owner.id, doctors, nurses);
  console.log("");

  console.log("Seeding shift change requests...");
  await seedShiftRequests(owner.id, doctors, nurses);
  console.log("");

  console.log("Seeding audit log...");
  await seedAuditLog(owner.id, nurses);
  console.log("");

  console.log("✓ Done.");
  console.log(`\nClinic terminal (shared reception sign-in):`);
  console.log(`  identifier: terminal`);
  console.log(`  password:   ${TERMINAL_PASSWORD}`);

  console.log(`\nIndividual logins (login ID + password '${STAFF_PASSWORD}', + 6-digit PIN for actions):`);
  for (const d of DOCTORS) console.log(`  doctor   ${d.loginId.padEnd(20)} PIN ${d.pin}  ${d.name}`);
  for (const n of NURSES)  console.log(`  nurse    ${n.loginId.padEnd(20)} PIN ${n.pin}  ${n.name}`);
  console.log(`  owner    (unchanged — log in with your email as before; no PIN)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
