"use strict";
/* personal records + session summary (js/records.js) */
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./harness.js");

const { T, reset, plain } = loadApp();
/* sessions oldest → newest; each entry: { key: [[kg, reps], ...] } or extra fields */
function history(list){
  T.state.sessions = list.map((ex, n) => {
    const d = `2026-02-${String(n + 1).padStart(2, "0")}`;
    const { _foundation, _day, ...lifts } = ex;
    return { id: d + "|" + (_day || "P"), d, day: _day || "P", conv: 2, foundation: !!_foundation,
      ex: Object.entries(lifts).map(([key, sets]) => ({ key, name: key, sets: sets.map(([kg, reps]) => ({ kg, reps })) })) };
  });
  return T.state.sessions;
}
const report = i => plain(T.sessionReport(T.state.sessions[i], i));

test.beforeEach(() => reset());

test.describe("sessionReport", () => {
  test("first time is never a record — it is listed as a first", () => {
    history([{ bp: [[40, 8]] }]);
    const r = report(0);
    assert.equal(r.prs.length, 0);
    assert.deepEqual(r.firsts.map(f => f.key), ["bp"]);
  });
  test("heavier weight is a kg record and wins over e1RM", () => {
    history([{ bp: [[40, 10]] }, { bp: [[42.5, 8]] }]);
    const [p] = report(1).prs;
    assert.equal(p.kind, "kg");
    assert.equal(p.val, 42.5);
    assert.equal(p.prev, 40);
  });
  test("same weight, more reps is an e1RM record", () => {
    history([{ bp: [[40, 8]] }, { bp: [[40, 10]] }]);
    const [p] = report(1).prs;
    assert.equal(p.kind, "e1");
    assert.equal(p.kg, 40);
    assert.equal(p.reps, 10);
  });
  test("a lighter, equal or worse session is not a record", () => {
    history([{ bp: [[40, 10]] }, { bp: [[40, 10]] }, { bp: [[37.5, 9]] }]);
    assert.equal(report(1).prs.length, 0);
    assert.equal(report(2).prs.length, 0);
  });
  test("only the best of earlier sessions counts, not just the last one", () => {
    history([{ bp: [[45, 8]] }, { bp: [[40, 8]] }, { bp: [[42.5, 8]] }]);
    assert.equal(report(2).prs.length, 0);
  });
  test("foundation session is not a baseline and is never itself reported", () => {
    history([{ _foundation: true, bp: [[20, 12]] }, { bp: [[40, 8]] }]);
    assert.equal(report(1).prs.length, 0, "first real session after foundation is a first, not a PR");
    assert.deepEqual(report(1).firsts.map(f => f.key), ["bp"]);
    assert.equal(report(0).prs.length + report(0).firsts.length, 0);
  });
  test("zero-kg sets on a loaded lift are ignored", () => {
    history([{ bp: [[40, 8]] }, { bp: [[0, 15]] }]);
    const r = report(1);
    assert.equal(r.prs.length, 0);
    assert.equal(r.firsts.length, 0);
  });
  test("tonnage is compared with the previous session of the same day", () => {
    history([{ bp: [[40, 10]] }, { _day: "L", bp: [[10, 1]] }, { bp: [[40, 11]] }]);
    const r = report(2);
    assert.ok(r.prevTon > 0);
    assert.equal(r.prevD, "2026-02-01");
    assert.equal(r.tonPct, 10);
  });
});

test.describe("recentPRs", () => {
  test("lists each record once, newest first, without first logs", () => {
    history([{ bp: [[40, 8]] }, { bp: [[40, 10]] }, { bp: [[42.5, 8], [42.5, 8]] }, { bp: [[40, 8]] }]);
    const prs = plain(T.recentPRs(10));
    assert.deepEqual(prs.map(p => [p.d, p.kind]), [["2026-02-03", "kg"], ["2026-02-02", "e1"]]);
  });
});

test.describe("livePR", () => {
  function active(sets){
    T.state.active = { day: "P", startedAt: Date.now(), ex: { bp: sets.map(([kg, reps, done]) => ({ kg: String(kg), reps: String(reps), done: !!done })) } };
  }
  test("detects a record set against history", () => {
    history([{ bp: [[40, 8]] }]);
    active([[42.5, 6, true]]);
    const p = plain(T.livePR("bp", 0));
    assert.equal(p.kind, "kg");
  });
  test("a weaker set after a record in the same session is not another record", () => {
    history([{ bp: [[40, 8]] }]);
    active([[42.5, 6, true], [42.5, 5, true]]);
    assert.equal(T.livePR("bp", 1), null);
  });
  test("no history → no record", () => {
    history([]);
    active([[42.5, 6, true]]);
    assert.equal(T.livePR("bp", 0), null);
  });
  test("comma decimal is read", () => {
    history([{ bp: [[40, 8]] }]);
    active([["40,5", 8, true]]);
    assert.equal(plain(T.livePR("bp", 0)).kind, "kg");
  });
});
