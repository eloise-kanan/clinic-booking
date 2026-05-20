import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import CalendarView from "@/components/CalendarView";

export const dynamic = "force-dynamic";

export default async function DoctorPage() {
  const { user, profile } = await requireStaff(["doctor", "owner"]);
  const admin = createAdminClient();

  const { data: doctor } = await admin
    .from("doctors")
    .select("id, display_name")
    .eq("profile_id", user.id)
    .single();

  // Today's appointments
  const today = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  let todays: any[] = [];
  if (doctor) {
    const { data } = await admin
      .from("bookings")
      .select(
        "id, slot_start, slot_end, status, type, visit_reason, patient:patients(full_name, nationality)"
      )
      .eq("doctor_id", doctor.id)
      .in("status", ["confirmed", "pending"])
      .gte("slot_start", dayStart)
      .lt("slot_start", dayEnd)
      .order("slot_start");
    todays = data || [];
  }

  return (
    <StaffShell
      role="doctor"
      userName={profile.full_name}
      nav={await staffNav(profile.role)}
    >
      <h2 className="text-base font-medium mb-4">
        {doctor?.display_name || "Doctor"} — Today
      </h2>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Today" value={String(todays.filter((b) => b.status === "confirmed").length)} sub="confirmed" />
        <Stat
          label="Pending review"
          value={String(todays.filter((b) => b.status === "pending").length)}
          sub="awaiting nurse"
        />
        <Stat
          label="Next"
          value={
            todays[0]
              ? new Date(todays[0].slot_start).toLocaleTimeString("en-MY", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })
              : "—"
          }
          sub={todays[0]?.patient?.full_name || ""}
        />
      </div>

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
              <th className="px-4 py-2.5 font-medium w-24">Time</th>
              <th className="px-4 py-2.5 font-medium">Patient</th>
              <th className="px-4 py-2.5 font-medium">Reason</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {todays.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-stone-500">
                  No appointments today.
                </td>
              </tr>
            )}
            {todays.map((b) => (
              <tr key={b.id} className="border-b border-stone-100 last:border-b-0">
                <td className="px-4 py-3 text-xs">
                  {new Date(b.slot_start).toLocaleTimeString("en-MY", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{b.patient?.full_name || "—"}</div>
                  <div className="text-xs text-stone-500">{b.patient?.nationality}</div>
                </td>
                <td className="px-4 py-3 text-xs text-stone-700">{b.visit_reason || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`pill pill-${b.status}`}>{b.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StaffShell>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="text-2xl font-medium mt-0.5">{value}</div>
      {sub && <div className="text-xs text-stone-500 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}
