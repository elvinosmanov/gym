/* ============================================================
   PROGRESS — one answer sheet.

   v1 gave you a bodyweight line, one lift at a time behind a dropdown,
   and a list of sessions to click through. This answers the four
   questions that actually matter without opening anything:
     am I getting stronger, am I gaining at the right rate,
     am I consistent, and what am I under-training.
   ============================================================ */

import { state, fmtD, todayISO, e1rm, daysBetween, latestW } from "../state.js";
import { esc, lineChart, barRows, fmtNum } from "../ui.js";
import { fmtKg } from "../units.js";
import { findEx } from "../data/exercises.js";
import { MUSCLES, WEEKLY_SETS, bodyView, heatShade, volumeStatus } from "../data/muscles.js";
import {
  verdict, strengthIndex, bodyweightTrend, movingAvg, setsPerMuscle,
  weakestMuscles, weekStartISO, tonnage, prFeed, bestSet
} from "../coach.js";

export function render() {
  if (!state.sessions.length && state.weights.length < 2) {
    return `<div class="card"><div class="empty">
      Train once and this page starts working.<br>
      Every chart here builds itself from your logs.</div></div>`;
  }
  return `
    ${verdictHTML()}
    ${strengthHTML()}
    ${bodyweightHTML()}
    ${volumeHTML()}
    ${consistencyHTML()}
    ${prHTML()}
    ${historyHTML()}`;
}

/* ---------- 1. verdict ---------- */

function verdictHTML() {
  const v = verdict();
  return `<div class="card verdict ${esc(v.tone)}">
    <div class="v-label">Where you're at</div>
    <p class="v-text">${esc(v.text)}</p>
  </div>`;
}

/* ---------- 2. strength ---------- */

function strengthHTML() {
  const pts = [];
  for (let i = 0; i < state.sessions.length; i++) {
    pts.push({ d: state.sessions[i].d, y: strengthIndex(i) });
  }
  const rows = liftTable();

  return `<div class="sect">Strength</div>
    <div class="card">
      <div class="small" style="letter-spacing:.14em;text-transform:uppercase;font-size:10.5px">
        Strength index · total estimated 1RM of your heavy lifts</div>
      <div class="chartbox">${lineChart([{ pts, color: "var(--c)" }],
        { unit: " kg", from: pts.length ? fmtD(pts[0].d) : "", to: pts.length ? fmtD(pts[pts.length - 1].d) : "",
          empty: "Log a heavy compound and this starts moving." })}</div>
      ${rows ? `<hr class="split">${rows}` : ""}
    </div>`;
}

function liftTable() {
  const seen = new Map();
  for (const s of state.sessions) {
    for (const e of s.ex || []) {
      let best = 0, kg = 0, reps = 0;
      for (const st of e.sets || []) {
        const v = e1rm(st.kg, st.reps);
        if (v > best) { best = v; kg = st.kg; reps = st.reps; }
      }
      if (!best) continue;
      const cur = seen.get(e.exId) || { name: e.name, first: null, last: null, firstD: s.d, lastD: s.d };
      if (cur.first === null) { cur.first = best; cur.firstD = s.d; }
      cur.last = best; cur.lastD = s.d; cur.kg = kg; cur.reps = reps;
      seen.set(e.exId, cur);
    }
  }
  if (!seen.size) return "";

  const rows = [...seen.entries()].map(([id, r]) => {
    const ex = findEx(state, id);
    const pct = r.first > 0 ? ((r.last - r.first) / r.first) * 100 : 0;
    return { id, name: r.name, ex, pct, kg: r.kg, reps: r.reps, last: r.last, lastD: r.lastD };
  }).sort((a, b) => b.pct - a.pct);

  return `<div class="lifttable">
    <div class="lt-head"><span>Lift</span><span>Best set</span><span>Since start</span></div>
    ${rows.map(r => `<div class="lt-row">
      <span class="lt-n">${esc(r.name)}</span>
      <span class="lt-b num">${fmtKg(r.kg)}×${r.reps}</span>
      <span class="lt-d num ${r.pct > 0.5 ? "up" : r.pct < -0.5 ? "down" : ""}">
        ${r.pct >= 0 ? "+" : ""}${r.pct.toFixed(0)}%</span>
    </div>`).join("")}
  </div>`;
}

