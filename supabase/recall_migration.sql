-- Patient recall: surface patients due for a periodic checkup (default 6 months
-- since last visit). Nurse drives the actual outreach via WhatsApp from a new
-- /staff/recalls worklist.

alter table patients
  add column if not exists last_visit_at timestamptz,
  add column if not exists recall_interval_months int not null default 6
    check (recall_interval_months between 1 and 36),
  add column if not exists recall_reminder_sent_at timestamptz,
  add column if not exists recall_reminder_sent_by uuid references profiles(id) on delete set null;

-- Backfill last_visit_at from existing attended bookings (max attended_at per patient).
update patients p
set last_visit_at = sub.last_at
from (
  select patient_id, max(attended_at) as last_at
  from bookings
  where attended_at is not null
  group by patient_id
) sub
where p.id = sub.patient_id
  and p.last_visit_at is null;

create index if not exists patients_last_visit_idx on patients(last_visit_at);

-- Default recall template (idempotent — only seeded if 'recall' key doesn't exist yet).
insert into message_templates (key, body) values
  ('recall',
$RECALL$Hi {patient_name},

A friendly note from {clinic_name} — it's been about {months_since_visit} months since your last visit. Time for your routine dental checkup!

Reply to book a slot, or visit our website to choose a time that works for you.

— {clinic_name}$RECALL$)
on conflict (key) do nothing;
