import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import StaffBookingForm from "./StaffBookingForm";

export const dynamic = "force-dynamic";

export default async function StaffNewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ reschedule?: string }>;
}) {
  const { profile } = await requireStaff(["nurse", "owner", "terminal"]);
  const isTerminal = profile.role === "terminal";
  const params = await searchParams;
  const rescheduleId = params.reschedule;

  let prefill = null;
  if (rescheduleId) {
    prefill = await loadParent(rescheduleId);
  }

  // Pending booking count for the nurse's sidebar badge
  const admin = createAdminClient();
  const { count: pendingCount } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <StaffShell
      role={isTerminal ? "nurse" : (profile.role as "owner" | "nurse")}
      userName={isTerminal ? "Clinic terminal" : profile.full_name}
      nav={await staffNav(isTerminal ? "terminal" : profile.role, pendingCount || 0)}
      isTerminal={isTerminal}
    >
      <h2 className="text-base font-medium mb-1">
        {prefill ? "Reschedule on behalf of patient" : "New booking on behalf of patient"}
      </h2>
      <p className="text-xs text-stone-500 mb-4">
        Submitted bookings are <strong>confirmed immediately</strong> — the patient does not need to verify on WhatsApp.
      </p>
      <StaffBookingForm
        prefill={prefill}
        role={isTerminal ? "nurse" : (profile.role as "owner" | "nurse")}
        isTerminal={isTerminal}
      />
    </StaffShell>
  );
}

async function loadParent(id: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select(
      "id, doctor_id, slot_start, visit_reason, patient:patients(full_name, nationality, id_type, id_number, whatsapp_number)"
    )
    .eq("id", id)
    .single();
  if (!data) return null;
  // Supabase's TS inference makes joined records arrays even with .single() — flatten
  const p = data as unknown as {
    id: string;
    doctor_id: string;
    slot_start: string;
    visit_reason: string | null;
    patient:
      | {
          full_name: string;
          nationality: string;
          id_type: "ic" | "passport";
          id_number: string;
          whatsapp_number: string;
        }
      | Array<{
          full_name: string;
          nationality: string;
          id_type: "ic" | "passport";
          id_number: string;
          whatsapp_number: string;
        }>;
  };
  const patient = Array.isArray(p.patient) ? p.patient[0] || null : p.patient;
  return {
    id: p.id,
    doctor_id: p.doctor_id,
    slot_start: p.slot_start,
    visit_reason: p.visit_reason,
    patient,
  };
}
