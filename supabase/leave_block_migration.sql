-- Link breaks to leave requests so we can clean up the corresponding
-- one-off block when a leave is rejected or removed.
alter table breaks
  add column if not exists leave_id uuid references leave_requests(id) on delete cascade;

create index if not exists breaks_leave_id_idx on breaks(leave_id);
