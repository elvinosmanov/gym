/* ============================================================
   LIBRARY — the exercise pool, and the builder for your own days.

   This replaces the old Fuel tab. You said you couldn't find anything
   and didn't like most of the built-in exercises, so: search the whole
   library by muscle and equipment, and build your own A/B/C/D days
   out of whatever you actually want to do.
   ============================================================ */

import { state, save, uid } from "../state.js";
import { esc, restText } from "../ui.js";
import { unitLabel } from "../units.js";
import { rangeFor, DAY_COLORS } from "../data/program.js";
import { allExercises, findEx, EQUIPMENT } from "../data/exercises.js";
import { MUSCLES } from "../data/muscles.js";
import { historyFor } from "../coach.js";

export const ui = { tab: "days", q: "", muscle: "", equip: "", editing: null };

export function render() {
  return `
    <div class="segbar">
      <button class="seg ${ui.tab === "days" ? "on" : ""}" data-action="libTab" data-a1="days">My days</button>
      <button class="seg ${ui.tab === "browse" ? "on" : ""}" data-action="libTab" data-a1="browse">Exercises</button>
    </div>
    ${ui.tab === "days" ? daysHTML() : browseHTML()}`;
}

/* ================= my days ================= */

function daysHTML() {
  const days = state.program.days || [];
  if (ui.editing) return editDayHTML(ui.editing);

  return `
    <div class="sect">Your training days</div>
    ${days.length ? days.map(d => {
      const n = (d.ex || []).length;
      return `<div class="card daycard" style="--dc:var(--${esc(d.color)})">
        <div class="exhead">
          <div>
            <div class="name"><span class="mini-plate mp-${esc(d.color)}"></span>${esc(d.name)}</div>
            <div class="small">${n} exercise${n === 1 ? "" : "s"} ·
              ${esc((d.ex || []).slice(0, 3).map(s => {
                const ex = findEx(state, s.exId); return ex ? ex.name : s.exId;
              }).join(", "))}${n > 3 ? "…" : ""}</div>
          </div>
          <button class="techbtn" data-action="editDay" data-a1="${esc(d.id)}">Edit</button>
        </div>
        <div class="exfoot">
          <button class="mini strong" data-action="startDay" data-a1="${esc(d.id)}">Start this day</button>
          <button class="mini" data-action="dupDay" data-a1="${esc(d.id)}">Duplicate</button>
          ${days.length > 1 ? `<button class="mini danger" data-action="askDelDay" data-a1="${esc(d.id)}">Delete</button>` : ""}
        </div>
      </div>`;
    }).join("") : `<div class="card"><div class="empty">No days yet.</div></div>`}
    <button class="btn ghost block" data-action="newDay">+ New training day</button>
    <p class="footnote">Days run in the order shown. You can start any of them at any time —
      nothing is locked to a rotation.</p>`;
}

