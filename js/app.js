/* ============================================================
   The controller: boot, routing, and every action the views emit.

   The views are pure functions that return HTML strings and mark
   their interactive bits with data-action / data-input. Nothing in
   a view touches state directly, so all the wiring lives here and
   there is exactly one place to look when a button does nothing.

   Two delegated listeners cover the whole app, which means a
   re-render never has to re-bind anything.
   ============================================================ */

import {
  state, status, loadState, save, installFlushHooks,
  downloadBackup, importJSON, unfreeze, dismissNotice,
  todayISO, fmtD, uid
} from "./state.js";

import {
  $, esc, toast, openSheet, closeSheet, isSheetOpen,
  installSheetControls, confirmSheet
} from "./ui.js";

import { gymOf, snapLoad, fmtKg } from "./units.js";
import { findEx } from "./data/exercises.js";
import { syncFromWallClock, clearSync, gymClockStr } from "./clock.js";
import * as timer from "./timer.js";
import * as session from "./session.js";
import { prescribe } from "./coach.js";

import * as today from "./views/today.js";
import * as train from "./views/train.js";
import * as library from "./views/library.js";
import * as progress from "./views/progress.js";
import { settingsHTML } from "./views/settings.js";

/* ---------- routing ---------- */

const VIEWS = {
  today: { render: today.render, title: "Today" },
  train: { render: train.render, title: "Train" },
  library: { render: library.render, title: "Library" },
  progress: { render: progress.render, title: "Progress" }
};

let tab = "today";

/** Re-render the current tab. Cheap enough at this size to just redo it all. */
export function render() {
  const view = VIEWS[tab] || VIEWS.today;
  const root = $("#view");
  if (!root) return;

  // Keep the scroll position across a re-render triggered by a tap.
  const y = window.scrollY;
  root.innerHTML = view.render();
  root.dataset.tab = tab;
  window.scrollTo(0, y);

  for (const b of document.querySelectorAll(".tabbtn")) {
    const on = b.dataset.tab === tab;
    b.classList.toggle("on", on);
    b.setAttribute("aria-current", on ? "page" : "false");
  }
  const clock = $("#headclock");
  if (clock) clock.textContent = gymClockStr();
}

function go(next) {
  if (!VIEWS[next]) return;
  tab = next;
  if (isSheetOpen()) closeSheet();
  render();
  window.scrollTo(0, 0);
}

/* ---------- small helpers ---------- */

function numFrom(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  const raw = String(el.value).trim().replace(",", ".");
  if (raw === "") return null;
  const n = parseFloat(raw);
  return isFinite(n) ? n : null;
}

function logBodyweight(inputId) {
  const kg = numFrom(inputId);
  if (kg === null || kg <= 0) { toast("Enter a weight first."); return; }
  const d = todayISO();
  const existing = state.weights.find(x => x.d === d);
  if (existing) existing.kg = kg; else state.weights.push({ d, kg });
  state.weights.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  save();
  const el = document.getElementById(inputId);
  if (el) el.value = "";
  toast(`Logged ${fmtKg(kg)} kg.`);
  render();
}

/* ---------- the finish summary ---------- */

function showSummary(rec) {
  const s = session.summarise(rec);
  const mins = s.durationMs ? Math.round(s.durationMs / 60000) : null;
  openSheet("Session saved", `
    <div class="sumgrid">
      <div class="sumstat"><b class="num">${s.sets}</b><span>sets</span></div>
      <div class="sumstat"><b class="num">${s.exercises}</b><span>exercises</span></div>
      <div class="sumstat"><b class="num">${s.tonnage.toLocaleString()}</b><span>kg moved</span></div>
      ${mins !== null ? `<div class="sumstat"><b class="num">${mins}</b><span>minutes</span></div>` : ""}
    </div>

    ${s.prs.length ? `<div class="sheet-sec"><h4>Personal records</h4>
      ${s.prs.map(p => `<div class="prrow"><span class="pr-n">${esc(p.name)}</span>
        <span class="pr-v num">${fmtKg(p.kg)} × ${p.reps}</span></div>`).join("")}
    </div>` : ""}

    ${s.next.length ? `<div class="sheet-sec"><h4>Next time</h4>
      ${s.next.map(n => `<div class="prrow"><span class="pr-n">${esc(n.name)}</span>
        <span class="pr-v num up">→ ${fmtKg(n.kg)} kg</span></div>`).join("")}
      <p class="small" style="margin-top:8px">Earned by hitting the top of the range on every set.</p>
    </div>` : `<p class="small" style="margin-top:14px">Nothing earned a jump this time — keep the
      weight and chase one more rep on each set.</p>`}

    <button class="btn block" style="margin-top:16px" data-action="closeSheet">Done</button>`,
    { sub: fmtD(rec.d) + " · " + rec.dayName });
}