/* ---------- 3. bodyweight ---------- */

function bodyweightHTML() {
  const pts = state.weights.map(x => ({ d: x.d, y: Math.round(x.kg * 10) / 10 }));
  const avg = pts.length > 2 ? movingAvg(pts, 7) : [];
  const bt = bodyweightTrend();

  return `<div class="sect">Bodyweight</div>
    <div class="card">
      <div class="chartbox">${lineChart(
        [{ pts, color: "var(--b)", dots: pts.length < 40 },
         ...(avg.length ? [{ pts: avg, color: "var(--chalk)", width: 2, dash: "5 4", dots: false }] : [])],
        { unit: " kg", from: pts.length ? fmtD(pts[0].d) : "", to: pts.length ? fmtD(pts[pts.length - 1].d) : "",
          empty: "Log your bodyweight a few times and the trend appears." })}</div>
      ${avg.length ? `<div class="legend"><span><i style="background:var(--b)"></i>daily</span>
        <span><i style="background:var(--chalk)"></i>7-day average</span></div>` : ""}
      ${bt ? rateHTML(bt) : `<div class="small">Log at least two weigh-ins a week apart to see your rate.</div>`}
      <div class="inline-log" style="margin-top:12px">
        <input id="pw" type="number" inputmode="decimal" step="0.1" placeholder="Log today's kg"
          aria-label="Today's bodyweight">
        <button class="btn sm" data-action="logWeight" data-a1="pw">Log</button>
      </div>
      ${state.weights.length ? `<div class="loglist">
        ${state.weights.slice(-6).reverse().map(x => {
          const idx = state.weights.indexOf(x);
          return `<div class="logrow"><span class="num"><b>${fmtKg(x.kg)} kg</b></span>
            <span class="d">${esc(fmtD(x.d))}</span>
            <button class="xdel" data-action="delWeight" data-a1="${idx}" aria-label="Delete">✕</button></div>`;
        }).join("")}</div>` : ""}
    </div>`;
}

function rateHTML(bt) {
  const pw = bt.perWeek;
  const good = pw >= 0.2 && pw <= 0.6;
  const cls = good ? "ok" : pw > 0.6 ? "warn" : "warn";
  const msg = good ? "right in the bulking window"
    : pw > 0.6 ? "faster than 0.5 kg/wk — more of that is fat. Pull back ~200 kcal."
    : "under 0.25 kg/wk. That is not a surplus — add ~200 kcal.";
  return `<div class="rate ${cls}">
    <b class="num">${pw >= 0 ? "+" : ""}${pw.toFixed(2)} kg/week</b>
    <span>over the last ${bt.span} days — ${esc(msg)}</span>
  </div>`;
}

/* ---------- 4. volume + muscle map ---------- */

function volumeHTML() {
  const week = weekStartISO();
  const vol = setsPerMuscle(week);
  const shade = heatShade(vol);
  const weak = weakestMuscles(vol, 4);

  const rows = Object.keys(MUSCLES)
    .map(k => {
      const v = vol[k] || 0;
      const st = volumeStatus(k, v);
      return { key: k, label: MUSCLES[k].name, value: v, target: (WEEKLY_SETS[k] || [8])[0],
               cls: st.cls, color: st.cls === "ok" ? "var(--green)" : st.cls === "warn" ? "var(--c)" : "var(--line)" };
    })
    .sort((a, b) => b.value - a.value);

  return `<div class="sect">This week's volume</div>
    <div class="card">
      <div class="bodypair heat">
        ${bodyView("front", shade, "heat")}
        ${bodyView("back", shade, "heat")}
      </div>
      <div class="heatkey">
        <span><i class="h0"></i>none</span><span><i class="h1"></i>low</span>
        <span><i class="h2"></i>under</span><span><i class="h3"></i>good</span><span><i class="h4"></i>high</span>
      </div>
      ${weak.length ? `<div class="weakbox">
        <b>Under-trained this week</b>
        <p>${weak.map(w => `${esc(w.name)} (${fmtNum(w.sets)}/${(WEEKLY_SETS[w.key] || [8])[0]})`).join(" · ")}</p>
      </div>` : `<div class="weakbox ok"><b>Every muscle is covered this week.</b></div>`}
      <details class="rules flat"><summary>Sets per muscle</summary><div class="inner">
        ${barRows(rows)}
        <p class="small" style="margin-top:10px">The marker is the weekly minimum for growth.
          Secondary muscles count as half a set.</p>
      </div></details>
    </div>`;
}

