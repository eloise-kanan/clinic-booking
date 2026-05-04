-- Smart slot generation: anchor on the treatment-length grid, but also
-- offer a slot start at the moment any booking or break ENDS, so a free
-- window between two existing bookings is never wasted.
--
-- Empty day for a 30-min treatment: 09:00, 09:30, 10:00, …  (no extra noise)
-- Day with 09:00–09:30 booked + 10:30–12:00 booked, 60-min treatment:
--   grid says 09:00, 10:00, 11:00, 12:00 — all blocked except 12:00
--   booking-ends add 09:30 and 12:00 as anchors
--   final list: 09:30, 12:00, 13:00, 14:00, …
--
-- So the previously-wasted 09:30–10:30 gap becomes bookable.

drop function if exists available_slots(uuid, date, int);
drop function if exists available_slots(uuid, date);

create or replace function available_slots(
  p_doctor_id uuid,
  p_date date,
  p_slot_minutes int default null
)
returns table(slot_start timestamptz, slot_end timestamptz)
language plpgsql
volatile
set timezone to 'Asia/Kuala_Lumpur'
as $$
declare
  v_weekday int;
  v_slot_minutes int;
  v_wh record;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_cand timestamptz;
  v_slot_end timestamptz;
begin
  perform expire_stale_bookings();

  v_weekday := extract(dow from p_date);
  if p_slot_minutes is not null and p_slot_minutes > 0 then
    v_slot_minutes := p_slot_minutes;
  else
    select default_slot_minutes into v_slot_minutes from doctors where id = p_doctor_id;
  end if;
  if v_slot_minutes is null then return; end if;

  for v_wh in
    select start_time, end_time
    from working_hours
    where doctor_id = p_doctor_id and weekday = v_weekday
    order by start_time
  loop
    v_window_start := (p_date::text || ' ' || v_wh.start_time::text)::timestamptz;
    v_window_end := (p_date::text || ' ' || v_wh.end_time::text)::timestamptz;

    -- Walk the union of:
    --   (a) grid positions every slot_minutes from window_start
    --   (b) the end timestamp of every existing booking (so the next slot
    --       can begin exactly when one ends)
    --   (c) the end of every break (recurring + one-off)
    -- Deduped, ordered ascending. Each candidate then has to actually fit.
    for v_cand in
      select t from (
        select generate_series(
          v_window_start,
          v_window_end - (v_slot_minutes || ' minutes')::interval,
          (v_slot_minutes || ' minutes')::interval
        ) as t
        union
        select bk.slot_end as t
        from bookings bk
        where bk.doctor_id = p_doctor_id
          and bk.status in ('pending', 'confirmed')
        union
        select (p_date::text || ' ' || b.end_time::text)::timestamptz as t
        from breaks b
        where b.doctor_id = p_doctor_id
          and b.weekday = v_weekday
          and b.end_time is not null
        union
        select b.end_at as t
        from breaks b
        where b.doctor_id = p_doctor_id
          and b.start_at is not null
      ) sub
      where t >= v_window_start
        and t + (v_slot_minutes || ' minutes')::interval <= v_window_end
        and t > now()
      order by t
    loop
      v_slot_end := v_cand + (v_slot_minutes || ' minutes')::interval;

      if not exists (
        select 1 from bookings bk
        where bk.doctor_id = p_doctor_id
          and bk.status in ('pending', 'confirmed')
          and tstzrange(bk.slot_start, bk.slot_end, '[)') && tstzrange(v_cand, v_slot_end, '[)')
      )
      and not exists (
        select 1 from breaks b
        where b.doctor_id = p_doctor_id
          and b.weekday = v_weekday
          and b.start_time is not null
          and tsrange(
                (p_date::text || ' ' || b.start_time::text)::timestamp,
                (p_date::text || ' ' || b.end_time::text)::timestamp,
                '[)'
              ) && tsrange(v_cand::timestamp, v_slot_end::timestamp, '[)')
      )
      and not exists (
        select 1 from breaks b
        where b.doctor_id = p_doctor_id
          and b.start_at is not null
          and tstzrange(b.start_at, b.end_at, '[)') && tstzrange(v_cand, v_slot_end, '[)')
      )
      then
        slot_start := v_cand;
        slot_end := v_slot_end;
        return next;
      end if;
    end loop;
  end loop;
end;
$$;
