import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

const ALLOWED_FREQ = ["daily", "weekly", "monthly"] as const;

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clinic_settings")
    .select(
      "backup_email_enabled, backup_email_frequency, backup_email_to, backup_email_last_sent_at, backup_email_last_status"
    )
    .eq("id", true)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
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
  const { backup_email_enabled, backup_email_frequency, backup_email_to } = body;

  if (
    backup_email_frequency !== undefined &&
    !ALLOWED_FREQ.includes(backup_email_frequency)
  ) {
    return NextResponse.json(
      { error: "Frequency must be daily, weekly, or monthly" },
      { status: 400 }
    );
  }

  if (backup_email_to !== undefined && backup_email_to) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(backup_email_to))) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
  }

  if (backup_email_enabled === true) {
    const finalEmail =
      backup_email_to !== undefined ? backup_email_to : null;
    if (!finalEmail) {
      // Cross-check current row to allow toggle-on when email already saved.
      const admin0 = createAdminClient();
      const { data: cur } = await admin0
        .from("clinic_settings")
        .select("backup_email_to")
        .eq("id", true)
        .maybeSingle();
      if (!cur?.backup_email_to) {
        return NextResponse.json(
          { error: "Enter an email address before turning auto-email on" },
          { status: 400 }
        );
      }
    }
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  };
  if (backup_email_enabled !== undefined)
    update.backup_email_enabled = !!backup_email_enabled;
  if (backup_email_frequency !== undefined)
    update.backup_email_frequency = backup_email_frequency;
  if (backup_email_to !== undefined)
    update.backup_email_to = backup_email_to || null;

  const admin = createAdminClient();
  const { error } = await admin.from("clinic_settings").update(update).eq("id", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "backup_email_settings_update",
    entity_type: "clinic_settings",
    after_data: { backup_email_enabled, backup_email_frequency, backup_email_to },
  });

  return NextResponse.json({ ok: true });
}
