import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

const ALLOWED_STATUSES = ["pending", "confirmed", "rejected", "cancelled", "expired"];

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
  if (!profile?.active || profile.role !== "owner") {
    return NextResponse.json({ error: "Forbidden — owner only" }, { status: 403 });
  }

  const { booking_id, new_status, notes } = await req.json();
  if (!ALLOWED_STATUSES.includes(new_status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: before } = await admin.from("bookings").select("*").eq("id", booking_id).single();
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (
    new_status === "confirmed" &&
    before.parent_booking_id &&
    (before.type === "reschedule" || before.type === "cancellation")
  ) {
    await admin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", before.parent_booking_id);
  }

  const { error } = await admin
    .from("bookings")
    .update({
      status: new_status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      reviewer_notes: notes ? `[OWNER OVERRIDE] ${notes}` : "[OWNER OVERRIDE]",
    })
    .eq("id", booking_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "owner_override",
    entity_type: "booking",
    entity_id: booking_id,
    before_data: { status: before.status },
    after_data: { status: new_status, notes },
  });

  return NextResponse.json({ ok: true });
}
