import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { resolveActor } from "@/lib/pin";

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
  if (!profile?.active || !["nurse", "owner", "terminal"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { booking_id, notes } = body;

  // If we're on the shared terminal, demand a {pin_profile_id, pin} pair —
  // the action is attributed to the PIN holder, not the terminal account.
  // Booking confirmation is nurse-only (clinic policy), so doctor PINs are
  // rejected at this gate even though they're valid PINs.
  const actor = await resolveActor(user.id, body, { allowedPinRoles: ["nurse"] });
  if (!actor.ok) return NextResponse.json({ error: actor.error }, { status: actor.status });

  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("id, type, parent_booking_id, patient_id, status")
    .eq("id", booking_id)
    .single();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.status !== "pending") {
    return NextResponse.json({ error: "Already processed" }, { status: 409 });
  }

  // For reschedule and cancellation, the parent must be cancelled
  if (booking.parent_booking_id && (booking.type === "reschedule" || booking.type === "cancellation")) {
    await admin.from("bookings").update({ status: "cancelled" }).eq("id", booking.parent_booking_id);
  }

  // Cancellation: mark this request as cancelled too (it represents the cancel intent fulfilled)
  const newStatus = booking.type === "cancellation" ? "cancelled" : "confirmed";

  const { error } = await admin
    .from("bookings")
    .update({
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: actor.actorId,
      reviewer_notes: notes || null,
    })
    .eq("id", booking_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // visit_count is no longer touched on confirmation. It now reflects actual
  // attended visits only and is updated by /api/bookings/attendance.

  // Audit — uses the PIN-resolved actor when this came from the shared
  // terminal, so the log captures the actual staff member, not the kiosk.
  await admin.from("audit_log").insert({
    actor_id: actor.actorId,
    action: `approve_${booking.type}`,
    entity_type: "booking",
    entity_id: booking_id,
    after_data: { status: newStatus, via_terminal: actor.isTerminal },
  });

  return NextResponse.json({ ok: true });
}
