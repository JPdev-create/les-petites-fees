// Vérifie qu'une adresse Gmail + mot de passe d'application sont acceptés par Gmail.
// Usage : node scripts/test-gmail.mjs   (rien n'est enregistré ni envoyé ailleurs)
import nodemailer from "nodemailer";
import readline from "node:readline";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, (a) => r(a.trim())));

const user = await ask("Adresse Gmail des envois : ");
const pass = (await ask("Mot de passe d'application (16 lettres) : ")).replace(/\s+/g, "");
rl.close();

console.log(`\nAdresse : ${user}`);
console.log(`Code    : ${pass.length} lettres ${pass.length === 16 ? "(OK)" : "(⚠ il en faut 16)"}`);
try {
  await nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } }).verify();
  console.log("\n✅ Gmail accepte cette adresse et ce code. Mettez EXACTEMENT les mêmes dans SMTP_USER et SMTP_PASS sur GitHub.");
} catch (e) {
  console.log("\n❌ Gmail refuse :", e.message.split("\n")[0]);
  console.log("   → Vérifiez que le code a été créé en étant connecté avec CETTE adresse (photo en haut à droite).");
}
