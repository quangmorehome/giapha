/* Gia phả số: cache khung ứng dụng; dữ liệu (Supabase) không bao giờ được lưu ở đây */
const V = "gp-1.56.0";
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(V).then(c => c.addAll(["./", "manifest.webmanifest", "apple-touch-icon.png", "icon-192.png"])).catch(() => {})); });
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return; const u = new URL(r.url); if (u.origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r).then(m => m || caches.match("./"))));
});
