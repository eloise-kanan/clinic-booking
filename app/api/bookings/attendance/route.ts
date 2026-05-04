import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// POST /api/bookings/attendance
// body: { booking_id, mark: "attended" | "no_show" | "clear" }
// Nurses + owners can mark attendance.
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
  if (!profile?.active || !["nurse", "owner"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { booking_id, mark } = await req.json();
  if (!booking_id) return NextResponse.json({ error: "booking_id required" }, { status: 400 });
  if (!["attended", "no_show", "clear"].includes(mark)) {
    return NextResponse.json({ error: "mark must be 'attended', 'no_show', or 'clear'" }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const update: Record<string, unknown> =
    mark === "attended"
      ? {
          attended_at: now,
          attended_by: user.id,
          no_show: false,
          no_show_at: null,
          no_show_by: null,
        }
      : mark === "no_show"
        ? {
            no_show: true,
            no_show_at: now,
            no_show_by: user.id,
            attended_at: null,
            attended_by: null,
          }
        : {
            attended_at: null,
            attended_by: null,
            no_show: false,
            no_show_at: null,
            no_show_by: null,
          };

  const { error } = await admin.from("bookings").update(update).eq("id", booking_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: `booking_${mark}`,
    entity_type: "booking",
    entity_id: booking_id,
  });

  return NextResponse.json({ ok: true });
}
