"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, Send, Check, Trash2, RotateCcw } from "lucide-react";
import { useAdmin } from "@/components/admin-data";
import { InvoiceView } from "@/components/invoice-view";
import { Spinner } from "@/components/ui";
import { toast } from "@/components/toaster";
import { askConfirm } from "@/components/confirm";
import { useLiveDoc, useParam } from "@/lib/hooks";
import { deleteInvoice, sendInvoice, updateInvoice } from "@/lib/actions";
import type { Invoice } from "@/lib/types";

export default function AdminInvoicePage() {
  const id = useParam("id");
  const router = useRouter();
  const { settings, me } = useAdmin();
  const { data: inv, loading } = useLiveDoc<Invoice>(id ? `invoices/${id}` : null);

  if (loading) return <div className="grid h-64 place-items-center"><Spinner className="size-6 text-brand-500" /></div>;
  if (!inv) return <p className="muted py-10 text-center">Facture introuvable.</p>;

  return (
    <div>
      <div className="no-print mb-5 flex flex-wrap items-center gap-2">
        <Link href="/admin/factures/" className="btn-ghost -ml-3 mr-auto"><ArrowLeft className="size-4" /> Factures</Link>
        {inv.status === "DRAFT" && (
          <>
            <button className="btn-ghost text-rose-600" onClick={async () => { if (!(await askConfirm({ title: "Supprimer ce brouillon ?", message: "Les passages qu'il contient redeviendront facturables.", confirmLabel: "Supprimer", danger: true }))) return; await deleteInvoice(inv, me.name); toast("Brouillon supprimé"); router.replace("/admin/factures/"); }}><Trash2 className="size-4" /> Supprimer</button>
            <button className="btn-primary" onClick={() => sendInvoice(inv).then((n) => toast(`Facture ${n} envoyée au client`), () => toast("Envoi impossible. Réessayez.", "error"))}><Send className="size-4" /> Envoyer au client</button>
          </>
        )}
        {inv.status === "SENT" && <button className="btn-success" onClick={() => updateInvoice(inv.id, { status: "PAID", paidAt: new Date().toISOString() }).then(() => toast("Paiement enregistré"))}><Check className="size-4" /> Marquer payée</button>}
        {inv.status === "PAID" && <button className="btn-secondary" onClick={() => updateInvoice(inv.id, { status: "SENT", paidAt: null })}><RotateCcw className="size-4" /> Annuler le paiement</button>}
        <button className="btn-secondary" onClick={() => window.print()}><Printer className="size-4" /> PDF / Imprimer</button>
      </div>
      <div className="overflow-x-auto"><div className="min-w-[640px]"><InvoiceView inv={inv} s={settings} /></div></div>
    </div>
  );
}
