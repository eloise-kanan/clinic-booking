import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// POST /api/account/password — change own password.
// Requires the current password to confirm identity.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { current_password, new_password } = body;
  if (!current_password || !new_password) {
    return NextResponse.json({ error: "Both current and new passwords are required" }, { status: 400 });
  }
  if (typeof new_password !== "string" || new_password.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  if (!user.email) return NextResponse.json({ error: "Account has no email" }, { status: 400 });

  // Verify current password by attempting a sign-in. Use a separate client so
  // we don't disturb the user's existing session.
  const verify = createAdminClient();
  const { error: verifyErr } = await verify.auth.signInWithPassword({
    email: user.email,
    password: current_password,
  });
  if (verifyErr) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
  }

  // Update via admin so we don't depend on session refresh logic
  const admin = createAdminClient();
  const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
    password: new_password,
  });
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "self_password_change",
    entity_type: "profile",
    entity_id: user.id,
  });

  return NextResponse.json({ ok: true });
}
