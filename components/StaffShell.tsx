"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

type NavItem = { href: string; label: string; badge?: number };
type NavSection = { title?: string; items: NavItem[]; expandable?: boolean };
type Nav = NavItem[] | NavSection[];

function isSectioned(n: Nav): n is NavSection[] {
  return n.length === 0 || (typeof n[0] === "object" && n[0] !== null && "items" in (n[0] as object));
}

function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === pathname) return true;
  // Treat a parent href as active when on a sub-path, but ignore the root "/"
  // which would falsely match everything.
  return item.href !== "/" && pathname.startsWith(item.href + "/");
}

function isSectionActive(section: NavSection, pathname: string): boolean {
  return section.items.some((it) => isItemActive(it, pathname));
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

  const sections: NavSection[] = isSectioned(nav) ? nav : [{ items: nav as NavItem[] }];

  // Track which expandable section is open. Only one at a time.
  // Initial open = the section containing the active route.
  const activeExpandableIndex = useMemo(() => {
    return sections.findIndex(
      (s) => s.expandable && isSectionActive(s, pathname)
    );
  }, [sections, pathname]);

  const [openIndex, setOpenIndex] = useState<number>(
    activeExpandableIndex >= 0 ? activeExpandableIndex : -1
  );

  // When the route changes (e.g. user clicked a link in a different section),
  // open that section automatically.
  useEffect(() => {
    if (activeExpandableIndex >= 0 && activeExpandableIndex !== openIndex) {
      setOpenIndex(activeExpandableIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close the mobile drawer on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile drawer is open. iOS Safari ignores
  // `body { overflow: hidden }` for touch scrolling, so we pin the body with
  // position:fixed + restore the original scrollY when the drawer closes.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const orig = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    return () => {
      body.style.overflow = orig.overflow;
      body.style.position = orig.position;
      body.style.top = orig.top;
      body.style.width = orig.width;
      window.scrollTo(0, scrollY);
    };
  }, [mobileNavOpen]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function toggleSection(idx: number) {
    setOpenIndex((prev) => (prev === idx ? -1 : idx));
  }

  const roleLabel = { owner: "Owner", nurse: "Nurse", doctor: "Doctor" }[role];
  const roleColor = {
    owner: "bg-amber-100 text-amber-800",
    nurse: "bg-emerald-100 text-emerald-800",
    doctor: "bg-blue-100 text-blue-800",
  }[role];

  function renderItem(item: NavItem) {
    const active = isItemActive(item, pathname);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileNavOpen(false)}
        className={`block px-4 py-2 text-sm flex items-center justify-between ${
          active
            ? "font-medium border-l-2 pl-[14px]"
            : "text-stone-600 hover:bg-stone-50"
        }`}
        style={
          active
            ? {
                background: "var(--staff-accent-soft, #f5f5f4)",
                color: "var(--staff-active-text, #1c1917)",
                borderLeftColor: "var(--staff-accent, #1c1917)",
              }
            : undefined
        }
      >
        <span>{item.label}</span>
        {item.badge ? (
          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
            {item.badge}
          </span>
        ) : null}
      </Link>
    );
  }

  const navList = (
    <>
      {sections.map((section, si) => {
        // Non-expandable section — render directly (top-level items)
        if (!section.expandable) {
          return (
            <div key={si} className={si > 0 ? "mt-2" : ""}>
              {section.title && (
                <div className="px-4 py-1 text-[10px] uppercase tracking-wider text-stone-400 font-medium">
                  {section.title}
                </div>
              )}
              {section.items.map(renderItem)}
            </div>
          );
        }

        // Expandable section — accordion behaviour
        const isOpen = openIndex === si;
        const hasActive = isSectionActive(section, pathname);
        const headerActive = hasActive && !isOpen;
        // Compute total badge count for the section so we can show it on the header
        const totalBadge = section.items.reduce((sum, it) => sum + (it.badge || 0), 0);

        return (
          <div key={si} className="mt-2">
            <button
              type="button"
              onClick={() => toggleSection(si)}
              aria-expanded={isOpen}
              className={`w-full text-left flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                headerActive
                  ? "font-medium"
                  : isOpen
                    ? "text-stone-900 font-medium"
                    : "text-stone-700 hover:bg-stone-50"
              }`}
              style={
                headerActive
                  ? {
                      background: "var(--staff-accent-soft, #f5f5f4)",
                      color: "var(--staff-active-text, #1c1917)",
                    }
                  : undefined
              }
            >
              <span className="flex items-center gap-2">
                <span>{section.title}</span>
                {!isOpen && totalBadge > 0 && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                    {totalBadge}
                  </span>
                )}
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                className={`transition-transform duration-200 text-stone-400 ${
                  isOpen ? "rotate-90" : "rotate-0"
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="4 2 8 6 4 10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ease-out ${
                isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="pl-2 border-l border-stone-200 ml-4 my-1">
                {section.items.map(renderItem)}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );

  return (
    <div className="min-h-dvh" style={{ background: "var(--staff-bg, #fafaf9)" }}>
      {/* Themed accent rail — same color as the terminal lockscreen accent */}
      <div className="h-[3px] w-full sticky top-0 z-40" style={{ background: "var(--staff-accent, transparent)" }} />
      <header className="bg-white border-b border-stone-200 sticky top-[3px] z-30">
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
          className="md:hidden fixed inset-0 top-[52px] z-30 bg-black/40"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <div className="max-w-7xl mx-auto md:flex md:items-start">
        <aside
          className={`
            bg-white py-4 overflow-y-auto
            md:w-56 md:flex-shrink-0 md:border-r md:border-stone-200
            md:sticky md:top-[52px] md:h-[calc(100dvh-52px)]
            md:translate-x-0 md:block
            fixed top-[52px] left-0 z-40 w-64 max-w-[85vw] h-[calc(100dvh-52px)] border-r border-stone-200
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
