// Envoi du planning vers la Pointeuse LPF (autre projet Firebase : pointeuse-lpf).
// Les passages confirmés des Petites Fées deviennent des lignes du planning de la pointeuse
// (collection « planning ») ; l'équipe y est toujours assignée par le gestionnaire dans la pointeuse.
import { createHash } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { addDays, toISODate, todayISO } from "../../src/lib/format";
import { missionTitle } from "../../src/lib/recurrence";
import type { Gite, Mission } from "../../src/lib/types";

/** Semaines envoyées à l'avance dans la pointeuse */
export const POINTEUSE_WEEKS = 6;

/** Base de la pointeuse, ou null si la clé n'est pas configurée (POINTEUSE_SERVICE_ACCOUNT). */
export function initPointeuse(): Firestore | null {
  const existing = getApps().find((a) => a.name === "pointeuse");
  if (existing) return getFirestore(existing);
  const raw = process.env.POINTEUSE_SERVICE_ACCOUNT;
  if (process.env.POINTEUSE_EMULATOR) return getFirestore(initializeApp({ projectId: "demo-pointeuse" }, "pointeuse"));
  if (!raw) return null;
  const account = parseServiceAccount(raw);
  try {
    return getFirestore(initializeApp({ credential: cert(account) }, "pointeuse"));
  } catch (e) {
    throw new Error(`Clé POINTEUSE_SERVICE_ACCOUNT abîmée (${describeKeyShape(account.private_key)}). Recollez le fichier .json depuis un ordinateur. Détail : ${e instanceof Error ? e.message : e}`);
  }
}

/**
 * Reconstruit une clé privée PEM abîmée : « \n » écrits en texte ou réels, espaces, caractères parasites,
 * « n » orphelins en fin de ligne (barre oblique perdue au copier-coller). Les clés Google font 64 caractères par ligne.
 */
export function repairPrivateKey(key: string): string {
  const m = key.match(/-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/);
  if (!m) return key.replace(/\\n/g, "\n");
  const label = m[1];
  // Lignes telles que collées (séparées par de vrais retours à la ligne ou par « \n » écrits en texte)
  const lines = m[2].replace(/\\n/g, "\n").split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    // « n » orphelin en fin de ligne de 65 caractères : reste d'un « \n » dont la barre a disparu
    .map((l, i, all) => (l.length === 65 && l.endsWith("n") && i < all.length - 1 ? l.slice(0, 64) : l));
  const body = lines.join("").replace(/[^A-Za-z0-9+/=]/g, "");
  const wrapped = body.match(/.{1,64}/g)?.join("\n") ?? "";
  return `-----BEGIN ${label}-----\n${wrapped}\n-----END ${label}-----\n`;
}

/** Forme de la clé (sans son contenu) pour diagnostiquer un collage abîmé. */
export function describeKeyShape(key: string): string {
  const m = key.match(/-----BEGIN [A-Z ]+-----([\s\S]*?)-----END/);
  if (!m) return "en-têtes BEGIN/END introuvables";
  const lines = m[1].split(/\r?\n/).filter(Boolean);
  const odd = m[1].replace(/[A-Za-z0-9+/=\s]/g, "");
  return `${lines.length} lignes, longueurs ${[...new Set(lines.map((l) => l.length))].join("/")}, ${m[1].replace(/\s/g, "").length} caractères, caractères inattendus : ${odd.length}`;
}

/**
 * Lit la clé JSON d'un compte de service en tolérant les dégâts d'un copier-coller
 * (depuis un téléphone notamment) : retours à la ligne réels dans la clé privée, « \n » doublés,
 * guillemets typographiques, espaces insécables.
 */
