/* ============================================================
   TRAIN — logging a session.

   Every kg box says what it means (total on the bar / per dumbbell /
   on the stack) and shows how to load it, which is the answer to
   "is 2.5 kg per side or total?". Prescribed numbers are real values
   that count if you just tick the box, so nothing is ever accepted
   as empty. Any day can be started at any time.
   ============================================================ */

import { state, fmtD } from "../state.js";
import { esc, restText, movementAnim } from "../ui.js";
import { fmtKg, loadingText, unitLabel, unitHint, gymOf, warmupSets, allowsZero } from "../units.js";
import { rangeFor, rangeText, WARMUP, RULES } from "../data/program.js";
import { findEx, alternativesFor } from "../data/exercises.js";
import { exerciseBody, MUSCLES } from "../data/muscles.js";
import { prescribe, historyFor, perfStr, RPE, FEEL_CHIPS, bestSet } from "../coach.js";
import { isActive, activeDay, countLogged, sessionElapsedMs } from "../session.js";
import { durationText } from "../clock.js";

export let viewDayId = null;

export function setViewDay(id) { viewDayId = id; }

export function muscleNames(keys) {
  return (keys || []).map(k => (MUSCLES[k] ? MUSCLES[k].name : k)).join(" · ");
}

export function render() {
  const days = state.program.days || [];
  if (!days.length) {
    return `<div class="card"><div class="empty">No training days yet.<br>
      Build one in the Library tab.</div></div>`;
  }

  if (isActive()) viewDayId = state.active.dayId;
  if (!viewDayId || !days.find(d => d.id === viewDayId)) {
    viewDayId = (state.program.lastDayId && days.find(d => d.id === state.program.lastDayId))
      ? state.program.lastDayId : days[0].id;
  }
  const day = days.find(d => d.id === viewDayId);
  const live = isActive() && state.active.dayId === day.id;

  return `
    ${daySelector(days, day)}
    ${rulesHTML()}
    <div class="sect">${esc(day.name)}${live ? ` · <span class="live">live · ${durationText(sessionElapsedMs())}</span>` : ""}</div>
    ${live ? liveBody(day) : previewBody(day)}`;
}

/* ---------- day selector (no rotation lock any more) ---------- */

function daySelector(days, current) {
  const plates = days.map(d => `
    <button class="plate plate-${esc(d.color)} ${d.id === current.id ? "on" : ""}"
      data-action="selDay" data-a1="${esc(d.id)}" aria-label="${esc(d.name)}">
      <span>${esc(d.short || d.name.slice(0, 1))}</span>
    </button>`).join("");
  const lbls = days.map(d => `<div>${esc(d.name)}</div>`).join("");
  return `<div class="plates">${plates}</div><div class="platelbl">${lbls}</div>
    ${isActive() && state.active.dayId !== current.id
      ? `<div class="banner">A different session is running. Finish or discard it to switch.</div>` : ""}`;
}

function rulesHTML() {
  return `<details class="rules"><summary>How this program works</summary><div class="inner">
    <div class="rule"><b>Warm-up</b><p>${esc(WARMUP)}</p></div>
    ${RULES.map(r => `<div class="rule"><b>${esc(r.t)}</b><p>${esc(r.d)}</p></div>`).join("")}
  </div></details>`;
}

/* ---------- not started yet ---------- */

function previewBody(day) {
  const cards = (day.ex || []).map((slot, i) => {
    const ex = findEx(state, slot.exId);
    if (!ex) return "";
    const p = prescribe(slot.exId, slot.sets);
    const hist = historyFor(slot.exId, 1)[0];
    const [lo, hi] = rangeFor(ex, state.prefs);
    return `<div class="card ex" style="--dc:var(--${esc(day.color)})">
      ${exHead(ex, slot, i, day, lo, hi)}
      ${hist ? `<div class="lastline">Last (${esc(fmtD(hist.d))}):
        <b class="num">${esc(perfStr(hist.sets))}</b></div>` : ""}
      ${hintHTML(p, ex)}
    </div>`;
  }).join("");

  const blocked = isActive() && state.active.dayId !== day.id;
  return `<div class="card tight"><div class="small">
      <b style="color:var(--ink)">Warm up first.</b> ${esc(WARMUP)}</div></div>
    ${cards}
    <button class="btn block" style="margin-top:6px" data-action="startDay"
      data-a1="${esc(day.id)}" ${blocked ? "disabled" : ""}>Start ${esc(day.name)}</button>`;
}

/* ---------- live session ---------- */

