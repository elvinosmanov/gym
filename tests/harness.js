"use strict";
/* Test harness: loads the app's classic scripts into a Node `vm` context with
   just enough browser stubs for top-level code to run. No rendering is tested.

   Scripts are discovered from the <script src="js/..."> tags in index.html, in
   order, so a newly added file is picked up automatically (vendor/ is skipped).
   Each file runs as its own vm.Script in ONE shared context — exactly like
   separate <script> tags in a page: top-level const/let live in the context's
   shared global lexical scope and are visible to later scripts and to the
   epilogue. Per-file scripts keep real file names in stack traces and let one
   file's top-level error be reported without hiding the others. */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function scriptList(){
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const out = [];
  const rx = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m;
  while((m = rx.exec(html))){
    const src = m[1].replace(/^\.\//, "").split(/[?#]/)[0];
    if(/^(https?:)?\/\//i.test(src)) continue;
    if(src.startsWith("vendor/")) continue;
    if(src.startsWith("js/")) out.push(src);
  }
  return out;
}

/* An inert DOM element: every common property/method exists and does nothing.
   Unknown properties resolve to a no-op function that returns another stub, so
   chained calls (el.closest(...).classList.add(...)) never throw. Assigned
   properties stick. */
function makeEl(tag){
  const noop = () => {};
  const classes = new Set();
  const target = {
    tagName: String(tag || "div").toUpperCase(),
    innerHTML: "", textContent: "", value: "", checked: false, disabled: false,
    style: {}, dataset: {}, children: [], childNodes: [], scrollTop: 0, offsetHeight: 0,
    classList: {
      add: (...c) => c.forEach(x => classes.add(x)),
      remove: (...c) => c.forEach(x => classes.delete(x)),
      toggle: (c, f) => { const on = f === undefined ? !classes.has(c) : !!f; on ? classes.add(c) : classes.delete(c); return on; },
      contains: c => classes.has(c)
    },
    addEventListener: noop, removeEventListener: noop, dispatchEvent: () => true,
    setAttribute: noop, getAttribute: () => null, removeAttribute: noop, hasAttribute: () => false,
    appendChild: x => x, removeChild: x => x, insertBefore: x => x, append: noop, prepend: noop,
    remove: noop, focus: noop, blur: noop, click: noop, select: noop, scrollIntoView: noop, scrollTo: noop,
    querySelector: () => makeEl(), querySelectorAll: () => [], closest: () => makeEl(),
    getBoundingClientRect: () => ({ top:0, left:0, right:0, bottom:0, width:0, height:0 }),
    getContext: () => new Proxy({}, { get: () => noop })
  };
  return new Proxy(target, {
    get(t, p){
      if(p in t) return t[p];
      if(typeof p === "symbol" || p === "then" || p === "toJSON" || p === "valueOf" || p === "toString") return undefined;
      return () => makeEl();
    },
    set(t, p, v){ t[p] = v; return true; }
  });
}

function makeStorage(){
  const m = new Map();
  return {
    getItem: k => m.has(String(k)) ? m.get(String(k)) : null,
    setItem: (k, v) => { m.set(String(k), String(v)); },
    removeItem: k => { m.delete(String(k)); },
    clear: () => m.clear(),
    key: i => [...m.keys()][i] ?? null,
    get length(){ return m.size; }
  };
}

/* Names the epilogue exposes through T (see loadApp). Functions declared with
   `function` are also plain properties of the context; const/let are not, so
   they are reached through a getter that evaluates the name inside the
   context. A missing name yields undefined instead of throwing, so a rename
   by someone else shows up as a focused test failure, not a harness crash. */
const EPILOGUE = `
globalThis.__get = function(n){ try { return eval(n); } catch(e){ if(e instanceof ReferenceError) return undefined; throw e; } };
globalThis.__setState = function(v){ state = v; };
globalThis.__set = function(n, v){ if(!/^[A-Za-z_$][\\w$]*$/.test(n)) throw new Error("bad name " + n); eval(n + " = v"); };
`;

function loadApp(opts = {}){
  const errors = [];
  const timers = [];
  const ls = makeStorage();
  const doc = {
    readyState: "complete", visibilityState: "visible", hidden: false, cookie: "",
    body: makeEl("body"), documentElement: makeEl("html"), head: makeEl("head"),
    querySelector: () => makeEl(), querySelectorAll: () => [],
    getElementById: () => makeEl(), getElementsByClassName: () => [], getElementsByTagName: () => [],
    createElement: t => makeEl(t), createElementNS: (_, t) => makeEl(t), createTextNode: () => makeEl("#text"),
    addEventListener: () => {}, removeEventListener: () => {}
  };
  const sandbox = {
    console: opts.quiet === false ? console : { log(){}, info(){}, warn(){}, error(){}, debug(){} },
    document: doc,
    localStorage: ls, sessionStorage: makeStorage(),
    navigator: { onLine: true, userAgent: "node-test", language: "az", vibrate: () => true },
    location: { href: "http://localhost/", origin: "http://localhost", protocol: "http:", host: "localhost",
      hostname: "localhost", pathname: "/", search: "", hash: "", reload(){}, replace(){}, assign(){} },
    history: { pushState(){}, replaceState(){}, back(){} },
    screen: { width: 390, height: 844 },
    innerWidth: 390, innerHeight: 844, devicePixelRatio: 1,
    /* real setTimeout, unref'd so a pending save() never keeps the test process alive */
    setTimeout: (fn, ms, ...a) => { const h = setTimeout(() => { try { fn(...a); } catch(e){ errors.push(e); } }, ms); if(h.unref) h.unref(); timers.push(h); return h; },
    clearTimeout: h => clearTimeout(h),
    /* intervals (60 s cloud retry, timers) never fire in tests */
    setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
    matchMedia: () => ({ matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} }),
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => true,
    alert: () => {}, confirm: () => true, prompt: () => null, scrollTo: () => {},
    fetch: () => Promise.reject(new Error("fetch disabled in tests")),
    URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, queueMicrotask, atob, btoa,
    Blob: typeof Blob !== "undefined" ? Blob : function(){},
    Image: function(){ return makeEl("img"); },
    Audio: function(){ return makeEl("audio"); }
  };
  if(opts.localStorage) Object.entries(opts.localStorage).forEach(([k, v]) => ls.setItem(k, v));
  const ctx = vm.createContext(sandbox);
  ctx.window = ctx; ctx.self = ctx;

  /* Boot code (loadState().then(()=>{...renderToday()})) renders asynchronously.
     Rendering is not under test, and a render that rejects against the stubs
     must not fail the test file as an unhandled rejection. While the scripts
     load, every promise chained with .then() gets a recorder attached, so such
     a rejection lands in `errors` (async:true) instead. Restored afterwards. */
  ctx.__bootErr = e => errors.push(Object.assign(e instanceof Error ? e : new Error(String(e)), { async: true }));
  new vm.Script(`(function(){
    const P = Promise.prototype, orig = P.then;
    globalThis.__restoreThen = function(){ P.then = orig; };
    P.then = function(a, b){ const q = orig.call(this, a, b); orig.call(q, undefined, e => __bootErr(e)); return q; };
  })();`, { filename: "harness-prologue.js" }).runInContext(ctx);

  const files = scriptList();
  files.forEach(rel => {
    const code = fs.readFileSync(path.join(ROOT, rel), "utf8");
    try { new vm.Script(code, { filename: rel }).runInContext(ctx); }
    catch(e){ errors.push(Object.assign(e, { file: rel })); }
  });
  ctx.__restoreThen();
  new vm.Script(EPILOGUE, { filename: "harness-epilogue.js" }).runInContext(ctx);

  const get = n => ctx.__get(n);
  /* T.name → any app global (function, const, let). T.state is read/write. */
  const T = new Proxy({}, {
    get(_, p){
      if(p === "state") return ctx.__get("state");
      if(typeof p === "symbol") return undefined;
      return get(p);
    },
    set(_, p, v){
      if(p === "state"){ ctx.__setState(v); return true; }
      if(typeof p === "symbol") return false;
      ctx.__set(p, v); return true;
    }
  });
  /* fresh default state (deep copy of DEFAULTS), program rebuilt; `patch` is
     shallow-merged on top, `profile` merged into profile */
  function reset(patch = {}){
    const s = JSON.parse(JSON.stringify(get("DEFAULTS")));
    const { profile, ...rest } = patch;
    Object.assign(s, rest);
    if(profile) Object.assign(s.profile, profile);
    ctx.__setState(s);
    if(typeof ctx.buildProgram === "function") ctx.buildProgram();
    return T.state;
  }
  /* Values created inside the vm have that realm's prototypes, which makes
     assert.deepStrictEqual fail on otherwise-equal objects. Round-trip to plain. */
  const plain = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  return { ctx, T, get, reset, plain, errors, files, localStorage: ls };
}

module.exports = { loadApp, scriptList, makeEl, ROOT };
