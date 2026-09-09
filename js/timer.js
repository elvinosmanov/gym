/* ============================================================
   Rest timer.

   v1 kept the countdown in a plain variable, so switching tabs or
   locking the phone lost it. This one stores the target timestamp,
   so it stays correct across re-renders, tab switches and reloads.
   Also holds a screen wake lock while a session is running.
   ============================================================ */

import { state, save } from "./state.js";
import { endsAt } from "./clock.js";

let raf = null;
let endMs = 0;
let label = "";
let onTickCb = null;
let audioCtx = null;
let wakeLock = null;

const KEY = "forge-timer";

export function restore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d && d.endMs && d.endMs > Date.now()) {
      endMs = d.endMs; label = d.label || "";
      loop();
    } else {
      localStorage.removeItem(KEY);
    }
  } catch (e) { /* a lost timer is not worth an error */ }
}

function persist() {
  try {
    if (endMs > Date.now()) localStorage.setItem(KEY, JSON.stringify({ endMs, label }));
    else localStorage.removeItem(KEY);
  } catch (e) {}
}

export function onTick(fn) { onTickCb = fn; }

export function start(seconds, lbl) {
  if (!seconds || seconds <= 0) return;
  endMs = Date.now() + seconds * 1000;
  label = lbl || "REST";
  persist();
  loop();
}

export function add(seconds) {
  if (!isRunning()) endMs = Date.now();
  endMs += seconds * 1000;
  persist();
  loop();
}

export function skip() {
  endMs = 0;
  cancelAnimationFrame(raf);
  raf = null;
  persist();
  render();
}

export function isRunning() { return endMs > Date.now(); }
export function remaining() { return Math.max(0, Math.ceil((endMs - Date.now()) / 1000)); }

function loop() {
  cancelAnimationFrame(raf);
  const step = () => {
    render();
    if (endMs > Date.now()) {
      raf = requestAnimationFrame(step);
    } else if (endMs) {
      fire();
    }
  };
  raf = requestAnimationFrame(step);
}

let fired = false;
function fire() {
  if (fired) return;
  fired = true;
  beep();
  try { navigator.vibrate && navigator.vibrate([160, 90, 160]); } catch (e) {}
  const el = document.getElementById("timer");
  if (el) el.classList.add("done");
  setTimeout(() => {
    if (!isRunning()) { endMs = 0; fired = false; persist(); render(); }
  }, 2500);
}

function render() {
  const el = document.getElementById("timer");
  if (!el) return;
  const left = remaining();
  const running = endMs > 0;
  el.classList.toggle("on", running);
  if (!running) { el.classList.remove("done"); fired = false; }
  const m = Math.floor(left / 60), s = left % 60;
  const digits = document.getElementById("timerDigits");
  const lab = document.getElementById("timerLab");
  const at = document.getElementById("timerAt");
  if (digits) digits.textContent = `${m}:${String(s).padStart(2, "0")}`;
  if (lab) lab.textContent = label;
  if (at) at.textContent = left > 0 ? `back at ${endsAt(left)}` : "go";
  if (onTickCb) onTickCb(left);
}

/* ---------- sound ---------- */

function beep() {
  if (state.prefs && state.prefs.sound === false) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    [0, 0.22].forEach(t => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = "square";
      o.frequency.value = 880;
      o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.16);
      o.start(audioCtx.currentTime + t);
      o.stop(audioCtx.currentTime + t + 0.18);
    });
  } catch (e) {}
}

/** Called on the first user gesture so iOS lets us make noise later. */
export function primeAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch (e) {}
}

/* ---------- screen wake lock ---------- */

export async function keepAwake(on) {
  try {
    if (on) {
      if (wakeLock || !navigator.wakeLock) return;
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    } else if (wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch (e) { /* unsupported or denied — not worth surfacing */ }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    render();
    if (state.active) keepAwake(true);
  }
});
