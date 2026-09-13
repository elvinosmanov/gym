/* FORGE service worker
   Bump CACHE_VERSION on every deploy — activate() deletes all other caches,
   which is what forces clients onto the new HTML instead of a stale shell. */
const CACHE_VERSION = "forge-v33";

/* Precached at install so a cold start with no signal still boots the app. */
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./body-front.png",
  "./body-back.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      /* addAll is all-or-nothing; add individually so one 404 can't abort the install */
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
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
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  /* Supabase is auth + live data: never serve it from cache, never store it.
     Letting the event fall through means the browser handles it normally. */
  if (url.hostname.endsWith("supabase.co")) return;

  /* The document itself: network-first so a redeploy is picked up immediately,
     cached copy only when the network fails. */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(r => {
          const copy = r.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(() => {});
          return r;
        })
        .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  /* Everything else — Google Fonts CSS + woff2, Wikimedia exercise images, the
     Supabase UMD bundle: cache-first, then fill the cache on first success.
     Images are cached at runtime rather than vendored: you get offline coverage
     for every exercise you have actually opened, with no files to maintain. */
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(r => {
        /* type "opaque" = cross-origin no-cors (fonts, images); status is 0 but usable */
        if (r && (r.ok || r.type === "opaque")) {
          const copy = r.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(() => {});
        }
        return r;
      }).catch(() => hit);   /* undefined -> the app's onerror fallbacks take over */
    })
  );
});
