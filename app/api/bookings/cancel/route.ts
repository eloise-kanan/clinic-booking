import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Staff-driven cancellation. Works on any pending or confirmed booking.
// Owner can also use /api/bookings/override; this endpoint exists so nurses
// can cancel without owner involvement.
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

  const { booking_id, notes } = await req.json();
  if (!booking_id) return NextResponse.json({ error: "booking_id is required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("bookings")
    .select("id, status")
    .eq("id", booking_id)
    .single();
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["pending", "confirmed"].includes(before.status)) {
    return NextResponse.json({ error: `Cannot cancel a ${before.status} booking` }, { status: 409 });
  }

  const { error } = await admin
    .from("bookings")
    .update({
      status: "cancelled",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      reviewer_notes: notes ? `[STAFF CANCEL] ${notes}` : "[STAFF CANCEL]",
    })
    .eq("id", booking_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "staff_cancel",
    entity_type: "booking",
    entity_id: booking_id,
    before_data: { status: before.status },
    after_data: { status: "cancelled", notes },
  });

  return NextResponse.json({ ok: true });
}
