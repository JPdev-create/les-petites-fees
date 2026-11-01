// Accès administrateur à Firebase pour les scripts (GitHub Actions ou poste local).
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

export function initAdmin() {
  // Connexion par défaut (Petites Fées) : ne pas la confondre avec la connexion nommée « pointeuse »
  if (!getApps().some((a) => a.name === "[DEFAULT]")) {
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      initializeApp({ projectId: process.env.GCLOUD_PROJECT || "demo-lpf" });
    } else {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT manquant (JSON du compte de service)");
      initializeApp({ credential: cert(JSON.parse(raw)) });
    }
  }
  return { db: getFirestore(), auth: getAuth() };
}
