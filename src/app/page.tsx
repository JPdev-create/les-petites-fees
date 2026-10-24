"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { CalendarCheck2, MousePointerClick, MailCheck, Smartphone, ShieldCheck, RefreshCw, Phone, Mail, MapPin, ArrowRight } from "lucide-react";
import { fb } from "@/lib/firebase";
import { Logo, ThemeToggle } from "@/components/ui";
import { DEFAULT_SETTINGS as S } from "@/lib/types";

export default function Landing() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => onAuthStateChanged(fb().auth, (u) => setSignedIn(!!u)), []);

  return (
    <div className="min-h-dvh">
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 text-white">
        <div className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-brand-400/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 size-[26rem] rounded-full bg-cyan-300/10 blur-3xl" />
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <Logo className="!h-16 sm:!h-20" />
          <div className="flex items-center gap-2">
            <ThemeToggle className="!text-white hover:!bg-white/10" />
            <Link href="/connexion/" className="btn bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25">{signedIn ? "Mon espace" : "Se connecter"}</Link>
          </div>
        </header>
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-24 pt-10 sm:pt-16 lg:grid-cols-[1.15fr_1fr]">
          <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">✨ Gîtes · Appartements · Bureaux</p>
          <h1 className="mt-5 max-w-2xl font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">Vos nettoyages planifiés en 30 secondes.</h1>
          <p className="mt-5 max-w-xl text-lg text-white/80">Fini les e-mails et les messages WhatsApp. Touchez vos dates sur le calendrier : nous confirmons, nous nettoyons, vous recevez une facture claire chaque mois.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/connexion/" className="btn h-14 rounded-2xl bg-white px-7 text-base text-brand-800 shadow-xl hover:bg-brand-50">
              Encoder mes dates <ArrowRight className="size-5" />
            </Link>
            <a href={`tel:${S.companyPhone.replace(/\s/g, "")}`} className="btn h-14 rounded-2xl px-6 text-base text-white ring-1 ring-white/30 hover:bg-white/10"><Phone className="size-5" /> {S.companyPhone}</a>
          </div>
          </div>
          <PhonePreview />
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-12 max-w-6xl px-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: MousePointerClick, t: "1. Connexion en un clic", d: "Avec votre compte Google, sans mot de passe à retenir." },
            { icon: CalendarCheck2, t: "2. Touchez vos dates", d: "Sélectionnez les jours de départ de vos voyageurs. Un message, une heure ? C'est optionnel." },
            { icon: MailCheck, t: "3. C'est confirmé", d: "Vous recevez un e-mail de confirmation et suivez tout depuis votre espace." },
          ].map((x) => (
            <div key={x.t} className="card p-6 shadow-lg shadow-brand-950/5">
              <span className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"><x.icon className="size-5" /></span>
              <p className="mt-4 font-display text-lg font-semibold">{x.t}</p>
              <p className="muted mt-1 text-sm">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight">Pensé pour les propriétaires occupés</h2>
            <p className="muted mt-3">Un espace personnel simple, sur téléphone comme sur ordinateur.</p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: RefreshCw, t: "Airbnb & Booking synchronisés", d: "Collez le lien de votre calendrier : chaque départ crée automatiquement un nettoyage." },
              { icon: Smartphone, t: "S'installe comme une appli", d: "Ajoutez-la à l'écran d'accueil de votre téléphone." },
              { icon: MailCheck, t: "Rappel en fin de mois", d: "Un petit e-mail si vous avez oublié d'encoder le mois suivant." },
              { icon: ShieldCheck, t: "Données protégées", d: "Hébergées en Europe. Vous seul voyez vos lieux et vos factures." },
            ].map((x) => (
              <li key={x.t} className="flex gap-3">
                <x.icon className="mt-0.5 size-5 shrink-0 text-brand-600" />
                <div><p className="font-semibold">{x.t}</p><p className="muted text-sm">{x.d}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm">
          <p className="font-display font-semibold">{S.companyName} <span className="muted font-normal">· Service de nettoyage</span></p>
          <div className="muted flex flex-wrap gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{S.companyAddress}</span>
            <a href={`mailto:${S.companyEmail}`} className="inline-flex items-center gap-1.5 hover:underline"><Mail className="size-4" />{S.companyEmail}</a>
            <a href={`tel:${S.companyPhone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 hover:underline"><Phone className="size-4" />{S.companyPhone}</a>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap gap-x-5 gap-y-2 border-t border-[var(--border)] px-5 py-5 text-xs text-zinc-500">
          <span>© {new Date().getFullYear()} {S.companyName}</span>
          <Link href="/legal/" className="hover:underline">Mentions légales</Link>
          <Link href="/legal/#confidentialite" className="hover:underline">Confidentialité</Link>
          <Link href="/legal/#cookies" className="hover:underline">Cookies</Link>
          <Link href="/legal/#conditions" className="hover:underline">Conditions d&apos;utilisation</Link>
        </div>
      </footer>
    </div>
  );
}

/** Aperçu décoratif de l'écran « Encoder mes dates » (ordinateur uniquement). */
function PhonePreview() {
  const selected = [7, 14, 21];
  const booked = [3, 17];
  return (
    <div aria-hidden className="relative mx-auto hidden w-[290px] lg:block">
      <div className="absolute -inset-8 rounded-[3rem] bg-brand-300/20 blur-3xl" />
      <div className="relative rotate-[3deg] rounded-[2.6rem] bg-zinc-950 p-3 shadow-2xl shadow-black/40 ring-1 ring-white/10">
        <div className="overflow-hidden rounded-[2rem] bg-white text-zinc-900">
          <div className="bg-brand-800 px-5 pb-4 pt-6 text-white">
            <p className="text-[11px] text-white/70">Le Petit Verger</p>
            <p className="font-display text-lg font-semibold">Encoder mes dates</p>
          </div>
          <div className="px-4 py-4">
            <p className="mb-2 text-center font-display text-sm font-semibold">Novembre</p>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
              {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i} className="pb-1 font-semibold text-zinc-400">{d}</span>)}
              {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                <span key={d} className={`relative grid aspect-square place-items-center rounded-lg font-medium ${selected.includes(d) ? "bg-brand-600 text-white shadow" : ""}`}>
                  {d}
                  {booked.includes(d) && <span className="absolute bottom-0.5 size-1 rounded-full bg-sky-500" />}
                </span>
              ))}
            </div>
            <div className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 text-sm font-semibold text-white">
              <CalendarCheck2 className="size-4" /> Envoyer 3 dates
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -right-16 bottom-24 flex -rotate-2 items-center gap-2.5 rounded-2xl bg-white px-4 py-3 text-sm text-zinc-900 shadow-xl">
        <span className="grid size-8 place-items-center rounded-full bg-emerald-500 text-white"><MailCheck className="size-4" /></span>
        <span><span className="block font-semibold">Confirmé ✓</span><span className="block text-xs text-zinc-500">sam. 7 novembre · 11:00</span></span>
      </div>
    </div>
  );
}
