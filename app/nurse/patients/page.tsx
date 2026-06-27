import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import PatientsTable, { type PatientRow } from "@/components/PatientsTable";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const { profile } = await requireStaff(["nurse", "owner", "terminal"]);
  const isTerminal = profile.role === "terminal";
  const admin = createAdminClient();
  const { data: patients } = await admin
    .from("patients")
    .select("id, full_name, nationality, id_type, id_number, whatsapp_number, visit_count, first_seen_at")
    .order("first_seen_at", { ascending: false })
    .limit(500);
  const { count } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <StaffShell
      role={isTerminal ? "nurse" : (profile.role as "owner" | "nurse")}
      userName={isTerminal ? "Clinic terminal" : profile.full_name}
      nav={await staffNav(isTerminal ? "terminal" : profile.role, count || 0)}
    >
      <h2 className="text-base font-medium mb-1">Patients</h2>
      <p className="text-xs text-stone-500 mb-4">
        Search by name, IC / passport, or WhatsApp number. Filter by nationality, ID type, or visit count. Tap any column header to sort.
      </p>
      <PatientsTable rows={(patients as PatientRow[]) || []} />
    </StaffShell>
  );
}
