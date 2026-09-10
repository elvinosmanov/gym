/* FORGE service worker
   Məqsəd: zalda siqnal olmayanda app tam işləsin.
   Yeni versiya yerləşdirəndə CACHE_VERSION-u artırın — köhnə keş silinir. */
const CACHE_VERSION = "forge-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;                  /* Supabase yazmalarına toxunmuruq */

  const url = new URL(req.url);

  /* Supabase API — həmişə şəbəkə, oflayn olsa app onsuz da lokal işləyir */
  if (url.hostname.endsWith("supabase.co")) return;

  /* Naviqasiya — şəbəkə əvvəl, alınmasa keşdəki qabıq */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).catch(() => caches.match("./index.html"))
    );
    return;
  }

  /* Şriftlər, hərəkət şəkilləri, Supabase CDN skripti:
     keş əvvəl, arxa planda yenilə (stale-while-revalidate). */
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
