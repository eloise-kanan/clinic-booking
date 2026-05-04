import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// GET /api/templates — any active staff can read
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("active").eq("id", user.id).single();
  if (!profile?.active) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("message_templates").select("key, body, updated_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data });
}

// PATCH /api/templates — body: { key, body }. Owner + nurse can edit.
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
  if (!profile?.active || !["owner", "nurse"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { key, body: templateBody } = body;
  if (!key || typeof templateBody !== "string") {
    return NextResponse.json({ error: "key and body are required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("message_templates")
    .update({
      body: templateBody,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("key", key);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "template_update",
    entity_type: "message_template",
    entity_id: null,
    after_data: { key },
  });

  return NextResponse.json({ ok: true });
}
