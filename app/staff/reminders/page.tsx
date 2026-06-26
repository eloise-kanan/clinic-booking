import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import RemindersList from "./RemindersList";

export const dynamic = "force-dynamic";

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function RemindersPage() {
  const { profile } = await requireStaff(["nurse", "owner", "terminal"]);
  const isTerminal = profile.role === "terminal";
  const admin = createAdminClient();
  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || "Our Clinic";

  // Default focus is "tomorrow" since that's the typical reminder cadence.
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = ymd(tomorrow);

  const dayStart = new Date(tomorrowStr + "T00:00:00").toISOString();
  const dayEnd = new Date(tomorrowStr + "T23:59:59").toISOString();

  const { data: bookings } = await admin
    .from("bookings")
    .select(
      "id, slot_start, slot_end, visit_reason, reminder_sent_at, reminder_sent_by:profiles!bookings_reminder_sent_by_fkey(full_name), patient:patients(full_name, whatsapp_number), doctor:doctors(display_name)"
    )
    .eq("status", "confirmed")
    .gte("slot_start", dayStart)
    .lte("slot_start", dayEnd)
    .order("slot_start");

  const { data: reminderTpl } = await admin
    .from("message_templates")
    .select("body")
    .eq("key", "reminder")
    .maybeSingle();

  const { count } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <StaffShell
      role={isTerminal ? "nurse" : (profile.role as "owner" | "nurse")}
      userName={isTerminal ? "Clinic terminal" : profile.full_name}
      nav={await staffNav(isTerminal ? "terminal" : profile.role, count || 0)}
    >
      <h2 className="text-base font-medium mb-1">Send reminders</h2>
      <p className="text-xs text-stone-500 mb-4">
        Tomorrow&apos;s confirmed appointments. Tap <strong>Send reminder</strong> to open WhatsApp with the
        reminder template pre-filled. The system records who sent it and when.
      </p>
      <RemindersList
        initialDate={tomorrowStr}
        initialRows={(bookings as any[]) || []}
        templateBody={reminderTpl?.body || ""}
        clinicName={clinicName}
        isTerminal={isTerminal}
      />
    </StaffShell>
  );
}
