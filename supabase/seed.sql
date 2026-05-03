-- ============================================================
-- Sample seed data — run AFTER creating user accounts in Supabase Auth.
-- Replace the profile IDs below with the actual UUIDs from auth.users.
-- ============================================================

-- Example doctors (no profile_id linked yet — that comes after users sign up)
insert into doctors (display_name, default_slot_minutes) values
  ('Dr Lim Hui Ying', 30),
  ('Dr Rajesh Kumar', 30),
  ('Dr Sarah Wong', 60);

-- Working hours: Mon–Sat, 9am–9pm with morning + evening session
do $$
declare
  d record;
begin
  for d in select id from doctors loop
    -- Mon (1) to Sat (6)
    for wd in 1..6 loop
      insert into working_hours (doctor_id, weekday, start_time, end_time)
      values
        (d.id, wd, '09:00', '13:00'),  -- morning
        (d.id, wd, '14:00', '18:00'),  -- afternoon
        (d.id, wd, '19:00', '21:00');  -- evening
      -- breaks already implicit via the gaps (13:00–14:00 lunch, 18:00–19:00 dinner)
    end loop;
  end loop;
end $$;
