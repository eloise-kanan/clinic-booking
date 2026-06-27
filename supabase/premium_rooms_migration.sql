-- Premium-tier additions for in-clinic patient flow + richer doctor profiles.
--
-- Adds:
--   • bookings — room assignment, check-in / check-out timestamps + actors,
--     treatment_done text (what the doctor actually performed).
--   • doctors — expertise (text list, e.g. "Implants, root canal"), bio,
--     rating_average + rating_count for the patient-facing doctor cards.
--   • clinic_settings.rooms_list — array of room labels the clinic uses
--     (e.g. {'Room 1', 'Room 2', 'Surgery'}). Defaults to 3 generic rooms.
--
-- All columns are nullable / safely defaulted so the Standard tier ignores
-- them. The app checks `hasFeature(plan, 'review')` / room-related feature
-- flags to gate the UI surfaces.

alter table bookings
  add column if not exists room text,
  add column if not exists checked_in_at timestamptz,
  add column if not exists checked_in_by uuid references profiles(id) on delete set null,
  add column if not exists checked_out_at timestamptz,
  add column if not exists checked_out_by uuid references profiles(id) on delete set null,
  add column if not exists treatment_done text;

alter table doctors
  add column if not exists expertise text,
  add column if not exists bio text,
  add column if not exists rating_average numeric(2, 1) not null default 0,
  add column if not exists rating_count int not null default 0;

alter table clinic_settings
  add column if not exists rooms_list text[] not null default array['Room 1', 'Room 2', 'Room 3'];

comment on column bookings.room is
  'Premium: room/operatory the patient is checked into. NULL = not in any room yet.';
comment on column bookings.checked_in_at is
  'Premium: when the nurse marked the patient as physically present + assigned to a room. Distinct from attended_at (which fires at end of visit).';
comment on column bookings.treatment_done is
  'Premium: what the doctor actually performed during the visit (set at check-out). Used for reporting + the visit history shown to patients.';

comment on column doctors.expertise is
  'Premium: comma-separated list of specialties to surface on the patient-facing doctor card.';
comment on column doctors.rating_average is
  'Premium: aggregated 1.0–5.0 rating; recomputed when reviews are submitted.';

comment on column clinic_settings.rooms_list is
  'Premium: list of room labels the clinic uses for check-in. Owner edits at /owner/working-hours or a future Rooms settings page.';
