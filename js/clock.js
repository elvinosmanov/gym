/* ============================================================
   Gym clock.

   The clock on the gym wall is usually a few minutes off, and that is
   the one you actually look at between sets. Store the offset once and
   every time the app shows you is in gym time.
   ============================================================ */

import { state, save } from "./state.js";

export function offsetMin() {
  return Number(state.gym && state.gym.clockOffsetMin) || 0;
}

export function gymNow() {
  return new Date(Date.now() + offsetMin() * 60000);
}

/** Gym-clock time for a real timestamp. */
export function gymTime(ms) {
  return new Date((ms === undefined ? Date.now() : ms) + offsetMin() * 60000);
}

export function fmtTime(dt) {
  const d = dt instanceof Date ? dt : new Date(dt);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** "18:42" on the gym clock, for anything the user reads mid-workout. */
export function gymClockStr(ms) {
  return fmtTime(gymTime(ms));
}

export function realClockStr(ms) {
  return fmtTime(new Date(ms === undefined ? Date.now() : ms));
}

/** True when the gym clock differs enough to be worth showing both. */
export function isSkewed() {
  return Math.abs(offsetMin()) >= 1;
}

/**
 * Set the offset from what the wall clock currently reads.
 * @param {string} hhmm e.g. "18:47"
 */
export function syncFromWallClock(hhmm) {
  const m = /^(\d{1,2})[:.\s]?(\d{2})$/.exec(String(hhmm).trim());
  if (!m) throw new Error("Enter the gym clock time as HH:MM, e.g. 18:47");
  const h = Number(m[1]), mi = Number(m[2]);
  if (h > 23 || mi > 59) throw new Error("That isn't a valid time.");

  const now = new Date();
  const target = new Date(now);
  target.setHours(h, mi, 0, 0);
  let diff = Math.round((target - now) / 60000);
  // Wrap around midnight: pick the interpretation within +/- 12 h.
  if (diff > 720) diff -= 1440;
  if (diff < -720) diff += 1440;

  state.gym.clockOffsetMin = diff;
  save();
  return diff;
}

export function clearSync() {
  state.gym.clockOffsetMin = 0;
  save();
}

export function offsetText() {
  const o = offsetMin();
  if (!o) return "in sync with your phone";
  const abs = Math.abs(o);
  const unit = abs === 1 ? "minute" : "minutes";
  return `${abs} ${unit} ${o > 0 ? "ahead of" : "behind"} your phone`;
}

/** "resume at 18:45" — the end of a rest period, on the wall clock. */
export function endsAt(secondsFromNow) {
  return gymClockStr(Date.now() + secondsFromNow * 1000);
}

export function minutesSince(ms) {
  return Math.max(0, Math.round((Date.now() - ms) / 60000));
}

export function durationText(ms) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
