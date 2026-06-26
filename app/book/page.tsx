import BookingForm from "./BookingForm";
import { loadBranding } from "@/lib/branding-server";
import { loadTerminalConfig } from "@/lib/terminal-theme";
import { PoweredByKanan } from "@/components/PoweredByKanan";

export const dynamic = "force-dynamic";

export default async function BookPage() {
  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || "Our Clinic";
  const branding = await loadBranding();
  const { theme } = await loadTerminalConfig();
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
        <BookingForm />
        <PoweredByKanan />
      </div>
    </main>
  );
}
