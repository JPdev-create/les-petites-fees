"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarPlus, History, UserRound } from "lucide-react";
import { AuthProvider, RequireRole } from "@/components/auth";
import { OwnerDataProvider } from "@/components/owner-data";
import { Logo, Splash, ThemeToggle } from "@/components/ui";

const TABS = [
  { href: "/espace/", label: "Accueil", icon: Home, exact: true },
  { href: "/espace/planifier/", label: "Encoder", icon: CalendarPlus },
  { href: "/espace/historique/", label: "Mes passages", icon: History },
  { href: "/espace/compte/", label: "Compte", icon: UserRound },
];

function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const active = (t: (typeof TABS)[number]) => (t.exact ? path === t.href || path === t.href.slice(0, -1) : path.startsWith(t.href.slice(0, -1)));
  return (
    <div className="min-h-dvh">
      <header className="no-print sticky top-0 z-40 bg-brand-800 pt-[env(safe-area-inset-top)] shadow-lg shadow-brand-950/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2.5">
          <Link href="/espace/"><Logo className="!h-10" /></Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {TABS.map((t) => (
              <Link key={t.href} href={t.href} className={`rounded-xl px-3 py-2 text-sm font-medium transition ${active(t) ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
                {t.label}
              </Link>
            ))}
          </nav>
          <ThemeToggle className="!text-white hover:!bg-white/10" />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-32 pt-6 sm:pb-12">{children}</main>
      <nav className="no-print safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[var(--border)] bg-[var(--surface)]/95 pt-1.5 backdrop-blur sm:hidden">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium ${active(t) ? "text-brand-700 dark:text-brand-300" : "text-zinc-500"}`}>
            <t.icon className="size-[22px]" strokeWidth={active(t) ? 2.4 : 2} />
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RequireRole role="OWNER">
        {(me) => (
          <OwnerDataProvider me={me}>
            <Shell>
              <Suspense fallback={<Splash />}>{children}</Suspense>
            </Shell>
          </OwnerDataProvider>
        )}
      </RequireRole>
    </AuthProvider>
  );
}
