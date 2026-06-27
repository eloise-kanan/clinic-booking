import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// POST /api/doctors/[id]/profile — owner-only.
// Body: { expertise?: string, bio?: string }
// Used by the owner staff-card editor to update the Premium doctor profile.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: actor } = await supabase.from("profiles").select("role, active").eq("id", user.id).single();
  if (!actor?.active || actor.role !== "owner") {
    return NextResponse.json({ error: "Forbidden — owner only" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const { expertise, bio } = await req.json();
  const update: Record<string, string | null> = {};
  if (typeof expertise === "string") update.expertise = expertise.trim() || null;
  if (typeof bio === "string") update.bio = bio.trim() || null;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("doctors").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "doctor_profile_update",
    entity_type: "doctor",
    entity_id: id,
    after_data: update,
  });

  return NextResponse.json({ ok: true });
}
