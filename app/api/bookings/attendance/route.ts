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

  // Read the previous state so we can adjust visit_count + last_visit_at
  // correctly across transitions (mark attended ↔ no_show / clear).
  const { data: prev } = await admin
    .from("bookings")
    .select("patient_id, attended_at")
    .eq("id", booking_id)
    .maybeSingle();
  const wasAttended = !!prev?.attended_at;

  const { error } = await admin.from("bookings").update(update).eq("id", booking_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // visit_count + last_visit_at follow attended state transitions:
  //   not-attended → attended  : visit_count += 1, last_visit_at = now,
  //                              recall_reminder_sent_at reset (fresh cycle)
  //   attended    → !attended  : visit_count -= 1 (no_show / clear)
  if (prev?.patient_id) {
    if (mark === "attended" && !wasAttended) {
      const { data: pat } = await admin
        .from("patients")
        .select("visit_count")
        .eq("id", prev.patient_id)
        .maybeSingle();
      await admin
        .from("patients")
        .update({
          visit_count: (pat?.visit_count || 0) + 1,
          last_visit_at: now,
          recall_reminder_sent_at: null,
        })
        .eq("id", prev.patient_id);
    } else if (mark !== "attended" && wasAttended) {
      const { data: pat } = await admin
        .from("patients")
        .select("visit_count")
        .eq("id", prev.patient_id)
        .maybeSingle();
      await admin
        .from("patients")
        .update({ visit_count: Math.max(0, (pat?.visit_count || 0) - 1) })
        .eq("id", prev.patient_id);
    }
  }

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: `booking_${mark}`,
    entity_type: "booking",
    entity_id: booking_id,
  });

  return NextResponse.json({ ok: true });
}
