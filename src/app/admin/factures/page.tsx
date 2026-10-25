"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { collection, orderBy, query } from "firebase/firestore";
import { Receipt, Wand2, ChevronLeft, ChevronRight, Check, Send, Download } from "lucide-react";
import { useAdmin } from "@/components/admin-data";
import { Empty, PageHeader, Spinner, Stat } from "@/components/ui";
import { toast } from "@/components/toaster";
import { useLive } from "@/lib/hooks";
import { generateInvoices, sendInvoice, updateInvoice } from "@/lib/actions";
import { INVOICE_STATUS, capitalize, currentPeriod, euros, formatDate, periodBounds, periodLabel, shiftPeriod } from "@/lib/format";
import type { Invoice } from "@/lib/types";

export default function InvoicesPage() {
  const { missions, profiles, settings, me } = useAdmin();
  const invoices = useLive<Invoice>((db) => query(collection(db, "invoices"), orderBy("issueDate", "desc")), []);
  const [period, setPeriod] = useState(shiftPeriod(currentPeriod(), new Date().getDate() <= 10 ? -1 : 0));
  const [busy, setBusy] = useState<string | null>(null);

  const { from, to } = periodBounds(period);
  const ready = useMemo(() => missions.filter((m) => m.status === "DONE" && !m.invoiceId && m.date >= from && m.date <= to), [missions, from, to]);
  const notClosed = useMemo(() => missions.filter((m) => m.status === "CONFIRMED" && m.date >= from && m.date <= to && m.date < new Date().toISOString().slice(0, 10)), [missions, from, to]);
  const readyOwners = new Set(ready.map((m) => m.ownerEmail)).size;
  const monthInvoices = invoices.data.filter((i) => i.period === period);
  const unpaid = invoices.data.filter((i) => i.status === "SENT");

  const generate = async () => {
    setBusy("gen");
    try {
      const n = await generateInvoices(period, missions, profiles, settings, me.name);
      toast(n ? `${n} facture(s) créée(s) en brouillon` : "Rien à facturer pour ce mois");
    } catch (e) {
      console.error(e);
      toast("Génération impossible", "error");
    } finally {
      setBusy(null);
    }
  };

  const send = async (inv: Invoice) => {
    setBusy(inv.id);
    try {
      const n = await sendInvoice(inv);
      toast(`Facture ${n} envoyée à ${inv.ownerName}`);
    } catch {
      toast("Envoi impossible. Réessayez.", "error");
    }
    setBusy(null);
  };

  const exportCsv = () => {
    const rows = [["Numéro", "Client", "Période", "Date", "HTVA", "TVA", "TVAC", "Statut"], ...invoices.data.map((i) => [i.number || "brouillon", i.ownerName, i.period, i.issueDate.slice(0, 10), (i.totalHT / 100).toFixed(2), (i.totalVAT / 100).toFixed(2), (i.totalTTC / 100).toFixed(2), INVOICE_STATUS[i.status].label])];
    const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `factures-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <>
      <PageHeader title="Facturation" subtitle="Une facture par client et par mois, à partir des passages effectués." actions={<button className="btn-secondary" onClick={exportCsv}><Download className="size-4" /> Export comptable (CSV)</button>} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="En attente de paiement" value={euros(unpaid.reduce((a, i) => a + i.totalTTC, 0))} hint={`${unpaid.length} facture(s)`} icon={Receipt} tone="amber" />
        <Stat label={`Facturé en ${periodLabel(period).split(" ")[0]}`} value={euros(monthInvoices.reduce((a, i) => a + i.totalTTC, 0))} hint={`${monthInvoices.length} facture(s) TVAC`} icon={Receipt} />
        <Stat label="Prêt à facturer" value={euros(ready.reduce((a, m) => a + m.price, 0))} hint={`${ready.length} passage(s) · ${readyOwners} client(s)`} icon={Wand2} tone="violet" />
      </div>

      <section className="card mb-6 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <button className="btn-ghost size-9 px-0" onClick={() => setPeriod(shiftPeriod(period, -1))} aria-label="Mois précédent"><ChevronLeft className="size-5" /></button>
            <p className="w-40 text-center font-display text-lg font-semibold">{capitalize(periodLabel(period))}</p>
            <button className="btn-ghost size-9 px-0" onClick={() => setPeriod(shiftPeriod(period, 1))} aria-label="Mois suivant"><ChevronRight className="size-5" /></button>
          </div>
          <p className="muted flex-1 text-sm">
            {ready.length ? <><strong className="text-zinc-900 dark:text-white">{ready.length} passage(s)</strong> effectué(s) non facturé(s) pour {readyOwners} client(s).</> : "Aucun passage effectué à facturer ce mois-ci."}
            {notClosed.length > 0 && <> <Link href="/admin/demandes/?vue=passes" className="text-amber-700 underline dark:text-amber-300">{notClosed.length} passage(s) à clôturer d&apos;abord</Link>.</>}
          </p>
          <button className="btn-primary" disabled={!ready.length || !!busy} onClick={generate}>{busy === "gen" ? <Spinner /> : <Wand2 className="size-4" />} Générer les factures</button>
        </div>
      </section>

      <div className="card overflow-hidden">
        {invoices.loading ? (
          <div className="grid h-40 place-items-center"><Spinner className="size-6 text-brand-500" /></div>
        ) : invoices.data.length === 0 ? (
          <Empty icon={Receipt} title="Aucune facture" text="Marquez des passages comme effectués, puis générez les factures du mois en un clic." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3 font-semibold">Numéro</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Période</th>
                  <th className="px-4 py-3 font-semibold">Échéance</th>
                  <th className="px-4 py-3 text-right font-semibold">TVAC</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {invoices.data.map((i) => {
                  const late = i.status === "SENT" && i.dueDate < new Date().toISOString();
                  return (
                    <tr key={i.id} className="table-row">
                      <td className="whitespace-nowrap px-4 py-3 font-mono"><Link href={`/admin/factures/voir/?id=${i.id}`} className="hover:underline">{i.number || <span className="muted italic">brouillon</span>}</Link></td>
                      <td className="px-4 py-3 font-medium">{i.ownerName}</td>
                      <td className="px-4 py-3">{capitalize(periodLabel(i.period))}</td>
                      <td className={`px-4 py-3 ${late ? "font-semibold text-rose-600" : ""}`}>{formatDate(i.dueDate.slice(0, 10), "short")}{late ? " · en retard" : ""}</td>
                      <td className="px-4 py-3 text-right font-semibold">{euros(i.totalTTC)}</td>
                      <td className="px-4 py-3"><span className={`badge ${INVOICE_STATUS[i.status].tone}`}>{INVOICE_STATUS[i.status].label}</span></td>
                      <td className="px-4 py-3 text-right">
                        {i.status === "DRAFT" && <button className="btn-secondary btn-sm" disabled={busy === i.id} onClick={() => send(i)}><Send className="size-3.5" /> Envoyer</button>}
                        {i.status === "SENT" && <button className="btn-secondary btn-sm" onClick={() => updateInvoice(i.id, { status: "PAID", paidAt: new Date().toISOString() }).then(() => toast("Paiement enregistré"))}><Check className="size-3.5" /> Payée</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
