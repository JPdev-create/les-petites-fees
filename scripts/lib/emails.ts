// Contenu des e-mails automatiques : chaque message donne toutes les infos utiles
// (quoi, où, quand, combien) et un bouton qui mène directement à la bonne page.
import type { Gite, Mission, Profile, Settings } from "../../src/lib/types";
import { capitalize, euros, formatDate, periodLabel } from "../../src/lib/format";
import { APP_URL, type Email, type EmailItem } from "./mailer";

const first = (name: string) => name.split(" ")[0];
/** « de novembre » / « d'octobre » */
const dePeriod = (period: string) => { const l = periodLabel(period); return /^[aeiouéâ]/i.test(l) ? `d'${l}` : `de ${l}`; };
const tel = (s: Settings) => s.companyPhone;

/** Adresse lisible d'un lieu */
const where = (g?: Gite) => (g ? `${g.address}${g.city ? `, ${g.postalCode ?? ""} ${g.city}`.replace(/\s+/g, " ") : ""}` : "");

/** Ligne « passage » : date en titre, puis heure · lieu · adresse */
export function visitItem(m: Mission, g?: Gite, extra?: string | null): EmailItem {
  return {
    title: capitalize(formatDate(m.date)),
    meta: [m.time ? `vers ${m.time}` : "horaire à convenir", m.giteName, where(g), m.urgent ? "⚡ urgent" : "", extra ?? ""].filter(Boolean).join(" · "),
  };
}

/* ============================ Clients ============================ */

export function inviteEmail(p: Profile, s: Settings): [string, Email] {
  return [
    `Votre espace client ${s.companyName} est prêt`,
    {
      preheader: "Planifiez vos nettoyages en 30 secondes, depuis votre téléphone ou votre ordinateur.",
      title: "Bienvenue dans votre espace ✨",
      intro: `Bonjour ${first(p.name)},`,
      lines: ["Votre espace client est prêt. Vous y planifiez vos nettoyages en quelques secondes et suivez chaque passage."],
      sections: [{
        heading: "Comment ça marche",
        tone: "neutral",
        items: [
          { title: "1. Connectez-vous en un clic", meta: `Avec le compte Google de ${p.email}, ou un lien reçu par e-mail. Aucun mot de passe.` },
          { title: "2. Ajoutez vos lieux", meta: "Adresse, accès, linge… et votre lien Airbnb / Booking : les départs de voyageurs seront planifiés automatiquement." },
          { title: "3. Touchez vos dates", meta: "Nous confirmons chaque passage par e-mail." },
        ],
      }],
      cta: { label: "Accéder à mon espace", url: `${APP_URL}/connexion/` },
      after: ["Astuce : sur votre téléphone, ajoutez l'application à votre écran d'accueil pour l'ouvrir en un geste."],
    },
  ];
}

export function ownerUpdateEmail(p: Profile, list: Mission[], gites: Map<string, Gite>, s: Settings): [string, Email, string] {
  const ok = list.filter((m) => m.notifyOwner === "CONFIRMED");
  const moved = list.filter((m) => m.notifyOwner === "MOVED");
  const ko = list.filter((m) => m.notifyOwner === "REFUSED" || m.notifyOwner === "CANCELLED");
  const onlyKo = ko.length > 0 && !ok.length && !moved.length;
  const subject = onlyKo
    ? "Réponse à votre demande de nettoyage"
    : moved.length
      ? "Votre planning de nettoyage a été mis à jour"
      : ok.length > 1
        ? `${ok.length} nettoyages confirmés ✓`
        : `Nettoyage confirmé ✓ — ${formatDate(ok[0].date, "medium")}`;
  const access = [...ok, ...moved].map((m) => gites.get(m.giteId)).filter((g): g is Gite => !!g && !g.accessInfo);
  return [
    subject,
    {
      preheader: [...ok, ...moved].map((m) => `${m.giteName} le ${formatDate(m.date, "medium")}${m.time ? ` vers ${m.time}` : ""}`).join(" · ") || "Réponse à votre demande",
      title: onlyKo ? "Réponse à votre demande" : moved.length ? "Votre planning a été mis à jour" : ok.length > 1 ? "Vos nettoyages sont confirmés" : "Votre nettoyage est confirmé",
      intro: `Bonjour ${first(p.name)},`,
      lines: [onlyKo ? "Merci pour votre demande. Malheureusement, nous ne pouvons pas assurer la date suivante :" : "C'est noté dans notre agenda, nous nous occupons de tout :"],
      sections: [
        { heading: ok.length > 1 ? "Confirmés" : "Confirmé", tone: "success", items: ok.map((m) => visitItem(m, gites.get(m.giteId))) },
        { heading: "Nouvelle date", tone: "info", items: moved.map((m) => visitItem(m, gites.get(m.giteId), m.adminNote)) },
        { heading: "Non disponible", tone: "danger", items: ko.map((m) => visitItem(m, gites.get(m.giteId), m.refuseReason)) },
      ],
      cta: onlyKo ? { label: "Choisir une autre date", url: `${APP_URL}/espace/planifier/` } : { label: "Voir mon planning", url: `${APP_URL}/espace/historique/` },
      after: [
        ...(access.length ? [`Pensez à nous indiquer comment accéder à <strong>${[...new Set(access.map((g) => g.name))].join(", ")}</strong> (code de boîte à clés, alarme…) dans « Mes lieux ».`] : []),
        onlyKo
          ? `Une autre date vous conviendrait ? Choisissez-la en un instant, ou appelez-nous au ${tel(s)}.`
          : `Un changement de programme ? Modifiez ou annulez depuis votre espace jusqu'à ${s.minNoticeHours} h avant le passage, ou appelez-nous au ${tel(s)}.`,
      ],
    },
    onlyKo ? "REFUSAL" : "CONFIRMATION",
  ];
}

