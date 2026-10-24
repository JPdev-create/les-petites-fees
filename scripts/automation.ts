/**
 * Les Petites Fées — automatisations (exécutées toutes les 30 min par GitHub Actions)
 *  1. File d'e-mails (relances manuelles, invitations)
 *  2. Nouvelles demandes / annulations → e-mail aux gestionnaires
 *  3. Confirmations, refus, déplacements → e-mail aux clients (regroupés)
 *  4. Factures envoyées → e-mail au client
 *  5. Synchronisation iCal Airbnb / Booking (toutes les heures, ou sur demande)
 *  6. Relances de fin de mois (jours configurés dans les paramètres)
 *
 * Usage local : FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run automation
 */
process.env.TZ ||= "Europe/Brussels";

import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { initAdmin } from "./lib/admin";
import { APP_URL, send, sendSms } from "./lib/mailer";
import { isReservation, parseIcs } from "./lib/ical";
import { DEFAULT_SETTINGS, type Gite, type Invoice, type Mission, type Profile, type Settings } from "../src/lib/types";
import { addDays, capitalize, currentPeriod, euros, formatDate, periodBounds, periodLabel, shiftPeriod, todayISO } from "../src/lib/format";

const { db } = initAdmin();
const now = () => new Date().toISOString();
const first = (name: string) => name.split(" ")[0];

async function loadSettings(): Promise<Settings> {
  const snap = await db.doc("settings/main").get();
  return { ...DEFAULT_SETTINGS, ...(snap.data() ?? {}) } as Settings;
}

async function profiles() {
  const snap = await db.collection("profiles").get();
  return new Map(snap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as Profile]));
}

const line = (m: Mission) => `<strong>${capitalize(formatDate(m.date))}</strong>${m.time ? ` · ${m.time}` : ""} — ${m.giteName}`;

/* ---------------- 1. File d'e-mails ---------------- */
async function mailQueue(s: Settings, people: Map<string, Profile>) {
  const snap = await db.collection("mail").where("status", "==", "PENDING").get();
  for (const d of snap.docs) {
    const m = d.data();
    const p = people.get(m.to);
    if (m.kind === "REMINDER" && p) {
      await reminderFor(p, shiftPeriod(currentPeriod(), 1), s, d.id);
    } else if (m.kind === "INVITE" && p) {
      await send(db, p.email, `Votre espace ${s.companyName} est prêt`, {
        title: "Bienvenue ✨",
        intro: `Bonjour ${first(p.name)},`,
        lines: [
          `Votre espace client ${s.companyName} est prêt. Vous pouvez y encoder vos dates de nettoyage en quelques secondes, suivre vos passages et retrouver vos factures.`,
          `Connectez-vous avec le compte Google de l'adresse <strong>${p.email}</strong> (ou demandez un lien de connexion par e-mail).`,
          `Astuce : sur votre téléphone, ajoutez l'application à votre écran d'accueil pour l'ouvrir en un geste.`,
        ],
        cta: { label: "Ouvrir mon espace", url: `${APP_URL}/connexion/` },
      }, s, "INVITE", d.id);
    } else {
      await send(db, m.to, m.subject, { title: m.subject, intro: m.text }, s, m.kind ?? "OTHER", d.id);
    }
  }
  return snap.size;
}

