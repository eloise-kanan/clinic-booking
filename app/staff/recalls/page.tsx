import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import RecallsList from "./RecallsList";

export const dynamic = "force-dynamic";

type PatientRow = {
  id: string;
  full_name: string;
  whatsapp_number: string | null;
  last_visit_at: string | null;
  recall_interval_months: number;
  recall_reminder_sent_at: string | null;
  recall_reminder_sent_by: { full_name: string } | { full_name: string }[] | null;
};

function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

export default async function RecallsPage() {
  const { profile } = await requireStaff(["nurse", "owner"]);
  const admin = createAdminClient();
  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || "Our Clinic";

  const { data, error } = await admin
    .from("patients")
    .select(
      "id, full_name, whatsapp_number, last_visit_at, recall_interval_months, recall_reminder_sent_at, recall_reminder_sent_by:profiles!patients_recall_reminder_sent_by_fkey(full_name)"
    )
    .not("last_visit_at", "is", null)
    .order("last_visit_at", { ascending: true });

  // Filter to patients whose recall window has elapsed.
  const now = new Date();
  const due: (PatientRow & { months_since_visit: number; months_overdue: number })[] = [];
  ((data as PatientRow[]) || []).forEach((p) => {
    if (!p.last_visit_at) return;
    const last = new Date(p.last_visit_at);
    const monthsSince = monthsBetween(last, now);
    if (monthsSince >= p.recall_interval_months) {
      due.push({
        ...p,
        months_since_visit: monthsSince,
        months_overdue: monthsSince - p.recall_interval_months,
      });
    }
  });

  // Most overdue first
  due.sort((a, b) => b.months_overdue - a.months_overdue);

  const { data: recallTpl } = await admin
    .from("message_templates")
    .select("body")
    .eq("key", "recall")
    .maybeSingle();

  const { count: pendingBookings } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) {
    return (
      <StaffShell
        role={profile.role as "owner" | "nurse"}
        userName={profile.full_name}
        nav={await staffNav(profile.role, pendingBookings || 0)}
      >
        <p className="text-sm text-red-600">Error loading patients: {error.message}</p>
      </StaffShell>
    );
  }

  return (
    <StaffShell
      role={profile.role as "owner" | "nurse"}
      userName={profile.full_name}
      nav={await staffNav(profile.role, pendingBookings || 0)}
    >
      <h2 className="text-base font-medium mb-1">Recalls due</h2>
      <p className="text-xs text-stone-500 mb-4">
        Patients whose checkup interval has elapsed (default 6 months). Sorted most overdue first.
        Tap <strong>Send recall</strong> to open WhatsApp with the template pre-filled — the system
        records who sent it and when.
      </p>
      <RecallsList
        initial={due}
        templateBody={recallTpl?.body || ""}
        clinicName={clinicName}
      />
    </StaffShell>
  );
}
