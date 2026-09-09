/* ============================================================
   Session lifecycle.

   The v1 bug chain, for the record:
     toggleDone() auto-filled reps but never kg
     -> startSession() only pre-filled kg when history existed
     -> finishSession() dropped every set failing parseFloat(kg) > 0
     -> an exercise with no history that you only TICKED lost all its
        sets, so it never gained history, so it broke forever.
        (That is why Seated Cable Row never saved.)

   Rules now:
     - every set starts with a real prescribed kg AND reps, always
     - a ticked set is logged even if you never touched it
     - 0 kg is legal (bodyweight)
     - nothing is written to history without being counted first
   ============================================================ */

import { state, save, todayISO, uid, latestW } from "./state.js";
import { findEx } from "./data/exercises.js";
import { prescribe, prescribeSets, tonnage } from "./coach.js";
import { rangeFor } from "./data/program.js";
import * as timer from "./timer.js";

export function activeDay() {
  if (!state.active) return null;
  return (state.program.days || []).find(d => d.id === state.active.dayId) || null;
}

export function isActive() { return !!state.active; }

/* ---------- start ---------- */

export function startSession(dayId) {
  const day = (state.program.days || []).find(d => d.id === dayId);
  if (!day) return false;

  const ex = {};
  for (const slot of day.ex || []) {
    ex[slot.exId] = prescribeSets(slot.exId, slot.sets);
  }

  state.active = {
    dayId: day.id,
    dayISO: todayISO(),
    startedAtMs: Date.now(),
    touchedAtMs: Date.now(),
    ex,
    notes: {},
    feel: []
  };
  state.program.lastDayId = day.id;
  save();
  timer.keepAwake(true);
  return true;
}

function touch() {
  if (state.active) state.active.touchedAtMs = Date.now();
}

/* ---------- editing sets ---------- */

export function setVal(exId, i, field, raw) {
  if (!state.active) return;
  const arr = state.active.ex[exId];
  if (!arr || !arr[i]) return;
  const s = arr[i];
  const str = String(raw).trim();

  if (str === "") {
    s[field] = null;
  } else {
    const n = parseFloat(str.replace(",", "."));
    s[field] = isFinite(n) ? n : null;
  }
  // Typing promotes the set from "as prescribed" to "this is what I did".
  s.prescribed = false;
  touch();
  save();
}

export function setRpe(exId, i, rpe) {
  if (!state.active) return;
  const s = (state.active.ex[exId] || [])[i];
  if (!s) return;
  s.rpe = s.rpe === rpe ? null : rpe;
  touch();
  save();
}

export function toggleDone(exId, i) {
  if (!state.active) return null;
  const arr = state.active.ex[exId];
  const s = arr && arr[i];
  if (!s) return null;

  s.done = !s.done;

  if (s.done) {
    // Fill anything still blank from the prescription, so a tick alone is
    // always a complete, saveable set. This is the core of the v1 fix.
    const ex = findEx(state, exId);
    const p = prescribe(exId, arr.length);
    if (s.kg === null || s.kg === undefined) s.kg = p ? p.kg : 0;
    if (s.reps === null || s.reps === undefined || s.reps === 0) {
      s.reps = p ? p.reps : (ex ? rangeFor(ex, state.prefs)[0] : 8);
    }
    if (ex && state.prefs.restAutoStart !== false) {
      const slot = (activeDay()?.ex || []).find(x => x.exId === exId);
      timer.start(slot?.rest || ex.rest, ex.name.toUpperCase());
    }
  }
  touch();
  save();
  return s;
}

/** "I did this exercise exactly as prescribed" — one tap for the whole block. */
export function completeExercise(exId) {
  if (!state.active) return 0;
  const arr = state.active.ex[exId];
  if (!arr) return 0;
  const p = prescribe(exId, arr.length);
  let n = 0;
  for (const s of arr) {
    if (s.done) continue;
    if (s.kg === null || s.kg === undefined) s.kg = p ? p.kg : 0;
    if (!s.reps) s.reps = p ? p.reps : 8;
    s.done = true;
    n++;
  }
  touch();
  save();
  return n;
}

export function addSet(exId) {
  if (!state.active) return;
  const arr = state.active.ex[exId];
  if (!arr) return;
  const last = arr[arr.length - 1];
  arr.push({
    kg: last ? last.kg : null,
    reps: last ? last.reps : null,
    rpe: null, done: false, prescribed: true
  });
  touch();
  save();
}

export function removeSet(exId, i) {
  if (!state.active) return;
  const arr = state.active.ex[exId];
  if (!arr || arr.length <= 1) return;
  arr.splice(i, 1);
  touch();
  save();
}

export function setExerciseNote(exId, text) {
  if (!state.active) return;
  state.active.notes[exId] = text;
  touch();
  save();
}

export function toggleFeel(k) {
  if (!state.active) return;
  const f = state.active.feel || (state.active.feel = []);
  const i = f.indexOf(k);
  if (i >= 0) f.splice(i, 1); else f.push(k);
  touch();
  save();
}

