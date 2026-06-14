import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { demoPlanLock } from "@/lib/branding-server";

// PATCH /api/plan — switch the clinic's tier. Owner-only.
export async function PATCH(req: Request) {
  // Demo deployments lock the plan via env so prospects can't accidentally
  // upgrade themselves out of the demo. Reject mutation when locked.
  if (demoPlanLock()) {
    return NextResponse.json(
      { error: "This is a demo deployment with a locked plan." },
      { status: 423 }
    );
  }
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

  const { plan } = await req.json();
  if (!["standard", "premium", "franchise"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("clinic_settings")
    .update({ plan, updated_at: new Date().toISOString(), updated_by: user.id })
    .eq("id", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "plan_change",
    entity_type: "clinic_settings",
    after_data: { plan },
  });

  return NextResponse.json({ ok: true });
}
