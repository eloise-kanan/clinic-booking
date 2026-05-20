import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { csvDocument } from "@/lib/csv";

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
    .from("patients")
    .select("id, full_name, nationality, id_type, id_number, whatsapp_number, visit_count, created_at");
  if (error) return new Response(error.message, { status: 500 });

  const headers = [
    "id",
    "full_name",
    "nationality",
    "id_type",
    "id_number",
    "whatsapp_number",
    "visit_count",
    "created_at",
  ];
  const rows = (data || []).map((p) => [
    p.id,
    p.full_name,
    p.nationality,
    p.id_type,
    p.id_number,
    p.whatsapp_number,
    p.visit_count,
    p.created_at,
  ]);

  // Audit log the export
  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "backup_export_patients",
    entity_type: "patients",
    after_data: { row_count: rows.length },
  });

  const csv = csvDocument(headers, rows);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="patients-${ymd(new Date())}.csv"`,
    },
  });
}