/* ---------------- 2. Notifications gestionnaires ---------------- */
async function notifyAdmins(s: Settings, people: Map<string, Profile>) {
  const snap = await db.collection("missions").where("notifyAdmin", "==", true).get();
  if (snap.empty) return 0;
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Mission);
  const created = items.filter((m) => m.status === "REQUESTED");
  const cancelled = items.filter((m) => m.status === "CANCELLED");
  const admins = [...people.values()].filter((p) => p.role === "ADMIN" && p.active && p.notifyEmail);
  const byOwner = (list: Mission[]) => {
    const g = new Map<string, Mission[]>();
    for (const m of list) g.set(m.ownerName, [...(g.get(m.ownerName) ?? []), m]);
    return [...g.entries()].map(([o, l]) => `<strong>${o}</strong> — ${l.sort((a, b) => a.date.localeCompare(b.date)).map((m) => `${m.giteName} ${formatDate(m.date, "short")}${m.urgent ? " ⚡" : ""}`).join(", ")}`);
  };
  const parts: string[] = [];
  if (created.length) parts.push(`${created.length} nouvelle(s) demande(s)`);
  if (cancelled.length) parts.push(`${cancelled.length} annulation(s)`);
  for (const a of admins) {
    await send(db, a.email, `${capitalize(parts.join(" et "))}`, {
      title: capitalize(parts.join(" et ")),
      intro: `Bonjour ${first(a.name)},`,
      lines: [
        ...(created.length ? [`<strong>À valider :</strong>`, ...byOwner(created)] : []),
        ...(cancelled.length ? [`<strong>Annulé par le client :</strong>`, ...byOwner(cancelled)] : []),
      ],
      cta: { label: created.length ? "Valider les demandes" : "Ouvrir le planning", url: `${APP_URL}/admin/demandes/` },
    }, s, "NEW_REQUEST");
  }
  const batch = db.batch();
  snap.docs.forEach((d) => batch.update(d.ref, { notifyAdmin: false }));
  await batch.commit();
  return snap.size;
}

/* ---------------- 2b. Inscriptions et nouveaux lieux ---------------- */
async function newSignups(s: Settings, people: Map<string, Profile>) {
  const [profs, gites] = await Promise.all([
    db.collection("profiles").where("notifyAdmin", "==", true).get(),
    db.collection("gites").where("notifyAdmin", "==", true).get(),
  ]);
  if (profs.empty && gites.empty) return 0;
  const lines: string[] = [];
  for (const d of profs.docs) {
    const p = d.data() as Profile;
    lines.push(`👤 Nouveau client : <strong>${p.name}</strong>${p.company ? ` (${p.company})` : ""} — ${p.email}${p.phone ? ` — ${p.phone}` : ""}`);
  }
  for (const d of gites.docs) {
    const g = d.data() as Gite;
    lines.push(`🏡 Nouveau lieu : <strong>${g.name}</strong> — ${g.address}${g.city ? `, ${g.city}` : ""} (client : ${g.ownerName}). Tarif provisoire : ${euros(g.price)} HTVA.`);
  }
  const admins = [...people.values()].filter((p) => p.role === "ADMIN" && p.active && p.notifyEmail);
  for (const a of admins) {
    await send(db, a.email, gites.empty ? "Nouveau client inscrit" : "Nouveau lieu à vérifier", {
      title: gites.empty ? "Un nouveau client s'est inscrit" : "Nouveau lieu ajouté par un client",
      intro: `Bonjour ${first(a.name)},`,
      lines: [...lines, gites.empty ? "" : "Vérifiez les informations et fixez le tarif du passage, puis enregistrez la fiche."].filter(Boolean),
      cta: { label: gites.empty ? "Voir les clients" : "Vérifier les lieux", url: `${APP_URL}/admin/${gites.empty ? "clients" : "lieux"}/` },
    }, s, "NEW_REQUEST");
  }
  const batch = db.batch();
  [...profs.docs, ...gites.docs].forEach((d) => batch.update(d.ref, { notifyAdmin: false }));
  await batch.commit();
  return profs.size + gites.size;
}

