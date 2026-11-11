/* Permis BE — service worker : l'application fonctionne entièrement hors ligne.
 * Portée limitée au dossier /permis/ (prioritaire sur le service worker du site principal). */
const VERSION = "permisbe-v3";
const FILES = [
  "./", "index.html", "css/app.css", "manifest.webmanifest", "icon.svg", "icon-192.png", "apple-touch-icon.png",
  "js/firebase-config.js", "js/signs.js", "js/questions.js", "js/questions2.js", "js/gen.js", "js/rules.js", "js/lessons.js", "js/tpr.js", "js/app.js", "js/cloud.js",
  "vendor/firebase-app.js", "vendor/firebase-auth.js", "vendor/firebase-firestore.js", "vendor/firebase-ai.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => Promise.allSettled(FILES.map((f) => c.add(f)))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("permisbe-") && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Réseau d'abord (pour recevoir les mises à jour des questions), cache en secours.
// Les appels à Firebase (autres domaines) ne sont jamais interceptés.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || caches.match("index.html"))),
  );
});
