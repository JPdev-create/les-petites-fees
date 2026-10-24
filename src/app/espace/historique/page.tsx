"use client";

import { useMemo, useState } from "react";
import { History } from "lucide-react";
import { useOwner } from "@/components/owner-data";
import { OwnerMissionSheet } from "@/components/owner-mission";
import { Empty, Segmented, StatusBadge } from "@/components/ui";
import { capitalize, formatDate, periodLabel, relativeDay, todayISO } from "@/lib/format";
import type { Mission } from "@/lib/types";

export default function HistoryPage() {
  const { missions, gites } = useOwner();
  const [tab, setTab] = useState<"next" | "past">("next");
  const [giteId, setGiteId] = useState("");
  const [open, setOpen] = useState<Mission | null>(null);
  const today = todayISO();

  const groups = useMemo(() => {
    const list = missions
      .filter((m) => (!giteId || m.giteId === giteId) && (tab === "next" ? m.date >= today && m.status !== "DONE" : m.date < today || m.status === "DONE"))
      .sort((a, b) => (tab === "next" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)));
    const map = new Map<string, Mission[]>();
    for (const m of list) map.set(m.date.slice(0, 7), [...(map.get(m.date.slice(0, 7)) ?? []), m]);
    return [...map.entries()];
  }, [missions, giteId, tab, today]);

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Mes passages</h1>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented value={tab} onChange={setTab} options={[{ value: "next", label: "À venir" }, { value: "past", label: "Passés" }]} />
        {gites.length > 1 && (
          <select className="input h-10 w-auto" value={giteId} onChange={(e) => setGiteId(e.target.value)}>
            <option value="">Tous mes lieux</option>
            {gites.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="card"><Empty icon={History} title={tab === "next" ? "Aucun passage à venir" : "Aucun passage passé"} /></div>
      ) : (
        groups.map(([period, list]) => (
          <section key={period}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{capitalize(periodLabel(period))} · {list.length}</h2>
            <div className="card divide-y divide-[var(--border)] overflow-hidden">
              {list.map((m) => (
                <button key={m.id} onClick={() => setOpen(m)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-zinc-50 dark:active:bg-white/5">
                  <span className="h-9 w-1 rounded-full" style={{ background: m.giteColor }} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{capitalize(formatDate(m.date, "medium"))}{relativeDay(m.date) ? <span className="muted font-normal"> · {relativeDay(m.date)}</span> : null}</p>
                    <p className="muted truncate text-[13px]">{gites.length > 1 ? `${m.giteName} · ` : ""}{m.time ?? "Horaire à convenir"}{m.source === "ICAL" ? ` · ${m.icalSource ?? "iCal"}` : ""}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </button>
              ))}
            </div>
          </section>
        ))
      )}
      <OwnerMissionSheet mission={open} onClose={() => setOpen(null)} />
    </div>
  );
}
