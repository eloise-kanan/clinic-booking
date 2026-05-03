-- ============================================================
-- Clinic Booking System — Supabase migration
-- Run this in Supabase SQL editor (or via the CLI)
-- ============================================================

-- 1. ENUMS
create type user_role as enum ('owner', 'nurse', 'doctor');
create type id_type as enum ('ic', 'passport');
create type booking_type as enum ('booking', 'reschedule', 'cancellation');
create type booking_status as enum ('pending', 'confirmed', 'rejected', 'cancelled', 'expired');

-- 2. PROFILES (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  full_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. DOCTORS
create table doctors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references profiles(id) on delete set null,
  display_name text not null,
  default_slot_minutes int not null default 30 check (default_slot_minutes in (15, 30, 45, 60)),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4. WORKING HOURS (per weekday, 0=Sunday..6=Saturday)
create table working_hours (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references doctors(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  unique (doctor_id, weekday, start_time)
);

-- 5. BREAKS / BLOCKED TIME (lunch, dinner, MC, etc.)
create table breaks (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references doctors(id) on delete cascade,
  -- For recurring breaks: weekday + start_time + end_time (start_at/end_at NULL)
  -- For one-off blocks: start_at + end_at (weekday NULL)
  weekday int check (weekday between 0 and 6),
  start_time time,
  end_time time,
  start_at timestamptz,
  end_at timestamptz,
  reason text,
  created_at timestamptz not null default now(),
  check (
    (weekday is not null and start_time is not null and end_time is not null and start_at is null)
    or
    (start_at is not null and end_at is not null and weekday is null)
  )
);

-- 6. PATIENTS
create table patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  nationality text not null default 'Malaysian',
  id_type id_type not null,
  id_number text not null,
  whatsapp_number text not null,
  first_seen_at timestamptz not null default now(),
  visit_count int not null default 0,
  unique (id_type, id_number)
);

create index patients_whatsapp_idx on patients(whatsapp_number);

-- 7. BOOKINGS
create table bookings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete restrict,
  doctor_id uuid not null references doctors(id) on delete restrict,
  type booking_type not null default 'booking',
  status booking_status not null default 'pending',
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  visit_reason text,
  is_first_time boolean not null default false,
  parent_booking_id uuid references bookings(id) on delete set null,
  -- Lifecycle tracking
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewer_notes text,
  check (slot_end > slot_start)
);

create index bookings_doctor_slot_idx on bookings(doctor_id, slot_start) where status in ('pending','confirmed');
create index bookings_status_idx on bookings(status);
create index bookings_patient_idx on bookings(patient_id);

-- Prevent overlapping pending/confirmed bookings on the same doctor
-- Cancellation requests share a slot with their parent, so they're excluded
create unique index bookings_no_overlap_idx
  on bookings(doctor_id, slot_start)
  where status in ('pending', 'confirmed') and type <> 'cancellation';

-- 8. AUDIT LOG (owner overrides etc.)
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-expire pending bookings older than 24h (call periodically via cron)
create or replace function expire_stale_bookings()
returns void
language plpgsql
security definer
as $$
begin
  update bookings
  set status = 'expired'
  where status = 'pending'
    and expires_at < now();
end;
$$;

