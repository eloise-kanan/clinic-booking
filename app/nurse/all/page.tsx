import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import FilterableBookingsTable from "@/components/FilterableBookingsTable";

export const dynamic = "force-dynamic";

export default async function AllBookingsPage() {
  const { profile } = await requireStaff(["nurse", "owner"]);
  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || "Our Clinic";
  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select(
      "id, type, status, slot_start, slot_end, visit_reason, reviewed_at, attended_at, no_show, reviewer:profiles!bookings_reviewed_by_fkey(full_name), patient:patients(full_name, whatsapp_number, id_number), doctor:doctors(display_name)"
    )
    .order("slot_start", { ascending: false })
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
      <h2 className="text-base font-medium mb-4">All bookings</h2>
      <FilterableBookingsTable rows={(data as any) || []} clinicName={clinicName} />
    </StaffShell>
  );
}
