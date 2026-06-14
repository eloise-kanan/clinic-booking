-- Tier consolidation: basic + standard + pro + franchise → standard + premium + franchise.
-- Run this AFTER lib/plan.ts has been redeployed.

-- 1. Drop the old CHECK constraint
alter table clinic_settings
  drop constraint if exists clinic_settings_plan_check;

-- 2. Migrate any existing rows on retired tier names
update clinic_settings set plan = 'standard' where plan = 'basic';
update clinic_settings set plan = 'premium'  where plan = 'pro';

-- 3. Add the new CHECK with only the three valid tier names
alter table clinic_settings
  add constraint clinic_settings_plan_check
  check (plan in ('standard', 'premium', 'franchise'));

-- 4. Default for any new singleton row
alter table clinic_settings
  alter column plan set default 'standard';
