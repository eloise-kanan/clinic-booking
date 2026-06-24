-- Staff log in by a name-derived login ID (e.g. tan_ming, lee_hong) instead
-- of email. Owner keeps email-based login (so they can self-serve password
-- reset via email — staff resets are owner-initiated via /owner/staff).
--
-- Supabase Auth still flows through email; we synthesize a fake email
-- `${login_id}@kanan-clinic.local` so Auth has something to key on.
-- Staff never see or type that email — they only ever see/type their login ID.
--
-- Login ID derivation (from full name):
--   • Strip leading titles (Dr/Mr/Mrs/Cik/Encik/Puan...)
--   • Strip particles (bin/binti/A/L/A/P)
--   • first_word + "_" + last_word, lowercased
--   → "Tan Wei Ming"           → tan_ming
--   → "Norhaiza Binti Ismail"   → norhaiza_ismail
--   → "Rajesh A/L Subramaniam"  → rajesh_subramaniam

alter table profiles
  add column if not exists login_id text;

create unique index if not exists profiles_login_id_idx
  on profiles(login_id)
  where login_id is not null;

comment on column profiles.login_id is
  'Owner-assigned login identifier for staff (e.g. "tan_ming"). NULL for owners (who log in by email).';

-- If a prior `employee_number` column was created (from an earlier migration
-- draft), copy values across so nothing is lost, then drop the old column.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'employee_number'
  ) then
    update profiles set login_id = employee_number
      where login_id is null and employee_number is not null;
    alter table profiles drop column employee_number;
  end if;
end $$;
