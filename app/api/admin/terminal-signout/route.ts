import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// POST /api/admin/terminal-signout — owner-only. Invalidates every active
// session belonging to the shared clinic-terminal account. Used end-of-day
// or when a terminal device has been left unattended. The next pageload at
// that terminal kicks back to /login.

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: actor } = await supabase
    .from("profiles").select("role, active").eq("id", user.id).single();
  if (!actor?.active || actor.role !== "owner") {
    return NextResponse.json({ error: "Forbidden — owner only" }, { status: 403 });
  }

  const admin = createAdminClient();
  // Find the shared terminal profile (login_id = 'terminal', role = 'terminal').
  const { data: terminalProfile } = await admin
    .from("profiles").select("id, full_name").eq("login_id", "terminal").maybeSingle();
  if (!terminalProfile) {
    return NextResponse.json({ error: "No terminal account exists" }, { status: 404 });
  }

  // Sign out all sessions for the terminal auth user.
  const { error } = await admin.auth.admin.signOut(terminalProfile.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "terminal_force_signout",
    entity_type: "profile",
    entity_id: terminalProfile.id,
  });

  return NextResponse.json({ ok: true });
}
