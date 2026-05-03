import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .single();
  if (!profile?.active) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const daysParam = url.searchParams.get("days");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const days = Math.max(1, Math.min(31, parseInt(daysParam || "1", 10) || 1));
  const dayStart = new Date(date + "T00:00:00").toISOString();
  const endDate = new Date(date + "T00:00:00");
  endDate.setDate(endDate.getDate() + days - 1);
  const dayEnd = new Date(endDate.toISOString().slice(0, 10) + "T23:59:59").toISOString();

  const admin = createAdminClient();
  let query = admin
    .from("bookings")
    .select(
      "id, doctor_id, slot_start, slot_end, status, type, patient:patients(full_name)"
    )
    .gte("slot_start", dayStart)
    .lte("slot_start", dayEnd)
    .in("status", ["pending", "confirmed"])
    .order("slot_start");

  if (profile.role === "doctor") {
    const { data: doc } = await admin.from("doctors").select("id").eq("profile_id", user.id).single();
    if (doc) query = query.eq("doctor_id", doc.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bookings: data });
}
