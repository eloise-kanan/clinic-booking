import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Build a Malaysia-time timestamptz string for a date at a given time-of-day.
// Always +08:00 (no DST in Malaysia).
function mytAt(dateStr: string, timeOfDay: "00:00:00" | "23:59:59"): string {
  return new Date(`${dateStr}T${timeOfDay}+08:00`).toISOString();
}

// PATCH /api/leave/requests/[id]  — owner approves or rejects.
// On approval, also inserts a one-off block in `breaks` covering the leave
// for the staff member's linked doctor (if any). Reverting unblocks.
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
  const { status, notes } = body;
  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "status must be 'approved' or 'rejected'" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Read the leave first so we know the profile + dates and the previous status
  const { data: before } = await admin
    .from("leave_requests")
    .select("id, profile_id, start_date, end_date, status, reason")
    .eq("id", id)
    .single();
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error: updErr } = await admin
    .from("leave_requests")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      reviewer_notes: notes || null,
    })
    .eq("id", id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // Sync the corresponding break row for the doctor's calendar
  // First, remove any existing block tied to this leave (idempotent reset)
  await admin.from("breaks").delete().eq("leave_id", id);

  if (status === "approved") {
    // Find the doctor record linked to this profile, if any
    const { data: doctor } = await admin
      .from("doctors")
      .select("id")
      .eq("profile_id", before.profile_id)
      .maybeSingle();

    if (doctor) {
      const { error: brErr } = await admin.from("breaks").insert({
        doctor_id: doctor.id,
        start_at: mytAt(before.start_date, "00:00:00"),
        end_at: mytAt(before.end_date, "23:59:59"),
        reason: `On leave${before.reason ? ` (${before.reason})` : ""}`,
        leave_id: id,
      });
      if (brErr) {
        // Don't fail the whole request — the leave is already approved.
        // But surface so the owner is aware.
        return NextResponse.json(
          { ok: true, warning: `Leave approved but failed to block calendar: ${brErr.message}` }
        );
      }
    }
  }

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: `leave_request_${status}`,
    entity_type: "leave_request",
    entity_id: id,
    before_data: { status: before.status },
    after_data: {
      status,
      reviewer_notes: notes || null,
      start_date: before.start_date,
      end_date: before.end_date,
      profile_id: before.profile_id,
    },
  });

  return NextResponse.json({ ok: true });
}

// DELETE — staff withdraws own pending leave request
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("leave_requests")
    .select("profile_id, status")
    .eq("id", id)
    .single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.profile_id !== user.id) {
    return NextResponse.json({ error: "Can only withdraw your own request" }, { status: 403 });
  }
  if (existing.status !== "pending") {
    return NextResponse.json({ error: `Cannot withdraw a ${existing.status} request` }, { status: 409 });
  }

  // breaks have on-delete-cascade via leave_id, so they go automatically
  const { error } = await admin.from("leave_requests").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "leave_request_withdraw",
    entity_type: "leave_request",
    entity_id: id,
    before_data: { status: existing.status, profile_id: existing.profile_id },
  });

  return NextResponse.json({ ok: true });
}
