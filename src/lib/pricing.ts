// Tarification : forfait par passage, ou tarif horaire (durée estimée puis durée réelle).
import { euros } from "./format";
import type { Gite, Mission } from "./types";

export const isHourly = (g?: Pick<Gite, "pricingMode"> | null) => g?.pricingMode === "HOURLY";

/** « 2 h 30 », « 45 min », « 3 h » */
export function durationLabel(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

/** Montant (centimes) pour une durée donnée au tarif horaire */
export const hourlyAmount = (rate: number, minutes: number) => Math.round((rate * minutes) / 60);

/** Prix d'un passage à enregistrer sur le lieu : forfait, ou estimation (tarif × durée estimée) */
export const giteUnitPrice = (g: Pick<Gite, "pricingMode" | "hourlyRate" | "price" | "durationMin">) =>
  isHourly(g) ? hourlyAmount(g.hourlyRate ?? 0, g.durationMin) : g.price;

/** Libellé court du tarif d'un lieu */
export function priceLabel(g: Pick<Gite, "pricingMode" | "hourlyRate" | "price" | "durationMin">) {
  return isHourly(g) ? `${euros(g.hourlyRate ?? 0)}/h HTVA` : `${euros(g.price)} HTVA`;
}

/** Libellé du prix d'un passage (avec le détail horaire s'il y a lieu) */
export function missionPriceLabel(m: Pick<Mission, "price" | "workedMin" | "hourlyRate">) {
  if (m.workedMin && m.hourlyRate) return `${euros(m.price)} (${durationLabel(m.workedMin)} × ${euros(m.hourlyRate)})`;
  return euros(m.price);
}
