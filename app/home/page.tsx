import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import { loadPlan } from "@/lib/branding-server";
import HomeLauncher from "./HomeLauncher";

export const dynamic = "force-dynamic";

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function HomePage() {
  const { user, profile } = await requireStaff(["nurse", "owner", "doctor"]);
  const admin = createAdminClient();

  // Counts useful for any role's home cards
  const today = ymd(new Date());
  const tomorrow = ymd(new Date(Date.now() + 24 * 3600 * 1000));
  const todayStart = new Date(today + "T00:00:00").toISOString();
  const todayEnd = new Date(today + "T23:59:59").toISOString();
  const tomorrowStart = new Date(tomorrow + "T00:00:00").toISOString();
  const tomorrowEnd = new Date(tomorrow + "T23:59:59").toISOString();

  // Pending count (nurse + owner)
  const { count: pendingCount } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  // Today's confirmed bookings count
  let todayQuery = admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "confirmed")
    .gte("slot_start", todayStart)
    .lte("slot_start", todayEnd);
  // For doctor, scope to own
  if (profile.role === "doctor") {
    const { data: doc } = await admin.from("doctors").select("id").eq("profile_id", user.id).maybeSingle();
    if (doc) todayQuery = todayQuery.eq("doctor_id", doc.id);
  }
  const { count: todayCount } = await todayQuery;

  // Tomorrow's bookings that haven't had reminder sent (nurse + owner)
  const { count: remindersPendingCount } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "confirmed")
    .gte("slot_start", tomorrowStart)
    .lte("slot_start", tomorrowEnd)
    .is("reminder_sent_at", null);

  // Pending leave + shift requests (owner)
  const { count: pendingLeavesCount } = await admin
    .from("leave_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  const { count: pendingShiftsCount } = await admin
    .from("duty_shifts")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  // Past-unmarked attendance (nurse follow-up)
  const { count: pastUnmarkedCount } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "confirmed")
    .lt("slot_start", new Date().toISOString())
    .is("attended_at", null)
    .eq("no_show", false);

  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || "the clinic";
  const plan = await loadPlan();

  return (
    <StaffShell
      role={profile.role as "owner" | "nurse" | "doctor"}
      userName={profile.full_name}
      nav={await staffNav(profile.role, pendingCount || 0)}
    >
      <HomeLauncher
        role={profile.role as "nurse" | "owner" | "doctor"}
        userName={profile.full_name}
        clinicName={clinicName}
        plan={plan}
        counts={{
          pending: pendingCount || 0,
          today: todayCount || 0,
          remindersPending: remindersPendingCount || 0,
          pendingLeaves: pendingLeavesCount || 0,
          pendingShifts: pendingShiftsCount || 0,
          pastUnmarked: pastUnmarkedCount || 0,
        }}
      />
    </StaffShell>
  );
}
