-- Track every WhatsApp template send (check, confirm, reject, cancel, reminder)
-- per booking, so the team can see what was sent, when, and by whom.
-- "reminder_sent_at / reminder_sent_by" already exist; adding the other four kinds.

alter table bookings
  add column if not exists check_sent_at timestamptz,
  add column if not exists check_sent_by uuid references profiles(id) on delete set null,
  add column if not exists confirm_sent_at timestamptz,
  add column if not exists confirm_sent_by uuid references profiles(id) on delete set null,
  add column if not exists reject_sent_at timestamptz,
  add column if not exists reject_sent_by uuid references profiles(id) on delete set null,
  add column if not exists cancel_sent_at timestamptz,
  add column if not exists cancel_sent_by uuid references profiles(id) on delete set null;
