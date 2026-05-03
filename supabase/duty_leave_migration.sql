-- ============================================================
-- Duty shifts + leave requests
-- Run in Supabase SQL editor.
-- ============================================================

-- Leave status enum
do $$ begin
  if not exists (select 1 from pg_type where typname = 'leave_status') then
    create type leave_status as enum ('pending', 'approved', 'rejected');
  end if;
end $$;

-- DUTY SHIFTS — one row per (staff member × day × time block)
create table if not exists duty_shifts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  notes text,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists duty_shifts_date_idx on duty_shifts(shift_date);
create index if not exists duty_shifts_profile_idx on duty_shifts(profile_id);

-- LEAVE REQUESTS
create table if not exists leave_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  status leave_status not null default 'pending',
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewer_notes text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists leave_requests_profile_idx on leave_requests(profile_id);
create index if not exists leave_requests_status_idx on leave_requests(status);
create index if not exists leave_requests_dates_idx on leave_requests(start_date, end_date);

-- ROW LEVEL SECURITY
alter table duty_shifts enable row level security;
alter table leave_requests enable row level security;

-- Duty: any staff can read everyone's shifts; staff can write their own; owner can do anything
drop policy if exists ds_read on duty_shifts;
create policy ds_read on duty_shifts for select using (is_staff());

drop policy if exists ds_self_write on duty_shifts;
create policy ds_self_write on duty_shifts for all
  using (profile_id = auth.uid() or my_role() = 'owner')
  with check (profile_id = auth.uid() or my_role() = 'owner');

-- Leave: staff can read all (for transparency); insert their own pending request; owner can update any
drop policy if exists lr_read on leave_requests;
create policy lr_read on leave_requests for select using (is_staff());

drop policy if exists lr_self_insert on leave_requests;
create policy lr_self_insert on leave_requests for insert
  with check (profile_id = auth.uid());

drop policy if exists lr_self_delete_pending on leave_requests;
create policy lr_self_delete_pending on leave_requests for delete
  using (profile_id = auth.uid() and status = 'pending');

drop policy if exists lr_owner_update on leave_requests;
create policy lr_owner_update on leave_requests for update
  using (my_role() = 'owner')
  with check (my_role() = 'owner');
