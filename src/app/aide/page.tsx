"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, LogIn, Home, CalendarPlus, CalendarRange, Copy, CalendarX2, History, XCircle, BellRing, Smartphone, UserRound, Phone, Mail, Download, Printer, CheckCircle2, Clock, Ban, Sparkles, RefreshCw,
} from "lucide-react";
import { Logo, ThemeToggle } from "@/components/ui";
import { useSettings } from "@/lib/hooks";
import { BASE_PATH } from "@/lib/firebase";

/**
 * Guide d'utilisation pour les clients.
 * Sert aussi de source au guide PDF (impression de cette page) : voir scripts/guide-pdf.mjs.
 */
export default function HelpPage() {
  const s = useSettings();
  const tel = s.companyPhone.replace(/\s/g, "");

  // Impression / PDF : toujours en mode clair, même si l'appareil est en mode sombre
  useEffect(() => {
    const html = document.documentElement;
    let wasDark = false;
    const toLight = () => {
      wasDark = html.classList.contains("dark");
      html.classList.remove("dark");
    };
    const restore = () => wasDark && html.classList.add("dark");
    if (new URLSearchParams(window.location.search).has("pdf")) toLight();
    window.addEventListener("beforeprint", toLight);
    window.addEventListener("afterprint", restore);
    return () => {
      window.removeEventListener("beforeprint", toLight);
      window.removeEventListener("afterprint", restore);
    };
  }, []);

  return (
    <div className="guide min-h-dvh">
      <header className="guide-head bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 pt-[env(safe-area-inset-top)] text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <Link href="/"><Logo className="!h-14" /></Link>
          <ThemeToggle className="no-print !text-white hover:!bg-white/10" />
        </div>
        <div className="mx-auto max-w-3xl px-5 pb-10 pt-4">
          <p className="text-sm font-medium text-white/70">Guide client</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Comment ça marche ?</h1>
          <p className="mt-3 max-w-xl text-white/80">
            Votre espace {s.companyName} vous permet de demander vos nettoyages en quelques secondes, depuis votre téléphone ou votre ordinateur.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-20 pt-8">
        <div className="no-print mb-8 flex flex-wrap gap-2">
          <Link href="/espace/" className="btn-secondary"><ArrowLeft className="size-4" /> Mon espace</Link>
          <a href={`${BASE_PATH}/guide-client.pdf`} download className="btn-secondary"><Download className="size-4" /> Télécharger en PDF</a>
          <button className="btn-ghost" onClick={() => window.print()}><Printer className="size-4" /> Imprimer</button>
        </div>

        {/* Sommaire */}
        <nav className="no-print card mb-10 grid gap-x-6 gap-y-1.5 p-5 text-sm sm:grid-cols-2">
          {[
            ["#connexion", "1. Se connecter"],
            ["#lieux", "2. Ajouter vos lieux"],
            ["#encoder", "3. Demander un nettoyage"],
            ["#suivre", "4. Suivre vos passages"],
            ["#modifier", "5. Modifier ou annuler"],
            ["#rappels", "6. Les rappels de fin de mois"],
            ["#installer", "7. Installer l'application"],
            ["#compte", "8. Votre compte"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="font-medium text-brand-700 hover:underline dark:text-brand-300">{label}</a>
          ))}
        </nav>

        <div className="space-y-12 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          <Section id="connexion" n={1} icon={LogIn} title="Se connecter">
            <p>Rendez-vous sur le site et touchez <B>« Se connecter »</B>. Deux possibilités, sans mot de passe à retenir :</p>
            <Steps items={[
              <><B>Avec Google</B> : touchez « Se connecter avec Google » et choisissez votre compte. C&apos;est le plus rapide.</>,
              <><B>Par e-mail</B> : touchez « Pas de compte Google ? », indiquez votre adresse, puis ouvrez le lien reçu par e-mail.</>,
            ]} />
            <p>La toute première fois, une courte fiche vous est demandée (nom, téléphone, adresse) : votre espace est alors créé.</p>
            <Tip>Utilisez toujours la même adresse e-mail : c&apos;est elle qui identifie votre espace.</Tip>
          </Section>

          <Section id="lieux" n={2} icon={Home} title="Ajouter vos lieux">
            <p>Onglet <B>« Mes lieux »</B> → <B>« Ajouter »</B>. Pour chaque gîte, appartement ou bureau, indiquez :</p>
            <Steps items={[
              <>le <B>nom</B> et l&apos;<B>adresse</B> du lieu ;</>,
              <>le nombre de chambres, de salles de bain, de lits à refaire et de jeux de serviettes ;</>,
              <>l&apos;<B>accès</B> (code de la boîte à clés, alarme, parking…) et vos consignes particulières ;</>,
              <>l&apos;heure de passage habituelle.</>,
            ]} />
            <p>Vous avez plusieurs lieux ? Ajoutez-les tous : vous choisirez ensuite le lieu concerné à chaque demande.</p>
            <Tip icon={RefreshCw}>
              Vous louez sur <B>Airbnb</B> ou <B>Booking</B> ? Collez le lien d&apos;export de votre calendrier (iCal) dans la fiche du lieu : chaque départ de voyageurs
              créera automatiquement une demande de nettoyage, sans rien encoder.
            </Tip>
            <p className="text-sm text-zinc-500">Le tarif de chaque lieu est fixé par {s.companyName}. Un nouveau lieu est vérifié par notre équipe avant le premier passage.</p>
          </Section>

          <Section id="encoder" n={3} icon={CalendarPlus} title="Demander un nettoyage">
            <p>Onglet <B>« Encoder »</B> (ou le grand bouton de l&apos;accueil). Choisissez le lieu, puis l&apos;un des deux modes :</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card icon={CalendarPlus} title="Dates précises">
                Touchez chaque jour où un nettoyage est nécessaire. Touchez-le à nouveau pour le retirer.
              </Card>
              <Card icon={CalendarRange} title="Une période">
                Touchez le <B>premier</B> puis le <B>dernier</B> jour. Nous passerons à <B>une date de cette période</B> et vous confirmerons le jour retenu.
              </Card>
            </div>
            <p>Touchez enfin le grand bouton <B>« Envoyer »</B>. C&apos;est fait !</p>
            <p><B>Options</B> (facultatives), sous chaque date : heure souhaitée, message pour l&apos;équipe, <i>urgent</i> (arrivée de voyageurs le jour même), linge supplémentaire.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card icon={Copy} title="Comme le mois dernier">Reprend vos dates du mois précédent, aux mêmes jours de la semaine.</Card>
              <Card icon={CalendarX2} title="Pas de nettoyage ce mois-ci">Un toucher pour nous le dire : nous ne vous relancerons pas.</Card>
            </div>
            <p>Dans le calendrier, les petits points indiquent les passages déjà prévus : <Dot c="bg-amber-500" /> en attente, <Dot c="bg-sky-500" /> confirmé, <Dot c="bg-emerald-500" /> effectué.</p>
            <Tip>Les demandes se font au moins {s.minNoticeHours} heures à l&apos;avance. Pour une urgence, appelez-nous.</Tip>
          </Section>

          <Section id="suivre" n={4} icon={History} title="Suivre vos passages">
            <p>Onglet <B>« Passages »</B> : tous vos nettoyages à venir et passés. Chaque passage a un statut :</p>
            <ul className="space-y-2">
              <Status icon={Clock} tone="text-amber-600" label="En attente">votre demande est reçue, nous allons la confirmer.</Status>
              <Status icon={CheckCircle2} tone="text-sky-600" label="Confirmé">c&apos;est dans notre agenda.</Status>
              <Status icon={Sparkles} tone="text-emerald-600" label="Effectué">le nettoyage a été réalisé.</Status>
              <Status icon={Ban} tone="text-rose-600" label="Refusé">la date n&apos;est pas disponible ; le motif est indiqué, choisissez-en une autre.</Status>
              <Status icon={XCircle} tone="text-zinc-500" label="Annulé">le passage a été annulé.</Status>
            </ul>
            <p>Vous recevez un <B>e-mail</B> à chaque confirmation, refus ou changement de date.</p>
          </Section>

          <Section id="modifier" n={5} icon={XCircle} title="Modifier ou annuler">
            <p>Touchez un passage dans « Passages » ou sur l&apos;accueil :</p>
            <Steps items={[
              <>tant qu&apos;une demande est <B>en attente</B>, vous pouvez changer l&apos;heure, le message et les options ;</>,
              <>vous pouvez <B>annuler</B> un passage jusqu&apos;à {s.minNoticeHours} heures avant ; nous en sommes prévenus automatiquement ;</>,
              <>en dessous de ce délai, appelez-nous au <B>{s.companyPhone}</B>.</>,
            ]} />
          </Section>

          <Section id="rappels" n={6} icon={BellRing} title="Les rappels de fin de mois">
            <p>
              Si vous n&apos;avez pas encore encodé le mois suivant, vous recevez un petit e-mail de rappel le <B>{s.reminderDay1}</B>
              {s.reminderDay2 ? <> puis le <B>{s.reminderDay2}</B></> : null} du mois, avec un bouton qui ouvre directement le bon calendrier.
            </p>
            <p>Pas de passage prévu ? Touchez « Pas de nettoyage ce mois-ci » : plus aucun rappel pour ce mois.</p>
          </Section>

          <Section id="installer" n={7} icon={Smartphone} title="Installer l'application sur votre téléphone">
            <p>Pas besoin de passer par un magasin d&apos;applications :</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card icon={Smartphone} title="iPhone (Safari)">Touchez le bouton <B>Partager</B> (carré avec une flèche), puis <B>« Sur l&apos;écran d&apos;accueil »</B>.</Card>
              <Card icon={Smartphone} title="Android (Chrome)">Touchez <B>« Installer »</B> quand l&apos;application le propose, ou le menu <B>⋮</B> → <B>« Installer l&apos;application »</B>.</Card>
            </div>
            <p>L&apos;icône apparaît à côté de vos autres applications : un toucher et vous êtes dans votre espace.</p>
          </Section>

          <Section id="compte" n={8} icon={UserRound} title="Votre compte">
            <p>Onglet <B>« Compte »</B> : vos coordonnées, vos préférences de notification (e-mail, SMS) et vos données personnelles (téléchargement, demande de suppression).</p>
          </Section>

          <section className="guide-section card p-6">
            <h2 className="font-display text-xl font-semibold text-zinc-900 dark:text-white">Une question ?</h2>
            <p className="mt-1">L&apos;équipe {s.companyName.replace(/^Les /, "des ")} vous répond volontiers.</p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-medium">
              <a href={`tel:${tel}`} className="inline-flex items-center gap-2 text-brand-700 dark:text-brand-300"><Phone className="size-4" /> {s.companyPhone}</a>
              <a href={`mailto:${s.companyEmail}`} className="inline-flex items-center gap-2 text-brand-700 dark:text-brand-300"><Mail className="size-4" /> {s.companyEmail}</a>
            </div>
            <p className="mt-3 text-sm text-zinc-500">{s.companyAddress}</p>
          </section>
        </div>
      </main>
    </div>
  );
}

