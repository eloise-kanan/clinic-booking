import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// POST /api/account/email — change own login email.
// Requires the current password to confirm identity. The new email is
// applied instantly (admin.updateUserById with email_confirm: true) so the
// staff member can log in with it immediately — no confirmation link round-trip.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.email) return NextResponse.json({ error: "Account has no email" }, { status: 400 });

  // Email change is owner-only — staff log in by employee number and don't
  // have a real email to change.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can change their login email" }, { status: 403 });
  }

  const body = await req.json();
  const { current_password, new_email } = body;
  if (!current_password || !new_email) {
    return NextResponse.json(
      { error: "Both current password and new email are required" },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(new_email))) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }
  if (new_email === user.email) {
    return NextResponse.json({ error: "New email is the same as current" }, { status: 400 });
  }

  const verify = createAdminClient();
  const { error: verifyErr } = await verify.auth.signInWithPassword({
    email: user.email,
    password: current_password,
  });
  if (verifyErr) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
    email: new_email,
    email_confirm: true,
  });
  if (updErr) {
    const msg = /duplicate|already/i.test(updErr.message)
      ? "An account with that email already exists"
      : updErr.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "self_email_change",
    entity_type: "profile",
    entity_id: user.id,
    before_data: { email: user.email },
    after_data: { email: new_email },
  });

  return NextResponse.json({ ok: true });
}
