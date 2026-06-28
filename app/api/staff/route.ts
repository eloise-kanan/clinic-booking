import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { loadPlan } from "@/lib/branding-server";
import { seatAvailable, type Plan, type StaffRole } from "@/lib/plan";
import { isValidLoginId, resolveAuthEmail, fullNameToLoginId } from "@/lib/login-id";

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

  const body = await req.json();
  const { role, full_name, password, default_slot_minutes } = body;
  if (!["nurse", "doctor"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (!full_name || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  // Login ID — owner may pass one explicitly, otherwise derive from full name
  const login_id: string =
    (body.login_id || "").trim() || fullNameToLoginId(full_name);
  if (!login_id || !isValidLoginId(login_id)) {
    return NextResponse.json(
      { error: "Could not derive a valid login ID — please type one (3–30 chars, letters/digits/dots/dashes/underscores)" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Enforce per-role seat cap before creating anything. Counts only *active*
  // staff — deactivated accounts don't consume a seat.
  const plan = (await loadPlan()) as Plan;
  const { count: currentCount } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", role)
    .eq("active", true);
  const check = seatAvailable(plan, role as StaffRole, currentCount || 0);
  if (!check.ok) {
    return NextResponse.json(
      {
        error: `Seat limit reached — your plan allows ${check.cap} active ${role}${check.cap === 1 ? "" : "s"}. Deactivate someone, top up via WhatsApp, or upgrade your plan.`,
        seat_cap_reached: true,
      },
      { status: 409 }
    );
  }
  // Uniqueness check on login_id before creating anything
  const { count: existing } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("login_id", login_id);
  if (existing && existing > 0) {
    return NextResponse.json(
      { error: `Login ID "${login_id}" is already in use — pick another` },
      { status: 409 }
    );
  }

  // Synthesize an internal Supabase Auth email from the login ID.
  // Staff never see or type this; the login form translates back at sign-in.
  const synthEmail = resolveAuthEmail(login_id);
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: synthEmail,
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
    login_id,
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
    after_data: { role, full_name, login_id },
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
    // Reactivating a previously-deactivated staff also consumes a seat, so
    // run the same cap check on that path.
    if (active === true) {
      const { data: existing } = await admin
        .from("profiles")
        .select("role, active")
        .eq("id", profile_id)
        .maybeSingle();
      if (existing && existing.active === false && existing.role !== "owner") {
        const plan = (await loadPlan()) as Plan;
        const { count: currentCount } = await admin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", existing.role)
          .eq("active", true);
        const check = seatAvailable(plan, existing.role as StaffRole, currentCount || 0);
        if (!check.ok) {
          return NextResponse.json(
            {
              error: `Can't reactivate — your plan allows only ${check.cap} active ${existing.role}${check.cap === 1 ? "" : "s"} and you're already at that.`,
              seat_cap_reached: true,
            },
            { status: 409 }
          );
        }
      }
    }
    const { data: prevActive } = await admin
      .from("profiles")
      .select("active")
      .eq("id", profile_id)
      .maybeSingle();
    const { error } = await admin.from("profiles").update({ active }).eq("id", profile_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await admin.from("doctors").update({ active }).eq("profile_id", profile_id);
    await admin.from("audit_log").insert({
      actor_id: auth.user.id,
      action: active ? "activate_staff" : "deactivate_staff",
      entity_type: "profile",
      entity_id: profile_id,
      before_data: { active: prevActive?.active ?? null },
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
    const { data: prevDoc } = await admin
      .from("doctors")
      .select("default_slot_minutes")
      .eq("profile_id", profile_id)
      .maybeSingle();
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
      before_data: { default_slot_minutes: prevDoc?.default_slot_minutes ?? null },
      after_data: { default_slot_minutes },
    });
  }

  return NextResponse.json({ ok: true });
}
