import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import CalendarView from "@/components/CalendarView";
import AddToHomeScreenButton from "@/components/AddToHomeScreenButton";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const { profile } = await requireStaff(["nurse", "owner", "terminal"]);
  const isTerminal = profile.role === "terminal";
  const admin = createAdminClient();
  const { data: doctors } = await admin
    .from("doctors")
    .select("id, display_name")
    .eq("active", true)
    .order("display_name");
  const { count } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return (
    <StaffShell
      role={isTerminal ? "nurse" : (profile.role as "owner" | "nurse")}
      userName={isTerminal ? "Clinic terminal" : profile.full_name}
      nav={await staffNav(isTerminal ? "terminal" : profile.role, count || 0)}
      isTerminal={isTerminal}
    >
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-base font-medium">All doctors — calendar view</h2>
        <AddToHomeScreenButton />
      </div>
      <CalendarView doctors={(doctors as any) || []} scope="all" />
    </StaffShell>
  );
}
