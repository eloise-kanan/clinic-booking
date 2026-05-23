import { createAdminClient } from "@/lib/supabase-admin";
import { csvDocument, csvDateMy, csvDateOnlyMy } from "@/lib/csv";

// Daily cron tick (configured in vercel.json). Decides whether today matches
// the chosen frequency (daily / Mondays / 1st of month) and, if enabled,
// emails the 3 CSVs as attachments via Resend.
//
// Required env vars on Vercel:
//   CRON_SECRET       — random string; Vercel Cron sends this as Bearer token
//   RESEND_API_KEY    — from resend.com (free tier OK for low volume)
//   BACKUP_EMAIL_FROM — verified sender, e.g. "Goodcare Backups <backup@yourdomain.com>"

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function flatDisplay(v: unknown): string {
  if (!v) return "";
  if (Array.isArray(v)) return (v[0] as { display_name?: string })?.display_name || "";
  return (v as { display_name?: string }).display_name || "";
}

async function buildCsvs(admin: ReturnType<typeof createAdminClient>) {
  const date = csvDateOnlyMy();

  const { data: patients } = await admin
    .from("patients")
    .select(
      "id, full_name, nationality, id_type, id_number, whatsapp_number, visit_count, created_at"
    );
  const patientsCsv = csvDocument(
    [
      "id",
      "full_name",
      "nationality",
      "id_type",
      "id_number",
      "whatsapp_number",
      "visit_count",
      "created_at",
    ],
    (patients || []).map((p) => [
      p.id,
      p.full_name,
      p.nationality,
      p.id_type,
      p.id_number,
      p.whatsapp_number,
      p.visit_count,
      csvDateMy(p.created_at),
    ])
  );

  const { data: bookings } = await admin
    .from("bookings")
    .select(
      "id, type, status, slot_start, slot_end, visit_reason, created_at, reviewed_at, attended_at, no_show, reminder_sent_at, patient:patients(full_name, id_number, whatsapp_number), doctor:doctors(display_name)"
    )
    .order("slot_start", { ascending: false });
  const bookingsCsv = csvDocument(
    [
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
    ],
    (bookings || []).map((b) => {
      const p = b.patient as
        | { full_name?: string; id_number?: string; whatsapp_number?: string }
        | { full_name?: string; id_number?: string; whatsapp_number?: string }[]
        | null;
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
    })
  );

  const { data: audit } = await admin
    .from("audit_log")
    .select(
      "id, action, entity_type, entity_id, created_at, before_data, after_data, actor:profiles(full_name, role)"
    )
    .order("created_at", { ascending: false });
  const auditCsv = csvDocument(
    [
      "id",
      "action",
      "entity_type",
      "entity_id",
      "created_at",
      "actor_name",
      "actor_role",
      "before_data",
      "after_data",
    ],
    (audit || []).map((r) => {
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
    })
  );

  return [
    {
      filename: `patients-${date}.csv`,
      content: Buffer.from(patientsCsv).toString("base64"),
      rowCount: patients?.length || 0,
    },
    {
      filename: `bookings-${date}.csv`,
      content: Buffer.from(bookingsCsv).toString("base64"),
      rowCount: bookings?.length || 0,
    },
    {
      filename: `audit-log-${date}.csv`,
      content: Buffer.from(auditCsv).toString("base64"),
      rowCount: audit?.length || 0,
    },
  ];
}

function shouldSendToday(frequency: string, today: Date): boolean {
  if (frequency === "daily") return true;
  if (frequency === "weekly") return today.getDay() === 1; // Monday
  if (frequency === "monthly") return today.getDate() === 1;
  return false;
}

async function sendWithResend(opts: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  attachments: { filename: string; content: string }[];
}) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      attachments: opts.attachments,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Resend ${res.status}: ${txt.slice(0, 200)}`);
  }
  return await res.json();
}

export async function GET(req: Request) {
  // Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`.
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("clinic_settings")
    .select(
      "backup_email_enabled, backup_email_frequency, backup_email_to"
    )
    .eq("id", true)
    .maybeSingle();

  if (!settings?.backup_email_enabled) {
    return Response.json({ skipped: "disabled" });
  }
  if (!settings.backup_email_to) {
    return Response.json({ skipped: "no_email_address" });
  }
  if (!shouldSendToday(settings.backup_email_frequency || "weekly", new Date())) {
    return Response.json({ skipped: "not_scheduled_today" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BACKUP_EMAIL_FROM;

  let status = "ok";
  let detail: Record<string, unknown> = {};
  try {
    if (!apiKey || !from) {
      throw new Error("Email provider not configured (RESEND_API_KEY / BACKUP_EMAIL_FROM missing)");
    }
    const attachments = await buildCsvs(admin);
    const totalRows = attachments.reduce((sum, a) => sum + a.rowCount, 0);
    const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || "Your clinic";
    await sendWithResend({
      apiKey,
      from,
      to: settings.backup_email_to,
      subject: `${clinicName} — ${csvDateOnlyMy()} backup`,
      text: `Attached are today's CSV backups for ${clinicName}.\n\n• Patients (${attachments[0].rowCount} rows)\n• Bookings (${attachments[1].rowCount} rows)\n• Audit log (${attachments[2].rowCount} rows)\n\nStore these in a safe place (Drive / Dropbox / encrypted folder).`,
      attachments: attachments.map((a) => ({ filename: a.filename, content: a.content })),
    });
    detail = { row_count: totalRows };
  } catch (e: unknown) {
    status = `error: ${e instanceof Error ? e.message : String(e)}`;
    detail = { error: status };
  }

  await admin
    .from("clinic_settings")
    .update({
      backup_email_last_sent_at: new Date().toISOString(),
      backup_email_last_status: status.slice(0, 200),
    })
    .eq("id", true);

  await admin.from("audit_log").insert({
    actor_id: null,
    action: "backup_email_sent",
    entity_type: "clinic_settings",
    after_data: { ...detail, frequency: settings.backup_email_frequency },
  });

  return Response.json({ status, detail });
}
