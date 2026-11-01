"use strict";
/* plan doctor (js/plan-doctor.js) + duplicate prevention in swap/plan pickers */
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./harness.js");

const { T, reset, plain } = loadApp();
test.beforeEach(() => reset());
const slots = (...keys) => keys.map(k => plain(T.defSlot(k)));
/* advice actions were {l, f:"fn('P',1)"}; newer code uses {l, act:"fn", args:[...]}. Accept both. */
const actName = a => a.act || String(a.f || "").split("(")[0];
const setPlan = (D, ...keys) => { T.state.plan = { [D]: slots(...keys) }; T.buildProgram(); };

test.describe("isComp / exRank", () => {
  test("names decide compound vs isolation", () => {
    assert.equal(T.isComp(T.libEx("bp")), true);
    assert.equal(T.isComp(T.libEx("sq")), true);
    assert.equal(T.isComp(T.libEx("lex")), false, "Leg Extension");
    assert.equal(T.isComp(T.libEx("lat")), false, "Lateral Raise");
    assert.equal(T.isComp(T.libEx("tri")), false, "Pushdown");
  });
  test("compounds outrank isolations", () => {
    assert.ok(T.exRank(T.libEx("bp")) - T.exRank(T.libEx("lat")) >= 10);
  });
});

test.describe("orderCheck", () => {
  test("isolation before compound is flagged with a large gap", () => {
    const oc = T.orderCheck(slots("lat", "tri", "bp"));
    assert.equal(oc.same, false);
    assert.ok(oc.worst >= 5);
    assert.equal(oc.ideal[0].k, "bp");
  });
  test("compound first, isolation last is accepted", () => {
    const oc = T.orderCheck(slots("bp", "lat", "tri"));
    assert.ok(oc.same || oc.worst < 5);
  });
  test("ideal order is stable for equal ranks", () => {
    const oc = T.orderCheck(slots("bp", "bp"));
    assert.equal(oc.same, true);
    assert.equal(oc.worst, 0);
  });
});

test.describe("planAdvice", () => {
  const orderTip = list => list.find(a => a.ic === "↕");
  test("default Push day has no order warning", () => {
    assert.equal(orderTip(plain(T.planAdvice("P"))), undefined);
  });
  test("isolation-first custom day gets an order warning with a reorder action", () => {
    setPlan("P", "lat", "tri", "bp", "ohp");
    const tip = orderTip(plain(T.planAdvice("P")));
    assert.ok(tip, "order warning present");
    assert.ok(tip.a.some(a => actName(a) === "advReorder"));
    assert.equal(tip.sev, 1);
  });
  test("very short day is called light", () => {
    setPlan("P", "bp");
    assert.ok(plain(T.planAdvice("P")).some(a => a.ic === "＋" && /yüngül/.test(a.t)));
  });
  test("empty day gives no advice and does not throw", () => {
    T.state.plan = { P: [] }; T.buildProgram();
    assert.deepEqual(plain(T.planAdvice("P")), []);
  });
  test("every advice action targets an existing global function", () => {
    ["P", "L", "G", "F"].forEach(D => plain(T.planAdvice(D)).forEach(adv => adv.a.forEach(a => {
      const fn = actName(a);
      assert.equal(typeof T[fn], "function", `${D}: ${fn}`);
    })));
  });
});

test.describe("duplicate prevention", () => {
  test("swap list hides alternatives already planned on the same day", () => {
    /* default Pull day has both row and rgr; rgr is also row's alternative */
    assert.ok(T.PROGRAM_DEF.L.includes("rgr") && T.ALT_OF.row.includes("rgr"));
    const opts = plain(T.swapOpts("row")).map(o => o.key);
    assert.equal(opts[0], "row");
    assert.ok(!opts.includes("rgr"));
    assert.ok(opts.includes("brow"));
  });
  test("plan picker refuses an exercise that is already on the day", () => {
    setPlan("P", "bp", "lat");
    const before = JSON.stringify(T.state.plan.P);
    T.planPick("P", "lat", null);        /* add duplicate */
    T.planPick("P", "lat", 0);           /* replace slot 0 with a key that exists at slot 1 */
    assert.equal(JSON.stringify(T.state.plan.P), before);
  });
});
