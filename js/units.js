/* ============================================================
   Load types, plate maths, and achievable weight steps.

   The old app stored a bare `inc` number with no unit meaning, so it
   could not tell you what to actually put on the bar and it suggested
   jumps your gym cannot make (EZ-bar +2.5, dumbbells +1). Every
   exercise now declares a loadType, and every number the app shows
   is resolved through here.
   ============================================================ */

export const LOAD_TYPES = {
  barbell: {
    label: "kg total",
    hint: "Total weight including the bar",
    entry: "total", perSide: true, bar: "barKg"
  },
  ezbar: {
    label: "kg total",
    hint: "Total weight including the EZ bar",
    entry: "total", perSide: true, bar: "ezBarKg"
  },
  smith: {
    label: "kg total",
    hint: "Plates loaded, not counting the Smith carriage",
    entry: "total", perSide: true, bar: "smithBarKg"
  },
  plate_machine: {
    label: "kg per side",
    hint: "Plates on one side of the sled",
    entry: "perSide", perSide: true, bar: null
  },
  dumbbell_pair: {
    label: "kg per dumbbell",
    hint: "One dumbbell — you hold two of these",
    entry: "perHand", perSide: false, bar: null
  },
  dumbbell_one: {
    label: "kg",
    hint: "The single dumbbell you hold",
    entry: "perHand", perSide: false, bar: null
  },
  machine_stack: {
    label: "kg on the stack",
    hint: "Where you put the pin",
    entry: "total", perSide: false, bar: null
  },
  cable: {
    label: "kg on the stack",
    hint: "Where you put the pin",
    entry: "total", perSide: false, bar: null
  },
  bodyweight: {
    label: "+kg added",
    hint: "Extra weight on top of bodyweight — 0 is fine",
    entry: "added", perSide: false, bar: null, allowZero: true
  },
  assisted: {
    label: "kg assist",
    hint: "Assistance weight — less assist means harder",
    entry: "assist", perSide: false, bar: null, allowZero: true, inverted: true
  },
  banded: {
    label: "band",
    hint: "Band tension — log the band level as a number",
    entry: "level", perSide: false, bar: null, allowZero: true
  }
};

export const DEFAULT_GYM = {
  barKg: 20,
  ezBarKg: 10,
  smithBarKg: 15,
  /** plate PAIRS you own, heaviest first (kg per plate) */
  plates: [25, 20, 15, 10, 5, 2.5, 1.25],
  /** fixed EZ / straight bars, if your gym uses a rack of them instead of a loadable bar */
  fixedBars: [],
  dbStep: 2.5,
  dbMin: 2,
  dbMax: 50,
  /** some racks jump in 2 kg up to 20 then 2.5 — a list wins over the step */
  dbLadder: [],
  stackStep: 5,
  stackMin: 5,
  stackMax: 120
};

export function gymOf(state) {
  return { ...DEFAULT_GYM, ...(state && state.gym ? state.gym : {}) };
}

/* ---------- barbell maths ---------- */

/**
 * Every total weight a loadable bar can actually make, ascending.
 * Plates are pairs, so each plate adds 2× its weight.
 */
export function reachableBarTotals(barKg, plates, max = 400) {
  const set = new Set([barKg]);
  const uniq = [...new Set(plates)].sort((a, b) => b - a);
  // Assume a practical maximum of 6 pairs of any one plate on the bar.
  const walk = (idx, total) => {
    if (total > max) return;
    set.add(total);
    if (idx >= uniq.length) return;
    for (let n = 0; n <= 6; n++) {
      const t = total + uniq[idx] * 2 * n;
      if (t > max) break;
      walk(idx + 1, t);
    }
  };
  walk(0, barKg);
  return [...set].sort((a, b) => a - b);
}

/** Greedy plate breakdown for one side. Returns null if it cannot be made exactly. */
export function platesPerSide(total, barKg, plates) {
  let side = (total - barKg) / 2;
  if (side < -1e-9) return null;
  const uniq = [...new Set(plates)].sort((a, b) => b - a);
  const out = [];
  for (const p of uniq) {
    while (side >= p - 1e-9) { out.push(p); side = round2(side - p); }
  }
  return Math.abs(side) < 1e-9 ? out : null;
}

/** "20 bar + 21.25/side (20 + 1.25)" — the answer to "how do I add 2.5 kg?" */
export function loadingText(kg, loadType, gym) {
  const t = LOAD_TYPES[loadType];
  if (!t) return "";
  const n = Number(kg);
  if (!isFinite(n)) return "";

  if (t.bar) {
    const bar = gym[t.bar] || 20;
    if (gym.fixedBars && gym.fixedBars.length && loadType === "ezbar") {
      return `fixed ${n} kg bar`;
    }
    if (n <= bar + 1e-9) return `empty ${bar} kg bar`;
    const side = platesPerSide(n, bar, gym.plates);
    if (!side) return `${bar} kg bar + ${round2((n - bar) / 2)} per side`;
    return `${bar} bar + ${round2((n - bar) / 2)}/side (${side.join(" + ")})`;
  }
  if (loadType === "plate_machine") {
    const side = greedy(n, gym.plates);
    return side ? `${n} per side (${side.join(" + ")})` : `${n} kg per side`;
  }
  if (loadType === "dumbbell_pair") return `2 × ${n} kg dumbbells`;
  if (loadType === "dumbbell_one") return `one ${n} kg dumbbell`;
  if (loadType === "machine_stack" || loadType === "cable") return `pin at ${n} kg`;
  if (loadType === "bodyweight") return n > 0 ? `bodyweight + ${n} kg` : "bodyweight only";
  if (loadType === "assisted") return n > 0 ? `${n} kg assistance` : "no assistance";
  if (loadType === "banded") return `band level ${n}`;
  return `${n} kg`;
}

