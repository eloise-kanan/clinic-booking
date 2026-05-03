-- Add approval workflow to duty_shifts.
-- Reuses the existing leave_status enum (pending / approved / rejected).
-- Run after duty_leave_migration.sql.

alter table duty_shifts
  add column if not exists status leave_status not null default 'pending',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references profiles(id) on delete set null,
  add column if not exists reviewer_notes text;

create index if not exists duty_shifts_status_idx on duty_shifts(status);