function Section({ id, n, icon: Icon, title, children }: { id: string; n: number; icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="guide-section scroll-mt-6 space-y-4">
      <h2 className="flex items-center gap-3 font-display text-xl font-semibold text-zinc-900 dark:text-white">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"><Icon className="size-5" /></span>
        <span><span className="text-brand-600 dark:text-brand-400">{n}.</span> {title}</span>
      </h2>
      {children}
    </section>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function Card({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4 text-sm">
      <p className="mb-1 flex items-center gap-2 font-semibold text-zinc-900 dark:text-white"><Icon className="size-4 text-brand-600" /> {title}</p>
      <p>{children}</p>
    </div>
  );
}

function Status({ icon: Icon, tone, label, children }: { icon: React.ElementType; tone: string; label: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <Icon className={`mt-0.5 size-5 shrink-0 ${tone}`} />
      <span><B>{label}</B> : {children}</span>
    </li>
  );
}

function Tip({ children, icon: Icon = Sparkles }: { children: React.ReactNode; icon?: React.ElementType }) {
  return (
    <p className="flex gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900 dark:bg-brand-500/10 dark:text-brand-100">
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

const B = ({ children }: { children: React.ReactNode }) => <strong className="font-semibold text-zinc-900 dark:text-white">{children}</strong>;
const Dot = ({ c }: { c: string }) => <span className={`mx-0.5 inline-block size-2 rounded-full align-middle ${c}`} />;
