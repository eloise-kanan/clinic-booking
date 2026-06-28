import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import { effectiveProfile } from "@/lib/pin";
import PinGateChallenge from "@/components/PinGateChallenge";
import ProfileForm from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { user, profile } = await requireStaff(["nurse", "owner", "doctor", "terminal"]);
  const isTerminal = profile.role === "terminal";
  const eff = await effectiveProfile(user.id, profile.role, profile.full_name);
  const admin = createAdminClient();

  const { count } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  // Terminal session without a valid PIN-lock cookie → show the unlock screen.
  if (isTerminal && !eff) {
    return (
      <StaffShell
        role="nurse"
        userName="Clinic terminal"
        nav={await staffNav("terminal", count || 0)}
      isTerminal={isTerminal}
      >
        <PinGateChallenge
          allowedRoles={["nurse", "doctor"]}
          pageLabel="to change your PIN"
        />
      </StaffShell>
    );
  }

  // On terminal, the "profile" we manage is the PIN holder's (not the
  // terminal account itself). On personal devices, eff.id === user.id.
  const accountProfileId = eff!.id;
  const accountRole = eff!.role;
  const accountFullName = eff!.full_name;

  // Look up whether this staff member has a PIN set (drives the
  // "Set PIN" vs "Change PIN" tab label and current-PIN requirement).
  const { data: pinRow } = await admin
    .from("profiles")
    .select("pin_hash")
    .eq("id", accountProfileId)
    .single();
  const hasPin = !!pinRow?.pin_hash;

  return (
    <StaffShell
      role={isTerminal ? (accountRole as "owner" | "nurse" | "doctor") : (profile.role as "owner" | "nurse" | "doctor")}
      userName={isTerminal ? `${accountFullName} (via terminal)` : profile.full_name}
      nav={await staffNav(isTerminal ? "terminal" : profile.role, count || 0)}
      isTerminal={isTerminal}
    >
      <h2 className="text-base font-medium mb-1">
        {isTerminal ? `${accountFullName} — account` : "My account"}
      </h2>
      <p className="text-xs text-stone-500 mb-4">
        {isTerminal
          ? "Change your 6-digit PIN. Password changes require signing in on a personal device."
          : accountRole === "owner"
            ? "Change your password or login email."
            : "Change your password or your 6-digit PIN."}
      </p>
      <ProfileForm
        email={isTerminal ? "" : (user.email || "")}
        isOwner={!isTerminal && profile.role === "owner"}
        hasPin={hasPin}
        terminalMode={isTerminal}
      />
    </StaffShell>
  );
}
