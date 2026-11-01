"use strict";
/* progression v2: real load, set fatigue, jump size, breaks, history window (js/progression.js) */
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./harness.js");

const { T, reset, plain } = loadApp();
const isoDaysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
/* list: [[daysAgo, [[kg, reps, rir?], ...]], ...] oldest → newest */
function history(key, list){
  T.state.sessions = list.map(([ago, sets], n) => {
    const d = isoDaysAgo(ago);
    return { id: d + "|P|" + n, d, day: "P", conv: 2,
      ex: [{ key, name: key, sets: sets.map(([kg, reps, rir]) => rir == null ? { kg, reps } : { kg, reps, rir }) }] };
  });
}
const plan = k => plain(T.progressPlanCore(k));
test.beforeEach(() => reset());

test.describe("real load", () => {
  test("barbell: both sides + the bar; dumbbell/stack: as written", () => {
    assert.equal(T.loadOf("bp", 40), 100);
    assert.equal(T.loadOf("idp", 20), 20);
    assert.equal(T.loadOf("lpz", 50), 100, "plate-loaded: both sides, no bar");
    assert.equal(T.sideOf("bp", 100), 40);
  });
  test("e1RM of a per-side entry is the e1RM of the whole bar", () => {
    assert.ok(Math.abs(T.exE1("bp", 40, 8) - T.e1rm(100, 8)) < 1e-9);
  });
  test("percentages apply to the whole load and land on real plates", () => {
    assert.equal(T.pctKg("bp", 60, 0.9), 52.5);   /* 140 → 126 → 53 → 52.5 */
  });
});

test.describe("straight sets must all be close to the top", () => {
  test("one good set and two that fell far short → same weight", () => {
    history("bp", [[2, [[60, 8], [60, 5], [60, 5]]]]);
    const p = plan("bp");
    assert.equal(p.action, "reps");
    assert.equal(p.kg, 60);
  });
  test("all sets within 2 reps of the top → add weight", () => {
    history("bp", [[2, [[60, 8], [60, 7], [60, 6]]]]);
    assert.equal(plan("bp").action, "up");
  });
  test("top set + lighter back-off sets still progresses", () => {
    history("bp", [[2, [[60, 8], [55, 6], [55, 6]]]]);
    assert.equal(plan("bp").action, "up");
  });
});

test.describe("jump size", () => {
  test("a +25% dumbbell jump is not taken until the reps support it", () => {
    reset({ profile: { dbStep: 2.5 } });
    history("lat", [[2, [[10, 12], [10, 12], [10, 12]]]]);   /* 8-12; 12.5 kq ilə ~3 təkrar */
    const p = plan("lat");
    assert.equal(p.action, "reps");
    assert.equal(p.kg, 10);
    assert.equal(p.reps, 13);
  });
  test("an ordinary +12.5% dumbbell jump is taken", () => {
    history("idp", [[2, [[20, 12], [20, 12], [20, 12]]]]);
    const p = plan("idp");
    assert.equal(p.action, "up");
    assert.equal(p.kg, 22.5);
  });
});

test.describe("breaks and old history", () => {
  test("back after 4 weeks: ~90% of the whole load", () => {
    history("bp", [[40, [[60, 8]]], [30, [[60, 8]]]]);
    const p = plan("bp");
    assert.equal(p.action, "back");
    assert.equal(p.kg, 52.5);
  });
  test("back after 7+ weeks: ~85%", () => {
    history("bp", [[60, [[60, 8]]]]);
    const p = plan("bp");
    assert.equal(p.action, "back");
    assert.ok(p.kg < 52.5);
  });
  test("a best older than 16 weeks does not make today a stall", () => {
    history("bp", [[200, [[80, 8]]], [190, [[80, 8]]], [12, [[60, 6]]], [9, [[60, 6]]], [6, [[60, 6]]], [3, [[60, 6]]]]);
    assert.notEqual(plan("bp").action, "deload");
  });
});

test.describe("RIR below the range", () => {
  test("below rMin but stopped with 2+ in reserve → same weight, push", () => {
    history("bp", [[2, [[60, 4, 2], [60, 4, 3]]]]);
    const p = plan("bp");
    assert.equal(p.action, "push");
    assert.equal(p.kg, 60);
  });
  test("below rMin at failure → step back", () => {
    history("bp", [[2, [[60, 4, 0]]]]);
    assert.equal(plan("bp").action, "down");
  });
});

test.describe("trend and projection", () => {
  test("trend status is relative to the lift's size", () => {
    /* leg press 100/side: +0.5 kq/week of e1 on a ~270 kq e1 is noise */
    history("lpz", [[28, [[100, 10]]], [21, [[100, 10]]], [14, [[100, 10]]], [7, [[100, 10]]], [2, [[100, 10]]]]);
    assert.equal(plain(T.liftTrend("lpz")).status, "flat");
  });
  test("projection targets the next round e1RM, in the same units as the trend", () => {
    history("bp", [[28, [[50, 8]]], [21, [[52.5, 8]]], [14, [[55, 8]]], [7, [[57.5, 8]]], [2, [[60, 8]]]]);
    const pj = plain(T.projection("bp"));
    const t = plain(T.liftTrend("bp"));
    assert.ok(pj && pj.target > t.e1 && pj.target % 10 === 0);
    assert.equal(pj.weeks, Math.ceil((pj.target - t.e1) / t.perWeek));
  });
});
