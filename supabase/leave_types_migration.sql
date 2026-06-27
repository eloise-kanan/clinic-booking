-- Leave request types + per-employee balances.
--
-- Adds:
--   • leave_requests.leave_type — one of 'annual', 'mc', 'emergency'.
--     If a request is submitted with start_date inside the next 3 working
--     days, the server auto-flags it as 'emergency'.
--   • profiles.annual_leave_balance / mc_balance / emergency_balance —
--     days remaining for the calendar year. Owner sets these per employee
--     at /owner/staff. Decremented automatically when a leave is approved.

alter table leave_requests
  add column if not exists leave_type text not null default 'annual'
    check (leave_type in ('annual', 'mc', 'emergency'));

alter table profiles
  add column if not exists annual_leave_balance int not null default 14,
  add column if not exists mc_balance int not null default 14,
  add column if not exists emergency_balance int not null default 5;

comment on column leave_requests.leave_type is
  'annual / mc (medical certificate) / emergency. Auto-set to emergency by the API when start_date is < 3 working days away.';
comment on column profiles.annual_leave_balance is
  'Annual leave days remaining for this calendar year. Owner-set at /owner/staff.';
