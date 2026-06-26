-- One-shot reset to make every active nurse + doctor PIN equal "123456".
-- Useful for demos so the presenter only has to remember one number.
-- Re-running the seed script also achieves this (it now uses DEMO_PIN = "123456"),
-- but this SQL skips the wipe-and-rebuild cycle.
--
-- The bcrypt hash below was generated with cost-factor 10 — same as the
-- runtime helper in lib/pin.ts (BCRYPT_ROUNDS = 10).

update profiles
set
  pin_hash = '$2b$10$CYVffYnZa3POGQ77Jimk2.N.ngA03WwOtqZhOLnXji/PnsAZgi/IC',
  pin_set_at = now(),
  pin_failed_attempts = 0,
  pin_locked_until = null
where role in ('nurse', 'doctor')
  and active = true;
