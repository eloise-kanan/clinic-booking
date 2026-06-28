import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// POST /api/staff/[id]/balance — owner sets leave balances for a staff
// member. Body: { annual?, mc?, emergency? } — any subset.
//
// Owner-only. Used by the employee card editor on /owner/staff.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: actor } = await supabase
    .from("profiles").select("role, active").eq("id", user.id).single();
  if (!actor?.active || actor.role !== "owner") {
    return NextResponse.json({ error: "Forbidden — owner only" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const { annual, mc, emergency } = await req.json();
  const update: Record<string, number> = {};
  if (typeof annual === "number" && annual >= 0 && annual <= 365) update.annual_leave_balance = annual;
  if (typeof mc === "number" && mc >= 0 && mc <= 365) update.mc_balance = mc;
  if (typeof emergency === "number" && emergency >= 0 && emergency <= 365) update.emergency_balance = emergency;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid balance fields provided" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: prev } = await admin
    .from("profiles")
    .select("annual_leave_balance, mc_balance, emergency_balance")
    .eq("id", id)
    .maybeSingle();
  const { error } = await admin.from("profiles").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "leave_balance_update",
    entity_type: "profile",
    entity_id: id,
    before_data: prev || {},
    after_data: update,
  });

  return NextResponse.json({ ok: true });
}
