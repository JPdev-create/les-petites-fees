// Chantiers réguliers transmis par Sandrine (octobre 2026) — utilisés par scripts/import-chantiers.ts.
// Jours : 0 = lundi … 6 = dimanche.
import type { Gite, Recurrence } from "../../src/lib/types";

export type Rule = Pick<Recurrence, "freq" | "interval" | "days" | "nth" | "weekday" | "startDate"> & { variants?: string[] };
export type Chantier = { name: string; kind?: Gite["kind"]; city?: string; rules: Rule[] };

/**
 * Lieux déjà importés sous un ancien nom : renommés (avec leurs passages) avant l'import.
 * Précisions de Sandrine du 27/10 : les groupes du mercredi sont 4 chantiers séparés,
 * et « Galère / notaire / forage » = Galaire et Notaire Balthazar, tous deux à Bouge.
 */
export const RENAMES: { from: string; to: string }[] = [
  { from: "Wiesmes et Anders", to: "Wiesmes" },
  { from: "Polimage et Hannut", to: "Polimage" },
  { from: "Galère / notaire / forage (intitulé à confirmer)", to: "Galaire" },
];

/** Premier jour planifié (le lendemain de l'envoi du récapitulatif). */
export const START = "2026-10-28";

const LUN = 0, MAR = 1, MER = 2, JEU = 3, VEN = 4, SAM = 5, DIM = 6;
const weekly = (...days: number[]): Rule => ({ freq: "WEEKLY", interval: 1, days, nth: 1, weekday: 0, startDate: START });
const every15 = (day: number, first: string): Rule => ({ freq: "WEEKLY", interval: 2, days: [day], nth: 1, weekday: 0, startDate: first });
const monthly = (nth: number, weekday: number): Rule => ({ freq: "MONTHLY", interval: 1, days: [], nth, weekday, startDate: START });

export const CHANTIERS: Chantier[] = [
  // 1. Chaque semaine
  { name: "Tec", rules: [weekly(LUN, JEU)] },
  { name: "Dentiste Rochefort", rules: [weekly(LUN, JEU)] },
  { name: "Effet", rules: [weekly(LUN, MAR, MER, JEU, VEN)] },
  { name: "Manda", rules: [weekly(LUN, MAR, MER, JEU, VEN)] },
  { name: "La Casa", rules: [weekly(LUN, JEU, VEN, SAM, DIM)] },
  { name: "Écureuil", rules: [weekly(LUN, VEN)] },
  { name: "Soyeur Marche", rules: [weekly(MAR, JEU)] },
  { name: "Huet Manhay", rules: [weekly(MAR)] },
  { name: "Roland", rules: [weekly(MER)] },
  { name: "Boulangerie Baravin", rules: [weekly(MER)] },
  { name: "Maison Thaï", rules: [weekly(MER, JEU, VEN, SAM, DIM)] },
  { name: "Mimosa", rules: [weekly(JEU)] },
  { name: "Communs de la Famenne", rules: [weekly(JEU)] },
  { name: "Docteur Benny", rules: [weekly(JEU)] },
  { name: "Huet Hotton", rules: [weekly(JEU)] },
  { name: "Evercare", rules: [weekly(JEU)] },
  { name: "Soyeur Neufchâteau", rules: [weekly(JEU)] },
  { name: "Barthélemy", rules: [weekly(JEU)] },
  { name: "Rati", rules: [weekly(VEN)] },
  { name: "Lux", rules: [weekly(VEN)] },
  { name: "Panel", rules: [weekly(VEN)] },
  // 4. Chimisco : chaque jeudi, en alternance soirée / journée (soirée le 29 octobre)
  { name: "Chimisco", rules: [{ ...weekly(JEU), startDate: "2026-10-29", variants: ["Soirée", "Journée"] }] },

  // 2. Tous les 15 jours (Wiesmes et Anders / Polimage et Hannut en alternance, une semaine sur deux)
  { name: "Wiesmes", rules: [every15(MER, "2026-10-28")] },
  { name: "Anders", rules: [every15(MER, "2026-10-28")] },
  { name: "Polimage", rules: [every15(MER, "2026-11-04")] },
  { name: "Hannut", rules: [every15(MER, "2026-11-04")] },
  { name: "Netcom", rules: [every15(MER, "2026-10-28")] },
  { name: "Soyeur Bastogne", rules: [every15(JEU, "2026-10-29")] },
  { name: "Kiné", rules: [every15(SAM, "2026-10-31")] },

  // 3. Chaque mois, selon la position dans le mois
  { name: "AIS1", rules: [monthly(1, JEU)] },
  { name: "AIS2", rules: [monthly(1, JEU)] },
  { name: "Commun Marche", rules: [monthly(2, JEU)] },
  { name: "Galaire", city: "Bouge", rules: [monthly(-1, MER)] },
  { name: "Notaire Balthazar", city: "Bouge", rules: [monthly(-1, MER)] },
  { name: "Tec vitres", rules: [monthly(-1, JEU)] },
  { name: "Bièvre", rules: [monthly(1, SAM)] },
];
