const fs = require('fs');
const h = fs.readFileSync('index.html', 'utf8');
const js = h.match(/<script>([\s\S]*)<\/script>/)[1];
/* PROGRAM DAYS-dən qurulur, ona görə kəsik EXDEF-dən başlayır */
const prog = js.slice(js.indexOf('const EXDEF'), js.indexOf('const ROT'));
const alts = js.slice(js.indexOf('const ALTS'), js.indexOf('const ACT_OPTS'));
const { PROGRAM, ALTS } = eval('(function(){' + prog + alts + 'return {PROGRAM, ALTS};})()');

/* Bir hərəkət birdən çox gündə ola bilər (yan delta, baldır və qarın həftədə
   iki dəfə işlənir) — problem yalnız EYNİ gündə təkrar, ya da bir alternativin
   əsas slotla toqquşmasıdır. */
const seen = {}, dup = [];
Object.keys(PROGRAM).forEach(D => {
  const inDay = new Set();
  PROGRAM[D].ex.forEach(e => {
    if (inDay.has(e.key)) dup.push(`${e.key} (${D} günündə iki dəfə)`);
    inDay.add(e.key);
    seen[e.key] = 'main:' + D;
  });
});
Object.keys(ALTS).forEach(k => ALTS[k].forEach(a => {
  if (seen[a.key]) dup.push(`${a.key} (alt of ${k}) clashes with ${seen[a.key]}`);
  seen[a.key] = 'alt:' + k;
}));
console.log('duplicate keys:', dup.length ? dup : 'NONE');

const REQ = ['key','name','tag','sets','rMin','rMax','rest','inc','cues','mist'];
Object.keys(PROGRAM).forEach(D => {
  const ex = PROGRAM[D].ex;
  const sets = ex.reduce((a, e) => a + e.sets, 0);
  const secs = ex.reduce((a, e) => a + e.sets * (40 + e.rest), 0);
  console.log(`${D} "${PROGRAM[D].sub}" — ${ex.length} hərəkət, ${sets} set, ~${Math.round(secs/60)} dəq`);
  ex.forEach(e => {
    const miss = REQ.filter(f => e[f] === undefined);
    if (miss.length) console.log('   !! missing fields on', e.key, miss);
    if (!ALTS[e.key] || !ALTS[e.key].length) console.log('   !! no alternative for', e.key);
  });
});
const orphan = Object.keys(ALTS).filter(k => !Object.keys(PROGRAM).some(D => PROGRAM[D].ex.some(e => e.key === k)));
console.log('ALTS keys not matching any main slot:', orphan.length ? orphan : 'NONE');
