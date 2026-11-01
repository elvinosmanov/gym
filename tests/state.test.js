"use strict";
/* sanitize / migrate / normalizeRemote (js/state.js, js/sync.js) */
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./harness.js");

const app = loadApp();
const { T, plain } = app;
/* the shape applyLoaded()/normalizeRemote() hand to migrate() */
const withDefaults = d => ({ ...plain(T.DEFAULTS), ...d, profile: { ...plain(T.DEFAULTS).profile, ...(d.profile || {}) } });
const san = d => plain(T.sanitize(withDefaults(d)));
const mig = (d, pv = T.PROGRAM_VERSION) => plain(T.migrate(withDefaults(d), pv));

test("app scripts load without top-level errors", () => {
  assert.ok(app.files.length >= 10, "index.html lists the app scripts");
  const sync = app.errors.filter(e => !e.async);
  assert.deepEqual(sync.map(e => `${e.file}: ${e.message}`), []);
});

test.describe("sanitize", () => {
  test("userEx: unsafe keys dropped, numbers coerced, arrays and name normalised", () => {
    const s = san({ userEx: {
      ok_1: { name: 42, sets: "4", rMin: "x", rest: "90", pri: "chest", sec: ["delts", 3] },
      "bad key": { name: "x" }, "<img>": { name: "x" }, "a\"b": { name: "x" }, ["k".repeat(41)]: { name: "x" }
    } });
    assert.deepEqual(Object.keys(s.userEx), ["ok_1"]);
    const e = s.userEx.ok_1;
    assert.equal(e.name, "42");
    assert.equal(e.sets, 4);
    assert.equal(e.rMin, 0);
    assert.equal(e.rest, 90);
    assert.ok(!("rMax" in e), "absent numeric fields are not invented");
    assert.deepEqual(e.pri, []);
    assert.deepEqual(e.sec, ["delts", "3"]);
    assert.deepEqual(e.cues, []);
  });
  test("vid / userExTs / vidTs / profile.exStep keyed", () => {
    const s = san({ vid: { bp: "https://x", "x y": "https://z" }, userExTs: { "a-b": 1, ab: 2 }, vidTs: [1, 2],
      profile: { exStep: { row: 6.5, "no!": 3 } } });
    assert.deepEqual(s.vid, { bp: "https://x" });
    assert.deepEqual(s.userExTs, { ab: 2 });
    assert.deepEqual(s.vidTs, {});
    assert.deepEqual(s.profile.exStep, { row: 6.5 });
  });
  test("non-object fields become empty objects/arrays", () => {
    const s = san({ userEx: "oops", vid: [1], weights: "x", supps: { a: 1 }, sessions: null, gone: "a", goneW: 5 });
    assert.deepEqual(s.userEx, {});
    assert.deepEqual(s.vid, {});
    assert.deepEqual(s.weights, []);
    assert.deepEqual(s.supps, []);
    assert.deepEqual(s.sessions, []);
    assert.deepEqual(s.gone, []);
    assert.deepEqual(s.goneW, []);
  });
  test("weights: invalid dates dropped, kg/ts coerced", () => {
    const s = san({ weights: [{ d: "2026-01-02", kg: "80.5" }, { d: "2026-1-2", kg: 80 }, { d: "yesterday", kg: 1 }, null, { d: "2026-01-03", kg: "x", ts: "7" }] });
    assert.deepEqual(s.weights, [{ d: "2026-01-02", kg: 80.5, ts: 0 }, { d: "2026-01-03", kg: 0, ts: 7 }]);
  });
  test("supps: invalid dates dropped", () => {
    assert.deepEqual(san({ supps: [{ d: "2026-01-02", creatine: true }, { d: "02/01/2026" }, 7] }).supps, [{ d: "2026-01-02", creatine: true }]);
  });
  test("sessions: bad date/day dropped, bad ex keys dropped, sets coerced, id stringified", () => {
    const s = san({ sessions: [
      { id: 17, d: "2026-01-02", day: "P", ex: [
        { key: "bp", name: "Bench", sets: [{ kg: "60", reps: "8" }, { kg: null, reps: "abc" }, null] },
        { key: "onclick=alert(1)", name: "x", sets: [] },
        { key: "sq", sets: "nope" }
      ] },
      { d: "2026-01-02", day: "P Q", ex: [] },
      { d: "not-a-date", day: "P", ex: [] },
      { d: "2026-01-03", day: "L" }
    ] });
    assert.equal(s.sessions.length, 2);
    const [a, b] = s.sessions;
    assert.equal(a.id, "17");
    assert.deepEqual(a.ex.map(e => e.key), ["bp", "sq"]);
    assert.deepEqual(a.ex[0].sets, [{ kg: 60, reps: 8 }, { kg: 0, reps: 0 }, { kg: 0, reps: 0 }]);
    assert.equal(a.ex[1].name, "");
    assert.deepEqual(a.ex[1].sets, []);
    assert.deepEqual(b.ex, []);
  });
  test("plan: unknown day slots removed, slots with unsafe keys filtered", () => {
    const s = san({ plan: { P: [{ k: "bp" }, { k: "x'); alert(1);//" }, null], Z: [{ k: "bp" }], __proto__x: [] } });
    assert.deepEqual(Object.keys(s.plan), ["P"]);
    assert.deepEqual(s.plan.P, [{ k: "bp" }]);
  });
  test("active: dropped when malformed or with an unsafe day; ex keys filtered", () => {
    assert.equal(san({ active: "x" }).active, null);
    assert.equal(san({ active: { day: "P" } }).active, null);
    assert.equal(san({ active: { day: "<b>", ex: {} } }).active, null);
    const a = san({ active: { day: "P", ex: { bp: [], "a b": [] } } }).active;
    assert.deepEqual(Object.keys(a.ex), ["bp"]);
  });
  test("tombstones are stringified", () => {
    assert.deepEqual(san({ gone: [1, "a"] }).gone, ["1", "a"]);
  });
});