/** Swap an exercise mid-session without losing what you already logged. */
export function swapExercise(exId, newExId) {
  if (!state.active) return false;
  const day = activeDay();
  if (!day) return false;
  const slot = (day.ex || []).find(x => x.exId === exId);
  if (!slot) return false;

  slot.exId = newExId;
  const old = state.active.ex[exId] || [];
  const logged = old.filter(s => s.done);
  delete state.active.ex[exId];
  state.active.ex[newExId] = logged.length ? logged : prescribeSets(newExId, slot.sets);
  touch();
  save();
  return true;
}

/* ---------- what would be saved ---------- */

/**
 * Turn the live session into a history record.
 * A set counts if it was ticked, or if it carries real numbers you typed.
 * Nothing that you actually did is ever thrown away.
 */
export function buildRecord(a = state.active, dateISO) {
  if (!a) return null;
  const day = (state.program.days || []).find(d => d.id === a.dayId);
  const rec = {
    id: uid("s"),
    d: dateISO || a.dayISO || todayISO(),
    startedAtMs: a.startedAtMs || null,
    endedAtMs: Date.now(),
    dayId: a.dayId,
    dayName: day ? day.name : "Workout",
    ex: [],
    note: a.note || "",
    feel: (a.feel || []).slice()
  };

  for (const slot of (day ? day.ex : []) || []) {
    const arr = a.ex[slot.exId] || [];
    const ex = findEx(state, slot.exId);
    const sets = arr
      .filter(s => s.done || (s.kg !== null && s.kg !== undefined && Number(s.reps) > 0))
      .map(s => ({
        kg: Number(s.kg) || 0,
        reps: Number(s.reps) || 0,
        rpe: s.rpe || null,
        done: !!s.done,
        prescribed: !!s.prescribed
      }))
      .filter(s => s.reps > 0);          // a set with no reps is not a set
    if (sets.length) {
      rec.ex.push({
        exId: slot.exId,
        name: ex ? ex.name : slot.exId,
        sets,
        note: (a.notes || {})[slot.exId] || ""
      });
    }
  }
  return rec;
}

export function countLogged(a = state.active) {
  const rec = buildRecord(a);
  if (!rec) return { sets: 0, exercises: 0 };
  return {
    sets: rec.ex.reduce((n, e) => n + e.sets.length, 0),
    exercises: rec.ex.length
  };
}

/* ---------- finish ---------- */

export function finishSession(dateISO) {
  if (!state.active) return null;
  const rec = buildRecord(state.active, dateISO);
  if (!rec || !rec.ex.length) return null;

  state.sessions.push(rec);
  state.sessions.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  state.active = null;
  timer.skip();
  timer.keepAwake(false);
  save();
  return rec;
}

export function cancelSession() {
  state.active = null;
  timer.skip();
  timer.keepAwake(false);
  save();
}

export function setSessionNote(text) {
  if (!state.active) return;
  state.active.note = text;
  touch();
  save();
}

/* ---------- you forgot to press finish ---------- */

/** A session left running from a previous day. */
export function staleSession() {
  const a = state.active;
  if (!a) return null;
  if ((a.dayISO || todayISO()) === todayISO()) return null;
  const { sets } = countLogged(a);
  const day = (state.program.days || []).find(d => d.id === a.dayId);
  return { date: a.dayISO, sets, dayName: day ? day.name : "Workout" };
}

/** Auto-finalise a session you walked away from. */
export function autoFinishDue() {
  const a = state.active;
  if (!a) return false;
  const mins = (Date.now() - (a.touchedAtMs || a.startedAtMs || Date.now())) / 60000;
  const limit = (state.prefs && state.prefs.autoFinishMin) || 90;
  return mins >= limit && countLogged(a).sets > 0;
}

export function sessionElapsedMs() {
  if (!state.active) return 0;
  return Date.now() - (state.active.startedAtMs || Date.now());
}

/* ---------- summary after finishing ---------- */

export function summarise(rec) {
  const bw = latestW() || 80;
  const prs = [];
  // Compare each exercise against its best BEFORE this session.
  const idx = state.sessions.findIndex(s => s.id === rec.id);
  for (const e of rec.ex) {
    let prevBest = 0;
    for (let i = 0; i < idx; i++) {
      for (const pe of state.sessions[i].ex || []) {
        if (pe.exId !== e.exId) continue;
        for (const st of pe.sets) {
          const v = (Number(st.kg) || 0) * (1 + (Number(st.reps) || 0) / 30);
          if (v > prevBest) prevBest = v;
        }
      }
    }
    let now = null;
    for (const st of e.sets) {
      const v = (Number(st.kg) || 0) * (1 + (Number(st.reps) || 0) / 30);
      if (!now || v > now.v) now = { v, kg: st.kg, reps: st.reps };
    }
    if (now && now.v > prevBest + 0.01 && prevBest > 0) {
      prs.push({ name: e.name, kg: now.kg, reps: now.reps });
    }
  }

  const next = rec.ex.map(e => {
    const p = prescribe(e.exId);
    return p && p.dir === "up" ? { name: e.name, kg: p.kg, step: p.step } : null;
  }).filter(Boolean);

  return {
    sets: rec.ex.reduce((n, e) => n + e.sets.length, 0),
    exercises: rec.ex.length,
    tonnage: tonnage(rec),
    durationMs: rec.startedAtMs ? (rec.endedAtMs - rec.startedAtMs) : null,
    prs,
    next
  };
}
