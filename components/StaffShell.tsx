"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

type NavItem = { href: string; label: string; badge?: number };
type NavSection = { title?: string; items: NavItem[] };

// Accept either a flat list (legacy callers) or a sectioned list (new).
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

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Clinic Console</span>
            <span className={`pill ${roleColor}`}>{roleLabel}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-stone-600">
            <span>{userName}</span>
            <button onClick={signOut} className="text-stone-500 hover:text-stone-900">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto flex">
        <aside className="w-52 flex-shrink-0 border-r border-stone-200 min-h-[calc(100vh-49px)] py-4">
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
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
