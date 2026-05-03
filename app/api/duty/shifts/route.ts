import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

async function requireStaffApi() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .single();
  if (!profile?.active || !["nurse", "owner", "doctor"].includes(profile.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, profile };
}

// GET /api/duty/shifts?from=YYYY-MM-DD&to=YYYY-MM-DD&status=approved|pending|rejected
export async function GET(req: Request) {
  const auth = await requireStaffApi();
  if ("error" in auth) return auth.error;
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const status = url.searchParams.get("status");
  if (!from || !to) {
    return NextResponse.json({ error: "from and to dates are required" }, { status: 400 });
  }

  const admin = createAdminClient();
  let query = admin
    .from("duty_shifts")
    .select(
      "id, profile_id, shift_date, start_time, end_time, notes, status, reviewed_at, reviewer_notes, profile:profiles!duty_shifts_profile_id_fkey(full_name, role), reviewer:profiles!duty_shifts_reviewed_by_fkey(full_name)"
    )
    .gte("shift_date", from)
    .lte("shift_date", to)
    .order("shift_date")
    .order("start_time");
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ shifts: data });
}

// POST /api/duty/shifts — submit a custom shift for self (status='pending').
// Owner-submitted shifts are auto-approved, since they're the approver.
export async function POST(req: Request) {
  const auth = await requireStaffApi();
  if ("error" in auth) return auth.error;
  const { user, profile } = auth;

  const body = await req.json();
  const { profile_id, shift_date, start_time, end_time, notes } = body;
  if (!shift_date || !start_time || !end_time) {
    return NextResponse.json({ error: "shift_date, start_time, end_time are required" }, { status: 400 });
  }

  const targetProfileId = profile.role === "owner" && profile_id ? profile_id : user.id;
  const isOwnerSubmission = profile.role === "owner";

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("duty_shifts")
    .insert({
      profile_id: targetProfileId,
      shift_date,
      start_time,
      end_time,
      notes: notes || null,
      status: isOwnerSubmission ? "approved" : "pending",
      reviewed_at: isOwnerSubmission ? new Date().toISOString() : null,
      reviewed_by: isOwnerSubmission ? user.id : null,
      reviewer_notes: isOwnerSubmission ? "[OWNER SUBMITTED]" : null,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data?.id });
}
