-- Auto-email backup config for the singleton clinic_settings row.
-- Owner can opt into daily/weekly/monthly email of the same CSVs they can
-- download manually. Actual delivery is handled by a Vercel Cron tick that
-- reads these settings and sends via the configured email provider.

alter table clinic_settings
  add column if not exists backup_email_enabled boolean not null default false,
  add column if not exists backup_email_frequency text not null default 'weekly'
    check (backup_email_frequency in ('daily', 'weekly', 'monthly')),
  add column if not exists backup_email_to text,
  add column if not exists backup_email_last_sent_at timestamptz,
  add column if not exists backup_email_last_status text;
