// Preset themes for the clinic-terminal lockscreen.
//
// Each preset is a CSS `background-image` value applied to the lockscreen
// container. When a custom photo URL is also set, the photo wins — but its
// preset is still used to colour the dark overlay tint so text on top stays
// legible regardless of the underlying image.

import { createAdminClient } from "@/lib/supabase-admin";

export type TerminalThemeName = "navy" | "midnight" | "dawn" | "sage" | "mono";

export type TerminalTheme = {
  name: TerminalThemeName;
  label: string;
  description: string;
  // CSS gradient used when no custom background photo is uploaded.
  gradient: string;
  // rgba overlay colours used when a custom photo IS uploaded — gives the
  // photo a brand-matched tint and keeps the clock readable.
  overlayTop: string;
  overlayBottom: string;
  // Hex of the small accent rail at the top.
  accent: string;
};

export const TERMINAL_THEMES: Record<TerminalThemeName, TerminalTheme> = {
  navy: {
    name: "navy",
    label: "Kanan navy",
    description: "Default — deep navy with a warm gold hint. Matches the Kanan brand.",
    gradient: "linear-gradient(135deg, #1B2A4A 0%, #2B3F70 60%, #C9A227 220%)",
    overlayTop: "rgba(27,42,74,0.55)",
    overlayBottom: "rgba(27,42,74,0.80)",
    accent: "#C9A227",
  },
  midnight: {
    name: "midnight",
    label: "Midnight",
    description: "Quieter, pure deep blue — no gold accent. Reads as serious / clinical.",
    gradient: "linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #334155 130%)",
    overlayTop: "rgba(15,23,42,0.55)",
    overlayBottom: "rgba(15,23,42,0.85)",
    accent: "#64748B",
  },
  dawn: {
    name: "dawn",
    label: "Dawn",
    description: "Warm sunrise — terracotta into deep navy. Friendlier, less corporate.",
    gradient: "linear-gradient(135deg, #5B2A1F 0%, #8B3A1F 35%, #1B2A4A 100%)",
    overlayTop: "rgba(40,20,15,0.50)",
    overlayBottom: "rgba(20,15,30,0.80)",
    accent: "#E08855",
  },
  sage: {
    name: "sage",
    label: "Sage",
    description: "Muted green into navy. Soft, easy on the eyes during long shifts.",
    gradient: "linear-gradient(135deg, #2D4A3E 0%, #4A6B5D 50%, #1B2A4A 100%)",
    overlayTop: "rgba(20,40,30,0.50)",
    overlayBottom: "rgba(20,30,45,0.80)",
    accent: "#7BA88A",
  },
  mono: {
    name: "mono",
    label: "Monochrome",
    description: "Black into charcoal. Minimalist — works well with any uploaded photo.",
    gradient: "linear-gradient(135deg, #0A0A0A 0%, #1F1F1F 60%, #333333 130%)",
    overlayTop: "rgba(0,0,0,0.50)",
    overlayBottom: "rgba(0,0,0,0.80)",
    accent: "#737373",
  },
};

export const DEFAULT_THEME: TerminalThemeName = "navy";

export function getTheme(name: string | null | undefined): TerminalTheme {
  if (name && name in TERMINAL_THEMES) return TERMINAL_THEMES[name as TerminalThemeName];
  return TERMINAL_THEMES[DEFAULT_THEME];
}

export type TerminalLockscreenConfig = {
  theme: TerminalTheme;
  backgroundUrl: string | null;
};

export async function loadTerminalConfig(): Promise<TerminalLockscreenConfig> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("clinic_settings")
      .select("terminal_theme, terminal_background_url")
      .eq("id", true)
      .maybeSingle();
    return {
      theme: getTheme(data?.terminal_theme),
      backgroundUrl: data?.terminal_background_url || null,
    };
  } catch {
    return { theme: getTheme(null), backgroundUrl: null };
  }
}
