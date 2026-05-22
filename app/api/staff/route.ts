import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .single();
  if (!profile?.active || profile.role !== "owner") {
    return { error: "Forbidden — owner only", status: 403 as const };
  }
  return { user };
}

export async function POST(req: Request) {
  const auth = await requireOwner();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { role, full_name, email, password, default_slot_minutes } = await req.json();
  if (!["nurse", "doctor"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (!full_name || !email || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (cErr || !created.user) {
    return NextResponse.json({ error: cErr?.message || "Could not create user" }, { status: 500 });
  }

  const { error: pErr } = await admin.from("profiles").insert({
    id: created.user.id,
    role,
    full_name,
    active: true,
  });
  if (pErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  if (role === "doctor") {
    const { error: dErr } = await admin.from("doctors").insert({
      profile_id: created.user.id,
      display_name: full_name,
      default_slot_minutes: default_slot_minutes || 30,
      active: true,
    });
    if (dErr) {
      return NextResponse.json({ error: dErr.message }, { status: 500 });
    }
  }

  await admin.from("audit_log").insert({
    actor_id: auth.user.id,
    action: "create_staff",
    entity_type: "profile",
    entity_id: created.user.id,
    after_data: { role, full_name, email },
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const auth = await requireOwner();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { profile_id, active, default_slot_minutes } = body;
  if (!profile_id) {
    return NextResponse.json({ error: "profile_id required" }, { status: 400 });
  }
  const admin = createAdminClient();

  if (active !== undefined) {
    const { error } = await admin.from("profiles").update({ active }).eq("id", profile_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await admin.from("doctors").update({ active }).eq("profile_id", profile_id);
    await admin.from("audit_log").insert({
      actor_id: auth.user.id,
      action: active ? "activate_staff" : "deactivate_staff",
      entity_type: "profile",
      entity_id: profile_id,
      after_data: { active },
    });
  }

  if (default_slot_minutes !== undefined) {
    if (![15, 30, 45, 60].includes(default_slot_minutes)) {
      return NextResponse.json(
        { error: "Slot length must be 15, 30, 45 or 60 minutes" },
        { status: 400 }
      );
    }
    const { error } = await admin
      .from("doctors")
      .update({ default_slot_minutes })
      .eq("profile_id", profile_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await admin.from("audit_log").insert({
      actor_id: auth.user.id,
      action: "update_doctor_slot_minutes",
      entity_type: "doctor",
      entity_id: profile_id,
      after_data: { default_slot_minutes },
    });
  }

  return NextResponse.json({ ok: true });
}
