#!/usr/bin/env node
"use strict";
/* Static checks for the no-build PWA (run: npm run check)
   1. every js/*.js and sw.js parses (vm.Script compiles without running)
   2. every local file referenced by index.html <script src>/<link href> exists
   3. every file in sw.js SHELL (and importScripts) exists
   4. sw.js SHELL precaches every js/*.js and css/*.css that index.html loads,
      so a cold offline start never misses a script */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const rel = p => path.relative(ROOT, p) || ".";
const errors = [], warnings = [];
const fail = m => errors.push(m);
const isRemote = u => /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(u);
const clean = u => u.replace(/^\.\//, "").split(/[?#]/)[0];
const exists = p => fs.existsSync(path.join(ROOT, p));

/* 1) syntax */
const jsDir = path.join(ROOT, "js");
const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith(".js")).sort().map(f => path.join(jsDir, f));
[...jsFiles, path.join(ROOT, "sw.js")].forEach(f => {
  try { new vm.Script(fs.readFileSync(f, "utf8"), { filename: rel(f) }); }
  catch(e){
    const where = (e.stack || "").split("\n")[0];
    fail(`syntax error in ${rel(f)}: ${e.message}${where && !where.includes(e.message) ? ` (${where})` : ""}`);
  }
});

/* 2) index.html references */
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return m ? m[1] : null;
};
const scripts = [...html.matchAll(/<script\b[^>]*>/gi)].map(m => attr(m[0], "src")).filter(Boolean);
const links = [...html.matchAll(/<link\b[^>]*>/gi)]
  .filter(m => !/\brel\s*=\s*["'](preconnect|dns-prefetch)["']/i.test(m[0]))
  .map(m => attr(m[0], "href")).filter(Boolean);
const localRefs = [...scripts, ...links].filter(u => !isRemote(u)).map(clean).filter(Boolean);
localRefs.forEach(u => { if(!exists(u)) fail(`index.html references missing file: ${u}`); });

/* 3) sw.js SHELL */
const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
const shellSrc = (sw.match(/\bconst\s+SHELL\s*=\s*(\[[\s\S]*?\])\s*;/) || [])[1];
let shell = [];
if(!shellSrc) fail("sw.js: could not find `const SHELL = [...]`");
else {
  try { shell = vm.runInNewContext(shellSrc, {}); }
  catch(e){ fail(`sw.js: SHELL is not a plain array literal (${e.message})`); }
}
const shellSet = new Set(shell.map(clean));
shell.map(clean).filter(u => u && !isRemote(u)).forEach(u => {
  if(!exists(u)) fail(`sw.js SHELL lists missing file: ${u}`);
});
[...sw.matchAll(/importScripts\(([^)]*)\)/g)].forEach(m => {
  [...m[1].matchAll(/["']([^"']+)["']/g)].map(x => clean(x[1])).forEach(u => {
    if(!isRemote(u) && !exists(u)) fail(`sw.js importScripts missing file: ${u}`);
  });
});

/* 4) SHELL covers the app's own scripts and styles */
localRefs.filter(u => /^(js|css)\/.+\.(js|css)$/.test(u)).forEach(u => {
  if(!shellSet.has(u)) fail(`sw.js SHELL does not precache ${u} (loaded by index.html) — add "./${u}"`);
});
if(shell.length && !shellSet.has("index.html") && !shellSet.has("")) fail(`sw.js SHELL does not precache the page itself ("./" or "./index.html")`);

/* informational: a js/ file nobody loads is probably a forgotten <script> tag */
const loaded = new Set(localRefs);
jsFiles.map(rel).forEach(f => { if(!loaded.has(f)) warnings.push(`${f} exists but index.html does not load it`); });

warnings.forEach(w => console.warn("warning: " + w));
if(errors.length){
  errors.forEach(e => console.error("✗ " + e));
  console.error(`\ncheck failed: ${errors.length} problem(s)`);
  process.exit(1);
}
console.log(`✓ ${jsFiles.length + 1} scripts parse · ${localRefs.length} index.html refs exist · SHELL (${shell.length}) covers every js/css`);
