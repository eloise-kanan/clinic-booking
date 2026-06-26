import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import { loadPlan } from "@/lib/branding-server";
import HomeLauncher from "./HomeLauncher";
import ClinicConsole from "./ClinicConsole";

export const dynamic = "force-dynamic";

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function HomePage() {
  const { user, profile } = await requireStaff(["nurse", "owner", "doctor", "terminal"]);
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

  // Terminal mode — render the clinic console (read-only summary of today).
  // Actions on these cards will require PIN unlock (Phase 4).
  if (profile.role === "terminal") {
    // Pending bookings list (up to 8)
    const { data: pendingList } = await admin
      .from("bookings")
      .select("id, slot_start, service, status, patient:patients(full_name), doctor:doctors(display_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(8);

    // Today's confirmed appointments
    const { data: todayList } = await admin
      .from("bookings")
      .select("id, slot_start, service, status, attended_at, no_show, patient:patients(full_name), doctor:doctors(id, display_name)")
      .eq("status", "confirmed")
      .gte("slot_start", todayStart)
      .lte("slot_start", todayEnd)
      .order("slot_start");

    // Recalls due today — same logic as /staff/recalls: fetch patients with
    // a last_visit_at and no reminder sent yet, then compute "due" in code
    // based on months-since-visit vs recall_interval_months.
    const { data: recallRows } = await admin
      .from("patients")
      .select("id, full_name, last_visit_at, recall_interval_months, recall_reminder_sent_at")
      .not("last_visit_at", "is", null)
      .is("recall_reminder_sent_at", null)
      .order("last_visit_at");
    const nowMs = Date.now();
    const recallList = (recallRows || [])
      .map((p) => {
        const lastMs = p.last_visit_at ? new Date(p.last_visit_at).getTime() : 0;
        const monthsSince = (nowMs - lastMs) / (30 * 24 * 3600 * 1000);
        return {
          ...p,
          months_overdue: monthsSince - (p.recall_interval_months || 6),
        };
      })
      .filter((p) => p.months_overdue >= 0)
      .sort((a, b) => b.months_overdue - a.months_overdue)
      .slice(0, 8);

    // Doctors on duty today (using doctors table; doctors with active=true)
    const { data: doctorList } = await admin
      .from("doctors")
      .select("id, display_name, default_slot_minutes, active")
      .eq("active", true)
      .order("display_name");

    return (
      <StaffShell
        role="nurse" // StaffShell only knows owner/nurse/doctor for badge colors; nurse is the neutral choice
        userName="Clinic terminal"
        nav={await staffNav("terminal", 0)}
      >
        <ClinicConsole
          clinicName={clinicName}
          backgroundUrl={process.env.NEXT_PUBLIC_TERMINAL_BG_URL || null}
          pending={(pendingList || []).map((b) => ({
            id: b.id,
            slot_start: b.slot_start,
            service: b.service,
            patient_name: (b.patient as { full_name?: string } | null)?.full_name || "—",
            doctor_name: (b.doctor as { display_name?: string } | null)?.display_name || "—",
          }))}
          today={(todayList || []).map((b) => ({
            id: b.id,
            slot_start: b.slot_start,
            service: b.service,
            attended: !!b.attended_at,
            no_show: !!b.no_show,
            patient_name: (b.patient as { full_name?: string } | null)?.full_name || "—",
            doctor_id: (b.doctor as { id?: string } | null)?.id || null,
            doctor_name: (b.doctor as { display_name?: string } | null)?.display_name || "—",
          }))}
          recalls={recallList.map((p) => ({
            id: p.id,
            full_name: p.full_name,
            last_visit_at: p.last_visit_at,
            recall_due_at: null,
          }))}
          doctors={(doctorList || []).map((d) => ({
            id: d.id,
            display_name: d.display_name,
            default_slot_minutes: d.default_slot_minutes,
          }))}
        />
      </StaffShell>
    );
  }

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
