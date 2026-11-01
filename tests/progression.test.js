"use strict";
/* progression math (js/progression.js) */
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./harness.js");

const { T, reset, plain } = loadApp();
let day = 0;
/* sessions oldest → newest; each entry is an array of [kg, reps] for `key` */
function history(key, list, extra = {}){
  day = 0;
  const sessions = list.map(sets => {
    day++;
    const d = `2026-01-${String(day).padStart(2, "0")}`;
    return { id: d + "|P", d, day: "P", conv: 2, ...extra,
      ex: [{ key, name: key, sets: sets.map(([kg, reps]) => ({ kg, reps })) }] };
  });
  T.state.sessions = sessions;
  return sessions;
}
const plan = key => plain(T.progressPlanCore(key));

test.beforeEach(() => reset());

test("e1rm is Epley", () => {
  assert.equal(T.e1rm(100, 0), 100);
  assert.ok(Math.abs(T.e1rm(100, 10) - 133.333) < 0.01);
  assert.ok(T.e1rm(62.5, 9) > T.e1rm(60, 10), "heavier with one rep less counts as progress");
});

test.describe("normKg / normSets (CONV)", () => {
  test("old totals on a barbell lift are read as per-side: (total - bar) / 2", () => {
    assert.equal(T.CONV, 2);
    assert.equal(T.normKg("bp", 100), 40);
    assert.equal(T.normKg("bp", 100, 1), 40);
    assert.equal(T.normKg("bp", 15), 0, "never negative");
  });
  test("custom bar weight is used", () => {
    reset({ profile: { barKg: 15 } });
    assert.equal(T.normKg("bp", 55), 20);
  });
  test("plate-loaded machine has no bar: total / 2", () => {
    assert.equal(T.EXMAP.tbr.load, "plate");
    assert.equal(T.normKg("tbr", 50), 25);
  });
  test("records stamped conv:2 and non-side loads are untouched", () => {
    assert.equal(T.normKg("bp", 40, 2), 40);
    assert.equal(T.normKg("dbp", 30), 30);
    assert.equal(T.normKg("row", 50), 50);
  });
  test("normSets converts each set and leaves stored data alone", () => {
    const sets = [{ kg: 100, reps: 8 }, { kg: 80, reps: 10 }];
    assert.deepEqual(plain(T.normSets("bp", sets)), [{ kg: 40, reps: 8 }, { kg: 30, reps: 10 }]);
    assert.equal(sets[0].kg, 100);
    assert.deepEqual(plain(T.normSets("bp", sets, 2)), sets);
  });
  test("off-stack weights snap to the nearest real stack weight, raw kept", () => {
    reset({ profile: { exStep: { row: 6.5 } } });
    const out = plain(T.normSets("row", [{ kg: 55, reps: 8 }, { kg: 52, reps: 8 }, { kg: 0, reps: 8 }], 2));
    assert.deepEqual(out, [{ kg: 52, reps: 8, raw: 55 }, { kg: 52, reps: 8 }, { kg: 0, reps: 8 }]);
  });
});

test.describe("lastPerf", () => {
  test("skips sessions whose only sets are 0 kg on a loaded lift", () => {
    history("bp", [[[60, 8]], [[0, 8], [0, 8]]]);
    assert.deepEqual(plain(T.lastPerf("bp")), { d: "2026-01-01", sets: [{ kg: 60, reps: 8 }] });
  });
  test("drops 0 kg and 0 rep sets inside a session", () => {
    history("bp", [[[0, 8], [62.5, 6], [60, 0]]]);
    assert.deepEqual(plain(T.lastPerf("bp")).sets, [{ kg: 62.5, reps: 6 }]);
  });
  test("bodyweight lifts keep 0 kg sets", () => {
    history("pu", [[[0, 10], [0, 9]]]);
    assert.equal(T.lastPerf("pu").sets.length, 2);
  });
  test("foundation sessions are skipped unless asked for", () => {
    history("bp", [[[40, 8]]], { foundation: true });
    assert.equal(T.lastPerf("bp"), null);
    assert.equal(T.lastPerf("bp", { includeFoundation: true }).sets[0].kg, 40);
    assert.equal(T.onlyFoundation("bp"), true);
  });
  test("pre-CONV session totals are converted on read", () => {
    const [s] = history("bp", [[[100, 8]]]);
    delete s.conv;
    assert.equal(T.lastPerf("bp").sets[0].kg, 40);
  });
});

