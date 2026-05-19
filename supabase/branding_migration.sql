-- Per-clinic theme / branding. Single-row settings table.
-- Owner edits at /owner/branding. Changes inject as CSS variables at runtime
-- so no rebuild is required to update colors, fonts, etc.

create table if not exists clinic_settings (
  id boolean primary key default true,
  primary_color text not null default '#0d9488',
  font_family text not null default 'Inter',
  button_radius text not null default 'rounded',  -- 'sharp' | 'rounded' | 'pill'
  logo_url text,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null,
  check (id = true)
);

-- Seed the singleton row if it doesn't exist.
insert into clinic_settings (id, primary_color, font_family, button_radius)
values (true, '#0d9488', 'Inter', 'rounded')
on conflict (id) do nothing;

-- RLS: any active staff can read (so /book can pick up the theme too;
-- but /book is public, so we also need anon read).
alter table clinic_settings enable row level security;

drop policy if exists cs_anon_read on clinic_settings;
create policy cs_anon_read on clinic_settings for select using (true);

drop policy if exists cs_owner_write on clinic_settings;
create policy cs_owner_write on clinic_settings for all
  using (my_role() = 'owner')
  with check (my_role() = 'owner');
