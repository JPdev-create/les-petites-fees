"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo, ThemeToggle } from "@/components/ui";
import { useSettings } from "@/lib/hooks";

const UPDATED = "24 octobre 2026";

/**
 * Mentions légales (Code de droit économique, art. III.74 et XII.6),
 * politique de confidentialité (RGPD), cookies et conditions d'utilisation.
 */
export default function LegalPage() {
  const s = useSettings();
  const missing = <em className="text-amber-700 dark:text-amber-300">[à compléter dans Paramètres]</em>;

  return (
    <div className="min-h-dvh">
      <header className="bg-brand-800 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <Link href="/"><Logo className="!h-14" /></Link>
          <ThemeToggle className="!text-white hover:!bg-white/10" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-20 pt-8">
        <Link href="/" className="muted mb-6 inline-flex items-center gap-1 text-sm hover:underline"><ArrowLeft className="size-4" /> Accueil</Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Informations légales</h1>
        <p className="muted mt-1 text-sm">Dernière mise à jour : {UPDATED}</p>

        <nav className="card mt-6 flex flex-wrap gap-x-5 gap-y-2 p-4 text-sm font-medium text-brand-700 dark:text-brand-300">
          <a href="#mentions" className="hover:underline">Mentions légales</a>
          <a href="#confidentialite" className="hover:underline">Confidentialité (RGPD)</a>
          <a href="#cookies" className="hover:underline">Cookies</a>
          <a href="#conditions" className="hover:underline">Conditions d&apos;utilisation</a>
        </nav>

        <article className="legal mt-10 space-y-12 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          <section id="mentions" className="scroll-mt-6">
            <h2>Mentions légales</h2>
            <dl className="card grid gap-x-6 gap-y-2 p-5 sm:grid-cols-[12rem_1fr]">
              <dt>Dénomination</dt><dd>{s.companyName}{s.legalForm ? ` (${s.legalForm})` : ""}</dd>
              <dt>Siège / adresse</dt><dd>{s.companyAddress}</dd>
              <dt>N° d&apos;entreprise (BCE)</dt><dd>{s.bceNumber || missing}</dd>
              <dt>N° de TVA</dt><dd>{s.vatFranchise ? "Franchise de TVA (art. 56bis CTVA)" : s.vatNumber || missing}</dd>
              <dt>E-mail</dt><dd><a href={`mailto:${s.companyEmail}`}>{s.companyEmail}</a></dd>
              <dt>Téléphone</dt><dd><a href={`tel:${s.companyPhone.replace(/\s/g, "")}`}>{s.companyPhone}</a></dd>
              <dt>Activité</dt><dd>Services de nettoyage de gîtes, logements de vacances et bureaux</dd>
            </dl>
            <p>
              Hébergement du site : GitHub Pages (GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis).
              Hébergement des données : Google Firebase (Google Ireland Ltd., Gordon House, Barrow Street, Dublin 4, Irlande), serveurs situés en Belgique (région europe-west1).
            </p>
          </section>

          <section id="confidentialite" className="scroll-mt-6">
            <h2>Politique de confidentialité</h2>
            <p>
              Nous respectons le Règlement général sur la protection des données (RGPD — Règlement (UE) 2016/679) et la loi belge du 30 juillet 2018.
              Cette politique explique quelles données nous traitons, pourquoi, et quels sont vos droits.
            </p>

            <h3>Responsable du traitement</h3>
            <p>{s.companyName}, {s.companyAddress} — <a href={`mailto:${s.companyEmail}`}>{s.companyEmail}</a>.</p>

            <h3>Données traitées</h3>
            <ul>
              <li><strong>Identité et contact</strong> : nom, adresse e-mail, téléphone, société, adresse de facturation, n° de TVA.</li>
              <li><strong>Lieux à entretenir</strong> : nom et adresse du gîte ou du bureau, informations d&apos;accès (code de boîte à clés, alarme…), consignes particulières.</li>
              <li><strong>Planning</strong> : dates et heures de passage, messages laissés à l&apos;équipe, historique des passages.</li>
              <li><strong>Calendriers de réservation</strong> (si vous nous transmettez un lien iCal Airbnb, Booking…) : uniquement les dates d&apos;arrivée et de départ, sans l&apos;identité des voyageurs.</li>
              <li><strong>Facturation</strong> : factures, montants, statut de paiement.</li>
              <li><strong>Connexion</strong> : adresse e-mail du compte Google ou du lien de connexion, date de dernière connexion.</li>
            </ul>

            <h3>Finalités et bases légales</h3>
            <ul>
              <li>Organiser et réaliser les nettoyages demandés, vous confirmer les dates et vous rappeler d&apos;encoder votre planning — <em>exécution du contrat</em> (art. 6.1.b RGPD).</li>
              <li>Établir et conserver les factures — <em>obligation légale</em> comptable et fiscale (art. 6.1.c RGPD).</li>
              <li>Sécuriser l&apos;accès à votre espace — <em>intérêt légitime</em> (art. 6.1.f RGPD).</li>
            </ul>
            <p>Vos données ne sont jamais vendues, ni utilisées à des fins publicitaires.</p>

            <h3>Durées de conservation</h3>
            <ul>
              <li>Données de compte, lieux et planning : pendant la relation commerciale, puis 3 ans maximum après le dernier passage.</li>
              <li>Factures et pièces comptables : 10 ans (obligation légale belge).</li>
              <li>Journal des e-mails envoyés : 12 mois.</li>
            </ul>

            <h3>Sous-traitants</h3>
            <ul>
              <li>Google Ireland Ltd. (Firebase : base de données et connexion ; Gmail : envoi des e-mails) — données hébergées dans l&apos;Union européenne.</li>
              <li>GitHub, Inc. (hébergement du site et exécution des tâches automatiques) — transfert encadré par le cadre UE–États-Unis de protection des données et les clauses contractuelles types.</li>
              <li>Le cas échéant, Twilio (envoi de SMS de rappel), uniquement si vous avez activé les SMS.</li>
            </ul>

            <h3>Vos droits</h3>
            <p>
              Vous pouvez à tout moment accéder à vos données, les rectifier, demander leur effacement, en limiter le traitement, vous y opposer
              ou en obtenir une copie dans un format réutilisable (portabilité). Depuis votre espace client (<em>Compte → Mes données</em>), vous pouvez
              télécharger vos données et demander la suppression de votre compte. Vous pouvez aussi nous écrire à <a href={`mailto:${s.companyEmail}`}>{s.companyEmail}</a> ;
              nous répondons dans un délai d&apos;un mois.
            </p>
            <p>
              Vous avez le droit d&apos;introduire une réclamation auprès de l&apos;<strong>Autorité de protection des données</strong> (rue de la Presse 35, 1000 Bruxelles —{" "}
              <a href="https://www.autoriteprotectiondonnees.be" target="_blank" rel="noreferrer">www.autoriteprotectiondonnees.be</a>).
            </p>
          </section>

          <section id="cookies" className="scroll-mt-6">
            <h2>Cookies et stockage local</h2>
            <p>
              Ce site n&apos;utilise <strong>aucun cookie publicitaire ni outil de mesure d&apos;audience</strong>. Il enregistre uniquement, dans votre navigateur, les
              éléments strictement nécessaires à son fonctionnement : votre session de connexion (Firebase), une copie locale de votre planning pour l&apos;usage
              hors connexion, et vos préférences d&apos;affichage (mode clair/sombre). Ces éléments étant indispensables, ils ne nécessitent pas de consentement
              (art. 129 de la loi du 13 juin 2005 relative aux communications électroniques). Vous pouvez les effacer à tout moment depuis les réglages de votre navigateur ;
              vous serez alors simplement déconnecté.
            </p>
          </section>

          <section id="conditions" className="scroll-mt-6">
            <h2>Conditions d&apos;utilisation</h2>
            <ul>
              <li>L&apos;espace client est réservé aux clients de {s.companyName}. Votre accès est personnel : ne partagez pas votre compte.</li>
              <li>Une demande de passage n&apos;est définitive qu&apos;après confirmation par {s.companyName}, notifiée par e-mail et visible dans votre espace.</li>
              <li>Les demandes et annulations doivent être faites au moins {s.minNoticeHours} heures à l&apos;avance ; en deçà, contactez-nous par téléphone.</li>
              <li>Les prestations effectuées sont facturées mensuellement, au tarif convenu pour chaque lieu. Les factures sont payables par virement dans les {s.paymentDays} jours.</li>
              <li>Vous êtes responsable de l&apos;exactitude des informations d&apos;accès communiquées (codes, consignes). Elles ne sont visibles que par vous et par {s.companyName}.</li>
              <li>Le service est fourni « en l&apos;état » ; nous mettons tout en œuvre pour qu&apos;il soit disponible, mais une interruption ponctuelle reste possible. En cas de doute sur un passage, appelez-nous.</li>
              <li>Ces conditions sont régies par le droit belge. Tout litige relève des tribunaux de l&apos;arrondissement judiciaire du Luxembourg (division Marche-en-Famenne), sans préjudice des règles protectrices du consommateur.</li>
            </ul>
          </section>
        </article>
      </main>
    </div>
  );
}
