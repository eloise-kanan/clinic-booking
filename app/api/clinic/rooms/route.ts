import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// GET /api/clinic/rooms — returns the current room list.
// POST /api/clinic/rooms — owner-only; body: { rooms: string[] } replaces.
export async function GET() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("clinic_settings")
    .select("rooms_list")
    .eq("id", true)
    .maybeSingle();
  return NextResponse.json({ rooms: data?.rooms_list || ["Room 1", "Room 2", "Room 3"] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: actor } = await supabase.from("profiles").select("role, active").eq("id", user.id).single();
  if (!actor?.active || actor.role !== "owner") {
    return NextResponse.json({ error: "Forbidden — owner only" }, { status: 403 });
  }

  const body = await req.json();
  const rooms = body.rooms;
  if (!Array.isArray(rooms) || rooms.length === 0) {
    return NextResponse.json({ error: "rooms must be a non-empty array" }, { status: 400 });
  }
  const cleaned = rooms.map((r) => String(r).trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return NextResponse.json({ error: "All room labels were empty" }, { status: 400 });
  }

  const admin = createAdminClient();
  // clinic_settings is a singleton row keyed by id=true (matching the rest of the codebase).
  const { error } = await admin
    .from("clinic_settings")
    .update({ rooms_list: cleaned })
    .eq("id", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "rooms_list_update",
    entity_type: "clinic_settings",
    after_data: { rooms: cleaned },
  });

  return NextResponse.json({ ok: true, rooms: cleaned });
}
