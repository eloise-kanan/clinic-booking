import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { verifyPin } from "@/lib/pin";

// POST /api/pin/verify — confirms a {profile_id, pin} pair without performing
// any side-effect. Used by the PinChallenge modal to validate the PIN before
// proceeding with the actual write action. The client then stores the
// {profile_id, pin} pair in sessionStorage for ~90 seconds (grace window) so
// back-to-back actions don't re-prompt.
//
// Notes:
//   • Any signed-in user can verify (nurses can verify their own PIN even
//     when not in terminal mode — used by /staff/profile flows).
//   • verifyPin() handles rate limiting (3 fail → 5 min lockout per profile).
//   • Successful PIN entries reset the failure counter.

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { profile_id, pin } = await req.json();
  if (!profile_id || !pin) {
    return NextResponse.json({ error: "profile_id and pin are required" }, { status: 400 });
  }

  const result = await verifyPin(profile_id, pin);
  if (result.ok) {
    return NextResponse.json({ ok: true, profile_id: result.profileId });
  }

  const status = result.reason === "locked" ? 423 : 403;
  return NextResponse.json({
    ok: false,
    reason: result.reason,
    locked_until: result.lockedUntil,
  }, { status });
}
