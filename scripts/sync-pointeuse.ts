/**
 * Envoi immédiat du planning vers la Pointeuse LPF (sinon : automatiquement toutes les heures).
 * Usage : npm run sync:pointeuse -- --dry-run   (affiche ce qui serait envoyé, sans rien écrire)
 *         npm run sync:pointeuse                (FIREBASE_SERVICE_ACCOUNT + POINTEUSE_SERVICE_ACCOUNT)
 */
process.env.TZ ||= "Europe/Brussels";

import { initAdmin } from "./lib/admin";
import { POINTEUSE_WEEKS, initPointeuse, syncPointeuse } from "./lib/pointeuse";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const pt = initPointeuse();
  if (!pt) throw new Error("POINTEUSE_SERVICE_ACCOUNT manquant (clé du compte de service du projet pointeuse-lpf)");
  const { db } = initAdmin();
  const r = await syncPointeuse(db, pt, dryRun);
  r.lines.sort().forEach((l) => console.log(l));
  if (r.newChantiers.length) console.log(`\nChantiers ${dryRun ? "à créer" : "créés"} dans la pointeuse (aucun chantier du même nom) : ${r.newChantiers.join(", ")}`);
  console.log(`\n${dryRun ? "Simulation (rien n'a été écrit)" : "✓ Planning envoyé"} — ${POINTEUSE_WEEKS} semaines : ${r.created} ajouté(s), ${r.updated} modifié(s), ${r.deleted} retiré(s), ${r.notified} notification(s) d'équipe`);
  if (!dryRun) await db.doc("settings/main").set({ lastPointeuseRun: new Date().toISOString(), pointeuseError: null }, { merge: true });
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
