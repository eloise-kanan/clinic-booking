import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clinic_settings")
    .select("primary_color, font_family, button_radius, logo_url, updated_at")
    .eq("id", true)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ branding: data });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .single();
  if (!profile?.active || profile.role !== "owner") {
    return NextResponse.json({ error: "Forbidden — owner only" }, { status: 403 });
  }

  const body = await req.json();
  const { primary_color, font_family, button_radius, logo_url, terminal_theme, terminal_background_url } = body;

  // Basic validation
  if (primary_color && !/^#[0-9a-fA-F]{6}$/.test(primary_color)) {
    return NextResponse.json({ error: "primary_color must be #RRGGBB hex" }, { status: 400 });
  }
  if (button_radius && !["sharp", "rounded", "pill"].includes(button_radius)) {
    return NextResponse.json({ error: "button_radius must be sharp, rounded, or pill" }, { status: 400 });
  }
  if (logo_url && typeof logo_url === "string" && logo_url.length > 0) {
    try {
      new URL(logo_url);
    } catch {
      return NextResponse.json({ error: "logo_url must be a valid URL" }, { status: 400 });
    }
  }
  const VALID_TERMINAL_THEMES = ["navy", "midnight", "dawn", "sage", "mono"];
  if (terminal_theme && !VALID_TERMINAL_THEMES.includes(terminal_theme)) {
    return NextResponse.json({ error: `terminal_theme must be one of ${VALID_TERMINAL_THEMES.join(", ")}` }, { status: 400 });
  }
  if (terminal_background_url && typeof terminal_background_url === "string" && terminal_background_url.length > 0) {
    try {
      new URL(terminal_background_url);
    } catch {
      return NextResponse.json({ error: "terminal_background_url must be a valid URL" }, { status: 400 });
    }
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  };
  if (primary_color !== undefined) update.primary_color = primary_color;
  if (font_family !== undefined) update.font_family = font_family;
  if (button_radius !== undefined) update.button_radius = button_radius;
  if (logo_url !== undefined) update.logo_url = logo_url || null;
  if (terminal_theme !== undefined) update.terminal_theme = terminal_theme || null;
  if (terminal_background_url !== undefined) update.terminal_background_url = terminal_background_url || null;

  const admin = createAdminClient();
  const { error } = await admin.from("clinic_settings").update(update).eq("id", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "branding_update",
    entity_type: "clinic_settings",
    after_data: { primary_color, font_family, button_radius, logo_url, terminal_theme, terminal_background_url },
  });

  // Branding + theme are injected via the root layout. Invalidating the
  // layout cache forces every page (including /login, /book, /home) to pick
  // up the new theme on next navigation — no redeploy needed.
  revalidatePath("/", "layout");

  return NextResponse.json({ ok: true });
}
