import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import PatientsTable, { type PatientRow } from "@/components/PatientsTable";

export const dynamic = "force-dynamic";

export default async function OwnerPatientsPage() {
  const { profile } = await requireStaff(["owner"]);
  const admin = createAdminClient();

  const { data: patients } = await admin
    .from("patients")
    .select("id, full_name, nationality, id_type, id_number, whatsapp_number, visit_count, first_seen_at")
    .order("visit_count", { ascending: false })
    .limit(500);

  const byNationality = new Map<string, number>();
  let firstTime = 0;
  let returning = 0;
  (patients || []).forEach((p) => {
    byNationality.set(p.nationality, (byNationality.get(p.nationality) || 0) + 1);
    if (p.visit_count <= 1) firstTime++;
    else returning++;
  });
  const total = (patients || []).length;
  const sortedNat = Array.from(byNationality.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <StaffShell
      role="owner"
      userName={profile.full_name}
      nav={await staffNav(profile.role)}
    >
      <h2 className="text-base font-medium mb-4">Patient demographics</h2>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Total patients" value={String(total)} />
        <Stat label="Returning" value={String(returning)} sub={`${total ? Math.round((returning / total) * 100) : 0}% of patients`} />
        <Stat label="First-time" value={String(firstTime)} sub={`${total ? Math.round((firstTime / total) * 100) : 0}% of patients`} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-stone-200 rounded-lg p-5">
          <h3 className="text-xs uppercase text-stone-500 font-medium mb-3 tracking-wide">By nationality</h3>
          <div className="space-y-2">
            {sortedNat.map(([nat, count]) => {
              const pct = total ? Math.round((count / total) * 100) : 0;
              return (
                <div key={nat} className="grid grid-cols-[100px_1fr_50px] gap-3 items-center text-xs">
                  <div>{nat}</div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-right">{count}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-lg p-5">
          <h3 className="text-xs uppercase text-stone-500 font-medium mb-3 tracking-wide">Top returning patients</h3>
          <div className="space-y-2">
            {(patients || []).slice(0, 8).map((p) => (
              <div key={p.id} className="flex justify-between items-center text-xs py-1">
                <div>
                  <div className="font-medium">{p.full_name}</div>
                  <div className="text-stone-500">
                    {p.nationality} · {p.id_type === "ic" ? "IC" : "Passport"} {p.id_number.slice(0, 6)}…
                  </div>
                </div>
                <div className="text-stone-700 font-medium">{p.visit_count} visits</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h3 className="text-sm font-medium mb-2">All patients</h3>
      <PatientsTable rows={(patients as PatientRow[]) || []} initialSort="visit_count" />
    </StaffShell>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="text-2xl font-medium mt-0.5">{value}</div>
      {sub && <div className="text-xs text-stone-500 mt-0.5">{sub}</div>}
    </div>
  );
}
