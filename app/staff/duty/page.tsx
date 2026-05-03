import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import DutyManager from "./DutyManager";

export const dynamic = "force-dynamic";

export default async function DutyPage() {
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
      nav={staffNav(profile.role, count || 0)}
    >
      <h2 className="text-base font-medium mb-1">Shift changes</h2>
      <p className="text-xs text-stone-500 mb-4">
        Default duty for all staff is <strong>09:00–21:00</strong>. Submit a shift change below only for days
        when you&apos;re working different hours (covering for someone, half-day, etc.). The owner must approve
        before it takes effect on the duty calendar. For full-day absences, use <strong>Leave</strong> instead.
      </p>
      <DutyManager myProfileId={user.id} myName={profile.full_name} role={profile.role as "nurse" | "owner" | "doctor"} />
    </StaffShell>
  );
}
