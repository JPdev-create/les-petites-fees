"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { useOwner } from "@/components/owner-data";
import { InvoiceView } from "@/components/invoice-view";
import { Spinner } from "@/components/ui";
import { useParam } from "@/lib/hooks";

export default function OwnerInvoicePage() {
  const id = useParam("id");
  const { invoices, settings, loading } = useOwner();
  const inv = invoices.find((i) => i.id === id);
  if (loading) return <div className="grid h-64 place-items-center"><Spinner className="size-6 text-brand-500" /></div>;
  if (!inv) return <p className="muted py-10 text-center">Facture introuvable.</p>;
  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/espace/compte/#factures" className="btn-ghost -ml-3"><ArrowLeft className="size-4" /> Retour</Link>
        <button className="btn-primary" onClick={() => window.print()}><Printer className="size-4" /> Télécharger en PDF</button>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"><div className="min-w-[640px]"><InvoiceView inv={inv} s={settings} /></div></div>
    </div>
  );
}
