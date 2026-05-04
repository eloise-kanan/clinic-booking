import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// POST /api/bookings/reminder-sent
// body: { booking_id }
// Marks the reminder as sent by the current staff member, "now". Idempotent —
// if the nurse opens the wa.me link again, the timestamp + actor refresh.
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

  const { booking_id } = await req.json();
  if (!booking_id) return NextResponse.json({ error: "booking_id required" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("bookings")
    .update({
      reminder_sent_at: new Date().toISOString(),
      reminder_sent_by: user.id,
    })
    .eq("id", booking_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
