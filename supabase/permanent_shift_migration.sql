-- Permanent (recurring) shift changes — extends duty_shifts so staff can
-- submit "I want to permanently work 09:00–15:00 on Mondays from now on",
-- and the owner approves through the same HR approvals page.
--
-- When is_permanent=true and the request is approved, the server updates
-- the working_hours table for that doctor (replacing the row for that
-- weekday). The duty calendar reads from working_hours for default duty
-- and from duty_shifts for one-off exceptions — so permanent changes do
-- NOT spam the calendar; they just become the new default.
--
-- Nurses have no per-weekday working_hours table — for them a permanent
-- shift change is treated as "update default" at the clinic-wide policy
-- level (owner can wire it later if needed).

alter table duty_shifts
  add column if not exists is_permanent boolean not null default false;

comment on column duty_shifts.is_permanent is
  'When true + approved, the row updates working_hours (doctors) instead of being treated as a one-off override. Excluded from the duty calendar exceptions view since it becomes the new default.';
