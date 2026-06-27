import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { effectiveProfile } from "@/lib/pin";

// GET /api/leave/balance — returns the current leave-day balances for the
// signed-in staff member. On a terminal session, resolves the PIN holder.
//
// Response: { balance: { annual, mc, emergency } }
// Standard defaults if the columns are NULL: 14 / 14 / 5.

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active, full_name")
    .eq("id", user.id)
    .single();
  if (!profile?.active) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const eff = await effectiveProfile(user.id, profile.role, profile.full_name);
  if (!eff) return NextResponse.json({ error: "Sign in with your PIN first." }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("annual_leave_balance, mc_balance, emergency_balance")
    .eq("id", eff.id)
    .single();

  return NextResponse.json({
    balance: {
      annual: data?.annual_leave_balance ?? 14,
      mc: data?.mc_balance ?? 14,
      emergency: data?.emergency_balance ?? 5,
    },
  });
}
