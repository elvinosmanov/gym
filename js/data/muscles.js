/* ============================================================
   Muscle registry + anatomy body map.

   Bilateral muscles are drawn once on the left half and mirrored
   with <use transform="translate(240,0) scale(-1,1)">, so a fill
   set on the source path updates both sides for free.
   ============================================================ */

export const MUSCLES = {
  chest:      { name: "Chest",        short: "Chest",   region: "push" },
  front_delt: { name: "Front Delts",  short: "F.Delt",  region: "push" },
  side_delt:  { name: "Side Delts",   short: "S.Delt",  region: "push" },
  rear_delt:  { name: "Rear Delts",   short: "R.Delt",  region: "pull" },
  triceps:    { name: "Triceps",      short: "Tri",     region: "push" },
  biceps:     { name: "Biceps",       short: "Bi",      region: "pull" },
  forearm:    { name: "Forearms",     short: "Forearm", region: "pull" },
  lat:        { name: "Lats",         short: "Lats",    region: "pull" },
  upper_back: { name: "Upper Back",   short: "U.Back",  region: "pull" },
  trap:       { name: "Traps",        short: "Traps",   region: "pull" },
  lower_back: { name: "Lower Back",   short: "L.Back",  region: "pull" },
  abs:        { name: "Abs",          short: "Abs",     region: "core" },
  oblique:    { name: "Obliques",     short: "Oblique", region: "core" },
  glute:      { name: "Glutes",       short: "Glutes",  region: "legs" },
  quad:       { name: "Quads",        short: "Quads",   region: "legs" },
  hamstring:  { name: "Hamstrings",   short: "Hams",    region: "legs" },
  adductor:   { name: "Adductors",    short: "Adduct",  region: "legs" },
  calf:       { name: "Calves",       short: "Calves",  region: "legs" }
};

export const MUSCLE_KEYS = Object.keys(MUSCLES);

/* Weekly hard-set landmarks per muscle (Schoenfeld/Israetel volume ranges).
   Used by the Progress heat map to say "enough / not enough". */
export const WEEKLY_SETS = {
  chest: [10, 20], front_delt: [6, 14], side_delt: [10, 20], rear_delt: [10, 20],
  triceps: [8, 18], biceps: [8, 18], forearm: [4, 12],
  lat: [10, 20], upper_back: [10, 20], trap: [6, 16], lower_back: [4, 12],
  abs: [8, 18], oblique: [6, 14],
  glute: [8, 18], quad: [10, 20], hamstring: [8, 18], adductor: [4, 12], calf: [8, 18]
};

/* ---------- body geometry ----------
   viewBox is 240 wide; the mirror axis is x = 120. Left-side paths only. */

const FRONT = {
  outline:
    // head + neck + torso + arms + legs silhouette, drawn as one closed-ish base
    "M120 10c14 0 25 12 25 27 0 10-4 19-11 24 8 3 17 6 25 10 11 5 18 13 21 24 3 12 5 26 6 39 " +
    "1 12 2 24 2 33 0 7-5 11-11 10-6-1-9-6-10-12-1-9-3-19-5-27-1 12-1 24 1 35 2 14 5 27 6 39 " +
    "1 14 1 28 0 41-1 15-3 30-5 44-2 13-4 25-5 35-1 8-6 12-13 12-7 0-12-5-12-13 0-14 0-30-1-45 " +
    "-1-12-2-24-3-33-1 9-2 21-3 33-1 15-1 31-1 45 0 8-5 13-12 13-7 0-12-4-13-12-1-10-3-22-5-35 " +
    "-2-14-4-29-5-44-1-13-1-27 0-41 1-12 4-25 6-39 2-11 2-23 1-35-2 8-4 18-5 27-1 6-4 11-10 12 " +
    "-6 1-11-3-11-10 0-9 1-21 2-33 1-13 3-27 6-39 3-11 10-19 21-24 8-4 17-7 25-10-7-5-11-14-11-24 " +
    "0-15 11-27 25-27z",
  groups: {
    trap:       { d: "M112 62c-11 3-22 9-31 17 2-9 7-15 15-19 5-3 11-4 16-5z" },
    front_delt: { d: "M81 79c-9 6-14 16-15 27-1 7 3 12 9 12 7 0 13-8 15-18 2-9 0-17-9-21z" },
    side_delt:  { d: "M74 84c-8 8-11 19-11 30 0 6 4 9 9 8 5-2 8-8 9-16 1-9 0-17-7-22z" },
    chest:      { d: "M98 84c8-3 15-4 20-3v44c-7 4-17 4-24-1-8-6-11-16-9-25 1-7 6-12 13-15z" },
    biceps:     { d: "M69 118c-4 12-5 26-2 39 6 2 12-3 14-13 3-13 1-22-3-28-3-1-6-1-9 2z" },
    forearm:    { d: "M65 159c-6 15-10 33-10 47 0 6 7 8 11 3 6-9 11-30 12-46-4-4-9-5-13-4z" },
    abs:        { d: "M104 128h32v66c0 9-7 15-16 15s-16-6-16-15z" , center: true },
    oblique:    { d: "M97 130c-5 15-5 38-1 56 2 8 5 13 8 15V130z" },
    quad:       { d: "M99 212c-8 18-12 47-10 76 1 14 7 23 14 23 8 0 14-11 14-27v-72z" },
    adductor:   { d: "M114 212v56c-7-4-11-15-11-28 0-11 4-22 11-28z" },
    calf:       { d: "M97 318c-7 16-9 39-6 58 1 9 8 12 12 6 5-9 7-33 5-52z" }
  }
};

