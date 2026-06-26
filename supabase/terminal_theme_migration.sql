-- Terminal lockscreen theming.
--
-- Adds two columns to clinic_settings:
--   • terminal_theme — name of a preset gradient/theme (defined in code,
--     see lib/terminal-theme.ts). NULL or unknown name falls back to 'navy'.
--   • terminal_background_url — URL of a custom photo background. When set,
--     overrides the preset. Always rendered with a heavy blur + dark overlay
--     so the clock stays readable on top of any image.
--
-- Owner edits both at /owner/branding (Terminal lockscreen section).

alter table clinic_settings
  add column if not exists terminal_theme text,
  add column if not exists terminal_background_url text;

comment on column clinic_settings.terminal_theme is
  'Preset terminal-lockscreen theme name (navy/midnight/dawn/sage/mono). Defaults to navy via app code if NULL.';

comment on column clinic_settings.terminal_background_url is
  'Optional custom photo URL for the terminal lockscreen background. When set, the photo is rendered with a heavy default blur + dark overlay for legibility.';
