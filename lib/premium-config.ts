// Server-side helpers for the Premium room flow + doctor profiles.

import { createAdminClient } from "@/lib/supabase-admin";

export type PremiumConfig = {
  rooms: string[];          // labels the owner has defined (Premium-only)
  treatmentOptions: string[]; // canonical treatment list reused for treatment_done dropdown
};

const DEFAULT_ROOMS = ["Room 1", "Room 2", "Room 3"];
const DEFAULT_TREATMENTS = [
  "Consultation",
  "Scaling & polishing",
  "Filling",
  "Root canal",
  "Crown fitting",
  "Extraction",
  "Wisdom tooth surgery",
  "Whitening",
  "Other",
];

export async function loadPremiumConfig(): Promise<PremiumConfig> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("clinic_settings")
      .select("rooms_list")
      .eq("id", true)
      .maybeSingle();
    return {
      rooms: (data?.rooms_list && data.rooms_list.length > 0 ? data.rooms_list : DEFAULT_ROOMS) as string[],
      treatmentOptions: DEFAULT_TREATMENTS,
    };
  } catch {
    return { rooms: DEFAULT_ROOMS, treatmentOptions: DEFAULT_TREATMENTS };
  }
}
