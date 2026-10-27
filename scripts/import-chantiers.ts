/**
 * Import des chantiers réguliers (scripts/lib/chantiers.ts) : crée les lieux manquants,
 * leurs passages réguliers, puis les passages des 4 prochains mois.
 * Peut être relancé sans risque : un lieu ou une série déjà présents ne sont pas recréés.
 *
 * Usage : npm run import:chantiers -- --dry-run   (affiche ce qui serait fait)
 *         npm run import:chantiers                (avec FIREBASE_SERVICE_ACCOUNT)
 */
process.env.TZ ||= "Europe/Brussels";

import { CHANTIERS, type Rule } from "./lib/chantiers";
import { describeOccurrence, occurrences, recurrenceLabel } from "../src/lib/recurrence";
import { COLORS, addDays, todayISO } from "../src/lib/format";
import type { Gite, Recurrence } from "../src/lib/types";

const dryRun = process.argv.includes("--dry-run");
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const sameRule = (a: Rule, b: Recurrence) =>
  a.freq === b.freq && a.interval === b.interval && a.startDate === b.startDate && a.nth === b.nth && a.weekday === b.weekday && JSON.stringify([...a.days].sort()) === JSON.stringify([...(b.days ?? [])].sort());

async function main() {
  if (dryRun) {
    const today = todayISO();
    for (const c of CHANTIERS) {
      for (const r of c.rules) {
        const next = occurrences(r, today, addDays(today, 70)).slice(0, 4).map(describeOccurrence).join(" · ");
        console.log(`${c.name.padEnd(48)} ${recurrenceLabel(r).padEnd(42)} → ${next}`);
      }
    }
    console.log(`\n${CHANTIERS.length} chantiers (simulation : rien n'a été enregistré)`);
    return;
  }

  const { initAdmin } = await import("./lib/admin");
  const { extendRecurrence } = await import("./lib/recurrences");
  const { db } = initAdmin();
  const now = new Date().toISOString();
  const [gSnap, rSnap] = await Promise.all([db.collection("gites").get(), db.collection("recurrences").get()]);
  const gites = gSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Gite);
  const recs = rSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Recurrence);
  let newPlaces = 0, newSeries = 0, planned = 0;

  for (const [i, c] of CHANTIERS.entries()) {
    let g = gites.find((x) => norm(x.name) === norm(c.name));
    if (!g) {
      const data: Omit<Gite, "id"> = {
        name: c.name, kind: c.kind ?? "BUREAU", ownerEmail: "", ownerName: "", address: "", postalCode: "", city: "",
        accessInfo: "", notes: "", bedrooms: 0, bathrooms: 0, capacity: 0, bedSets: 0, towelSets: 0,
        price: 0, pricingMode: "FLAT", hourlyRate: 0, durationMin: 120, defaultTime: "", color: COLORS[i % COLORS.length],
        icalFeeds: [], active: true, createdAt: now, updatedAt: now,
      };
      const ref = await db.collection("gites").add(data);
      g = { id: ref.id, ...data };
      gites.push(g);
      newPlaces++;
    }
    for (const rule of c.rules) {
      let r = recs.find((x) => x.giteId === g.id && sameRule(rule, x));
      if (!r) {
        const data: Omit<Recurrence, "id"> = { ...rule, giteId: g.id, variants: rule.variants ?? [], time: null, endDate: null, note: null, active: true, generatedUntil: null, createdAt: now, updatedAt: now };
        const ref = await db.collection("recurrences").add(data);
        r = { id: ref.id, ...data };
        recs.push(r);
        newSeries++;
      }
      const n = await extendRecurrence(db, r, g);
      planned += n;
      console.log(`✓ ${c.name} — ${recurrenceLabel(r)}${n ? ` — ${n} passage(s) planifié(s)` : ""}`);
    }
  }
  await db.collection("activity").add({ at: now, by: "Import", message: `Chantiers réguliers importés : ${newPlaces} lieu(x), ${newSeries} série(s), ${planned} passage(s) planifié(s)` });
  console.log(`\n✓ ${newPlaces} lieu(x) créé(s), ${newSeries} passage(s) régulier(s), ${planned} passage(s) planifié(s)`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
