"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FEATURE_REQUIRES,
  PLAN_DESCRIPTIONS,
  PLAN_LABELS,
  PLAN_ORDER,
  type FeatureKey,
  type Plan,
} from "@/lib/plan";

const TIER_PRICES: Record<Plan, string> = {
  basic: "RM 80 / month",
  standard: "RM 150 / month",
  pro: "RM 250 / month",
  franchise: "RM 400 / branch / month",
};

const FEATURE_NAMES: Record<FeatureKey, string> = {
  "bookings.pending": "Pending approvals queue",
  "bookings.all": "All bookings table",
  "bookings.new": "New booking on behalf",
  "bookings.reminders": "WhatsApp reminders",
  "patients": "Patient directory",
  "calendar.clinical": "Clinical calendar",
  "settings.templates": "WhatsApp templates editor",
  "settings.branding": "Branding & theme",
  "analytics.overview": "Overview dashboard",
  "staff.management": "Doctors & nurses management",
  "calendar.duty": "Duty calendar",
  "staff.working_hours": "Working hours editor",
  "staff.shift_changes": "Shift change workflow",
  "staff.leave": "Leave request workflow",
  "settings.audit_log": "Audit log",
  "backup": "Backup & export",
  "compliance": "Compliance reminders (planned)",
  "recall": "Patient recall reminders (planned)",
  "commission": "Doctor commission tracking (planned)",
  "analytics.utilization": "Utilization heatmap",
  "payroll": "Light payroll (planned)",
  "multi_branch": "Multi-branch (planned)",
};

const TIERS: Plan[] = ["basic", "standard", "pro", "franchise"];

function featuresForTier(tier: Plan): { included: FeatureKey[]; newInTier: FeatureKey[] } {
  const all = Object.entries(FEATURE_REQUIRES) as [FeatureKey, Plan][];
  const included = all
    .filter(([_, req]) => PLAN_ORDER[tier] >= PLAN_ORDER[req])
    .map(([k]) => k);
  const newInTier = all
    .filter(([_, req]) => req === tier)
    .map(([k]) => k);
  return { included, newInTier };
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
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
              <p className="text-sm font-medium text-brand-700 mb-2">{TIER_PRICES[tier]}</p>
              <p className="text-xs text-stone-600 mb-3 leading-relaxed">
                {PLAN_DESCRIPTIONS[tier]}
              </p>
              {newInTier.length > 0 && (
                <div className="border-t border-stone-200 pt-2 mt-2">
                  <div className="text-[10px] uppercase tracking-wider text-stone-500 font-medium mb-1">
                    New in this tier
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
    </div>
  );
}
