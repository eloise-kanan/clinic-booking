-- Re-anchor visit_count to actual attended visits only. Previously it was
-- incremented on any confirmed booking, so rescheduled and cancelled bookings
-- inflated the count.

update patients p
set visit_count = coalesce(sub.attended_count, 0)
from (
  select patient_id, count(*) as attended_count
  from bookings
  where attended_at is not null
  group by patient_id
) sub
where p.id = sub.patient_id;

-- Patients with no attended visits should be reset to 0
update patients
set visit_count = 0
where id not in (
  select distinct patient_id
  from bookings
  where attended_at is not null
);