function liveBody(day) {
  const a = state.active;
  const cards = (day.ex || []).map((slot, i) => {
    const ex = findEx(state, slot.exId);
    if (!ex) return "";
    const sets = a.ex[slot.exId] || [];
    const p = prescribe(slot.exId, slot.sets);
    const hist = historyFor(slot.exId, 1)[0];
    const [lo, hi] = rangeFor(ex, state.prefs);
    const gym = gymOf(state);
    const allDone = sets.length && sets.every(s => s.done);

    const warm = i === 0 && ex.range === "heavy"
      ? warmupSets(p ? p.kg : 0, ex.load, gym) : [];

    return `<div class="card ex ${allDone ? "done" : ""}" style="--dc:var(--${esc(day.color)})"
        id="ex-${esc(slot.exId)}">
      ${exHead(ex, slot, i, day, lo, hi)}
      ${hist ? `<div class="lastline">Last (${esc(fmtD(hist.d))}):
        <b class="num">${esc(perfStr(hist.sets))}</b></div>` : ""}
      ${hintHTML(p, ex)}
      ${warm.length ? `<div class="warmup"><b>Warm-up ramp</b>
        ${warm.map(w => `<span class="wchip num">${fmtKg(w.kg)}×${w.reps}</span>`).join("")}</div>` : ""}

      <div class="unitbar">
        <span class="unit-l">${esc(unitLabel(ex.load))}</span>
        <span class="unit-h">${esc(unitHint(ex.load))}</span>
      </div>

      <div class="sethdr"><div>Set</div><div>${esc(unitLabel(ex.load).replace(" on the stack", ""))}</div><div>Reps</div><div>✓</div></div>
      ${sets.map((s, si) => setRow(slot.exId, s, si, ex, gym)).join("")}

      <div class="exfoot">
        <button class="mini" data-action="addSet" data-a1="${esc(slot.exId)}">+ set</button>
        <button class="mini" data-action="noteEx" data-a1="${esc(slot.exId)}">
          ${(a.notes || {})[slot.exId] ? "✎ note" : "+ note"}</button>
        ${!allDone ? `<button class="mini strong" data-action="completeEx" data-a1="${esc(slot.exId)}">
          ✓ all as prescribed</button>` : `<span class="mini ok">✓ done</span>`}
      </div>
      ${(a.notes || {})[slot.exId]
        ? `<div class="exnote">${esc((a.notes || {})[slot.exId])}</div>` : ""}
    </div>`;
  }).join("");

  const { sets, exercises } = countLogged();
  return `${cards}
    <div class="sect">Finish up</div>
    <div class="card">
      <div class="brief-label">How did it go?</div>
      <div class="chips feelchips">
        ${FEEL_CHIPS.map(c => `<button class="chip ${(a.feel || []).includes(c.k) ? "on" : ""}"
          data-action="toggleFeel" data-a1="${esc(c.k)}">${esc(c.label)}</button>`).join("")}
      </div>
      <div class="field" style="margin-top:10px">
        <label for="sessnote">Anything to remember for next time?</label>
        <textarea id="sessnote" rows="2" data-input="sessionNote"
          placeholder="e.g. bench felt easy, go up 5 next time">${esc(a.note || "")}</textarea>
      </div>
      <div class="small" style="margin:6px 0 12px">
        ${sets} set${sets === 1 ? "" : "s"} across ${exercises} exercise${exercises === 1 ? "" : "s"} will be saved.
      </div>
      <button class="btn block" data-action="finishSession">Finish &amp; save workout</button>
      <button class="btn block danger" style="margin-top:10px" data-action="askDiscard">Discard session</button>
    </div>`;
}

function setRow(exId, s, i, ex, gym) {
  const ghost = s.prescribed && !s.done;
  const load = (s.kg === null || s.kg === undefined) ? "" : s.kg;
  return `<div class="setrow ${s.done ? "done" : ""} ${ghost ? "ghost" : ""}" id="row-${esc(exId)}-${i}">
      <div class="idx num">${i + 1}</div>
      <input type="number" inputmode="decimal" step="0.5" aria-label="Set ${i + 1} weight"
        value="${esc(load)}" data-input="setVal" data-ex="${esc(exId)}" data-i="${i}" data-f="kg">
      <input type="number" inputmode="numeric" aria-label="Set ${i + 1} reps"
        value="${esc(s.reps ?? "")}" data-input="setVal" data-ex="${esc(exId)}" data-i="${i}" data-f="reps">
      <button class="check ${s.done ? "done" : ""}" data-action="toggleDone"
        data-a1="${esc(exId)}" data-a2="${i}" aria-label="Mark set ${i + 1} done"
        aria-pressed="${s.done ? "true" : "false"}">✓</button>
    </div>
    <div class="setmeta" id="meta-${esc(exId)}-${i}">
      <span class="loadhint">${esc(loadingText(s.kg ?? 0, ex.load, gym))}</span>
      <span class="rpe">
        ${[1, 2, 3, 4].map(r => `<button class="rp ${s.rpe === r ? "on" : ""} r${r}"
          data-action="setRpe" data-a1="${esc(exId)}" data-a2="${i}" data-a3="${r}"
          title="${esc(RPE[r].label)} — ${esc(RPE[r].hint)}">${esc(RPE[r].label[0])}</button>`).join("")}
      </span>
    </div>`;
}

