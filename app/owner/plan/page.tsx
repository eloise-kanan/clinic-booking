import { requireStaff } from "@/lib/auth";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import { loadPlan } from "@/lib/branding-server";
import PlanPicker from "./PlanPicker";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const { profile } = await requireStaff(["owner"]);
  const plan = await loadPlan();

  return (
    <StaffShell role="owner" userName={profile.full_name} nav={await staffNav(profile.role, 0)}>
      <h2 className="text-base font-medium mb-1">Plan &amp; tier</h2>
      <p className="text-xs text-stone-500 mb-4">
        Each tier unlocks more features. Switch your clinic&apos;s tier here — changes take effect immediately
        for the side navigation and home cards.
      </p>
      <PlanPicker current={plan} />
    </StaffShell>
  );
}
