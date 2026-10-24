"use client";

import type { Invoice, Settings } from "@/lib/types";
import { euros, formatDate, periodLabel, capitalize } from "@/lib/format";
import { BASE_PATH } from "@/lib/firebase";
import { INVOICE_STATUS } from "@/lib/format";

/** Facture au format A4, imprimable / enregistrable en PDF depuis le navigateur. */
export function InvoiceView({ inv, s }: { inv: Invoice; s: Settings }) {
  const iso = (d: string) => d.slice(0, 10);
  // Communication structurée belge (+++xxx/xxxx/xxxxx+++) dérivée du numéro
  const digits = (inv.number.replace(/\D/g, "") + "0000000000").slice(0, 10);
  const mod = Number(BigInt(digits) % 97n) || 97;
  const ogm = `+++${digits.slice(0, 3)}/${digits.slice(3, 7)}/${digits.slice(7)}${String(mod).padStart(2, "0")}+++`;

  return (
    <article className="print-page card mx-auto max-w-[210mm] bg-white p-8 text-zinc-900 sm:p-12 dark:bg-white dark:text-zinc-900">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="grid size-16 place-items-center overflow-hidden rounded-2xl bg-brand-800 p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BASE_PATH}/logo.png`} alt="" className="max-h-full" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
          </div>
          <div className="text-sm leading-relaxed">
            <p className="font-display text-lg font-semibold text-brand-800">{s.companyName}</p>
            <p className="text-zinc-600">{s.companyAddress}</p>
            <p className="text-zinc-600">{s.companyPhone} · {s.companyEmail}</p>
            {s.vatNumber && <p className="text-zinc-600">TVA {s.vatNumber}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl font-semibold tracking-tight">Facture</p>
          <p className="mt-1 font-mono text-sm">{inv.number}</p>
          <span className={`badge no-print mt-2 ${INVOICE_STATUS[inv.status].tone}`}>{INVOICE_STATUS[inv.status].label}</span>
        </div>
      </header>

      <div className="mt-10 grid gap-6 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Facturé à</p>
          <p className="mt-1 font-semibold">{inv.ownerCompany || inv.ownerName}</p>
          {inv.ownerCompany && <p>{inv.ownerName}</p>}
          {inv.ownerAddress && <p className="whitespace-pre-line text-zinc-600">{inv.ownerAddress}</p>}
          {inv.ownerVat && <p className="text-zinc-600">TVA {inv.ownerVat}</p>}
        </div>
        <dl className="grid grid-cols-2 gap-y-1 sm:text-right">
          <dt className="text-zinc-500">Date</dt><dd>{formatDate(iso(inv.issueDate), "short")} {inv.issueDate.slice(0, 4)}</dd>
          <dt className="text-zinc-500">Échéance</dt><dd>{formatDate(iso(inv.dueDate), "short")} {inv.dueDate.slice(0, 4)}</dd>
          <dt className="text-zinc-500">Période</dt><dd>{capitalize(periodLabel(inv.period))}</dd>
        </dl>
      </div>

      <table className="mt-10 w-full text-sm">
        <thead>
          <tr className="border-b-2 border-zinc-900 text-left text-xs uppercase tracking-wide text-zinc-500">
            <th className="py-2 font-semibold">Description</th>
            <th className="w-16 py-2 text-right font-semibold">Qté</th>
            <th className="w-28 py-2 text-right font-semibold">Prix HTVA</th>
            <th className="w-28 py-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {inv.lines.map((l, i) => (
            <tr key={i} className="border-b border-zinc-200">
              <td className="py-2.5 pr-3">{l.label}</td>
              <td className="py-2.5 text-right">{l.quantity}</td>
              <td className="py-2.5 text-right">{euros(l.unitPrice)}</td>
              <td className="py-2.5 text-right font-medium">{euros(l.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 ml-auto w-full max-w-xs space-y-1.5 text-sm">
        <div className="flex justify-between"><span className="text-zinc-500">Total HTVA</span><span>{euros(inv.totalHT)}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">TVA {inv.vatRate} %</span><span>{euros(inv.totalVAT)}</span></div>
        <div className="flex justify-between border-t-2 border-zinc-900 pt-2 text-base font-semibold"><span>Total TVAC</span><span>{euros(inv.totalTTC)}</span></div>
      </div>

      <footer className="mt-12 rounded-2xl bg-zinc-50 p-5 text-sm">
        {inv.status === "PAID" ? (
          <p className="font-semibold text-emerald-700">Facture acquittée{inv.paidAt ? ` le ${formatDate(iso(inv.paidAt), "short")} ${inv.paidAt.slice(0, 4)}` : ""}. Merci !</p>
        ) : (
          <>
            <p className="font-semibold">Paiement par virement avant le {formatDate(iso(inv.dueDate))}</p>
            <p className="mt-1 text-zinc-600">
              {s.iban ? <>IBAN <span className="font-mono">{s.iban}</span>{s.bic ? ` · BIC ${s.bic}` : ""} · </> : null}
              Communication : <span className="font-mono font-semibold">{ogm}</span>
            </p>
          </>
        )}
        {inv.notes && <p className="mt-3 text-zinc-600">{inv.notes}</p>}
      </footer>
    </article>
  );
}
