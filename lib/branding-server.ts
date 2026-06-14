import { createAdminClient } from "@/lib/supabase-admin";
import type { Plan } from "@/lib/plan";

export type Branding = {
  primary_color: string;
  font_family: string;
  button_radius: "sharp" | "rounded" | "pill";
  logo_url: string | null;
};

const DEFAULT: Branding = {
  primary_color: "#0d9488",
  font_family: "Inter",
  button_radius: "rounded",
  logo_url: null,
};

export async function loadBranding(): Promise<Branding> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("clinic_settings")
      .select("primary_color, font_family, button_radius, logo_url")
      .eq("id", true)
      .maybeSingle();
    if (!data) return DEFAULT;
    return {
      primary_color: data.primary_color || DEFAULT.primary_color,
      font_family: data.font_family || DEFAULT.font_family,
      button_radius: (data.button_radius as Branding["button_radius"]) || DEFAULT.button_radius,
      logo_url: data.logo_url || null,
    };
  } catch {
    return DEFAULT;
  }
}

// Hard-locks the plan to a specific tier via env. Used to ship two demo
// deployments off the same codebase — one running Standard, one Premium —
// without sharing a clinic_settings row. When set, the plan can't be changed
// from the /owner/plan UI (the API also enforces this, see app/api/plan/route.ts).
const VALID_PLANS = ["standard", "premium", "franchise"] as const;

export function demoPlanLock(): Plan | null {
  const v = process.env.DEMO_PLAN_LOCK;
  if (v && (VALID_PLANS as readonly string[]).includes(v)) {
    return v as Plan;
  }
  return null;
}

export async function loadPlan(): Promise<Plan> {
  const locked = demoPlanLock();
  if (locked) return locked;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("clinic_settings")
      .select("plan")
      .eq("id", true)
      .maybeSingle();
    const plan = data?.plan as Plan | undefined;
    if (plan && (VALID_PLANS as readonly string[]).includes(plan)) {
      return plan;
    }
    return "standard";
  } catch {
    return "standard";
  }
}

// Convert a hex like #0d9488 to "r, g, b" — useful for CSS variable arithmetic
// when generating tints/shades client-side (rgba(var(--brand-rgb), 0.5)).
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

// Generate a darker shade of the primary color for hover/active states.
function darken(hex: string, amount = 0.15): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const dr = Math.max(0, Math.floor(r * (1 - amount)));
  const dg = Math.max(0, Math.floor(g * (1 - amount)));
  const db = Math.max(0, Math.floor(b * (1 - amount)));
  return `#${dr.toString(16).padStart(2, "0")}${dg.toString(16).padStart(2, "0")}${db.toString(16).padStart(2, "0")}`;
}

// Generate a very light tint for soft backgrounds.
function lighten(hex: string, amount = 0.92): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lr = Math.min(255, Math.floor(r + (255 - r) * amount));
  const lg = Math.min(255, Math.floor(g + (255 - g) * amount));
  const lb = Math.min(255, Math.floor(b + (255 - b) * amount));
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

const RADIUS_MAP: Record<Branding["button_radius"], string> = {
  sharp: "0px",
  rounded: "6px",
  pill: "9999px",
};

export function brandingToCss(b: Branding): string {
  const primary = b.primary_color || "#0d9488";
  const dark = darken(primary, 0.15);
  const light = lighten(primary, 0.92);
  const radius = RADIUS_MAP[b.button_radius] || "6px";
  const fontStack = `"${b.font_family}", ui-sans-serif, system-ui, sans-serif`;
  return `
    :root {
      --brand: ${primary};
      --brand-dark: ${dark};
      --brand-50: ${light};
      --brand-rgb: ${hexToRgb(primary)};
      --button-radius: ${radius};
      --font-clinic: ${fontStack};
    }
    body { font-family: var(--font-clinic); }
  `.trim();
}

// Build a Google Fonts URL for the chosen family. Returns null for safe stacks.
export function fontStylesheetUrl(fontFamily: string): string | null {
  const safeStacks = ["system-ui", "sans-serif", "serif"];
  if (safeStacks.includes(fontFamily)) return null;
  const family = fontFamily.replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${family}:wght@400;500;600;700&display=swap`;
}