/* ---------- actions ---------- */

const ACTIONS = {
  /* --- navigation & chrome --- */
  closeSheet: () => closeSheet(),
  goTrain: () => go("train"),
  dismissNotice: () => { dismissNotice(); render(); },

  openSettings: () => openSheet("Settings", settingsHTML(), { sub: "Gym, ranges and your data" }),

  /* --- profile setup --- */
  saveSetup: () => {
    const g = id => (document.getElementById(id) || {}).value;
    const name = String(g("su-name") || "").trim();
    if (!name) { toast("Your name, first."); return; }
    state.profile.name = name;
    state.profile.age = g("su-age") || "";
    state.profile.h = g("su-h") || "";
    state.profile.w = g("su-w") || "";
    state.profile.act = parseFloat(g("su-act")) || 1.375;

    const w = parseFloat(state.profile.w);
    if (isFinite(w) && w > 0 && !state.weights.some(x => x.d === todayISO())) {
      state.weights.push({ d: todayISO(), kg: w });
    }
    save();
    toast(`Set up. Let's go, ${name}.`);
    render();
  },

  /* --- bodyweight --- */
  logWeight: a1 => logBodyweight(a1 || "qw"),
  delWeight: a1 => {
    const i = Number(a1);
    if (!isFinite(i) || !state.weights[i]) return;
    state.weights.splice(i, 1);
    save();
    render();
  },

  /* --- starting and running a session --- */
  selDay: a1 => { train.setViewDay(a1); go("train"); },

  startDay: a1 => {
    if (session.isActive() && state.active.dayId !== a1) {
      toast("Finish or discard the running session first.");
      go("train");
      return;
    }
    if (session.isActive()) { go("train"); return; }
    if (!session.startSession(a1)) { toast("That day no longer exists."); render(); return; }
    timer.primeAudio();
    train.setViewDay(a1);
    go("train");
    toast("Session started. Warm up first.");
  },

  toggleDone: (a1, a2) => {
    const s = session.toggleDone(a1, Number(a2));
    if (!s) return;
    render();
    if (s.done) {
      const el = document.getElementById(`row-${a1}-${Number(a2) + 1}`);
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  },

  setRpe: (a1, a2, a3) => { session.setRpe(a1, Number(a2), Number(a3)); render(); },
  addSet: a1 => { session.addSet(a1); render(); },

  completeEx: a1 => {
    const n = session.completeExercise(a1);
    render();
    toast(n ? `${n} set${n === 1 ? "" : "s"} logged as prescribed.` : "Already done.");
  },

  noteEx: a1 => {
    const ex = findEx(state, a1);
    const cur = (state.active && state.active.notes[a1]) || "";
    openSheet(ex ? ex.name : "Note", `
      <div class="field">
        <label for="exnote">Note for this exercise</label>
        <textarea id="exnote" rows="3"
          placeholder="e.g. left shoulder tight, dropped to 12 kg">${esc(cur)}</textarea>
      </div>
      <button class="btn block" data-action="saveExNote" data-a1="${esc(a1)}">Save note</button>`,
      { sub: "Saved with this session" });
  },

  saveExNote: a1 => {
    const el = document.getElementById("exnote");
    session.setExerciseNote(a1, el ? el.value.trim() : "");
    closeSheet();
    render();
  },

  toggleFeel: a1 => { session.toggleFeel(a1); render(); },

  openForm: a1 => {
    const ex = findEx(state, a1);
    if (!ex) return;
    openSheet(ex.name, train.formSheetHTML(a1),
      { sub: train.muscleNames(ex.m.p) });
  },

  openSwap: a1 => {
    const ex = findEx(state, a1);
    if (!ex) return;
    openSheet("Swap " + ex.name, train.swapSheetHTML(a1), { sub: "Same job, different movement" });
  },

  doSwap: (a1, a2) => {
    if (session.isActive()) {
      if (!session.swapExercise(a1, a2)) { toast("Could not swap that one."); return; }
    } else {
      // Not training yet: swap it in the day itself.
      const day = (state.program.days || []).find(d => (d.ex || []).some(x => x.exId === a1));
      const slot = day && day.ex.find(x => x.exId === a1);
      if (!slot) { toast("Could not swap that one."); return; }
      const nx = findEx(state, a2);
      slot.exId = a2;
      if (nx) { slot.sets = nx.sets; slot.rest = nx.rest; }
      save();
    }
    closeSheet();
    render();
    const nx = findEx(state, a2);
    toast(`Swapped to ${nx ? nx.name : "the alternative"}.`);
  },

  /* --- finishing --- */
  finishSession: () => {
    const { sets } = session.countLogged();
    if (!sets) {
      toast("Nothing is ticked yet — nothing to save.");
      return;
    }
    const rec = session.finishSession();
    if (!rec) { toast("Nothing to save."); return; }
    go("today");
    showSummary(rec);
  },

  askDiscard: () => {
    const { sets } = session.countLogged();
    confirmSheet(
      "Discard this session?",
      sets ? `${sets} logged set${sets === 1 ? "" : "s"} will be thrown away. This cannot be undone.`
           : "Nothing has been logged yet, so nothing will be lost.",
      "Discard it", "doDiscard", { danger: true }
    );
  },

  doDiscard: () => {
    session.cancelSession();
    closeSheet();
    go("today");
    toast("Session discarded.");
  },

  keepStale: () => {
    // Save yesterday's forgotten session under the date it was started.
    const a = state.active;
    const rec = a ? session.finishSession(a.dayISO) : null;
    closeSheet();
    render();
    if (rec) showSummary(rec); else toast("Nothing in it to save.");
  },

  delSession: a1 => {
    const i = Number(a1);
    const s = state.sessions[i];
    if (!s) return;
    confirmSheet("Delete this session?",
      `${s.dayName} on ${fmtD(s.d)} will be removed permanently.`,
      "Delete it", `doDelSession:${i}`, { danger: true });
  },

  /* --- library: days --- */
  libTab: a1 => { library.ui.tab = a1; library.ui.editing = null; render(); },
  newDay: () => { library.ui.editing = library.newDay(); render(); },
  editDay: a1 => { library.ui.editing = a1; render(); },
  doneEditing: () => { library.ui.editing = null; render(); window.scrollTo(0, 0); },
  dupDay: a1 => { const id = library.duplicateDay(a1); if (id) toast("Day duplicated."); render(); },

  askDelDay: a1 => {
    const day = (state.program.days || []).find(d => d.id === a1);
    if (!day) return;
    confirmSheet("Delete this day?",
      `"${day.name}" and its exercise list will be removed. Sessions you already logged are kept.`,
      "Delete it", `doDelDay:${a1}`, { danger: true });
  },

  dayColor: (a1, a2) => {
    const day = (state.program.days || []).find(d => d.id === a1);
    if (!day) return;
    day.color = a2;
    save();
    render();
  },

  moveSlot: (a1, a2, a3) => { library.moveSlot(a1, Number(a2), Number(a3)); render(); },
  delSlot: (a1, a2) => { library.removeSlot(a1, Number(a2)); render(); },

  addToDay: a1 => openSheet("Add an exercise", library.pickerHTML(a1, null), { sub: "Tap to add" }),
  replaceSlot: (a1, a2) =>
    openSheet("Replace exercise", library.pickerHTML(a1, Number(a2)), { sub: "Tap the replacement" }),

  pickAdd: (a1, a2) => {
    library.addExercise(a1, a2);
    closeSheet();
    render();
    const ex = findEx(state, a2);
    toast(`Added ${ex ? ex.name : "exercise"}.`);
  },

  pickReplace: (a1, a2, a3) => {
    library.replaceExercise(a1, Number(a3), a2);
    closeSheet();
    render();
    toast("Replaced.");
  },

  /* --- settings --- */
  togglePlate: a1 => {
    const v = Number(a1);
    const g = state.gym;
    g.plates = Array.isArray(g.plates) ? g.plates : [...gymOf(state).plates];
    const i = g.plates.indexOf(v);
    if (i >= 0) {
      if (g.plates.length <= 1) { toast("Keep at least one plate pair."); return; }
      g.plates.splice(i, 1);
    } else {
      g.plates.push(v);
    }
    g.plates.sort((a, b) => b - a);
    save();
    openSheet("Settings", settingsHTML(), { sub: "Gym, ranges and your data" });
    render();
  },

  syncClock: () => {
    const el = document.getElementById("clocksync");
    try {
      const diff = syncFromWallClock(el ? el.value : "");
      toast(diff ? `Gym clock set, ${Math.abs(diff)} min ${diff > 0 ? "ahead" : "behind"}.` : "Already in sync.");
    } catch (e) {
      toast(e.message);
      return;
    }
    openSheet("Settings", settingsHTML(), { sub: "Gym, ranges and your data" });
    render();
  },

  clearClock: () => {
    clearSync();
    openSheet("Settings", settingsHTML(), { sub: "Gym, ranges and your data" });
    render();
    toast("Gym clock reset to phone time.");
  },

  /* --- data --- */
  downloadBackup: () => { downloadBackup(); toast("Backup downloaded."); },
  triggerImport: () => { const f = document.getElementById("importfile"); if (f) f.click(); },
  unfreeze: () => {
    confirmSheet("Start fresh?",
      "Your unreadable data stays in the browser but the app will start from empty and " +
      "overwrite it on the next save. Download it first if you have not already.",
      "Start fresh", "doUnfreeze", { danger: true });
  },
  doUnfreeze: () => { unfreeze(); closeSheet(); render(); },

  /* --- rest timer --- */
  timerAdd: a1 => { timer.add(Number(a1) || 30); },
  timerSkip: () => { timer.skip(); }
};

/* Actions carrying an argument in the name, e.g. "doDelDay:day-a", so that
   confirmSheet() can stay a dumb string-in/string-out helper. */
const PARAMETERISED = {
  doDelDay: id => {
    if (library.ui.editing === id) library.ui.editing = null;
    library.deleteDay(id);
    closeSheet();
    render();
    toast("Day deleted.");
  },
  doDelSession: i => {
    state.sessions.splice(Number(i), 1);
    save();
    closeSheet();
    render();
    toast("Session deleted.");
  }
};

function runAction(name, a1, a2, a3) {
  if (name.includes(":")) {
    const [key, arg] = name.split(":");
    if (PARAMETERISED[key]) { PARAMETERISED[key](arg); return; }
  }
  const fn = ACTIONS[name];
  if (!fn) { console.warn("Unhandled action:", name); return; }
  fn(a1, a2, a3);
}

/* ---------- inputs ---------- */

const INPUTS = {
  setVal: el => session.setVal(el.dataset.ex, Number(el.dataset.i), el.dataset.f, el.value),
  sessionNote: el => session.setSessionNote(el.value),

  dayName: el => {
    const day = (state.program.days || []).find(d => d.id === el.dataset.a1);
    if (!day) return;
    day.name = el.value;
    save();
  },
  slotSets: el => {
    const day = (state.program.days || []).find(d => d.id === el.dataset.a1);
    const slot = day && day.ex[Number(el.dataset.i)];
    if (!slot) return;
    slot.sets = Math.max(1, Math.min(10, Number(el.value) || 1));
    save();
  },
  slotRest: el => {
    const day = (state.program.days || []).find(d => d.id === el.dataset.a1);
    const slot = day && day.ex[Number(el.dataset.i)];
    if (!slot) return;
    slot.rest = Math.max(20, Math.min(400, Number(el.value) || 60));
    save();
  },

  libSearch: (el, live) => { library.ui.q = el.value; if (live) refreshList(el); },
  libMuscle: (el, live) => { library.ui.muscle = el.value; refreshList(el); },
  libEquip: (el, live) => { library.ui.equip = el.value; refreshList(el); },

  gym: el => {
    const k = el.dataset.k;
    const n = parseFloat(el.value);
    if (!isFinite(n)) return;
    state.gym[k] = n;
    save();
    render();
  },
  range: el => {
    const key = el.dataset.k === "heavy" ? "heavyRange" : "pumpRange";
    const i = Number(el.dataset.i);
    const n = Math.max(1, Math.min(30, Number(el.value) || 1));
    const arr = state.prefs[key].slice();
    arr[i] = n;
    if (arr[0] > arr[1]) arr[i === 0 ? 1 : 0] = n;
    state.prefs[key] = arr;
    save();
    render();
  },
  pref: el => {
    const k = el.dataset.k;
    state.prefs[k] = el.type === "checkbox" ? el.checked : (Number(el.value) || state.prefs[k]);
    save();
    render();
  },
  profile: el => {
    const k = el.dataset.k;
    state.profile[k] = el.type === "number" || k === "act" ? (parseFloat(el.value) || "") : el.value;
    save();
    render();
  },

  importFile: el => {
    const file = el.files && el.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        importJSON(String(r.result));
        closeSheet();
        go("today");
        toast("Backup restored.");
      } catch (e) {
        toast(e.message || "That file could not be read.");
      }
    };
    r.readAsText(file);
  }
};

