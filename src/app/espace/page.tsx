"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarPlus, CheckCircle2, Clock, Phone, Mail, ArrowRight, Sparkles, CircleDashed, Home, CircleHelp } from "lucide-react";
import { useOwner } from "@/components/owner-data";
import { OwnerMissionSheet } from "@/components/owner-mission";
import { InstallPrompt } from "@/components/pwa";
import { Spinner, StatusBadge } from "@/components/ui";
import { currentPeriod, euros, formatDate, periodLabel, relativeDay, shiftPeriod, todayISO, capitalize, missionWhen } from "@/lib/format";
import { missionTitle } from "@/lib/recurrence";
import type { Mission } from "@/lib/types";

export default function OwnerHome() {
  const { me, gites, missions, submissions, settings, loading } = useOwner();
  const [open, setOpen] = useState<Mission | null>(null);
  const today = todayISO();
  const day = Number(today.slice(8));
  // À partir du 10, on pousse le mois suivant
  const target = day >= 10 ? shiftPeriod(currentPeriod(), 1) : currentPeriod();

  const status = useMemo(
    () =>
      gites.map((g) => {
        const sub = submissions.find((s) => s.giteId === g.id && s.period === target);
        const count = missions.filter((m) => m.giteId === g.id && m.date.startsWith(target) && m.status !== "CANCELLED" && m.status !== "REFUSED").length;
        return { g, done: !!sub || count > 0, empty: sub?.empty && count === 0, count };
      }),
    [gites, submissions, missions, target],
  );
  const todo = status.filter((s) => !s.done);
  const upcoming = missions.filter((m) => m.date >= today && (m.status === "REQUESTED" || m.status === "CONFIRMED")).slice(0, 5);

  if (loading) return <div className="grid h-64 place-items-center"><Spinner className="size-6 text-brand-500" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <p className="muted text-sm">{capitalize(formatDate(today))}</p>
        <h1 className="mt-0.5 font-display text-[26px] font-semibold tracking-tight">Bonjour {me.name.split(" ")[0]} 👋</h1>
      </div>

      {/* Appel à l'action principal */}
      {gites.length > 0 && <Link
        href={`/espace/planifier/?mois=${target}`}
        className="group relative block overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-xl shadow-brand-900/20 transition active:scale-[0.99]"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-white/10 blur-2xl" />
        <Sparkles className="absolute right-6 top-6 size-6 text-white/40" />
        <p className="text-sm font-medium text-white/75">{todo.length ? "À faire" : "Planning transmis"}</p>
        <p className="mt-1 font-display text-2xl font-semibold leading-snug">
          {todo.length ? <>Encoder mes dates de<br />{periodLabel(target)}</> : <>Tout est en ordre pour<br />{periodLabel(target)} ✨</>}
        </p>
        <span className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-[15px] font-semibold text-brand-800 shadow-md transition group-hover:gap-3">
          <CalendarPlus className="size-5" /> {todo.length ? "C'est parti" : "Ajouter des dates"} <ArrowRight className="size-4" />
        </span>
      </Link>}

      {gites.length > 1 && (
        <div className="card divide-y divide-[var(--border)]">
          {status.map(({ g, done, empty, count }) => (
            <Link key={g.id} href={`/espace/planifier/?mois=${target}&lieu=${g.id}`} className="flex items-center gap-3 px-4 py-3">
              <span className="size-2.5 rounded-full" style={{ background: g.color }} />
              <span className="flex-1 truncate font-medium">{g.name}</span>
              {done ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="size-4" />{empty ? "Aucun passage" : `${count} date${count > 1 ? "s" : ""}`}</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300"><CircleDashed className="size-4" />À encoder</span>
              )}
            </Link>
          ))}
        </div>
      )}

      {gites.length === 0 && (
        <Link href="/espace/lieux/?ajouter=1" className="card flex items-center gap-4 p-5 transition active:scale-[0.99]">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"><Home className="size-6" /></span>
          <span className="flex-1">
            <span className="block font-semibold">Ajoutez votre premier lieu</span>
            <span className="muted block text-sm">Gîte, appartement ou bureau : l&apos;adresse et quelques infos suffisent.</span>
          </span>
          <ArrowRight className="size-5 text-zinc-400" />
        </Link>
      )}

      <InstallPrompt />

      {/* Prochains passages */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Prochains passages</h2>
          <Link href="/espace/historique/" className="text-sm font-medium text-brand-700 dark:text-brand-300">Tout voir</Link>
        </div>
        <div className="card divide-y divide-[var(--border)] overflow-hidden">
          {upcoming.length === 0 && <p className="muted px-4 py-6 text-center text-sm">Aucun passage prévu pour l&apos;instant.</p>}
          {upcoming.map((m) => {
            const rel = relativeDay(m.date);
            return (
              <button key={m.id} onClick={() => setOpen(m)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-zinc-50 dark:active:bg-white/5">
                <div className="grid w-12 shrink-0 place-items-center rounded-xl bg-zinc-50 py-1.5 dark:bg-white/5">
                  <span className="text-[10px] font-semibold uppercase text-zinc-500">{formatDate(m.date, "medium").split(" ")[0]}</span>
                  <span className="font-display text-lg font-semibold leading-none">{Number(m.date.slice(8))}{m.dateTo ? <span className="text-xs">–{Number(m.dateTo.slice(8))}</span> : null}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{gites.length > 1 ? missionTitle(m) : m.dateTo ? missionWhen(m) : rel ?? formatDate(m.date, "medium")}</p>
                  <p className="muted flex items-center gap-1 text-[13px]">
                    <Clock className="size-3.5" />{m.dateTo ? (gites.length > 1 ? missionWhen(m) : "Jour à fixer par l'équipe") : m.time ?? "Horaire à convenir"}{gites.length > 1 && rel && !m.dateTo ? ` · ${rel}` : ""}
                  </p>
                </div>
                <StatusBadge status={m.status} />
              </button>
            );
          })}
        </div>
      </section>

      <Link href="/aide/" className="card flex items-center gap-3 p-4">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"><CircleHelp className="size-5" /></span>
        <span className="flex-1">
          <span className="block font-semibold">Comment ça marche ?</span>
          <span className="muted block text-sm">Le guide pas à pas de votre espace</span>
        </span>
        <ArrowRight className="size-4 text-zinc-400" />
      </Link>

      {/* Contact */}
      <section className="card p-4">
        <p className="font-semibold">Une question ?</p>
        <p className="muted text-sm">L&apos;équipe des Petites Fées vous répond volontiers.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href={`tel:${settings.companyPhone.replace(/\s/g, "")}`} className="btn-secondary"><Phone className="size-4" /> Appeler</a>
          <a href={`mailto:${settings.companyEmail}`} className="btn-secondary"><Mail className="size-4" /> E-mail</a>
        </div>
      </section>

      <OwnerMissionSheet mission={open} onClose={() => setOpen(null)} />
    </div>
  );
}
