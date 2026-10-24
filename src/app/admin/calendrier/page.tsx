"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Filter, Printer } from "lucide-react";
import { useAdmin } from "@/components/admin-data";
import { MissionDialog, MissionLine, NewMissionDialog } from "@/components/mission-admin";
import { Empty, PageHeader, Segmented, StatusBadge } from "@/components/ui";
import {
  DAYS_LONG, DAYS_SHORT, STATUS, addDays, capitalize, formatDate, monthGrid, periodLabel, periodOf, shiftPeriod, startOfWeek, todayISO, parseISODate, MONTHS, MONTHS_SHORT,
} from "@/lib/format";
import type { Mission } from "@/lib/types";
import { CalendarDays } from "lucide-react";

type View = "month" | "week" | "list";

export default function CalendarPage() {
  const { missions, gites, owners } = useAdmin();
  const today = todayISO();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(today);
  const [selectedDay, setSelectedDay] = useState(today);
  const [giteFilter, setGiteFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);
  const [open, setOpen] = useState<Mission | null>(null);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem("cal-view") as View | null;
      if (v) setView(v);
      else if (window.innerWidth < 640) setView("month");
    } catch {}
  }, []);
  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem("cal-view", v);
    } catch {}
  };

  const filtered = useMemo(
    () =>
      missions.filter(
        (m) =>
          (!giteFilter || m.giteId === giteFilter) &&
          (!ownerFilter || m.ownerEmail === ownerFilter) &&
          (showCancelled || (m.status !== "CANCELLED" && m.status !== "REFUSED")),
      ),
    [missions, giteFilter, ownerFilter, showCancelled],
  );
  const byDate = useMemo(() => {
    const map = new Map<string, Mission[]>();
    for (const m of filtered) map.set(m.date, [...(map.get(m.date) ?? []), m]);
    for (const list of map.values()) list.sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));
    return map;
  }, [filtered]);

  const period = periodOf(cursor);
  const weekStart = startOfWeek(cursor);
  const move = (n: number) => {
    if (view === "month") setCursor(`${shiftPeriod(period, n)}-01`);
    else if (view === "week") setCursor(addDays(cursor, 7 * n));
    else setCursor(`${shiftPeriod(period, n)}-01`);
  };
  const title =
    view === "week"
      ? (() => {
          const end = addDays(weekStart, 6);
          const a = parseISODate(weekStart), b = parseISODate(end);
          return a.getMonth() === b.getMonth() ? `${a.getDate()} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}` : `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]} ${b.getFullYear()}`;
        })()
      : capitalize(periodLabel(period));

  const monthCount = filtered.filter((m) => m.date.startsWith(period)).length;

  return (
    <>
      <PageHeader
        title="Calendrier"
        subtitle={`${monthCount} passage(s) en ${periodLabel(period)}`}
        actions={
          <>
            <button className="btn-secondary no-print hidden sm:inline-flex" onClick={() => window.print()}><Printer className="size-4" /> Imprimer</button>
            <button className="btn-primary" onClick={() => setAdding(selectedDay >= today ? selectedDay : today)}><Plus className="size-4" /> Ajouter</button>
          </>
        }
      />

      <div className="card mb-4 flex flex-wrap items-center gap-2 p-2.5">
        <div className="flex items-center gap-1">
          <button className="btn-ghost size-9 px-0" onClick={() => move(-1)} aria-label="Précédent"><ChevronLeft className="size-5" /></button>
          <button className="btn-ghost size-9 px-0" onClick={() => move(1)} aria-label="Suivant"><ChevronRight className="size-5" /></button>
          <button className="btn-secondary btn-sm" onClick={() => { setCursor(today); setSelectedDay(today); }}>Aujourd&apos;hui</button>
          <p className="ml-2 font-display text-lg font-semibold">{title}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
            <select className="input h-9 w-44 pl-8 text-sm" value={giteFilter} onChange={(e) => setGiteFilter(e.target.value)}>
              <option value="">Tous les lieux</option>
              {gites.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <select className="input hidden h-9 w-44 text-sm md:block" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
            <option value="">Tous les clients</option>
            {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <label className="muted hidden items-center gap-1.5 text-xs md:flex">
            <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} className="accent-brand-600" /> Annulés/refusés
          </label>
          <Segmented<View> value={view} onChange={changeView} options={[{ value: "month", label: "Mois" }, { value: "week", label: "Semaine" }, { value: "list", label: "Liste" }]} />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-xs">
        {(["REQUESTED", "CONFIRMED", "DONE"] as const).map((s) => (
          <span key={s} className="muted inline-flex items-center gap-1.5"><span className={`size-2 rounded-full ${STATUS[s].dot}`} />{STATUS[s].label}</span>
        ))}
      </div>

      {view === "month" && (
        <div className="grid gap-4 lg:grid-cols-1">
          <div className="card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-[var(--border)] text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              {DAYS_SHORT.map((d) => <div key={d} className="py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {monthGrid(period).flat().map((date, i) => {
                if (!date) return <div key={`x${i}`} className="min-h-16 border-b border-r border-[var(--border)] bg-zinc-50/50 sm:min-h-28 dark:bg-white/[0.01]" />;
                const list = byDate.get(date) ?? [];
                const isToday = date === today;
                const isSel = date === selectedDay;
                return (
                  <div
                    key={date}
                    onClick={() => setSelectedDay(date)}
                    onDoubleClick={() => setAdding(date)}
                    className={`group min-h-16 cursor-pointer border-b border-r border-[var(--border)] p-1 transition sm:min-h-28 sm:p-1.5 ${isSel ? "bg-brand-50/70 dark:bg-brand-500/10" : "hover:bg-zinc-50 dark:hover:bg-white/[0.02]"} ${date < today ? "opacity-70" : ""}`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className={`grid size-6 place-items-center rounded-full text-xs font-semibold ${isToday ? "bg-brand-600 text-white" : ""}`}>{Number(date.slice(8))}</span>
                      <button onClick={(e) => { e.stopPropagation(); setAdding(date); }} className="hidden size-5 place-items-center rounded text-zinc-400 hover:bg-zinc-200 group-hover:grid dark:hover:bg-white/10" aria-label="Ajouter">
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    {/* Mobile : pastilles */}
                    <div className="flex flex-wrap gap-0.5 sm:hidden">
                      {list.slice(0, 6).map((m) => <span key={m.id} className={`size-2 rounded-full ${m.status === "REQUESTED" ? "ring-2 ring-amber-400" : ""}`} style={{ background: m.giteColor }} />)}
                    </div>
                    {/* PC : étiquettes */}
                    <div className="hidden space-y-0.5 sm:block">
                      {list.slice(0, 3).map((m) => (
                        <button
                          key={m.id}
                          onClick={(e) => { e.stopPropagation(); setOpen(m); }}
                          className={`flex w-full items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium ${m.status === "REQUESTED" ? "border border-dashed border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-400/10 dark:text-amber-200" : m.status === "DONE" ? "bg-emerald-50 text-emerald-900 line-through decoration-emerald-400/60 dark:bg-emerald-400/10 dark:text-emerald-200" : m.status === "CONFIRMED" ? "text-white" : "bg-zinc-100 text-zinc-500 line-through dark:bg-white/5"}`}
                          style={m.status === "CONFIRMED" ? { background: m.giteColor } : undefined}
                          title={`${m.giteName} · ${STATUS[m.status].label}`}
                        >
                          {m.time && <span className="opacity-80">{m.time}</span>} <span className="truncate">{m.giteName}</span>
                        </button>
                      ))}
                      {list.length > 3 && <p className="px-1 text-[11px] font-medium text-zinc-500">+ {list.length - 3} autre(s)</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Détail du jour sélectionné */}
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 pb-2 pt-4">
              <h2 className="font-display font-semibold">{capitalize(formatDate(selectedDay))}</h2>
              <button className="btn-ghost btn-sm" onClick={() => setAdding(selectedDay)}><Plus className="size-3.5" /> Ajouter</button>
            </div>
            {(byDate.get(selectedDay) ?? []).length === 0 ? (
              <p className="muted px-4 pb-5 text-sm">Aucun passage ce jour-là.</p>
            ) : (
              <div className="divide-y divide-[var(--border)]">{(byDate.get(selectedDay) ?? []).map((m) => <MissionLine key={m.id} m={m} onClick={() => setOpen(m)} />)}</div>
            )}
          </section>
        </div>
      )}

      {view === "week" && (
        <div className="grid gap-3 md:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((date, i) => {
            const list = byDate.get(date) ?? [];
            const isToday = date === today;
            return (
              <div key={date} className={`card flex min-h-40 flex-col p-2 ${isToday ? "ring-2 ring-brand-400" : ""}`}>
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-sm font-semibold">{capitalize(DAYS_LONG[i])} <span className="muted font-normal">{Number(date.slice(8))}</span></p>
                  <button onClick={() => setAdding(date)} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10" aria-label="Ajouter"><Plus className="size-3.5" /></button>
                </div>
                <div className="space-y-1.5">
                  {list.map((m) => (
                    <button key={m.id} onClick={() => setOpen(m)} className="w-full rounded-xl border border-[var(--border)] p-2 text-left text-xs transition hover:shadow-md" style={{ borderLeft: `4px solid ${m.giteColor}` }}>
                      <p className="truncate font-semibold">{m.giteName}</p>
                      <p className="muted">{m.time || "—"} · {m.ownerName.split(" ")[0]}</p>
                      <div className="mt-1"><StatusBadge status={m.status} /></div>
                    </button>
                  ))}
                  {list.length === 0 && <p className="px-1 text-xs text-zinc-400">—</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "list" && (
        <div className="card overflow-hidden">
          {(() => {
            const dates = [...byDate.keys()].filter((d) => d.startsWith(period)).sort();
            if (!dates.length) return <Empty icon={CalendarDays} title="Aucun passage ce mois-ci" />;
            return dates.map((date) => (
              <div key={date}>
                <p className={`sticky top-14 z-10 border-b border-[var(--border)] bg-zinc-50/95 px-4 py-2 text-xs font-semibold uppercase tracking-wide backdrop-blur lg:top-0 dark:bg-[#0f1a1d]/95 ${date === today ? "text-brand-700 dark:text-brand-300" : "text-zinc-500"}`}>
                  {formatDate(date)} · {byDate.get(date)!.length}
                </p>
                <div className="divide-y divide-[var(--border)]">{byDate.get(date)!.map((m) => <MissionLine key={m.id} m={m} onClick={() => setOpen(m)} />)}</div>
              </div>
            ));
          })()}
        </div>
      )}

      <MissionDialog mission={open} onClose={() => setOpen(null)} />
      <NewMissionDialog open={!!adding} onClose={() => setAdding(null)} defaultDate={adding ?? undefined} defaultGiteId={giteFilter || undefined} />
    </>
  );
}
