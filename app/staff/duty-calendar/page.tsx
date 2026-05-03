import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import DutyCalendar from "./DutyCalendar";

export const dynamic = "force-dynamic";

export default async function DutyCalendarPage() {
  const { profile } = await requireStaff(["nurse", "owner", "doctor"]);
  const admin = createAdminClient();

  const { count } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <StaffShell
      role={profile.role as "owner" | "nurse" | "doctor"}
      userName={profile.full_name}
      nav={staffNav(profile.role, count || 0)}
    >
      <h2 className="text-base font-medium mb-1">Duty calendar</h2>
      <p className="text-xs text-stone-500 mb-4">
        Who&apos;s on duty for the month. Approved leaves shown in red.
      </p>
      <DutyCalendar />
    </StaffShell>
  );
}
