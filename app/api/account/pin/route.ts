import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { hashPin, isValidPinFormat, verifyPin } from "@/lib/pin";

// POST /api/account/pin — staff change their own PIN.
// Body: { current_pin?: "123456", new_pin: "654321" }
// Current PIN required if one is already set; first-time set can skip it
// (owner created the account with no PIN yet).
// Owners can't call this — they have no PIN.

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("id, role, pin_hash").eq("id", user.id).single();
  if (!profile?.id) return NextResponse.json({ error: "Profile missing" }, { status: 404 });
  if (profile.role === "owner") {
    return NextResponse.json({ error: "Owners don't use PINs" }, { status: 400 });
  }
  if (profile.role === "terminal") {
    return NextResponse.json({ error: "Terminal account has no PIN" }, { status: 400 });
  }

  const { current_pin, new_pin } = await req.json();
  if (!isValidPinFormat(new_pin)) {
    return NextResponse.json({ error: "New PIN must be exactly 6 digits" }, { status: 400 });
  }

  // If a PIN is already set, the current one must be provided + correct.
  if (profile.pin_hash) {
    if (!isValidPinFormat(current_pin)) {
      return NextResponse.json({ error: "Current PIN required" }, { status: 400 });
    }
    const check = await verifyPin(user.id, current_pin);
    if (!check.ok) {
      const msg =
        check.reason === "locked"
          ? "Too many wrong attempts — locked. Ask owner to reset."
          : "Current PIN is incorrect";
      return NextResponse.json({ error: msg }, { status: 403 });
    }
  }

  const pin_hash = await hashPin(new_pin);
  const { error } = await admin.from("profiles").update({
    pin_hash,
    pin_set_at: new Date().toISOString(),
    pin_failed_attempts: 0,
    pin_locked_until: null,
  }).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id, action: "self_pin_change",
    entity_type: "profile", entity_id: user.id,
  });
  return NextResponse.json({ ok: true });
}