test.describe("migrate", () => {
  test("defaults filled: sex, days, exStep {} , vid {}", () => {
    const s = mig({ profile: { days: [], exStep: undefined }, vid: null });
    assert.equal(s.profile.sex, "m");
    assert.deepEqual(s.profile.days, [1, 2, 4, 6]);
    assert.deepEqual(s.profile.exStep, {});
    assert.deepEqual(s.vid, {});
    assert.equal(s.pv, T.PROGRAM_VERSION);
  });
  test("exStep missing entirely from profile defaults to {}", () => {
    const s = plain(T.migrate({ ...plain(T.DEFAULTS), profile: { name: "x" } }, T.PROGRAM_VERSION));
    assert.deepEqual(s.profile.exStep, {});
  });
  test("legacy sessions get a deterministic date|day id", () => {
    const s = mig({ sessions: [{ d: "2026-01-02", day: "P", ex: [] }, { id: "keep", d: "2026-01-03", day: "L", ex: [] }] });
    assert.deepEqual(s.sessions.map(x => x.id), ["2026-01-02|P", "keep"]);
  });
  test("v37 conversion bumps untouched old step defaults once", () => {
    const s = mig({ profile: { plate: 1.25, dbStep: 2 } });
    assert.equal(s.profile.plate, 2.5);
    assert.equal(s.profile.dbStep, 2.5);
    assert.equal(s.profile.convV, 2);
    const kept = mig({ profile: { plate: 1.25, dbStep: 2, convV: 2 } });
    assert.equal(kept.profile.plate, 1.25, "after conversion the user's own value is respected");
  });
  test("weights seeded from profile.w once", () => {
    const s = mig({ profile: { w: "82.5" } });
    assert.equal(s.weights.length, 1);
    assert.equal(s.weights[0].kg, 82.5);
    assert.equal(s.weights[0].d, T.todayISO());
    assert.equal(mig({ profile: { w: "82.5" }, weights: [{ d: "2026-01-01", kg: 80, ts: 1 }] }).weights.length, 1);
  });
  test("plan slots for exercises missing from the library are dropped; userEx keys kept", () => {
    const s = mig({ plan: { P: [{ k: "bp" }, { k: "gone_ex" }, { k: "u_mine" }] }, userEx: { u_mine: { name: "Mine" } } });
    assert.deepEqual(s.plan.P.map(x => x.k), ["bp", "u_mine"]);
  });
  test("non-object plan becomes null", () => {
    assert.equal(mig({ plan: 5 }).plan, null);
    assert.equal(mig({ plan: "P" }).plan, null);
  });
  test("old program version retires an active session whose day no longer exists", () => {
    T.migrationNote = "";
    const s = mig({ active: { day: "A", ex: { bp: [] } } }, 1);
    assert.equal(s.active, null);
    assert.ok(T.migrationNote.length > 0);
    T.migrationNote = "";
  });
  test("old program version keeps an active session that still matches its day", () => {
    const ex = Object.fromEntries(T.PROGRAM_DEF.P.map(k => [k, []]));
    const s = mig({ active: { day: "P", ex } }, 1);
    assert.equal(s.active.day, "P");
  });
});

test.describe("normalizeRemote", () => {
  test("rejects non-objects", () => {
    assert.equal(T.normalizeRemote(null), null);
    assert.equal(T.normalizeRemote("x"), null);
  });
  test("runs the payload through migrate (sanitised, defaults)", () => {
    const r = plain(T.normalizeRemote({ userEx: { "bad key": {} }, sessions: [{ d: "2026-01-02", day: "P", ex: [] }], profile: { name: "A" } }));
    assert.deepEqual(r.userEx, {});
    assert.equal(r.sessions[0].id, "2026-01-02|P");
    assert.equal(r.profile.name, "A");
    assert.equal(r.profile.barKg, 20, "profile defaults filled");
    assert.deepEqual(r.profile.exStep, {});
  });
  test("does not clobber the local migrationNote", () => {
    T.migrationNote = "LOCAL";
    T.normalizeRemote({ pv: 1, active: { day: "A", ex: { bp: [] } } });
    assert.equal(T.migrationNote, "LOCAL");
    T.migrationNote = "";
  });
  test("does not mutate its input", () => {
    const d = { sessions: [{ d: "2026-01-02", day: "P", ex: [] }] };
    T.normalizeRemote(d);
    assert.equal(d.sessions[0].id, undefined, "input session not given an id");
  });
});
