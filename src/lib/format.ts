// Formatage partagé client/serveur (dates locales sans fuseau : "AAAA-MM-JJ")

export const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const MONTHS_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export const DAYS_SHORT = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
export const DAYS_LONG = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO() {
  return toISODate(new Date());
}

export function addDays(iso: string, n: number) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function diffDays(a: string, b: string) {
  return Math.round((parseISODate(a).getTime() - parseISODate(b).getTime()) / 86400000);
}

export function periodOf(iso: string) {
  return iso.slice(0, 7);
}

export function currentPeriod() {
  return todayISO().slice(0, 7);
}

export function shiftPeriod(period: string, n: number) {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function periodLabel(period: string) {
  const [y, m] = period.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function periodBounds(period: string) {
  const [y, m] = period.split("-").map(Number);
  return { from: `${period}-01`, to: `${period}-${pad(new Date(y, m, 0).getDate())}` };
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Lundi = 0 … dimanche = 6 */
export function weekdayIndex(d: Date) {
  return (d.getDay() + 6) % 7;
}

export function formatDate(iso: string, style: "long" | "short" | "day" | "medium" = "long") {
  const d = parseISODate(iso);
  const wd = weekdayIndex(d);
  const month = MONTHS[d.getMonth()];
  if (style === "short") return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  if (style === "day") return `${DAYS_LONG[wd]} ${d.getDate()}`;
  if (style === "medium") return `${DAYS_SHORT[wd]} ${d.getDate()} ${month}`;
  return `${DAYS_LONG[wd]} ${d.getDate()} ${month} ${d.getFullYear()}`;
}

export function relativeDay(iso: string) {
  const diff = diffDays(iso, todayISO());
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  if (diff === -1) return "Hier";
  if (diff > 1 && diff < 7) return `Dans ${diff} jours`;
  return null;
}

export function formatDateTime(d: Date | string) {
  const x = typeof d === "string" ? new Date(d) : d;
  return `${x.getDate()} ${MONTHS_SHORT[x.getMonth()]} ${x.getFullYear()} · ${pad(x.getHours())}:${pad(x.getMinutes())}`;
}

export function timeAgo(d: Date | string) {
  const x = typeof d === "string" ? new Date(d) : d;
  const s = Math.round((Date.now() - x.getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  if (s < 86400 * 7) return `il y a ${Math.floor(s / 86400)} j`;
  return formatDateTime(x);
}

export function euros(cents: number) {
  return new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

/** Grille du mois (semaines lun→dim) ; null = case hors mois */
export function monthGrid(period: string) {
  const [y, m] = period.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const days = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = Array(weekdayIndex(first)).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${period}-${pad(d)}`);
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function startOfWeek(iso: string) {
  return addDays(iso, -weekdayIndex(parseISODate(iso)));
}

export const STATUS: Record<string, { label: string; tone: string; dot: string }> = {
  REQUESTED: { label: "En attente", tone: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300", dot: "bg-amber-500" },
  CONFIRMED: { label: "Confirmé", tone: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300", dot: "bg-sky-500" },
  DONE: { label: "Effectué", tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300", dot: "bg-emerald-500" },
  REFUSED: { label: "Refusé", tone: "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300", dot: "bg-rose-500" },
  CANCELLED: { label: "Annulé", tone: "bg-zinc-100 text-zinc-600 dark:bg-zinc-400/15 dark:text-zinc-400", dot: "bg-zinc-400" },
};

export const SOURCE: Record<string, string> = {
  OWNER: "Client",
  ADMIN: "Gestionnaire",
  ICAL: "Synchro iCal",
};

export const KIND: Record<string, string> = {
  GITE: "Gîte",
  BUREAU: "Bureau",
  APPARTEMENT: "Appartement",
  AUTRE: "Autre",
};

export const COLORS = ["#0ea5e9", "#8b5cf6", "#f43f5e", "#10b981", "#f59e0b", "#6366f1", "#14b8a6", "#ec4899", "#84cc16", "#f97316"];
