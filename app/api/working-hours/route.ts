import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

async function requireOwner() {
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
  if (!profile?.active || profile.role !== "owner") {
    return { error: NextResponse.json({ error: "Forbidden — owner only" }, { status: 403 }) };
  }
  return { user };
}

// GET /api/working-hours?doctor_id=...
export async function GET(req: Request) {
  const auth = await requireOwner();
  if ("error" in auth) return auth.error;
  const url = new URL(req.url);
  const doctorId = url.searchParams.get("doctor_id");
  if (!doctorId) return NextResponse.json({ error: "doctor_id required" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("working_hours")
    .select("id, weekday, start_time, end_time")
    .eq("doctor_id", doctorId)
    .order("weekday")
    .order("start_time");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ blocks: data });
}

// PUT /api/working-hours — replaces all blocks for a doctor with the supplied set.
// body: { doctor_id, blocks: [{ weekday, start_time, end_time }] }
export async function PUT(req: Request) {
  const auth = await requireOwner();
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const { doctor_id, blocks } = body as {
    doctor_id?: string;
    blocks?: { weekday: number; start_time: string; end_time: string }[];
  };
  if (!doctor_id) return NextResponse.json({ error: "doctor_id required" }, { status: 400 });
  if (!Array.isArray(blocks)) return NextResponse.json({ error: "blocks must be an array" }, { status: 400 });

  // Validate every block
  for (const b of blocks) {
    if (
      typeof b.weekday !== "number" ||
      b.weekday < 0 ||
      b.weekday > 6 ||
      !/^\d{2}:\d{2}(:\d{2})?$/.test(b.start_time) ||
      !/^\d{2}:\d{2}(:\d{2})?$/.test(b.end_time)
    ) {
      return NextResponse.json({ error: "Invalid block format" }, { status: 400 });
    }
    if (b.start_time >= b.end_time) {
      return NextResponse.json({ error: "Each block's end must be after its start" }, { status: 400 });
    }
  }

  const admin = createAdminClient();
  // Replace all blocks for this doctor in one transaction (best effort).
  const { error: delErr } = await admin.from("working_hours").delete().eq("doctor_id", doctor_id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  if (blocks.length > 0) {
    const rows = blocks.map((b) => ({
      doctor_id,
      weekday: b.weekday,
      start_time: b.start_time,
      end_time: b.end_time,
    }));
    const { error: insErr } = await admin.from("working_hours").insert(rows);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    actor_id: auth.user.id,
    action: "working_hours_update",
    entity_type: "doctor",
    entity_id: doctor_id,
    after_data: { block_count: blocks.length },
  });

  return NextResponse.json({ ok: true });
}
