/**
 * Vérifie le calcul des passages réguliers sur les dates du récapitulatif de Sandrine.
 * Usage : npm run check:recurrences
 */
process.env.TZ ||= "Europe/Brussels";

import { CHANTIERS, START } from "./lib/chantiers";
import { describeOccurrence, nthWeekdayOfMonth, occurrences } from "../src/lib/recurrence";
import { addDays } from "../src/lib/format";

let failures = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${ok ? "" : `\n    attendu : ${JSON.stringify(want)}\n    obtenu  : ${JSON.stringify(got)}`}`);
};
const rule = (name: string) => CHANTIERS.find((c) => c.name.startsWith(name))!.rules[0];
const dates = (name: string, to = "2026-12-31") => occurrences(rule(name), START, to).map((o) => o.date);

eq("Wiesmes", dates("Wiesmes").slice(0, 3), ["2026-10-28", "2026-11-11", "2026-11-25"]);
eq("Anders", dates("Anders").slice(0, 3), ["2026-10-28", "2026-11-11", "2026-11-25"]);
eq("Hannut", dates("Hannut").slice(0, 3), ["2026-11-04", "2026-11-18", "2026-12-02"]);
eq("Polimage", dates("Polimage").slice(0, 3), ["2026-11-04", "2026-11-18", "2026-12-02"]);
const wa = new Set(dates("Wiesmes", "2027-12-31")), ph = dates("Polimage", "2027-12-31");
eq("Wiesmes/Polimage : jamais la même semaine, chaque mercredi couvert", ph.every((d) => !wa.has(d) && (wa.has(addDays(d, 7)) || addDays(d, 7) > "2027-12-31")), true);
eq("Netcom", dates("Netcom").slice(0, 3), ["2026-10-28", "2026-11-11", "2026-11-25"]);
eq("Soyeur Bastogne", dates("Soyeur Bastogne").slice(0, 3), ["2026-10-29", "2026-11-12", "2026-11-26"]);
eq("Kiné", dates("Kiné").slice(0, 3), ["2026-10-31", "2026-11-14", "2026-11-28"]);

eq("Chimisco", occurrences(rule("Chimisco"), START, "2026-12-17").map(describeOccurrence), [
  "jeu. 29 octobre · Soirée", "jeu. 5 novembre · Journée", "jeu. 12 novembre · Soirée", "jeu. 19 novembre · Journée",
  "jeu. 26 novembre · Soirée", "jeu. 3 décembre · Journée", "jeu. 10 décembre · Soirée", "jeu. 17 décembre · Journée",
]);
// L'alternance ne dépend pas de la période calculée (prolongation jour après jour)
eq("Chimisco : alternance stable quand on calcule à partir d'une autre date", occurrences(rule("Chimisco"), "2027-03-01", "2027-03-12").map((o) => `${o.date} ${o.variant}`), ["2027-03-04 Soirée", "2027-03-11 Journée"]);

eq("AIS1 (1er jeudi)", dates("AIS1", "2027-01-31"), ["2026-11-05", "2026-12-03", "2027-01-07"]);
eq("Commun Marche (2e jeudi)", dates("Commun Marche", "2027-01-31"), ["2026-11-12", "2026-12-10", "2027-01-14"]);
eq("Notaire Balthazar (dernier mercredi)", dates("Notaire Balthazar", "2027-01-31"), ["2026-10-28", "2026-11-25", "2026-12-30", "2027-01-27"]);
eq("Galaire (dernier mercredi)", dates("Galaire", "2027-01-31"), ["2026-10-28", "2026-11-25", "2026-12-30", "2027-01-27"]);
eq("Tec vitres (dernier jeudi)", dates("Tec vitres", "2027-01-31"), ["2026-10-29", "2026-11-26", "2026-12-31", "2027-01-28"]);
eq("Bièvre (1er samedi)", dates("Bièvre", "2027-01-31"), ["2026-11-07", "2026-12-05", "2027-01-02"]);
eq("5e jeudi inexistant", nthWeekdayOfMonth(2027, 2, 3, 5), null);

eq("Effet : lundi → vendredi", dates("Effet", "2026-11-08"), ["2026-10-28", "2026-10-29", "2026-10-30", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"]);
eq("La Casa : lun, jeu, ven, sam, dim", dates("La Casa", "2026-11-08"), ["2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"]);
eq("Date de fin respectée", occurrences({ ...rule("Tec"), endDate: "2026-11-05" }, START, "2026-12-31").map((o) => o.date), ["2026-10-29", "2026-11-02", "2026-11-05"]);

// Récapitulatif par jour sur une semaine type
console.log("\nSemaine du 2 au 8 novembre 2026 :");
for (let i = 0; i < 7; i++) {
  const day = addDays("2026-11-02", i);
  const names = CHANTIERS.flatMap((c) => c.rules.flatMap((r) => occurrences(r, day, day).map((o) => (o.variant ? `${c.name} ${o.variant.toLowerCase()}` : c.name))));
  console.log(`  ${describeOccurrence({ date: day, variant: null })} (${names.length}) : ${names.join(", ")}`);
}

if (failures) {
  console.error(`\n✗ ${failures} vérification(s) en échec`);
  process.exit(1);
}
console.log("\n✓ Toutes les récurrences sont correctes");
