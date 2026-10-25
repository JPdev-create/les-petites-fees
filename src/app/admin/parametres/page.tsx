"use client";

import { useEffect, useState } from "react";
import { Save, Building2, BellRing, Receipt, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useAdmin } from "@/components/admin-data";
import { Field, PageHeader, Spinner, Toggle } from "@/components/ui";
import { toast } from "@/components/toaster";
import { saveSettings } from "@/lib/actions";
import { timeAgo } from "@/lib/format";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const { settings } = useAdmin();
  const [s, setS] = useState<Settings>(settings);
  const [busy, setBusy] = useState(false);
  useEffect(() => setS(settings), [settings]);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((x) => ({ ...x, [k]: v }));

  const save = async () => {
    setBusy(true);
    try {
      const { invoiceSeq, lastReminderRun, lastAutomationRun, syncRequestedAt, ...rest } = s;
      void invoiceSeq; void lastReminderRun; void lastAutomationRun; void syncRequestedAt;
      await saveSettings(rest);
      toast("Paramètres enregistrés");
    } catch {
      toast("Enregistrement impossible", "error");
    } finally {
      setBusy(false);
    }
  };

  const lastRun = settings.lastAutomationRun;
  const healthy = lastRun && Date.now() - new Date(lastRun).getTime() < 3 * 3600_000;

  return (
    <>
      <PageHeader title="Paramètres" actions={<button className="btn-primary" disabled={busy} onClick={save}>{busy ? <Spinner /> : <Save className="size-4" />} Enregistrer</button>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-4 p-5">
          <h2 className="flex items-center gap-2 font-display font-semibold"><Building2 className="size-4 text-brand-600" /> Entreprise</h2>
          <Field label="Nom"><input className="input" value={s.companyName} onChange={(e) => set("companyName", e.target.value)} /></Field>
          <Field label="Adresse"><input className="input" value={s.companyAddress} onChange={(e) => set("companyAddress", e.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="E-mail"><input className="input" value={s.companyEmail} onChange={(e) => set("companyEmail", e.target.value)} /></Field>
            <Field label="Téléphone"><input className="input" value={s.companyPhone} onChange={(e) => set("companyPhone", e.target.value)} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Forme juridique"><input className="input" value={s.legalForm} onChange={(e) => set("legalForm", e.target.value)} placeholder="SRL, personne physique…" /></Field>
            <Field label="N° d'entreprise (BCE)"><input className="input" value={s.bceNumber} onChange={(e) => set("bceNumber", e.target.value)} placeholder="0123.456.789" /></Field>
          </div>
          <Field label="N° de TVA"><input className="input" value={s.vatNumber} onChange={(e) => set("vatNumber", e.target.value)} placeholder="BE0123.456.789" /></Field>
          <p className="hint !mt-0">Ces informations apparaissent sur les factures et dans les mentions légales du site (obligatoires en Belgique).</p>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="flex items-center gap-2 font-display font-semibold"><Receipt className="size-4 text-brand-600" /> Facturation</h2>
          <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
            <Field label="IBAN"><input className="input font-mono" value={s.iban} onChange={(e) => set("iban", e.target.value)} placeholder="BE00 0000 0000 0000" /></Field>
            <Field label="BIC"><input className="input font-mono" value={s.bic} onChange={(e) => set("bic", e.target.value)} /></Field>
          </div>
          <Toggle checked={s.vatFranchise} onChange={(v) => set("vatFranchise", v)} label="Régime de franchise de TVA" hint="Petite entreprise exemptée (art. 56bis) : factures sans TVA, avec la mention légale." />
          <div className="grid grid-cols-3 gap-4">
            <Field label="TVA (%)"><input type="number" step="0.5" className="input" disabled={s.vatFranchise} value={s.vatFranchise ? 0 : s.vatRate} onChange={(e) => set("vatRate", +e.target.value)} /></Field>
            <Field label="Préfixe"><input className="input" value={s.invoicePrefix} onChange={(e) => set("invoicePrefix", e.target.value)} /></Field>
            <Field label="Délai (jours)"><input type="number" className="input" value={s.paymentDays} onChange={(e) => set("paymentDays", +e.target.value)} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Forfait par défaut (HTVA €)" hint="Prix d'un passage pour un nouveau lieu.">
              <input type="number" step="0.01" className="input" value={s.defaultPrice / 100} onChange={(e) => set("defaultPrice", Math.round(+e.target.value * 100))} />
            </Field>
            <Field label="Tarif horaire par défaut (HTVA €/h)" hint="Proposé quand un lieu passe « à l'heure ».">
              <input type="number" step="0.5" className="input" value={s.defaultHourlyRate / 100} onChange={(e) => set("defaultHourlyRate", Math.round(+e.target.value * 100))} />
            </Field>
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="flex items-center gap-2 font-display font-semibold"><BellRing className="size-4 text-brand-600" /> Relances & règles</h2>
          <Toggle checked={s.reminderEnabled} onChange={(v) => set("reminderEnabled", v)} label="Relances automatiques de fin de mois" hint="E-mail aux clients qui n'ont pas encore encodé le mois suivant." />
          <div className="grid grid-cols-2 gap-4">
            <Field label="1re relance (jour du mois)"><input type="number" min={1} max={28} className="input" value={s.reminderDay1} onChange={(e) => set("reminderDay1", +e.target.value)} /></Field>
            <Field label="2e relance (jour du mois)"><input type="number" min={0} max={28} className="input" value={s.reminderDay2} onChange={(e) => set("reminderDay2", +e.target.value)} /></Field>
          </div>
          <Field label="Délai minimum pour une demande (heures)" hint="Le client ne peut pas encoder ni annuler en dessous de ce délai."><input type="number" min={0} className="input" value={s.minNoticeHours} onChange={(e) => set("minNoticeHours", +e.target.value)} /></Field>
          <Toggle checked={s.icalAutoConfirm} onChange={(v) => set("icalAutoConfirm", v)} label="Confirmer automatiquement les passages iCal" hint="Sinon, ils arrivent « en attente » comme une demande client." />
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="flex items-center gap-2 font-display font-semibold"><RefreshCw className="size-4 text-brand-600" /> Automatisations</h2>
          <div className={`flex items-start gap-3 rounded-2xl p-4 text-sm ${healthy ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-400/10 dark:text-emerald-200" : "bg-amber-50 text-amber-900 dark:bg-amber-400/10 dark:text-amber-200"}`}>
            {healthy ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
            <p>
              {lastRun ? <>Dernière exécution {timeAgo(lastRun)}.</> : <>Les automatisations n&apos;ont pas encore tourné.</>}{" "}
              Elles s&apos;exécutent toutes les 30 minutes : envoi des e-mails, synchronisation Airbnb/Booking et relances.
            </p>
          </div>
          <button className="btn-secondary h-auto min-h-10 whitespace-normal py-2 text-left" onClick={() => saveSettings({ syncRequestedAt: new Date().toISOString() }).then(() => toast("Synchronisation demandée"))}>
            <RefreshCw className="size-4" /> Synchroniser les calendriers au prochain passage
          </button>
        </section>
      </div>
    </>
  );
}
