"use client";

import { useMemo, useState } from "react";
import { Plus, Repeat, Search } from "lucide-react";
import { useAdmin } from "@/components/admin-data";
import { RecurrenceDialog } from "@/components/recurrence-admin";
import { Empty, PageHeader } from "@/components/ui";
import { addDays, formatDate, todayISO } from "@/lib/format";
import { describeOccurrence, occurrences, recurrenceLabel } from "@/lib/recurrence";
import type { Recurrence } from "@/lib/types";

const GROUPS = [
  { key: "W1", title: "Chaque semaine", match: (r: Recurrence) => r.freq === "WEEKLY" && r.interval === 1 },
  { key: "W2", title: "Tous les 15 jours", match: (r: Recurrence) => r.freq === "WEEKLY" && r.interval !== 1 },
  { key: "M", title: "Chaque mois", match: (r: Recurrence) => r.freq === "MONTHLY" },
];

export default function RecurrencesPage() {
  const { recurrences, giteById } = useAdmin();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Recurrence | null>(null);
  const [adding, setAdding] = useState(false);
  const today = todayISO();

  const list = useMemo(
    () =>
      recurrences
        .map((r) => ({ r, g: giteById.get(r.giteId) }))
        .filter(({ g }) => !!g && (!q || g.name.toLowerCase().includes(q.toLowerCase())))
        .sort((a, b) => a.g!.name.localeCompare(b.g!.name, "fr")),
    [recurrences, giteById, q],
  );

  return (
    <>
      <PageHeader
        title="Passages réguliers"
        subtitle="Encodés une seule fois : les passages sont ajoutés automatiquement au calendrier, toujours 4 mois à l'avance."
        actions={<button className="btn-primary" onClick={() => setAdding(true)}><Plus className="size-4" /> Nouveau</button>}
      />
      <div className="relative mb-4 w-full sm:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <input className="input pl-9" placeholder="Rechercher un lieu…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {list.length === 0 ? (
        <div className="card">
          <Empty icon={Repeat} title="Aucun passage régulier" text="Ajoutez les chantiers qui reviennent chaque semaine, tous les 15 jours ou chaque mois." action={<button className="btn-primary" onClick={() => setAdding(true)}><Plus className="size-4" /> Ajouter</button>} />
        </div>
      ) : (
        <div className="space-y-6">
          {GROUPS.map((grp) => {
            const items = list.filter(({ r }) => grp.match(r));
            if (!items.length) return null;
            return (
              <section key={grp.key} className="card overflow-hidden">
                <h2 className="px-4 pb-2 pt-4 font-display font-semibold">{grp.title} <span className="muted text-sm font-normal">· {items.length}</span></h2>
                <div className="divide-y divide-[var(--border)]">
                  {items.map(({ r, g }) => {
                    const next = r.active ? occurrences(r, today, addDays(today, 400)).slice(0, 3) : [];
                    return (
                      <button key={r.id} onClick={() => setOpen(r)} className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-white/[0.03] ${r.active ? "" : "opacity-60"}`}>
                        <span className="h-10 w-1 shrink-0 rounded-full" style={{ background: g!.color }} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <p className="truncate font-semibold">{g!.name}</p>
                            {(r.variants ?? []).length > 0 && <span className="badge bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300">Alternance : {r.variants!.join(" / ")}</span>}
                            {!r.active && <span className="badge bg-zinc-200 text-zinc-700">En pause</span>}
                            {r.endDate && <span className="badge bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300">Jusqu&apos;au {formatDate(r.endDate, "short")}</span>}
                          </div>
                          <p className="muted truncate text-[13px]">{recurrenceLabel(r)}{r.time ? ` · ${r.time}` : ""}</p>
                          {next.length > 0 && <p className="truncate text-xs text-zinc-500">Prochains : {next.map(describeOccurrence).join(" · ")}</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <RecurrenceDialog open={adding || !!open} recurrence={open} onClose={() => { setOpen(null); setAdding(false); }} />
    </>
  );
}
