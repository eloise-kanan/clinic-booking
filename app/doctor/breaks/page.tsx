import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import BreakManager from "./BreakManager";

export const dynamic = "force-dynamic";

export default async function BreaksPage() {
  const { user, profile } = await requireStaff(["doctor", "owner"]);
  const admin = createAdminClient();
  const { data: doctor } = await admin
    .from("doctors")
    .select("id, display_name")
    .eq("profile_id", user.id)
    .single();
  const { data: breaks } = doctor
    ? await admin
        .from("breaks")
        .select("id, weekday, start_time, end_time, start_at, end_at, reason")
        .eq("doctor_id", doctor.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <StaffShell
      role="doctor"
      userName={profile.full_name}
      nav={staffNav(profile.role)}
    >
      <h2 className="text-base font-medium mb-4">Block time off</h2>
      <BreakManager doctorId={doctor?.id || ""} initial={(breaks as any) || []} />
    </StaffShell>
  );
}
