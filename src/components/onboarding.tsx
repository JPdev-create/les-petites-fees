"use client";

import { useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { Sparkles, LogOut } from "lucide-react";
import { selfSignup } from "@/lib/actions";
import { logout } from "./auth";
import { ErrorNote, Field, Spinner } from "./ui";

/** Première connexion d'un nouveau client : courte fiche, puis accès à son espace. */
export function Onboarding({ user, onDone }: { user: User; onDone?: () => void }) {
  const [f, setF] = useState({ name: user.displayName ?? "", phone: user.phoneNumber ?? "", company: "", billingAddress: "", vatNumber: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.name.trim().length < 2) return setError("Indiquez votre nom.");
    setBusy(true);
    setError(null);
    try {
      await selfSignup(user.email!, { name: f.name.trim(), phone: f.phone.trim(), company: f.company.trim(), billingAddress: f.billingAddress.trim(), vatNumber: f.vatNumber.trim() });
      onDone?.();
    } catch (err) {
      console.error(err);
      setError("Impossible de créer votre espace. Vérifiez votre connexion et réessayez.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="animate-in space-y-4">
      <div className="mb-2 grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
        <Sparkles className="size-6" />
      </div>
      <div>
        <h1 className="font-display text-2xl font-semibold">Bienvenue !</h1>
        <p className="muted mt-1 text-sm">
          Créons votre espace client. Vous êtes connecté avec <strong className="text-zinc-800 dark:text-zinc-200">{user.email}</strong>.
        </p>
      </div>
      <Field label="Nom et prénom"><input className="input h-12" required autoFocus autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Téléphone" hint="Pour vous joindre le jour du passage si besoin."><input className="input h-12" type="tel" autoComplete="tel" inputMode="tel" placeholder="0470 00 00 00" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
      <Field label="Adresse de facturation"><textarea className="input min-h-[72px]" autoComplete="street-address" placeholder="Rue, numéro, code postal, localité" value={f.billingAddress} onChange={(e) => setF({ ...f, billingAddress: e.target.value })} /></Field>
      <details className="group rounded-xl border border-[var(--border)] px-4 py-3">
        <summary className="cursor-pointer list-none text-sm font-medium text-brand-700 dark:text-brand-300">+ Je facture au nom d&apos;une société</summary>
        <div className="mt-3 space-y-3">
          <Field label="Société"><input className="input" autoComplete="organization" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>
          <Field label="N° de TVA"><input className="input" placeholder="BE0123.456.789" value={f.vatNumber} onChange={(e) => setF({ ...f, vatNumber: e.target.value })} /></Field>
        </div>
      </details>
      <ErrorNote error={error} />
      <button className="btn-primary btn-lg w-full" disabled={busy}>{busy && <Spinner />} Créer mon espace</button>
      <p className="muted text-center text-[11px] leading-relaxed">
        En créant votre espace, vous acceptez nos <Link href="/legal/#conditions" className="underline">conditions d&apos;utilisation</Link> et
        notre <Link href="/legal/#confidentialite" className="underline">politique de confidentialité</Link>.
      </p>
      <button type="button" onClick={() => logout()} className="muted mx-auto flex items-center gap-1.5 text-xs hover:underline">
        <LogOut className="size-3.5" /> Utiliser une autre adresse
      </button>
    </form>
  );
}
