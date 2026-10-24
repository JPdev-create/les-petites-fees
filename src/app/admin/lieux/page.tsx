"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Home, MapPin, RefreshCw, AlertCircle, Building2, Phone, Mail } from "lucide-react";
import { useAdmin, missingPlanning } from "@/components/admin-data";
import { Empty, PageHeader } from "@/components/ui";
import { priceLabel } from "@/lib/pricing";
import { KIND, currentPeriod, euros, formatDate, periodLabel, shiftPeriod, todayISO } from "@/lib/format";

export default function PlacesPage() {
  const { gites, missions, submissions, profiles } = useAdmin();
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const today = todayISO();
  const next = shiftPeriod(currentPeriod(), 1);
  const missing = useMemo(() => new Set(missingPlanning(next, gites, missions, submissions).map((g) => g.id)), [next, gites, missions, submissions]);

  const list = gites
    .filter((g) => (showInactive || g.active) && (!q || `${g.name} ${g.ownerName} ${g.city ?? ""} ${g.address} ${g.ownerEmail}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => Number(!!b.pendingReview) - Number(!!a.pendingReview));
  const toReview = gites.filter((g) => g.pendingReview).length;

  return (
    <>
      <PageHeader
        title="Gîtes & lieux"
        subtitle={`${gites.filter((g) => g.active).length} lieux actifs${toReview ? ` · ${toReview} à vérifier` : ""} — encodés par vos clients`}
        actions={<Link href="/admin/lieux/fiche/" className="btn-primary"><Plus className="size-4" /> Nouveau lieu</Link>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input className="input pl-9" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="muted flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-brand-600" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Afficher les lieux désactivés
        </label>
      </div>

      {list.length === 0 ? (
        <div className="card">
          <Empty icon={Home} title="Aucun lieu" text="Ajoutez vos gîtes, appartements et bureaux pour commencer." action={<Link href="/admin/lieux/fiche/" className="btn-primary"><Plus className="size-4" /> Ajouter un lieu</Link>} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((g) => {
            const upcoming = missions.filter((m) => m.giteId === g.id && m.date >= today && (m.status === "CONFIRMED" || m.status === "REQUESTED"));
            const nextM = upcoming[0];
            return (
              <Link key={g.id} href={`/admin/lieux/fiche/?id=${g.id}`} className={`card group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${g.active ? "" : "opacity-60"}`}>
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: g.color }} />
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl text-white" style={{ background: g.color }}>
                    {g.kind === "BUREAU" ? <Building2 className="size-5" /> : <Home className="size-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display font-semibold">{g.name}</p>
                    <p className="muted truncate text-sm">{g.ownerName}</p>
                  </div>
                  <span className="badge bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300">{KIND[g.kind]}</span>
                </div>
                <p className="mt-3 flex items-start gap-1.5 text-sm"><MapPin className="muted mt-0.5 size-3.5 shrink-0" /> <span>{g.address}{g.postalCode || g.city ? `, ${g.postalCode ?? ""} ${g.city ?? ""}` : ""}</span></p>
                {(() => {
                  const o = profiles.find((p) => p.id === g.ownerEmail);
                  return (
                    <div className="muted mt-1.5 space-y-0.5 text-[13px]">
                      {o?.phone && <p className="flex items-center gap-1.5"><Phone className="size-3.5 shrink-0" /> {o.phone}</p>}
                      <p className="flex items-center gap-1.5 truncate"><Mail className="size-3.5 shrink-0" /> {g.ownerEmail}</p>
                    </div>
                  );
                })()}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-zinc-50 p-2.5 dark:bg-white/5">
                    <p className="muted">Prochain passage</p>
                    <p className="mt-0.5 font-semibold">{nextM ? formatDate(nextM.date, "medium") : "—"}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-50 p-2.5 dark:bg-white/5">
                    <p className="muted">Tarif</p>
                    <p className="mt-0.5 font-semibold">{priceLabel(g)}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {g.pendingReview && <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300"><AlertCircle className="size-3" /> Nouveau · tarif à vérifier</span>}
                  {g.active && missing.has(g.id) && <span className="badge bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300"><AlertCircle className="size-3" /> Planning {periodLabel(next).split(" ")[0]} manquant</span>}
                  {g.icalFeeds?.length > 0 && (
                    <span className={`badge ${g.icalLastError ? "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300" : "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300"}`}>
                      <RefreshCw className="size-3" /> {g.icalFeeds.map((f) => f.label).join(" + ")}
                    </span>
                  )}
                  {!g.active && <span className="badge bg-zinc-200 text-zinc-700">Désactivé</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
