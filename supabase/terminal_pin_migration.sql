-- Clinic-terminal account + per-staff PIN columns.
--
-- Adds:
--   1) A new value 'terminal' on the user_role enum for the shared
--      clinic-reception account.
--   2) PIN columns on profiles — bcrypt hash, set-at timestamp, brute-force
--      counters. Owner has no PIN (uses password). Staff PIN is owner-set,
--      6 digits, used to authenticate individual identity within a terminal
--      session and to unlock HR / doctor pages.
--
-- The terminal account itself is created via the seed script or via the
-- /owner/terminal setup UI; this migration only prepares the schema.

-- 1. Add 'terminal' to the user_role enum.
--    ADD VALUE IF NOT EXISTS is idempotent → safe to re-run.
alter type user_role add value if not exists 'terminal';

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
