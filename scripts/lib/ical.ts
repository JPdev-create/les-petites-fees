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
