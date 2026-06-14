import { requireStaff } from "@/lib/auth";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import { loadPlan, demoPlanLock } from "@/lib/branding-server";
import { PLAN_LABELS } from "@/lib/plan";
import PlanPicker from "./PlanPicker";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const { profile } = await requireStaff(["owner"]);
  const plan = await loadPlan();
  const locked = demoPlanLock();

  return (
    <StaffShell role="owner" userName={profile.full_name} nav={await staffNav(profile.role, 0)}>
      <h2 className="text-base font-medium mb-1">Plan &amp; tier</h2>
      <p className="text-xs text-stone-500 mb-4">
        Each tier unlocks more features. Switch your clinic&apos;s tier here — changes take effect immediately
        for the side navigation and home cards.
      </p>
      {locked ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-900 mb-1">🔒 Demo deployment</h3>
          <p className="text-xs text-amber-900 leading-relaxed">
            This is a demo running with the plan locked to{" "}
            <strong>{PLAN_LABELS[locked]}</strong> via the <code>DEMO_PLAN_LOCK</code> env
            var. To try other tiers, visit the other demo deployment.
          </p>
        </div>
      ) : (
        <PlanPicker current={plan} />
      )}
    </StaffShell>
  );
}
