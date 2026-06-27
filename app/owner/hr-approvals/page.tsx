import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import HrApprovalsList from "./HrApprovalsList";

export const dynamic = "force-dynamic";

export default async function HrApprovalsPage() {
  const { profile } = await requireStaff(["owner"]);
  const admin = createAdminClient();

  // Pull all pending HR-related submissions in one query each — leaves +
  // shift-change requests. Owner approves / rejects either kind from one
  // unified page so they don't have to bounce between /staff/leave +
  // /staff/duty (those are submit-only pages for staff themselves).
  const [leavesRes, shiftsRes, pendingBookingsRes] = await Promise.all([
    admin
      .from("leave_requests")
      .select(
        "id, profile_id, start_date, end_date, reason, leave_type, status, created_at, profile:profiles!leave_requests_profile_id_fkey(full_name, role)"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    admin
      .from("duty_shifts")
      .select(
        "id, profile_id, shift_date, start_time, end_time, reason, status, created_at, profile:profiles!duty_shifts_profile_id_fkey(full_name, role)"
      )
      .eq("status", "pending")
      .order("shift_date", { ascending: true }),
    admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  type RawProfile = { full_name?: string; role?: string };
  const flat = (v: unknown): RawProfile | null => {
    if (!v) return null;
    if (Array.isArray(v)) return (v[0] as RawProfile) || null;
    return v as RawProfile;
  };

  const leaves = (leavesRes.data || []).map((r) => ({
    id: r.id,
    profile_id: r.profile_id,
    profile_name: flat(r.profile)?.full_name || "—",
    profile_role: flat(r.profile)?.role || "",
    start_date: r.start_date,
    end_date: r.end_date,
    reason: r.reason,
    leave_type: (r.leave_type || "annual") as "annual" | "mc" | "emergency",
    created_at: r.created_at,
  }));
  const shifts = (shiftsRes.data || []).map((r) => ({
    id: r.id,
    profile_id: r.profile_id,
    profile_name: flat(r.profile)?.full_name || "—",
    profile_role: flat(r.profile)?.role || "",
    shift_date: r.shift_date,
    start_time: r.start_time,
    end_time: r.end_time,
    reason: r.reason,
    created_at: r.created_at,
  }));

  return (
    <StaffShell role="owner" userName={profile.full_name} nav={await staffNav(profile.role, pendingBookingsRes.count || 0)}>
      <h2 className="text-base font-medium mb-1">HR approvals</h2>
      <p className="text-xs text-stone-500 mb-4">
        All pending leave and shift-change requests in one place. Approve or reject — staff submit
        them via the lockscreen.
      </p>
      <HrApprovalsList leaves={leaves} shifts={shifts} />
    </StaffShell>
  );
}
