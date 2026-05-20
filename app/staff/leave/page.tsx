import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import LeaveManager from "./LeaveManager";

export const dynamic = "force-dynamic";

export default async function LeavePage() {
  const { user, profile } = await requireStaff(["nurse", "owner", "doctor"]);
  const admin = createAdminClient();

  const { count } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <StaffShell
      role={profile.role as "owner" | "nurse" | "doctor"}
      userName={profile.full_name}
      nav={await staffNav(profile.role, count || 0)}
    >
      <h2 className="text-base font-medium mb-1">Leave requests</h2>
      <p className="text-xs text-stone-500 mb-4">
        Submit a leave request — only the owner can approve. While pending, you can withdraw it.
      </p>
      <LeaveManager myProfileId={user.id} role={profile.role as "nurse" | "owner" | "doctor"} />
    </StaffShell>
  );
}
