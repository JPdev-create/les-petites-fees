// Durées des passages (aucun tarif n'est géré dans l'application).

/** « 2 h 30 », « 45 min », « 3 h » */
export function durationLabel(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}
