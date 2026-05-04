-- WhatsApp message templates (editable via /staff/templates) + reminder tracking
-- on bookings (so the nurse knows which appointments still need a reminder).

create table if not exists message_templates (
  key text primary key,
  body text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null
);

-- Seed default templates only if the row doesn't exist yet (idempotent).
insert into message_templates (key, body) values
  ('check',
$DEFAULT$Hi {patient_name},

This is {clinic_name}. We received your appointment request:
• Doctor: {doctor_name}
• Date & time: {slot_label}
• Reason: {visit_reason}

Could you please confirm this is correct? Reply YES to proceed, or let us know if any changes are needed.$DEFAULT$),
  ('confirm_booking',
$DEFAULT$Hi {patient_name},

Your appointment is confirmed:
• Doctor: {doctor_name}
• Date & time: {slot_label}

Please arrive 10 minutes early. If you need to reschedule or cancel, let us know as soon as possible.

— {clinic_name}$DEFAULT$),
  ('confirm_reschedule',
$DEFAULT$Hi {patient_name},

Your appointment has been rescheduled:
• Doctor: {doctor_name}
• New date & time: {slot_label}

Please arrive 10 minutes early.

— {clinic_name}$DEFAULT$),
  ('confirm_cancellation',
$DEFAULT$Hi {patient_name},

Your appointment has been cancelled. We hope to see you again soon.

— {clinic_name}$DEFAULT$),
  ('reject',
$DEFAULT$Hi {patient_name},

Unfortunately we are unable to confirm your appointment request for {slot_label} with {doctor_name}.
Reason: {reject_reason}

Please submit a new booking and we will do our best to accommodate you.

— {clinic_name}$DEFAULT$),
  ('reminder',
$DEFAULT$Hi {patient_name},

Friendly reminder of your appointment tomorrow:
• Doctor: {doctor_name}
• Date & time: {slot_label}

Please arrive 10 minutes early. Reply if you need to change anything.

— {clinic_name}$DEFAULT$)
on conflict (key) do nothing;

-- RLS: any active staff can read templates; only owner+nurse can update.
alter table message_templates enable row level security;

drop policy if exists mt_read on message_templates;
create policy mt_read on message_templates for select using (is_staff());

drop policy if exists mt_write on message_templates;
create policy mt_write on message_templates for all
  using (my_role() in ('owner', 'nurse'))
  with check (my_role() in ('owner', 'nurse'));

-- Reminder tracking on bookings.
alter table bookings
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists reminder_sent_by uuid references profiles(id) on delete set null;

create index if not exists bookings_reminder_idx on bookings(reminder_sent_at) where reminder_sent_at is not null;