-- Compute available slots for a doctor on a given date
-- p_slot_minutes overrides the doctor's default_slot_minutes when provided
-- (used by the public form to size slots by the patient's selected treatment).
drop function if exists available_slots(uuid, date);

create or replace function available_slots(
  p_doctor_id uuid,
  p_date date,
  p_slot_minutes int default null
)
returns table(slot_start timestamptz, slot_end timestamptz)
language plpgsql
volatile
set timezone to 'Asia/Kuala_Lumpur'
as $$
declare
  v_weekday int;
  v_slot_minutes int;
  v_wh record;
  v_cursor timestamptz;
  v_slot_end timestamptz;
begin
  perform expire_stale_bookings();

  v_weekday := extract(dow from p_date);
  if p_slot_minutes is not null and p_slot_minutes > 0 then
    v_slot_minutes := p_slot_minutes;
  else
    select default_slot_minutes into v_slot_minutes from doctors where id = p_doctor_id;
  end if;

  if v_slot_minutes is null then return; end if;

  for v_wh in
    select start_time, end_time
    from working_hours
    where doctor_id = p_doctor_id and weekday = v_weekday
    order by start_time
  loop
    v_cursor := (p_date::text || ' ' || v_wh.start_time::text)::timestamptz;
    while v_cursor + (v_slot_minutes || ' minutes')::interval <= (p_date::text || ' ' || v_wh.end_time::text)::timestamptz loop
      v_slot_end := v_cursor + (v_slot_minutes || ' minutes')::interval;

      -- Skip if overlaps any active booking
      if not exists (
        select 1 from bookings bk
        where bk.doctor_id = p_doctor_id
          and bk.status in ('pending','confirmed')
          and tstzrange(bk.slot_start, bk.slot_end, '[)') && tstzrange(v_cursor, v_slot_end, '[)')
      )
      -- Skip if overlaps any recurring break for this weekday
      and not exists (
        select 1 from breaks b
        where b.doctor_id = p_doctor_id
          and b.weekday = v_weekday
          and b.start_time is not null
          and tsrange(
                (p_date::text || ' ' || b.start_time::text)::timestamp,
                (p_date::text || ' ' || b.end_time::text)::timestamp, '[)'
              ) && tsrange(v_cursor::timestamp, v_slot_end::timestamp, '[)')
      )
      -- Skip if overlaps any one-off block
      and not exists (
        select 1 from breaks b
        where b.doctor_id = p_doctor_id
          and b.start_at is not null
          and tstzrange(b.start_at, b.end_at, '[)') && tstzrange(v_cursor, v_slot_end, '[)')
      )
      -- Skip past slots
      and v_cursor > now()
      then
        slot_start := v_cursor;
        slot_end := v_slot_end;
        return next;
      end if;

      v_cursor := v_cursor + (v_slot_minutes || ' minutes')::interval;
    end loop;
  end loop;
end;
$$;

-- Helper: my role
create or replace function my_role() returns user_role
language sql stable security definer as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_staff() returns boolean
language sql stable security definer as $$
  select coalesce((select active from profiles where id = auth.uid()), false);
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table doctors enable row level security;
alter table working_hours enable row level security;
alter table breaks enable row level security;
alter table patients enable row level security;
alter table bookings enable row level security;
alter table audit_log enable row level security;

-- profiles: staff can read, owner writes
create policy profiles_read on profiles for select using (is_staff());
create policy profiles_owner_write on profiles for all using (my_role() = 'owner') with check (my_role() = 'owner');

-- doctors: staff read; owner writes
create policy doctors_read on doctors for select using (is_staff());
create policy doctors_owner_write on doctors for all using (my_role() = 'owner') with check (my_role() = 'owner');

-- working_hours: staff read; owner writes
create policy wh_read on working_hours for select using (is_staff());
create policy wh_owner_write on working_hours for all using (my_role() = 'owner') with check (my_role() = 'owner');

-- breaks: staff read; doctor writes own + owner writes any
create policy breaks_read on breaks for select using (is_staff());
create policy breaks_doctor_write on breaks for all using (
  my_role() = 'owner' or
  (my_role() = 'doctor' and doctor_id in (select id from doctors where profile_id = auth.uid()))
);

-- patients: staff read all; staff write all (writes happen server-side via service role)
create policy patients_read on patients for select using (is_staff());
create policy patients_staff_write on patients for all using (is_staff()) with check (is_staff());

-- bookings: doctors see own; nurse/owner see all
create policy bookings_read on bookings for select using (
  my_role() in ('owner','nurse') or
  (my_role() = 'doctor' and doctor_id in (select id from doctors where profile_id = auth.uid()))
);
create policy bookings_write on bookings for all using (
  my_role() in ('owner','nurse')
) with check (
  my_role() in ('owner','nurse')
);

-- audit_log: staff read; system writes (via service role)
create policy audit_read on audit_log for select using (my_role() = 'owner');
