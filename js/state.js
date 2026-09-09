/* ============================================================
   Persistence.

   The old app lost data three ways, all fixed here:
     1. loadState() caught ANY storage error and returned empty
        DEFAULTS with storageOK still true — the next save() then
        overwrote real data with that empty state.
     2. save() was debounced 350 ms and never flushed on pagehide,
        so backgrounding the phone right after "Finish" lost the session.
     3. There were no backups and no way to get your data out.

   Rules here:
     - the primary write is SYNCHRONOUS and immediate
     - every read source is parsed in its own try/catch and the newest
       VALID one wins
     - if everything is unparseable we refuse to write and shout
     - three rolling backups + export/import
   ============================================================ */

import { DEFAULT_GYM } from "./units.js";
import { SEED_DAYS, LEGACY_IDS } from "./data/program.js";

const KEY = "forge-data";
const BAK = ["forge-bak-0", "forge-bak-1", "forge-bak-2"];
const V1_BACKUP = "forge-v1-backup";
export const SCHEMA = 2;

export const DEFAULTS = () => ({
  v: SCHEMA,
  savedAt: 0,
  profile: { name: "", age: "", h: "", w: "", act: 1.375, sur: 350 },
  gym: { ...DEFAULT_GYM, clockOffsetMin: 0 },
  prefs: {
    heavyRange: [6, 9],
    pumpRange: [10, 14],
    autoFinishMin: 90,
    restAutoStart: true,
    sound: true,
    showFuel: true
  },
  program: { days: JSON.parse(JSON.stringify(SEED_DAYS)), lastDayId: null },
  customExercises: [],
  weights: [],
  sessions: [],
  active: null
});

export let state = DEFAULTS();

/* status the UI can render honestly instead of pretending everything is fine */
export const status = {
  ok: true,
  frozen: false,      // true = refusing to write because we could not read
  message: "",
  recovered: null,
  rawSalvage: null
};

const listeners = new Set();
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }

/* ---------- low level storage ---------- */

function rawGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function rawSet(key, val) {
  try { localStorage.setItem(key, val); return true; } catch (e) { return false; }
}

function parseCandidate(str, source) {
  if (!str) return null;
  try {
    const d = JSON.parse(str);
    if (!d || typeof d !== "object") return null;
    if (!Array.isArray(d.sessions) && !Array.isArray(d.weights) && !d.profile) return null;
    return { data: d, source, savedAt: Number(d.savedAt) || 0, raw: str };
  } catch (e) {
    return null;
  }
}

/* ---------- migration ---------- */

/** v1 kept sessions as {d, day:'A'|'B'|'C', ex:[{key,name,sets:[{kg,reps}]}]}. */
export function migrate(d) {
  if (!d) return DEFAULTS();
  if (Number(d.v) >= SCHEMA) return fill(d);

  const out = DEFAULTS();
  out.profile = { ...out.profile, ...(d.profile || {}) };
  out.weights = Array.isArray(d.weights) ? d.weights.slice() : [];

  const dayIdFor = letter => ({ A: "day-a", B: "day-b", C: "day-c" }[letter] || "day-a");

  out.sessions = (Array.isArray(d.sessions) ? d.sessions : []).map((s, i) => ({
    id: `s${i}-${s.d || ""}`,
    d: s.d,
    startedAtMs: null,
    endedAtMs: null,
    dayId: dayIdFor(s.day),
    dayName: ({ A: "Push + Squat", B: "Pull + Hinge", C: "Legs + Pump" }[s.day]) || "Workout",
    ex: (s.ex || []).map(e => ({
      exId: LEGACY_IDS[e.key] || e.key,
      name: e.name,
      sets: (e.sets || []).map(x => ({
        kg: Number(x.kg), reps: Number(x.reps), rpe: null, done: true, prescribed: false
      })),
      note: ""
    })),
    note: "",
    feel: null
  })).filter(s => s.d);

  if (d.active && d.active.day && d.active.ex) {
    const ex = {};
    for (const [k, arr] of Object.entries(d.active.ex)) {
      ex[LEGACY_IDS[k] || k] = (arr || []).map(s => ({
        kg: s.kg === "" ? null : Number(s.kg),
        reps: s.reps === "" ? null : Number(s.reps),
        rpe: null, done: !!s.done, prescribed: false
      }));
    }
    out.active = {
      dayId: dayIdFor(d.active.day),
      dayISO: d.active.started || null,
      startedAtMs: Date.now(),
      touchedAtMs: Date.now(),
      ex,
      notes: {}
    };
  }
  return out;
}

function fill(d) {
  const base = DEFAULTS();
  const out = {
    ...base, ...d,
    profile: { ...base.profile, ...(d.profile || {}) },
    gym: { ...base.gym, ...(d.gym || {}) },
    prefs: { ...base.prefs, ...(d.prefs || {}) },
    program: {
      ...base.program, ...(d.program || {}),
      days: (d.program && Array.isArray(d.program.days) && d.program.days.length)
        ? d.program.days : base.program.days
    }
  };
  out.weights = Array.isArray(out.weights) ? out.weights : [];
  out.sessions = Array.isArray(out.sessions) ? out.sessions : [];
  out.customExercises = Array.isArray(out.customExercises) ? out.customExercises : [];
  out.v = SCHEMA;
  return out;
}

