"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Send, CalendarX2, Copy, ChevronDown, Zap, Shirt, Check, Sparkles, ArrowLeft, Trash2, Info } from "lucide-react";
import { useOwner } from "@/components/owner-data";
import { MonthPicker, type DayMarker } from "@/components/month-picker";
import { Spinner, Toggle } from "@/components/ui";
import { toast } from "@/components/toaster";
import { useParam } from "@/lib/hooks";
import { declareEmptyMonth, ownerRequestDates, undoEmptyMonth, type RequestEntry } from "@/lib/actions";
import { STATUS, addDays, currentPeriod, formatDate, parseISODate, periodLabel, periodOf, shiftPeriod, todayISO, weekdayIndex, pad } from "@/lib/format";

type Opts = { time: string; note: string; urgent: boolean; extraLinen: boolean };

/** Même jour de semaine, même rang dans le mois (ex. 2e samedi) */
function sameWeekdayNextMonth(iso: string, targetPeriod: string) {
  const d = parseISODate(iso);
  const rank = Math.floor((d.getDate() - 1) / 7);
  const wd = weekdayIndex(d);
  const [y, m] = targetPeriod.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const offset = (wd - weekdayIndex(first) + 7) % 7;
  const day = 1 + offset + rank * 7;
  if (day > new Date(y, m, 0).getDate()) return null;
  return `${targetPeriod}-${pad(day)}`;
}

