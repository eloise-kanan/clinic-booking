import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { hashPin, isValidPinFormat } from "@/lib/pin";

// POST /api/staff/[id]/pin — owner sets or resets a staff member's PIN.
// Body: { pin: "123456" } (6 digits) | { clear: true } to remove
// Owner-only. Used by /owner/staff "Set PIN" modal.

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 as const };
  const { data: profile } = await supabase
    .from("profiles").select("role, active").eq("id", user.id).single();
  if (!profile?.active || profile.role !== "owner") {
    return { error: "Forbidden — owner only", status: 403 as const };
  }
  return { user };
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await ctx.params;
  const body = await req.json();
  const admin = createAdminClient();

  // Confirm target staff exists + isn't owner (owners don't have PINs)
  const { data: target } = await admin
    .from("profiles").select("id, role, full_name").eq("id", id).single();
  if (!target) return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  if (target.role === "owner") {
    return NextResponse.json({ error: "Owners don't use PINs — they sign in with email + password" }, { status: 400 });
  }

  if (body.clear === true) {
    const { error } = await admin.from("profiles").update({
      pin_hash: null,
      pin_set_at: null,
      pin_failed_attempts: 0,
      pin_locked_until: null,
    }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await admin.from("audit_log").insert({
      actor_id: auth.user.id, action: "staff_pin_clear",
      entity_type: "profile", entity_id: id,
    });
    return NextResponse.json({ ok: true });
  }

  const { pin } = body;
  if (!isValidPinFormat(pin)) {
    return NextResponse.json({ error: "PIN must be exactly 6 digits" }, { status: 400 });
  }
  const pin_hash = await hashPin(pin);

  const { error } = await admin.from("profiles").update({
    pin_hash,
    pin_set_at: new Date().toISOString(),
    pin_failed_attempts: 0,
    pin_locked_until: null,
  }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: auth.user.id, action: "staff_pin_set",
    entity_type: "profile", entity_id: id,
  });
  return NextResponse.json({ ok: true });
}
