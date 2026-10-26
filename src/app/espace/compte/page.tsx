"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Save, ShieldCheck, Download, Trash2 } from "lucide-react";
import { useOwner } from "@/components/owner-data";
import { logout } from "@/components/auth";
import { Field, Spinner, Toggle } from "@/components/ui";
import { toast } from "@/components/toaster";
import { ownerSaveProfile } from "@/lib/actions";

export default function AccountPage() {
  const { me, gites, missions, settings } = useOwner();

  // Portabilité (art. 20 RGPD) : export de toutes les données du client
  const exportData = () => {
    const data = { exportéLe: new Date().toISOString(), profil: me, lieux: gites, passages: missions };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = `mes-donnees-les-petites-fees-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };
  const [p, setP] = useState({ name: me.name, phone: me.phone ?? "", billingAddress: me.billingAddress ?? "", vatNumber: me.vatNumber ?? "", company: me.company ?? "", notifyEmail: me.notifyEmail, notifySms: me.notifySms });
  const [busy, setBusy] = useState(false);

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

      {/* Coordonnées */}
      <section className="card space-y-4 p-5">
        <h2 className="font-display text-lg font-semibold">Mes coordonnées</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom"><input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
          <Field label="Téléphone"><input className="input" type="tel" value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></Field>
        </div>
        <Field label="E-mail de connexion" hint="Pour changer d'adresse, contactez-nous."><input className="input" disabled value={me.email} /></Field>
        <Field label="Société (facultatif)"><input className="input" value={p.company} onChange={(e) => setP({ ...p, company: e.target.value })} /></Field>
        <Field label="Adresse postale"><textarea className="input min-h-[70px]" value={p.billingAddress} onChange={(e) => setP({ ...p, billingAddress: e.target.value })} /></Field>
        <Field label="N° de TVA (facultatif)"><input className="input" value={p.vatNumber} onChange={(e) => setP({ ...p, vatNumber: e.target.value })} /></Field>
        <div className="space-y-3 rounded-2xl bg-zinc-50 p-4 dark:bg-white/5">
          <Toggle checked={p.notifyEmail} onChange={(v) => setP({ ...p, notifyEmail: v })} label="Confirmations et rappels par e-mail" />
          <Toggle checked={p.notifySms} onChange={(v) => setP({ ...p, notifySms: v })} label="Rappels par SMS" hint="Pour la fin de mois, si disponible" />
        </div>
        {dirty && <button className="btn-primary w-full sm:w-auto" disabled={busy} onClick={save}>{busy ? <Spinner /> : <Save className="size-4" />} Enregistrer</button>}
      </section>

      {/* RGPD */}
      <section className="card space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><ShieldCheck className="size-4 text-brand-600" /> Mes données</h2>
        <p className="muted text-sm">
          Vos données servent uniquement à organiser vos nettoyages.{" "}
          <Link href="/legal/#confidentialite" className="underline">Politique de confidentialité</Link>
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={exportData}><Download className="size-4" /> Télécharger mes données</button>
          <a
            className="btn-ghost text-rose-600"
            href={`mailto:${settings.companyEmail}?subject=${encodeURIComponent("Demande de suppression de mon compte")}&body=${encodeURIComponent(`Bonjour,\n\nJe souhaite la suppression de mon compte client (${me.email}) et de mes données personnelles.\n\nMerci,\n${me.name}`)}`}
          >
            <Trash2 className="size-4" /> Demander la suppression
          </a>
        </div>
      </section>

      <p className="muted pb-4 text-center text-xs">
        <Link href="/legal/" className="hover:underline">Mentions légales</Link> · <Link href="/legal/#conditions" className="hover:underline">Conditions d&apos;utilisation</Link>
      </p>

    </div>
  );
}
