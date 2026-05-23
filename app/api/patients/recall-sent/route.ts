import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// POST /api/patients/recall-sent
// body: { patient_id }
// Records when a recall WhatsApp was opened from the worklist + who sent it.
// Idempotent — resending updates the timestamp + actor.
export async function POST(req: Request) {
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
  if (!profile?.active || !["nurse", "owner"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { patient_id } = await req.json();
  if (!patient_id) return NextResponse.json({ error: "patient_id required" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("patients")
    .update({
      recall_reminder_sent_at: new Date().toISOString(),
      recall_reminder_sent_by: user.id,
    })
    .eq("id", patient_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "patient_recall_sent",
    entity_type: "patient",
    entity_id: patient_id,
  });

  return NextResponse.json({ ok: true });
}