function editDayHTML(dayId) {
  const day = (state.program.days || []).find(d => d.id === dayId);
  if (!day) { ui.editing = null; return daysHTML(); }

  return `
    <div class="sect">Editing day</div>
    <div class="card">
      <div class="field"><label for="dayname">Name</label>
        <input id="dayname" value="${esc(day.name)}" data-input="dayName" data-a1="${esc(day.id)}"></div>
      <div class="field"><label>Colour</label>
        <div class="colorpick">${DAY_COLORS.map(c => `<button class="cdot mp-${c} ${day.color === c ? "on" : ""}"
          data-action="dayColor" data-a1="${esc(day.id)}" data-a2="${c}" aria-label="Colour ${c}"></button>`).join("")}</div>
      </div>
    </div>

    <div class="sect">Exercises</div>
    ${(day.ex || []).map((slot, i) => {
      const ex = findEx(state, slot.exId);
      if (!ex) return "";
      const [lo, hi] = rangeFor(ex, state.prefs);
      return `<div class="card slot">
        <div class="exhead">
          <div>
            <div class="name">${i + 1}. ${esc(ex.name)}</div>
            <div class="meta">
              <span class="tag ${ex.range === "heavy" ? "heavy" : "pump"}">${lo}-${hi} reps</span>
              <span class="tag">${esc(unitLabel(ex.load))}</span>
            </div>
          </div>
          <div class="exbtns">
            <button class="techbtn" data-action="moveSlot" data-a1="${esc(day.id)}" data-a2="${i}" data-a3="-1"
              ${i === 0 ? "disabled" : ""} aria-label="Move up">↑</button>
            <button class="techbtn" data-action="moveSlot" data-a1="${esc(day.id)}" data-a2="${i}" data-a3="1"
              ${i === day.ex.length - 1 ? "disabled" : ""} aria-label="Move down">↓</button>
          </div>
        </div>
        <div class="slotrow">
          <label>Sets <input type="number" min="1" max="10" value="${slot.sets || ex.sets}"
            data-input="slotSets" data-a1="${esc(day.id)}" data-i="${i}"></label>
          <label>Rest (s) <input type="number" min="20" max="400" step="10" value="${slot.rest || ex.rest}"
            data-input="slotRest" data-a1="${esc(day.id)}" data-i="${i}"></label>
          <button class="mini" data-action="openForm" data-a1="${esc(ex.id)}">Form</button>
          <button class="mini" data-action="replaceSlot" data-a1="${esc(day.id)}" data-a2="${i}">Replace</button>
          <button class="mini danger" data-action="delSlot" data-a1="${esc(day.id)}" data-a2="${i}">Remove</button>
        </div>
      </div>`;
    }).join("")}

    <button class="btn ghost block" data-action="addToDay" data-a1="${esc(day.id)}">+ Add exercise</button>
    <button class="btn block" style="margin-top:10px" data-action="doneEditing">Done</button>`;
}

/* ================= browse ================= */

