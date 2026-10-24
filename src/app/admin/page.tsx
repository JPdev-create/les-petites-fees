"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { collection, limit, orderBy, query } from "firebase/firestore";
import { Inbox, CalendarCheck, AlertTriangle, Receipt, Check, Plus, Send, Shirt, ArrowRight, Sparkles, Activity as ActivityIcon, CalendarDays, Home } from "lucide-react";
import { useAdmin, missingPlanning } from "@/components/admin-data";
import { MissionDialog, MissionLine, NewMissionDialog } from "@/components/mission-admin";
import { Empty, PageHeader, Stat, Spinner } from "@/components/ui";
import { toast } from "@/components/toaster";
import { useLive } from "@/lib/hooks";
import { setMissionsStatus, queueMail } from "@/lib/actions";
import { addDays, capitalize, currentPeriod, euros, formatDate, periodLabel, shiftPeriod, startOfWeek, timeAgo, todayISO } from "@/lib/format";
import type { Activity, Mission } from "@/lib/types";

export default function Dashboard() {
  const { me, missions, gites, submissions, pending, loading, settings } = useAdmin();
  const [open, setOpen] = useState<Mission | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const activity = useLive<Activity>((db) => query(collection(db, "activity"), orderBy("at", "desc"), limit(8)), []);

  const today = todayISO();
  const nextPeriod = shiftPeriod(currentPeriod(), 1);
  const dayOfMonth = Number(today.slice(8));

  const d = useMemo(() => {
    const active = missions.filter((m) => m.status === "CONFIRMED" || m.status === "REQUESTED");
    const weekStart = startOfWeek(today);
    const weekEnd = addDays(weekStart, 6);
    const upcoming = active.filter((m) => m.date >= today && m.date <= addDays(today, 1)).sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")));
    const week = active.filter((m) => m.date >= weekStart && m.date <= weekEnd);
    const toInvoice = missions.filter((m) => m.status === "DONE" && !m.invoiceId);
    const overdue = missions.filter((m) => m.status === "CONFIRMED" && m.date < today);
    const missing = missingPlanning(nextPeriod, gites, missions, submissions);
    const activeGites = gites.filter((g) => g.active).length;
    // Linge nécessaire sur 7 jours
    const next7 = active.filter((m) => m.date >= today && m.date <= addDays(today, 6));
    const linen = next7.reduce(
      (acc, m) => {
        const g = gites.find((x) => x.id === m.giteId);
        acc.beds += (g?.bedSets ?? 0) * (m.extraLinen ? 2 : 1);
        acc.towels += (g?.towelSets ?? 0) * (m.extraLinen ? 2 : 1);
        return acc;
      },
      { beds: 0, towels: 0 },
    );
    return { upcoming, week, toInvoice, overdue, missing, activeGites, linen, next7 };
  }, [missions, gites, submissions, today, nextPeriod]);

  const confirmAll = async () => {
    setBusy("all");
    try {
      await setMissionsStatus(pending.map((m) => m.id), "CONFIRMED", me.name);
      toast(`${pending.length} demande(s) confirmée(s)`);
    } finally {
      setBusy(null);
    }
  };

  const remind = async (ownerEmail: string, name: string) => {
    setBusy(ownerEmail);
    try {
      await queueMail(ownerEmail, "reminder", `Relance manuelle (${periodLabel(nextPeriod)})`, "REMINDER");
      toast(`Relance programmée pour ${name}`);
    } finally {
      setBusy(null);
    }
  };

  const missingOwners = [...new Map(d.missing.map((g) => [g.ownerEmail, g])).values()];
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  if (loading) return <div className="grid h-64 place-items-center"><Spinner className="size-6 text-brand-500" /></div>;

  return (
    <>
      <PageHeader
        title={`${hello}, ${me.name.split(" ")[0]} ✨`}
        subtitle={capitalize(formatDate(today))}
        actions={
          <>
            <Link href="/admin/calendrier/" className="btn-secondary"><CalendarDays className="size-4" /> Calendrier</Link>
            <button className="btn-primary" onClick={() => setAdding(true)}><Plus className="size-4" /> Ajouter un passage</button>
          </>
        }
      />

      {/* Alerte fin de mois */}
      {d.missing.length > 0 && dayOfMonth >= 15 && (
        <div className="mb-6 flex animate-in flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-400/20 dark:bg-rose-400/5">
          <AlertTriangle className="size-5 shrink-0 text-rose-600" />
          <p className="min-w-0 flex-1 text-sm text-rose-900 dark:text-rose-200">
            <strong>{d.missing.length} lieu{d.missing.length > 1 ? "x" : ""}</strong> n&apos;{d.missing.length > 1 ? "ont" : "a"} pas encore transmis le planning de <strong>{periodLabel(nextPeriod)}</strong>.
            {settings.reminderEnabled && dayOfMonth < settings.reminderDay2 && <> Relance automatique le {dayOfMonth < settings.reminderDay1 ? settings.reminderDay1 : settings.reminderDay2}.</>}
          </p>
          <a href="#planning" className="btn-sm btn bg-rose-600 text-white hover:bg-rose-700">Voir la liste</a>
        </div>
      )}

      {gites.some((g) => g.pendingReview) && (
        <Link href="/admin/lieux/" className="mb-6 flex animate-in items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/5 dark:text-amber-200">
          <Home className="size-5 shrink-0" />
          <p className="flex-1">
            {(() => { const n = gites.filter((g) => g.pendingReview).length; return <><strong>{n > 1 ? `${n} nouveaux lieux` : "Nouveau lieu"}</strong> ajouté{n > 1 ? "s" : ""} par vos clients :{" "}</>; })()}
            {gites.filter((g) => g.pendingReview).map((g) => `${g.name} (${g.ownerName})`).join(", ")}. Vérifiez le tarif.
          </p>
          <ArrowRight className="size-4" />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat label="Demandes à traiter" value={pending.length} icon={Inbox} tone="amber" href="/admin/demandes/" hint={pending.length ? "Touchez pour valider" : "Tout est à jour 👌"} />
        <Stat label="Passages cette semaine" value={d.week.length} icon={CalendarCheck} hint={`${d.upcoming.length} aujourd'hui et demain`} href="/admin/calendrier/" />
        <Stat label={`Plannings ${periodLabel(nextPeriod).split(" ")[0]}`} value={`${d.activeGites - d.missing.length}/${d.activeGites}`} icon={AlertTriangle} tone={d.missing.length ? "rose" : "emerald"} hint={d.missing.length ? `${d.missing.length} manquant(s)` : "Complet"} />
        <Stat label="À facturer" value={euros(d.toInvoice.reduce((a, m) => a + m.price, 0))} icon={Receipt} tone="violet" hint={`${d.toInvoice.length} passage(s) effectué(s)`} href="/admin/factures/" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {/* Demandes en attente */}
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
              <h2 className="font-display font-semibold">Nouvelles demandes</h2>
              {pending.length > 1 && (
                <button className="btn-primary btn-sm" disabled={!!busy} onClick={confirmAll}>
                  {busy === "all" ? <Spinner className="size-3.5" /> : <Check className="size-3.5" />} Tout confirmer ({pending.length})
                </button>
              )}
            </div>
            {pending.length === 0 ? (
              <Empty icon={Sparkles} title="Aucune demande en attente" text="Les nouvelles demandes de vos clients apparaîtront ici en temps réel." />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {pending.slice(0, 6).map((m) => (
                  <MissionLine
                    key={m.id}
                    m={m}
                    onClick={() => setOpen(m)}
                    right={
                      <button
                        className="btn-secondary btn-sm"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await setMissionsStatus([m.id], "CONFIRMED", me.name);
                          toast(`${m.giteName} — ${formatDate(m.date, "short")} confirmé`);
                        }}
                      >
                        <Check className="size-3.5" /> Confirmer
                      </button>
                    }
                  />
                ))}
                {pending.length > 6 && (
                  <Link href="/admin/demandes/" className="flex items-center justify-center gap-1 py-3 text-sm font-medium text-brand-700 hover:bg-zinc-50 dark:text-brand-300 dark:hover:bg-white/5">
                    Voir les {pending.length} demandes <ArrowRight className="size-4" />
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* Aujourd'hui et demain */}
          <section className="card overflow-hidden">
            <h2 className="px-4 pb-2 pt-4 font-display font-semibold">Aujourd&apos;hui et demain</h2>
            {d.upcoming.length === 0 ? (
              <Empty icon={CalendarCheck} title="Rien de prévu" text="Aucun passage aujourd'hui ni demain." />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {d.upcoming.map((m) => <MissionLine key={m.id} m={m} onClick={() => setOpen(m)} />)}
              </div>
            )}
            {d.overdue.length > 0 && (
              <Link href="/admin/demandes/?vue=passes" className="flex items-center justify-between gap-2 border-t border-[var(--border)] bg-amber-50/60 px-4 py-3 text-sm text-amber-900 dark:bg-amber-400/5 dark:text-amber-200">
                <span><strong>{d.overdue.length}</strong> passage(s) passé(s) à marquer comme effectué(s)</span>
                <ArrowRight className="size-4" />
              </Link>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {/* Planning du mois prochain */}
          <section id="planning" className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display font-semibold">Planning de {periodLabel(nextPeriod)}</h2>
              <span className="muted text-xs">{d.activeGites - d.missing.length}/{d.activeGites}</span>
            </div>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all" style={{ width: `${d.activeGites ? ((d.activeGites - d.missing.length) / d.activeGites) * 100 : 0}%` }} />
            </div>
            {missingOwners.length === 0 ? (
              <p className="muted text-sm">Tous les lieux ont transmis leur planning. 🎉</p>
            ) : (
              <ul className="space-y-1">
                {missingOwners.map((g) => {
                  const names = d.missing.filter((x) => x.ownerEmail === g.ownerEmail).map((x) => x.name);
                  return (
                    <li key={g.ownerEmail} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-zinc-50 dark:hover:bg-white/5">
                      <span className="size-2 rounded-full bg-rose-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{g.ownerName}</p>
                        <p className="muted truncate text-xs">{names.join(", ")}</p>
                      </div>
                      <button className="btn-ghost btn-sm" disabled={busy === g.ownerEmail} onClick={() => remind(g.ownerEmail, g.ownerName)} title="Envoyer une relance">
                        {busy === g.ownerEmail ? <Spinner className="size-3.5" /> : <Send className="size-3.5" />} Relancer
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Linge */}
          <section className="card p-4">
            <h2 className="mb-3 flex items-center gap-2 font-display font-semibold"><Shirt className="size-4 text-violet-500" /> Linge — 7 prochains jours</h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-zinc-50 p-3 dark:bg-white/5"><p className="font-display text-2xl font-semibold">{d.next7.length}</p><p className="muted text-xs">passages</p></div>
              <div className="rounded-xl bg-zinc-50 p-3 dark:bg-white/5"><p className="font-display text-2xl font-semibold">{d.linen.beds}</p><p className="muted text-xs">parures</p></div>
              <div className="rounded-xl bg-zinc-50 p-3 dark:bg-white/5"><p className="font-display text-2xl font-semibold">{d.linen.towels}</p><p className="muted text-xs">jeux serviettes</p></div>
            </div>
            <Link href="/admin/stock/" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300">Prévisions & stock <ArrowRight className="size-4" /></Link>
          </section>

          {/* Activité */}
          <section className="card p-4">
            <h2 className="mb-3 flex items-center gap-2 font-display font-semibold"><ActivityIcon className="size-4 text-brand-500" /> Activité récente</h2>
            {activity.data.length === 0 ? (
              <p className="muted text-sm">Aucune activité pour l&apos;instant.</p>
            ) : (
              <ol className="space-y-3">
                {activity.data.map((a) => (
                  <li key={a.id} className="flex gap-3 text-sm">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-400" />
                    <div className="min-w-0">
                      <p>{a.message}</p>
                      <p className="muted text-xs">{a.by} · {timeAgo(a.at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      <MissionDialog mission={open} onClose={() => setOpen(null)} />
      <NewMissionDialog open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
