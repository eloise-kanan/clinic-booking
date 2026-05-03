import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import CalendarView from "@/components/CalendarView";
import AddToHomeScreenButton from "@/components/AddToHomeScreenButton";

export const dynamic = "force-dynamic";

export default async function DoctorCalendarPage() {
  const { user, profile } = await requireStaff(["doctor", "owner"]);
  const admin = createAdminClient();
  const { data: doctor } = await admin
    .from("doctors")
    .select("id, display_name")
    .eq("profile_id", user.id)
    .single();

  return (
    <StaffShell
      role="doctor"
      userName={profile.full_name}
      nav={staffNav(profile.role)}
    >
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-base font-medium">My calendar</h2>
        <AddToHomeScreenButton />
      </div>
      <CalendarView doctors={doctor ? [doctor] : []} scope="own" />
    </StaffShell>
  );
}
