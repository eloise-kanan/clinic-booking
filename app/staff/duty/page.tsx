import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import DutyManager from "./DutyManager";
import { effectiveProfile } from "@/lib/pin";
import PinGateChallenge from "@/components/PinGateChallenge";

export const dynamic = "force-dynamic";

export default async function DutyPage() {
  const { user, profile } = await requireStaff(["nurse", "owner", "doctor", "terminal"]);
  const eff = await effectiveProfile(user.id, profile.role, profile.full_name);
  const admin = createAdminClient();

  const { count } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const isTerminal = profile.role === "terminal";

  if (isTerminal && !eff) {
    return (
      <StaffShell
        role="nurse"
        userName="Clinic terminal"
        nav={await staffNav("terminal", count || 0)}
      >
        <PinGateChallenge
          allowedRoles={["nurse", "doctor"]}
          pageLabel="to view shift changes"
        />
      </StaffShell>
    );
  }

  return (
    <StaffShell
      role={isTerminal ? (eff!.role as "owner" | "nurse" | "doctor") : (profile.role as "owner" | "nurse" | "doctor")}
      userName={isTerminal ? `${eff!.full_name} (via terminal)` : profile.full_name}
      nav={await staffNav(isTerminal ? "terminal" : profile.role, count || 0)}
    >
      <h2 className="text-base font-medium mb-1">Shift changes</h2>
      <p className="text-xs text-stone-500 mb-4">
        Default duty for all staff is <strong>09:00–21:00</strong>. Submit a shift change below only for days
        when you&apos;re working different hours (covering for someone, half-day, etc.). The owner must approve
        before it takes effect on the duty calendar. For full-day absences, use <strong>Leave</strong> instead.
      </p>
      <DutyManager
        myProfileId={eff!.id}
        myName={eff!.full_name}
        role={eff!.role}
      />
    </StaffShell>
  );
}
