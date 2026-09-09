/* ============================================================
   Prescription engine.

   Replaces hintFor() from v1, which only looked at the single most
   recent session and suggested a flat `inc` the gym often could not
   make. This one reads history + your RPE taps + your notes, and
   only ever proposes a weight your plates can actually build.

   Everything it returns carries a `why` string, because "add 2.5 kg"
   with no reason is not coaching.
   ============================================================ */

import { state, e1rm, fmtD, daysBetween, todayISO, latestW } from "./state.js";
import { findEx } from "./data/exercises.js";
import { rangeFor } from "./data/program.js";
import { MUSCLES, WEEKLY_SETS } from "./data/muscles.js";
import { nextLoad, prevLoad, gymOf, effectiveKg, fmtKg, stepSize } from "./units.js";

export const RPE = {
  1: { key: 1, label: "Easy",   short: "easy",  hint: "3+ reps left" },
  2: { key: 2, label: "Right",  short: "right", hint: "1-2 reps left" },
  3: { key: 3, label: "Hard",   short: "hard",  hint: "0-1 reps left" },
  4: { key: 4, label: "Failed", short: "fail",  hint: "form broke or missed reps" }
};

export const FEEL_CHIPS = [
  { k: "strong",  label: "Felt strong" },
  { k: "flat",    label: "No energy" },
  { k: "form",    label: "Form broke" },
  { k: "pain",    label: "Something hurt" },
  { k: "rushed",  label: "Short on time" },
  { k: "sleep",   label: "Slept badly" }
];

/* ---------- history ---------- */

/** Most recent performances of one exercise, newest first. */
export function historyFor(exId, limit = 5) {
  const out = [];
  for (let i = state.sessions.length - 1; i >= 0 && out.length < limit; i--) {
    const s = state.sessions[i];
    const f = (s.ex || []).find(e => e.exId === exId);
    if (f && f.sets && f.sets.length) {
      out.push({ d: s.d, sets: f.sets, note: f.note || "", feel: s.feel || [], sessionNote: s.note || "" });
    }
  }
  return out;
}

export function lastPerf(exId) {
  return historyFor(exId, 1)[0] || null;
}

export function bestSet(exId) {
  let best = null;
  for (const s of state.sessions) {
    const f = (s.ex || []).find(e => e.exId === exId);
    if (!f) continue;
    for (const st of f.sets) {
      const v = e1rm(st.kg, st.reps);
      if (!best || v > best.v) best = { v, kg: st.kg, reps: st.reps, d: s.d };
    }
  }
  return best;
}

export function perfStr(sets) {
  return sets.map(s => `${fmtKg(s.kg)}×${s.reps}`).join(", ");
}

/* ---------- starting load for a brand new exercise ---------- */

/** Rough opening weight so the very first session is never blank. */
function firstGuess(ex, gym) {
  const bw = latestW() || 75;
  const factor = {
    sq: 0.5, dl: 0.6, bp: 0.4, incbp: 0.32, ohp: 0.25, cgbp: 0.32, front_sq: 0.35,
    rdl: 0.45, hip_thrust: 0.5, bor: 0.35
  }[ex.id];
  if (factor) return snapDown(bw * factor, ex, gym);

  switch (ex.load) {
    case "dumbbell_pair":
    case "dumbbell_one": return snapDown(bw * (ex.range === "heavy" ? 0.14 : 0.06), ex, gym);
    case "cable":
    case "machine_stack": return snapDown(bw * (ex.range === "heavy" ? 0.45 : 0.2), ex, gym);
    case "plate_machine": return snapDown(bw * 0.4, ex, gym);
    case "bodyweight": return 0;
    case "assisted": return snapDown(bw * 0.4, ex, gym);
    case "banded": return 2;
    default: return snapDown(bw * 0.3, ex, gym);
  }
}

function snapDown(target, ex, gym) {
  let w = 0, guard = 0;
  while (guard++ < 400) {
    const n = nextLoad(w, ex.load, gym);
    if (n > target || n === w) break;
    w = n;
  }
  return w;
}

/* ---------- the decision ---------- */

/**
 * What to do with this exercise today.
 * Returns { kg, reps, sets, dir:'up'|'hold'|'down'|'new', why, step }
 */
