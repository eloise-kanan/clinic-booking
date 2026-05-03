import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// GET /api/leave/requests — staff sees all (transparency); ?mine=1 filters to own
export async function GET(req: Request) {
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

  const url = new URL(req.url);
  const onlyMine = url.searchParams.get("mine") === "1";
  const status = url.searchParams.get("status");

  const admin = createAdminClient();
  let query = admin
    .from("leave_requests")
    .select(
      "id, profile_id, start_date, end_date, reason, status, reviewed_at, reviewer_notes, created_at, profile:profiles!leave_requests_profile_id_fkey(full_name, role), reviewer:profiles!leave_requests_reviewed_by_fkey(full_name)"
    )
    .order("created_at", { ascending: false });
  if (onlyMine) query = query.eq("profile_id", user.id);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data });
}

// POST /api/leave/requests — submit a leave request for self
export async function POST(req: Request) {
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
  if (!profile?.active || !["nurse", "owner", "doctor"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { start_date, end_date, reason } = body;
  if (!start_date || !end_date) {
    return NextResponse.json({ error: "start_date and end_date are required" }, { status: 400 });
  }
  if (end_date < start_date) {
    return NextResponse.json({ error: "end_date must be on or after start_date" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("leave_requests")
    .insert({
      profile_id: user.id,
      start_date,
      end_date,
      reason: reason || null,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data?.id });
}