/**
 * Re-render just the results inside the library picker / browse list, so
 * typing in the search box never rebuilds (and blurs) the input itself.
 */
function refreshList(sourceEl) {
  const inSheet = !!sourceEl.closest("#sheet");
  if (!inSheet) { render(); focusSearch("#view .search"); return; }

  const body = document.querySelector("#sheet .sheet-body");
  if (!body) return;
  const dayId = body.querySelector("[data-a1]")?.dataset.a1;
  const first = body.querySelector('[data-action="pickReplace"]');
  const replaceIdx = first ? Number(first.dataset.a3) : null;
  body.innerHTML = library.pickerHTML(dayId, replaceIdx);
  focusSearch("#sheet .search");
}

function focusSearch(sel) {
  const el = document.querySelector(sel);
  if (!el) return;
  el.focus({ preventScroll: true });
  const n = el.value.length;
  try { el.setSelectionRange(n, n); } catch (e) { /* search inputs refuse this in Safari */ }
}

/* ---------- delegated listeners ---------- */

function installDelegates() {
  document.addEventListener("click", e => {
    const overlay = e.target.closest("#overlay");
    if (overlay) { closeSheet(); return; }

    const tabBtn = e.target.closest(".tabbtn");
    if (tabBtn) { timer.primeAudio(); go(tabBtn.dataset.tab); return; }

    const el = e.target.closest("[data-action]");
    if (!el || el.disabled) return;
    e.preventDefault();
    timer.primeAudio();
    runAction(el.dataset.action, el.dataset.a1, el.dataset.a2, el.dataset.a3);
  });

  // `input` for anything that should react as you type, `change` for the rest.
  document.addEventListener("input", e => {
    const el = e.target.closest("[data-input]");
    if (!el) return;
    const fn = INPUTS[el.dataset.input];
    if (!fn) return;
    if (el.dataset.input === "libSearch") { debounceSearch(el); return; }
    if (el.type === "checkbox" || el.tagName === "SELECT") return;   // handled on change
    fn(el, true);
  });

  document.addEventListener("change", e => {
    const el = e.target.closest("[data-input]");
    if (!el) return;
    const fn = INPUTS[el.dataset.input];
    if (fn) fn(el, false);
  });

  // Enter in a single-line field should commit, not submit anything.
  document.addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    const el = e.target;
    if (el.tagName !== "INPUT" || el.type === "checkbox") return;
    if (el.id === "clocksync") { e.preventDefault(); runAction("syncClock"); return; }
    if (el.id === "qw" || el.id === "pw") { e.preventDefault(); logBodyweight(el.id); return; }
    el.blur();
  });
}