export function prescribe(exId, plannedSets) {
  const ex = findEx(state, exId);
  if (!ex) return null;
  const gym = gymOf(state);
  const [lo, hi] = rangeFor(ex, state.prefs);
  const nSets = plannedSets || ex.sets || 3;
  const hist = historyFor(exId, 3);

  if (!hist.length) {
    const kg = firstGuess(ex, gym);
    return {
      kg, reps: lo, sets: nSets, dir: "new", step: 0,
      why: `First time. Start at ${fmtKg(kg)} kg — it should feel like you could do about 2 more than ${lo}. The app takes over from here.`
    };
  }

  const last = hist[0];
  const done = last.sets.filter(s => Number(s.reps) > 0);
  if (!done.length) {
    const kg = firstGuess(ex, gym);
    return { kg, reps: lo, sets: nSets, dir: "new", step: 0, why: "No usable sets logged last time — start fresh." };
  }

  const topKg = Math.max(...done.map(s => Number(s.kg) || 0));
  const working = done.filter(s => (Number(s.kg) || 0) >= topKg - 1e-9);
  const minReps = Math.min(...working.map(s => Number(s.reps)));
  const worstRpe = Math.max(...working.map(s => Number(s.rpe) || 0));
  const feel = last.feel || [];
  const brokeForm = feel.includes("form") || worstRpe >= 4;
  const hurt = feel.includes("pain");
  const when = fmtD(last.d);

  // Something hurt: hold and offer a swap rather than pushing load.
  if (hurt) {
    return {
      kg: topKg, reps: Math.max(lo, minReps), sets: nSets, dir: "hold", step: 0, swap: true,
      why: `You flagged pain here on ${when}. Same weight, stay well inside the range — or swap it for an alternative below.`
    };
  }

  // Earned the jump: top of range on every working set, and it wasn't a grind.
  if (minReps >= hi && !brokeForm && worstRpe <= 3) {
    const up = nextLoad(topKg, ex.load, gym);
    const step = Math.abs(up - topKg);
    return {
      kg: up, reps: lo, sets: nSets, dir: "up", step,
      why: `You hit ${done.map(s => s.reps).join(", ")} at ${fmtKg(topKg)} kg on ${when}. Earned: +${fmtKg(step)} kg, back down to ${lo} reps.`
    };
  }

  // Hit the top but it was a grind — bank the reps, keep the weight.
  if (minReps >= hi && brokeForm) {
    return {
      kg: topKg, reps: hi, sets: nSets, dir: "hold", step: 0,
      why: `You reached ${hi} on ${when} but form went. Repeat ${fmtKg(topKg)} kg and own it cleanly first.`
    };
  }

  // Three sessions stuck under the bottom of the range: back off one step.
  const stuck = hist.length >= 3 && hist.every(h => {
    const w = h.sets.filter(s => Number(s.reps) > 0);
    if (!w.length) return false;
    const tk = Math.max(...w.map(s => Number(s.kg) || 0));
    return Math.abs(tk - topKg) < 1e-9 && Math.min(...w.filter(s => (Number(s.kg) || 0) >= tk - 1e-9).map(s => Number(s.reps))) < lo;
  });
  if (stuck) {
    const down = prevLoad(topKg, ex.load, gym);
    return {
      kg: down, reps: lo + 1, sets: nSets, dir: "down", step: Math.abs(topKg - down),
      why: `Three sessions stuck below ${lo} reps at ${fmtKg(topKg)} kg. Drop to ${fmtKg(down)} and build back up — this is how you break a plateau.`
    };
  }

  // Normal case: same weight, chase one more rep.
  const target = Math.min(hi, minReps + 1);
  return {
    kg: topKg, reps: target, sets: nSets, dir: "hold", step: 0,
    why: `Last time ${perfStr(done)} on ${when}. Keep ${fmtKg(topKg)} kg and get ${target} on every set — then the weight goes up.`
  };
}

/** Prescription applied across every set of an exercise. */
export function prescribeSets(exId, plannedSets) {
  const p = prescribe(exId, plannedSets);
  if (!p) return [];
  return Array.from({ length: p.sets }, () => ({
    kg: p.kg, reps: p.reps, rpe: null, done: false, prescribed: true
  }));
}

/* ---------- day-level brief ---------- */

export function dayById(id) {
  return (state.program.days || []).find(d => d.id === id) || state.program.days[0];
}

