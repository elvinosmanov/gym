"use strict";
/* mergeState (js/sync.js): field-level merge of local and cloud state. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./harness.js");

const { T, plain } = loadApp();
const merge = (l, r) => plain(T.mergeState(l, r));
const ses = (id, d, nSets, extra = {}) => ({
  id, d, day: "P",
  ex: [{ key: "bp", name: "Bench", sets: Array.from({ length: nSets }, () => ({ kg: 60, reps: 8 })) }],
  ...extra
});
const ids = s => s.sessions.map(x => x.id);

test("no remote returns local unchanged", () => {
  const l = { sessions: [ses("a", "2026-01-01", 1)] };
  assert.equal(T.mergeState(l, null), l);
});

test.describe("sessions", () => {
  test("union of both sides, sorted by date", () => {
    const out = merge({ sessions: [ses("b", "2026-01-03", 1)] }, { sessions: [ses("a", "2026-01-01", 1)] });
    assert.deepEqual(ids(out), ["a", "b"]);
  });
  test("local tombstone filters remote copy", () => {
    const out = merge({ sessions: [], gone: ["a"] }, { sessions: [ses("a", "2026-01-01", 3), ses("b", "2026-01-02", 1)] });
    assert.deepEqual(ids(out), ["b"]);
    assert.deepEqual(out.gone, ["a"]);
  });
  test("remote tombstone filters local copy; tombstones are unioned", () => {
    const out = merge({ sessions: [ses("a", "2026-01-01", 3)], gone: ["x"] }, { sessions: [], gone: ["a"] });
    assert.deepEqual(ids(out), []);
    assert.deepEqual(out.gone.sort(), ["a", "x"]);
  });
  test("tombstone of a legacy id-less session (date|day key)", () => {
    const legacy = { d: "2026-01-01", day: "P", ex: [] };
    const out = merge({ sessions: [legacy] }, { sessions: [], gone: ["2026-01-01|P"] });
    assert.equal(out.sessions.length, 0);
  });
  test("same id, both timestamped: newer wins even with fewer sets", () => {
    const l = ses("a", "2026-01-01", 4, { ts: 100 });
    const r = ses("a", "2026-01-01", 1, { ts: 200 });
    assert.equal(merge({ sessions: [l] }, { sessions: [r] }).sessions[0].ex[0].sets.length, 1);
    assert.equal(merge({ sessions: [r] }, { sessions: [l] }).sessions[0].ex[0].sets.length, 1);
  });
  test("same id, no timestamps: more logged sets wins", () => {
    const few = ses("a", "2026-01-01", 2), many = ses("a", "2026-01-01", 5);
    assert.equal(merge({ sessions: [few] }, { sessions: [many] }).sessions[0].ex[0].sets.length, 5);
    assert.equal(merge({ sessions: [many] }, { sessions: [few] }).sessions[0].ex[0].sets.length, 5);
  });
  test("same id, only one side timestamped: falls back to set count", () => {
    const l = ses("a", "2026-01-01", 2, { ts: 999 }), r = ses("a", "2026-01-01", 3);
    assert.equal(merge({ sessions: [l] }, { sessions: [r] }).sessions[0].ex[0].sets.length, 3);
  });
  test("winning remote record without a note keeps the local note", () => {
    const l = ses("a", "2026-01-01", 1, { ts: 100, note: "dirsək ağrıyırdı" });
    const r = ses("a", "2026-01-01", 1, { ts: 200 });
    assert.equal(merge({ sessions: [l] }, { sessions: [r] }).sessions[0].note, "dirsək ağrıyırdı");
  });
  test("winning remote note replaces the local note", () => {
    const l = ses("a", "2026-01-01", 1, { ts: 100, note: "köhnə" });
    const r = ses("a", "2026-01-01", 1, { ts: 200, note: "yeni" });
    assert.equal(merge({ sessions: [l] }, { sessions: [r] }).sessions[0].note, "yeni");
  });
  test("losing remote record does not touch the local note", () => {
    const l = ses("a", "2026-01-01", 1, { ts: 300, note: "mənim" });
    const r = ses("a", "2026-01-01", 1, { ts: 200, note: "onun" });
    assert.equal(merge({ sessions: [l] }, { sessions: [r] }).sessions[0].note, "mənim");
  });
});

test.describe("weights", () => {
  test("keyed by date, later ts wins, sorted", () => {
    const out = merge(
      { weights: [{ d: "2026-01-02", kg: 80, ts: 100 }, { d: "2026-01-05", kg: 81, ts: 500 }] },
      { weights: [{ d: "2026-01-02", kg: 79, ts: 200 }, { d: "2026-01-05", kg: 70, ts: 400 }, { d: "2026-01-01", kg: 78, ts: 1 }] });
    assert.deepEqual(out.weights.map(w => [w.d, w.kg]), [["2026-01-01", 78], ["2026-01-02", 79], ["2026-01-05", 81]]);
  });
  test("untimestamped tie keeps local", () => {
    const out = merge({ weights: [{ d: "2026-01-02", kg: 80 }] }, { weights: [{ d: "2026-01-02", kg: 79 }] });
    assert.equal(out.weights[0].kg, 80);
  });
  test("goneW tombstones filter both sides and are unioned", () => {
    const out = merge(
      { weights: [{ d: "2026-01-02", kg: 80, ts: 1 }], goneW: ["2026-01-03"] },
      { weights: [{ d: "2026-01-03", kg: 79, ts: 1 }, { d: "2026-01-04", kg: 79, ts: 1 }], goneW: ["2026-01-02"] });
    assert.deepEqual(out.weights.map(w => w.d), ["2026-01-04"]);
    assert.deepEqual(out.goneW.sort(), ["2026-01-02", "2026-01-03"]);
  });
  test("a weight re-logged after its date was deleted survives a merge with the cloud tombstone", () => {
    const out = merge(
      { weights: [{ d: "2026-01-02", kg: 81, ts: 2000 }], goneWTs: {} },
      { weights: [], goneWTs: { "2026-01-02": 1500 }, ts: 1000 });
    assert.deepEqual(out.weights.map(w => w.kg), [81]);
    assert.equal(out.goneWTs["2026-01-02"], 1500);
  });
  test("a stale copy written before the timed delete is dropped", () => {
    const out = merge(
      { weights: [], goneWTs: { "2026-01-02": 1500 } },
      { weights: [{ d: "2026-01-02", kg: 79, ts: 1200 }] });
    assert.deepEqual(out.weights, []);
  });
});

test.describe("supps", () => {
  test("timestamped: newer wins, so un-ticking syncs", () => {
    const out = merge(
      { supps: [{ d: "2026-01-02", creatine: true, protein: true, ts: 100 }] },
      { supps: [{ d: "2026-01-02", creatine: false, protein: true, ts: 200 }] });
    assert.equal(out.supps[0].creatine, false);
  });
  test("timestamped local newer than remote stays", () => {
    const out = merge(
      { supps: [{ d: "2026-01-02", creatine: false, ts: 300 }] },
      { supps: [{ d: "2026-01-02", creatine: true, ts: 200 }] });
    assert.equal(out.supps[0].creatine, false);
  });
  test("legacy untimestamped records are OR-ed", () => {
    const out = merge(
      { supps: [{ d: "2026-01-02", creatine: true, protein: false }] },
      { supps: [{ d: "2026-01-02", creatine: false, protein: true }, { d: "2026-01-01", creatine: true }] });
    assert.deepEqual(out.supps.map(s => [s.d, !!s.creatine, !!s.protein]), [["2026-01-01", true, false], ["2026-01-02", true, true]]);
  });
  test("merge does not mutate the local supp objects", () => {
    const l = { supps: [{ d: "2026-01-02", creatine: false, protein: false }] };
    T.mergeState(l, { supps: [{ d: "2026-01-02", creatine: true }] });
    assert.equal(l.supps[0].creatine, false);
  });
});

test.describe("plan", () => {
  const pl = n => ({ P: [{ k: "bp", sets: n, rMin: 5, rMax: 8, rest: 120 }] });
  test("newer planTs wins regardless of overall ts", () => {
    const out = merge({ plan: pl(3), planTs: 100, ts: 9999 }, { plan: pl(5), planTs: 200, ts: 1 });
    assert.equal(out.plan.P[0].sets, 5);
    assert.equal(out.planTs, 200);
  });
  test("local newer planTs keeps local plan, even if remote state is newer", () => {
    const out = merge({ plan: pl(3), planTs: 300, ts: 1 }, { plan: pl(5), planTs: 200, ts: 9999 });
    assert.equal(out.plan.P[0].sets, 3);
  });
  test("remote newer planTs with plan:null resets to default plan", () => {
    const out = merge({ plan: pl(3), planTs: 100 }, { plan: null, planTs: 200 });
    assert.equal(out.plan, null);
  });
  test("a copy with no plan and no planTs does not wipe a timestamped plan", () => {
    const out = merge({ plan: pl(3), planTs: 100 }, { plan: null, ts: 99999 });
    assert.equal(out.plan.P[0].sets, 3);
  });
  test("both untimestamped: local plan, else remote", () => {
    assert.equal(merge({ plan: pl(3) }, { plan: pl(5) }).plan.P[0].sets, 3);
    assert.equal(merge({ plan: null }, { plan: pl(5) }).plan.P[0].sets, 5);
  });
});

test.describe("userEx / vid keyed merge", () => {
  const ux = name => ({ name, pri: ["chest"], sec: [] });
  test("a key deleted locally (newer stamp) does not resurrect from remote", () => {
    const out = merge({ userEx: {}, userExTs: { u_a: 200 } }, { userEx: { u_a: ux("A") }, userExTs: { u_a: 100 } });
    assert.ok(!("u_a" in out.userEx));
    assert.equal(out.userExTs.u_a, 200);
  });
  test("a key deleted remotely (newer stamp) is removed locally", () => {
    const out = merge({ userEx: { u_a: ux("A") }, userExTs: { u_a: 100 } }, { userEx: {}, userExTs: { u_a: 200 } });
    assert.ok(!("u_a" in out.userEx));
  });
  test("newer remote edit wins per key; other keys untouched", () => {
    const out = merge(
      { userEx: { u_a: ux("A-local"), u_b: ux("B-local") }, userExTs: { u_a: 100, u_b: 500 } },
      { userEx: { u_a: ux("A-remote"), u_b: ux("B-remote") }, userExTs: { u_a: 200, u_b: 400 } });
    assert.equal(out.userEx.u_a.name, "A-remote");
    assert.equal(out.userEx.u_b.name, "B-local");
  });
  test("untimestamped keys union; on clash the side with newer state ts wins", () => {
    const l = { userEx: { u_a: ux("L"), u_l: ux("only-l") }, ts: 100 };
    const r = { userEx: { u_a: ux("R"), u_r: ux("only-r") }, ts: 200 };
    const out = merge(l, r);
    assert.deepEqual(Object.keys(out.userEx).sort(), ["u_a", "u_l", "u_r"]);
    assert.equal(out.userEx.u_a.name, "R");
    assert.equal(merge({ ...l, ts: 300 }, r).userEx.u_a.name, "L");
  });
  test("vid follows the same rules via vidTs", () => {
    const out = merge(
      { vid: { bp: "https://a/1" }, vidTs: { bp: 100, sq: 300 } },
      { vid: { bp: "https://b/2", sq: "https://b/sq" }, vidTs: { bp: 200, sq: 100 } });
    assert.equal(out.vid.bp, "https://b/2");
    assert.ok(!("sq" in out.vid), "locally deleted video stays deleted");
  });
});

test.describe("active session protection", () => {
  const now = Date.UTC(2026, 0, 10, 12);
  const act = (startedAt, day = "P") => ({ day, startedAt, ex: { bp: [] } });
  test("local active is always kept", () => {
    const out = merge({ active: act(now) }, { active: act(now + 5000, "L"), activeEnded: now + 100000 });
    assert.equal(out.active.startedAt, now);
  });
  test("remote active taken when it started after the last end", () => {
    const out = merge({ active: null, activeEnded: now - 1000 }, { active: act(now) });
    assert.equal(out.active.startedAt, now);
  });
  test("remote active dropped when local ended a session after it started (cancel syncs)", () => {
    const out = merge({ active: null, activeEnded: now + 1000 }, { active: act(now) });
    assert.equal(out.active, null);
    assert.equal(out.activeEnded, now + 1000);
  });
  test("remote active dropped when it is already recorded in history", () => {
    const a = act(now);
    const id = T.isoOf(new Date(now)) + "|P|" + now;   /* same id buildRecord() writes */
    const out = merge({ active: null, sessions: [{ id, d: T.isoOf(new Date(now)), day: "P", ex: [] }] }, { active: a });
    assert.equal(out.active, null);
  });
  test("remote active without startedAt is not resurrected", () => {
    const out = merge({ active: null }, { active: { day: "P", started: "2026-01-10", ex: {} } });
    assert.equal(out.active, null);
  });
  test("overall ts is the max of both sides", () => {
    assert.equal(merge({ ts: 5 }, { ts: 9 }).ts, 9);
  });
});
