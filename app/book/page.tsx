import BookingForm from "./BookingForm";
import { loadBranding } from "@/lib/branding-server";

export const dynamic = "force-dynamic";

export default async function BookPage() {
  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || "Our Clinic";
  const branding = await loadBranding();
  return (
    <main className="min-h-screen bg-stone-50">
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
      </div>
    </main>
  );
}
