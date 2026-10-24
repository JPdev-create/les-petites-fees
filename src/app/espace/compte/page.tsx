"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, Save, Home, Receipt, ChevronRight, Pencil, Plus, X, Link2 } from "lucide-react";
import { useOwner } from "@/components/owner-data";
import { logout } from "@/components/auth";
import { Field, Modal, Spinner, Toggle } from "@/components/ui";
import { toast } from "@/components/toaster";
import { ownerSaveGite, ownerSaveProfile } from "@/lib/actions";
import { INVOICE_STATUS, capitalize, euros, periodLabel } from "@/lib/format";
import type { Gite, IcalFeed } from "@/lib/types";

export default function AccountPage() {
  const { me, gites, invoices } = useOwner();
  const [p, setP] = useState({ name: me.name, phone: me.phone ?? "", billingAddress: me.billingAddress ?? "", vatNumber: me.vatNumber ?? "", company: me.company ?? "", notifyEmail: me.notifyEmail, notifySms: me.notifySms });
  const [busy, setBusy] = useState(false);
  const [editGite, setEditGite] = useState<Gite | null>(null);

  const dirty = JSON.stringify(p) !== JSON.stringify({ name: me.name, phone: me.phone ?? "", billingAddress: me.billingAddress ?? "", vatNumber: me.vatNumber ?? "", company: me.company ?? "", notifyEmail: me.notifyEmail, notifySms: me.notifySms });

  const save = async () => {
    setBusy(true);
    try {
      await ownerSaveProfile(me.id, p);
      toast("Coordonnées enregistrées");
    } catch {
      toast("Enregistrement impossible", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Mon compte</h1>
        <button className="btn-ghost text-rose-600" onClick={() => logout()}><LogOut className="size-4" /> Déconnexion</button>
      </div>

      {/* Lieux */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold"><Home className="size-4 text-brand-600" /> Mes lieux</h2>
        <div className="card divide-y divide-[var(--border)] overflow-hidden">
          {gites.map((g) => (
            <button key={g.id} onClick={() => setEditGite(g)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-zinc-50 dark:active:bg-white/5">
              <span className="size-3 rounded-full" style={{ background: g.color }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{g.name}</span>
                <span className="muted block truncate text-[13px]">{g.address}{g.city ? `, ${g.city}` : ""}</span>
              </span>
              <Pencil className="size-4 text-zinc-400" />
            </button>
          ))}
        </div>
      </section>

      {/* Factures */}
      <section id="factures">
        <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold"><Receipt className="size-4 text-brand-600" /> Mes factures</h2>
        <div className="card divide-y divide-[var(--border)] overflow-hidden">
          {invoices.length === 0 && <p className="muted px-4 py-6 text-center text-sm">Aucune facture pour l&apos;instant.</p>}
          {invoices.map((i) => (
            <Link key={i.id} href={`/espace/facture/?id=${i.id}`} className="flex items-center gap-3 px-4 py-3.5">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{capitalize(periodLabel(i.period))}</span>
                <span className="muted block text-[13px]">{i.number} · {euros(i.totalTTC)} TVAC</span>
              </span>
              <span className={`badge ${INVOICE_STATUS[i.status].tone}`}>{INVOICE_STATUS[i.status].label}</span>
              <ChevronRight className="size-4 text-zinc-400" />
            </Link>
          ))}
        </div>
      </section>

      {/* Coordonnées */}
      <section className="card space-y-4 p-5">
        <h2 className="font-display text-lg font-semibold">Mes coordonnées</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom"><input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
          <Field label="Téléphone"><input className="input" type="tel" value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></Field>
        </div>
        <Field label="E-mail de connexion" hint="Pour changer d'adresse, contactez-nous."><input className="input" disabled value={me.email} /></Field>
        <Field label="Société (facultatif)"><input className="input" value={p.company} onChange={(e) => setP({ ...p, company: e.target.value })} /></Field>
        <Field label="Adresse de facturation"><textarea className="input min-h-[70px]" value={p.billingAddress} onChange={(e) => setP({ ...p, billingAddress: e.target.value })} /></Field>
        <Field label="N° de TVA (facultatif)"><input className="input" value={p.vatNumber} onChange={(e) => setP({ ...p, vatNumber: e.target.value })} /></Field>
        <div className="space-y-3 rounded-2xl bg-zinc-50 p-4 dark:bg-white/5">
          <Toggle checked={p.notifyEmail} onChange={(v) => setP({ ...p, notifyEmail: v })} label="Confirmations et rappels par e-mail" />
          <Toggle checked={p.notifySms} onChange={(v) => setP({ ...p, notifySms: v })} label="Rappels par SMS" hint="Pour la fin de mois, si disponible" />
        </div>
        {dirty && <button className="btn-primary w-full sm:w-auto" disabled={busy} onClick={save}>{busy ? <Spinner /> : <Save className="size-4" />} Enregistrer</button>}
      </section>

      <GiteSheet gite={editGite} onClose={() => setEditGite(null)} />
    </div>
  );
}

function GiteSheet({ gite, onClose }: { gite: Gite | null; onClose: () => void }) {
  const [f, setF] = useState({ name: "", address: "", postalCode: "", city: "", accessInfo: "", notes: "", defaultTime: "", icalFeeds: [] as IcalFeed[] });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (gite) setF({ name: gite.name, address: gite.address, postalCode: gite.postalCode ?? "", city: gite.city ?? "", accessInfo: gite.accessInfo ?? "", notes: gite.notes ?? "", defaultTime: gite.defaultTime ?? "", icalFeeds: gite.icalFeeds ?? [] });
  }, [gite]);
  if (!gite) return null;

  const save = async () => {
    setBusy(true);
    try {
      await ownerSaveGite(gite.id, { ...f, icalFeeds: f.icalFeeds.filter((x) => x.url.trim()) });
      toast("Fiche mise à jour");
      onClose();
    } catch {
      toast("Enregistrement impossible", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={gite.name} footer={<button className="btn-primary w-full sm:w-auto" disabled={busy} onClick={save}>{busy ? <Spinner /> : <Save className="size-4" />} Enregistrer</button>}>
      <div className="space-y-4">
        <Field label="Nom du lieu"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Adresse"><input className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
        <div className="grid grid-cols-[7rem_1fr] gap-3">
          <Field label="Code postal"><input className="input" value={f.postalCode} onChange={(e) => setF({ ...f, postalCode: e.target.value })} /></Field>
          <Field label="Localité"><input className="input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
        </div>
        <Field label="Accès (boîte à clés, alarme, parking…)"><textarea className="input" value={f.accessInfo} onChange={(e) => setF({ ...f, accessInfo: e.target.value })} /></Field>
        <Field label="Spécificités"><textarea className="input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Animaux, linge fourni, consignes particulières…" /></Field>
        <Field label="Heure de passage habituelle"><input type="time" className="input" value={f.defaultTime} onChange={(e) => setF({ ...f, defaultTime: e.target.value })} /></Field>
        <div>
          <span className="label">Calendriers Airbnb / Booking (facultatif)</span>
          <p className="hint mb-2 !mt-0">Collez le lien d&apos;export iCal de votre annonce : chaque départ de voyageurs créera automatiquement un nettoyage.</p>
          <div className="space-y-2">
            {f.icalFeeds.map((x, i) => (
              <div key={i} className="flex gap-2">
                <select className="input w-28 shrink-0" value={x.label} onChange={(e) => setF({ ...f, icalFeeds: f.icalFeeds.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)) })}>
                  {["Airbnb", "Booking", "Abritel", "Autre"].map((o) => <option key={o}>{o}</option>)}
                </select>
                <div className="relative flex-1">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <input className="input pl-9" type="url" placeholder="https://…ics" value={x.url} onChange={(e) => setF({ ...f, icalFeeds: f.icalFeeds.map((y, j) => (j === i ? { ...y, url: e.target.value } : y)) })} />
                </div>
                <button className="btn-ghost size-11 px-0" onClick={() => setF({ ...f, icalFeeds: f.icalFeeds.filter((_, j) => j !== i) })} aria-label="Retirer"><X className="size-4" /></button>
              </div>
            ))}
            <button className="btn-secondary btn-sm" onClick={() => setF({ ...f, icalFeeds: [...f.icalFeeds, { label: "Airbnb", url: "" }] })}><Plus className="size-3.5" /> Ajouter un calendrier</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
