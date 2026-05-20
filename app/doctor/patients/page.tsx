import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";

export const dynamic = "force-dynamic";

export default async function DoctorPatientsPage() {
  const { user, profile } = await requireStaff(["doctor", "owner"]);
  const admin = createAdminClient();
  const { data: doctor } = await admin
    .from("doctors")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  let patients: any[] = [];
  if (doctor) {
    const { data } = await admin
      .from("bookings")
      .select("patient:patients(id, full_name, nationality, whatsapp_number, visit_count)")
      .eq("doctor_id", doctor.id);
    const map = new Map<string, any>();
    (data || []).forEach((row: any) => {
      if (row.patient) map.set(row.patient.id, row.patient);
    });
    patients = Array.from(map.values()).sort((a, b) => b.visit_count - a.visit_count);
  }

  return (
    <StaffShell
      role="doctor"
      userName={profile.full_name}
      nav={await staffNav(profile.role)}
    >
      <h2 className="text-base font-medium mb-4">My patients</h2>
      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Nationality</th>
              <th className="px-4 py-2.5 font-medium">WhatsApp</th>
              <th className="px-4 py-2.5 font-medium text-right">Visits</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id} className="border-b border-stone-100 last:border-b-0">
                <td className="px-4 py-3 font-medium">{p.full_name}</td>
                <td className="px-4 py-3 text-xs">{p.nationality}</td>
                <td className="px-4 py-3 text-xs">{p.whatsapp_number}</td>
                <td className="px-4 py-3 text-xs text-right">{p.visit_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StaffShell>
  );
}