export default function PlanPage() {
  const { me, gites, missions, submissions, settings, loading } = useOwner();
  const moisParam = useParam("mois");
  const lieuParam = useParam("lieu");
  const today = todayISO();
  const minDate = addDays(today, Math.ceil(settings.minNoticeHours / 24));

  const [giteId, setGiteId] = useState<string | null>(null);
  const [period, setPeriod] = useState(currentPeriod());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [opts, setOpts] = useState<Record<string, Opts>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<{ count: number; empty: boolean } | null>(null);

  useEffect(() => {
    if (moisParam && /^\d{4}-\d{2}$/.test(moisParam)) setPeriod(moisParam);
    else if (Number(today.slice(8)) >= 10) setPeriod(shiftPeriod(currentPeriod(), 1));
  }, [moisParam, today]);

  useEffect(() => {
    if (giteId || !gites.length) return;
    setGiteId(gites.find((g) => g.id === lieuParam)?.id ?? gites[0].id);
  }, [gites, lieuParam, giteId]);

  const gite = gites.find((g) => g.id === giteId);
  const giteMissions = useMemo(() => missions.filter((m) => m.giteId === giteId && m.status !== "CANCELLED" && m.status !== "REFUSED"), [missions, giteId]);
  const existing = useMemo(() => new Set(giteMissions.map((m) => m.date)), [giteMissions]);
  const markers = useMemo(() => {
    const out: Record<string, DayMarker[]> = {};
    for (const m of giteMissions) {
      const color = m.status === "REQUESTED" ? "#f59e0b" : m.status === "DONE" ? "#10b981" : "#0ea5e9";
      out[m.date] = [...(out[m.date] ?? []), { color, label: STATUS[m.status].label }];
    }
    return out;
  }, [giteMissions]);
  const sub = submissions.find((s) => s.giteId === giteId && s.period === period);
  const monthExisting = giteMissions.filter((m) => m.date.startsWith(period));

  // Dates du mois précédent, transposées (même jour de la semaine, même rang)
  const copyCandidates = useMemo(() => {
    const prev = shiftPeriod(period, -1);
    return giteMissions
      .filter((m) => m.date.startsWith(prev))
      .map((m) => sameWeekdayNextMonth(m.date, period))
      .filter((d): d is string => !!d && d >= minDate && !existing.has(d));
  }, [giteMissions, period, minDate, existing]);

  const toggle = (date: string) => {
    if (existing.has(date)) {
      const m = giteMissions.find((x) => x.date === date)!;
      toast(`Déjà prévu ce jour-là (${STATUS[m.status].label.toLowerCase()})`, "info");
      return;
    }
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(date)) n.delete(date);
      else {
        n.add(date);
        if (navigator.vibrate) navigator.vibrate(8);
      }
      return n;
    });
  };

  const sorted = [...selected].sort();
  const optFor = (d: string): Opts => opts[d] ?? { time: gite?.defaultTime ?? "", note: "", urgent: false, extraLinen: false };
  const setOpt = (d: string, patch: Partial<Opts>) => setOpts((o) => ({ ...o, [d]: { ...optFor(d), ...patch } }));

  const send = async () => {
    if (!gite || !sorted.length) return;
    setBusy("send");
    try {
      const entries: RequestEntry[] = sorted.map((d) => ({ date: d, ...optFor(d), time: optFor(d).time || null }));
      await ownerRequestDates(me, gite, entries);
      setDone({ count: entries.length, empty: false });
      setSelected(new Set());
      setOpts({});
    } catch (e) {
      console.error(e);
      toast("L'envoi a échoué. Vérifiez votre connexion et réessayez.", "error");
    } finally {
      setBusy(null);
    }
  };

  const none = async () => {
    if (!gite) return;
    setBusy("empty");
    try {
      await declareEmptyMonth(me, gite, period);
      setDone({ count: 0, empty: true });
    } catch {
      toast("Impossible d'enregistrer. Réessayez.", "error");
    } finally {
      setBusy(null);
    }
  };

  if (loading || (gites.length && !gite)) return <div className="grid h-64 place-items-center"><Spinner className="size-6 text-brand-500" /></div>;
  if (!gites.length)
    return (
      <div className="py-12 text-center">
        <p className="font-semibold">Ajoutez d&apos;abord votre lieu</p>
        <p className="muted mt-1 text-sm">Il faut au moins un gîte, appartement ou bureau pour encoder des dates.</p>
        <Link href="/espace/lieux/?ajouter=1" className="btn-primary btn-lg mt-6">Ajouter un lieu</Link>
      </div>
    );

  if (done) {
    const others = gites.filter((g) => g.id !== giteId);
    return (
      <div className="flex animate-in flex-col items-center py-10 text-center">
        <div className="grid size-20 animate-pop place-items-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/30">
          <Check className="size-10" strokeWidth={3} />
        </div>
        <h1 className="mt-6 font-display text-2xl font-semibold">{done.empty ? "C'est noté !" : "Merci, c'est envoyé !"}</h1>
        <p className="muted mt-2 max-w-xs">
          {done.empty
            ? `Aucun passage prévu en ${periodLabel(period)} pour ${gite!.name}. Nous ne vous relancerons pas.`
            : `${done.count} date${done.count > 1 ? "s" : ""} pour ${gite!.name}. Vous recevrez une confirmation par e-mail.`}
        </p>
        <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
          {others.map((g) => (
            <button key={g.id} className="btn-primary btn-lg" onClick={() => { setGiteId(g.id); setDone(null); }}>
              Encoder « {g.name} »
            </button>
          ))}
          <button className="btn-secondary btn-lg" onClick={() => setDone(null)}>Ajouter d&apos;autres dates</button>
          <Link href="/espace/" className="btn-ghost">Retour à l&apos;accueil</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/espace/" className="btn-ghost size-9 px-0 sm:hidden" aria-label="Retour"><ArrowLeft className="size-5" /></Link>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Encoder mes dates</h1>
          <p className="muted text-sm">Touchez les jours où un nettoyage est nécessaire.</p>
        </div>
      </div>

      {/* Choix du lieu */}
      {gites.length > 1 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {gites.map((g) => (
            <button
              key={g.id}
              onClick={() => { setGiteId(g.id); setSelected(new Set()); }}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${g.id === giteId ? "border-transparent bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "border-[var(--border)] bg-[var(--surface)]"}`}
            >
              <span className="size-2.5 rounded-full" style={{ background: g.color }} /> {g.name}
            </button>
          ))}
        </div>
      )}

      <div className="card p-3 sm:p-5">
        <MonthPicker
          period={period}
          onPeriod={setPeriod}
          selected={selected}
          onToggle={toggle}
          markers={markers}
          minDate={minDate}
          minPeriod={currentPeriod()}
          maxPeriod={shiftPeriod(currentPeriod(), 12)}
        />
        <div className="muted mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-[var(--border)] pt-3 text-xs">
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-500" />En attente</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-sky-500" />Confirmé</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500" />Effectué</span>
        </div>
      </div>

      {/* Raccourcis */}
      {selected.size === 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {copyCandidates.length > 0 && (
            <button className="card flex items-center gap-3 p-4 text-left transition active:scale-[0.99]" onClick={() => setSelected(new Set(copyCandidates))}>
              <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"><Copy className="size-5" /></span>
              <span>
                <span className="block font-semibold">Comme le mois dernier</span>
                <span className="muted block text-xs">{copyCandidates.length} date{copyCandidates.length > 1 ? "s" : ""} aux mêmes jours de la semaine</span>
              </span>
            </button>
          )}
          {monthExisting.length === 0 &&
            (sub?.empty ? (
              <div className="card flex items-center gap-3 p-4">
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"><Check className="size-5" /></span>
                <span className="flex-1">
                  <span className="block font-semibold">Aucun passage en {periodLabel(period).split(" ")[0]}</span>
                  <button className="text-xs font-medium text-brand-700 underline dark:text-brand-300" onClick={() => undoEmptyMonth(gite!.id, period)}>Annuler</button>
                </span>
              </div>
            ) : (
              <button className="card flex items-center gap-3 p-4 text-left transition active:scale-[0.99]" disabled={!!busy} onClick={none}>
                <span className="grid size-10 place-items-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-white/5 dark:text-zinc-300">{busy === "empty" ? <Spinner /> : <CalendarX2 className="size-5" />}</span>
                <span>
                  <span className="block font-semibold">Pas de nettoyage en {periodLabel(period).split(" ")[0]}</span>
                  <span className="muted block text-xs">Un toucher, et nous ne vous relançons pas</span>
                </span>
              </button>
            ))}
        </div>
      )}

      {/* Détail des dates choisies */}
      {sorted.length > 0 && (
        <section className="card animate-in divide-y divide-[var(--border)] overflow-hidden">
          <p className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="font-semibold">{sorted.length} date{sorted.length > 1 ? "s" : ""} choisie{sorted.length > 1 ? "s" : ""}</span>
            <button className="muted text-xs hover:underline" onClick={() => setSelected(new Set())}>Tout effacer</button>
          </p>
          {sorted.map((d) => {
            const o = optFor(d);
            const isOpen = expanded === d;
            return (
              <div key={d}>
                <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setExpanded(isOpen ? null : d)}>
                  <span className="flex-1">
                    <span className="block font-medium">{formatDate(d, "medium")}</span>
                    <span className="muted block text-xs">
                      {o.time ? `Vers ${o.time}` : "Horaire libre"}
                      {o.urgent ? " · Urgent" : ""}
                      {o.extraLinen ? " · Linge en plus" : ""}
                      {o.note ? " · Note" : ""}
                    </span>
                  </span>
                  {o.urgent && <Zap className="size-4 text-rose-500" />}
                  {o.extraLinen && <Shirt className="size-4 text-violet-500" />}
                  <span className="text-xs font-medium text-brand-700 dark:text-brand-300">Options</span>
                  <ChevronDown className={`size-4 text-zinc-400 transition ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="animate-in space-y-4 bg-zinc-50/70 px-4 py-4 dark:bg-white/[0.02]">
                    <div className="grid grid-cols-[8rem_1fr] gap-3">
                      <label className="block"><span className="label">Heure</span><input type="time" className="input" value={o.time} onChange={(e) => setOpt(d, { time: e.target.value })} /></label>
                      <label className="block"><span className="label">Message</span><input className="input" value={o.note} onChange={(e) => setOpt(d, { note: e.target.value })} placeholder="Ex. : 6 voyageurs, 1 lit bébé" /></label>
                    </div>
                    <Toggle checked={o.urgent} onChange={(v) => setOpt(d, { urgent: v })} label="Urgent" hint="De nouveaux voyageurs arrivent le jour même" />
                    <Toggle checked={o.extraLinen} onChange={(v) => setOpt(d, { extraLinen: v })} label="Linge supplémentaire" />
                    <button className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600" onClick={() => toggle(d)}><Trash2 className="size-3.5" /> Retirer cette date</button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {gite?.icalFeeds?.length ? (
        <p className="muted flex gap-2 text-xs"><Info className="mt-0.5 size-3.5 shrink-0" />Vos réservations {gite.icalFeeds.map((f) => f.label).join(" et ")} sont synchronisées automatiquement : inutile d&apos;encoder les départs de voyageurs.</p>
      ) : null}

      {/* Barre d'envoi */}
      {sorted.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 px-4 sm:bottom-6">
          <div className="mx-auto max-w-3xl">
            <button onClick={send} disabled={!!busy} className="btn-primary h-14 w-full animate-in rounded-2xl text-base shadow-2xl shadow-brand-900/30">
              {busy === "send" ? <Spinner className="size-5" /> : <Send className="size-5" />}
              Envoyer {sorted.length} date{sorted.length > 1 ? "s" : ""}
              <Sparkles className="size-4 opacity-70" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