function exHead(ex, slot, i, day, lo, hi) {
  const rangeCls = ex.range === "heavy" ? "heavy" : "pump";
  return `<div class="exhead">
    <div>
      <div class="name">${i + 1}. ${esc(ex.name)}</div>
      <div class="meta">
        <span class="tag ${rangeCls}">${slot.sets || ex.sets} × ${lo}-${hi}</span>
        <span class="tag">rest ${esc(restText(slot.rest || ex.rest))}</span>
        <span class="tag">${esc(muscleNames(ex.m.p))}</span>
      </div>
    </div>
    <div class="exbtns">
      <button class="techbtn" data-action="openForm" data-a1="${esc(ex.id)}">Form</button>
      <button class="techbtn" data-action="openSwap" data-a1="${esc(ex.id)}">Swap</button>
    </div>
  </div>`;
}

function hintHTML(p, ex) {
  if (!p) return "";
  const cls = p.dir === "up" ? "up" : p.dir === "down" ? "down" : p.dir === "new" ? "new" : "";
  const head = p.dir === "up" ? `Add weight → ${fmtKg(p.kg)} kg`
    : p.dir === "down" ? `Back off → ${fmtKg(p.kg)} kg`
    : p.dir === "new" ? `Start at ${fmtKg(p.kg)} kg`
    : `Stay at ${fmtKg(p.kg)} kg`;
  return `<div class="hint ${cls}">
    <b>${esc(head)}</b>
    <span>${esc(p.why)}</span>
    ${p.swap ? `<button class="mini" data-action="openSwap" data-a1="${esc(ex.id)}">Find an alternative</button>` : ""}
  </div>`;
}

/* ---------- form sheet ---------- */

export function formSheetHTML(exId) {
  const ex = findEx(state, exId);
  if (!ex) return "";
  const gym = gymOf(state);
  const [lo, hi] = rangeFor(ex, state.prefs);
  const p = prescribe(exId);
  const best = bestSet(exId);
  const hist = historyFor(exId, 3);
  const q = encodeURIComponent(ex.q || (ex.name + " proper form"));

  return `
    <div class="videobox" data-video="${esc(ex.id)}">
      <div class="vid-fallback">${movementAnim(ex.anim, { label: ex.name })}</div>
      <div class="vid-actions">
        <a class="btn sm ghost" target="_blank" rel="noopener"
           href="https://www.youtube.com/results?search_query=${q}">▶ Watch demos</a>
        <span class="small">The drawn loop works offline; the video needs signal.</span>
      </div>
    </div>

    <div class="protoc">
      <span class="tag ${ex.range === "heavy" ? "heavy" : "pump"}">${ex.sets} × ${lo}-${hi}</span>
      <span class="tag">rest ${esc(restText(ex.rest))}</span>
      <span class="tag">${esc(unitLabel(ex.load))}</span>
    </div>
    <p class="unit-explain">${esc(unitHint(ex.load))}${p ? ` — at ${fmtKg(p.kg)} kg that is <b>${esc(loadingText(p.kg, ex.load, gym))}</b>.` : ""}</p>

    ${ex.setup.length ? `<div class="sheet-sec"><h4>Set up</h4>
      <ol class="steps">${ex.setup.map(s => `<li>${esc(s)}</li>`).join("")}</ol></div>` : ""}

    <div class="sheet-sec"><h4>Execute</h4>
      <ol class="steps">${ex.cues.map(c => `<li>${esc(c)}</li>`).join("")}</ol></div>

    <div class="sheet-sec"><h4>Common mistakes</h4>
      <div class="cuelist">${ex.mist.map(c =>
        `<div class="cue bad"><div class="ic">✕</div><p>${esc(c)}</p></div>`).join("")}</div></div>

    <div class="sheet-sec"><h4>What it works</h4>
      ${exerciseBody(ex.m, "form")}
      <div class="musclekey">
        <span><i class="k-pri"></i>${esc(muscleNames(ex.m.p))}</span>
        ${(ex.m.s || []).length ? `<span><i class="k-sec"></i>${esc(muscleNames(ex.m.s))}</span>` : ""}
      </div>
    </div>

    ${hist.length ? `<div class="sheet-sec"><h4>Your history</h4>
      ${hist.map(h => `<div class="histset"><b>${esc(fmtD(h.d))}</b> —
        <span class="num">${esc(perfStr(h.sets))}</span></div>`).join("")}
      ${best ? `<div class="small" style="margin-top:8px">Best set:
        <b style="color:var(--ink)" class="num">${fmtKg(best.kg)} kg × ${best.reps}</b>
        (${esc(fmtD(best.d))})</div>` : ""}
    </div>` : ""}`;
}

/* ---------- swap sheet ---------- */

export function swapSheetHTML(exId) {
  const ex = findEx(state, exId);
  if (!ex) return "";
  const alts = alternativesFor(state, exId).slice(0, 14);
  if (!alts.length) return `<div class="empty">No close alternatives in the library yet.</div>`;
  return `<p class="sheet-msg">Same job, different movement. Your logged history follows the
      exercise, so swapping never loses anything.</p>
    <div class="swaplist">
      ${alts.map(a => `<button class="swapitem" data-action="doSwap"
        data-a1="${esc(exId)}" data-a2="${esc(a.id)}">
        <span class="si-name">${esc(a.name)}</span>
        <span class="si-meta">${esc(a.eq)} · ${esc(a.m.p.join(", "))}</span>
      </button>`).join("")}
    </div>`;
}
