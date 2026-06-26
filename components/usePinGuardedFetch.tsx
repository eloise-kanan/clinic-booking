"use client";

// usePinGuardedFetch — wraps fetch() for write actions that must be
// PIN-attributed when running on the shared clinic terminal.
//
// Caller pattern:
//   const { guardedFetch, pinModal } = usePinGuardedFetch({ isTerminal });
//   ...
//   await guardedFetch("/api/foo", { booking_id: id }, {
//     allowedRoles: ["nurse"],
//     actionLabel: "to send the reminder",
//   });
//   ...
//   return <>{...your UI...}{pinModal}</>
//
// What it does:
//   • On a non-terminal session → fetch() directly, no PIN involved.
//   • On a terminal session:
//     - Reads the cached PIN session (sessionStorage, 90s grace).
//     - If valid + matches allowedRoles → injects {pin_profile_id, pin} into
//       the request body and fires. Refreshes the grace window on success.
//     - If missing / expired / wrong role → opens the PinChallenge modal,
//       awaits verification, then fires the request with the new credentials.

import { useState, useCallback } from "react";
import PinChallenge from "@/components/PinChallenge";
import { readPinSession, writePinSession, refreshPinSession } from "@/lib/pin-client";

type PendingRequest = {
  url: string;
  body: Record<string, unknown>;
  allowedRoles?: ("nurse" | "doctor")[];
  resolve: (res: Response) => void;
  reject: (err: unknown) => void;
};

export function usePinGuardedFetch({ isTerminal }: { isTerminal: boolean }) {
  const [pending, setPending] = useState<PendingRequest | null>(null);

  const guardedFetch = useCallback(
    async (
      url: string,
      body: Record<string, unknown>,
      opts?: { allowedRoles?: ("nurse" | "doctor")[]; actionLabel?: string }
    ): Promise<Response> => {
      const allowedRoles = opts?.allowedRoles;

      // Non-terminal sessions just fetch directly.
      if (!isTerminal) {
        return fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      // Terminal: check cached PIN session.
      const sess = readPinSession();
      const cachedOk = sess && (!allowedRoles || allowedRoles.includes(sess.role));
      if (cachedOk && sess) {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, pin_profile_id: sess.profile_id, pin: sess.pin }),
        });
        if (res.ok) refreshPinSession();
        return res;
      }

      // Need PIN — open the modal and wait for verification.
      return new Promise<Response>((resolve, reject) => {
        setPending({ url, body, allowedRoles, resolve, reject });
      });
    },
    [isTerminal]
  );

  const pinModal = (
    <PinChallenge
      open={!!pending}
      allowedRoles={pending?.allowedRoles}
      onClose={() => {
        if (pending) {
          pending.resolve(new Response(JSON.stringify({ error: "PIN cancelled" }), { status: 401 }));
        }
        setPending(null);
      }}
      onVerified={async ({ profile_id, pin, full_name, role }) => {
        writePinSession({ profile_id, pin, full_name, role });
        if (!pending) return;
        const { url, body, resolve, reject } = pending;
        setPending(null);
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...body, pin_profile_id: profile_id, pin }),
          });
          if (res.ok) refreshPinSession();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      }}
    />
  );

  return { guardedFetch, pinModal };
}
