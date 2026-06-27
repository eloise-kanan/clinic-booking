"use client";

// Small fixed-position "Powered by Kanan" pill at the bottom-right.
// Hidden on pages that already render the full inline footer (lockscreen,
// /login, /book) to avoid showing the attribution twice.

import { usePathname } from "next/navigation";

const ROUTES_WITH_INLINE_FOOTER = new Set(["/home", "/login", "/book"]);

export default function GlobalKananPill() {
  const pathname = usePathname();
  if (ROUTES_WITH_INLINE_FOOTER.has(pathname)) return null;

  return (
    <div className="fixed bottom-2 right-3 z-40 pointer-events-none">
      <a
        href="https://kanan.my"
        target="_blank"
        rel="noreferrer"
        className="pointer-events-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/80 backdrop-blur-md border border-stone-200 shadow-sm text-[10px] text-stone-500 hover:text-stone-900 hover:bg-white"
      >
        Powered by <span className="font-medium" style={{ color: "#1B2A4A" }}>Kanan</span>
      </a>
    </div>
  );
}
