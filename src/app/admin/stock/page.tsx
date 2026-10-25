"use client";

import { useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, orderBy, query, updateDoc } from "firebase/firestore";
import { Package, Plus, Minus, Shirt, AlertTriangle, Trash2, SprayCan } from "lucide-react";
import { useAdmin } from "@/components/admin-data";
import { Empty, Field, Modal, PageHeader, Segmented } from "@/components/ui";
import { toast } from "@/components/toaster";
import { askConfirm } from "@/components/confirm";
import { useLive } from "@/lib/hooks";
import { fb } from "@/lib/firebase";
import { addDays, formatDate, startOfWeek, todayISO } from "@/lib/format";
import type { StockItem } from "@/lib/types";

export default function StockPage() {
  const { missions, gites } = useAdmin();
  const items = useLive<StockItem>((db) => query(collection(db, "stock"), orderBy("name")), []);
  const [cat, setCat] = useState<"ALL" | "LINGE" | "PRODUIT">("ALL");
  const [edit, setEdit] = useState<Partial<StockItem> | null>(null);
  const today = todayISO();

  // Prévision linge sur 4 semaines
  const weeks = useMemo(() => {
    const start = startOfWeek(today);
    return Array.from({ length: 4 }, (_, w) => {
      const from = addDays(start, w * 7), to = addDays(from, 6);
      const list = missions.filter((m) => m.date >= from && m.date <= to && (m.status === "CONFIRMED" || m.status === "REQUESTED"));
      let beds = 0, towels = 0;
      for (const m of list) {
        const g = gites.find((x) => x.id === m.giteId);
        const k = m.extraLinen ? 2 : 1;
        beds += (g?.bedSets ?? 0) * k;
        towels += (g?.towelSets ?? 0) * k;
      }
      return { from, to, count: list.length, beds, towels };
    });
  }, [missions, gites, today]);
  const max = Math.max(1, ...weeks.map((w) => w.beds + w.towels));

  // Passages par jour sur les 30 derniers jours → estimation de la consommation
  const perDay = useMemo(() => missions.filter((m) => m.status === "DONE" && m.date >= addDays(today, -30)).length / 30 || 0.5, [missions, today]);

  const list = items.data.filter((i) => cat === "ALL" || i.category === cat);
  const low = items.data.filter((i) => i.quantity <= i.threshold);

  const adjust = (i: StockItem, delta: number) => updateDoc(doc(fb().db, "stock", i.id), { quantity: Math.max(0, i.quantity + delta), updatedAt: new Date().toISOString() });

  const save = async () => {
    if (!edit?.name) return;
    const data = { name: edit.name, category: edit.category ?? "PRODUIT", unit: edit.unit || "pièce", quantity: Number(edit.quantity) || 0, threshold: Number(edit.threshold) || 0, perVisit: Number(edit.perVisit) || 0, updatedAt: new Date().toISOString() };
    if (edit.id) await updateDoc(doc(fb().db, "stock", edit.id), data);
    else await addDoc(collection(fb().db, "stock"), data);
    toast("Article enregistré");
    setEdit(null);
  };

  return (
    <>
      <PageHeader title="Linge & stock" subtitle="Anticipez la blanchisserie et ne tombez jamais à court de produits." actions={<button className="btn-primary" onClick={() => setEdit({ category: "PRODUIT", unit: "pièce", quantity: 0, threshold: 5, perVisit: 0 })}><Plus className="size-4" /> Nouvel article</button>} />

      <section className="card mb-6 p-5">
        <h2 className="mb-4 flex items-center gap-2 font-display font-semibold"><Shirt className="size-4 text-violet-500" /> Linge à prévoir — 4 prochaines semaines</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          {weeks.map((w, i) => (
            <div key={w.from} className="rounded-2xl bg-zinc-50 p-4 dark:bg-white/5">
              <p className="muted text-xs font-medium">{i === 0 ? "Cette semaine" : `Sem. du ${formatDate(w.from, "short")}`}</p>
              <p className="mt-1 font-display text-2xl font-semibold">{w.count} <span className="muted text-sm font-normal">passages</span></p>
              <div className="mt-3 flex h-20 items-end gap-2">
                <div className="flex flex-1 flex-col items-center gap-1"><div className="w-full rounded-t-lg bg-violet-400" style={{ height: `${(w.beds / max) * 100}%`, minHeight: 4 }} /><span className="text-xs font-semibold">{w.beds}</span></div>
                <div className="flex flex-1 flex-col items-center gap-1"><div className="w-full rounded-t-lg bg-sky-400" style={{ height: `${(w.towels / max) * 100}%`, minHeight: 4 }} /><span className="text-xs font-semibold">{w.towels}</span></div>
              </div>
              <div className="muted mt-1 flex justify-around text-[10px]"><span>parures</span><span>serviettes</span></div>
            </div>
          ))}
        </div>
      </section>

      {low.length > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/5 dark:text-amber-200">
          <AlertTriangle className="size-5 shrink-0" />
          <p><strong>À recommander :</strong> {low.map((i) => i.name).join(", ")}</p>
        </div>
      )}

      <div className="mb-3"><Segmented value={cat} onChange={setCat} options={[{ value: "ALL", label: "Tout" }, { value: "LINGE", label: "Linge" }, { value: "PRODUIT", label: "Produits" }]} /></div>
      <div className="card overflow-hidden">
        {list.length === 0 ? (
          <Empty icon={Package} title="Aucun article" text="Ajoutez vos produits d'entretien et votre linge pour suivre les quantités." />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {list.map((i) => {
              const isLow = i.quantity <= i.threshold;
              const days = i.perVisit > 0 ? Math.floor(i.quantity / (i.perVisit * perDay)) : null;
              return (
                <div key={i.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${i.category === "LINGE" ? "bg-violet-50 text-violet-600 dark:bg-violet-400/10" : "bg-sky-50 text-sky-600 dark:bg-sky-400/10"}`}>
                    {i.category === "LINGE" ? <Shirt className="size-5" /> : <SprayCan className="size-5" />}
                  </span>
                  <button className="min-w-0 flex-1 text-left" onClick={() => setEdit(i)}>
                    <p className="truncate font-semibold">{i.name}</p>
                    <p className={`text-xs ${isLow ? "font-medium text-amber-700 dark:text-amber-300" : "muted"}`}>
                      {isLow ? "Stock bas · " : ""}seuil {i.threshold} {i.unit}{days !== null ? ` · ≈ ${days} jour(s) restant(s)` : ""}
                    </p>
                  </button>
                  <div className="flex items-center gap-1">
                    <button className="btn-secondary size-9 px-0" onClick={() => adjust(i, -1)} aria-label="Retirer 1"><Minus className="size-4" /></button>
                    <span className={`w-14 text-center font-display text-lg font-semibold ${isLow ? "text-amber-600" : ""}`}>{i.quantity}</span>
                    <button className="btn-secondary size-9 px-0" onClick={() => adjust(i, 1)} aria-label="Ajouter 1"><Plus className="size-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? edit.name : "Nouvel article"}
        footer={
          <>
            {edit?.id && <button className="btn-ghost mr-auto text-rose-600" onClick={async () => { if (await askConfirm({ title: `Supprimer « ${edit.name} » ?`, confirmLabel: "Supprimer", danger: true })) { await deleteDoc(doc(fb().db, "stock", edit.id!)); toast("Article supprimé"); setEdit(null); } }}><Trash2 className="size-4" /> Supprimer</button>}
            <button className="btn-ghost" onClick={() => setEdit(null)}>Annuler</button>
            <button className="btn-primary" onClick={save}>Enregistrer</button>
          </>
        }
      >
        {edit && (
          <div className="space-y-4">
            <Field label="Nom"><input className="input" autoFocus value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Produit vitres, parure 2 personnes…" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Catégorie"><select className="input" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value as StockItem["category"] })}><option value="PRODUIT">Produit</option><option value="LINGE">Linge</option></select></Field>
              <Field label="Unité"><input className="input" value={edit.unit ?? ""} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} placeholder="flacon, pièce…" /></Field>
              <Field label="Quantité"><input type="number" min={0} className="input" value={edit.quantity ?? 0} onChange={(e) => setEdit({ ...edit, quantity: +e.target.value })} /></Field>
              <Field label="Seuil d'alerte"><input type="number" min={0} className="input" value={edit.threshold ?? 0} onChange={(e) => setEdit({ ...edit, threshold: +e.target.value })} /></Field>
            </div>
            <Field label="Consommation par passage" hint="Facultatif : permet d'estimer le nombre de jours avant rupture."><input type="number" min={0} step="0.1" className="input" value={edit.perVisit ?? 0} onChange={(e) => setEdit({ ...edit, perVisit: +e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </>
  );
}