const BACK = {
  outline: FRONT.outline,
  groups: {
    trap:       { d: "M120 62c-13 4-27 13-38 24 13 6 24 14 28 25l10 26V62z", center: false },
    rear_delt:  { d: "M78 88c-9 7-15 18-15 30 0 6 5 10 10 8 7-3 12-13 13-24 1-6 0-11-8-14z" },
    triceps:    { d: "M66 118c-6 14-8 30-4 44 6 2 12-4 14-15 3-14 1-24-3-30-3-1-5-1-7 1z" },
    forearm:    { d: "M62 163c-6 15-9 32-9 45 0 6 7 8 11 3 6-9 11-29 12-45-4-4-10-5-14-3z" },
    lat:        { d: "M96 108c-9 14-14 38-12 62 2 15 10 26 23 30l9-48c-2-19-9-35-20-44z" },
    upper_back: { d: "M104 96c-6 5-10 13-11 22 6 3 13 3 19 0V96z" },
    lower_back: { d: "M106 166h28v44c0 9-6 14-14 14s-14-5-14-14z", center: true },
    glute:      { d: "M101 218c-11 5-17 20-15 37 2 15 13 24 26 21 8-2 11-13 11-26v-30z" },
    hamstring:  { d: "M93 276c-6 20-7 47-3 68 3 11 11 13 16 5 5-13 7-44 5-67z" },
    calf:       { d: "M94 348c-7 16-10 40-6 58 3 10 11 10 15 1 5-14 6-39 3-54z" }
  }
};

export const BODY = { front: FRONT, back: BACK };

/* Which view each muscle is drawn on (some appear on both). */
const ON = {
  front: ["trap","front_delt","side_delt","chest","biceps","forearm","abs","oblique","quad","adductor","calf"],
  back:  ["trap","rear_delt","triceps","forearm","lat","upper_back","lower_back","glute","hamstring","calf"]
};

/* Muscles that have no dedicated shape on either view get mapped onto the
   nearest drawn region so nothing silently disappears from the map. */
const ALIAS = { upper_back: "upper_back" };

export function viewsFor(muscleKey) {
  const out = [];
  if (ON.front.includes(muscleKey)) out.push("front");
  if (ON.back.includes(muscleKey)) out.push("back");
  return out;
}

/**
 * Render one body view.
 * @param {'front'|'back'} view
 * @param {object} shade  map of muscleKey -> css colour string (already resolved)
 * @param {string} uid    unique prefix so multiple maps can coexist on a page
 */
export function bodyView(view, shade = {}, uid = "b") {
  const spec = BODY[view];
  const parts = [];
  for (const key of ON[view]) {
    const g = spec.groups[ALIAS[key] || key];
    if (!g) continue;
    const fill = shade[key] || "var(--muscle-off)";
    const id = `${uid}-${view}-${key}`;
    parts.push(`<path id="${id}" d="${g.d}" fill="${fill}"/>`);
    if (!g.center) {
      parts.push(`<use href="#${id}" transform="translate(240,0) scale(-1,1)"/>`);
    }
  }
  return `<svg viewBox="0 0 240 440" class="bodymap" role="img" aria-label="${view} view">
    <path d="${spec.outline}" fill="var(--muscle-body)" stroke="var(--muscle-edge)" stroke-width="1.5"/>
    ${parts.join("")}
  </svg>`;
}

/**
 * Both views side by side, shaded for a single exercise.
 * primary -> strong colour, secondary -> muted colour.
 */
export function exerciseBody(muscles, uid = "ex") {
  const m = muscles || {};
  // Exercise data uses the short keys m.p / m.s; accept the long form too.
  const primary = m.primary || m.p || [];
  const secondary = m.secondary || m.s || [];
  const shade = {};
  secondary.forEach(k => { shade[k] = "var(--muscle-sec)"; });
  primary.forEach(k => { shade[k] = "var(--muscle-pri)"; });
  return `<div class="bodypair">${bodyView("front", shade, uid)}${bodyView("back", shade, uid)}</div>`;
}

/** Heat shading from a sets-per-muscle map, graded against WEEKLY_SETS. */
export function heatShade(setsByMuscle) {
  const shade = {};
  for (const k of MUSCLE_KEYS) {
    const n = setsByMuscle[k] || 0;
    const [lo, hi] = WEEKLY_SETS[k] || [8, 16];
    if (n <= 0) shade[k] = "var(--heat-0)";
    else if (n < lo * 0.5) shade[k] = "var(--heat-1)";
    else if (n < lo) shade[k] = "var(--heat-2)";
    else if (n <= hi) shade[k] = "var(--heat-3)";
    else shade[k] = "var(--heat-4)";
  }
  return shade;
}

export function volumeStatus(muscleKey, sets) {
  const [lo, hi] = WEEKLY_SETS[muscleKey] || [8, 16];
  if (sets <= 0) return { label: "none", cls: "bad" };
  if (sets < lo) return { label: "low", cls: "warn" };
  if (sets <= hi) return { label: "good", cls: "ok" };
  return { label: "high", cls: "warn" };
}