export function reminderEmail(p: Profile, period: string, missing: string[], s: Settings): [string, Email, string] {
  const url = `${APP_URL}/espace/planifier/?mois=${period}`;
  return [
    `Vos dates de nettoyage pour ${periodLabel(period)} ?`,
    {
      preheader: "Encodez-les en 30 secondes, ou dites-nous qu'il n'y a pas de passage ce mois-là.",
      title: `${capitalize(periodLabel(period))} approche ✨`,
      intro: `Bonjour ${first(p.name)},`,
      lines: [`Pour bien organiser nos tournées, nous aurions besoin de vos dates de nettoyage <strong>${dePeriod(period)}</strong>.`],
      sections: [{ heading: "Planning à encoder", tone: "warning", items: missing.map((n) => ({ title: n, meta: `Aucune date reçue pour ${periodLabel(period)}` })) }],
      cta: { label: "Encoder mes dates", url },
      after: [
        "Cela prend moins de 30 secondes : touchez les jours voulus, puis « Envoyer ».",
        "Pas de passage ce mois-là ? Un seul bouton suffit pour nous le dire, et nous ne vous relancerons plus.",
      ],
    },
    url,
  ];
}

/* ============================ Gestionnaires ============================ */

export function adminRequestsEmail(a: Profile, created: Mission[], cancelled: Mission[], gites: Map<string, Gite>, people: Map<string, Profile>): [string, Email] {
  const row = (m: Mission): EmailItem => {
    const owner = people.get(m.ownerEmail);
    return {
      title: `${m.giteName} — ${capitalize(formatDate(m.date, "medium"))}${m.time ? ` · ${m.time}` : ""}`,
      meta: [
        `${m.ownerName}${owner?.phone ? ` (${owner.phone})` : ""}`,
        where(gites.get(m.giteId)),
        m.urgent ? "⚡ urgent" : "",
        m.extraLinen ? "linge supplémentaire" : "",
        m.ownerNote ? `« ${m.ownerNote} »` : "",
      ].filter(Boolean).join(" · "),
    };
  };
  const parts: string[] = [];
  if (created.length) parts.push(created.length > 1 ? `${created.length} nouvelles demandes` : "1 nouvelle demande");
  if (cancelled.length) parts.push(cancelled.length > 1 ? `${cancelled.length} annulations` : "1 annulation");
  const subject = capitalize(parts.join(" et "));
  return [
    subject,
    {
      audience: "admin",
      preheader: [...created, ...cancelled].map((m) => `${m.giteName} ${formatDate(m.date, "short")}`).join(", "),
      title: subject,
      intro: `Bonjour ${first(a.name)},`,
      lines: [created.length ? "Des clients viennent d'encoder des dates. Un clic suffit pour les confirmer :" : "Des clients ont annulé des passages :"],
      sections: [
        { heading: "À confirmer", tone: "warning", items: created.map(row) },
        { heading: "Annulé par le client", tone: "danger", items: cancelled.map(row) },
      ],
      cta: { label: created.length ? "Confirmer les demandes" : "Ouvrir le planning", url: `${APP_URL}/admin/demandes/` },
    },
  ];
}

export function adminSignupEmail(a: Profile, clients: Profile[], places: Gite[]): [string, Email] {
  return [
    places.length ? "Nouveau lieu à vérifier" : "Nouveau client inscrit",
    {
      audience: "admin",
      title: places.length ? "Un client a ajouté un lieu" : "Un nouveau client s'est inscrit",
      intro: `Bonjour ${first(a.name)},`,
      lines: places.length ? ["Vérifiez les informations et fixez le tarif du passage, puis enregistrez la fiche pour la valider."] : [],
      sections: [
        { heading: "Nouveaux clients", tone: "info", items: clients.map((p) => ({ title: `${p.name}${p.company ? ` — ${p.company}` : ""}`, meta: [p.email, p.phone, p.billingAddress?.replace(/\n/g, ", ")].filter(Boolean).join(" · ") })) },
        { heading: "Lieux à vérifier", tone: "warning", items: places.map((g) => ({ title: `${g.name} — ${g.ownerName}`, meta: `${where(g)} · ${g.bedrooms} ch., ${g.capacity} pers. · tarif provisoire ${euros(g.price)} HTVA` })) },
      ],
      cta: { label: places.length ? "Vérifier les lieux" : "Voir les clients", url: `${APP_URL}/admin/${places.length ? "lieux" : "clients"}/` },
    },
  ];
}
