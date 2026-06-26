import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// GET /api/pin/staff-list — return the active staff (nurse + doctor) who have
// a PIN set, plus whether each is currently locked out. Used by the PIN
// challenge modal to render the staff cards.
//
// Auth: any signed-in user (terminal, nurse, doctor, owner). The terminal
// account will be the primary consumer.
//
// We intentionally do NOT return pin_hash — only the boolean fact of PIN
// existence + the lockout state — so a snooped network response leaks no
// crypto material.

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Optional ?roles=nurse or ?roles=nurse,doctor — narrows the picker to
  // staff who are allowed to perform a specific action (e.g. booking
  // confirmation is nurse-only).
  const url = new URL(req.url);
  const rolesParam = url.searchParams.get("roles");
  const roles = rolesParam
    ? rolesParam.split(",").filter((r) => r === "nurse" || r === "doctor")
    : ["nurse", "doctor"];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, role, full_name, pin_hash, pin_locked_until")
    .in("role", roles)
    .eq("active", true)
    .order("role")
    .order("full_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = Date.now();
  const staff = (data || [])
    .filter((p) => !!p.pin_hash)  // hide staff who don't have a PIN set yet
    .map((p) => ({
      id: p.id,
      role: p.role as "nurse" | "doctor",
      full_name: p.full_name,
      locked: !!(p.pin_locked_until && new Date(p.pin_locked_until).getTime() > now),
      locked_until: p.pin_locked_until,
    }));

  return NextResponse.json({ staff });
}
