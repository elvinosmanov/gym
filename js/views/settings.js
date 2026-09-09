/* ============================================================
   SETTINGS — gym inventory, gym clock, rep ranges, your data.

   The gym inventory is not cosmetic: the whole progression engine
   reads it, so "+2.5 kg" is only ever suggested when your plates can
   actually make 2.5 kg, and dumbbells jump by the step your rack uses.
   ============================================================ */

import { state, save, status, exportJSON } from "../state.js";
import { esc } from "../ui.js";
import { DEFAULT_GYM, gymOf, reachableBarTotals, fmtKg } from "../units.js";
import { offsetText, gymClockStr, realClockStr, isSkewed } from "../clock.js";

export function settingsHTML() {
  const g = gymOf(state);
  const p = state.prefs;
  const barSteps = previewSteps(g);

  return `
    <div class="sheet-sec">
      <h4>Gym clock</h4>
      <p class="small">The wall clock is the one you actually look at between sets.
        Tell the app what it says and every time in here matches it.</p>
      <div class="inline-log">
        <input id="clocksync" type="text" inputmode="numeric" placeholder="18:47"
          aria-label="What the gym clock says now">
        <button class="btn sm" data-action="syncClock">Sync</button>
      </div>
      <p class="small" style="margin-top:8px">
        Gym clock <b class="num">${gymClockStr()}</b> · phone <b class="num">${realClockStr()}</b>
        — ${esc(offsetText())}.
        ${isSkewed() ? ` <button class="mini" data-action="clearClock">Reset</button>` : ""}
      </p>
    </div>

    <div class="sheet-sec">
      <h4>What your gym has</h4>
      <p class="small">This decides every weight jump the app suggests.</p>

      <div class="grid2">
        <div class="field"><label for="g-bar">Barbell (kg)</label>
          <input id="g-bar" type="number" step="0.5" value="${g.barKg}" data-input="gym" data-k="barKg"></div>
        <div class="field"><label for="g-ez">EZ bar (kg)</label>
          <input id="g-ez" type="number" step="0.5" value="${g.ezBarKg}" data-input="gym" data-k="ezBarKg"></div>
      </div>

      <div class="field"><label>Plate pairs you have (kg)</label>
        <div class="chips platepick">
          ${[25, 20, 15, 10, 5, 2.5, 2, 1.25, 1, 0.5].map(v => `
            <button class="chip ${g.plates.includes(v) ? "on" : ""}"
              data-action="togglePlate" data-a1="${v}">${v}</button>`).join("")}
        </div>
        <p class="small" style="margin-top:6px">
          Smallest pair: <b>${Math.min(...g.plates)} kg</b> →
          the bar can go up in <b>${fmtKg(Math.min(...g.plates) * 2)} kg</b> steps.
          ${barSteps}
        </p>
      </div>

      <div class="grid3">
        <div class="field"><label for="g-dbs">Dumbbell step</label>
          <select id="g-dbs" data-input="gym" data-k="dbStep">
            ${[1, 2, 2.5, 5].map(v => `<option value="${v}" ${g.dbStep == v ? "selected" : ""}>${v} kg</option>`).join("")}
          </select></div>
        <div class="field"><label for="g-dbmax">Heaviest DB</label>
          <input id="g-dbmax" type="number" step="1" value="${g.dbMax}" data-input="gym" data-k="dbMax"></div>
        <div class="field"><label for="g-stack">Cable stack step</label>
          <select id="g-stack" data-input="gym" data-k="stackStep">
            ${[2.5, 5, 6.8, 7.5, 10].map(v => `<option value="${v}" ${g.stackStep == v ? "selected" : ""}>${v} kg</option>`).join("")}
          </select></div>
      </div>
      <p class="small">Dumbbells will now be suggested in ${g.dbStep} kg steps —
        set this to whatever your rack actually jumps by.</p>
    </div>

    <div class="sheet-sec">
      <h4>Rep ranges</h4>
      <div class="grid2">
        <div class="field"><label>Heavy (compounds)</label>
          <div class="rangepick">
            <input type="number" min="1" max="30" value="${p.heavyRange[0]}" data-input="range" data-k="heavy" data-i="0">
            <span>to</span>
            <input type="number" min="1" max="30" value="${p.heavyRange[1]}" data-input="range" data-k="heavy" data-i="1">
          </div></div>
        <div class="field"><label>Pump (isolation)</label>
          <div class="rangepick">
            <input type="number" min="1" max="30" value="${p.pumpRange[0]}" data-input="range" data-k="pump" data-i="0">
            <span>to</span>
            <input type="number" min="1" max="30" value="${p.pumpRange[1]}" data-input="range" data-k="pump" data-i="1">
          </div></div>
      </div>
      <p class="small">Heavy loads build the same muscle as light ones but more strength, which is why
        the compounds run low. Isolation stays higher because a heavy 8 on a lateral raise is a swing.</p>
    </div>

    <div class="sheet-sec">
      <h4>Session</h4>
      <label class="switch"><input type="checkbox" ${p.restAutoStart !== false ? "checked" : ""}
        data-input="pref" data-k="restAutoStart"> Start the rest timer when I tick a set</label>
      <label class="switch"><input type="checkbox" ${p.sound !== false ? "checked" : ""}
        data-input="pref" data-k="sound"> Beep when rest is over</label>
      <label class="switch"><input type="checkbox" ${p.showFuel !== false ? "checked" : ""}
        data-input="pref" data-k="showFuel"> Show calorie and protein target</label>
      <div class="field"><label for="p-auto">Auto-save a forgotten session after (minutes)</label>
        <input id="p-auto" type="number" min="20" max="300" step="10" value="${p.autoFinishMin}"
          data-input="pref" data-k="autoFinishMin"></div>
      <p class="small">If you walk out without pressing finish, the app saves what you logged
        instead of losing it.</p>
    </div>

    <div class="sheet-sec">
      <h4>Your profile</h4>
      <div class="grid3">
        <div class="field"><label for="s-age">Age</label>
          <input id="s-age" type="number" value="${esc(state.profile.age)}" data-input="profile" data-k="age"></div>
        <div class="field"><label for="s-h">Height cm</label>
          <input id="s-h" type="number" value="${esc(state.profile.h)}" data-input="profile" data-k="h"></div>
        <div class="field"><label for="s-sur">Surplus kcal</label>
          <input id="s-sur" type="number" step="50" value="${esc(state.profile.sur)}" data-input="profile" data-k="sur"></div>
      </div>
      <div class="field"><label for="s-act">Daily activity</label>
        <select id="s-act" data-input="profile" data-k="act">
          <option value="1.375" ${state.profile.act == 1.375 ? "selected" : ""}>Light — desk job, gym 3×/week</option>
          <option value="1.55" ${state.profile.act == 1.55 ? "selected" : ""}>Moderate — on your feet a lot + gym</option>
          <option value="1.725" ${state.profile.act == 1.725 ? "selected" : ""}>High — physical job + gym</option>
        </select></div>
    </div>

    <div class="sheet-sec">
      <h4>Your data</h4>
      <p class="small">${state.sessions.length} sessions and ${state.weights.length} weigh-ins are stored
        on this device only. Export a copy before changing phones or clearing your browser.</p>
      <div class="sheet-actions">
        <button class="btn sm" data-action="downloadBackup">Export backup</button>
        <button class="btn sm ghost" data-action="triggerImport">Import backup</button>
      </div>
      <input type="file" id="importfile" accept="application/json,.json" hidden data-input="importFile">
    </div>`;
}

function previewSteps(g) {
  const totals = reachableBarTotals(g.barKg, g.plates, g.barKg + 30);
  const first = totals.slice(1, 4).map(t => fmtKg(t)).join(", ");
  return first ? `First few bar weights: <b>${esc(first)} kg</b>.` : "";
}
