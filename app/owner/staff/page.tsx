import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import StaffManager from "./StaffManager";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const { profile } = await requireStaff(["owner"]);
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, role, full_name, active")
    .order("role");

  // For each doctor profile, fetch their doctor row
  const { data: doctors } = await admin
    .from("doctors")
    .select("id, profile_id, display_name, default_slot_minutes, active");

  // Auth user emails
  const { data: authUsers } = await admin.auth.admin.listUsers();
  const emailById = new Map<string, string>();
  authUsers?.users?.forEach((u) => {
    if (u.id && u.email) emailById.set(u.id, u.email);
  });

  const enriched = (profiles || []).map((p) => ({
    ...p,
    email: emailById.get(p.id) || "",
    doctor: doctors?.find((d) => d.profile_id === p.id) || null,
  }));

  return (
    <StaffShell
      role="owner"
      userName={profile.full_name}
      nav={staffNav(profile.role)}
    >
      <h2 className="text-base font-medium mb-1">Doctors & nurses</h2>
      <p className="text-xs text-stone-500 mb-4">
        Add or deactivate staff accounts. New users receive their login credentials by email.
      </p>
      <StaffManager initial={enriched} />
    </StaffShell>
  );
}
