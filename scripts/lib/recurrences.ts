// Prolongation des passages réguliers côté serveur (automatisation et import).
import type { Firestore } from "firebase-admin/firestore";
import { HORIZON_DAYS, occurrenceId, occurrenceMission, occurrences } from "../../src/lib/recurrence";
import { addDays, todayISO } from "../../src/lib/format";
import type { Gite, Mission, Recurrence } from "../../src/lib/types";

/** Crée les passages d'une série jusqu'à l'horizon (même logique que extendRecurrence côté site). */
export async function extendRecurrence(db: Firestore, r: Recurrence, gite: Gite) {
  const until = addDays(todayISO(), HORIZON_DAYS);
  if (!r.active || (r.generatedUntil ?? "") >= until) return 0;
  const from = r.generatedUntil && r.generatedUntil >= todayISO() ? addDays(r.generatedUntil, 1) : todayISO();
  const existing = await db.collection("missions").where("giteId", "==", gite.id).where("date", ">=", from).where("date", "<=", until).get();
  const skip = new Set(existing.docs.map((d) => d.data() as Mission).filter((m) => !m.recurrenceId && m.status !== "CANCELLED" && m.status !== "REFUSED").map((m) => m.date));
  return db.runTransaction(async (tx) => {
    const ref = db.collection("recurrences").doc(r.id);
    const fresh = await tx.get(ref);
    if (!fresh.exists || (fresh.data()?.generatedUntil ?? "") !== (r.generatedUntil ?? "")) return 0;
    const t = new Date().toISOString();
    const list = occurrences(r, from, until).filter((o) => !skip.has(o.date));
    for (const o of list) tx.set(db.collection("missions").doc(occurrenceId(r.id, o.date)), occurrenceMission(r, gite, o, t));
    tx.update(ref, { generatedUntil: until });
    return list.length;
  });
}

/** Prolonge toutes les séries actives. */
export async function extendAll(db: Firestore) {
  const [recs, gites] = await Promise.all([db.collection("recurrences").where("active", "==", true).get(), db.collection("gites").get()]);
  const byId = new Map(gites.docs.map((d) => [d.id, { id: d.id, ...d.data() } as Gite]));
  let created = 0;
  for (const d of recs.docs) {
    const r = { id: d.id, ...d.data() } as Recurrence;
    const g = byId.get(r.giteId);
    if (g?.active) created += await extendRecurrence(db, r, g);
  }
  return created;
}
