# Clinic Booking System

A complete appointment booking system for a small clinic with 3–5 doctors. Patients book online via a public form, a nurse manually verifies each request via WhatsApp, doctors see only their own calendar, and the owner has full visibility plus override powers.

## What's in here

- **Public booking form** at `/book` — Booking, Reschedule, and Cancellation flows. Shows only available slots. Validates Malaysian IC or foreign passport. Confirms via on-screen message that the nurse will follow up within 24h.
- **Nurse dashboard** at `/nurse` — pending queue with one-tap WhatsApp links (`wa.me`) for "Check with patient", "Send confirmation", and "Send rejection". Approve/Reject buttons update the database. Plus all-doctor calendar view and patient list.
- **Doctor view** at `/doctor` — own calendar only, today's appointments, and a tool to block out time (lunch, MC, conferences).
- **Owner dashboard** at `/owner` — overview metrics, doctor utilization heatmap (last 30 days), patient demographics by nationality and visit frequency, all bookings with override controls, and staff account management.

No WhatsApp API costs — every patient message goes through the nurse's own WhatsApp via pre-filled `wa.me` links. The system never sends a message itself.

## Tech stack

- **Next.js 15** (App Router, Server Components)
- **Supabase** — Postgres + Auth + Row Level Security
- **Tailwind CSS** for styling
- **TypeScript** throughout

## Setup — step by step

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project. The free tier handles your volume comfortably.
2. Note down the project URL, anon key, and service role key (Project Settings → API).

### 2. Run the database migration

In the Supabase dashboard, open the SQL Editor and run the contents of `supabase/migration.sql`. This creates:
- All tables (profiles, doctors, working_hours, breaks, patients, bookings, audit_log)
- The `available_slots()` function that powers the public form's slot picker
- All Row Level Security policies (doctors see only own data; nurses see all bookings; owner sees everything)

Then run `supabase/seed.sql` to add 3 sample doctors with Mon–Sat working hours (9am–1pm, 2pm–6pm, 7pm–9pm with lunch and dinner breaks already implicit in the gaps).

### 3. Create your owner account

In Supabase Authentication → Users → Add user, create a user with your email. Then in the SQL Editor:

```sql
insert into profiles (id, role, full_name)
values ('paste-the-user-id-here', 'owner', 'Your Name');
```

You can now log in at `/login` and create the rest of your staff (nurses, doctors) from the **Doctors & nurses** page in the owner dashboard.

### 4. Link doctor profiles to seed doctors (optional)

The seed inserted 3 doctors with no profile link. Once you create doctor users from the staff page, those will be brand-new doctors. To use the seeded ones, either delete them and re-add via the UI, or run:

```sql
update doctors set profile_id = 'doctor-user-id' where display_name = 'Dr Lim Hui Ying';
```

### 5. Local development

```bash
npm install
cp .env.example .env.local
# Fill in your Supabase URL and keys in .env.local
npm run dev
```

Visit:
- `http://localhost:3000/book` — public booking form
- `http://localhost:3000/login` — staff login

### 6. Deploy to Vercel

```bash
git init && git add . && git commit -m "Initial"
git remote add origin <your-repo>
git push -u origin main
```

Then on Vercel:
1. Import the GitHub repo
2. Add environment variables (same as `.env.example`)
3. Deploy

Total cost on free tiers: ~RM 5/month for a domain, everything else free until you outgrow Supabase's 500MB database (you won't, soon).

## Optional: auto-expire stale pending bookings

The migration includes a function `expire_stale_bookings()` that marks bookings older than 24h as expired. To run it daily, set up a Supabase scheduled function (Edge Functions → cron) or hit it from any cron service:

```sql
select expire_stale_bookings();
```

It also runs opportunistically every time someone queries `available_slots()`, so this is a safety net more than a hard requirement.

## How the slot logic works

The `available_slots(doctor_id, date)` Postgres function returns only slots that:
1. Fall within the doctor's working hours for that weekday
2. Don't overlap any existing booking (status pending or confirmed)
3. Don't overlap any recurring break (lunch, dinner, etc.)
4. Don't overlap any one-off block (MC, conference)
5. Are not in the past

This means the patient never sees a slot they can't book. A unique partial index on `(doctor_id, slot_start) where status in ('pending','confirmed')` also guarantees no two patients can grab the same slot — the second one gets a 409 Conflict and is told to pick again.

## How the WhatsApp flow works

1. Patient submits the form → `bookings` row created with status `pending`, expires in 24h.
2. Nurse opens `/nurse`, sees the pending card.
3. Nurse taps **Check with patient on WhatsApp** → opens her own WhatsApp at `wa.me/<patient-phone>?text=<verification message>` (templates in `lib/utils.ts`).
4. Patient replies on WhatsApp directly to the nurse — outside the app.
5. Nurse comes back, taps **Approve** or **Reject** in the app.
6. Nurse taps **Send confirmation** (or **Send rejection**) → opens WhatsApp again with the appropriate template pre-filled.
7. Calendar updates, audit log entry written.

No Meta API setup. No per-message charges. Templates are in English and live in `lib/utils.ts` — edit them in one place to retune wording.

## Customization

- **Clinic name**: set `NEXT_PUBLIC_CLINIC_NAME` in `.env.local`. Appears on the form and in WhatsApp templates.
- **Doctor working hours**: update via `working_hours` table or build a UI for it.
- **Slot length per doctor**: each doctor has `default_slot_minutes` (15/30/45/60). Set in the staff creation form.
- **WhatsApp message wording**: edit `lib/utils.ts` (`tplCheck`, `tplConfirmBooking`, etc.).
- **Nationality dropdown**: edit the options in `app/book/BookingForm.tsx`.

## Things to add later

- Browser push notifications when a new booking lands (PWA + service worker)
- Multi-language WhatsApp templates (BM/Chinese)
- SMS fallback for patients without WhatsApp
- Patient self-service portal to reschedule without nurse approval after first visit
- Email confirmation alongside WhatsApp
- Doctor-specific working hours editor in the owner UI
- No-show tracking with auto-flag after N missed appointments
