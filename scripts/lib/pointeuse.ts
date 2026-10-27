// Envoi du planning vers la Pointeuse LPF (autre projet Firebase : pointeuse-lpf).
// Les passages confirmés des Petites Fées deviennent des lignes du planning de la pointeuse
// (collection « planning ») ; l'équipe y est toujours assignée par le gestionnaire dans la pointeuse.
import { createHash } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { addDays, todayISO } from "../../src/lib/format";
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
  return getFirestore(initializeApp({ credential: cert(JSON.parse(raw)) }, "pointeuse"));
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const address = (g: Gite) => [g.address, [g.postalCode, g.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

type PlanningDoc = {
  date: string; chantierId: string; chantierName: string; startTime: string; duration: number; notes: string;
  teamNames?: string[]; order?: number; source?: string; lpfMissionId?: string; lpfHash?: string;
};
type Change = { date: string; type: "ajout" | "suppression"; chantier: string; timestamp: string };

export type PointeuseReport = { created: number; updated: number; deleted: number; newChantiers: string[]; notified: number; lines: string[] };

/**
 * Synchronise les passages confirmés (aujourd'hui → +6 semaines) vers le planning de la pointeuse.
 * - Chaque passage = un document « planning/lpf_<id du passage> » (aucun doublon possible).
 * - Les champs venant des Petites Fées ne sont réécrits que s'ils ont changé de ce côté-là :
 *   une heure retouchée dans la pointeuse n'est pas écrasée à chaque passage.
 * - Passage déplacé ou annulé : la ligne suit, et l'équipe assignée reçoit la notification habituelle.
 * - Lieu sans chantier correspondant (même nom) dans la pointeuse : le chantier y est créé.
 */
export async function syncPointeuse(lpf: Firestore, pt: Firestore, dryRun = false): Promise<PointeuseReport> {
  const today = todayISO();
  const until = addDays(today, POINTEUSE_WEEKS * 7);
  const t = new Date().toISOString();
  const report: PointeuseReport = { created: 0, updated: 0, deleted: 0, newChantiers: [], notified: 0, lines: [] };

  const [mSnap, gSnap, cSnap, pSnap, uSnap] = await Promise.all([
    lpf.collection("missions").where("date", ">=", today).where("date", "<=", until).get(),
    lpf.collection("gites").get(),
    pt.collection("chantiers").get(),
    pt.collection("planning").where("source", "==", "lpf").get(),
    pt.collection("users").get(),
  ]);
  const gites = new Map(gSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as Gite & { pointeuseChantierId?: string }]));
  const chantiers = cSnap.docs.map((d) => ({ id: d.id, name: String(d.data().name ?? ""), status: d.data().status as string }));
  const userIdByName = new Map(uSnap.docs.map((d) => [String(d.data().displayName ?? ""), d.id]));

  // Lieu des Petites Fées → chantier de la pointeuse (lien mémorisé sur le lieu, sinon même nom)
  const chantierFor = new Map<string, { id: string; name: string }>();
  const resolve = async (g: Gite & { pointeuseChantierId?: string }) => {
    if (chantierFor.has(g.id)) return chantierFor.get(g.id)!;
    let c = chantiers.find((x) => x.id === g.pointeuseChantierId)
      ?? chantiers.filter((x) => norm(x.name) === norm(g.name)).sort((a, b) => Number(b.status === "active") - Number(a.status === "active"))[0];
    if (!c) {
      report.newChantiers.push(g.name);
      if (dryRun) c = { id: `(nouveau) ${g.name}`, name: g.name, status: "active" };
      else {
        const ref = await pt.collection("chantiers").add({
          name: g.name, address: address(g), email: "", totalHeuresPrevues: 0, fixedAppointment: "", timeWindowStart: "", timeWindowEnd: "",
          isHideable: false, keyboxCodes: [], additionalInfo: g.accessInfo ?? "", coordinates: null,
          status: "active", source: "lpf", createdAt: FieldValue.serverTimestamp(),
        });
        c = { id: ref.id, name: g.name, status: "active" };
        chantiers.push(c);
      }
    }
    if (!dryRun && g.pointeuseChantierId !== c.id) await lpf.collection("gites").doc(g.id).update({ pointeuseChantierId: c.id });
    chantierFor.set(g.id, c);
    return c;
  };

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
  return report;
}
