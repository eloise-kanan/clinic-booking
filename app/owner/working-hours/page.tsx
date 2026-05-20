import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import WorkingHoursEditor from "./WorkingHoursEditor";

export const dynamic = "force-dynamic";

export default async function WorkingHoursPage() {
  const { profile } = await requireStaff(["owner"]);
  const admin = createAdminClient();

  const { data: doctors } = await admin
    .from("doctors")
    .select("id, display_name, default_slot_minutes")
    .eq("active", true)
    .order("display_name");

  return (
    <StaffShell role="owner" userName={profile.full_name} nav={await staffNav(profile.role)}>
      <h2 className="text-base font-medium mb-1">Doctor working hours</h2>
      <p className="text-xs text-stone-500 mb-4">
        Set each doctor&apos;s recurring weekly schedule. The booking form only offers slots within these
        hours. Default for newly-created doctors is <strong>09:00–21:00 every day</strong>.
      </p>
      <WorkingHoursEditor doctors={(doctors as any[]) || []} />
    </StaffShell>
  );
}