export function suggestedDay() {
  if (state.active) return dayById(state.active.dayId);
  const days = state.program.days || [];
  if (!days.length) return null;
  const last = state.sessions[state.sessions.length - 1];
  if (!last) return days[0];
  const i = days.findIndex(d => d.id === last.dayId);
  return days[(i + 1 + days.length) % days.length] || days[0];
}

/** The three lines that matter, for the Today brief. */
export function briefFor(day, limit = 3) {
  if (!day) return [];
  return (day.ex || []).slice(0, limit).map(slot => {
    const ex = findEx(state, slot.exId);
    if (!ex) return null;
    const p = prescribe(slot.exId, slot.sets);
    const [lo, hi] = rangeFor(ex, state.prefs);
    return { ex, p, lo, hi, sets: slot.sets || ex.sets };
  }).filter(Boolean);
}

/** One thing to pay attention to today, drawn from your own notes. */
export function watchLine() {
  for (let i = state.sessions.length - 1; i >= Math.max(0, state.sessions.length - 4); i--) {
    const s = state.sessions[i];
    const feel = s.feel || [];
    if (feel.includes("pain")) {
      return `You flagged pain on ${fmtD(s.d)}${s.note ? ` — "${s.note}"` : ""}. Warm up that area properly and back off if it repeats.`;
    }
    if (feel.includes("form")) {
      const bad = (s.ex || []).find(e => (e.sets || []).some(x => Number(x.rpe) >= 4));
      return bad
        ? `Form went on ${bad.name} last time. Stay one rep further from failure today.`
        : `Form went somewhere last session — slow the negatives down today.`;
    }
    if (s.note) return `Your note from ${fmtD(s.d)}: "${s.note}"`;
  }
  const days = state.sessions.length ? daysBetween(state.sessions[state.sessions.length - 1].d, todayISO()) : null;
  if (days !== null && days >= 7) return `${days} days since your last session. Start 10% lighter than the app suggests and rebuild.`;
  return null;
}

/* ---------- volume + verdicts ---------- */

export function setsPerMuscle(sinceISO) {
  const out = {};
  for (const s of state.sessions) {
    if (sinceISO && s.d < sinceISO) continue;
    for (const e of s.ex || []) {
      const ex = findEx(state, e.exId);
      if (!ex) continue;
      const n = (e.sets || []).filter(x => Number(x.reps) > 0).length;
      for (const m of ex.m.p) out[m] = (out[m] || 0) + n;
      for (const m of ex.m.s || []) out[m] = (out[m] || 0) + n * 0.5;
    }
  }
  for (const k of Object.keys(out)) out[k] = Math.round(out[k] * 10) / 10;
  return out;
}

export function tonnage(session) {
  const bw = latestW() || 80;
  let t = 0;
  for (const e of session.ex || []) {
    const ex = findEx(state, e.exId);
    const load = ex ? ex.load : "barbell";
    for (const s of e.sets || []) {
      if (!(Number(s.reps) > 0)) continue;
      t += effectiveKg(s.kg, load, bw) * Number(s.reps);
    }
  }
  return Math.round(t);
}

/** Sum of estimated 1RM across the compounds you actually train — one number for "am I stronger". */
export function strengthIndex(uptoIndex) {
  const best = {};
  const end = uptoIndex === undefined ? state.sessions.length : uptoIndex + 1;
  for (let i = 0; i < end; i++) {
    const s = state.sessions[i];
    for (const e of s.ex || []) {
      const ex = findEx(state, e.exId);
      if (!ex || ex.range !== "heavy") continue;
      for (const st of e.sets || []) {
        const v = e1rm(st.kg, st.reps);
        if (v > (best[e.exId] || 0)) best[e.exId] = v;
      }
    }
  }
  return Math.round(Object.values(best).reduce((a, b) => a + b, 0));
}

export function bodyweightTrend(days = 21) {
  const w = state.weights;
  if (w.length < 2) return null;
  const last = w[w.length - 1];
  const cutoff = new Date(last.d + "T00:00:00");
  cutoff.setDate(cutoff.getDate() - days);
  const cutISO = cutoff.toISOString().slice(0, 10);
  const older = w.filter(x => x.d <= cutISO);
  const base = older.length ? older[older.length - 1] : w[0];
  const span = daysBetween(base.d, last.d);
  if (span <= 0) return null;
  const perWeek = (last.kg - base.kg) / span * 7;
  return { perWeek, span, from: base, to: last };
}

