import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import FilterableBookingsTable from "@/components/FilterableBookingsTable";

export const dynamic = "force-dynamic";

export default async function OwnerBookingsPage() {
  const { profile } = await requireStaff(["owner"]);
  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || "Our Clinic";
  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select(
      "id, type, status, slot_start, slot_end, visit_reason, reviewed_at, attended_at, no_show, reviewer:profiles!bookings_reviewed_by_fkey(full_name), created_at, patient:patients(id, full_name, whatsapp_number, id_number), doctor:doctors(id, display_name)"
    )
    .order("slot_start", { ascending: false })
    .limit(300);

  return (
    <StaffShell
      role="owner"
      userName={profile.full_name}
      nav={staffNav(profile.role)}
    >
      <h2 className="text-base font-medium mb-1">All bookings</h2>
      <p className="text-xs text-stone-500 mb-4">
        As owner, you can override any booking's status. All overrides are logged in the audit trail.
      </p>
      <FilterableBookingsTable rows={(data as any) || []} clinicName={clinicName} enableOverride />
    </StaffShell>
  );
}
