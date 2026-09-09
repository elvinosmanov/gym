/* ============================================================
   TODAY — the daily brief.

   You said you don't want to spend time on the phone working out what
   to do. This screen answers it in about eight lines: which day, the
   exact weights, one thing to watch, where you're at, and what to eat.
   Everything else is collapsed or on another tab.
   ============================================================ */

import { state, status, latestW, fmtD, todayISO, save, daysBetween } from "../state.js";
import { esc, restText } from "../ui.js";
import { fmtKg, loadingText, gymOf } from "../units.js";
import { rangeFor, TIPS } from "../data/program.js";
import { findEx } from "../data/exercises.js";
import {
  suggestedDay, briefFor, watchLine, fuelTargets,
  bodyweightTrend, verdict
} from "../coach.js";
import { isActive, activeDay, sessionElapsedMs, countLogged } from "../session.js";
import { gymClockStr, isSkewed, offsetText, durationText } from "../clock.js";

export function profileDone() {
  const p = state.profile;
  return !!(p.name && p.age && p.h && (p.w || state.weights.length));
}

export function render() {
  const p = state.profile;
  const gym = gymOf(state);
  const day = suggestedDay();
  const running = isActive();
  const w = latestW();
  const tip = TIPS[(state.sessions.length + new Date().getDate()) % TIPS.length];

  return `
    ${noticeHTML()}
    ${runningBarHTML()}
    ${!profileDone() ? setupHTML() : ""}
    ${profileDone() ? `<div class="hello">
      <div class="h-big">${running ? "Back to work" : "Ready"}, ${esc(p.name)}.</div>
      <div class="sub">${new Date().toLocaleDateString("en-GB", { weekday: "long" })}
        · gym clock <b class="num">${gymClockStr()}</b>${isSkewed() ? ` <span class="gymbadge">GYM</span>` : ""}</div>
    </div>` : ""}

    ${day ? briefCard(day, running) : `<div class="card"><div class="empty">
      No training days yet. Build one in the Library tab.</div></div>`}

    ${profileDone() ? statsHTML(w) : ""}
    ${profileDone() ? fuelLine() : ""}
    ${profileDone() ? weightLogHTML(w) : ""}

    <div class="sect">Coach's corner</div>
    <div class="card coach"><div class="cq">"</div><div><p>${esc(tip)}</p>
      <div class="who">— The protocol</div></div></div>

    <button class="btn ghost block" data-action="openSettings" style="margin-top:14px">Settings &amp; gym setup</button>`;
}

/* ---------- the brief ---------- */

function briefCard(day, running) {
  const lines = briefFor(day, 3);
  const rest = (day.ex || []).length - lines.length;
  const watch = watchLine();

  return `<div class="card brief">
    <div class="brief-head">
      <div>
        <div class="h-big"><span class="mini-plate mp-${esc(day.color)}"></span>${esc(day.name)}</div>
        <div class="sub">${(day.ex || []).length} exercises · ~${estMinutes(day)} min</div>
      </div>
      ${running ? `<span class="livechip">LIVE</span>` : ""}
    </div>

    <div class="brief-sec">
      <div class="brief-label">Do this</div>
      ${lines.map(l => {
        const dirCls = l.p.dir === "up" ? "up" : l.p.dir === "down" ? "down" : "";
        const arrow = l.p.dir === "up" ? `↑ +${fmtKg(l.p.step)}`
                    : l.p.dir === "down" ? `↓ −${fmtKg(l.p.step)}`
                    : l.p.dir === "new" ? "new" : "=";
        return `<div class="brief-row">
          <span class="bn">${esc(l.ex.name)}</span>
          <span class="bs num">${l.sets}×${l.lo}-${l.hi}</span>
          <span class="bw num">${fmtKg(l.p.kg)}<small>kg</small></span>
          <span class="bd ${dirCls}">${esc(arrow)}</span>
        </div>`;
      }).join("")}
      ${rest > 0 ? `<button class="brief-more" data-action="goTrain">+${rest} more · see the full session</button>` : ""}
    </div>

    ${watch ? `<div class="brief-sec"><div class="brief-label">Watch</div>
      <p class="brief-note">${esc(watch)}</p></div>` : ""}

    <div class="brief-sec"><div class="brief-label">Progress</div>
      <p class="brief-note">${esc(progressLine())}</p></div>

    <div class="brief-cta">
      ${running
        ? `<button class="btn block" data-action="goTrain">Resume — ${durationText(sessionElapsedMs())} in</button>`
        : `<button class="btn block" data-action="startDay" data-a1="${esc(day.id)}">Start ${esc(day.name)}</button>`}
      <button class="btn ghost block sm" data-action="goTrain">${running ? "Full session" : "Train something else"}</button>
    </div>
  </div>`;
}

function estMinutes(day) {
  let s = 0;
  for (const slot of day.ex || []) {
    const ex = findEx(state, slot.exId);
    if (!ex) continue;
    const sets = slot.sets || ex.sets;
    s += sets * ((slot.rest || ex.rest) + 40);
  }
  return Math.round(s / 60 / 5) * 5;
}

function progressLine() {
  const n = state.sessions.length;
  if (!n) return "Day one. Log this session and the app takes over the weight decisions from here.";
  const bt = bodyweightTrend();
  const wk = weekCount();
  const bits = [`${n} session${n === 1 ? "" : "s"} logged`, `${wk}/3 this week`];
  if (bt) {
    const dir = bt.perWeek >= 0 ? "+" : "";
    const ok = bt.perWeek >= 0.2 && bt.perWeek <= 0.6 ? "on target" :
               bt.perWeek > 0.6 ? "gaining fast" : "scale is flat";
    bits.push(`${dir}${bt.perWeek.toFixed(2)} kg/wk — ${ok}`);
  }
  return bits.join(" · ");
}

