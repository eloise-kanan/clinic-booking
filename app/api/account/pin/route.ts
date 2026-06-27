import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { hashPin, isValidPinFormat, verifyPin } from "@/lib/pin";
import { readPinCookie } from "@/lib/pin-cookie";

// POST /api/account/pin — change a PIN.
// Body: { current_pin?: "123456", new_pin: "654321" }
//
// Two contexts:
//   • Personal device (signed in as nurse/doctor) → changes that user's PIN.
//   • Shared terminal (signed in as terminal) → reads the PIN-lock cookie to
//     identify the PIN holder and changes THEIR PIN. The cookie is set when
//     the staff member entered their current PIN; current_pin must match.
//
// Owners have no PIN — they get rejected here.

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: authProfile } = await admin
    .from("profiles").select("id, role").eq("id", user.id).single();
  if (!authProfile?.id) return NextResponse.json({ error: "Profile missing" }, { status: 404 });
  if (authProfile.role === "owner") {
    return NextResponse.json({ error: "Owners don't use PINs" }, { status: 400 });
  }

  // Resolve which profile we're actually changing. On terminal, it's the
  // PIN-lock cookie holder; on personal device, it's the auth user.
  let targetProfileId: string;
  if (authProfile.role === "terminal") {
    const cookie = await readPinCookie();
    if (!cookie) {
      return NextResponse.json(
        { error: "Sign in with your PIN at the lockscreen first." },
        { status: 401 }
      );
    }
    targetProfileId = cookie.profileId;
  } else {
    targetProfileId = user.id;
  }

  const { current_pin, new_pin } = await req.json();
  if (!isValidPinFormat(new_pin)) {
    return NextResponse.json({ error: "New PIN must be exactly 6 digits" }, { status: 400 });
  }

  // Load the target profile to know whether a current PIN exists.
  const { data: targetProfile } = await admin
    .from("profiles").select("id, role, pin_hash").eq("id", targetProfileId).single();
  if (!targetProfile) return NextResponse.json({ error: "Target profile missing" }, { status: 404 });

  // If a PIN is already set, the current one must be provided + correct —
  // even on the terminal (the cookie isn't enough; we want explicit consent).
  if (targetProfile.pin_hash) {
    if (!isValidPinFormat(current_pin)) {
      return NextResponse.json({ error: "Current PIN required" }, { status: 400 });
    }
    const check = await verifyPin(targetProfileId, current_pin);
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
  }).eq("id", targetProfileId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: targetProfileId,
    action: "self_pin_change",
    entity_type: "profile",
    entity_id: targetProfileId,
    after_data: { via_terminal: authProfile.role === "terminal" },
  });
  return NextResponse.json({ ok: true });
}
