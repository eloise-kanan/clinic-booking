"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

type NavItem = { href: string; label: string; badge?: number };
type NavSection = { title?: string; items: NavItem[] };
type Nav = NavItem[] | NavSection[];

function isSectioned(n: Nav): n is NavSection[] {
  return n.length === 0 || (typeof n[0] === "object" && n[0] !== null && "items" in (n[0] as object));
}

export function StaffShell({
  role,
  userName,
  nav,
  children,
}: {
  role: "owner" | "nurse" | "doctor";
  userName: string;
  nav: Nav;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close the mobile drawer on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open
  useEffect(() => {
    if (mobileNavOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [mobileNavOpen]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const roleLabel = { owner: "Owner", nurse: "Nurse", doctor: "Doctor" }[role];
  const roleColor = {
    owner: "bg-amber-100 text-amber-800",
    nurse: "bg-emerald-100 text-emerald-800",
    doctor: "bg-blue-100 text-blue-800",
  }[role];

  const sections: NavSection[] = isSectioned(nav) ? nav : [{ items: nav as NavItem[] }];

  const navList = (
    <>
      {sections.map((section, si) => (
        <div key={si} className={si > 0 ? "mt-4" : ""}>
          {section.title && (
            <div className="px-4 py-1 text-[10px] uppercase tracking-wider text-stone-400 font-medium">
              {section.title}
            </div>
          )}
          {section.items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={`block px-4 py-2 text-sm flex items-center justify-between ${
                  active
                    ? "bg-stone-100 text-stone-900 font-medium border-l-2 border-stone-900 pl-[14px]"
                    : "text-stone-600 hover:bg-stone-50"
                }`}
              >
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 md:px-5 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <button
              type="button"
              className="md:hidden p-1.5 -ml-1.5 text-stone-700 hover:bg-stone-100 rounded"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
                <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" />
                <line x1="3" y1="18" x2="21" y2="18" strokeLinecap="round" />
              </svg>
            </button>
            <span className="text-sm font-medium truncate">Clinic Console</span>
            <span className={`pill ${roleColor} hidden sm:inline-block`}>{roleLabel}</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3 text-xs text-stone-600 flex-shrink-0">
            <span className="hidden sm:inline truncate max-w-[160px]">{userName}</span>
            <button onClick={signOut} className="text-stone-500 hover:text-stone-900">
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Backdrop for mobile drawer */}
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="md:hidden fixed inset-0 top-[49px] z-30 bg-black/40"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <div className="max-w-7xl mx-auto md:flex">
        <aside
          className={`
            bg-white py-4 overflow-y-auto
            md:w-52 md:flex-shrink-0 md:border-r md:border-stone-200 md:min-h-[calc(100vh-49px)] md:static md:translate-x-0 md:block
            fixed top-[49px] left-0 z-40 w-64 max-w-[85vw] h-[calc(100vh-49px)] border-r border-stone-200
            transition-transform duration-200 ease-out
            ${mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
        >
          {navList}
        </aside>
        <main className="flex-1 p-4 md:p-6 min-w-0">{children}</main>
      </div>
    </div>
  );
}
