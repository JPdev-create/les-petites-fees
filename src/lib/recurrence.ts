// Passages réguliers : calcul des dates (partagé entre le site et le script d'automatisation).
// Aucune dépendance à Firebase : uniquement des dates locales « AAAA-MM-JJ ».

import { DAYS_LONG, DAYS_SHORT, addDays, diffDays, formatDate, pad, parseISODate, startOfWeek, weekdayIndex } from "./format";
import type { Gite, Mission, Recurrence } from "./types";

/** Nombre de jours planifiés à l'avance (prolongé automatiquement chaque jour). */
export const HORIZON_DAYS = 120;

export type Occurrence = { date: string; variant: string | null };

/** N-ième jour de semaine d'un mois (nth = 1…4, ou -1 pour le dernier). */
export function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): string | null {
  if (nth === -1) {
    const last = new Date(year, month, 0); // dernier jour du mois (month = 1…12)
    const back = (weekdayIndex(last) - weekday + 7) % 7;
    return `${year}-${pad(month)}-${pad(last.getDate() - back)}`;
  }
  const first = new Date(year, month - 1, 1);
  const day = 1 + ((weekday - weekdayIndex(first) + 7) % 7) + 7 * (nth - 1);
  if (day > new Date(year, month, 0).getDate()) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * Toutes les dates d'une règle entre `from` et `to` (inclus).
 * L'alternance (variants) est comptée depuis la date de départ : 1re semaine (ou 1er mois) = 1re variante,
 * 2e = 2e variante, etc. Elle ne dépend donc pas de la période demandée.
 */
export function occurrences(r: Pick<Recurrence, "freq" | "interval" | "days" | "nth" | "weekday" | "startDate" | "endDate" | "variants">, from: string, to: string): Occurrence[] {
  const out: Occurrence[] = [];
  const lo = from > r.startDate ? from : r.startDate;
  const hi = r.endDate && r.endDate < to ? r.endDate : to;
  if (lo > hi) return out;
  const variants = (r.variants ?? []).filter(Boolean);
  const variant = (i: number) => (variants.length ? variants[i % variants.length] : null);

  if (r.freq === "WEEKLY") {
    const days = [...new Set(r.days ?? [])].sort();
    if (!days.length) return out;
    const interval = Math.max(1, r.interval || 1);
    const week0 = startOfWeek(r.startDate);
    // Première semaine « active » couvrant `lo`
    let w = Math.floor(diffDays(startOfWeek(lo), week0) / 7);
    w = Math.ceil(w / interval) * interval;
    for (let weekStart = addDays(week0, 7 * w); weekStart <= hi; w += interval, weekStart = addDays(week0, 7 * w)) {
      for (const d of days) {
        const date = addDays(weekStart, d);
        if (date >= lo && date <= hi) out.push({ date, variant: variant(w / interval) });
      }
    }
    return out;
  }

  // MONTHLY : position dans le mois (1er jeudi, dernier mercredi…)
  const start = parseISODate(r.startDate);
  const a = parseISODate(lo), b = parseISODate(hi);
  let i = (a.getFullYear() - start.getFullYear()) * 12 + a.getMonth() - start.getMonth();
  for (let y = a.getFullYear(), m = a.getMonth() + 1; y < b.getFullYear() || (y === b.getFullYear() && m <= b.getMonth() + 1); i++) {
    const date = nthWeekdayOfMonth(y, m, r.weekday ?? 0, r.nth ?? 1);
    if (date && date >= lo && date <= hi) out.push({ date, variant: variant(i) });
    if (++m > 12) { m = 1; y++; }
  }
  return out;
}

const NTH = { 1: "1er", 2: "2e", 3: "3e", 4: "4e", [-1]: "dernier" } as Record<number, string>;

/** « Chaque semaine : lun., jeu. » · « Toutes les 2 semaines : mer. » · « Le dernier jeudi du mois » */
export function recurrenceLabel(r: Pick<Recurrence, "freq" | "interval" | "days" | "nth" | "weekday">) {
  if (r.freq === "MONTHLY") return `Le ${NTH[r.nth ?? 1] ?? `${r.nth}e`} ${DAYS_LONG[r.weekday ?? 0]} du mois`;
  const days = [...(r.days ?? [])].sort().map((d) => DAYS_SHORT[d]).join(", ");
  const n = Math.max(1, r.interval || 1);
  return `${n === 1 ? "Chaque semaine" : n === 2 ? "Tous les 15 jours" : `Toutes les ${n} semaines`} : ${days}`;
}

/** Libellé d'un passage, avec sa variante éventuelle : « Chimisco soirée ». */
export function missionTitle(m: Pick<Mission, "giteName" | "variant">) {
  return m.variant ? `${m.giteName} ${m.variant.toLowerCase()}` : m.giteName;
}

/** Identifiant stable d'une occurrence : regénérer deux fois ne crée pas de doublon. */
export function occurrenceId(recurrenceId: string, date: string) {
  return `r_${recurrenceId}_${date}`;
}

/** Contenu du document « passage » pour une occurrence. */
export function occurrenceMission(r: Recurrence, g: Gite, o: Occurrence, t: string): Omit<Mission, "id"> {
  return {
    giteId: g.id, giteName: g.name, giteColor: g.color, ownerEmail: g.ownerEmail, ownerName: g.ownerName,
    date: o.date, dateTo: null, time: r.time || g.defaultTime || null, status: "CONFIRMED", source: "ADMIN",
    urgent: false, extraLinen: false, ownerNote: null, adminNote: null, // la note de la série reste privée (recurrences/)
    price: g.price, notifyAdmin: false, notifyOwner: null,
    recurrenceId: r.id, occurrenceDate: o.date, variant: o.variant,
    createdAt: t, updatedAt: t, doneAt: null,
  };
}

/** Un passage d'une série qui a été modifié à la main (déplacé, annulé, effectué…) n'est jamais régénéré. */
export function isUntouchedOccurrence(m: Mission) {
  return m.status === "CONFIRMED" && !m.recurrenceException;
}

export function describeOccurrence(o: Occurrence) {
  return `${formatDate(o.date, "medium")}${o.variant ? ` · ${o.variant}` : ""}`;
}
