"use strict";
/* reps in reserve (progression), adaptive volume (plan doctor), share image */
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./harness.js");

const { T, reset, plain } = loadApp();
const isoDaysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
/* list: sessions oldest → newest; each = { key: [[kg, reps, rir?], ...] } */
function history(list){
  T.state.sessions = list.map((ex, n) => {
    const d = isoDaysAgo(2 + (list.length - 1 - n) * 3);
    return { id: d + "|P|" + n, d, day: "P", conv: 2,
      ex: Object.entries(ex).map(([key, sets]) => ({ key, name: key,
        sets: sets.map(([kg, reps, rir]) => rir == null ? { kg, reps } : { kg, reps, rir }) })) };
  });
}
const plan = k => plain(T.progressPlanCore(k));
test.beforeEach(() => reset());

test.describe("RIR in progression", () => {
  /* bp: 3 × 5-8, inc 2.5 */
  test("easy session (hardest set 3+ RIR) adds weight before the rep ceiling", () => {
    history([{ bp: [[40, 6, 3], [40, 6, 4], [40, 6, 3]] }]);
    const p = plan("bp");
    assert.equal(p.action, "up");
    assert.equal(p.kg, 42.5);
    assert.equal(p.reps, 6);
  });
  test("without RIR the same session only asks for one more rep", () => {
    history([{ bp: [[40, 6], [40, 6], [40, 6]] }]);
    assert.notEqual(plan("bp").action, "up");
  });
  test("one hard set (RIR 1) is not 'easy'", () => {
    history([{ bp: [[40, 6, 4], [40, 6, 1]] }]);
    assert.notEqual(plan("bp").action, "up");
  });
  test("a stall trained far from failure asks for effort, not a deload", () => {
    history([{ bp: [[50, 7, 1]] }, { bp: [[50, 7, 1]] }, { bp: [[50, 6, 2], [50, 6, 2]] }, { bp: [[50, 5, 2], [50, 5, 2]] }, { bp: [[50, 6, 2], [50, 6, 2]] }]);
    const p = plan("bp");
    assert.equal(p.action, "push");
    assert.equal(p.kg, 50);
  });
  test("a stall trained to failure still deloads", () => {
    history([{ bp: [[50, 7, 0]] }, { bp: [[50, 7, 0]] }, { bp: [[50, 6, 0]] }, { bp: [[50, 5, 0]] }, { bp: [[50, 6, 0]] }]);
    assert.equal(plan("bp").action, "deload");
  });
  test("habit reps are not a ceiling when stopped with 2+ RIR", () => {
    const ex = plain(T.EXMAP.idp);   /* 8-12 */
    history([{ idp: [[20, 10]] }, { idp: [[20, 10]] }, { idp: [[20, 10]] }]);
    assert.equal(T.habitReps("idp", ex), 10);
    history([{ idp: [[20, 10, 2]] }, { idp: [[20, 10, 3]] }, { idp: [[20, 10, 2]] }]);
    assert.equal(T.habitReps("idp", ex), null);
  });
});

test.describe("sanitize keeps valid RIR only", () => {
  test("rir is clamped to 0-4 integers, junk dropped", () => {
    const s = T.sanitize({ sessions: [{ d: "2026-01-01", day: "P", ex: [{ key: "bp", name: "x",
      sets: [{ kg: 40, reps: 8, rir: 2 }, { kg: 40, reps: 8, rir: 7 }, { kg: 40, reps: 8, rir: "abc" }, { kg: 40, reps: 8, rir: -1 }] }] }] });
    const sets = plain(s.sessions[0].ex[0].sets);
    assert.deepEqual(sets.map(x => x.rir), [2, 4, undefined, undefined]);
  });
});

test.describe("recSet (active → record)", () => {
  test("keeps rir only when chosen", () => {
    assert.deepEqual(plain(T.recSet({ kg: "40", reps: "8", rir: 2 })), { kg: 40, reps: 8, rir: 2 });
    assert.deepEqual(plain(T.recSet({ kg: "40", reps: "8" })), { kg: 40, reps: 8 });
    assert.deepEqual(plain(T.recSet({ kg: "40", reps: "8", rir: "" })), { kg: 40, reps: 8 });
  });
});

test.describe("adaptive volume", () => {
  const rising = k => [0,1,2,3,4].map(i => ({ [k]: [[40 + i*2.5, 6, 1]] }));
  const flat = k => [0,1,2,3,4].map(() => ({ [k]: [[40, 6, 0]] }));
  const falling = k => [0,1,2,3,4].map(i => ({ [k]: [[50 - i*2.5, 6, 0]] }));
  test("no history → nodata, target stays within the generic range", () => {
    const t = plain(T.volumeTarget("chest", 25));
    assert.equal(t.status, "nodata");
    assert.equal(t.target, 22);
  });
  test("progressing muscle keeps its volume even above the range", () => {
    history(rising("bp"));
    const t = plain(T.volumeTarget("chest", 25));
    assert.equal(t.status, "up");
    assert.equal(t.delta, 0);
  });
  test("stalled muscle gets +2 sets", () => {
    history(flat("bp"));
    const t = plain(T.volumeTarget("chest", 14));
    assert.equal(t.status, "flat");
    assert.equal(t.target, 16);
  });
  test("regressing muscle gets −2 sets, never below the range floor", () => {
    history(falling("bp"));
    assert.equal(plain(T.volumeTarget("chest", 14)).target, 12);
    assert.equal(plain(T.volumeTarget("chest", 11)).target, 10);
  });
  test("stall with leftover reps is an effort problem — volume untouched", () => {
    history([0,1,2,3,4].map(() => ({ bp: [[40, 6, 3], [40, 6, 3]] })));
    const t = plain(T.volumeTarget("chest", 14));
    assert.equal(t.status, "effort");
    assert.equal(t.delta, 0);
  });
  test("plan doctor offers +1 set on the stalled muscle's day", () => {
    history(flat("bp"));
    const adv = plain(T.planAdvice("P"));
    const a = adv.find(x => x.ic === "⤴");
    assert.ok(a, JSON.stringify(adv.map(x => x.t)));
    assert.equal(a.a[0].act, "advSets");
    assert.equal(a.a[0].args[2], 1);
  });
});

test.describe("share image", () => {
  test("summaryCanvas draws without throwing for a normal session", () => {
    history([{ bp: [[40, 8]] }, { bp: [[42.5, 8]], lat: [[10, 12]] }]);
    const rec = T.state.sessions[1];
    assert.doesNotThrow(() => T.summaryCanvas(rec, T.sessionReport(rec, 1)));
  });
  test("dataURLBlob decodes base64", () => {
    const b = T.dataURLBlob("data:image/png;base64," + Buffer.from("hi").toString("base64"));
    assert.ok(b);
  });
});
