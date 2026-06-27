import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import { loadTemplates } from "@/lib/templates-server";
import PendingQueue from "./PendingQueue";

export const dynamic = "force-dynamic";

export default async function NursePage() {
  // Terminal users can land here from the lockscreen's "Pending bookings"
  // tile. Read-only by default — the Approve/Reject buttons trigger a PIN
  // challenge before firing.
  const { profile } = await requireStaff(["nurse", "owner", "terminal"]);
  const supabase = createAdminClient();

  const { data: pending } = await supabase
    .from("bookings")
    .select(
      "id, type, status, slot_start, slot_end, visit_reason, is_first_time, created_at, expires_at, check_sent_at, confirm_sent_at, reject_sent_at, cancel_sent_at, patient:patients(id, full_name, nationality, id_type, id_number, whatsapp_number, visit_count), doctor:doctors(id, display_name)"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const { count: pendingCount } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const templates = await loadTemplates();

  const isTerminal = profile.role === "terminal";
  return (
    <StaffShell
      role={isTerminal ? "nurse" : (profile.role as "owner" | "nurse")}
      userName={isTerminal ? "Clinic terminal" : profile.full_name}
      nav={await staffNav(isTerminal ? "terminal" : profile.role, pendingCount || 0)}
    >
      <h2 className="text-base font-medium mb-4">Pending approvals</h2>
      {isTerminal && (
        <p className="text-[11px] text-stone-500 mb-3">
          Tap Approve / Reject to be prompted for your PIN. After verification you have a 90-second window where back-to-back actions don&apos;t re-prompt.
        </p>
      )}
      <PendingQueue
        initial={(pending as any[]) || []}
        clinicName={process.env.NEXT_PUBLIC_CLINIC_NAME || "the clinic"}
        templates={templates}
        isTerminal={isTerminal}
      />
    </StaffShell>
  );
}
