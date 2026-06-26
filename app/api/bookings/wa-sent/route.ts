import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { resolveActor } from "@/lib/pin";

const KIND_TO_COLUMNS: Record<string, { at: string; by: string }> = {
  check: { at: "check_sent_at", by: "check_sent_by" },
  confirm: { at: "confirm_sent_at", by: "confirm_sent_by" },
  reject: { at: "reject_sent_at", by: "reject_sent_by" },
  cancel: { at: "cancel_sent_at", by: "cancel_sent_by" },
  reminder: { at: "reminder_sent_at", by: "reminder_sent_by" },
};

// POST /api/bookings/wa-sent
// body: { booking_id, kind, pin_profile_id?, pin? }
// Records who sent the WhatsApp message. Nurse-only.
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
  const { booking_id, kind } = body;
  if (!booking_id) return NextResponse.json({ error: "booking_id required" }, { status: 400 });
  const cols = KIND_TO_COLUMNS[kind];
  if (!cols) {
    return NextResponse.json(
      { error: "kind must be check, confirm, reject, cancel, or reminder" },
      { status: 400 }
    );
  }

  const actor = await resolveActor(user.id, body, { allowedPinRoles: ["nurse"] });
  if (!actor.ok) return NextResponse.json({ error: actor.error }, { status: actor.status });

  const admin = createAdminClient();
  const { error } = await admin
    .from("bookings")
    .update({ [cols.at]: new Date().toISOString(), [cols.by]: actor.actorId })
    .eq("id", booking_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
