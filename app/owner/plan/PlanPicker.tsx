"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FEATURE_REQUIRES,
  PLAN_DESCRIPTIONS,
  PLAN_LABELS,
  PLAN_ORDER,
  SEAT_CAPS,
  type FeatureKey,
  type Plan,
} from "@/lib/plan";

const TIER_PRICES: Record<Plan, string> = {
  standard: "RM 150 / month",
  premium: "RM 280 / month",
  franchise: "Contact us",
};

const FEATURE_NAMES: Record<FeatureKey, string> = {
  "bookings.pending": "Pending approvals queue",
  "bookings.all": "All bookings table",
  "bookings.new": "New booking on behalf",
  "bookings.reminders": "WhatsApp reminders",
  "patients": "Patient directory",
  "calendar.clinical": "Clinical calendar",
  "calendar.duty": "Duty calendar (doctors)",
  "settings.templates": "WhatsApp templates editor",
  "settings.branding": "Branding & theme",
  "staff.management": "Doctors & nurses management",
  "staff.working_hours": "Working hours editor",
  "staff.shift_changes": "Shift change workflow",
  "staff.leave": "Leave request workflow",
  "backup": "Backup & export",
  "recall": "Patient recall reminders",
  "analytics.overview": "Overview dashboard",
  "calendar.duty.nurse": "Duty calendar (nurses)",
  "analytics.doctor_perf": "Doctor performance analytics",
  "analytics.nurse_perf": "Nurse performance analytics",
  "analytics.utilization": "Chair utilization heatmap",
  "settings.audit_log": "Audit log",
  "compliance": "Compliance reminders (planned)",
  "review": "Internal review system",
  "google_review_prompt": "Google review prompt (for 4★+ visits)",
  "payroll": "Payroll handoff (planned)",
  "commission": "Doctor commission tracking (planned)",
  "multi_branch": "Multi-branch (planned)",
};

const TIERS: Plan[] = ["standard", "premium", "franchise"];

function featuresForTier(tier: Plan): { newInTier: FeatureKey[] } {
  const all = Object.entries(FEATURE_REQUIRES) as [FeatureKey, Plan][];
  const newInTier = all.filter(([, req]) => req === tier).map(([k]) => k);
  return { newInTier };
}

function seatLine(plan: Plan): string {
  const c = SEAT_CAPS[plan];
  if (plan === "franchise") return "Unlimited staff (across branches)";
  return `${c.owner} owner · ${c.doctor} doctors · ${c.nurse} nurses`;
}

export default function PlanPicker({ current }: { current: Plan }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Plan>(current);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function save() {
    if (selected === current) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "err", text: data.error || "Failed" });
        return;
      }
      setMsg({
        type: "ok",
        text: `Plan set to ${PLAN_LABELS[selected]}. Refreshing nav…`,
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {TIERS.map((tier) => {
          const isSelected = selected === tier;
          const isCurrent = current === tier;
          const { newInTier } = featuresForTier(tier);
          return (
            <button
              key={tier}
              type="button"
              onClick={() => setSelected(tier)}
              className={`text-left p-4 rounded-xl border-2 transition-all relative ${
                isSelected
                  ? "border-brand bg-brand-50/40 shadow-md"
                  : "border-stone-200 bg-white hover:border-stone-400"
              }`}
            >
              {isCurrent && (
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-medium">
                  Current
                </span>
              )}
              <h3 className="text-lg font-semibold text-stone-900 mb-1">
                {PLAN_LABELS[tier]}
              </h3>
              <p className="text-sm font-medium text-brand-700 mb-1">{TIER_PRICES[tier]}</p>
              <p className="text-[11px] text-stone-500 mb-3">{seatLine(tier)}</p>
              <p className="text-xs text-stone-600 mb-3 leading-relaxed">
                {PLAN_DESCRIPTIONS[tier]}
              </p>
              {newInTier.length > 0 && (
                <div className="border-t border-stone-200 pt-2 mt-2">
                  <div className="text-[10px] uppercase tracking-wider text-stone-500 font-medium mb-1">
                    {tier === "standard" ? "Included" : "New in this tier"}
                  </div>
                  <ul className="space-y-0.5">
                    {newInTier.map((f) => (
                      <li key={f} className="text-[11px] text-stone-700 flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold mt-0.5">+</span>
                        <span>{FEATURE_NAMES[f]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm">
          {selected === current ? (
            <span className="text-stone-500">
              Currently on <strong>{PLAN_LABELS[current]}</strong>. Pick another tier to switch.
            </span>
          ) : (
            <span className="text-stone-700">
              Switch from <strong>{PLAN_LABELS[current]}</strong> to{" "}
              <strong className="text-brand-700">{PLAN_LABELS[selected]}</strong>?
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {msg && (
            <span className={`text-xs ${msg.type === "ok" ? "text-emerald-700" : "text-red-600"}`}>
              {msg.text}
            </span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving || selected === current}
            className="btn-primary"
          >
            {saving ? "Saving…" : "Apply"}
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-amber-900 mb-1">💡 Need more seats?</h3>
        <p className="text-xs text-amber-900 leading-relaxed">
          Seat caps are enforced when creating new staff. If you&apos;ve hit your cap and need
          more doctors or nurses without upgrading the whole tier, ping us on WhatsApp and
          we&apos;ll top up your account.
        </p>
      </div>
    </div>
  );
}
