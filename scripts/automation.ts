/**
 * Les Petites Fées — automatisations (exécutées toutes les 30 min par GitHub Actions)
 *  1. File d'e-mails (relances manuelles, invitations)
 *  2. Nouvelles demandes / annulations → e-mail aux gestionnaires
 *  3. Confirmations, refus, déplacements → e-mail aux clients (regroupés)
 *  5. Synchronisation iCal Airbnb / Booking (toutes les heures, ou sur demande)
 *  6. Relances de fin de mois (jours configurés dans les paramètres)
 *  7. Passages réguliers : création des prochaines dates (toujours 4 mois à l'avance)
 *
 * Usage local : FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run automation
 */
process.env.TZ ||= "Europe/Brussels";

import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { initAdmin } from "./lib/admin";
import { APP_URL, send, sendSms } from "./lib/mailer";
import { adminRequestsEmail, adminSignupEmail, inviteEmail, ownerUpdateEmail, reminderEmail } from "./lib/emails";
import { MAX_ICS_BYTES, isReservation, parseIcs, safeFeedUrl } from "./lib/ical";
import { extendAll } from "./lib/recurrences";
import { DEFAULT_SETTINGS, type Gite, type Mission, type Profile, type Settings } from "../src/lib/types";
import { addDays, currentPeriod, formatDate, periodBounds, periodLabel, shiftPeriod, todayISO } from "../src/lib/format";

const { db } = initAdmin();
const now = () => new Date().toISOString();

async function loadSettings(): Promise<Settings> {
  const snap = await db.doc("settings/main").get();
  return { ...DEFAULT_SETTINGS, ...(snap.data() ?? {}) } as Settings;
}

async function profiles() {
  const snap = await db.collection("profiles").get();
  return new Map(snap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as Profile]));
}

const giteMap = async () => {
  const snap = await db.collection("gites").get();
  return new Map(snap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as Gite]));
};

/* ---------------- 1. File d'e-mails ---------------- */
async function mailQueue(s: Settings, people: Map<string, Profile>) {
  const snap = await db.collection("mail").where("status", "==", "PENDING").get();
  for (const d of snap.docs) {
    const m = d.data();
    const p = people.get(m.to);
    if (m.kind === "REMINDER" && p) {
      await reminderFor(p, shiftPeriod(currentPeriod(), 1), s, d.id);
    } else if (m.kind === "INVITE" && p) {
      const [subject, email] = inviteEmail(p, s);
      await send(db, p.email, subject, email, s, "INVITE", d.id);
    } else {
      await send(db, m.to, m.subject, { title: m.subject, intro: m.text, cta: { label: "Accéder au site", url: `${APP_URL}/connexion/` } }, s, m.kind ?? "OTHER", d.id);
    }
  }
  return snap.size;
}

/* ---------------- 2. Notifications gestionnaires ---------------- */
async function notifyAdmins(s: Settings, people: Map<string, Profile>) {
  const snap = await db.collection("missions").where("notifyAdmin", "==", true).get();
  if (snap.empty) return 0;
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Mission).sort((a, b) => a.date.localeCompare(b.date));
  const created = items.filter((m) => m.status === "REQUESTED");
  const cancelled = items.filter((m) => m.status === "CANCELLED");
  const gites = await giteMap();
  for (const a of [...people.values()].filter((p) => p.role === "ADMIN" && p.active && p.notifyEmail)) {
    const [subject, email] = adminRequestsEmail(a, created, cancelled, gites, people);
    await send(db, a.email, subject, email, s, "NEW_REQUEST");
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
  const clients = profs.docs.map((d) => ({ id: d.id, ...d.data() }) as Profile);
  const places = gites.docs.map((d) => ({ id: d.id, ...d.data() }) as Gite);
  for (const a of [...people.values()].filter((p) => p.role === "ADMIN" && p.active && p.notifyEmail)) {
    const [subject, email] = adminSignupEmail(a, clients, places);
    await send(db, a.email, subject, email, s, "NEW_REQUEST");
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
  const gites = await giteMap();
  for (const [email, list] of groups) {
    const p = people.get(email);
    if (!p || !p.active || !p.notifyEmail) continue;
    list.sort((a, b) => a.date.localeCompare(b.date));
    const [subject, mail, kind] = ownerUpdateEmail(p, list, gites, s);
    await send(db, p.email, subject, mail, s, kind);
  }
  const batch = db.batch();
  snap.docs.forEach((d) => batch.update(d.ref, { notifyOwner: null }));
  await batch.commit();
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
      const url = safeFeedUrl(feed.url);
      if (!url) throw new Error("lien refusé (adresse https:// d'Airbnb, Booking… attendue)");
      const res = await fetch(url, { headers: { "User-Agent": "LesPetitesFees/1.0" }, redirect: "follow", signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (res.url && !safeFeedUrl(res.url)) throw new Error("redirection vers une adresse refusée");
      if (Number(res.headers.get("content-length") || 0) > MAX_ICS_BYTES) throw new Error("calendrier trop volumineux");
      const text = await res.text();
      if (text.length > MAX_ICS_BYTES) throw new Error("calendrier trop volumineux");
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
          if (m.date !== date && m.status !== "DONE") {
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
          ownerNote: `Départ des voyageurs (${feed.label})`, adminNote: null, price: g.price,
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
  const [subject, email, url] = reminderEmail(p, period, missing, s);
  await send(db, p.email, subject, email, s, "REMINDER", logId);
  if (p.notifySms && p.phone) await sendSms(p.phone, `${s.companyName} : vos dates de nettoyage pour ${periodLabel(period)} ? Encodez-les en 30 s : ${url}`);
  return true;
}

async function monthlyReminders(s: Settings, people: Map<string, Profile>) {
  if (!s.reminderEnabled) return null;
  const today = todayISO();
  const day = Number(today.slice(8));
  if (new Date().getHours() < 9) return null; // pas d'e-mail en pleine nuit
  const results: Record<string, number> = {};
  // Échéances atteintes et pas encore traitées ce mois-ci. S'il y en a plusieurs (les automatisations
  // n'ont pas tourné entre le 20 et le 25, par exemple), une seule relance part : la plus récente.
  const due = ([[1, s.reminderDay1], [2, s.reminderDay2]] as const).filter(([n, d]) => d && day >= d && (s.lastReminderRun ?? "") < `${today.slice(0, 7)}#${n}`);
  for (const [n] of due.slice(-1)) {
    const key = `${today.slice(0, 7)}#${n}`;
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

/* ---------------- 8. Durées de conservation (RGPD) ---------------- */
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
    reguliers: await extendAll(db),
    admins: await notifyAdmins(s, people),
    inscriptions: await newSignups(s, people),
    clients: await notifyOwners(s, people),
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
