/* Couche « nuage » : compte (Google ou lien e-mail), sauvegarde Firestore et prof IA (Firebase AI Logic).
 * Chargée en module ; expose window.Cloud et déclenche l'événement « cloud-ready ».
 * Si Firebase est injoignable, l'appli continue de fonctionner en local. */
import { initializeApp } from "../vendor/firebase-app.js";
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, signOut, setPersistence, browserLocalPersistence,
} from "../vendor/firebase-auth.js";
import { connectAuthEmulator } from "../vendor/firebase-auth.js";
import {
  connectFirestoreEmulator,
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, setDoc, collection, getDocs, query, orderBy, limit as qlimit, deleteDoc,
} from "../vendor/firebase-firestore.js";
import { getAI, getGenerativeModel, GoogleAIBackend } from "../vendor/firebase-ai.js";

const EMAIL_KEY = "permisbe.emailForSignIn";
const listeners = new Set();
let user = null;

const app = initializeApp(window.PERMIS_FIREBASE, "permis");
const auth = getAuth(app);
auth.languageCode = "fr";
setPersistence(auth, browserLocalPersistence).catch(() => {});
let db;
try {
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
} catch (e) {
  db = initializeFirestore(app, {});
}

// Tests locaux uniquement : localStorage « permisbe.emulators » = "1" → émulateurs Firebase (localhost).
try {
  if (localStorage.getItem("permisbe.emulators") === "1" && location.hostname === "localhost") {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "localhost", 8080);
  }
} catch (e) { /* ignore */ }

const userRef = () => doc(db, "permis_users", user.uid);
const clean = (o) => JSON.parse(JSON.stringify(o)); // retire les undefined (refusés par Firestore)

/* ---------- Authentification ---------- */
onAuthStateChanged(auth, (u) => {
  user = u;
  listeners.forEach((cb) => { try { cb(u); } catch (e) { console.error(e); } });
});
getRedirectResult(auth).catch(() => {});

// Retour depuis un lien de connexion reçu par e-mail
async function finishEmailLink() {
  if (!isSignInWithEmailLink(auth, location.href)) return null;
  let email = null;
  try { email = localStorage.getItem(EMAIL_KEY); } catch (e) { /* ignore */ }
  if (!email) email = prompt("Confirme ton adresse e-mail pour terminer la connexion :");
  if (!email) return null;
  const cred = await signInWithEmailLink(auth, email.trim().toLowerCase(), location.href);
  try { localStorage.removeItem(EMAIL_KEY); } catch (e) { /* ignore */ }
  history.replaceState(null, "", location.pathname + "#/compte");
  return cred.user;
}

/* ---------- Prof IA ---------- */
const SYSTEM = `Tu es « Prof Permis », un moniteur d'auto-école belge, bienveillant, clair et précis.
Tu aides un candidat à réussir l'examen théorique du permis B en Belgique.
Règles :
- Réponds en français simple, tutoie, phrases courtes. 150 mots maximum sauf si on te demande plus.
- Base-toi sur le Code de la route belge en vigueur en novembre 2026. Si la règle diffère selon la Région (Wallonie, Bruxelles, Flandre), précise-le.
- Quand une explication officielle de la question t'est fournie, elle fait foi : ne la contredis pas.
- N'invente jamais un numéro d'article, un montant ou une date. Si tu n'es pas sûr, dis-le et renvoie vers codedelaroute.be.
- Le Code de la voie publique (1er juin 2027) n'est pas encore en vigueur : n'en parle que si on te le demande.
- Donne volontiers un exemple concret ou une astuce mnémotechnique.
- Utilise **gras** et des listes à tirets si utile. Pas de tableaux.
- Refuse poliment ce qui n'a rien à voir avec la conduite ou le permis.`;
let model = null;
function getModel() {
  if (!model) {
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    model = getGenerativeModel(ai, { model: window.PERMIS_AI_MODEL || "gemini-2.5-flash", systemInstruction: SYSTEM, generationConfig: { temperature: 0.4, maxOutputTokens: 4096 } });
  }
  return model;
}

function aiError(e) {
  const m = String((e && (e.message || e.code)) || e);
  if (/api.*not.*enabled|PERMISSION_DENIED|firebasevertexai|firebaseml|has not been used|API_NOT_ENABLED|not enabled/i.test(m)) return "Le prof IA n'est pas encore activé dans la console Firebase (menu « AI Logic » → activer l'API Gemini Developer).";
  if (/quota|RESOURCE_EXHAUSTED|429/i.test(m)) return "Le prof IA a atteint sa limite d'utilisation pour le moment. Réessaie un peu plus tard.";
  if (/network|fetch|Failed to fetch|offline/i.test(m)) return "Pas de connexion internet : le prof IA a besoin du réseau.";
  return "Le prof IA n'a pas pu répondre (" + m.slice(0, 120) + ").";
}

window.Cloud = {
  get user() { return user; },
  onUser(cb) { listeners.add(cb); cb(user); return () => listeners.delete(cb); },

  async signInGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try { return (await signInWithPopup(auth, provider)).user; }
    catch (e) {
      if (e && (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment")) return signInWithRedirect(auth, provider);
      throw e;
    }
  },
  async sendLink(email) {
    email = String(email || "").trim().toLowerCase();
    await sendSignInLinkToEmail(auth, email, { url: location.origin + location.pathname, handleCodeInApp: true });
    try { localStorage.setItem(EMAIL_KEY, email); } catch (e) { /* ignore */ }
  },
  finishEmailLink,
  signOut() { return signOut(auth); },

  /* ---------- Données ---------- */
  async loadState() {
    if (!user) return null;
    const snap = await getDoc(userRef());
    return snap.exists() ? snap.data() : null;
  },
  async saveState(state) {
    if (!user) return;
    await setDoc(userRef(), clean({ ...state, updatedAt: Date.now(), email: user.email || null, name: user.displayName || null }));
  },
  async saveItem(kind, item) { // kind : "exams" | "sessions"
    if (!user) return;
    await setDoc(doc(db, "permis_users", user.uid, kind, item.id), clean(item));
  },
  async listItems(kind, n = 100) {
    if (!user) return [];
    const snap = await getDocs(query(collection(db, "permis_users", user.uid, kind), orderBy("d", "desc"), qlimit(n)));
    return snap.docs.map((d) => d.data());
  },
  async wipe() {
    if (!user) return;
    for (const kind of ["exams", "sessions"]) {
      const snap = await getDocs(collection(db, "permis_users", user.uid, kind));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    }
    await deleteDoc(userRef());
  },

  /* ---------- IA ---------- */
  // history : [{ role: "user" | "model", text }] ; onChunk(texteComplet) appelé pendant la génération.
  async ask(history, message, onChunk) {
    try {
      const chat = getModel().startChat({ history: history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })) });
      const res = await chat.sendMessageStream(message);
      let full = "";
      for await (const chunk of res.stream) {
        full += chunk.text();
        onChunk && onChunk(full);
      }
      return full;
    } catch (e) {
      throw new Error(aiError(e));
    }
  },
};

finishEmailLink().catch((e) => console.warn("Lien de connexion :", e && e.message));
window.dispatchEvent(new Event("cloud-ready"));
