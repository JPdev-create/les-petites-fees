/**
 * Génère un aperçu HTML de tous les e-mails automatiques (données d'exemple).
 * Usage : npx tsx scripts/preview-emails.ts [dossier]   → ouvre ensuite index.html
 */
// Lancer avec APP_URL=https://… pour des liens et un logo réels

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "./lib/mailer";
import { adminRequestsEmail, adminSignupEmail, inviteEmail, ownerUpdateEmail, reminderEmail } from "./lib/emails";
import { DEFAULT_SETTINGS, type Gite, type Mission, type Profile, type Settings } from "../src/lib/types";

const out = process.argv[2] || "email-previews";
mkdirSync(out, { recursive: true });

const s: Settings = { ...DEFAULT_SETTINGS, bceNumber: "0123.456.789", legalForm: "SRL", vatNumber: "BE0123.456.789" };
const marie: Profile = { id: "marie@example.be", role: "OWNER", name: "Marie Dupont", email: "marie@example.be", phone: "0470 11 22 33", notifyEmail: true, notifySms: false, active: true };
const admin: Profile = { ...marie, id: "gestion@example.be", role: "ADMIN", name: "Sophie Gestion", email: "gestion@example.be" };
const gite = (id: string, name: string, address: string, city: string, access = "Boîte à clés — code 2580"): Gite => ({
  id, name, kind: "GITE", ownerEmail: marie.id, ownerName: marie.name, address, postalCode: "6900", city, accessInfo: access, notes: "",
  bedrooms: 3, bathrooms: 2, capacity: 6, bedSets: 3, towelSets: 6, price: 7500, durationMin: 120, defaultTime: "11:00", color: "#0ea5e9", icalFeeds: [], active: true,
});
const gites = new Map([["moulin", gite("moulin", "Gîte du Moulin", "Rue du Moulin 12", "Marche-en-Famenne")], ["verger", gite("verger", "Le Petit Verger", "Chemin des Pommiers 3", "Hotton", "")]]);
const mission = (giteId: string, date: string, extra: Partial<Mission> = {}): Mission => ({
  id: date, giteId, giteName: gites.get(giteId)!.name, giteColor: "#0ea5e9", ownerEmail: marie.id, ownerName: marie.name,
  date, time: "11:00", status: "CONFIRMED", source: "OWNER", price: 7500, ...extra,
});

const emails: [string, string, ReturnType<typeof render>][] = [];
const add = (file: string, subject: string, e: Parameters<typeof render>[0]) => emails.push([file, subject, render(e, s)]);

{ const [subj, e] = inviteEmail(marie, s); add("1-invitation", subj, e); }
{ const [subj, e] = ownerUpdateEmail(marie, [mission("moulin", "2026-11-07", { notifyOwner: "CONFIRMED" }), mission("verger", "2026-11-14", { notifyOwner: "CONFIRMED" })], gites, s); add("2-confirmation", subj, e); }
{ const [subj, e] = ownerUpdateEmail(marie, [mission("moulin", "2026-11-08", { notifyOwner: "MOVED", adminNote: "complet le 7, décalé au lendemain" })], gites, s); add("3-changement-de-date", subj, e); }
{ const [subj, e] = ownerUpdateEmail(marie, [mission("verger", "2026-11-21", { notifyOwner: "REFUSED", refuseReason: "Nous sommes complets ce jour-là, le 22 vous conviendrait-il ?" })], gites, s); add("4-refus", subj, e); }
{ const [subj, e] = reminderEmail(marie, "2026-11", ["Gîte du Moulin", "Le Petit Verger"], s); add("5-relance-fin-de-mois", subj, e); }
{ const [subj, e] = adminRequestsEmail(admin, [mission("moulin", "2026-10-30", { status: "REQUESTED", urgent: true, ownerNote: "6 voyageurs + lit bébé" }), mission("verger", "2026-11-05", { status: "REQUESTED", extraLinen: true })], [], gites, new Map([[marie.id, marie]])); add("7-gestionnaire-nouvelles-demandes", subj, e); }
{ const [subj, e] = adminSignupEmail(admin, [{ ...marie, name: "Paul Martin", email: "paul@example.be", billingAddress: "Rue des Lilas 9\n6900 Marche" }], [{ ...gites.get("moulin")!, name: "Gîte des Ardennes", ownerName: "Paul Martin" }]); add("8-gestionnaire-nouveau-lieu", subj, e); }

for (const [file, , r] of emails) writeFileSync(join(out, `${file}.html`), r.html);
writeFileSync(
  join(out, "index.html"),
  `<!doctype html><meta charset="utf-8"><title>Aperçu des e-mails</title>
<body style="margin:0;font-family:system-ui;background:#e5e7eb">
<div style="display:flex;height:100vh">
<nav style="width:300px;overflow:auto;background:#fff;border-right:1px solid #ddd;padding:16px">
<h2 style="margin:0 0 12px;font-size:16px">E-mails automatiques</h2>
${emails.map(([f, subj]) => `<a href="${f}.html" target="v" style="display:block;padding:10px;border-radius:8px;color:#18181b;text-decoration:none;font-size:14px;border:1px solid #eee;margin-bottom:8px"><b>${f.replace(/^\d-/, "").replace(/-/g, " ")}</b><br><span style="color:#666;font-size:12px">Objet : ${subj}</span></a>`).join("")}
</nav>
<iframe name="v" src="${emails[0][0]}.html" style="flex:1;border:0;background:#fff"></iframe>
</div></body>`,
);
console.log(`✓ ${emails.length} aperçus générés dans ${out}`);
