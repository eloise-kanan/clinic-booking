-- Clinic-terminal account + per-staff PIN columns.
--
-- Adds:
--   1) A new role value 'terminal' for the shared clinic-reception account.
--   2) PIN columns on profiles — bcrypt hash, set-at timestamp, brute-force
--      counters. Owner has no PIN (uses password). Staff PIN is owner-set,
--      6 digits, used to authenticate individual identity within a terminal
--      session and to unlock HR / doctor pages.
--
-- The terminal account itself is created via the seed script or via the
-- /owner/terminal setup UI; this migration only prepares the schema.

-- 1. Extend the role check to include 'terminal'
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('owner', 'nurse', 'doctor', 'terminal'));

-- 2. PIN columns (all nullable — owner has none, staff get one when owner sets it)
alter table profiles
  add column if not exists pin_hash text,
  add column if not exists pin_set_at timestamptz,
  add column if not exists pin_failed_attempts int not null default 0,
  add column if not exists pin_locked_until timestamptz;

comment on column profiles.pin_hash is
  'bcrypt hash of the staff member''s 6-digit PIN. NULL for owners (use password) and the terminal account (uses password). NULL on staff until owner sets one at /owner/staff.';

comment on column profiles.pin_failed_attempts is
  'Wrong-PIN attempts since last successful verify. Resets to 0 on success. After N failures the row is locked until pin_locked_until.';

comment on column profiles.pin_locked_until is
  'If set + in the future, all PIN verification attempts on this profile must be rejected. Cleared on success or by owner-driven reset.';