export function parseServiceAccount(raw: string): Record<string, string> {
  let text = raw.trim().replace(/^\uFEFF/, "").replace(/[\u201C\u201D]/g, '"').replace(/\u00A0/g, " ");
  // Format « anti-téléphone » : le fichier .json entier encodé en base64, sur une seule ligne
  if (!text.startsWith("{")) {
    const decoded = Buffer.from(text.replace(/\s/g, ""), "base64").toString("utf8").trim();
    if (decoded.startsWith("{")) text = decoded;
  }
  let data: Record<string, string>;
  try {
    data = JSON.parse(text);
  } catch {
    // Retours à la ligne et tabulations réels à l'intérieur des chaînes → échappés
    let fixed = "", inString = false, escaped = false;
    for (const ch of text) {
      if (inString) {
        if (escaped) { escaped = false; fixed += ch; continue; }
        if (ch === "\\") { escaped = true; fixed += ch; continue; }
        if (ch === '"') { inString = false; fixed += ch; continue; }
        if (ch === "\n") { fixed += "\\n"; continue; }
        if (ch === "\r") continue;
        if (ch === "\t") { fixed += "\\t"; continue; }
        fixed += ch;
      } else {
        if (ch === '"') inString = true;
        fixed += ch;
      }
    }
    try {
      data = JSON.parse(fixed);
    } catch (e) {
      throw new Error(`POINTEUSE_SERVICE_ACCOUNT illisible : recollez tout le contenu du fichier .json, de { à } (${e instanceof Error ? e.message : e})`);
    }
  }
  if (typeof data.private_key === "string") data.private_key = repairPrivateKey(data.private_key);
  if (data.type !== "service_account" || !data.private_key || !data.client_email) {
    throw new Error("POINTEUSE_SERVICE_ACCOUNT : ce n'est pas une clé de compte de service Firebase complète (type, private_key, client_email).");
  }
  return data;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const address = (g: Gite) => [g.address, [g.postalCode, g.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

type PlanningDoc = {
  date: string; chantierId: string; chantierName: string; startTime: string; duration: number; notes: string;
  teamNames?: string[]; order?: number; source?: string; lpfMissionId?: string; lpfHash?: string;
};
type Change = { date: string; type: "ajout" | "suppression"; chantier: string; timestamp: string };

export type PointeuseReport = {
  created: number; updated: number; deleted: number; newChantiers: string[]; fiches: string[]; validated: string[]; notified: number; lines: string[];
};

type PtChantier = { id: string; name: string; status: string; aliases: string[]; data: FirebaseFirestore.DocumentData };

/** Champs de la fiche chantier de la pointeuse qui viennent du lieu des Petites Fées */
type Fiche = { address: string; email: string; totalHeuresPrevues: number; fixedAppointment: string; additionalInfo: string };
const FICHE_LABELS: Record<keyof Fiche, string> = {
  address: "adresse", email: "e-mail", totalHeuresPrevues: "heures prévues", fixedAppointment: "heure habituelle", additionalInfo: "infos",
};
const KIND_LABELS: Record<Gite["kind"], string> = { GITE: "Gîte", BUREAU: "Bureau", APPARTEMENT: "Appartement", AUTRE: "Autre" };

export function ficheFromGite(g: Gite): Fiche {
  const count = (n: number, one: string, many: string) => (n ? `${n} ${n > 1 ? many : one}` : "");
  const size = [
    count(g.bedrooms, "chambre", "chambres"), count(g.bathrooms, "salle de bain", "salles de bain"),
    g.capacity ? `${g.capacity} pers.` : "", count(g.bedSets, "parure de lit", "parures de lit"), count(g.towelSets, "set de serviettes", "sets de serviettes"),
  ].filter(Boolean).join(" · ");
  const info = [
    `${KIND_LABELS[g.kind] ?? "Lieu"} des Petites Fées${g.ownerName ? ` — propriétaire : ${g.ownerName}` : ""}`,
    size,
    g.accessInfo ? `Accès : ${g.accessInfo}` : "",
    g.notes ? `Notes : ${g.notes}` : "",
  ].filter(Boolean).join("\n");
  return {
    address: address(g), email: g.ownerEmail ?? "",
    totalHeuresPrevues: Math.round(((g.durationMin ?? 0) / 60) * 2) / 2,
    fixedAppointment: g.defaultTime ?? "", additionalInfo: info,
  };
}

/**
 * Ce qu'il faut écrire sur une fiche existante : un champ est (re)rempli s'il est vide,
 * ou s'il contient encore la valeur envoyée la dernière fois (donc pas retouché par l'admin).
 */
export function fichePatch(current: FirebaseFirestore.DocumentData, fiche: Fiche): Partial<Fiche> & { lpfGiteId?: string; coordinates?: null } {
  const before = (current.lpfSynced ?? {}) as Partial<Fiche>;
  const patch: Partial<Fiche> & { coordinates?: null } = {};
  for (const key of Object.keys(fiche) as (keyof Fiche)[]) {
    const now = current[key], next = fiche[key];
    const empty = now === undefined || now === null || now === "" || now === 0;
    if (next === now || next === "" || next === 0) continue;
    if (empty || (key in before && before[key] === now)) (patch as Record<string, unknown>)[key] = next;
  }
  // Adresse changée : l'ancien point GPS ne vaut plus, la pointeuse le recalcule
  if (patch.address && current.coordinates) patch.coordinates = null;
  return patch;
}

/**
 * Synchronise les passages confirmés (aujourd'hui → +6 semaines) vers le planning de la pointeuse.
 * - Chaque passage = un document « planning/lpf_<id du passage> » (aucun doublon possible).
 * - Les champs venant des Petites Fées ne sont réécrits que s'ils ont changé de ce côté-là :
 *   une heure retouchée dans la pointeuse n'est pas écrasée à chaque passage.
 * - Passage déplacé ou annulé : la ligne suit, et l'équipe assignée reçoit la notification habituelle.
 * - Lieu sans chantier correspondant (même nom, ou nom listé dans « lpfAliases » du chantier) : le chantier y est créé.
 */
export async function syncPointeuse(lpf: Firestore, pt: Firestore, dryRun = false): Promise<PointeuseReport> {
  const today = todayISO();
  const until = addDays(today, POINTEUSE_WEEKS * 7);
  const t = new Date().toISOString();
  const report: PointeuseReport = { created: 0, updated: 0, deleted: 0, newChantiers: [], fiches: [], validated: [], notified: 0, lines: [] };

  const [mSnap, gSnap, cSnap, pSnap, uSnap] = await Promise.all([
    lpf.collection("missions").where("date", ">=", today).where("date", "<=", until).get(),
    lpf.collection("gites").get(),
    pt.collection("chantiers").get(),
    pt.collection("planning").where("source", "==", "lpf").get(),
    pt.collection("users").get(),
  ]);
  const gites = new Map(gSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as Gite & { pointeuseChantierId?: string }]));
  // lpfAliases : autres noms du chantier côté Petites Fées (ex. « EVERCAR » dans la pointeuse = « Evercare » chez LPF)
  const chantiers: PtChantier[] = cSnap.docs.map((d) => ({
    id: d.id, name: String(d.data().name ?? ""), status: d.data().status as string,
    aliases: (Array.isArray(d.data().lpfAliases) ? d.data().lpfAliases : []).map(String) as string[],
    data: d.data(),
  }));
  const userIdByName = new Map(uSnap.docs.map((d) => [String(d.data().displayName ?? ""), d.id]));

  // Lieu des Petites Fées → chantier de la pointeuse (lien mémorisé sur le lieu, sinon même nom).
  // La fiche du chantier reprend les données du lieu (adresse, propriétaire, durée, accès…).
  const chantierFor = new Map<string, { id: string; name: string }>();
  const resolve = async (g: Gite & { pointeuseChantierId?: string }) => {
    if (chantierFor.has(g.id)) return chantierFor.get(g.id)!;
    let c = chantiers.find((x) => x.id === g.pointeuseChantierId)
      ?? chantiers.filter((x) => norm(x.name) === norm(g.name) || x.aliases.some((a) => norm(a) === norm(g.name)))
        .sort((a, b) => Number(b.status === "active") - Number(a.status === "active"))[0];
    const fiche = ficheFromGite(g);
    if (!c) {
      report.newChantiers.push(g.name);
      if (dryRun) c = { id: `(nouveau) ${g.name}`, name: g.name, status: "active", aliases: [], data: {} };
      else {
        const ref = await pt.collection("chantiers").add({
          name: g.name, ...fiche, timeWindowStart: "", timeWindowEnd: "",
          isHideable: false, keyboxCodes: [], coordinates: null, lpfGiteId: g.id, lpfSynced: fiche,
          status: "active", source: "lpf", createdAt: FieldValue.serverTimestamp(),
        });
        c = { id: ref.id, name: g.name, status: "active", aliases: [], data: {} };
        chantiers.push(c);
      }
    } else {
      // Fiche existante : on complète ce qui est vide, et on suit les changements faits chez LPF,
      // sans jamais écraser ce que l'admin a modifié lui-même dans la pointeuse.
      const patch = fichePatch(c.data, fiche);
      if (c.data.lpfGiteId !== g.id) patch.lpfGiteId = g.id;
      if (Object.keys(patch).length) {
        report.fiches.push(`${c.name} : ${Object.keys(patch).filter((k) => k in fiche).map((k) => FICHE_LABELS[k as keyof Fiche]).join(", ") || "lien"}`);
        if (!dryRun) await pt.collection("chantiers").doc(c.id).update({ ...patch, lpfSynced: fiche, updatedAt: FieldValue.serverTimestamp() });
      }
    }
    if (!dryRun && g.pointeuseChantierId !== c.id) await lpf.collection("gites").doc(g.id).update({ pointeuseChantierId: c.id });
    chantierFor.set(g.id, c);
    return c;
  };

  // Chaque lieu actif des Petites Fées a sa fiche chantier, même sans passage prévu
  for (const g of gites.values()) if (g.active !== false) await resolve(g);

  // Planning voulu
  const wanted = new Map<string, PlanningDoc>();
  for (const d of mSnap.docs) {
    const m = { id: d.id, ...d.data() } as Mission;
    if (m.status !== "CONFIRMED" && m.status !== "DONE") continue;
    const g = gites.get(m.giteId);
    if (!g) continue;
    const c = await resolve(g);
    const notes = [m.urgent ? "⚡ Urgent" : "", m.extraLinen ? "Linge supplémentaire" : "", m.ownerNote ?? ""].filter(Boolean).join(" · ");
    const data: PlanningDoc = {
      date: m.date, chantierId: c.id, chantierName: missionTitle(m), startTime: m.time ?? "",
      duration: Math.round(((g.durationMin ?? 0) / 60) * 2) / 2, notes, source: "lpf", lpfMissionId: m.id,
    };
    data.lpfHash = createHash("sha1").update(JSON.stringify([data.date, data.chantierId, data.chantierName, data.startTime, data.duration, data.notes])).digest("hex").slice(0, 16);
    wanted.set(`lpf_${m.id}`, data);
  }

  // Comparaison avec la pointeuse
  const writes: ((b: FirebaseFirestore.WriteBatch) => void)[] = [];
  const changes = new Map<string, Change[]>();
  const notify = (team: string[] | undefined, c: Omit<Change, "timestamp">) => {
    for (const name of team ?? []) {
      const uid = userIdByName.get(name);
      if (uid) changes.set(uid, [...(changes.get(uid) ?? []), { ...c, timestamp: t }]);
    }
  };
  const current = new Map(pSnap.docs.map((d) => [d.id, d.data() as PlanningDoc]));
  for (const [id, data] of wanted) {
    const cur = current.get(id);
    const ref = pt.collection("planning").doc(id);
    if (!cur) {
      writes.push((b) => b.set(ref, { ...data, teamNames: [], order: 100, createdAt: FieldValue.serverTimestamp() }));
      report.created++;
      report.lines.push(`+ ${data.date} ${data.chantierName}${data.startTime ? ` ${data.startTime}` : ""}`);
    } else if (cur.lpfHash !== data.lpfHash) {
      writes.push((b) => b.update(ref, { ...data, updatedAt: FieldValue.serverTimestamp() }));
      report.updated++;
      report.lines.push(`~ ${data.date} ${data.chantierName}${cur.date !== data.date ? ` (avant : ${cur.date})` : ""}`);
      if (cur.date !== data.date) {
        notify(cur.teamNames, { date: cur.date, type: "suppression", chantier: cur.chantierName });
        notify(cur.teamNames, { date: data.date, type: "ajout", chantier: data.chantierName });
      }
    }
  }
  for (const [id, cur] of current) {
    if (wanted.has(id) || cur.date < today) continue; // l'historique de la pointeuse n'est jamais effacé
    writes.push((b) => b.delete(pt.collection("planning").doc(id)));
    report.deleted++;
    report.lines.push(`− ${cur.date} ${cur.chantierName}`);
    notify(cur.teamNames, { date: cur.date, type: "suppression", chantier: cur.chantierName });
  }
  for (const [uid, list] of changes) {
    writes.push((b) => b.update(pt.collection("users").doc(uid), { pendingChanges: FieldValue.arrayUnion(...list) }));
    report.notified += list.length;
  }

  if (!dryRun) {
    for (let i = 0; i < writes.length; i += 400) {
      const batch = pt.batch();
      writes.slice(i, i + 400).forEach((w) => w(batch));
      await batch.commit();
    }
  }
  report.validated = await validateFromPointages(lpf, pt, gites, chantiers, chantierFor, dryRun);
  return report;
}

/** Jours en arrière où un passage confirmé peut encore être validé par les pointages */
const VALIDATION_DAYS = 14;

/**
 * Fin de pointage → passage effectué chez Les Petites Fées.
 * Un passage confirmé passe en « Effectué » quand des pointages terminés existent le même jour sur son chantier
 * et qu'il n'y en a plus aucun en cours. La durée pointée (pauses déduites) est notée sur le passage.
 */
async function validateFromPointages(
  lpf: Firestore, pt: Firestore, gites: Map<string, Gite & { pointeuseChantierId?: string }>,
  chantiers: PtChantier[], chantierFor: Map<string, { id: string; name: string }>, dryRun: boolean,
): Promise<string[]> {
  const today = todayISO();
  const since = addDays(today, -VALIDATION_DAYS);
  const [mSnap, pSnap] = await Promise.all([
    lpf.collection("missions").where("date", ">=", since).where("date", "<=", today).get(),
    pt.collection("pointages").where("timestamp", ">=", new Date(`${since}T00:00:00`).toISOString()).get(),
  ]);
  const pointages = pSnap.docs.map((d) => d.data()).map((p) => ({
    chantierId: String(p.chantierId ?? ""), chantier: norm(String(p.chantier ?? "")),
    date: toISODate(new Date(p.timestamp)), start: new Date(p.timestamp).getTime(),
    end: p.endTime ? new Date(p.endTime).getTime() : null, pauseMs: Number(p.pauseDurationMs) || 0,
  }));
  const t = new Date().toISOString();
  const done: string[] = [];
  const batch = lpf.batch();
  for (const d of mSnap.docs) {
    const m = { id: d.id, ...d.data() } as Mission;
    const g = gites.get(m.giteId);
    if (m.status !== "CONFIRMED" || !g) continue;
    const cid = chantierFor.get(g.id)?.id ?? g.pointeuseChantierId;
    const c = chantiers.find((x) => x.id === cid);
    if (!c) continue;
    const names = new Set([c.name, ...c.aliases].map(norm));
    const sameDay = pointages.filter((p) => p.date === m.date && (p.chantierId === c.id || names.has(p.chantier)));
    if (!sameDay.length || sameDay.some((p) => p.end === null)) continue; // personne n'a pointé, ou pointage encore en cours
    const workedMin = Math.round(sameDay.reduce((s, p) => s + Math.max(0, p.end! - p.start - p.pauseMs), 0) / 60000);
    const doneAt = new Date(Math.max(...sameDay.map((p) => p.end!))).toISOString();
    batch.update(d.ref, { status: "DONE", doneAt, doneBy: "Pointeuse", workedMin, updatedAt: t, notifyAdmin: false });
    done.push(`✓ ${m.date} ${missionTitle(m)} (${Math.floor(workedMin / 60)} h ${String(workedMin % 60).padStart(2, "0")} pointées)`);
  }
  if (!dryRun && done.length) {
    await batch.commit();
    await lpf.collection("activity").add({ at: t, by: "Pointeuse", message: `${done.length} passage(s) marqué(s) effectué(s) d'après les pointages` });
  }
  return done;
}
