"use strict";
/* small helpers: number parsing, plates, stack steps, session time, dates, escaping */
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./harness.js");

const { T, reset } = loadApp();
test.beforeEach(() => reset());

test.describe("numVal / intVal", () => {
  test("comma decimals (Azerbaijani keyboard) parse", () => {
    assert.equal(T.numVal("78,5"), 78.5);
    assert.equal(T.numVal(" 80 "), 80);
    assert.equal(T.numVal("80.25"), 80.25);
    assert.equal(T.numVal(5), 5);
  });
  test("empty / null / junk → NaN", () => {
    assert.ok(Number.isNaN(T.numVal("")));
    assert.ok(Number.isNaN(T.numVal(null)));
    assert.ok(Number.isNaN(T.numVal(undefined)));
    assert.ok(Number.isNaN(T.numVal("abc")));
  });
  test("intVal truncates and accepts commas", () => {
    assert.equal(T.intVal("8"), 8);
    assert.equal(T.intVal("8,7"), 8);
    assert.equal(T.intVal(" 12 "), 12);
    assert.ok(Number.isNaN(T.intVal("")));
    assert.ok(Number.isNaN(T.intVal("x")));
  });
});

test.describe("plateBreak", () => {
  test("barbell: per-side breakdown, total includes the bar", () => {
    const bp = T.EXMAP.bp;
    assert.equal(T.plateBreak(30, bp), "hər tərəfə 25 + 5 · cəmi 80 kq (dəmir 20 daxil)");
    assert.equal(T.plateBreak(50, bp), "hər tərəfə 2×25 · cəmi 120 kq (dəmir 20 daxil)");
    assert.equal(T.plateBreak("22,5".replace(",", "."), bp), "hər tərəfə 20 + 2.5 · cəmi 65 kq (dəmir 20 daxil)");
  });
  test("plate-loaded machine: no bar in the total", () => {
    assert.equal(T.plateBreak(45, T.EXMAP.tbr), "hər tərəfə 25 + 20 · cəmi 90 kq");
  });
  test("unmakeable with the smallest plate, zero, or non-side loads → null", () => {
    const bp = T.EXMAP.bp;
    assert.equal(T.plateBreak(1, bp), null);         /* smallest plate is 2.5 */
    assert.equal(T.plateBreak(0, bp), null);
    assert.equal(T.plateBreak(20, T.EXMAP.dbp), null);
    assert.equal(T.plateBreak(20, T.EXMAP.row), null);
  });
  test("smaller plates allowed when the gym has them", () => {
    reset({ profile: { plate: 1.25 } });
    assert.equal(T.plateBreak(1.25, T.EXMAP.bp), "hər tərəfə 1.25 · cəmi 22.5 kq (dəmir 20 daxil)");
  });
});

test.describe("stack step: exStep / snapKg / dasN / dasTxt", () => {
  test("exStep defaults to 0 and ignores junk", () => {
    assert.equal(T.exStep("row"), 0);
    reset({ profile: { exStep: { row: "6.5", lp: -3, cur: "x" } } });
    assert.equal(T.exStep("row"), 6.5);
    assert.equal(T.exStep("lp"), 0);
    assert.equal(T.exStep("cur"), 0);
  });
  test("snapKg without a step rounds to 0.5", () => {
    assert.equal(T.snapKg("row", 52.3), 52.5);
    assert.equal(T.snapKg("row", 52.2), 52);
  });
  test("snapKg with a step snaps to a multiple, at least one plate", () => {
    reset({ profile: { exStep: { row: 6.5 } } });
    assert.equal(T.snapKg("row", 55), 52);
    assert.equal(T.snapKg("row", 56), 58.5);
    assert.equal(T.snapKg("row", 2), 6.5);
  });
  test("dasN / dasTxt", () => {
    assert.equal(T.dasN("row", 52), undefined, "no step configured");
    reset({ profile: { exStep: { row: 6.5 } } });
    assert.equal(T.dasN("row", 52), 8);
    assert.equal(T.dasN("row", 55), null);
    assert.equal(T.dasN("row", 0), undefined);
    assert.equal(T.dasTxt("row", 52), " (8 daş)");
    assert.equal(T.dasTxt("row", 55), "");
  });
  test("exStep becomes the slot increment", () => {
    reset({ profile: { exStep: { row: 6.5 } } });
    assert.equal(T.EXMAP.row.inc, 6.5);
  });
});

