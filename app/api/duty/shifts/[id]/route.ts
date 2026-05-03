import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// PATCH /api/duty/shifts/[id] — owner approves or rejects
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
  const { error } = await admin
    .from("duty_shifts")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      reviewer_notes: notes || null,
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
  return NextResponse.json({ ok: true });
}
