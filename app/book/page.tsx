import BookingForm from "./BookingForm";

export const dynamic = "force-dynamic";

export default function BookPage() {
  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || "Our Clinic";
  return (
    <main className="min-h-screen bg-stone-50">
      <div className="max-w-xl mx-auto px-5 py-10">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-medium tracking-tight">{clinicName}</h1>
          <p className="text-sm text-stone-500 mt-1">Appointment booking</p>
        </header>
        <BookingForm />
      </div>
    </main>
  );
}
