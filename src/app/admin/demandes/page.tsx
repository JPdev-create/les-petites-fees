"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CheckCheck, X, Search, Inbox, Sparkles } from "lucide-react";
import { useAdmin } from "@/components/admin-data";
import { MissionDialog, MissionLine } from "@/components/mission-admin";
import { Empty, PageHeader, Segmented, Spinner } from "@/components/ui";
import { toast } from "@/components/toaster";
import { completeMissions, setMissionsStatus } from "@/lib/actions";
import { useParam } from "@/lib/hooks";
import { todayISO } from "@/lib/format";
import type { Mission } from "@/lib/types";

type Tab = "pending" | "past" | "upcoming" | "history";

export default function RequestsPage() {
  const { missions, me, giteById } = useAdmin();
  const vue = useParam("vue");
  const [tab, setTab] = useState<Tab>("pending");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Mission | null>(null);
  const [busy, setBusy] = useState(false);
  const today = todayISO();

  useEffect(() => {
    if (vue === "passes") setTab("past");
  }, [vue]);
  useEffect(() => setSel(new Set()), [tab]);

  const lists = useMemo(() => {
    const match = (m: Mission) => !q || `${m.giteName} ${m.ownerName} ${m.ownerNote ?? ""}`.toLowerCase().includes(q.toLowerCase());
    const f = missions.filter(match);
    return {
      pending: f.filter((m) => m.status === "REQUESTED").sort((a, b) => a.date.localeCompare(b.date)),
      past: f.filter((m) => m.status === "CONFIRMED" && m.date < today).sort((a, b) => a.date.localeCompare(b.date)),
      upcoming: f.filter((m) => m.status === "CONFIRMED" && m.date >= today).sort((a, b) => a.date.localeCompare(b.date)),
      history: f.filter((m) => m.status === "DONE" || m.status === "REFUSED" || m.status === "CANCELLED").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 200),
    };
  }, [missions, q, today]);

  const list = lists[tab];
  const allSelected = list.length > 0 && list.every((m) => sel.has(m.id));
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const bulk = async (status: "CONFIRMED" | "REFUSED" | "DONE") => {
    const ids = [...sel];
    if (!ids.length) return;
    if (status === "REFUSED" && !confirm(`Refuser ${ids.length} demande(s) ? Les clients seront prévenus.`)) return;
    setBusy(true);
    try {
      if (status === "DONE") await completeMissions(missions.filter((m) => sel.has(m.id)).map((m) => ({ m })), giteById, me.name);
      else await setMissionsStatus(ids, status, me.name);
      toast(`${ids.length} passage(s) ${status === "CONFIRMED" ? "confirmé(s)" : status === "DONE" ? "marqué(s) effectué(s)" : "refusé(s)"}`);
      setSel(new Set());
    } catch {
      toast("Action impossible", "error");
    } finally {
      setBusy(false);
    }
  };

  // Regroupement par client pour traiter vite
  const groups = useMemo(() => {
    const map = new Map<string, Mission[]>();
    for (const m of list) map.set(m.ownerName, [...(map.get(m.ownerName) ?? []), m]);
    return [...map.entries()];
  }, [list]);

  return (
    <>
      <PageHeader title="Demandes & passages" subtitle="Validez, refusez ou clôturez en quelques touches." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: "pending", label: <>En attente <Count n={lists.pending.length} tone="amber" /></> },
            { value: "past", label: <>À clôturer <Count n={lists.past.length} tone="rose" /></> },
            { value: "upcoming", label: "À venir" },
            { value: "history", label: "Historique" },
          ]}
        />
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input className="input h-10 pl-9" placeholder="Rechercher un lieu, un client…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {tab === "past" && list.length > 0 && (
        <p className="muted mb-3 text-sm">Ces passages confirmés sont passés : marquez-les comme effectués pour pouvoir les facturer.</p>
      )}

      <div className="card overflow-hidden">
        {list.length === 0 ? (
          <Empty icon={tab === "pending" ? Sparkles : Inbox} title={tab === "pending" ? "Aucune demande en attente" : "Rien à afficher"} text={tab === "pending" ? "Tout est traité. Les nouvelles demandes arrivent ici en temps réel." : undefined} />
        ) : (
          <>
            {tab !== "history" && (
              <label className="flex cursor-pointer items-center gap-3 border-b border-[var(--border)] bg-zinc-50/60 px-4 py-2.5 text-sm dark:bg-white/[0.02]">
                <input type="checkbox" className="size-4 accent-brand-600" checked={allSelected} onChange={() => setSel(allSelected ? new Set() : new Set(list.map((m) => m.id)))} />
                <span className="muted">{sel.size ? `${sel.size} sélectionné(s)` : "Tout sélectionner"}</span>
              </label>
            )}
            {groups.map(([owner, items]) => (
              <div key={owner}>
                <p className="border-b border-[var(--border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{owner} · {items.length}</p>
                <div className="divide-y divide-[var(--border)]">
                  {items.map((m) => (
                    <div key={m.id} className="flex items-center">
                      {tab !== "history" && (
                        <input type="checkbox" className="ml-4 size-4 shrink-0 accent-brand-600" checked={sel.has(m.id)} onChange={() => toggle(m.id)} aria-label="Sélectionner" />
                      )}
                      <div className="min-w-0 flex-1">
                        <MissionLine m={m} showOwner={false} onClick={() => setOpen(m)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Barre d'actions groupées */}
      {sel.size > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 lg:bottom-6 lg:pl-64">
          <div className="flex animate-in items-center gap-2 rounded-2xl bg-zinc-900 p-2 pl-4 text-white shadow-2xl dark:bg-zinc-800">
            <span className="mr-2 text-sm font-medium">{sel.size} sélectionné(s)</span>
            {tab === "pending" && (
              <>
                <button className="btn btn-sm bg-white/10 hover:bg-white/20" disabled={busy} onClick={() => bulk("REFUSED")}><X className="size-3.5" /> Refuser</button>
                <button className="btn btn-sm bg-brand-500 hover:bg-brand-400" disabled={busy} onClick={() => bulk("CONFIRMED")}>{busy ? <Spinner className="size-3.5" /> : <Check className="size-3.5" />} Confirmer</button>
              </>
            )}
            {(tab === "past" || tab === "upcoming") && (
              <button className="btn btn-sm bg-emerald-500 hover:bg-emerald-400" disabled={busy} onClick={() => bulk("DONE")}>{busy ? <Spinner className="size-3.5" /> : <CheckCheck className="size-3.5" />} Marquer effectués</button>
            )}
          </div>
        </div>
      )}

      <MissionDialog mission={open} onClose={() => setOpen(null)} />
    </>
  );
}

function Count({ n, tone }: { n: number; tone: "amber" | "rose" }) {
  if (!n) return null;
  return <span className={`ml-1 rounded-full px-1.5 text-[11px] font-bold text-white ${tone === "amber" ? "bg-amber-500" : "bg-rose-500"}`}>{n}</span>;
}
