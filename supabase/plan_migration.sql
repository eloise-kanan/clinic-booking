-- Per-clinic plan tier. Used to gate features in the UI.
-- Allowed values: 'basic' | 'standard' | 'pro' | 'franchise'.

alter table clinic_settings
  add column if not exists plan text not null default 'standard'
  check (plan in ('basic', 'standard', 'pro', 'franchise'));
