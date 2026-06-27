import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import CalendarView from "@/components/CalendarView";
import AddToHomeScreenButton from "@/components/AddToHomeScreenButton";
import { effectiveProfile } from "@/lib/pin";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const { user, profile } = await requireStaff(["nurse", "owner", "terminal"]);
  const isTerminal = profile.role === "terminal";
  const admin = createAdminClient();

  // If this is a terminal session, the page is being accessed via PIN unlock.
  // A doctor PIN-holder should see only THEIR column — same as /doctor/calendar.
  // Nurse / owner PIN-holders see all doctors as before.
  let pinHolderIsDoctor = false;
  let pinHolderDoctorRow: { id: string; display_name: string } | null = null;
  if (isTerminal) {
    const eff = await effectiveProfile(user.id, profile.role, profile.full_name);
    if (eff?.role === "doctor") {
      pinHolderIsDoctor = true;
      const { data: doc } = await admin
        .from("doctors")
        .select("id, display_name")
        .eq("profile_id", eff.id)
        .maybeSingle();
      pinHolderDoctorRow = doc || null;
    }
  }

  const { data: allDoctors } = await admin
    .from("doctors")
    .select("id, display_name")
    .eq("active", true)
    .order("display_name");

  const visibleDoctors = pinHolderIsDoctor
    ? (pinHolderDoctorRow ? [pinHolderDoctorRow] : [])
    : (allDoctors || []);

  const { count } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <StaffShell
      role={isTerminal ? "nurse" : (profile.role as "owner" | "nurse")}
      userName={isTerminal ? "Clinic terminal" : profile.full_name}
      nav={await staffNav(isTerminal ? "terminal" : profile.role, count || 0)}
      isTerminal={isTerminal}
    >
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-base font-medium">
          {pinHolderIsDoctor ? "My calendar" : "All doctors — calendar view"}
        </h2>
        <AddToHomeScreenButton />
      </div>
      <CalendarView
        doctors={visibleDoctors as { id: string; display_name: string }[]}
        scope={pinHolderIsDoctor ? "own" : "all"}
      />
    </StaffShell>
  );
}
