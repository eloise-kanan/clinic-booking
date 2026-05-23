import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { csvDocument, csvDateMy, csvDateOnlyMy } from "@/lib/csv";

function flatName(v: unknown): string {
  if (!v) return "";
  if (Array.isArray(v)) return (v[0] as { full_name?: string })?.full_name || "";
  return (v as { full_name?: string }).full_name || "";
}
function flatDisplay(v: unknown): string {
  if (!v) return "";
  if (Array.isArray(v)) return (v[0] as { display_name?: string })?.display_name || "";
  return (v as { display_name?: string }).display_name || "";
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
    .from("bookings")
    .select(
      "id, type, status, slot_start, slot_end, visit_reason, created_at, reviewed_at, attended_at, no_show, reminder_sent_at, patient:patients(full_name, id_number, whatsapp_number), doctor:doctors(display_name)"
    )
    .order("slot_start", { ascending: false });
  if (error) return new Response(error.message, { status: 500 });

  const headers = [
    "id",
    "type",
    "status",
    "slot_start",
    "slot_end",
    "visit_reason",
    "patient_name",
    "patient_id_number",
    "patient_whatsapp",
    "doctor_name",
    "created_at",
    "reviewed_at",
    "attended_at",
    "no_show",
    "reminder_sent_at",
  ];
  const rows = (data || []).map((b) => {
    const p = b.patient as { full_name?: string; id_number?: string; whatsapp_number?: string } | { full_name?: string; id_number?: string; whatsapp_number?: string }[] | null;
    const patient = Array.isArray(p) ? p[0] : p;
    return [
      b.id,
      b.type,
      b.status,
      csvDateMy(b.slot_start),
      csvDateMy(b.slot_end),
      b.visit_reason,
      patient?.full_name || "",
      patient?.id_number || "",
      patient?.whatsapp_number || "",
      flatDisplay(b.doctor),
      csvDateMy(b.created_at),
      csvDateMy(b.reviewed_at),
      csvDateMy(b.attended_at),
      b.no_show,
      csvDateMy(b.reminder_sent_at),
    ];
  });

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "backup_export_bookings",
    entity_type: "bookings",
    after_data: { row_count: rows.length },
  });

  const csv = csvDocument(headers, rows);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookings-${csvDateOnlyMy()}.csv"`,
    },
  });
}
