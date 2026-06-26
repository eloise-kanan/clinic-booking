import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import LeaveManager from "./LeaveManager";
import { effectiveProfile } from "@/lib/pin";
import PinGateChallenge from "@/components/PinGateChallenge";

export const dynamic = "force-dynamic";

export default async function LeavePage() {
  // Terminal can reach this page from a future "Leave" tile or direct nav;
  // PinGateChallenge gates entry. effectiveProfile() resolves the PIN holder
  // so the page scopes data to them instead of the terminal account.
  const { user, profile } = await requireStaff(["nurse", "owner", "doctor", "terminal"]);
  const eff = await effectiveProfile(user.id, profile.role, profile.full_name);
  const admin = createAdminClient();

  const { count } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const isTerminal = profile.role === "terminal";

  // If on terminal without a valid pin-lock cookie → render the challenge.
  if (isTerminal && !eff) {
    return (
      <StaffShell
        role="nurse"
        userName="Clinic terminal"
        nav={await staffNav("terminal", count || 0)}
      >
        <PinGateChallenge
          allowedRoles={["nurse", "doctor"]}
          pageLabel="to view leave requests"
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
      <h2 className="text-base font-medium mb-1">Leave requests</h2>
      <p className="text-xs text-stone-500 mb-4">
        Submit a leave request — only the owner can approve. While pending, you can withdraw it.
      </p>
      <LeaveManager
        myProfileId={eff!.id}
        role={eff!.role}
      />
    </StaffShell>
  );
}
