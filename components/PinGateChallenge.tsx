"use client";

// Full-page PIN challenge rendered by <PinGate> when a terminal session
// lacks a valid pin-lock cookie. Reuses the <PinChallenge> modal — once
// the user verifies, we POST to /api/pin/lock-token to set the signed
// cookie, then refresh the page so the server component re-evaluates and
// renders the protected content.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PinChallenge from "./PinChallenge";

export default function PinGateChallenge({
  allowedRoles,
  pageLabel,
}: {
  allowedRoles?: ("nurse" | "doctor")[];
  pageLabel?: string;
}) {
  const router = useRouter();
  // Open the modal automatically on mount — there's no underlying content
  // to interact with, so we want the prompt visible immediately.
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(true), []);

  return (
    <div className="min-h-[calc(100dvh-200px)] flex flex-col items-center justify-center gap-4 text-center p-8">
      <div className="text-stone-400 text-5xl">🔒</div>
      <div>
        <h2 className="text-base font-medium">This page is PIN-locked</h2>
        <p className="text-xs text-stone-500 mt-1 max-w-md">
          {pageLabel ? `Enter your PIN ${pageLabel}.` : "Enter your PIN to view this page."} The page locks again after 5 minutes of inactivity.
        </p>
      </div>
      <button onClick={() => setOpen(true)} className="btn-primary">
        Unlock
      </button>

      <PinChallenge
        open={open}
        allowedRoles={allowedRoles}
        actionLabel={pageLabel}
        onClose={() => {
          // Closing without verifying just leaves them on the locked screen.
          setOpen(false);
        }}
        onVerified={async ({ profile_id, pin }) => {
          // Hit the lock-token endpoint to set the signed cookie, then refresh.
          const res = await fetch("/api/pin/lock-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profile_id, pin }),
          });
          if (res.ok) {
            setOpen(false);
            router.refresh();
          } else {
            // Shouldn't normally happen — PinChallenge already verified the
            // same PIN via /api/pin/verify. Keep the modal open just in case.
          }
        }}
      />
    </div>
  );
}
