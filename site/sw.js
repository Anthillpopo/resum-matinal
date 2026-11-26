// Le Tri du jour : fonctionnement hors connexion et notification du matin.
const CACHE = "tri-v2";
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(["./", "index.html", "manifest.webmanifest", "icon-192.png"]).catch(() => {}))); });
self.addEventListener("activate", e => e.waitUntil(Promise.all([self.clients.claim(), caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))])));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // Toujours redemander la dernière version au serveur (sans passer par le cache du navigateur).
      const r = await fetch(e.request, { cache: "no-cache" });
      if (r.ok) cache.put(e.request, r.clone());
      return r;
    } catch (err) {
      const hit = await cache.match(e.request, { ignoreSearch: true });
      if (!hit) throw err;
      const h = new Headers(hit.headers); h.set("x-from-cache", "1");
      return new Response(await hit.blob(), { status: hit.status, headers: h });
    }
  })());
});
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (err) {}
  e.waitUntil(self.registration.showNotification(d.title || "Le Tri du jour", { body: d.body || "Les actus du jour sont prêtes.", icon: "icon-192.png", badge: "icon-192.png", tag: "tri-du-jour", data: { url: d.url || "./" } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => { const c = cs.find(c => c.url.startsWith(self.registration.scope)); return c ? c.focus() : self.clients.openWindow(url); }));
});
