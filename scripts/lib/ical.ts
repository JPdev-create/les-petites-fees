// Lecture des calendriers iCal (Airbnb, Booking, Abritel…)
import { pad } from "../../src/lib/format";

export type VEvent = { uid: string; start: string; end: string; summary: string };

/** Valeur DTSTART/DTEND iCal → date locale AAAA-MM-JJ (Europe/Brussels pour les heures UTC). */
function icalDate(value: string) {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/);
  if (!m) return null;
  if (m[4] && m[7]) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
    const local = new Date(d.toLocaleString("en-US", { timeZone: "Europe/Brussels" }));
    return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`;
  }
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export function parseIcs(text: string): VEvent[] {
  const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const events: VEvent[] = [];
  let cur: Partial<VEvent> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") cur = {};
    else if (line === "END:VEVENT") {
      if (cur?.start && cur.end) events.push({ uid: cur.uid || `${cur.start}-${cur.end}`, start: cur.start, end: cur.end, summary: cur.summary || "" });
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(":");
      if (idx < 0) continue;
      const key = line.slice(0, idx).split(";")[0].toUpperCase();
      const val = line.slice(idx + 1).trim();
      if (key === "UID") cur.uid = val;
      else if (key === "DTSTART") cur.start = icalDate(val) ?? undefined;
      else if (key === "DTEND") cur.end = icalDate(val) ?? undefined;
      else if (key === "SUMMARY") cur.summary = val.replace(/\\,/g, ",").replace(/\\n/gi, " ");
    }
  }
  return events;
}

/** Les blocages manuels Airbnb (« Not available ») ne sont pas des séjours. */
export function isReservation(e: VEvent) {
  return !/airbnb\s*\(not available\)/i.test(e.summary);
}

/**
 * Lien de calendrier acceptable : https (ou webcal, converti), vers un nom de domaine public.
 * Les liens sont saisis par les clients : on refuse les adresses IP et les noms locaux.
 */
export function safeFeedUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim().replace(/^webcals?:\/\//i, "https://"));
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return null;
  if (!host.includes(".") || host.startsWith("[") || /^[\d.]+$/.test(host) || /(^|\.)(localhost|local|internal|lan|home|arpa)$/.test(host)) return null;
  return u.toString();
}

/** Taille maximale d'un calendrier téléchargé */
export const MAX_ICS_BYTES = 5_000_000;
