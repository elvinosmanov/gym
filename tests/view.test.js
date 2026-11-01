"use strict";
/* staying in place: collapsed finished exercises, saved tab/scroll (js/train.js, js/today.js) */
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./harness.js");

const { T, reset, localStorage } = loadApp();
test.beforeEach(() => { reset(); localStorage.removeItem("forge-pos"); });

function active(map){
  T.state.active = { day: "P", startedAt: Date.now(), ex: Object.fromEntries(Object.entries(map).map(([k, sets]) =>
    [k, sets.map(([kg, reps, done]) => ({ kg: String(kg), reps: String(reps), done: !!done }))])) };
}

test.describe("finished exercises", () => {
  test("exDone only when every set is ticked", () => {
    active({ bp: [[40, 8, true], [40, 8, true]], ohp: [[20, 8, true], [20, 8, false]] });
    assert.equal(T.exDone("bp"), true);
    assert.equal(T.exDone("ohp"), false);
    assert.equal(T.exDone("lat"), false, "no sets → not done");
  });
  test("doneSummary lists kg×reps, bodyweight as BÇ, comma decimals read", () => {
    active({ bp: [["42,5", 8, true], [0, 12, true]] });
    assert.equal(T.doneSummary("bp"), "42.5×8, BÇ×12");
  });
});

test.describe("saved position", () => {
  test("fresh position is read back", () => {
    localStorage.setItem("forge-pos", JSON.stringify({ tab: "prog", y: 600, t: Date.now() }));
    assert.equal(T.loadPos().tab, "prog");
  });
  test("position older than 6 hours is ignored", () => {
    localStorage.setItem("forge-pos", JSON.stringify({ tab: "prog", y: 600, t: Date.now() - 7*3600*1000 }));
    assert.equal(T.loadPos(), null);
  });
  test("garbage is ignored", () => {
    localStorage.setItem("forge-pos", "{not json");
    assert.equal(T.loadPos(), null);
  });
});