/* ---------- 5. consistency ---------- */

function consistencyHTML() {
  const weeks = 12;
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (weeks - 1) * 7);
  const byDate = new Map();
  for (const s of state.sessions) byDate.set(s.d, (byDate.get(s.d) || 0) + 1);

  let cells = "";
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start);
      dt.setDate(dt.getDate() + w * 7 + d);
      const iso = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
      const n = byDate.get(iso) || 0;
      const future = dt > today;
      cells += `<i class="c${Math.min(n, 2)} ${future ? "fut" : ""}" title="${iso}${n ? ` · ${n} session` : ""}"></i>`;
    }
  }

  const total = state.sessions.length;
  const last = state.sessions[state.sessions.length - 1];
  const gap = last ? daysBetween(last.d, todayISO()) : null;

  return `<div class="sect">Consistency</div>
    <div class="card">
      <div class="grid12">${cells}</div>
      <div class="small" style="margin-top:10px">
        ${total} session${total === 1 ? "" : "s"} logged${last ? ` · last was ${esc(fmtD(last.d))}` : ""}
        ${gap !== null ? ` (${gap === 0 ? "today" : gap === 1 ? "yesterday" : gap + " days ago"})` : ""}.
        Last 12 weeks shown, one square per day.
      </div>
    </div>`;
}

/* ---------- 6. PRs ---------- */

function prHTML() {
  const feed = prFeed(10);
  if (!feed.length) return "";
  return `<div class="sect">Personal records</div>
    <div class="card">
      ${feed.map(p => `<div class="prrow">
        <span class="pr-d">${esc(fmtD(p.d))}</span>
        <span class="pr-n">${esc(p.name)}</span>
        <span class="pr-v num">${fmtKg(p.kg)} × ${p.reps}</span>
      </div>`).join("")}
    </div>`;
}

/* ---------- 7. history, collapsed ---------- */

function historyHTML() {
  if (!state.sessions.length) return "";
  return `<div class="sect">History</div>
    <details class="rules"><summary>Every session (${state.sessions.length})</summary><div class="inner">
      ${state.sessions.slice().reverse().map((s) => {
        const i = state.sessions.indexOf(s);
        const n = (s.ex || []).reduce((a, e) => a + e.sets.length, 0);
        const day = (state.program.days || []).find(d => d.id === s.dayId);
        return `<details class="hist"><summary>
            <span><span class="mini-plate mp-${esc(day ? day.color : "a")}"></span>
              <b>${esc(s.dayName || "Workout")}</b> · ${esc(fmtD(s.d))}</span>
            <span class="hs num">${n} sets</span></summary>
          ${(s.ex || []).map(e => `<div class="histset"><b>${esc(e.name)}</b> —
            <span class="num">${e.sets.map(x => `${fmtKg(x.kg)}×${x.reps}`).join(", ")}</span>
            ${e.note ? `<i class="hn">${esc(e.note)}</i>` : ""}</div>`).join("")}
          ${s.note ? `<div class="histnote">"${esc(s.note)}"</div>` : ""}
          <button class="btn sm danger" style="margin:8px 0 10px"
            data-action="delSession" data-a1="${i}">Delete session</button>
        </details>`;
      }).join("")}
    </div></details>`;
}
