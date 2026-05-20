import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import { loadPlan } from "@/lib/branding-server";
import BackupActions from "./BackupActions";

export const dynamic = "force-dynamic";

export default async function BackupPage() {
  const { profile } = await requireStaff(["owner"]);
  const plan = await loadPlan();
  const admin = createAdminClient();

  // Auto-email backup settings
  const { data: settings } = await admin
    .from("clinic_settings")
    .select(
      "backup_email_enabled, backup_email_frequency, backup_email_to, backup_email_last_sent_at, backup_email_last_status"
    )
    .eq("id", true)
    .maybeSingle();

  // Last export timestamps for each kind
  const { data: lastExports } = await admin
    .from("audit_log")
    .select("action, created_at, actor:profiles(full_name)")
    .in("action", [
      "backup_export_patients",
      "backup_export_bookings",
      "backup_export_audit",
    ])
    .order("created_at", { ascending: false })
    .limit(50);

  const lastByKind: Record<string, { at: string; by: string }> = {};
  (lastExports || []).forEach((r) => {
    if (!lastByKind[r.action]) {
      const actor = Array.isArray(r.actor) ? r.actor[0] : r.actor;
      const a = actor as { full_name?: string } | null;
      lastByKind[r.action] = {
        at: r.created_at,
        by: a?.full_name || "—",
      };
    }
  });

  // Total counts
  const [{ count: patientsCount }, { count: bookingsCount }, { count: auditCount }] = await Promise.all([
    admin.from("patients").select("id", { count: "exact", head: true }),
    admin.from("bookings").select("id", { count: "exact", head: true }),
    admin.from("audit_log").select("id", { count: "exact", head: true }),
  ]);

  return (
    <StaffShell role="owner" userName={profile.full_name} nav={await staffNav(profile.role, 0)}>
      <h2 className="text-base font-medium mb-1">Backup &amp; export</h2>
      <p className="text-xs text-stone-500 mb-4">
        Download a snapshot of your clinic data as CSV. Use this as a safety net independent of Supabase&apos;s
        own backups, especially before any major schema change or before sharing data with an accountant.
        Every download is recorded in the audit log.
      </p>
      <BackupActions
        counts={{
          patients: patientsCount || 0,
          bookings: bookingsCount || 0,
          audit: auditCount || 0,
        }}
        lastExports={{
          patients: lastByKind["backup_export_patients"],
          bookings: lastByKind["backup_export_bookings"],
          audit: lastByKind["backup_export_audit"],
        }}
        emailSettings={{
          enabled: settings?.backup_email_enabled || false,
          frequency:
            (settings?.backup_email_frequency as "daily" | "weekly" | "monthly") || "weekly",
          to: settings?.backup_email_to || "",
          lastSentAt: settings?.backup_email_last_sent_at || null,
          lastStatus: settings?.backup_email_last_status || null,
        }}
      />
    </StaffShell>
  );
}
