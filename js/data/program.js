/* ============================================================
   Rep-range policy and the seed program.

   Two ranges, not six. Heavy loads give equal hypertrophy and MORE
   strength than light ones (Schoenfeld 2017 meta-analysis), so the
   compounds run heavy. The exception is small isolation muscles,
   where a heavy 8 becomes a swing — those stay at 10-14.
   ============================================================ */

export const RANGES = {
  heavy: { key: "heavy", label: "HEAVY", lo: 6, hi: 9,
           blurb: "Compounds. Load is the driver — add weight the moment you own the top of the range." },
  pump:  { key: "pump",  label: "PUMP",  lo: 10, hi: 14,
           blurb: "Small muscles and isolation. Control and full range beat load here." }
};

export function rangeFor(ex, prefs) {
  const r = RANGES[ex.range] || RANGES.pump;
  if (!prefs) return [r.lo, r.hi];
  return ex.range === "heavy" ? (prefs.heavyRange || [r.lo, r.hi])
                              : (prefs.pumpRange || [r.lo, r.hi]);
}

export function rangeText(ex, prefs) {
  const [lo, hi] = rangeFor(ex, prefs);
  return `${lo}-${hi}`;
}

/* ---------- seed days ----------
   These match the original A/B/C so nothing is lost on upgrade, but every
   exercise is now editable, swappable and removable in the day builder. */

export const SEED_DAYS = [
  {
    id: "day-a", name: "Push + Squat", short: "A", color: "a",
    ex: [
      { exId: "sq",        sets: 4, rest: 210 },
      { exId: "bp",        sets: 4, rest: 180 },
      { exId: "ohp",       sets: 3, rest: 150 },
      { exId: "idp",       sets: 3, rest: 120 },
      { exId: "lat_raise", sets: 3, rest: 60 },
      { exId: "tri",       sets: 3, rest: 60 }
    ]
  },
  {
    id: "day-b", name: "Pull + Hinge", short: "B", color: "b",
    ex: [
      { exId: "dl",  sets: 3, rest: 210 },
      { exId: "lp",  sets: 4, rest: 120 },
      { exId: "row", sets: 3, rest: 120 },
      { exId: "fp",  sets: 3, rest: 60 },
      { exId: "cur", sets: 3, rest: 60 },
      { exId: "ham", sets: 2, rest: 60 }
    ]
  },
  {
    id: "day-c", name: "Legs + Pump", short: "C", color: "c",
    ex: [
      { exId: "lpz",  sets: 4, rest: 150 },
      { exId: "rdl",  sets: 3, rest: 150 },
      { exId: "bss",  sets: 3, rest: 90 },
      { exId: "calf", sets: 4, rest: 60 },
      { exId: "fly",  sets: 3, rest: 60 },
      { exId: "abs",  sets: 3, rest: 60 }
    ]
  }
];

export const DAY_COLORS = ["a", "b", "c", "d", "e"];

/* Old exercise keys that changed name in v2. */
export const LEGACY_IDS = { lat: "lat_raise" };

export const WARMUP =
  "5 min easy cardio, then arm circles, leg swings and bodyweight squats. " +
  "Ramp into your first heavy lift — the app shows you the exact warm-up weights.";

export const RULES = [
  { t: "Two rep ranges, that's it",
    d: "HEAVY 6-9 on the compounds, PUMP 10-14 on isolation. Heavy loads build the same size as light ones but far more strength, which is why the big lifts run heavy. Small muscles stay lighter because a heavy 8 on a lateral raise is just a swing." },
  { t: "Double progression",
    d: "Stay in the range. When you hit the TOP of it on every set with clean form, the app adds the smallest weight your gym can actually make and drops you back to the bottom of the range. Small jumps, forever." },
  { t: "Effort: 1-2 reps in reserve",
    d: "End most sets with one or two clean reps still in you. Grinding to failure every set wrecks recovery and steals from your next session. The last set of isolation work can go closer." },
  { t: "Form is the licence to load",
    d: "If form broke to finish the reps, the set doesn't count toward progression — mark it and repeat the weight. Filming your top set from the side once a week is the cheapest coaching there is." },
  { t: "Rest between sets",
    d: "Heavy compounds 2.5-3 min, medium 2 min, isolation 60-90 s. Resting less doesn't build more muscle, it just makes the next set worse. The timer starts by itself when you tick a set." },
  { t: "Missed a day?",
    d: "Just train the next day in your rotation whenever you next get to the gym. Nothing is lost and nothing needs shuffling." },
  { t: "Deload every 6-8 weeks",
    d: "When bar speed drops and the joints feel beaten up for a full week, take one light week: same exercises, about 60% of your weights, two sets each. The app flags it when your strength index stalls." }
];

export const TIPS = [
  "Add the smallest jump your gym can make, every session you earn it. Small increments forever is how size is actually built.",
  "You grow between workouts, not during them. Protect your sleep like you protect your PRs: 7-9 hours.",
  "Scale didn't move this week? Then the surplus wasn't a surplus. Add about 200 kcal and re-check next week.",
  "Film your top set from the side once a week. The camera is the cheapest coach you will ever hire.",
  "Protein at every meal, 30-50 g. The daily total beats any timing trick ever invented.",
  "Leave one or two reps in the tank on most sets. Training to failure every set just steals from your next session.",
  "Two controlled reps with a slow negative beat five sloppy ones. Own the lowering phase.",
  "Consistency beats intensity: three honest workouts a week for a year beats six perfect ones for a month."
];