function greedy(target, plates) {
  let left = target;
  const uniq = [...new Set(plates)].sort((a, b) => b - a);
  const out = [];
  for (const p of uniq) {
    while (left >= p - 1e-9) { out.push(p); left = round2(left - p); }
  }
  return Math.abs(left) < 1e-9 ? out : null;
}

/* ---------- the ladder of weights a given exercise can use ---------- */

export function ladderFor(loadType, gym) {
  switch (loadType) {
    case "barbell":
      return reachableBarTotals(gym.barKg, gym.plates);
    case "smith":
      return reachableBarTotals(gym.smithBarKg, gym.plates);
    case "ezbar":
      if (gym.fixedBars && gym.fixedBars.length) return [...gym.fixedBars].sort((a, b) => a - b);
      return reachableBarTotals(gym.ezBarKg, gym.plates);
    case "plate_machine": {
      const out = [0];
      const step = Math.min(...gym.plates);
      for (let w = step; w <= 300; w = round2(w + step)) out.push(w);
      return out;
    }
    case "dumbbell_pair":
    case "dumbbell_one": {
      if (gym.dbLadder && gym.dbLadder.length) return [...gym.dbLadder].sort((a, b) => a - b);
      const out = [];
      for (let w = gym.dbMin; w <= gym.dbMax; w = round2(w + gym.dbStep)) out.push(w);
      return out;
    }
    case "machine_stack":
    case "cable": {
      const out = [];
      for (let w = gym.stackMin; w <= gym.stackMax; w = round2(w + gym.stackStep)) out.push(w);
      return out;
    }
    case "bodyweight":
    case "assisted": {
      const out = [0];
      const step = Math.min(...gym.plates, 1.25);
      for (let w = step; w <= 100; w = round2(w + step)) out.push(w);
      return out;
    }
    case "banded":
      return [1, 2, 3, 4, 5];
    default:
      return [];
  }
}

/** Smallest weight this gym can actually make that is heavier than `current`. */
export function nextLoad(current, loadType, gym) {
  const t = LOAD_TYPES[loadType];
  const ladder = ladderFor(loadType, gym);
  const cur = Number(current) || 0;
  if (!ladder.length) return round2(cur + 2.5);
  // Assisted machines run backwards: progress means LESS assistance.
  if (t && t.inverted) {
    const below = ladder.filter(w => w < cur - 1e-9);
    return below.length ? below[below.length - 1] : 0;
  }
  const above = ladder.find(w => w > cur + 1e-9);
  return above !== undefined ? above : round2(cur + (gym.stackStep || 2.5));
}

/** One step easier. */
export function prevLoad(current, loadType, gym) {
  const t = LOAD_TYPES[loadType];
  const ladder = ladderFor(loadType, gym);
  const cur = Number(current) || 0;
  if (!ladder.length) return Math.max(0, round2(cur - 2.5));
  if (t && t.inverted) {
    const above = ladder.find(w => w > cur + 1e-9);
    return above !== undefined ? above : cur;
  }
  const below = ladder.filter(w => w < cur - 1e-9);
  return below.length ? below[below.length - 1] : ladder[0];
}

/** Snap a typed number onto the nearest weight the gym can make. */
export function snapLoad(value, loadType, gym) {
  const ladder = ladderFor(loadType, gym);
  const v = Number(value);
  if (!isFinite(v) || !ladder.length) return v;
  let best = ladder[0], bestD = Infinity;
  for (const w of ladder) {
    const d = Math.abs(w - v);
    if (d < bestD) { bestD = d; best = w; }
  }
  return best;
}

/** How big the next jump is, for display: "+2.5" */
export function stepSize(current, loadType, gym) {
  return round2(Math.abs(nextLoad(current, loadType, gym) - (Number(current) || 0)));
}

/* ---------- volume ---------- */

/** Weight actually moved by the body, for tonnage. Dumbbell pairs count twice. */
export function effectiveKg(kg, loadType, bodyweightKg = 80) {
  const n = Number(kg) || 0;
  switch (loadType) {
    case "dumbbell_pair": return n * 2;
    case "plate_machine": return n * 2;
    case "bodyweight": return n + bodyweightKg * 0.65;
    case "assisted": return Math.max(0, bodyweightKg - n);
    case "banded": return n * 5;
    default: return n;
  }
}

export function unitLabel(loadType) {
  return (LOAD_TYPES[loadType] || {}).label || "kg";
}
export function unitHint(loadType) {
  return (LOAD_TYPES[loadType] || {}).hint || "";
}
export function allowsZero(loadType) {
  return !!(LOAD_TYPES[loadType] || {}).allowZero;
}

export function round2(n) { return Math.round(n * 100) / 100; }
export function fmtKg(n) {
  const v = Number(n);
  if (!isFinite(v)) return "—";
  return (Math.round(v * 100) / 100).toString();
}

/** Warm-up ramp for a heavy first lift. */
export function warmupSets(workKg, loadType, gym) {
  const t = LOAD_TYPES[loadType];
  const base = t && t.bar ? (gym[t.bar] || 20) : 0;
  const target = Number(workKg) || 0;
  if (target <= base + 1e-9) return [];
  const plan = [[0.4, 8], [0.6, 5], [0.8, 3], [0.9, 1]];
  const out = [];
  let last = -1;
  for (const [pct, reps] of plan) {
    const raw = base + (target - base) * pct;
    const w = snapLoad(raw, loadType, gym);
    if (w >= target - 1e-9 || w === last) continue;
    out.push({ kg: w, reps });
    last = w;
  }
  return out;
}
