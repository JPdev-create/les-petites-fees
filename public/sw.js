/* Les Petites Fées — service worker
 * - Pages et ressources statiques : réseau d'abord, cache en secours (hors ligne).
 * - Ressources versionnées (/_next/static) : cache d'abord.
 * - Les données passent par Firestore, qui gère lui-même son cache hors ligne.
 */
const VERSION = "lpf-v1";
const SCOPE = self.registration.scope; // ex. https://x.github.io/planning/
const SHELL = ["", "connexion/", "espace/", "espace/planifier/", "espace/historique/", "espace/compte/", "admin/", "admin/calendrier/", "admin/demandes/"].map((p) => SCOPE + p);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase, Google : jamais intercepté

  if (url.pathname.includes("/_next/static/") || url.pathname.includes("/icons/")) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      })),
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match(SCOPE + "connexion/"))),
  );
});
