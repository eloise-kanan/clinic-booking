import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { applyPermanentToWorkingHours } from "@/lib/duty-shifts";

// PATCH /api/duty/shifts/[id] — owner approves or rejects. When approving
// a permanent shift change for a doctor, immediately update working_hours
// so the new schedule takes effect (one-off rows stay in duty_shifts; the
// duty calendar excludes is_permanent rows).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;
  const body = await req.json();
  const { status, notes, reviewer_notes } = body;
  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "status must be 'approved' or 'rejected'" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Pull the row first so we know whether it's permanent + the schedule.
  const { data: existing } = await admin
    .from("duty_shifts")
    .select("profile_id, shift_date, start_time, end_time, is_permanent, status")
    .eq("id", id)
    .single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await admin
    .from("duty_shifts")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      reviewer_notes: reviewer_notes ?? notes ?? null,
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (status === "approved" && existing.is_permanent) {
    await applyPermanentToWorkingHours(
      admin,
      existing.profile_id,
      existing.shift_date,
      existing.start_time,
      existing.end_time
    );
    await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "working_hours_apply_permanent",
      entity_type: "duty_shift",
      entity_id: id,
      after_data: {
        profile_id: existing.profile_id,
        weekday: new Date(existing.shift_date + "T00:00:00").getDay(),
        start_time: existing.start_time,
        end_time: existing.end_time,
      },
    });
  }

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: `duty_shift_${status}`,
    entity_type: "duty_shift",
    entity_id: id,
    before_data: { status: existing.status },
    after_data: {
      status,
      reviewer_notes: reviewer_notes ?? notes ?? null,
      profile_id: existing.profile_id,
      shift_date: existing.shift_date,
      is_permanent: existing.is_permanent,
    },
  });

  return NextResponse.json({ ok: true });
}

// DELETE — staff withdraws own pending request, or owner deletes any
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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
  if (!profile?.active) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("duty_shifts")
    .select("profile_id, status")
    .eq("id", id)
    .single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (profile.role !== "owner") {
    if (existing.profile_id !== user.id) {
      return NextResponse.json({ error: "Can only withdraw your own shifts" }, { status: 403 });
    }
    if (existing.status !== "pending") {
      return NextResponse.json(
        { error: `Cannot withdraw a ${existing.status} shift — ask the owner to remove it` },
        { status: 409 }
      );
    }
  }

  const { error } = await admin.from("duty_shifts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: profile.role === "owner" ? "duty_shift_delete" : "duty_shift_withdraw",
    entity_type: "duty_shift",
    entity_id: id,
    before_data: { status: existing.status, profile_id: existing.profile_id },
  });

  return NextResponse.json({ ok: true });
}