test.describe("progressPlanCore (bp: bar, 5-8 reps, +2.5)", () => {
  test("recipe assumptions", () => {
    const e = T.EXMAP.bp;
    assert.deepEqual([e.rMin, e.rMax, e.inc], [5, 8, 2.5]);
  });
  test("no history → first", () => {
    assert.equal(plan("bp").action, "first");
    assert.equal(plan("bp").kg, null);
  });
  test("all sets at the top of the range → add weight, back to rMin", () => {
    history("bp", [[[60, 8], [60, 8], [60, 8]]]);
    assert.deepEqual([plan("bp").action, plan("bp").kg, plan("bp").reps], ["up", 62.5, 5]);
  });
  test("strongest set past the top even if later sets were lighter → add weight", () => {
    history("bp", [[[60, 8], [55, 6], [55, 6]]]);
    const p = plan("bp");
    assert.equal(p.action, "up");
    assert.equal(p.kg, 62.5);
  });
  test("new best below the top → same weight, one more rep", () => {
    history("bp", [[[60, 6], [60, 6]]]);
    assert.deepEqual([plan("bp").action, plan("bp").kg, plan("bp").reps], ["reps", 60, 7]);
  });
  test("behind the previous best → hold at last weight, +1 rep target", () => {
    history("bp", [[[60, 7]], [[57.5, 6]]]);
    const p = plan("bp");
    assert.deepEqual([p.action, p.kg, p.reps], ["hold", 57.5, 7]);
  });
  test("below the minimum reps → step back by at most one increment", () => {
    history("bp", [[[50, 8]], [[60, 4]]]);
    const p = plan("bp");
    assert.equal(p.action, "down");
    assert.equal(p.kg, 57.5);
    assert.equal(p.reps, 5);
  });
  test("no progress over the last 3 of ≥5 sessions → deload ~10%", () => {
    history("bp", [[[60, 7]], [[60, 7]], [[60, 6]], [[60, 5]], [[60, 6]]]);
    const p = plan("bp");
    assert.equal(p.action, "deload");
    assert.equal(p.kg, 54);
    assert.equal(p.reps, 8);
  });
  test("fewer than 5 sessions never deloads", () => {
    history("bp", [[[60, 7]], [[60, 6]], [[60, 5]], [[60, 6]]]);
    assert.notEqual(plan("bp").action, "deload");
  });
  test("habit: three sessions ending at the same rep count lower the target", () => {
    reset();
    history("idp", [[[20, 10], [20, 10]], [[20, 10], [20, 10]], [[20, 10], [20, 10]]]);
    assert.equal(T.habitReps("idp", T.EXMAP.idp), 10);
    const p = plan("idp");
    assert.equal(p.action, "up");
    assert.equal(p.kg, 20 + T.EXMAP.idp.inc);
  });
  test("bodyweight lift: reps first, then add load", () => {
    history("pu", [[[0, 9], [0, 8]]]);
    assert.deepEqual([plan("pu").action, plan("pu").reps], ["reps", 10]);
    history("pu", [[[0, 12], [0, 12], [0, 12]]]);
    assert.equal(plan("pu").action, "up");
  });
  test("stack step: suggestion lands on a real stack weight", () => {
    reset({ profile: { exStep: { row: 6.5 } } });
    T.buildProgram();
    history("row", [[[52, 12], [52, 12], [52, 12]]]);
    const p = plan("row");
    assert.equal(p.action, "up");
    assert.equal(p.kg, 58.5);
  });
  test("archived (removed) lift in history does not throw", () => {
    history("dl", [[[100, 5]]]);
    assert.ok(plan("dl").action);
  });
});
