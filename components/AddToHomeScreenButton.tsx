"use client";

import { useEffect, useState } from "react";

type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // Safari iOS-specific
  if ((window.navigator as { standalone?: boolean }).standalone) return true;
  return false;
}

export default function AddToHomeScreenButton({ className = "btn" }: { className?: string }) {
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPromptEvent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isInstalled());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as DeferredPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (installed) return null;

  async function handleClick() {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        setDeferredPrompt(null);
        return;
      } catch {
        // fall through to instructions modal
      }
    }
    setOpen(true);
  }

  const label = "📱 Add to Home Screen";

  return (
    <>
      <button type="button" onClick={handleClick} className={className}>
        {label}
      </button>
      {open && <InstructionsModal platform={platform} onClose={() => setOpen(false)} />}
    </>
  );
}

function InstructionsModal({ platform, onClose }: { platform: Platform; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl max-w-sm w-full p-5 shadow-lg"
      >
        <h3 className="text-base font-medium mb-3">Add this to your phone Home Screen</h3>

        {platform === "ios" && (
          <ol className="text-sm text-stone-700 space-y-3 list-decimal list-inside">
            <li>
              Tap the <strong>Share</strong> button at the bottom of Safari.{" "}
              <span className="text-stone-500">(square with an up-arrow)</span>
            </li>
            <li>
              Scroll down and tap <strong>Add to Home Screen</strong>.
            </li>
            <li>
              Tap <strong>Add</strong> in the top-right corner.
            </li>
            <li>An icon now appears on your Home Screen — tap it to open the calendar instantly.</li>
          </ol>
        )}

        {platform === "android" && (
          <ol className="text-sm text-stone-700 space-y-3 list-decimal list-inside">
            <li>
              Tap the <strong>⋮</strong> menu in the top-right of Chrome.
            </li>
            <li>
              Tap <strong>Add to Home screen</strong> (or <strong>Install app</strong>).
            </li>
            <li>
              Tap <strong>Install</strong> / <strong>Add</strong> to confirm.
            </li>
            <li>The clinic icon now appears on your Home screen — tap it any time.</li>
          </ol>
        )}

        {platform === "desktop" && (
          <p className="text-sm text-stone-700">
            Open this page on your phone&apos;s browser, then tap this button again. The instructions will guide
            you through adding the calendar to your phone&apos;s Home Screen.
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="btn-primary w-full mt-5"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
