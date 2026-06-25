import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { PoweredByKanan } from "@/components/PoweredByKanan";

export default function LoginPage() {
  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || "Clinic";
  return (
    <main className="min-h-dvh bg-stone-50 flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-medium">{clinicName}</h1>
          <p className="text-sm text-stone-500 mt-1">Staff login</p>
        </div>
        <Suspense fallback={<div className="bg-white rounded-xl border border-stone-200 p-6">Loading…</div>}>
          <LoginForm />
        </Suspense>
        <PoweredByKanan />
      </div>
    </main>
  );
}