let searchT = null;
function debounceSearch(el) {
  library.ui.q = el.value;
  clearTimeout(searchT);
  searchT = setTimeout(() => refreshList(el), 180);
}

/* ---------- the rest timer bar ---------- */

function installTimer() {
  timer.restore();
  timer.onTick(left => {
    const bar = $("#timerFill");
    if (bar) bar.style.width = left > 0 ? "" : "0%";
  });
}

/* ---------- a session you walked away from ---------- */

function handleUnfinished() {
  if (!session.isActive()) return;

  const stale = session.staleSession();
  if (stale) {
    openSheet("You left a session running", `
      <p class="sheet-msg">A <b>${esc(stale.dayName)}</b> session from
        <b>${esc(fmtD(stale.date))}</b> is still open with
        ${stale.sets} logged set${stale.sets === 1 ? "" : "s"}.</p>
      <div class="sheet-actions">
        <button class="btn block" data-action="keepStale">Save it under ${esc(fmtD(stale.date))}</button>
        <button class="btn ghost block" data-action="askDiscard">Discard it</button>
      </div>`, { sub: "Nothing has been lost" });
    return;
  }

  if (session.autoFinishDue()) {
    const rec = session.finishSession();
    if (rec) {
      toast("Saved the session you left running.", { ms: 4000 });
      showSummary(rec);
    }
  } else {
    timer.keepAwake(true);
  }
}

/* ---------- boot ---------- */

function boot() {
  loadState();
  installFlushHooks();
  installSheetControls();
  installDelegates();
  installTimer();

  // The live session header ticks, and so does the gym clock.
  setInterval(() => {
    if (tab === "today" || (tab === "train" && session.isActive())) render();
    const clock = $("#headclock");
    if (clock) clock.textContent = gymClockStr();
  }, 30000);

  render();
  handleUnfinished();

  if (status.message && !status.frozen) toast(status.message, { ms: 5000 });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

// Handy in the console, and how the smoke test drives the app.
window.FORGE = { state, render, go, runAction, session, timer, ACTIONS };
