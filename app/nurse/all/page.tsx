import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import { loadTemplates } from "@/lib/templates-server";
import { effectiveProfile } from "@/lib/pin";
import FilterableBookingsTable from "@/components/FilterableBookingsTable";

export const dynamic = "force-dynamic";

export default async function AllBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; day?: string }>;
}) {
  const { user, profile } = await requireStaff(["nurse", "owner", "terminal"]);
  const isTerminal = profile.role === "terminal";
  const params = await searchParams;
  const scopeMine = params.scope === "mine";
  const dayFilter = params.day === "today" ? "today" : null;
  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || "Our Clinic";
  const admin = createAdminClient();

  // If "?scope=mine" + the PIN holder is a doctor, narrow bookings to that
  // doctor and switch the table into read-only mode (no confirm / cancel /
  // attendance — doctor's role here is to glance at their own day).
  let doctorIdFilter: string | null = null;
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
      doctorIdFilter = doc?.id || null;
    }
  }

  let query = admin
    .from("bookings")
    .select(
      "id, type, status, slot_start, slot_end, visit_reason, reviewed_at, attended_at, no_show, reminder_sent_at, check_sent_at, confirm_sent_at, reject_sent_at, cancel_sent_at, reviewer:profiles!bookings_reviewed_by_fkey(full_name), reminder_sender:profiles!bookings_reminder_sent_by_fkey(full_name), check_sender:profiles!bookings_check_sent_by_fkey(full_name), confirm_sender:profiles!bookings_confirm_sent_by_fkey(full_name), reject_sender:profiles!bookings_reject_sent_by_fkey(full_name), cancel_sender:profiles!bookings_cancel_sent_by_fkey(full_name), patient:patients(full_name, whatsapp_number, id_number), doctor:doctors(display_name)"
    )
    .order("slot_start", { ascending: false })
    .limit(200);
  if (doctorIdFilter) query = query.eq("doctor_id", doctorIdFilter);
  const { data } = await query;

  const { count } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const templates = await loadTemplates();
  const readOnly = !!doctorIdFilter;

  return (
    <StaffShell
      role={isTerminal ? "nurse" : (profile.role as "owner" | "nurse")}
      userName={isTerminal ? "Clinic terminal" : profile.full_name}
      nav={await staffNav(isTerminal ? "terminal" : profile.role, count || 0)}
      isTerminal={isTerminal}
    >
      <h2 className="text-base font-medium mb-1">
        {readOnly
          ? `My bookings — ${pinHolderName}`
          : dayFilter === "today"
            ? "Today's bookings"
            : "All bookings"}
      </h2>
      {readOnly && (
        <p className="text-xs text-stone-500 mb-4">
          Read-only view. To confirm bookings or send reminders, ask the nurse on duty.
        </p>
      )}
      <FilterableBookingsTable
        rows={(data as any) || []}
        clinicName={clinicName}
        templates={templates}
        isTerminal={isTerminal}
        readOnly={readOnly}
        initialQuickFilter={dayFilter === "today" ? "today" : undefined}
      />
    </StaffShell>
  );
}
