import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import { effectiveProfile } from "@/lib/pin";
import PatientsTable, { type PatientRow } from "@/components/PatientsTable";

export const dynamic = "force-dynamic";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { user, profile } = await requireStaff(["nurse", "owner", "terminal"]);
  const isTerminal = profile.role === "terminal";
  const params = await searchParams;
  const scopeMine = params.scope === "mine";
  const admin = createAdminClient();

  // If ?scope=mine and the PIN holder is a doctor, narrow the list to
  // patients who've had a booking with that doctor.
  let patientIdFilter: string[] | null = null;
  let pinHolderName: string | null = null;
  if (scopeMine) {
    const eff = await effectiveProfile(user.id, profile.role, profile.full_name);
    if (eff && eff.role === "doctor") {
      pinHolderName = eff.full_name;
      const { data: doc } = await admin
        .from("doctors")
        .select("id")
        .eq("profile_id", eff.id)
        .maybeSingle();
      if (doc?.id) {
        const { data: theirBookings } = await admin
          .from("bookings")
          .select("patient_id")
          .eq("doctor_id", doc.id);
        const ids = Array.from(new Set((theirBookings || []).map((b) => b.patient_id))).filter(Boolean);
        patientIdFilter = ids;
      }
    }
  }

  let patientsQuery = admin
    .from("patients")
    .select("id, full_name, nationality, id_type, id_number, whatsapp_number, visit_count, first_seen_at")
    .order("first_seen_at", { ascending: false })
    .limit(500);
  if (patientIdFilter) {
    if (patientIdFilter.length === 0) {
      // Doctor hasn't seen any patients yet — short-circuit to empty.
      patientsQuery = patientsQuery.in("id", ["00000000-0000-0000-0000-000000000000"]);
    } else {
      patientsQuery = patientsQuery.in("id", patientIdFilter);
    }
  }
  const { data: patients } = await patientsQuery;
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
      <h2 className="text-base font-medium mb-1">
        {pinHolderName ? `My patients — ${pinHolderName}` : "Patients"}
      </h2>
      <p className="text-xs text-stone-500 mb-4">
        {pinHolderName
          ? "Patients you've seen so far. Search, filter, and sort below."
          : "Search by name, IC / passport, or WhatsApp number. Filter by nationality, ID type, or visit count. Tap any column header to sort."}
      </p>
      <PatientsTable rows={(patients as PatientRow[]) || []} />
    </StaffShell>
  );
}
