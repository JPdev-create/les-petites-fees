"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";

const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo-lpf.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-lpf",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let cached: { app: FirebaseApp; auth: Auth; db: Firestore } | null = null;

/** Initialisation paresseuse (uniquement dans le navigateur). */
export function fb() {
  if (cached) return cached;
  const app = getApps()[0] ?? initializeApp(config);
  const auth = getAuth(app);
  auth.languageCode = "fr";
  // Cache local persistant : l'app reste consultable hors connexion et les
  // modifications faites hors ligne sont envoyées au retour du réseau.
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  if (useEmulators) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
  cached = { app, auth, db };
  return cached;
}

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** URL absolue d'une page de l'app (pour les liens e-mail Firebase). */
export function absoluteUrl(path: string) {
  return `${window.location.origin}${BASE_PATH}${path}`;
}
