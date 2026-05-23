import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { csvDocument, csvDateMy, csvDateOnlyMy } from "@/lib/csv";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .single();
  if (!profile?.active || profile.role !== "owner") {
    return new Response("Forbidden — owner only", { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("audit_log")
    .select("id, action, entity_type, entity_id, created_at, before_data, after_data, actor:profiles(full_name, role)")
    .order("created_at", { ascending: false });
  if (error) return new Response(error.message, { status: 500 });

  const headers = [
    "id",
    "action",
    "entity_type",
    "entity_id",
    "created_at",
    "actor_name",
    "actor_role",
    "before_data",
    "after_data",
  ];
  const rows = (data || []).map((r) => {
    const actor = Array.isArray(r.actor) ? r.actor[0] : r.actor;
    const a = actor as { full_name?: string; role?: string } | null;
    return [
      r.id,
      r.action,
      r.entity_type,
      r.entity_id,
      csvDateMy(r.created_at),
      a?.full_name || "",
      a?.role || "",
      r.before_data,
      r.after_data,
    ];
  });

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "backup_export_audit",
    entity_type: "audit_log",
    after_data: { row_count: rows.length },
  });

  const csv = csvDocument(headers, rows);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-log-${csvDateOnlyMy()}.csv"`,
    },
  });
}
