import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import { loadPlan } from "@/lib/branding-server";
import { hasFeature, type Plan } from "@/lib/plan";
import DutyCalendar from "./DutyCalendar";

export const dynamic = "force-dynamic";

export default async function DutyCalendarPage() {
  const { profile } = await requireStaff(["nurse", "owner", "doctor", "terminal"]);
  const isTerminal = profile.role === "terminal";
  const admin = createAdminClient();

  const { count } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  // Nurse rows on the duty calendar are a Premium feature; Standard tier sees
  // doctors only. The /api/staff/list endpoint already returns both, so
  // filtering happens on the client.
  const plan = (await loadPlan()) as Plan;
  const includeNurses = hasFeature(plan, "calendar.duty.nurse");

  return (
    <StaffShell
      role={isTerminal ? "nurse" : (profile.role as "owner" | "nurse" | "doctor")}
      userName={isTerminal ? "Clinic terminal" : profile.full_name}
      nav={await staffNav(isTerminal ? "terminal" : profile.role, count || 0)}
      isTerminal={isTerminal}
    >
      <h2 className="text-base font-medium mb-1">Duty calendar</h2>
      <p className="text-xs text-stone-500 mb-4">
        Who&apos;s on duty for the month. Approved leaves shown in red.
        {!includeNurses && " (Doctors only — upgrade to Premium to see nurses too.)"}
      </p>
      <DutyCalendar includeNurses={includeNurses} />
    </StaffShell>
  );
}
