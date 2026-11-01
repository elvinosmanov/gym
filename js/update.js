/* ================= yeni versiya bildirişi =================
   sw.js no longer calls skipWaiting() at install: a new deploy installs in the
   background and WAITS. This file notices the waiting worker, shows a banner,
   and only on "Yenilə" tells it to take over (SKIP_WAITING) and reloads once.
   During a workout (state.active) no reload is offered — the banner says it will
   be possible after the workout and the button appears once the workout ends. */
(function(){
  if(!("serviceWorker" in navigator)) return;
  const sw = navigator.serviceWorker;
  const CHECK_EVERY = 30*60*1000;          /* reg.update() at most once per 30 min */
  const LOOP_KEY = "forge-sw-reload";      /* sessionStorage: last update-reload time */
  let reg = null, banner = null, lastCheck = Date.now(), wantReload = false, poll = 0;

  const inWorkout = () => { try{ return !!(state && state.active); }catch(_){ return false; } };

  function css(){
    if(document.getElementById("updStyle")) return;
    const s = document.createElement("style");
    s.id = "updStyle";
    /* #tabbar is fixed at the bottom, z-index 40, ~70px + safe area; sheets are 60+.
       --upd-bottom is set from the real tab bar height in place(). */
    s.textContent = `
.updbar{position:fixed;left:50%;transform:translateX(-50%);z-index:45;
  bottom:var(--upd-bottom,calc(84px + env(safe-area-inset-bottom)));
  width:calc(100% - 24px);max-width:476px;display:flex;align-items:center;gap:10px;
  background:var(--card2,#1e232b);color:var(--ink,#eef1f5);border:1px solid var(--line,#272d38);
  border-radius:14px;padding:10px 10px 10px 14px;box-shadow:0 8px 28px rgba(0,0,0,.45);
  font-size:13.5px;line-height:1.35}
.updbar .updtxt{flex:1;min-width:0}
.updbar .updtxt b{display:block;font-weight:600}
.updbar .updtxt span{color:var(--mut,#96a0ad);font-size:12px}
.updbar button{border:0;border-radius:10px;font-weight:600;font-size:13px;min-height:40px}
.updbar .updgo{background:var(--chalk,#f0ede3);color:var(--chalk-ink,#15181d);padding:0 14px;letter-spacing:.04em}
.updbar .updx{background:none;color:var(--mut,#96a0ad);width:36px;font-size:16px}`;
    document.head.appendChild(s);
  }

  /* sit just above the tab bar, whatever its height is on this device */
  function place(){
    if(!banner) return;
    const tb = document.getElementById("tabbar");
    /* (offsetParent is always null for position:fixed, so check display instead) */
    const h = tb && getComputedStyle(tb).display !== "none" ? tb.getBoundingClientRect().height : 0;
    banner.style.setProperty("--upd-bottom", h ? (h + 10) + "px" : "calc(16px + env(safe-area-inset-bottom))");
  }

  function render(){
    if(!banner) return;
    const busy = inWorkout();
    if(banner._busy === busy) return;      /* only rebuild when the mode changes */
    banner._busy = busy;
    banner.textContent = "";
    const txt = document.createElement("div");
    txt.className = "updtxt";
    const b = document.createElement("b");
    b.textContent = "Yeni versiya hazırdır";
    const s = document.createElement("span");
    s.textContent = busy ? "Məşq bitəndən sonra yeniləyə bilərsən." : "Yeniləmək bir saniyə çəkir, qeydlər qalır.";
    txt.append(b, s);
    banner.appendChild(txt);
    if(!busy){
      const go = document.createElement("button");
      go.type = "button"; go.className = "updgo"; go.textContent = "Yenilə";
      go.addEventListener("click", apply);
      banner.appendChild(go);
    }
    const x = document.createElement("button");
    x.type = "button"; x.className = "updx"; x.textContent = "✕";
    x.setAttribute("aria-label", "Sonra");
    x.addEventListener("click", hide);
    banner.appendChild(x);
  }

  function show(){
    if(!reg || !reg.waiting || !sw.controller) return;   /* first install: nothing to replace */
    css();
    if(!banner){
      banner = document.createElement("div");
      banner.className = "updbar";
      banner.id = "updBanner";
      banner.setAttribute("role", "status");
      banner.setAttribute("aria-live", "polite");
      document.body.appendChild(banner);
      window.addEventListener("resize", place);
    }
    render(); place();
    /* workout start/finish isn't an event we can hook from here: re-check cheaply */
    clearInterval(poll);
    poll = setInterval(render, 3000);
  }

  function hide(){
    clearInterval(poll);
    if(banner){ banner.remove(); banner = null; }
  }

  function apply(){
    if(inWorkout()){ render(); return; }     /* workout started since the banner was drawn */
    const w = reg && reg.waiting;
    if(!w){ hide(); return; }
    wantReload = true;
    w.postMessage({ type: "SKIP_WAITING" });
  }

  /* Reload once, only for a takeover THIS tab asked for. A takeover started from
     another tab must not reload this one (it may be mid-workout); network-first
     code fetching keeps it working until its next normal reload. */
  sw.addEventListener("controllerchange", () => {
    if(!wantReload) { hide(); return; }
    wantReload = false;
    let last = 0;
    try{ last = +sessionStorage.getItem(LOOP_KEY) || 0; }catch(_){}
    if(Date.now() - last < 10000){ hide(); return; }      /* loop guard */
    try{ sessionStorage.setItem(LOOP_KEY, String(Date.now())); }catch(_){}
    location.reload();
  });

  function watch(r){
    if(!r || reg === r) return;
    reg = r;
    if(r.waiting) show();
    r.addEventListener("updatefound", () => {
      const nw = r.installing;
      if(!nw) return;
      nw.addEventListener("statechange", () => {
        /* "installed" with an existing controller = an update is waiting */
        if(nw.state === "installed" && sw.controller) show();
      });
    });
  }

  function check(){
    if(!reg) return;
    lastCheck = Date.now();
    reg.update().catch(() => {});            /* offline: try again next time */
  }

  document.addEventListener("visibilitychange", () => {
    if(document.visibilityState !== "visible") return;
    if(Date.now() - lastCheck >= CHECK_EVERY) check();
    if(reg && reg.waiting) show();
  });

  /* boot.js registers on window "load"; this listener is added later, so it runs
     after that. Registering again with the same URL returns the same registration
     and sets updateViaCache:"none", so the update check also bypasses the HTTP cache
     for the imported js/version.js (the only file that changes on a version bump). */
  window.addEventListener("load", () => {
    sw.register("sw.js", { updateViaCache: "none" })
      .then(watch)
      .catch(() => sw.getRegistration().then(watch).catch(() => {}));
  });
  sw.getRegistration().then(watch).catch(() => {});
})();
