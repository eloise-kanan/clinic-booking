import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Staff-only patient lookup by ID alone (no phone match required).
// Used by the on-behalf booking form to prefill known patients.
export async function GET(req: Request) {
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

  const url = new URL(req.url);
  const idType = url.searchParams.get("id_type");
  const idNumber = url.searchParams.get("id_number");
  if (!idType || !idNumber) {
    return NextResponse.json({ error: "id_type and id_number required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: patient } = await admin
    .from("patients")
    .select("id, full_name, nationality, id_type, id_number, whatsapp_number")
    .eq("id_type", idType)
    .eq("id_number", idNumber)
    .maybeSingle();

  return NextResponse.json({ patient });
}
