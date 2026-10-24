"use client";

import {
  addDoc, collection, deleteDoc, doc, getDocs, query, runTransaction, setDoc, updateDoc, where, writeBatch,
} from "firebase/firestore";
import { sendSignInLinkToEmail } from "firebase/auth";
import { fb, absoluteUrl } from "./firebase";
import { formatDate, periodBounds, periodLabel, periodOf } from "./format";
import type { Gite, Invoice, Mission, MissionStatus, Profile, Settings } from "./types";
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

export type RequestEntry = { date: string; time?: string | null; note?: string; urgent?: boolean; extraLinen?: boolean };

/** Crée les demandes du client et marque les mois concernés comme « encodés ». */
export async function ownerRequestDates(owner: Profile, gite: Gite, entries: RequestEntry[]) {
  const batch = writeBatch(db());
  const t = now();
  for (const e of entries) {
    batch.set(doc(collection(db(), "missions")), {
      giteId: gite.id, giteName: gite.name, giteColor: gite.color, ownerEmail: owner.id, ownerName: owner.name,
      date: e.date, time: e.time || gite.defaultTime || null, status: "REQUESTED", source: "OWNER",
      urgent: !!e.urgent, extraLinen: !!e.extraLinen, ownerNote: e.note?.trim() || null,
      price: gite.price, invoiceId: null, notifyAdmin: true, createdAt: t, updatedAt: t,
    });
  }
  for (const period of new Set(entries.map((e) => periodOf(e.date)))) {
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

export async function moveMission(m: Mission, date: string, time: string | null, by: string, note?: string) {
  await updateDoc(doc(db(), "missions", m.id), {
    date, time, status: "CONFIRMED", notifyOwner: "MOVED", notifyAdmin: false, updatedAt: now(),
    adminNote: note ?? m.adminNote ?? null,
  });
  await log(by, `${m.giteName} : passage déplacé du ${formatDate(m.date, "short")} au ${formatDate(date, "short")}`);
}

export async function updateMission(id: string, patch: Partial<Mission>) {
  await updateDoc(doc(db(), "missions", id), { ...patch, updatedAt: now() });
}

export async function deleteMission(id: string) {
  await deleteDoc(doc(db(), "missions", id));
}

export async function adminCreateMissions(gite: Gite, dates: string[], opts: { time?: string | null; status: MissionStatus; note?: string; notify: boolean }, by: string) {
  const batch = writeBatch(db());
  const t = now();
  for (const date of dates) {
    batch.set(doc(collection(db(), "missions")), {
      giteId: gite.id, giteName: gite.name, giteColor: gite.color, ownerEmail: gite.ownerEmail, ownerName: gite.ownerName,
      date, time: opts.time || gite.defaultTime || null, status: opts.status, source: "ADMIN",
      urgent: false, extraLinen: false, ownerNote: null, adminNote: opts.note?.trim() || null,
      price: gite.price, invoiceId: null, notifyAdmin: false, notifyOwner: opts.notify && opts.status === "CONFIRMED" ? "CONFIRMED" : null,
      createdAt: t, updatedAt: t, doneAt: opts.status === "DONE" ? t : null,
    });
  }
  await batch.commit();
  await log(by, `${dates.length} passage(s) ajouté(s) pour ${gite.name}`);
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
      if (m.status === "DONE" || m.invoiceId) continue;
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
    if (!m.invoiceId && m.status !== "DONE") batch.delete(d.ref);
  });
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

/* ------------------------------ Factures ------------------------------ */

/**
 * Génère une facture par client pour les passages effectués du mois et pas encore facturés.
 * Numérotation continue par année (obligation légale), sécurisée par transaction.
 */
export async function generateInvoices(period: string, missions: Mission[], profiles: Profile[], settings: Settings, by: string, ownerEmail?: string) {
  const { from, to } = periodBounds(period);
  const todo = missions.filter((m) => m.status === "DONE" && !m.invoiceId && m.date >= from && m.date <= to && (!ownerEmail || m.ownerEmail === ownerEmail));
  const groups = new Map<string, Mission[]>();
  for (const m of todo) groups.set(m.ownerEmail, [...(groups.get(m.ownerEmail) ?? []), m]);
  if (!groups.size) return 0;

  const year = new Date().getFullYear().toString();
  const settingsRef = doc(db(), "settings", "main");
  const startSeq = await runTransaction(db(), async (tx) => {
    const snap = await tx.get(settingsRef);
    const s = { ...DEFAULT_SETTINGS, ...(snap.data() ?? {}) } as Settings;
    const cur = s.invoiceSeq?.[year] ?? 0;
    tx.set(settingsRef, { invoiceSeq: { ...(s.invoiceSeq ?? {}), [year]: cur + groups.size } }, { merge: true });
    return cur;
  });

  const batch = writeBatch(db());
  let i = 0;
  const issue = new Date();
  const due = new Date(Date.now() + settings.paymentDays * 86400000);
  for (const [email, list] of groups) {
    i++;
    const owner = profiles.find((p) => p.id === email);
    list.sort((a, b) => a.date.localeCompare(b.date));
    const lines = list.map((m) => ({
      label: `Nettoyage « ${m.giteName} » — ${formatDate(m.date)}${m.extraLinen ? " (avec linge supplémentaire)" : ""}`,
      quantity: 1, unitPrice: m.price, total: m.price,
    }));
    const totalHT = lines.reduce((a, l) => a + l.total, 0);
    const vatRate = settings.vatFranchise ? 0 : settings.vatRate;
    const totalVAT = Math.round((totalHT * vatRate) / 100);
    const ref = doc(collection(db(), "invoices"));
    const invoice: Omit<Invoice, "id"> = {
      number: `${settings.invoicePrefix}${year}-${String(startSeq + i).padStart(4, "0")}`,
      ownerEmail: email, ownerName: owner?.name ?? list[0].ownerName, ownerCompany: owner?.company ?? "",
      ownerAddress: owner?.billingAddress ?? "", ownerVat: owner?.vatNumber ?? "",
      period, issueDate: issue.toISOString(), dueDate: due.toISOString(), vatRate,
      lines, totalHT, totalVAT, totalTTC: totalHT + totalVAT, status: "DRAFT", missionIds: list.map((m) => m.id),
    };
    batch.set(ref, invoice);
    list.forEach((m) => batch.update(doc(db(), "missions", m.id), { invoiceId: ref.id }));
  }
  await batch.commit();
  await log(by, `${groups.size} facture(s) générée(s) pour ${periodLabel(period)}`);
  return groups.size;
}

export async function updateInvoice(id: string, patch: Partial<Invoice>) {
  await updateDoc(doc(db(), "invoices", id), patch);
}

export async function deleteInvoice(inv: Invoice, by: string) {
  const batch = writeBatch(db());
  inv.missionIds.forEach((mid) => batch.update(doc(db(), "missions", mid), { invoiceId: null }));
  batch.delete(doc(db(), "invoices", inv.id));
  await batch.commit();
  await log(by, `Facture ${inv.number} supprimée (passages libérés)`);
}

/* ------------------------------ Divers ------------------------------ */

export async function saveSettings(patch: Partial<Settings>) {
  await setDoc(doc(db(), "settings", "main"), patch, { merge: true });
}

export async function queueMail(to: string, subject: string, text: string, kind = "OTHER") {
  await addDoc(collection(db(), "mail"), { to, subject, text, kind, status: "PENDING", createdAt: now() });
}