/* ---------------- 3. Notifications clients ---------------- */
async function notifyOwners(s: Settings, people: Map<string, Profile>) {
  const snap = await db.collection("missions").where("notifyOwner", "in", ["CONFIRMED", "REFUSED", "MOVED", "CANCELLED"]).get();
  if (snap.empty) return 0;
  const groups = new Map<string, Mission[]>();
  for (const d of snap.docs) {
    const m = { id: d.id, ...d.data() } as Mission;
    groups.set(m.ownerEmail, [...(groups.get(m.ownerEmail) ?? []), m]);
  }
  for (const [email, list] of groups) {
    const p = people.get(email);
    if (!p || !p.active || !p.notifyEmail) continue;
    list.sort((a, b) => a.date.localeCompare(b.date));
    const ok = list.filter((m) => m.notifyOwner === "CONFIRMED");
    const moved = list.filter((m) => m.notifyOwner === "MOVED");
    const ko = list.filter((m) => m.notifyOwner === "REFUSED" || m.notifyOwner === "CANCELLED");
    const lines: string[] = [];
    if (ok.length) lines.push(`<strong>✅ Confirmé${ok.length > 1 ? "s" : ""}</strong>`, ...ok.map(line));
    if (moved.length) lines.push(`<strong>📅 Date modifiée</strong>`, ...moved.map((m) => `${line(m)}${m.adminNote ? ` <em>(${m.adminNote})</em>` : ""}`));
    if (ko.length) lines.push(`<strong>❌ Non disponible${ko.length > 1 ? "s" : ""}</strong>`, ...ko.map((m) => `${line(m)}${m.refuseReason ? ` — ${m.refuseReason}` : ""}`));
    const subject = ko.length && !ok.length && !moved.length ? "Votre demande de nettoyage" : moved.length ? "Votre planning de nettoyage a été mis à jour" : `Nettoyage${ok.length > 1 ? "s" : ""} confirmé${ok.length > 1 ? "s" : ""} ✓`;
    await send(db, p.email, subject, {
      title: subject,
      intro: `Bonjour ${first(p.name)},`,
      lines: [ko.length ? "Voici la réponse à vos demandes :" : "Bonne nouvelle, c'est dans l'agenda :", ...lines, ...(ko.length ? ["Une autre date vous conviendrait ? Encodez-la en un instant, ou appelez-nous."] : [])],
      cta: { label: "Voir mon planning", url: `${APP_URL}/espace/historique/` },
    }, s, ko.length ? "REFUSAL" : "CONFIRMATION");
  }
  const batch = db.batch();
  snap.docs.forEach((d) => batch.update(d.ref, { notifyOwner: null }));
  await batch.commit();
  return snap.size;
}

/* ---------------- 4. Factures ---------------- */
async function invoiceMails(s: Settings, people: Map<string, Profile>) {
  const snap = await db.collection("invoices").where("notifyOwner", "==", true).get();
  for (const d of snap.docs) {
    const inv = { id: d.id, ...d.data() } as Invoice;
    const p = people.get(inv.ownerEmail);
    if (p) {
      await send(db, p.email, `Facture ${inv.number} — ${periodLabel(inv.period)}`, {
        title: `Votre facture de ${periodLabel(inv.period)}`,
        intro: `Bonjour ${first(p.name)},`,
        lines: [
          `Votre facture <strong>${inv.number}</strong> d'un montant de <strong>${euros(inv.totalTTC)} TVAC</strong> (${inv.lines.length} passage${inv.lines.length > 1 ? "s" : ""}) est disponible dans votre espace.`,
          `Échéance : ${formatDate(inv.dueDate.slice(0, 10))}.${s.iban ? ` IBAN : ${s.iban}.` : ""}`,
          "Merci pour votre confiance !",
        ],
        cta: { label: "Voir et télécharger la facture", url: `${APP_URL}/espace/facture/?id=${inv.id}` },
      }, s, "INVOICE");
    }
    await d.ref.update({ notifyOwner: false });
  }
  return snap.size;
}

