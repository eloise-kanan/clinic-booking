import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { loadPlan } from "@/lib/branding-server";
import { hasFeature, type Plan } from "@/lib/plan";

// Public — used by the /book form. Always returns id + display_name; if the
// clinic is on a plan with doctor_profiles enabled, also returns expertise +
// bio + rating fields so the BookingForm can render the rich doctor cards.
export async function GET() {
  const supabase = createAdminClient();
  const plan = (await loadPlan()) as Plan;
  const profilesOn = hasFeature(plan, "doctor_profiles");

  const cols = profilesOn
    ? "id, display_name, expertise, bio, rating_average, rating_count"
    : "id, display_name";

  const { data, error } = await supabase
    .from("doctors")
    .select(cols)
    .eq("active", true)
    .order("display_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ doctors: data });
}
