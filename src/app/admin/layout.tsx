"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, Inbox, Home, Users, Receipt, Package, Settings as Cog, LogOut, Menu, X, Bell,
} from "lucide-react";
import { AuthProvider, RequireRole, logout } from "@/components/auth";
import { AdminDataProvider, useAdmin } from "@/components/admin-data";
import { Logo, Splash, ThemeToggle } from "@/components/ui";

const NAV = [
  { href: "/admin/", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/admin/calendrier/", label: "Calendrier", icon: CalendarDays },
  { href: "/admin/demandes/", label: "Demandes", icon: Inbox, badge: "pending" },
  { href: "/admin/lieux/", label: "Gîtes & lieux", icon: Home },
  { href: "/admin/clients/", label: "Clients", icon: Users },
  { href: "/admin/factures/", label: "Factures", icon: Receipt },
  { href: "/admin/stock/", label: "Linge & stock", icon: Package },
  { href: "/admin/journal/", label: "Journal", icon: Bell },
  { href: "/admin/parametres/", label: "Paramètres", icon: Cog },
];
const MOBILE = ["/admin/", "/admin/calendrier/", "/admin/demandes/", "/admin/lieux/"];

function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { me, pending } = useAdmin();
  const [open, setOpen] = useState(false);
  const isActive = (n: (typeof NAV)[number]) => (n.exact ? path === n.href || path === n.href.slice(0, -1) : path.startsWith(n.href.slice(0, -1)));

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5">
      {NAV.map((n) => {
        const active = isActive(n);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-white/15 text-white shadow-inner" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
          >
            <n.icon className="size-[18px]" />
            <span className="flex-1">{n.label}</span>
            {n.badge && pending.length > 0 && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-amber-950">{pending.length}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const user = (
    <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/10 p-3">
      <div className="grid size-9 place-items-center rounded-full bg-brand-400/40 text-sm font-semibold text-white">{me.name.slice(0, 1).toUpperCase()}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{me.name}</p>
        <p className="truncate text-xs text-white/60">Gestionnaire</p>
      </div>
      <button onClick={() => logout()} className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white" title="Se déconnecter" aria-label="Se déconnecter">
        <LogOut className="size-4" />
      </button>
    </div>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Barre latérale (PC) */}
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-gradient-to-b from-brand-800 to-brand-950 p-4 lg:flex">
        <Link href="/admin/" className="mb-6 px-2 pt-2"><Logo className="!h-auto w-full" /></Link>
        {nav}
        {user}
      </aside>

      {/* En-tête (mobile) */}
      <header className="no-print sticky top-0 z-40 flex items-center justify-between bg-brand-800 px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] lg:hidden">
        <Link href="/admin/"><Logo className="!h-11" /></Link>
        <div className="flex items-center gap-1 text-white">
          <ThemeToggle className="!text-white hover:!bg-white/10" />
          <button onClick={() => setOpen(true)} className="btn-ghost size-9 px-0 !text-white hover:!bg-white/10" aria-label="Menu">
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      {/* Menu tiroir (mobile) */}
      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-72 animate-in flex-col bg-gradient-to-b from-brand-800 to-brand-950 p-4">
            <div className="mb-4 flex justify-end">
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-white/80 hover:bg-white/10" aria-label="Fermer">
                <X className="size-5" />
              </button>
            </div>
            {nav}
            {user}
          </div>
        </div>
      )}

      <div className="no-print hidden justify-end px-8 pt-5 lg:flex">
        <ThemeToggle />
      </div>
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-0">{children}</main>

      {/* Barre d'onglets (mobile) */}
      <nav className="no-print safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[var(--border)] bg-[var(--surface)]/95 pt-1.5 backdrop-blur lg:hidden">
        {NAV.filter((n) => MOBILE.includes(n.href)).map((n) => {
          const active = isActive(n);
          return (
            <Link key={n.href} href={n.href} className={`relative flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium ${active ? "text-brand-700 dark:text-brand-300" : "text-zinc-500"}`}>
              <n.icon className="size-[22px]" />
              {n.label.split(" ")[0]}
              {n.badge && pending.length > 0 && <span className="absolute right-1/2 top-0 translate-x-5 rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">{pending.length}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RequireRole role="ADMIN">
        {(me) => (
          <AdminDataProvider me={me}>
            <Shell>
              <Suspense fallback={<Splash />}>{children}</Suspense>
            </Shell>
          </AdminDataProvider>
        )}
      </RequireRole>
    </AuthProvider>
  );
}
