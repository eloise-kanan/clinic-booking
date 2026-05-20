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

  return (
    <StaffShell role="owner" userName={profile.full_name} nav={await staffNav(profile.role)}>
      <h2 className="text-base font-medium mb-1">Audit log</h2>
      <p className="text-xs text-stone-500 mb-4">
        Last 500 actions across the clinic. Read-only. Use this to verify who did what when.
      </p>
      <AuditLogView rows={(rows as any[]) || []} />
    </StaffShell>
  );
}
