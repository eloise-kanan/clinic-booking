import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import AuditLogView from "./AuditLogView";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const { profile } = await requireStaff(["owner"]);
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("audit_log")
    .select("id, actor_id, action, entity_type, entity_id, before_data, after_data, created_at, actor:profiles(full_name, role)")
    .order("created_at", { ascending: false })
    .limit(500);

  // Enrich booking-entity rows with the patient name so the table shows
  // "Smith, John" rather than only the booking UUID. Two-step join because
  // bookings → patients is via patient_id and audit_log has no foreign key
  // to bookings. We do it in batch — one query per table — so cost is O(1)
  // regardless of how many audit rows reference bookings.
  const bookingIds = new Set<string>();
  const patientIds = new Set<string>();
  (rows || []).forEach((r) => {
    if (r.entity_id) {
      if (r.entity_type === "booking") bookingIds.add(r.entity_id);
      if (r.entity_type === "patient") patientIds.add(r.entity_id);
    }
  });

  const bookingPatient = new Map<string, string>();
  if (bookingIds.size > 0) {
    const { data: bs } = await admin
      .from("bookings")
      .select("id, patient_id")
      .in("id", Array.from(bookingIds));
    bs?.forEach((b) => {
      if (b.patient_id) bookingPatient.set(b.id, b.patient_id);
      patientIds.add(b.patient_id);
    });
  }

  const patientName = new Map<string, string>();
  if (patientIds.size > 0) {
    const { data: ps } = await admin
      .from("patients")
      .select("id, full_name")
      .in("id", Array.from(patientIds));
    ps?.forEach((p) => patientName.set(p.id, p.full_name));
  }

  const enriched = (rows || []).map((r) => {
    let entity_label: string | null = null;
    if (r.entity_type === "booking") {
      const pid = bookingPatient.get(r.entity_id);
      if (pid) entity_label = patientName.get(pid) || null;
    } else if (r.entity_type === "patient") {
      entity_label = patientName.get(r.entity_id) || null;
    }
    return { ...r, entity_label };
  });

  return (
    <StaffShell role="owner" userName={profile.full_name} nav={await staffNav(profile.role)}>
      <h2 className="text-base font-medium mb-1">Audit log</h2>
      <p className="text-xs text-stone-500 mb-4">
        Last 500 actions across the clinic. Read-only. Use this to verify who did what when.
      </p>
      <AuditLogView rows={(enriched as any[]) || []} />
    </StaffShell>
  );
}