function browseHTML() {
  const list = filtered();
  return `
    <div class="card tight searchcard">
      <input id="libq" class="search" type="search" placeholder="Search exercises…"
        value="${esc(ui.q)}" data-input="libSearch" aria-label="Search exercises">
      <div class="filterrow">
        <select data-input="libMuscle" aria-label="Filter by muscle">
          <option value="">All muscles</option>
          ${Object.keys(MUSCLES).map(k => `<option value="${k}" ${ui.muscle === k ? "selected" : ""}>${esc(MUSCLES[k].name)}</option>`).join("")}
        </select>
        <select data-input="libEquip" aria-label="Filter by equipment">
          <option value="">All equipment</option>
          ${EQUIPMENT.map(e => `<option value="${e}" ${ui.equip === e ? "selected" : ""}>${esc(cap(e))}</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="small libcount">${list.length} exercise${list.length === 1 ? "" : "s"}</div>
    ${list.length ? list.map(exRow).join("") : `<div class="card"><div class="empty">
      Nothing matches. Try clearing a filter.</div></div>`}`;
}

function exRow(ex) {
  const [lo, hi] = rangeFor(ex, state.prefs);
  const h = historyFor(ex.id, 1)[0];
  return `<button class="libitem" data-action="openForm" data-a1="${esc(ex.id)}">
    <span class="li-main">
      <span class="li-name">${esc(ex.name)}</span>
      <span class="li-meta">${esc(ex.m.p.map(m => MUSCLES[m] ? MUSCLES[m].name : m).join(", "))}
        · ${esc(cap(ex.eq))}</span>
    </span>
    <span class="li-tags">
      <span class="tag ${ex.range === "heavy" ? "heavy" : "pump"}">${lo}-${hi}</span>
      ${h ? `<span class="li-last num">${h.sets.length} sets logged</span>` : ""}
    </span>
  </button>`;
}

function filtered() {
  const q = ui.q.trim().toLowerCase();
  return allExercises(state).filter(ex => {
    if (ui.muscle && !ex.m.p.includes(ui.muscle) && !(ex.m.s || []).includes(ui.muscle)) return false;
    if (ui.equip && ex.eq !== ui.equip) return false;
    if (!q) return true;
    const hay = (ex.name + " " + (ex.aka || "") + " " + ex.eq + " " +
      ex.m.p.map(m => MUSCLES[m] ? MUSCLES[m].name : m).join(" ")).toLowerCase();
    return hay.includes(q);
  });
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ---------- picker sheet, used by "add" and "replace" ---------- */

export function pickerHTML(dayId, replaceIdx) {
  const list = filtered();
  return `
    <input class="search" type="search" placeholder="Search exercises…" value="${esc(ui.q)}"
      data-input="libSearch" autofocus aria-label="Search exercises">
    <div class="filterrow">
      <select data-input="libMuscle" aria-label="Filter by muscle">
        <option value="">All muscles</option>
        ${Object.keys(MUSCLES).map(k => `<option value="${k}" ${ui.muscle === k ? "selected" : ""}>${esc(MUSCLES[k].name)}</option>`).join("")}
      </select>
      <select data-input="libEquip" aria-label="Filter by equipment">
        <option value="">All equipment</option>
        ${EQUIPMENT.map(e => `<option value="${e}" ${ui.equip === e ? "selected" : ""}>${esc(cap(e))}</option>`).join("")}
      </select>
    </div>
    <div class="swaplist" style="margin-top:10px">
      ${list.slice(0, 60).map(ex => `<button class="swapitem"
        data-action="${replaceIdx === null || replaceIdx === undefined ? "pickAdd" : "pickReplace"}"
        data-a1="${esc(dayId)}" data-a2="${esc(ex.id)}" data-a3="${replaceIdx ?? ""}">
        <span class="si-name">${esc(ex.name)}</span>
        <span class="si-meta">${esc(cap(ex.eq))} · ${esc(ex.m.p.map(m => MUSCLES[m] ? MUSCLES[m].name : m).join(", "))}</span>
      </button>`).join("")}
    </div>`;
}

/* ---------- mutations ---------- */

export function newDay() {
  const days = state.program.days;
  const letters = "ABCDEFGH";
  const used = new Set(days.map(d => d.short));
  const short = [...letters].find(l => !used.has(l)) || String(days.length + 1);
  const day = {
    id: uid("day"), name: `Day ${short}`, short,
    color: DAY_COLORS[days.length % DAY_COLORS.length], ex: []
  };
  days.push(day);
  save();
  return day.id;
}

export function deleteDay(id) {
  state.program.days = (state.program.days || []).filter(d => d.id !== id);
  save();
}

export function duplicateDay(id) {
  const src = (state.program.days || []).find(d => d.id === id);
  if (!src) return null;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = uid("day");
  copy.name = src.name + " copy";
  copy.short = "";
  state.program.days.push(copy);
  save();
  return copy.id;
}

export function addExercise(dayId, exId) {
  const day = (state.program.days || []).find(d => d.id === dayId);
  const ex = findEx(state, exId);
  if (!day || !ex) return;
  day.ex.push({ exId, sets: ex.sets, rest: ex.rest });
  save();
}

export function replaceExercise(dayId, idx, exId) {
  const day = (state.program.days || []).find(d => d.id === dayId);
  const ex = findEx(state, exId);
  if (!day || !ex || !day.ex[idx]) return;
  day.ex[idx] = { exId, sets: ex.sets, rest: ex.rest };
  save();
}

export function removeSlot(dayId, idx) {
  const day = (state.program.days || []).find(d => d.id === dayId);
  if (!day) return;
  day.ex.splice(idx, 1);
  save();
}

export function moveSlot(dayId, idx, dir) {
  const day = (state.program.days || []).find(d => d.id === dayId);
  if (!day) return;
  const j = idx + dir;
  if (j < 0 || j >= day.ex.length) return;
  const [it] = day.ex.splice(idx, 1);
  day.ex.splice(j, 0, it);
  save();
}
