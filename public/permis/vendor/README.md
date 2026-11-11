Copie locale du SDK web Firebase 12.3.0 (licence Apache 2.0, © Google LLC),
fichiers ESM du paquet npm `firebase` (`firebase-app.js`, `firebase-auth.js`, `firebase-firestore.js`, `firebase-ai.js`).
Seule modification : les imports pointent vers `./firebase-app.js` au lieu du CDN gstatic,
pour que l'appli fonctionne hors ligne et sans dépendance externe.
