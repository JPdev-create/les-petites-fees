/* Configuration Firebase publique de l'appli Permis BE.
 * Ces valeurs sont visibles dans le site, c'est normal : la sécurité vient des règles Firestore
 * (chaque utilisateur ne lit et n'écrit que ses propres données, voir firestore.rules → permis_users).
 * Pour utiliser un projet Firebase séparé, il suffit de remplacer ces valeurs. */
window.PERMIS_FIREBASE = {
  apiKey: "AIzaSyBVhscwMK0b18CkaZh8jgmGzJrVCqXEy-I",
  authDomain: "les-petites-fees.firebaseapp.com",
  projectId: "les-petites-fees",
  storageBucket: "les-petites-fees.firebasestorage.app",
  messagingSenderId: "821257023445",
  appId: "1:821257023445:web:bc64e766a2ffe6222ed75c",
};
// Modèle utilisé par le prof IA (Firebase AI Logic → Gemini Developer API).
window.PERMIS_AI_MODEL = "gemini-2.5-flash";
