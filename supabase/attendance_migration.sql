-- Patient attendance tracking. Lets nurses mark a confirmed booking as
-- "attended" (showed up + completed) or "no_show" (didn't come).
-- These are independent of status so we can flip them without losing
-- the underlying confirmed booking record.

alter table bookings
  add column if not exists attended_at timestamptz,
  add column if not exists attended_by uuid references profiles(id) on delete set null,
  add column if not exists no_show boolean not null default false,
  add column if not exists no_show_at timestamptz,
  add column if not exists no_show_by uuid references profiles(id) on delete set null;

create index if not exists bookings_attended_idx on bookings(attended_at) where attended_at is not null;
create index if not exists bookings_no_show_idx on bookings(no_show) where no_show = true;
