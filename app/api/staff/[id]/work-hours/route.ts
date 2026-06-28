import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// POST /api/staff/[id]/work-hours
// body: { blocks: [{ weekday:0..6, start_time:"HH:MM", end_time:"HH:MM" }, ...] }
//
// Owner-only. Single endpoint for editing per-weekday hours regardless of
// whether the staff is a doctor or nurse.
//   • Doctor → delete + insert into the `working_hours` table (drives the
//     /book slot generator). One row per block.
//   • Nurse → write the blocks array to `profiles.default_work_hours` JSONB.
//     Nurses don't appear in /book so no slot generation is needed.
type Block = { weekday: number; start_time: string; end_time: string };

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: actor } = await supabase
    .from("profiles").select("role, active").eq("id", user.id).single();
  if (!actor?.active || actor.role !== "owner") {
    return NextResponse.json({ error: "Forbidden — owner only" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await req.json();
  const blocks = Array.isArray(body.blocks) ? (body.blocks as Block[]) : [];

  // Validate each block.
  for (const b of blocks) {
    if (
      typeof b.weekday !== "number" ||
      b.weekday < 0 ||
      b.weekday > 6 ||
      !/^\d{2}:\d{2}(:\d{2})?$/.test(b.start_time) ||
      !/^\d{2}:\d{2}(:\d{2})?$/.test(b.end_time) ||
      b.start_time >= b.end_time
    ) {
      return NextResponse.json(
        { error: `Invalid block on weekday ${b.weekday} (${b.start_time}–${b.end_time})` },
        { status: 400 }
      );
    }
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("role, default_work_hours")
    .eq("id", id)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  if (target.role === "doctor") {
    const { data: doc } = await admin
      .from("doctors")
      .select("id")
      .eq("profile_id", id)
      .maybeSingle();
    if (!doc) return NextResponse.json({ error: "Doctor row missing" }, { status: 404 });
    // Replace working_hours wholesale — matches /api/working-hours PUT semantics.
    const { data: prevRows } = await admin
      .from("working_hours")
      .select("weekday, start_time, end_time")
      .eq("doctor_id", doc.id);
    await admin.from("working_hours").delete().eq("doctor_id", doc.id);
    if (blocks.length > 0) {
      const { error } = await admin.from("working_hours").insert(
        blocks.map((b) => ({
          doctor_id: doc.id,
          weekday: b.weekday,
          start_time: b.start_time,
          end_time: b.end_time,
        }))
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "working_hours_update",
      entity_type: "doctor",
      entity_id: id,
      before_data: { blocks: prevRows || [] },
      after_data: { blocks },
    });
  } else if (target.role === "nurse") {
    const { error } = await admin
      .from("profiles")
      .update({ default_work_hours: blocks })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "working_hours_update",
      entity_type: "profile",
      entity_id: id,
      before_data: { blocks: target.default_work_hours || [] },
      after_data: { blocks },
    });
  } else {
    return NextResponse.json(
      { error: `Cannot set work hours for role ${target.role}` },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
