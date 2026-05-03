import { redirect } from "next/navigation";
import { createClient } from "./supabase-server";

export async function requireStaff(allowedRoles?: ("owner" | "nurse" | "doctor")[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, active")
    .eq("id", user.id)
    .single();
  if (!profile || !profile.active) redirect("/login");
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    if (profile.role === "owner") redirect("/owner");
    if (profile.role === "doctor") redirect("/doctor");
    redirect("/nurse");
  }
  return { user, profile };
}