function weekCount() {
  const mon = new Date();
  mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
  mon.setHours(0, 0, 0, 0);
  return state.sessions.filter(s => {
    const [y, m, d] = s.d.split("-").map(Number);
    return new Date(y, m - 1, d) >= mon;
  }).length;
}

/* ---------- fuel, reduced to two numbers ---------- */

function fuelLine() {
  if (state.prefs.showFuel === false) return "";
  const f = fuelTargets();
  if (!f) return "";
  return `<div class="card tight fuelline">
    <div class="fl-main"><span class="fl-label">Eat</span>
      <b class="num">${f.kcal.toLocaleString()}</b> kcal
      · <b class="num">${f.protein}</b> g protein</div>
    ${f.advice ? `<div class="fl-sub">${esc(f.advice)}</div>` : ""}
  </div>`;
}

/* ---------- pieces ---------- */

function runningBarHTML() {
  if (!isActive()) return "";
  const day = activeDay();
  const { sets } = countLogged();
  return `<button class="runbar" data-action="goTrain">
    <span class="rb-dot"></span>
    <span class="rb-txt"><b>Session running</b> — ${esc(day ? day.name : "")} ·
      ${durationText(sessionElapsedMs())} · ${sets} set${sets === 1 ? "" : "s"}</span>
    <span class="rb-go">Finish →</span>
  </button>`;
}

function noticeHTML() {
  if (status.frozen) {
    return `<div class="warnnote bad">
      <b>Your saved data could not be read.</b>
      <p>Nothing has been overwritten and nothing new will be saved until you decide what to do.</p>
      <div class="sheet-actions">
        <button class="btn sm" data-action="downloadBackup">Download the raw data</button>
        <button class="btn sm ghost" data-action="unfreeze">Start fresh anyway</button>
      </div></div>`;
  }
  if (!status.ok) {
    return `<div class="warnnote"><b>Saving isn't working in this browser.</b>
      <p>${esc(status.message)}</p></div>`;
  }
  if (status.message) {
    return `<div class="banner">${esc(status.message)}
      <button class="x-inline" data-action="dismissNotice" aria-label="Dismiss">✕</button></div>`;
  }
  return "";
}

function statsHTML(w) {
  const prevW = state.weights.length > 1 ? state.weights[state.weights.length - 2].kg : null;
  const dlt = (w && prevW) ? (w - prevW) : null;
  return `<div class="stats">
    <div class="stat"><div class="v num">${w ? fmtKg(w) : "—"}<small> kg</small></div>
      <div class="l">Bodyweight ${dlt !== null ? `<span class="${dlt >= 0 ? "delta-up" : "delta-dn"}">${dlt >= 0 ? "+" : ""}${dlt.toFixed(1)}</span>` : ""}</div></div>
    <div class="stat"><div class="v num">${weekCount()}<small> / 3</small></div><div class="l">This week</div></div>
    <div class="stat"><div class="v num">${state.sessions.length}</div><div class="l">Sessions</div></div>
  </div>`;
}

function weightLogHTML(w) {
  const t = todayISO();
  const already = state.weights.find(x => x.d === t);
  return `<div class="sect">Bodyweight</div>
    <div class="card tight">
      <div class="inline-log">
        <input id="qw" type="number" inputmode="decimal" step="0.1"
          placeholder="${w ? fmtKg(w) : "kg"}" aria-label="Today's bodyweight">
        <button class="btn sm" data-action="logWeight" data-a1="qw">${already ? "Update" : "Log"}</button>
      </div>
      <div class="small" style="margin-top:8px">
        ${already ? `Logged <b>${fmtKg(already.kg)} kg</b> today. ` : ""}Weigh 2-3× a week, mornings, before eating.
        Target while bulking: <b style="color:var(--ink)">+0.25-0.5 kg/week</b>.
      </div>
    </div>`;
}

function setupHTML() {
  const p = state.profile;
  return `<div class="card">
    <div class="h-big">Set up your protocol</div>
    <div class="sub" style="margin-top:2px">30 seconds. This powers your weight suggestions and nutrition targets.</div>
    <div class="field"><label for="su-name">Name</label>
      <input id="su-name" value="${esc(p.name)}" placeholder="Your name"></div>
    <div class="grid3">
      <div class="field"><label for="su-age">Age</label>
        <input id="su-age" type="number" inputmode="numeric" value="${esc(p.age)}" placeholder="27"></div>
      <div class="field"><label for="su-h">Height cm</label>
        <input id="su-h" type="number" inputmode="numeric" value="${esc(p.h)}" placeholder="178"></div>
      <div class="field"><label for="su-w">Weight kg</label>
        <input id="su-w" type="number" inputmode="decimal" step="0.1" value="${esc(p.w)}" placeholder="70"></div>
    </div>
    <div class="field"><label for="su-act">Daily activity</label>
      <select id="su-act">
        <option value="1.375" ${p.act == 1.375 ? "selected" : ""}>Light — desk job, gym 3×/week</option>
        <option value="1.55" ${p.act == 1.55 ? "selected" : ""}>Moderate — on your feet a lot + gym</option>
        <option value="1.725" ${p.act == 1.725 ? "selected" : ""}>High — physical job + gym</option>
      </select></div>
    <button class="btn block" data-action="saveSetup">Save &amp; start</button>
  </div>`;
}
