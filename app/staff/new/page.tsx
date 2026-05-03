import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import StaffBookingForm from "./StaffBookingForm";

export const dynamic = "force-dynamic";

export default async function StaffNewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ reschedule?: string }>;
}) {
  const { profile } = await requireStaff(["nurse", "owner"]);
  const params = await searchParams;
  const rescheduleId = params.reschedule;

  let prefill = null;
  if (rescheduleId) {
    prefill = await loadParent(rescheduleId);
  }

  const nav =
    profile.role === "owner"
      ? [
          { href: "/owner", label: "Overview" },
          { href: "/owner/utilization", label: "Utilization" },
          { href: "/owner/patients", label: "Patients" },
          { href: "/owner/bookings", label: "All bookings" },
          { href: "/staff/new", label: "New booking" },
          { href: "/owner/calendar", label: "All calendars" },
          { href: "/owner/staff", label: "Doctors & nurses" },
        ]
      : [
          { href: "/nurse", label: "Pending" },
          { href: "/nurse/all", label: "All bookings" },
          { href: "/staff/new", label: "New booking" },
          { href: "/nurse/calendar", label: "All calendars" },
          { href: "/nurse/patients", label: "Patients" },
        ];

  return (
    <StaffShell role={profile.role as "owner" | "nurse"} userName={profile.full_name} nav={nav}>
      <h2 className="text-base font-medium mb-1">
        {prefill ? "Reschedule on behalf of patient" : "New booking on behalf of patient"}
      </h2>
      <p className="text-xs text-stone-500 mb-4">
        Submitted bookings are <strong>confirmed immediately</strong> — the patient does not need to verify on WhatsApp.
      </p>
      <StaffBookingForm prefill={prefill} role={profile.role as "owner" | "nurse"} />
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
