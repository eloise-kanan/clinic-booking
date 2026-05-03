import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const { profile } = await requireStaff(["nurse", "owner"]);
  const admin = createAdminClient();
  const { data: patients } = await admin
    .from("patients")
    .select("id, full_name, nationality, id_type, id_number, whatsapp_number, visit_count, first_seen_at")
    .order("first_seen_at", { ascending: false })
    .limit(200);
  const { count } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <StaffShell
      role="nurse"
      userName={profile.full_name}
      nav={staffNav(profile.role, count || 0)}
    >
      <h2 className="text-base font-medium mb-4">Patients</h2>
      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Nationality</th>
              <th className="px-4 py-2.5 font-medium">ID</th>
              <th className="px-4 py-2.5 font-medium">WhatsApp</th>
              <th className="px-4 py-2.5 font-medium text-right">Visits</th>
            </tr>
          </thead>
          <tbody>
            {(patients || []).map((p) => (
              <tr key={p.id} className="border-b border-stone-100 last:border-b-0">
                <td className="px-4 py-3 font-medium">{p.full_name}</td>
                <td className="px-4 py-3 text-xs text-stone-600">{p.nationality}</td>
                <td className="px-4 py-3 text-xs text-stone-600">
                  {p.id_type === "ic" ? "IC" : "Passport"} {p.id_number}
                </td>
                <td className="px-4 py-3 text-xs text-stone-600">{p.whatsapp_number}</td>
                <td className="px-4 py-3 text-right text-xs">{p.visit_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StaffShell>
  );
}
