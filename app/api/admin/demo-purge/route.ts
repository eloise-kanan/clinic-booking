import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// POST /api/admin/demo-purge — owner-only.
// Wipes demo-able HR data so the clinic can run a fresh demo without prior
// requests cluttering the HR approvals page. By default this wipes only
// leave_requests + duty_shifts; pass { include: ['bookings', 'audit'] } to
// also clear those (kept opt-in to avoid losing real data).
//
// Idempotent — safe to call as many times as you want.

const ALLOWED_TABLES = new Set(["leave_requests", "duty_shifts", "bookings", "audit_log"]);

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: actor } = await supabase
    .from("profiles").select("role, active").eq("id", user.id).single();
  if (!actor?.active || actor.role !== "owner") {
    return NextResponse.json({ error: "Forbidden — owner only" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { include?: string[] };
  // Default set — just HR stuff.
  const targets = new Set<string>(["leave_requests", "duty_shifts"]);
  (body.include || []).forEach((t) => {
    if (ALLOWED_TABLES.has(t)) targets.add(t);
  });

  const admin = createAdminClient();
  const results: Record<string, number> = {};
  for (const table of targets) {
    // Fetch IDs first, then delete in chunks — avoids the .neq('id', dummy)
    // hack and handles edge cases where the table is keyed by something
    // other than UUID id.
    const { data: rows } = await admin.from(table).select("id");
    if (!rows || rows.length === 0) {
      results[table] = 0;
      continue;
    }
    const chunkSize = 500;
    let total = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize).map((r: { id: string }) => r.id);
      const { error, count } = await admin.from(table).delete({ count: "exact" }).in("id", chunk);
      if (error) return NextResponse.json({ error: `${table}: ${error.message}` }, { status: 500 });
      total += count || chunk.length;
    }
    results[table] = total;
  }

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "demo_purge",
    entity_type: "system",
    after_data: { wiped: results },
  });

  return NextResponse.json({ ok: true, wiped: results });
}
