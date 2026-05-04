import { createAdminClient } from "@/lib/supabase-admin";

// Server-side helper: fetch all message templates as a key→body map.
// Pages call this to pass templates down to client components so the user's
// edits in /staff/templates take effect everywhere.
export async function loadTemplates(): Promise<Record<string, string>> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("message_templates").select("key, body");
  if (error || !data) return {};
  const out: Record<string, string> = {};
  data.forEach((t) => {
    out[t.key] = t.body;
  });
  return out;
}
