/* ============================================================
   DOM helpers, the sheet/modal, charts, and the drawn movement
   animations that stand in for video when there is no signal.

   The v1 sheet had max-height:82vh, no scroll lock, no Esc, and its
   only Close button was below the fold — which is why it swallowed
   the page and needed a refresh. This one locks the background,
   keeps a sticky header with an always-visible close, closes on Esc,
   swipe and overlay tap, and becomes a centred dialog on desktop.
   ============================================================ */

export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];

export const esc = s => String(s ?? "").replace(/[&<>"']/g,
  c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function toast(msg, opts = {}) {
  const t = $("#toast");
  if (!t) return;
  t.innerHTML = esc(msg) + (opts.action
    ? ` <button class="toast-act" data-action="${esc(opts.action)}">${esc(opts.actionLabel || "Undo")}</button>`
    : "");
  t.classList.add("on");
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("on"), opts.ms || 3000);
}

/* ---------- sheet ---------- */

let sheetOpen = false;
let lastFocus = null;
let scrollY = 0;

export function openSheet(title, bodyHTML, opts = {}) {
  const sheet = $("#sheet"), overlay = $("#overlay");
  if (!sheet) return;
  lastFocus = document.activeElement;

  sheet.innerHTML = `
    <div class="sheet-head">
      <div class="grab" aria-hidden="true"></div>
      <div class="sheet-titles">
        <h3>${esc(title)}</h3>
        ${opts.sub ? `<div class="stag">${esc(opts.sub)}</div>` : ""}
      </div>
      <button class="sheet-x" data-action="closeSheet" aria-label="Close">✕</button>
    </div>
    <div class="sheet-body">${bodyHTML}</div>`;

  overlay.classList.add("on");
  sheet.classList.add("on");
  sheet.scrollTop = 0;
  sheetOpen = true;

  // Lock the page behind without losing the scroll position.
  scrollY = window.scrollY;
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = "100%";

  const focusable = sheet.querySelector("button, [href], input, select, textarea");
  if (focusable) focusable.focus({ preventScroll: true });
}

export function closeSheet() {
  if (!sheetOpen) return;
  const sheet = $("#sheet"), overlay = $("#overlay");
  overlay.classList.remove("on");
  sheet.classList.remove("on");
  sheetOpen = false;

  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.width = "";
  window.scrollTo(0, scrollY);

  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  lastFocus = null;
}

export function isSheetOpen() { return sheetOpen; }

export function installSheetControls() {
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && sheetOpen) { e.preventDefault(); closeSheet(); }
    // Keep tab focus inside the sheet while it is open.
    if (e.key === "Tab" && sheetOpen) {
      const items = [...$("#sheet").querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )].filter(el => !el.disabled && el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Swipe down to dismiss.
  const sheet = $("#sheet");
  let y0 = null, dragging = false;
  sheet.addEventListener("touchstart", e => {
    if (sheet.scrollTop > 0) return;
    y0 = e.touches[0].clientY; dragging = true;
  }, { passive: true });
  sheet.addEventListener("touchmove", e => {
    if (!dragging || y0 === null) return;
    const dy = e.touches[0].clientY - y0;
    if (dy > 0) sheet.style.transform = `translate(-50%, ${dy}px)`;
  }, { passive: true });
  sheet.addEventListener("touchend", e => {
    if (!dragging) return;
    dragging = false;
    const dy = (e.changedTouches[0].clientY - y0);
    sheet.style.transform = "";
    y0 = null;
    if (dy > 90) closeSheet();
  });
}

/* ---------- charts ---------- */

/**
 * Line chart. `series` = [{pts:[{d,y}], color, width, dash, dots}]
 */
export function lineChart(series, opts = {}) {
  const all = series.flatMap(s => s.pts);
  if (!all.length) return `<div class="empty">${esc(opts.empty || "Nothing logged yet.")}</div>`;

  const W = 340, H = opts.height || 150, L = 8, R = 16, T = 18, B = 22;
  const ys = all.map(p => p.y);
  let mn = Math.min(...ys), mx = Math.max(...ys);
  if (mn === mx) { mn -= 1; mx += 1; }
  const pad = (mx - mn) * 0.15; mn -= pad; mx += pad;

  const n = Math.max(...series.map(s => s.pts.length));
  const X = i => L + (W - L - R) * (n === 1 ? 0.5 : i / (n - 1));
  const Y = v => T + (H - T - B) * (1 - (v - mn) / (mx - mn));

  const grid = [0.25, 0.5, 0.75].map(f =>
    `<line x1="${L}" x2="${W - R}" y1="${(T + (H - T - B) * f).toFixed(1)}" y2="${(T + (H - T - B) * f).toFixed(1)}" stroke="var(--grid)" stroke-width="1"/>`
  ).join("");

  const body = series.map(s => {
    if (!s.pts.length) return "";
    const path = s.pts.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ");
    const line = `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2.5}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ""} stroke-linecap="round" stroke-linejoin="round"/>`;
    const dots = s.dots === false ? "" : s.pts.map((p, i) =>
      `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${i === s.pts.length - 1 ? 4.5 : 2.6}" fill="${i === s.pts.length - 1 ? s.color : "var(--card)"}" stroke="${s.color}" stroke-width="2"/>`
    ).join("");
    return line + dots;
  }).join("");

  const main = series[0];
  let tag = "";
  if (main && main.pts.length) {
    const lp = main.pts[main.pts.length - 1];
    const lx = X(main.pts.length - 1), ly = Y(lp.y);
    tag = `<text x="${lx}" y="${Math.max(ly - 11, 12)}" text-anchor="${lx > W - 64 ? "end" : "middle"}"
      font-size="12.5" font-weight="700" fill="${main.color}" class="chart-tag">${esc(fmtNum(lp.y))}${esc(opts.unit || "")}</text>`;
  }

  const first = all[0], last = all[all.length - 1];
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || "chart")}">
    ${grid}${body}${tag}
    <text x="${L}" y="${H - 4}" font-size="10" fill="var(--dim)">${esc(opts.from || first.d || "")}</text>
    <text x="${W - R}" y="${H - 4}" text-anchor="end" font-size="10" fill="var(--dim)">${esc(opts.to || last.d || "")}</text>
  </svg>`;
}

export function fmtNum(n) {
  const v = Number(n);
  if (!isFinite(v)) return "—";
  return (Math.round(v * 10) / 10).toString();
}

/** Horizontal bars, used for weekly sets per muscle. */
export function barRows(rows) {
  const max = Math.max(1, ...rows.map(r => Math.max(r.value, r.target || 0)));
  return `<div class="barrows">${rows.map(r => `
    <div class="barrow">
      <span class="bl">${esc(r.label)}</span>
      <span class="bt">
        <i style="width:${(r.value / max * 100).toFixed(1)}%;background:${r.color || "var(--c)"}"></i>
        ${r.target ? `<u style="left:${(r.target / max * 100).toFixed(1)}%"></u>` : ""}
      </span>
      <span class="bv num ${r.cls || ""}">${esc(fmtNum(r.value))}</span>
    </div>`).join("")}</div>`;
}

/* ---------- drawn movement animations ----------
   One animation per movement pattern rather than 100 one-offs. They are
   plain SMIL so they need no JS, no network, and keep working offline. */

const PATTERNS = {
  press_h:    { dur: 2.4, shoulder: [-70, -20, -70], elbow: [95, 5, 95], hip: [0, 0, 0], knee: [0, 0, 0], lean: 0, lying: true },
  press_v:    { dur: 2.4, shoulder: [-100, -175, -100], elbow: [80, 5, 80], hip: [0, 0, 0], knee: [0, 0, 0], lean: 0 },
  row_h:      { dur: 2.4, shoulder: [-15, 20, -15], elbow: [10, 105, 10], hip: [20, 20, 20], knee: [15, 15, 15], lean: 12 },
  pull_v:     { dur: 2.6, shoulder: [-165, -95, -165], elbow: [5, 110, 5], hip: [0, 0, 0], knee: [0, 0, 0], lean: -6 },
  squat:      { dur: 2.8, shoulder: [-8, -8, -8], elbow: [15, 15, 15], hip: [0, 95, 0], knee: [0, 105, 0], lean: 22 },
  hinge:      { dur: 2.8, shoulder: [-5, -5, -5], elbow: [3, 3, 3], hip: [0, 80, 0], knee: [0, 20, 0], lean: 62 },
  lunge:      { dur: 2.8, shoulder: [-5, -5, -5], elbow: [5, 5, 5], hip: [0, 60, 0], knee: [0, 95, 0], lean: 8 },
  curl:       { dur: 2.2, shoulder: [-5, -5, -5], elbow: [5, 135, 5], hip: [0, 0, 0], knee: [0, 0, 0], lean: 0 },
  extend:     { dur: 2.2, shoulder: [-10, -10, -10], elbow: [120, 5, 120], hip: [0, 0, 0], knee: [0, 0, 0], lean: 6 },
  raise_lat:  { dur: 2.4, shoulder: [-5, -88, -5], elbow: [12, 12, 12], hip: [0, 0, 0], knee: [0, 0, 0], lean: 8, front: true },
  fly:        { dur: 2.6, shoulder: [-95, -8, -95], elbow: [22, 22, 22], hip: [0, 0, 0], knee: [0, 0, 0], lean: 8, front: true },
  shrug:      { dur: 1.8, shoulder: [-2, -2, -2], elbow: [3, 3, 3], hip: [0, 0, 0], knee: [0, 0, 0], lean: 0, shrug: [0, -7, 0] },
  calf:       { dur: 2.0, shoulder: [-4, -4, -4], elbow: [4, 4, 4], hip: [0, 0, 0], knee: [0, 0, 0], lean: 0, rise: [0, -12, 0] },
  crunch:     { dur: 2.4, shoulder: [-40, -40, -40], elbow: [80, 80, 80], hip: [10, 10, 10], knee: [90, 90, 90], lean: 10, crunch: [0, 38, 0] },
  plank:      { dur: 3.0, shoulder: [-88, -88, -88], elbow: [88, 88, 88], hip: [0, 0, 0], knee: [0, 0, 0], lean: 78, hold: true },
  curl_leg:   { dur: 2.4, shoulder: [-88, -88, -88], elbow: [10, 10, 10], hip: [0, 0, 0], knee: [5, 115, 5], lean: 84, hold: true },
  extend_leg: { dur: 2.2, shoulder: [-30, -30, -30], elbow: [70, 70, 70], hip: [88, 88, 88], knee: [92, 2, 92], lean: 0 }
};

function animTag(attr, values, dur, type) {
  const v = values.join(";");
  if (type) {
    return `<animateTransform attributeName="transform" type="${type}" values="${v}" dur="${dur}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1" keyTimes="0;0.5;1"/>`;
  }
  return `<animate attributeName="${attr}" values="${v}" dur="${dur}s" repeatCount="indefinite"/>`;
}

/**
 * A looping stick-figure demo of the movement pattern.
 * Deliberately schematic — it shows the path of the joints, not a person.
 */
export function movementAnim(pattern, opts = {}) {
  const p = PATTERNS[pattern] || PATTERNS.press_h;
  const d = p.dur;
  const rot = vals => vals.join(";");

  const shrugY = p.shrug ? p.shrug : [0, 0, 0];
  const riseY = p.rise ? p.rise : [0, 0, 0];
  const crunchDeg = p.crunch ? p.crunch : null;

  const arm = `
    <g transform="translate(0,0)">
      <animateTransform attributeName="transform" type="translate"
        values="${shrugY.map(v => `0 ${v}`).join(";")}" dur="${d}s" repeatCount="indefinite"/>
      <g>
        <animateTransform attributeName="transform" type="rotate"
          values="${rot(p.shoulder)}" dur="${d}s" repeatCount="indefinite"
          calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.2 1;0.4 0 0.2 1"/>
        <line x1="0" y1="0" x2="0" y2="26" class="limb"/>
        <g transform="translate(0,26)">
          <g>
            <animateTransform attributeName="transform" type="rotate"
              values="${rot(p.elbow)}" dur="${d}s" repeatCount="indefinite"
              calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.2 1;0.4 0 0.2 1"/>
            <line x1="0" y1="0" x2="0" y2="24" class="limb"/>
            <circle cx="0" cy="24" r="5.5" class="load"/>
          </g>
        </g>
      </g>
    </g>`;

  const leg = `
    <g transform="translate(0,44)">
      <g>
        <animateTransform attributeName="transform" type="rotate"
          values="${rot(p.hip.map(v => -v))}" dur="${d}s" repeatCount="indefinite"
          calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.2 1;0.4 0 0.2 1"/>
        <line x1="0" y1="0" x2="0" y2="30" class="limb"/>
        <g transform="translate(0,30)">
          <g>
            <animateTransform attributeName="transform" type="rotate"
              values="${rot(p.knee)}" dur="${d}s" repeatCount="indefinite"
              calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.2 1;0.4 0 0.2 1"/>
            <line x1="0" y1="0" x2="0" y2="30" class="limb"/>
            <line x1="0" y1="30" x2="10" y2="30" class="limb"/>
          </g>
        </g>
      </g>
    </g>`;

  const torso = `
    <g transform="translate(60,${p.lying ? 78 : 40}) rotate(${p.lean})">
      ${crunchDeg ? `<animateTransform attributeName="transform" type="rotate"
          values="${crunchDeg.join(";")}" dur="${d}s" repeatCount="indefinite" additive="sum"
          calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.2 1;0.4 0 0.2 1"/>` : ""}
      <circle cx="0" cy="-13" r="9" class="head"/>
      <line x1="0" y1="-4" x2="0" y2="44" class="spine"/>
      ${arm}
      ${leg}
    </g>`;

  const ground = p.lying
    ? `<line x1="14" y1="126" x2="106" y2="126" class="ground"/><rect x="24" y="118" width="72" height="7" rx="3" class="bench"/>`
    : `<line x1="10" y1="150" x2="110" y2="150" class="ground"/>`;

  return `<svg viewBox="0 0 120 165" class="moveanim" role="img" aria-label="${esc(opts.label || pattern)} animation">
    ${ground}
    <g>
      ${riseY.some(v => v) ? `<animateTransform attributeName="transform" type="translate"
        values="${riseY.map(v => `0 ${v}`).join(";")}" dur="${d}s" repeatCount="indefinite"/>` : ""}
      ${torso}
    </g>
  </svg>`;
}

export function hasPattern(k) { return !!PATTERNS[k]; }

/* ---------- misc ---------- */

export function confirmSheet(title, message, confirmLabel, action, opts = {}) {
  openSheet(title, `
    <p class="sheet-msg">${esc(message)}</p>
    <div class="sheet-actions">
      <button class="btn ${opts.danger ? "danger" : ""} block" data-action="${esc(action)}">${esc(confirmLabel)}</button>
      <button class="btn ghost block" data-action="closeSheet">Cancel</button>
    </div>`);
}

export function pill(text, cls = "") {
  return `<span class="tag ${cls}">${esc(text)}</span>`;
}

export function restText(sec) {
  if (sec >= 60) {
    const m = sec / 60;
    return (Math.round(m * 10) / 10) + " min";
  }
  return sec + "s";
}