/** Moving average so the daily water-weight noise stops shouting. */
export function movingAvg(points, window = 7) {
  return points.map((p, i) => {
    const from = Math.max(0, i - window + 1);
    const slice = points.slice(from, i + 1);
    return { d: p.d, y: slice.reduce((a, b) => a + b.y, 0) / slice.length };
  });
}

/** One honest sentence for the top of the Progress tab. */
export function verdict() {
  const parts = [];
  const sessions = state.sessions.length;
  if (!sessions) return { text: "Nothing logged yet. Train once and this page starts answering questions.", tone: "flat" };

  const idxNow = strengthIndex();
  const idxThen = sessions > 4 ? strengthIndex(sessions - 5) : null;
  let tone = "good";
  if (idxThen && idxNow > idxThen * 1.02) parts.push("You're getting stronger");
  else if (idxThen && idxNow < idxThen * 0.98) { parts.push("Your strength has slipped"); tone = "bad"; }
  else if (idxThen) { parts.push("Strength has been flat"); tone = "warn"; }
  else parts.push("Still building a baseline");

  const bt = bodyweightTrend();
  if (bt) {
    const pw = bt.perWeek;
    if (pw >= 0.2 && pw <= 0.6) parts.push("and gaining at the right rate");
    else if (pw > 0.6) { parts.push(`but gaining fast (${pw.toFixed(2)} kg/wk) — pull back ~200 kcal`); tone = tone === "good" ? "warn" : tone; }
    else if (pw < 0.1) { parts.push(`but the scale is flat (${pw.toFixed(2)} kg/wk) — add ~200 kcal`); tone = tone === "good" ? "warn" : tone; }
  }

  const week = weekStartISO();
  const vol = setsPerMuscle(week);
  const weak = weakestMuscles(vol, 1)[0];
  let text = parts.join(" ") + ".";
  if (weak) text += ` Weak spot this week: ${weak.name} (${weak.sets} sets).`;
  return { text, tone };
}

export function weakestMuscles(volMap, n = 3) {
  return Object.keys(MUSCLES)
    .map(k => {
      const sets = volMap[k] || 0;
      const lo = (WEEKLY_SETS[k] || [8])[0];
      return { key: k, name: MUSCLES[k].name, sets, deficit: lo - sets };
    })
    .filter(x => x.deficit > 0)
    .sort((a, b) => b.deficit - a.deficit)
    .slice(0, n);
}

export function weekStartISO(d) {
  const x = d ? new Date(d) : new Date();
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  x.setHours(0, 0, 0, 0);
  return todayISO(x);
}

/* ---------- nutrition, reduced to two numbers ---------- */

export function fuelTargets() {
  const p = state.profile;
  const w = latestW();
  if (!(p.age && p.h && w)) return null;
  const bmr = 10 * w + 6.25 * p.h - 5 * p.age + 5;
  const tdee = bmr * (p.act || 1.375);
  let sur = p.sur || 350;
  const bt = bodyweightTrend();
  let advice = null;
  if (bt) {
    if (bt.perWeek < 0.1) { advice = `up +200 — you gained ${bt.perWeek.toFixed(2)} kg/wk over ${bt.span} days`; }
    else if (bt.perWeek > 0.6) { advice = `down 200 — you gained ${bt.perWeek.toFixed(2)} kg/wk, that's fat coming with it`; }
    else { advice = `on target at ${bt.perWeek.toFixed(2)} kg/wk`; }
  }
  return {
    kcal: Math.round((tdee + sur) / 10) * 10,
    protein: Math.round(2.0 * w),
    tdee: Math.round(tdee),
    advice
  };
}

/* ---------- PR feed ---------- */

export function prFeed(limit = 12) {
  const best = {};
  const out = [];
  for (const s of state.sessions) {
    for (const e of s.ex || []) {
      for (const st of e.sets || []) {
        const v = e1rm(st.kg, st.reps);
        if (!v) continue;
        if (!best[e.exId] || v > best[e.exId].v + 0.01) {
          const prev = best[e.exId];
          best[e.exId] = { v, kg: st.kg, reps: st.reps };
          if (prev) out.push({ d: s.d, exId: e.exId, name: e.name, kg: st.kg, reps: st.reps, gain: v - prev.v });
        }
      }
    }
  }
  return out.reverse().slice(0, limit);
}