/* ---------------- 5. Synchronisation iCal ---------------- */
async function syncGite(g: Gite, s: Settings) {
  const today = todayISO();
  const horizon = addDays(today, 365);
  const seen = new Set<string>();
  const errors: string[] = [];
  let created = 0, moved = 0, cancelled = 0;

  for (const feed of g.icalFeeds ?? []) {
    try {
      const res = await fetch(feed.url, { headers: { "User-Agent": "LesPetitesFees/1.0" }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!text.includes("BEGIN:VCALENDAR")) throw new Error("ce lien n'est pas un calendrier iCal");
      for (const ev of parseIcs(text).filter(isReservation)) {
        const date = ev.end; // jour du départ = jour du nettoyage
        if (date < today || date > horizon) continue;
        const uid = `${feed.label}:${ev.uid}`.slice(0, 300);
        seen.add(uid);
        const existing = await db.collection("missions").where("giteId", "==", g.id).where("icalUid", "==", uid).limit(1).get();
        if (!existing.empty) {
          const doc = existing.docs[0];
          const m = doc.data() as Mission;
          if (m.date !== date && m.status !== "DONE" && !m.invoiceId) {
            await doc.ref.update({ date, notifyOwner: m.status === "CONFIRMED" ? "MOVED" : null, adminNote: `Déplacé par ${feed.label} (avant : ${formatDate(m.date, "short")})`, updatedAt: now() });
            moved++;
          }
          continue;
        }
        const sameDay = await db.collection("missions").where("giteId", "==", g.id).where("date", "==", date).get();
        if (sameDay.docs.some((d) => !["CANCELLED", "REFUSED"].includes(d.data().status))) continue;
        await db.collection("missions").add({
          giteId: g.id, giteName: g.name, giteColor: g.color, ownerEmail: g.ownerEmail, ownerName: g.ownerName,
          date, time: g.defaultTime || null, status: s.icalAutoConfirm ? "CONFIRMED" : "REQUESTED", source: "ICAL",
          icalUid: uid, icalSource: feed.label, urgent: ev.start === date, extraLinen: false,
          ownerNote: `Départ des voyageurs (${feed.label})`, adminNote: null, price: g.price, invoiceId: null,
          notifyAdmin: !s.icalAutoConfirm, notifyOwner: null, createdAt: now(), updatedAt: now(),
        });
        created++;
      }
    } catch (e) {
      errors.push(`${feed.label} : ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Réservations disparues → passage annulé (seulement si tous les flux ont répondu)
  if (!errors.length && g.icalFeeds?.length) {
    const future = await db.collection("missions").where("giteId", "==", g.id).where("source", "==", "ICAL").get();
    for (const d of future.docs) {
      const m = d.data() as Mission;
      if (m.date >= today && (m.status === "CONFIRMED" || m.status === "REQUESTED") && m.icalUid && !seen.has(m.icalUid)) {
        await d.ref.update({ status: "CANCELLED", adminNote: "Réservation annulée sur la plateforme", updatedAt: now() });
        cancelled++;
      }
    }
  }
  await db.collection("gites").doc(g.id).update({ icalLastSync: now(), icalLastError: errors.length ? errors.join(" · ").slice(0, 400) : null });
  if (created || moved || cancelled) {
    await db.collection("activity").add({ at: now(), by: "Synchro iCal", message: `${g.name} : ${created} ajouté(s), ${moved} déplacé(s), ${cancelled} annulé(s)` });
  }
  return { created, moved, cancelled, errors: errors.length };
}

async function icalSync(s: Settings, force: boolean) {
  const lastRun = (await db.doc("settings/main").get()).data()?.lastIcalRun as string | undefined;
  if (!force && lastRun && Date.now() - new Date(lastRun).getTime() < 55 * 60_000) return null;
  const snap = await db.collection("gites").where("active", "==", true).get();
  const total = { created: 0, moved: 0, cancelled: 0, errors: 0 };
  for (const d of snap.docs) {
    const g = { id: d.id, ...d.data() } as Gite;
    if (!g.icalFeeds?.length) continue;
    const r = await syncGite(g, s);
    total.created += r.created; total.moved += r.moved; total.cancelled += r.cancelled; total.errors += r.errors;
  }
  await db.doc("settings/main").set({ lastIcalRun: now(), syncRequestedAt: null }, { merge: true });
  return total;
}

/* ---------------- 6. Relances de fin de mois ---------------- */
async function reminderFor(p: Profile, period: string, s: Settings, logId?: string) {
  const { from, to } = periodBounds(period);
  const [gites, subs, missions] = await Promise.all([
    db.collection("gites").where("ownerEmail", "==", p.id).where("active", "==", true).get(),
    db.collection("submissions").where("ownerEmail", "==", p.id).where("period", "==", period).get(),
    db.collection("missions").where("ownerEmail", "==", p.id).where("date", ">=", from).where("date", "<=", to).get(),
  ]);
  const done = new Set([...subs.docs.map((d) => d.data().giteId), ...missions.docs.filter((d) => !["CANCELLED", "REFUSED"].includes(d.data().status)).map((d) => d.data().giteId)]);
  const missing = gites.docs.filter((d) => !done.has(d.id)).map((d) => d.data().name as string);
  if (!missing.length) {
    if (logId) await db.collection("mail").doc(logId).update({ status: "SENT", subject: "Relance inutile : planning déjà transmis", sentAt: now() });
    return false;
  }
  const url = `${APP_URL}/espace/planifier/?mois=${period}`;
  await send(db, p.email, `Vos dates de nettoyage pour ${periodLabel(period)} ?`, {
    title: `${capitalize(periodLabel(period))} approche ✨`,
    intro: `Bonjour ${first(p.name)},`,
    lines: [
      `Nous n'avons pas encore reçu vos dates de nettoyage de <strong>${periodLabel(period)}</strong> pour : <strong>${missing.join(", ")}</strong>.`,
      `Cela prend moins de 30 secondes : touchez les jours voulus, puis « Envoyer ». Pas de passage ce mois-là ? Un seul bouton suffit pour nous le dire.`,
    ],
    cta: { label: "Encoder mes dates", url },
  }, s, "REMINDER", logId);
  if (p.notifySms && p.phone) await sendSms(p.phone, `${s.companyName} : vos dates de nettoyage pour ${periodLabel(period)} ? Encodez-les en 30 s : ${url}`);
  return true;
}

async function monthlyReminders(s: Settings, people: Map<string, Profile>) {
  if (!s.reminderEnabled) return null;
  const today = todayISO();
  const day = Number(today.slice(8));
  if (new Date().getHours() < 9) return null; // pas d'e-mail en pleine nuit
  const results: Record<string, number> = {};
  for (const [n, d] of [[1, s.reminderDay1], [2, s.reminderDay2]] as const) {
    const key = `${today.slice(0, 7)}#${n}`;
    if (!d || day < d || (s.lastReminderRun ?? "") >= key) continue;
    await db.doc("settings/main").set({ lastReminderRun: key }, { merge: true });
    s.lastReminderRun = key;
    let sent = 0;
    for (const p of people.values()) {
      if (p.role !== "OWNER" || !p.active) continue;
      if (await reminderFor(p, shiftPeriod(currentPeriod(), 1), s)) sent++;
    }
    results[`relance${n}`] = sent;
    if (sent) await db.collection("activity").add({ at: now(), by: "Automatique", message: `${sent} relance(s) envoyée(s) pour ${periodLabel(shiftPeriod(currentPeriod(), 1))}` });
  }
  return results;
}

/* ---------------- 7. Durées de conservation (RGPD) ---------------- */
async function purge() {
  const limit = new Date(Date.now() - 365 * 86400000).toISOString();
  let n = 0;
  for (const [name, field] of [["mail", "createdAt"], ["activity", "at"]] as const) {
    const old = await db.collection(name).where(field, "<", limit).limit(400).get();
    if (old.empty) continue;
    const batch = db.batch();
    old.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    n += old.size;
  }
  return n;
}

/* ---------------- Exécution ---------------- */
async function main() {
  const started = Date.now();
  const s = await loadSettings();
  const people = await profiles();
  const force = !!s.syncRequestedAt || process.argv.includes("--sync");
  const report = {
    file: await mailQueue(s, people),
    ical: await icalSync(s, force),
    admins: await notifyAdmins(s, people),
    inscriptions: await newSignups(s, people),
    clients: await notifyOwners(s, people),
    factures: await invoiceMails(s, people),
    relances: await monthlyReminders(s, people),
    purge: await purge(),
  };
  await db.doc("settings/main").set({ lastAutomationRun: now(), automationRuns: FieldValue.increment(1) }, { merge: true });
  console.log(`✓ Automatisations terminées en ${((Date.now() - started) / 1000).toFixed(1)} s`, JSON.stringify(report));
}

main().catch((e) => {
  console.error("✗ Échec des automatisations :", e);
  process.exit(1);
});

export type { Firestore };
