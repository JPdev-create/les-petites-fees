"use client";

import {
  addDoc, collection, deleteDoc, doc, getDocs, query, runTransaction, setDoc, updateDoc, where, writeBatch,
} from "firebase/firestore";
import { sendSignInLinkToEmail } from "firebase/auth";
import { fb, absoluteUrl } from "./firebase";
import { addDays, euros, formatDate, periodBounds, periodLabel, periodOf, todayISO } from "./format";
import { durationLabel } from "./pricing";
import { HORIZON_DAYS, isUntouchedOccurrence, occurrenceId, occurrenceMission, occurrences, recurrenceLabel } from "./recurrence";
import type { Gite, Mission, MissionStatus, Profile, Recurrence, Settings } from "./types";
import { DEFAULT_SETTINGS } from "./types";

const now = () => new Date().toISOString();
const db = () => fb().db;

export async function log(by: string, message: string) {
  await addDoc(collection(db(), "activity"), { at: now(), by, message }).catch(() => {});
}

/* ======================= Connexion par lien magique ======================= */

export async function sendLoginLink(email: string, next = "") {
  const url = absoluteUrl(`/auth/lien/${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  await sendSignInLinkToEmail(fb().auth, email.trim().toLowerCase(), { url, handleCodeInApp: true });
}

/* ============================ Côté client ============================ */

export type RequestEntry = { date: string; dateTo?: string | null; time?: string | null; note?: string; urgent?: boolean; extraLinen?: boolean };

/** Crée les demandes du client et marque les mois concernés comme « encodés ». */
export async function ownerRequestDates(owner: Profile, gite: Gite, entries: RequestEntry[]) {
  const batch = writeBatch(db());
  const t = now();
  for (const e of entries) {
    batch.set(doc(collection(db(), "missions")), {
      giteId: gite.id, giteName: gite.name, giteColor: gite.color, ownerEmail: owner.id, ownerName: owner.name,
      date: e.date, dateTo: e.dateTo && e.dateTo > e.date ? e.dateTo : null, time: e.time || gite.defaultTime || null, status: "REQUESTED", source: "OWNER",
      urgent: !!e.urgent, extraLinen: !!e.extraLinen, ownerNote: e.note?.trim() || null,
      price: gite.price, notifyAdmin: true, createdAt: t, updatedAt: t,
    });
  }
  for (const period of new Set(entries.flatMap((e) => [periodOf(e.date), periodOf(e.dateTo || e.date)]))) {
    batch.set(doc(db(), "submissions", `${gite.id}_${period}`), { giteId: gite.id, ownerEmail: owner.id, period, empty: false, submittedAt: t });
  }
  await batch.commit();
}

export async function declareEmptyMonth(owner: Profile, gite: Gite, period: string) {
  await setDoc(doc(db(), "submissions", `${gite.id}_${period}`), { giteId: gite.id, ownerEmail: owner.id, period, empty: true, submittedAt: now() });
}

export async function undoEmptyMonth(giteId: string, period: string) {
  await deleteDoc(doc(db(), "submissions", `${giteId}_${period}`));
}

export async function ownerCancel(m: Mission) {
  await updateDoc(doc(db(), "missions", m.id), { status: "CANCELLED", cancelledBy: "OWNER", notifyAdmin: true, updatedAt: now() });
}

export async function ownerUpdateRequest(m: Mission, patch: Partial<Pick<Mission, "date" | "time" | "ownerNote" | "urgent" | "extraLinen">>) {
  await updateDoc(doc(db(), "missions", m.id), { ...patch, notifyAdmin: true, updatedAt: now() });
}

/* ============================ Côté gestionnaire ============================ */

export async function setMissionsStatus(ids: string[], status: MissionStatus, by: string, extra: Record<string, unknown> = {}) {
  const batch = writeBatch(db());
  const t = now();
  for (const id of ids) {
    const notify = status === "CONFIRMED" || status === "REFUSED" || status === "CANCELLED" ? status : null;
    batch.update(doc(db(), "missions", id), {
      status, updatedAt: t, notifyAdmin: false,
      ...(notify ? { notifyOwner: notify } : {}),
      ...(status === "DONE" ? { doneAt: t } : {}),
      ...extra,
    });
  }
  await batch.commit();
  const labels: Record<string, string> = { CONFIRMED: "confirmé", REFUSED: "refusé", DONE: "marqué effectué", CANCELLED: "annulé", REQUESTED: "remis en attente" };
  await log(by, `${ids.length} passage(s) ${labels[status] ?? status}`);
}

/**
 * Marque des passages comme effectués. Au tarif horaire, le prix devient
 * durée réelle × tarif (durée fournie, sinon déjà saisie, sinon l'estimation du lieu).
 */
export async function completeMissions(list: { m: Mission; workedMin?: number }[], gites: Map<string, Gite>, by: string) {
  const batch = writeBatch(db());
  const t = now();
  for (const { m, workedMin } of list) {
    const g = gites.get(m.giteId);
    const hourly = g?.pricingMode === "HOURLY" && (g.hourlyRate ?? 0) > 0;
    const minutes = workedMin ?? m.workedMin ?? g?.durationMin ?? 0;
    batch.update(doc(db(), "missions", m.id), {
      status: "DONE", doneAt: m.doneAt ?? t, updatedAt: t, notifyAdmin: false,
      ...(hourly ? { workedMin: minutes, hourlyRate: g!.hourlyRate, price: Math.round((g!.hourlyRate! * minutes) / 60) } : {}),
    });
  }
  await batch.commit();
  await log(by, `${list.length} passage(s) marqué(s) effectué(s)`);
}

export async function moveMission(m: Mission, date: string, time: string | null, by: string, note?: string) {
  await updateDoc(doc(db(), "missions", m.id), {
    date, dateTo: null, time, status: "CONFIRMED", notifyOwner: "MOVED", notifyAdmin: false, updatedAt: now(),
    adminNote: note ?? m.adminNote ?? null,
    ...(m.recurrenceId ? { recurrenceException: true } : {}),
  });
  await log(by, `${m.giteName} : passage déplacé du ${formatDate(m.date, "short")} au ${formatDate(date, "short")}`);
}

/** Demande « entre … et … » : le gestionnaire fixe le jour, le client reçoit la confirmation. */
export async function confirmOnDate(m: Mission, date: string, time: string | null, by: string) {
  await updateDoc(doc(db(), "missions", m.id), {
    date, dateTo: null, time, status: "CONFIRMED", notifyOwner: "CONFIRMED", notifyAdmin: false, updatedAt: now(),
  });
  await log(by, `${m.giteName} : confirmé le ${formatDate(date, "short")} (période demandée : ${formatDate(m.date, "short")} → ${formatDate(m.dateTo ?? m.date, "short")})`);
}

export async function updateMission(id: string, patch: Partial<Mission>) {
  await updateDoc(doc(db(), "missions", id), { ...patch, updatedAt: now() });
}

export async function deleteMission(id: string) {
  const batch = writeBatch(db());
  batch.delete(doc(db(), "missions", id));
  batch.delete(doc(db(), "missionNotes", id));
  await batch.commit();
}

/** Note interne d'un passage : stockée à part, car le client peut lire ses passages. */
export async function saveMissionNote(id: string, text: string, by: string) {
  const ref = doc(db(), "missionNotes", id);
  if (text.trim()) await setDoc(ref, { text: text.trim(), by, updatedAt: now() });
  else await deleteDoc(ref);
}

export async function adminCreateMissions(gite: Gite, dates: string[], opts: { time?: string | null; status: MissionStatus; note?: string; notify: boolean }, by: string) {
  const batch = writeBatch(db());
  const t = now();
  for (const date of dates) {
    const ref = doc(collection(db(), "missions"));
    batch.set(ref, {
      giteId: gite.id, giteName: gite.name, giteColor: gite.color, ownerEmail: gite.ownerEmail, ownerName: gite.ownerName,
      date, time: opts.time || gite.defaultTime || null, status: opts.status, source: "ADMIN",
      urgent: false, extraLinen: false, ownerNote: null, adminNote: null,
      price: gite.price, notifyAdmin: false, notifyOwner: opts.notify && opts.status === "CONFIRMED" ? "CONFIRMED" : null,
      createdAt: t, updatedAt: t, doneAt: opts.status === "DONE" ? t : null,
    });
    if (opts.note?.trim()) batch.set(doc(db(), "missionNotes", ref.id), { text: opts.note.trim(), by, updatedAt: t });
  }
  await batch.commit();
  await log(by, `${dates.length} passage(s) ajouté(s) pour ${gite.name}`);
}

/* ------------------------- Passages réguliers ------------------------- */

const horizon = () => addDays(todayISO(), HORIZON_DAYS);

/** Jours où le lieu a déjà un passage hors série (demande du client, iCal, ajout manuel) : pas de doublon. */
async function manualDates(giteId: string, from: string, to: string) {
  const snap = await getDocs(query(collection(db(), "missions"), where("giteId", "==", giteId), where("date", ">=", from), where("date", "<=", to)));
  return new Set(snap.docs.map((d) => d.data() as Mission).filter((m) => !m.recurrenceId && m.status !== "CANCELLED" && m.status !== "REFUSED").map((m) => m.date));
}

/**
 * Prolonge une série jusqu'à l'horizon (passages créés à partir du lendemain de `generatedUntil`).
 * Transaction : si un autre appareil ou l'automatisation l'a déjà fait, rien n'est créé deux fois.
 */
export async function extendRecurrence(r: Recurrence, gite: Gite) {
  const until = horizon();
  if (!r.active || (r.generatedUntil ?? "") >= until) return 0;
  const from = r.generatedUntil && r.generatedUntil >= todayISO() ? addDays(r.generatedUntil, 1) : todayISO();
  const skip = await manualDates(gite.id, from, until);
  return runTransaction(db(), async (tx) => {
    const ref = doc(db(), "recurrences", r.id);
    const fresh = await tx.get(ref);
    if (!fresh.exists() || (fresh.data().generatedUntil ?? "") !== (r.generatedUntil ?? "")) return 0;
    const t = now();
    const list = occurrences(r, from, until).filter((o) => !skip.has(o.date));
    for (const o of list) tx.set(doc(db(), "missions", occurrenceId(r.id, o.date)), occurrenceMission(r, gite, o, t));
    tx.update(ref, { generatedUntil: until });
    return list.length;
  });
}

/**
 * Recalcule les passages à venir d'une série (création ou modification de la règle).
 * Les passages déjà déplacés, annulés ou effectués sont conservés tels quels.
 */
async function regenerate(r: Recurrence, gite: Gite) {
  const today = todayISO();
  const until = horizon();
  const snap = await getDocs(query(collection(db(), "missions"), where("recurrenceId", "==", r.id)));
  const batch = writeBatch(db());
  const kept = new Set<string>();
  const stale = new Set<string>();
  for (const d of snap.docs) {
    const m = { id: d.id, ...d.data() } as Mission;
    if ((m.occurrenceDate ?? m.date) < today) continue;
    if (isUntouchedOccurrence(m)) stale.add(d.id);
    else kept.add(m.occurrenceDate ?? m.date);
  }
  const skip = await manualDates(gite.id, today, until);
  const t = now();
  const list = r.active ? occurrences(r, today, until).filter((o) => !kept.has(o.date) && !skip.has(o.date)) : [];
  for (const o of list) {
    const oid = occurrenceId(r.id, o.date);
    stale.delete(oid);
    batch.set(doc(db(), "missions", oid), occurrenceMission(r, gite, o, t));
  }
  for (const oid of stale) batch.delete(doc(db(), "missions", oid));
  batch.update(doc(db(), "recurrences", r.id), { generatedUntil: r.active ? until : null });
  await batch.commit();
  return list.length;
}

export type RecurrenceInput = Omit<Recurrence, "id" | "generatedUntil" | "createdAt" | "updatedAt">;

export async function saveRecurrence(data: RecurrenceInput, id: string | null, gite: Gite, by: string) {
  const t = now();
  const clean = { ...data, variants: (data.variants ?? []).map((v) => v.trim()).filter(Boolean), note: data.note?.trim() || null, time: data.time || null, endDate: data.endDate || null };
  let recId = id;
  if (recId) await updateDoc(doc(db(), "recurrences", recId), { ...clean, updatedAt: t });
  else recId = (await addDoc(collection(db(), "recurrences"), { ...clean, generatedUntil: null, createdAt: t, updatedAt: t })).id;
  const n = await regenerate({ ...clean, id: recId, generatedUntil: null }, gite);
  await log(by, `${gite.name} : passage régulier ${id ? "modifié" : "ajouté"} (${recurrenceLabel(clean)}) — ${n} passage(s) planifié(s)`);
  return n;
}

/** Supprime la série et ses passages à venir non modifiés (l'historique est conservé). */
export async function deleteRecurrence(r: Recurrence, giteName: string, by: string) {
  const today = todayISO();
  const snap = await getDocs(query(collection(db(), "missions"), where("recurrenceId", "==", r.id)));
  const batch = writeBatch(db());
  for (const d of snap.docs) {
    const m = { id: d.id, ...d.data() } as Mission;
    if (m.date >= today && isUntouchedOccurrence(m)) batch.delete(d.ref);
  }
  batch.delete(doc(db(), "recurrences", r.id));
  await batch.commit();
  await log(by, `${giteName} : passage régulier supprimé (${recurrenceLabel(r)})`);
}

/* ------------------------------ Gîtes ------------------------------ */

export async function saveGite(data: Omit<Gite, "id">, id: string | null, by: string) {
  const t = now();
  if (id) {
    await updateDoc(doc(db(), "gites", id), { ...data, pendingReview: false, updatedAt: t });
    // Garde les infos dénormalisées des passages à venir à jour
    const snap = await getDocs(query(collection(db(), "missions"), where("giteId", "==", id)));
    const batch = writeBatch(db());
    let n = 0;
    for (const d of snap.docs) {
      const m = d.data() as Mission;
      if (m.status === "DONE") continue;
      if (m.giteName !== data.name || m.giteColor !== data.color || m.ownerEmail !== data.ownerEmail) {
        batch.update(d.ref, { giteName: data.name, giteColor: data.color, ownerEmail: data.ownerEmail, ownerName: data.ownerName });
        n++;
      }
    }
    if (n) await batch.commit();
    await log(by, `Fiche « ${data.name} » mise à jour`);
    return id;
  }
  const ref = await addDoc(collection(db(), "gites"), { ...data, createdAt: t, updatedAt: t });
  await log(by, `Nouveau lieu : ${data.name}`);
  return ref.id;
}

export async function selfSignup(email: string, data: Pick<Profile, "name" | "phone" | "company" | "billingAddress" | "vatNumber">) {
  const id = email.toLowerCase();
  await setDoc(doc(db(), "profiles", id), {
    ...data, email: id, role: "OWNER", active: true, notifyEmail: true, notifySms: false, notifyAdmin: true,
    createdAt: now(), lastLoginAt: now(),
  });
}

export type OwnerGiteInput = Pick<Gite, "name" | "kind" | "address" | "postalCode" | "city" | "accessInfo" | "notes" | "bedrooms" | "bathrooms" | "capacity" | "bedSets" | "towelSets" | "defaultTime" | "icalFeeds">;

/** Le client ajoute un lieu : tarif par défaut, à vérifier par le gestionnaire. */
export async function ownerCreateGite(owner: Profile, data: OwnerGiteInput, settings: Settings, color: string) {
  const t = now();
  const ref = await addDoc(collection(db(), "gites"), {
    ...data, ownerEmail: owner.id, ownerName: owner.name, price: settings.defaultPrice, durationMin: 120,
    color, active: true, pendingReview: true, notifyAdmin: true, createdAt: t, updatedAt: t,
  });
  return ref.id;
}

export async function ownerSaveGite(id: string, patch: Partial<Gite>) {
  await updateDoc(doc(db(), "gites", id), { ...patch, updatedAt: now() });
}

export async function deleteGite(g: Gite, by: string) {
  const snap = await getDocs(query(collection(db(), "missions"), where("giteId", "==", g.id)));
  const batch = writeBatch(db());
  snap.docs.forEach((d) => {
    const m = d.data() as Mission;
    if (m.status !== "DONE") batch.delete(d.ref);
  });
  const series = await getDocs(query(collection(db(), "recurrences"), where("giteId", "==", g.id)));
  series.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db(), "gites", g.id));
  await batch.commit();
  await log(by, `Lieu supprimé : ${g.name}`);
}

/* ------------------------------ Clients ------------------------------ */

export async function saveProfile(data: Omit<Profile, "id">, by: string, isNew: boolean) {
  const id = data.email.trim().toLowerCase();
  const payload = { ...data, email: id };
  if (isNew) await setDoc(doc(db(), "profiles", id), { ...payload, createdAt: now() });
  else await updateDoc(doc(db(), "profiles", id), payload);
  await log(by, `${isNew ? "Nouveau" : "Mise à jour"} ${data.role === "ADMIN" ? "gestionnaire" : "client"} : ${data.name}`);
}

export async function ownerSaveProfile(id: string, patch: Partial<Profile>) {
  await updateDoc(doc(db(), "profiles", id), patch);
}

export async function deleteProfile(p: Profile, by: string) {
  await deleteDoc(doc(db(), "profiles", p.id));
  await log(by, `Compte supprimé : ${p.name}`);
}

/* ------------------------------ Divers ------------------------------ */

export async function saveSettings(patch: Partial<Settings>) {
  await setDoc(doc(db(), "settings", "main"), patch, { merge: true });
}

export async function queueMail(to: string, subject: string, text: string, kind = "OTHER") {
  await addDoc(collection(db(), "mail"), { to, subject, text, kind, status: "PENDING", createdAt: now() });
}
