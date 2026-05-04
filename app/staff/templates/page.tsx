import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { StaffShell } from "@/components/StaffShell";
import { staffNav } from "@/lib/staff-nav";
import TemplateEditor from "./TemplateEditor";

export const dynamic = "force-dynamic";

type Template = { key: string; body: string; updated_at: string };

export default async function TemplatesPage() {
  const { profile } = await requireStaff(["nurse", "owner"]);
  const admin = createAdminClient();

  const { data: templates } = await admin
    .from("message_templates")
    .select("key, body, updated_at")
    .order("key");

  const { count } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || "Our Clinic";

  return (
    <StaffShell
      role={profile.role as "owner" | "nurse"}
      userName={profile.full_name}
      nav={staffNav(profile.role, count || 0)}
    >
      <h2 className="text-base font-medium mb-1">WhatsApp templates</h2>
      <p className="text-xs text-stone-500 mb-4">
        Edit the templates the nurse uses when sending WhatsApp messages. Changes apply immediately to all
        new wa.me links across the system.
      </p>
      <TemplateEditor initial={(templates as Template[]) || []} clinicName={clinicName} />
    </StaffShell>
  );
}