/* ---------- load ---------- */

export function loadState() {
  const cands = [];
  const primary = rawGet(KEY);
  const p = parseCandidate(primary, "primary");
  if (p) cands.push(p);
  BAK.forEach((k, i) => {
    const c = parseCandidate(rawGet(k), `backup ${i + 1}`);
    if (c) cands.push(c);
  });

  if (!cands.length) {
    if (primary) {
      // There IS data but none of it parsed. Do not touch it.
      status.ok = false;
      status.frozen = true;
      status.rawSalvage = primary;
      status.message = "Your saved data could not be read. Nothing has been overwritten — " +
        "download it below so it can be recovered.";
      state = DEFAULTS();
      emit();
      return state;
    }
    state = DEFAULTS();            // genuine first run
    emit();
    return state;
  }

  cands.sort((a, b) => b.savedAt - a.savedAt);
  const best = cands[0];
  const wasV1 = Number(best.data.v || 1) < SCHEMA;
  if (wasV1) rawSet(V1_BACKUP, best.raw);   // keep the pre-migration copy forever

  state = migrate(best.data);

  if (best.source !== "primary") {
    status.recovered = best.source;
    status.message = `Recovered your data from ${best.source}.`;
  }
  emit();
  return state;
}

/* ---------- save ---------- */

let mirrorT = null;

export function save({ silent = false } = {}) {
  if (status.frozen) return false;
  state.v = SCHEMA;
  state.savedAt = Date.now();

  let json;
  try {
    json = JSON.stringify(state);
  } catch (e) {
    status.ok = false;
    status.message = "Could not serialise your data.";
    if (!silent) emit();
    return false;
  }

  // Rotate the previous good value into the backup ring, once per day.
  const prev = rawGet(KEY);
  if (prev && prev !== json) {
    const stamp = rawGet("forge-bak-day");
    const today = todayISO();
    if (stamp !== today) {
      rawSet(BAK[2], rawGet(BAK[1]) || "");
      rawSet(BAK[1], rawGet(BAK[0]) || "");
      rawSet(BAK[0], prev);
      rawSet("forge-bak-day", today);
    }
  }

  const wrote = rawSet(KEY, json);
  if (!wrote) {
    status.ok = false;
    status.message = "This browser is blocking storage, so nothing can be saved. " +
      "Turn off private browsing, or export your data before closing the tab.";
    if (!silent) emit();
    return false;
  }
  if (!status.ok && !status.frozen) { status.ok = true; status.message = ""; }

  // Secondary mirror for environments that expose an async store (Claude artifact).
  clearTimeout(mirrorT);
  mirrorT = setTimeout(() => {
    try {
      if (typeof window !== "undefined" && window.storage && window.storage.set) {
        Promise.resolve(window.storage.set(KEY, json)).catch(() => {});
      }
    } catch (e) { /* mirror is best effort only */ }
  }, 400);

  if (!silent) emit();
  return true;
}

/** Belt and braces: never rely on a timer surviving a backgrounded tab. */
export function installFlushHooks() {
  const flush = () => { try { save({ silent: true }); } catch (e) {} };
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
  window.addEventListener("freeze", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

/* ---------- export / import ---------- */

export function exportJSON() {
  return JSON.stringify(state, null, 2);
}

export function downloadBackup(filename) {
  const name = filename || `forge-backup-${todayISO()}.json`;
  const body = status.frozen && status.rawSalvage ? status.rawSalvage : exportJSON();
  const blob = new Blob([body], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function importJSON(text) {
  const d = JSON.parse(text);
  if (!d || typeof d !== "object") throw new Error("Not a FORGE backup file.");
  if (!Array.isArray(d.sessions) && !Array.isArray(d.weights)) {
    throw new Error("That file has no sessions or bodyweight entries in it.");
  }
  const prev = rawGet(KEY);
  if (prev) rawSet(BAK[0], prev);
  status.frozen = false;
  status.ok = true;
  status.message = "";
  status.rawSalvage = null;
  state = migrate(d);
  save();
  return state;
}

export function unfreeze() {
  status.frozen = false;
  status.ok = true;
  status.message = "";
  status.rawSalvage = null;
  emit();
}

export function dismissNotice() {
  if (status.frozen) return;
  status.message = "";
  status.recovered = null;
  emit();
}

/* ---------- shared helpers (kept from v1) ---------- */

export function todayISO(dt) {
  const d = dt ? new Date(dt) : new Date();
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

export function fmtD(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function daysBetween(isoA, isoB) {
  const a = new Date(isoA + "T00:00:00"), b = new Date(isoB + "T00:00:00");
  return Math.round((b - a) / 86400000);
}

export function mondayOf(d) {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  x.setHours(0, 0, 0, 0);
  return x;
}

export function latestW() {
  if (state.weights.length) return state.weights[state.weights.length - 1].kg;
  return parseFloat(state.profile.w) || null;
}

export function e1rm(kg, reps) {
  const k = Number(kg) || 0, r = Number(reps) || 0;
  if (r <= 0) return 0;
  return k * (1 + r / 30);
}

export function uid(prefix = "id") {
  return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}
