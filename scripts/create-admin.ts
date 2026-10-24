/**
 * Crée (ou réactive) un compte gestionnaire dans Firestore.
 * À utiliser une fois pour le tout premier gestionnaire ; les suivants s'ajoutent depuis l'application.
 *
 * Usage :
 *   FIREBASE_SERVICE_ACCOUNT="$(cat cle.json)" npm run create-admin -- prenom@gmail.com "Prénom Nom"
 */
import { initAdmin } from "./lib/admin";
import { DEFAULT_SETTINGS } from "../src/lib/types";

const [email, ...nameParts] = process.argv.slice(2);
if (!email || !email.includes("@")) {
  console.error('Usage : npm run create-admin -- adresse@gmail.com "Prénom Nom"');
  process.exit(1);
}

const { db } = initAdmin();
const id = email.trim().toLowerCase();
const name = nameParts.join(" ") || id.split("@")[0];

(async () => {
  await db.doc(`profiles/${id}`).set(
    { email: id, name, role: "ADMIN", active: true, notifyEmail: true, notifySms: false, company: "", phone: "", createdAt: new Date().toISOString() },
    { merge: true },
  );
  const settings = await db.doc("settings/main").get();
  if (!settings.exists) await db.doc("settings/main").set(DEFAULT_SETTINGS);
  console.log(`✓ ${name} <${id}> est gestionnaire. Connexion avec le bouton Google.`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
