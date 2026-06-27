// Shared helpers for the duty_shifts route handlers — separated from
// route.ts because Next.js disallows non-Route exports inside route files.

import type { createAdminClient } from "@/lib/supabase-admin";

// When a duty_shifts row with is_permanent=true is approved (or owner-
// submitted), this writes the new schedule into the doctor's working_hours.
// Weekday is derived from the request's shift_date (so a permanent change
// dated to a Monday updates the doctor's Monday working_hours row).
// Nurses don't have working_hours rows — no-op for them today.
export async function applyPermanentToWorkingHours(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
  shiftDate: string,
  startTime: string,
  endTime: string
) {
  const { data: doc } = await admin
    .from("doctors")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!doc?.id) return;

  const weekday = new Date(shiftDate + "T00:00:00").getDay();

  await admin
    .from("working_hours")
    .delete()
    .eq("doctor_id", doc.id)
    .eq("weekday", weekday);
  await admin.from("working_hours").insert({
    doctor_id: doc.id,
    weekday,
    start_time: startTime,
    end_time: endTime,
  });
}
