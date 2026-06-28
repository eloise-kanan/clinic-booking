-- Per-weekday default work schedule for non-doctor staff (nurses + future
-- roles). Doctors continue to use the `working_hours` table because their
-- hours drive booking slot availability; nurses don't generate slots, so a
-- denormalised JSONB on the profile is enough and avoids cross-table joins.
--
-- Structure: array of blocks, each {weekday:0..6, start_time:"HH:MM", end_time:"HH:MM"}.
-- Multiple blocks per weekday are allowed (split shifts). Empty / null array
-- means "no custom hours — use the clinic-wide 09:00–21:00 default".

alter table profiles
  add column if not exists default_work_hours jsonb;

comment on column profiles.default_work_hours is
  'Per-weekday default working hours for non-doctor staff (nurses). Array of {weekday, start_time, end_time} blocks. Doctors use the working_hours table.';
