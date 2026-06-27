import BookingForm from "./BookingForm";
import { loadBranding, loadPlan } from "@/lib/branding-server";
import { loadTerminalConfig } from "@/lib/terminal-theme";
import { hasFeature, type Plan } from "@/lib/plan";

export const dynamic = "force-dynamic";

export default async function BookPage() {
  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || "Our Clinic";
  const branding = await loadBranding();
  const { theme } = await loadTerminalConfig();
  const plan = (await loadPlan()) as Plan;
  const doctorProfilesEnabled = hasFeature(plan, "doctor_profiles");
  return (
    <main className="relative min-h-dvh" style={{ background: theme.staffBg }}>
      {/* Themed accent rail — same color as the staff backend + lockscreen,
          so the patient-facing booking page reads as part of the same brand. */}
      <div className="h-[3px] w-full" style={{ background: theme.accent }} />
      <div className="max-w-xl mx-auto px-5 py-10">
        <header className="mb-8 text-center">
          {branding.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logo_url}
              alt={clinicName}
              className="mx-auto mb-3 max-h-16 object-contain"
            />
          ) : null}
          <h1 className="text-2xl font-medium tracking-tight">{clinicName}</h1>
          <p className="text-sm text-stone-500 mt-1">Appointment booking</p>
        </header>
        <BookingForm doctorProfilesEnabled={doctorProfilesEnabled} />
        <footer className="mt-10 text-center text-[11px] text-stone-500">
          Powered by{" "}
          <a
            href="https://kanan.my"
            target="_blank"
            rel="noreferrer"
            className="font-medium hover:underline underline-offset-2"
            style={{ color: "#1B2A4A" }}
          >
            Kanan
          </a>{" "}
          · your trusted right hand
        </footer>
      </div>
    </main>
  );
}
