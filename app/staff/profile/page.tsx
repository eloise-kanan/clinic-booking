import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import ProfileForm from "./ProfileForm";
import DoctorSlotEditor from "./DoctorSlotEditor";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { user, profile } = await requireStaff(["nurse", "owner", "doctor"]);
  const admin = createAdminClient();

  const { count } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  // For owners, load the doctor roster so they can manage default slot lengths
  // here without jumping over to the Staff page.
  let doctors: { profile_id: string; display_name: string; default_slot_minutes: number }[] = [];
  if (profile.role === "owner") {
    const { data } = await admin
      .from("doctors")
      .select("profile_id, display_name, default_slot_minutes, active")
      .eq("active", true)
      .order("display_name");
    doctors = (data || []).map((d) => ({
      profile_id: d.profile_id,
      display_name: d.display_name,
      default_slot_minutes: d.default_slot_minutes,
    }));
  }

  return (
    <StaffShell
      role={profile.role as "owner" | "nurse" | "doctor"}
      userName={profile.full_name}
      nav={await staffNav(profile.role, count || 0)}
    >
      <h2 className="text-base font-medium mb-1">My account</h2>
      <p className="text-xs text-stone-500 mb-4">
        Change your password or login email.
      </p>
      <ProfileForm email={user.email || ""} />

      {profile.role === "owner" && doctors.length > 0 && (
        <div className="mt-8 max-w-md">
          <h3 className="text-sm font-medium mb-1">Doctor default slot lengths</h3>
          <p className="text-xs text-stone-500 mb-3">
            Sets the typical appointment duration for each doctor. Used when nurses or patients
            book without specifying a custom length.
          </p>
          <DoctorSlotEditor initial={doctors} />
        </div>
      )}
    </StaffShell>
  );
}
