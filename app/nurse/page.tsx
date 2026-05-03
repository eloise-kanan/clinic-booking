import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import PendingQueue from "./PendingQueue";

export const dynamic = "force-dynamic";

export default async function NursePage() {
  const { profile } = await requireStaff(["nurse", "owner"]);
  const supabase = createAdminClient();

  const { data: pending } = await supabase
    .from("bookings")
    .select(
      "id, type, status, slot_start, slot_end, visit_reason, is_first_time, created_at, expires_at, patient:patients(id, full_name, nationality, id_type, id_number, whatsapp_number, visit_count), doctor:doctors(id, display_name)"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const { count: pendingCount } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <StaffShell
      role="nurse"
      userName={profile.full_name}
      nav={staffNav(profile.role, pendingCount || 0)}
    >
      <h2 className="text-base font-medium mb-4">Pending approvals</h2>
      <PendingQueue
        initial={(pending as any[]) || []}
        clinicName={process.env.NEXT_PUBLIC_CLINIC_NAME || "the clinic"}
      />
    </StaffShell>
  );
}