test.describe("sessionSeconds", () => {
  const MIN = 60000;
  test("constants", () => {
    assert.equal(T.GAP_CAP, 20 * MIN);
    assert.equal(T.TAIL_CAP, 5 * MIN);
  });
  test("no marks → null", () => {
    assert.equal(T.sessionSeconds({ ex: {} }, 0), null);
    assert.equal(T.sessionSeconds(null, 0), null);
  });
  test("gaps between marks are capped at GAP_CAP; unordered marks are sorted", () => {
    const t0 = Date.now() - 10 * 3600000;
    const a = { startedAt: t0, ex: { bp: [{ t: t0 + 2 * MIN + 45 * MIN }, { t: t0 + 2 * MIN }], sq: [{ t: null }, {}] } };
    assert.equal(T.sessionSeconds(a, 0), (2 + 20) * 60);
  });
  test("tail since the last mark is capped at the given tail", () => {
    const t0 = Date.now() - 10 * 3600000;
    const a = { startedAt: t0, ex: { bp: [{ t: t0 + MIN }] } };
    assert.equal(T.sessionSeconds(a, T.TAIL_CAP), 60 + 300);
  });
  test("short live tail counts real elapsed time", () => {
    const a = { startedAt: Date.now() - 2 * MIN, ex: {} };
    const s = T.sessionSeconds(a, T.TAIL_CAP);
    assert.ok(s >= 119 && s <= 121, String(s));
  });
});

test.describe("dates", () => {
  test("todayISO is local YYYY-MM-DD", () => {
    const d = new Date();
    assert.match(T.todayISO(), /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(T.todayISO(), T.isoOf(d));
  });
  test("isoOf pads", () => {
    assert.equal(T.isoOf(new Date(2024, 0, 5)), "2024-01-05");
    assert.equal(T.isoOf(new Date(2024, 11, 31, 23, 59)), "2024-12-31");
  });
  test("addDaysISO across month, year, leap day and DST", () => {
    assert.equal(T.addDaysISO("2024-02-28", 1), "2024-02-29");
    assert.equal(T.addDaysISO("2024-03-01", -1), "2024-02-29");
    assert.equal(T.addDaysISO("2023-03-01", -1), "2023-02-28");
    assert.equal(T.addDaysISO("2024-12-31", 1), "2025-01-01");
    assert.equal(T.addDaysISO("2024-03-30", 2), "2024-04-01");
    assert.equal(T.addDaysISO("2024-10-26", 7), "2024-11-02");
    assert.equal(T.addDaysISO("2024-01-10", 0), "2024-01-10");
  });
});

test.describe("safeURL / esc", () => {
  test("only http(s) URLs pass", () => {
    assert.equal(T.safeURL("https://youtu.be/abc"), "https://youtu.be/abc");
    assert.equal(T.safeURL("http://x.com"), "http://x.com/");
    assert.equal(T.safeURL("javascript:alert(1)"), "");
    assert.equal(T.safeURL("JaVaScRiPt:alert(1)"), "");
    assert.equal(T.safeURL("data:text/html,<b>"), "");
    assert.equal(T.safeURL("ftp://x.com/a"), "");
    assert.equal(T.safeURL("not a url"), "");
    assert.equal(T.safeURL(""), "");
    assert.equal(T.safeURL(null), "");
  });
  test("esc escapes all HTML-significant characters", () => {
    assert.equal(T.esc(`<a href="x" onclick='y'>&</a>`), "&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
    assert.equal(T.esc(null), "");
    assert.equal(T.esc(undefined), "");
    assert.equal(T.esc(5), "5");
  });
});
