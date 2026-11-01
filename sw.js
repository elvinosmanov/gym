/* FORGE service worker
   Version lives in js/version.js (APP_VERSION) — bump ONLY that on every deploy.
   A changed version.js makes the browser see a changed worker, which installs a
   new versioned shell cache; activate() then deletes the old shell caches.
   The image cache (IMG_CACHE) is deliberately NOT versioned so exercise photos
   aren't re-downloaded on every deploy. */
importScripts("./js/version.js");   /* APP_VERSION */
const CACHE_VERSION = APP_VERSION;
const IMG_CACHE = "forge-img";      /* survives version bumps */
const IMG_MAX = 400;                /* ~107 exercises × 2 frames + fonts, with headroom */
const NET_TIMEOUT = 5000;           /* gym wifi: a hanging request must not block boot */

/* Precached at install so a cold start with no signal still boots the app.
   Every new JS/CSS file must be listed here (npm run check verifies it). */
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./body-front.png",
  "./body-back.png",
  "./vendor/supabase-js-2.117.3.js",
  "./css/app.css",
  "./js/version.js",
  "./js/update.js",
  "./js/images.js",
  "./js/library.js",
  "./js/state.js",
  "./js/sync.js",
  "./js/utils.js",
  "./js/progression.js",
  "./js/today.js",
  "./js/settings.js",
  "./js/train.js",
  "./js/timer.js",
  "./js/progress.js",
  "./js/plan-doctor.js",
  "./js/plan.js",
  "./js/actions.js",
  "./js/boot.js"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      /* addAll is all-or-nothing; add individually so one 404 can't abort the install.
         cache:"reload" skips the HTTP cache — otherwise the new shell could be filled
         with the previous deploy's JS that the browser still has cached (max-age),
         i.e. a new version.js next to old app code. */
      .then(c => Promise.all(SHELL.map(u =>
        fetch(new Request(u, { cache: "reload" }))
          .then(r => { if (r.ok) return c.put(u, r); })
          .catch(() => {})
      )))
    /* No skipWaiting() here: the new worker waits until the page sends
       SKIP_WAITING (js/update.js — the user taps "Yenilə", never mid-workout). */
  );
});

self.addEventListener("message", e => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      /* Drop old versioned shells, keep the current one and the shared image cache */
      .then(keys => Promise.all(keys
        .filter(k => k !== CACHE_VERSION && k !== IMG_CACHE)
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Network with a time limit: resolves with the response, rejects on failure/timeout.
   On timeout the fetch keeps running and still refreshes the cache in the background. */
function netWithTimeout(p) {
  return new Promise((ok, fail) => {
    const t = setTimeout(() => fail(new Error("timeout")), NET_TIMEOUT);
    p.then(r => { clearTimeout(t); ok(r); }, err => { clearTimeout(t); fail(err); });
  });
}

/* FIFO cap: cache.keys() returns entries in insertion order, so the first ones
   are the oldest. Runs after each new image; cheap at a few hundred entries. */
function trimImages() {
  return caches.open(IMG_CACHE).then(c => c.keys().then(keys =>
    Promise.all(keys.slice(0, Math.max(0, keys.length - IMG_MAX)).map(k => c.delete(k)))
  ));
}

const CODE_RE = /\.(?:html?|js|mjs|css|json|webmanifest)$/i;

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  /* Supabase is auth + live data: never serve it from cache, never store it.
     Letting the event fall through means the browser handles it normally. */
  if (url.hostname.endsWith("supabase.co")) return;

  const sameOrigin = url.origin === self.location.origin;

  /* App code (the document, js/*.js, css, manifest, vendor/): network-first,
     cache only as fallback. Cache-first here meant a deploy could run new HTML
     with old JS from the cache. cache:"no-cache" revalidates with the server
     (cheap 304) so the browser HTTP cache can't mix versions either. */
  if (sameOrigin && (req.mode === "navigate" || url.pathname.endsWith("/") || CODE_RE.test(url.pathname))) {
    const net = fetch(req.mode === "navigate" ? req : new Request(req, { cache: "no-cache" }))
      .then(r => {
        if (r && r.ok) {
          const copy = r.clone();
          e.waitUntil(caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(() => {}));
        }
        return r;
      });
    e.respondWith(
      netWithTimeout(net).catch(() =>
        caches.match(req, { ignoreSearch: req.mode === "navigate" })
          .then(r => r || (req.mode === "navigate" ? caches.match("./index.html") : undefined))
          /* nothing cached and network down: wait for the real fetch (or its error) */
          .then(r => r || net)
      )
    );
    return;
  }

  /* Same-origin images/icons (body map, app icons): precached, rarely change → cache-first */
  if (sameOrigin) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }

  /* Cross-origin images and fonts (jsDelivr exercise photos, Google Fonts CSS +
     woff2, Wikimedia): cache-first in the unversioned IMG_CACHE. Cached at runtime
     rather than vendored: offline coverage for every exercise you have opened,
     with no files to maintain. Anything else cross-origin (YouTube…) passes through. */
  const dest = req.destination;
  if (dest !== "image" && dest !== "font" && dest !== "style") return;

  e.respondWith(
    caches.open(IMG_CACHE).then(c => c.match(req).then(hit => {
      if (hit) return hit;
      /* Try CORS first (jsDelivr, gstatic, Wikimedia all send ACAO): an opaque
         no-cors response is padded to several MB in the storage quota, so 400 of
         them could eat gigabytes. Fall back to the page's own no-cors request. */
      return fetch(req.url, { mode: "cors", credentials: "omit" })
        .catch(() => fetch(req))
        .then(r => {
          /* type "opaque" = cross-origin no-cors; status is 0 but usable */
          if (r && (r.ok || r.type === "opaque")) {
            const copy = r.clone();
            e.waitUntil(c.put(req, copy).then(trimImages).catch(() => {}));
          }
          return r;
        });
      /* rejection -> network error -> the app's onerror fallbacks take over */
    }))
  );
});
