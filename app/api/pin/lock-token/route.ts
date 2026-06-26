import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { verifyPin } from "@/lib/pin";
import { setPinCookie, clearPinCookie } from "@/lib/pin-cookie";

// POST /api/pin/lock-token
// body: { profile_id, pin }
// Verifies the PIN + sets a signed cookie that <PinGate> reads to grant
// page access for ~5 minutes (sliding). Used for HR / doctor pages on the
// shared terminal — the client redirects back to the original URL on success.
//
// DELETE /api/pin/lock-token — explicit logout / lock (called on Sign out).
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { profile_id, pin } = await req.json();
  if (!profile_id || !pin) {
    return NextResponse.json({ error: "profile_id and pin required" }, { status: 400 });
  }

  const result = await verifyPin(profile_id, pin);
  if (!result.ok) {
    const status = result.reason === "locked" ? 423 : 403;
    return NextResponse.json(
      { ok: false, reason: result.reason, locked_until: result.lockedUntil },
      { status }
    );
  }
  if (result.role !== "nurse" && result.role !== "doctor") {
    return NextResponse.json({ error: "Only nurse / doctor PINs can unlock pages" }, { status: 403 });
  }

  await setPinCookie({ profileId: result.profileId, role: result.role });
  return NextResponse.json({ ok: true, profile_id: result.profileId, role: result.role });
}

export async function DELETE() {
  await clearPinCookie();
  return NextResponse.json({ ok: true });
}
