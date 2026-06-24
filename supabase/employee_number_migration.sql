-- Staff login by employee number instead of email.
-- Owner keeps email-based login (so they can self-serve password reset).
-- Staff get a clinic-issued employee number. Auth still flows through
-- Supabase Auth — we synthesize a fake email `${empno}@kanan-clinic.local`
-- so Supabase has something to key on; staff never see or type it.

alter table profiles
  add column if not exists employee_number text;

create unique index if not exists profiles_employee_number_idx
  on profiles(employee_number)
  where employee_number is not null;

comment on column profiles.employee_number is
  'Owner-assigned clinic employee number used as login ID for staff. NULL for owners (who log in by email).';
