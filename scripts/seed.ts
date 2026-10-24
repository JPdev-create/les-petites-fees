/**
 * Données de démonstration — UNIQUEMENT pour l'émulateur local.
 * Usage : npm run seed   (avec « npm run emulators » lancé dans un autre terminal)
 */
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
process.env.TZ ||= "Europe/Brussels";

import { initAdmin } from "./lib/admin";
import { DEFAULT_SETTINGS } from "../src/lib/types";
import { addDays, currentPeriod, shiftPeriod, todayISO } from "../src/lib/format";

const { db } = initAdmin();
const now = new Date().toISOString();

async function wipe(name: string) {
  const snap = await db.collection(name).get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

async function main() {
  for (const c of ["profiles", "gites", "missions", "submissions", "invoices", "stock", "mail", "activity", "settings"]) await wipe(c);

  await db.doc("settings/main").set({ ...DEFAULT_SETTINGS, iban: "BE68 5390 0754 7034", bic: "GKCCBEBB", vatNumber: "BE0000.000.000" });

  const people = [
    { email: "gestion@lespetitesfees.be", name: "Sophie Gestion", role: "ADMIN" },
    { email: "jason@lespetitesfees.be", name: "Jason", role: "ADMIN" },
    { email: "marie.dupont@example.be", name: "Marie Dupont", role: "OWNER", phone: "+32 470 11 22 33", billingAddress: "Rue de la Station 4\n6900 Marche-en-Famenne" },
    { email: "luc.lambert@example.be", name: "Luc Lambert", role: "OWNER", company: "Gîtes de l'Ourthe SRL", vatNumber: "BE0712.345.678", billingAddress: "Route de Durbuy 18\n6940 Barvaux" },
    { email: "cabinet.renard@example.be", name: "Anne Renard", role: "OWNER", company: "Cabinet Renard", billingAddress: "Place aux Foires 2\n6900 Marche-en-Famenne" },
  ];
  for (const p of people) {
    await db.doc(`profiles/${p.email}`).set({ notifyEmail: true, notifySms: false, active: true, createdAt: now, company: "", phone: "", billingAddress: "", vatNumber: "", ...p });
  }

  const gites = [
    { id: "moulin", name: "Gîte du Moulin", owner: 2, color: "#0ea5e9", city: "Marche-en-Famenne", address: "Rue du Moulin 12", price: 7500, bedSets: 3, towelSets: 6, accessInfo: "Boîte à clés à gauche de la porte — code 2580" },
    { id: "verger", name: "Le Petit Verger", owner: 2, color: "#10b981", city: "Hotton", address: "Chemin des Pommiers 3", price: 6000, bedSets: 2, towelSets: 4 },
    { id: "ourthe", name: "Les Berges de l'Ourthe", owner: 3, color: "#8b5cf6", city: "Durbuy", address: "Quai de l'Ourthe 7", price: 9500, bedSets: 5, towelSets: 10 },
    { id: "chalet", name: "Chalet des Fagnes", owner: 3, color: "#f59e0b", city: "Rochefort", address: "Route des Fagnes 44", price: 8500, bedSets: 4, towelSets: 8 },
    { id: "cabinet", name: "Cabinet Renard (bureaux)", owner: 4, color: "#f43f5e", city: "Marche-en-Famenne", address: "Place aux Foires 2", price: 5500, bedSets: 0, towelSets: 0, kind: "BUREAU", defaultTime: "18:30" },
  ];
  for (const g of gites) {
    const o = people[g.owner];
    await db.doc(`gites/${g.id}`).set({
      name: g.name, kind: g.kind ?? "GITE", ownerEmail: o.email, ownerName: o.name, address: g.address, postalCode: "6900", city: g.city,
      accessInfo: g.accessInfo ?? "", notes: "", bedrooms: 2, bathrooms: 1, capacity: 4, bedSets: g.bedSets, towelSets: g.towelSets,
      price: g.price, durationMin: 120, defaultTime: g.defaultTime ?? "11:00", color: g.color, icalFeeds: [], active: true, createdAt: now, updatedAt: now,
    });
  }

  const today = todayISO();
  const mk = (gid: string, offset: number, status: string, extra: Record<string, unknown> = {}) => {
    const g = gites.find((x) => x.id === gid)!;
    const o = people[g.owner];
    return db.collection("missions").add({
      giteId: gid, giteName: g.name, giteColor: g.color, ownerEmail: o.email, ownerName: o.name,
      date: addDays(today, offset), time: g.defaultTime ?? "11:00", status, source: "OWNER", urgent: false, extraLinen: false,
      ownerNote: null, adminNote: null, price: g.price, invoiceId: null, notifyAdmin: false, notifyOwner: null,
      createdAt: now, updatedAt: now, doneAt: status === "DONE" ? now : null, ...extra,
    });
  };
  // Passé : effectués (à facturer) + un confirmé non clôturé
  for (const [gid, off] of [["moulin", -20], ["moulin", -13], ["verger", -9], ["ourthe", -16], ["ourthe", -6], ["chalet", -11], ["cabinet", -14], ["cabinet", -7]] as const) await mk(gid, off, "DONE");
  await mk("chalet", -2, "CONFIRMED");
  // À venir
  await mk("moulin", 0, "CONFIRMED", { ownerNote: "Arrivée des prochains voyageurs à 16 h" });
  await mk("ourthe", 1, "CONFIRMED", { source: "ICAL", icalSource: "Airbnb", icalUid: "demo-1", ownerNote: "Départ des voyageurs (Airbnb)" });
  await mk("cabinet", 0, "CONFIRMED");
  await mk("verger", 3, "CONFIRMED");
  await mk("chalet", 5, "CONFIRMED", { extraLinen: true });
  await mk("moulin", 6, "REQUESTED", { urgent: true, ownerNote: "6 voyageurs + lit bébé", notifyAdmin: true });
  await mk("ourthe", 8, "REQUESTED", { notifyAdmin: true });
  await mk("ourthe", 15, "REQUESTED", { notifyAdmin: true });
  await mk("verger", 12, "REQUESTED", { notifyAdmin: true });
  await mk("cabinet", 7, "CONFIRMED");

  const next = shiftPeriod(currentPeriod(), 1);
  await db.doc(`submissions/cabinet_${next}`).set({ giteId: "cabinet", ownerEmail: "cabinet.renard@example.be", period: next, empty: false, submittedAt: now });

  for (const s of [
    { name: "Parure 2 personnes", category: "LINGE", unit: "pièce", quantity: 24, threshold: 10, perVisit: 2 },
    { name: "Serviettes de bain", category: "LINGE", unit: "pièce", quantity: 18, threshold: 20, perVisit: 4 },
    { name: "Nettoyant multi-surfaces", category: "PRODUIT", unit: "flacon", quantity: 6, threshold: 3, perVisit: 0.2 },
    { name: "Produit vitres", category: "PRODUIT", unit: "flacon", quantity: 2, threshold: 3, perVisit: 0.15 },
    { name: "Sacs poubelle", category: "PRODUIT", unit: "rouleau", quantity: 12, threshold: 4, perVisit: 0.3 },
  ]) await db.collection("stock").add({ ...s, updatedAt: now });

  await db.collection("activity").add({ at: now, by: "Démo", message: "Données de démonstration chargées" });
  console.log("✓ Données de démo prêtes. Connectez-vous (bouton Google de l'émulateur) avec :");
  console.log("  Gestionnaire : gestion@lespetitesfees.be");
  console.log("  Client       : marie.dupont@example.be");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
