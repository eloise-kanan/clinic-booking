import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

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
  if (!profile?.active) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const admin = createAdminClient();

  // Doctors can only manage their own
  if (profile.role === "doctor") {
    const { data: doc } = await admin.from("doctors").select("id").eq("profile_id", user.id).single();
    if (!doc || doc.id !== body.doctor_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (profile.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const insertable: any = { doctor_id: body.doctor_id, reason: body.reason || null };
  if (body.start_at && body.end_at) {
    insertable.start_at = body.start_at;
    insertable.end_at = body.end_at;
  } else {
    insertable.weekday = body.weekday;
    insertable.start_time = body.start_time;
    insertable.end_time = body.end_time;
  }
  const { error } = await admin.from("breaks").insert(insertable);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .single();
  if (!profile?.active) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  // Verify ownership for doctors
  if (profile.role === "doctor") {
    const { data: brk } = await admin.from("breaks").select("doctor_id").eq("id", id).single();
    const { data: doc } = await admin.from("doctors").select("id").eq("profile_id", user.id).single();
    if (!brk || !doc || brk.doctor_id !== doc.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (profile.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await admin.from("breaks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
