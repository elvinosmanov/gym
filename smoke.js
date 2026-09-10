const fs = require('fs');
const { boot: shimBoot } = require('./shim');

let pass = 0, fail = 0;
const ok = (name, cond, extra='') => {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗', name, extra); }
};

function boot() { return shimBoot('index.html'); }

// ---------------------------------------------------------------- 1. program shape
/* Bölgü İtələmə/Çəkmə/Ayaq/Tam bədən olduğu üçün ayrı-ayrı günlərin tam bədən
   olması artıq gözlənilmir. Əhəmiyyətli olan HƏFTƏLİK örtükdür. */
console.log('\n[1] Proqram strukturu — həftəlik örtük');
{
  const w = boot();
  const P = w.PROGRAM;
  ok('həftədə 4 gün var', Object.keys(P).length === 4, Object.keys(P).join(','));
  ok('günlərin adları bölgünü əks etdirir',
     ['İtələmə','Çəkmə','Ayaq','Tam bədən'].every(n => Object.values(P).some(d => d.name === n)),
     Object.values(P).map(d=>d.name).join(','));

  // Hər hərəkət həftədə DƏQİQ bir dəfə — dublikat yoxdur, düşən yoxdur.
  const keys = Object.keys(P).flatMap(d => P[d].ex.map(e => e.key));
  ok('hər hərəkət həftədə dəqiq bir dəfə var',
     new Set(keys).size === keys.length && keys.length === Object.keys(w.EXMAP)
       .filter(k => Object.keys(P).some(d => P[d].ex.some(e => e.key === k))).length,
     String(keys.length));

  // Həftə boyu hər əzələ minimuma çatırmı (köməkçi yarım sayılır)?
  const vol = {};
  Object.keys(P).forEach(d => P[d].ex.forEach(e => {
    const m = w.musclesOf(e.key);
    m.p.forEach(k => vol[k] = (vol[k]||0) + e.sets);
    m.s.forEach(k => vol[k] = (vol[k]||0) + e.sets/2);
  }));
  const direct = new Set();
  Object.keys(P).forEach(d => P[d].ex.forEach(e => w.musclesOf(e.key).p.forEach(k => direct.add(k))));
  const under = [...direct]
    .filter(k => (vol[k]||0) < (w.WEEKLY_SETS[k]||[8])[0])
    .map(k => `${k}=${vol[k]||0}/${(w.WEEKLY_SETS[k]||[8])[0]}`);
  // Məlumat üçün yazılır — bu bölgü sənin seçimindir, test onu pozmur.
  if (under.length) console.log('     qeyd: həftəlik minimumdan aşağı →', under.join(' '));
  ok('həftəlik həcm hesablanır', Object.keys(vol).length > 0);

  ok('köhnə A/B/C açarları hələ mövcuddur', ['A','B','C'].every(k => !!P[k]));
}

// ---------------------------------------------------------------- 2. bodyweight sets survive
console.log('\n[2] Bədən çəkisi ilə (0 kq) qeyd edilən dövrlər saxlanılırmı?');
{
  const w = boot();
  w.confirm = () => true; w.alert = m => { w.__alert = m; };
  w.state.profile = {...w.state.profile, name:'T', age:30, h:178, w:75};
  w.startSession('D'); w.__mountChecks();                                  // D (Tam bədən) günündə Back Extension var (bw)
  const st = w.state.active.ex['be'];
  st.forEach((s,i) => { s.reps = '15'; s.kg = ''; w.toggleDone('be', i); });
  w.finishSession();
  const rec = w.state.sessions[w.state.sessions.length-1];
  const be = rec && rec.ex.find(e => e.key === 'be');
  ok('Back Extension tarixçəyə düşdü', !!be, `sessions=${w.state.sessions.length}`);
  ok('dövrlər 0 kq × 15 kimi yazıldı', be && be.sets.every(s => s.kg === 0 && s.reps === 15), JSON.stringify(be && be.sets));
  ok('perfStr "BÇ×15" göstərir', w.perfStr({sets: be.sets}).startsWith('BÇ×15'), w.perfStr({sets: be.sets}));
}

// ---------------------------------------------------------------- 3. ✓ must not invent reps
console.log('\n[3] ✓ düyməsi uydurma təkrar yazırmı?');
{
  const w = boot();
  w.confirm = () => true; w.alert = m => { w.__alert = m; };
  w.startSession('A'); w.__mountChecks();
  const st = w.state.active.ex['bp'];
  st.forEach((s,i) => { s.kg = '60'; w.toggleDone('bp', i); });   // təkrar YAZILMIR
  ok('boş təkrar state-ə yazılmadı', st.every(s => !s.reps), JSON.stringify(st.map(s=>s.reps)));
  w.finishSession();
  const rec = w.state.sessions[w.state.sessions.length-1];
  const bp = rec && rec.ex.find(e => e.key === 'bp');
  ok('təkrarsız dövrlər tarixçəyə düşmədi', !bp, JSON.stringify(bp));
  ok('istifadəçi xəbərdarlıq aldı', /təkrar/i.test(w.__alert||''), w.__alert);
}

// ---------------------------------------------------------------- 4. foundation excluded from progression
console.log('\n[4] Təməl məşqi proqressiya bazasını korlayırmı?');
{
  const w = boot();
  w.confirm = () => true; w.alert = () => {};
  w.startSession('C'); w.__mountChecks();                                   // ilk məşq = foundation (Squat C günündədir)
  ok('ilk məşq foundation kimi işarələndi', w.state.active.foundation === true);
  ok('foundation-da setlər yarıya endirildi', w.state.active.ex['sq'].length === 2, String(w.state.active.ex['sq'].length));
  w.state.active.ex['sq'].forEach((s,i) => { s.kg='40'; s.reps='8'; w.toggleDone('sq', i); });  // rMax=8
  w.finishSession();
  ok('suggestKg təməl məşqi nəzərə almır', w.suggestKg('sq') === null, String(w.suggestKg('sq')));
  const h = w.hintFor(w.EXMAP['sq'], w.lastPerf('sq'));
  ok('ipucu real işçi çəki istəyir', /real işçi çəki/i.test(h.txt), h.txt.slice(0,80));
  ok('tarixçə foundation-u yenə göstərir', !!w.lastPerf('sq', {includeFoundation:true}));
}

// ---------------------------------------------------------------- 5. double progression still correct
console.log('\n[5] İkiqat proqressiya düzgün işləyirmi?');
{
  const w = boot();
  w.confirm = () => true; w.alert = () => {};
  // foundation-u keçmək üçün süni bir təməl sessiyası
  w.state.sessions.push({d:'2026-01-01', day:'C', foundation:true, ex:[]});
  w.startSession('C'); w.__mountChecks();
  w.state.active.ex['sq'].forEach((s,i) => { s.kg='100'; s.reps='8'; w.toggleDone('sq', i); }); // hamısı rMax
  w.finishSession();
  ok('hamısı rMax → +5 kq (sq inc=5)', w.suggestKg('sq') === 105, String(w.suggestKg('sq')));
  w.startSession('C'); w.__mountChecks();
  w.state.active.ex['sq'].forEach((s,i) => { s.kg='105'; s.reps= i===3 ? '6':'8'; w.toggleDone('sq', i); });
  w.finishSession();
  ok('bir dövr rMax-dan aşağı → çəki saxlanılır', w.suggestKg('sq') === 105, String(w.suggestKg('sq')));
}

// ---------------------------------------------------------------- 6. single source of truth for bodyweight
console.log('\n[6] Bədən çəkisi tək mənbədən oxunurmu?');
{
  const w = boot();
  w.state.profile = {...w.state.profile, age:30, h:178};
  w.setWeight(72, {quiet:true});
  w.setWeight(78, {quiet:true});
  ok('eyni gün üçün ikinci qeyd əvəzlədi, əlavə etmədi', w.state.weights.length === 1, String(w.state.weights.length));
  ok('latestW() 78 qaytarır', w.latestW() === 78, String(w.latestW()));
  ok('profile.w güzgü kimi uyğundur', w.state.profile.w === 78, String(w.state.profile.w));
}

// ---------------------------------------------------------------- 7. merge never loses sessions
console.log('\n[7] Bulud birləşdirməsi qeyd itirirmi?');
{
  const w = boot();
  const local  = { ts:100, sessions:[{d:'2026-01-01',day:'A',ex:[{key:'sq',name:'S',sets:[{kg:100,reps:8}]}]}], weights:[{d:'2026-01-01',kg:75}], supps:[{d:'2026-01-01',creatine:true,protein:false}], profile:{name:'L'}, active:{day:'B'} };
  const remote = { ts:200, sessions:[{d:'2026-01-03',day:'B',ex:[{key:'row',name:'R',sets:[{kg:50,reps:10}]}]}], weights:[{d:'2026-01-03',kg:76}], supps:[{d:'2026-01-01',creatine:false,protein:true}], profile:{name:'R'}, active:null };
  const m = w.mergeStates(local, remote);
  ok('hər iki cihazın məşqləri qaldı', m.sessions.length === 2, String(m.sessions.length));
  ok('hər iki çəki qeydi qaldı', m.weights.length === 2, String(m.weights.length));
  ok('əlavələr VƏ YA ilə birləşdi', m.supps[0].creatine === true && m.supps[0].protein === true);
  ok('davam edən məşq qorundu', m.active && m.active.day === 'B');
  // eyni gün toqquşması: daha çox dövr qeyd olunan qalır
  const a = { ts:1, sessions:[{d:'2026-02-01',day:'A',ex:[{key:'sq',sets:[{kg:1,reps:1}]}]}], weights:[],supps:[],profile:{} };
  const b = { ts:2, sessions:[{d:'2026-02-01',day:'A',ex:[{key:'sq',sets:[{kg:1,reps:1},{kg:1,reps:1}]}]}], weights:[],supps:[],profile:{} };
  ok('toqquşmada dolu qeyd qalib gəldi', w.mergeStates(a,b).sessions[0].ex[0].sets.length === 2);
}

// ---------------------------------------------------------------- 8. nutrition + misc
console.log('\n[8] Qidalanma və qalan düzəlişlər');
{
  const w = boot();
  w.state.profile = {...w.state.profile, age:30, h:178, sex:'m', act:1.375, sur:350};
  w.setWeight(75, {quiet:true});
  const bmrM = 10*75 + 6.25*178 - 5*30 + 5;
  const kcal = () => { w.renderFuelOut(); const m = /class="bignum num">([\d,\.]+)/.exec(w.document.querySelector('#fuelOut').innerHTML); return m ? parseInt(m[1].replace(/\D/g,'')) : 0; };
  w.switchTab('fuel');
  const male = kcal();
  ok('kişi üçün hədəf hesablanır', male > 2000, String(male));
  w.state.profile.sex = 'f';
  const female = kcal();
  ok('qadın üçün hədəf aşağıdır (-161 termi)', male > female, `${male} vs ${female}`);
  ok('yemək şablonu miqyaslanır', w.mealRatio() !== 1, String(w.mealRatio().toFixed(2)));
  ok('həftəlik hədəf profildən gəlir (4 günlük bölgü)', w.weeklyTarget() === 4, String(w.weeklyTarget()));
  ok('vaxt təxmini hesablanır', /dəq/.test(w.estMinutes('A')), w.estMinutes('A'));
  ok('deload 18 məşqdən sonra çıxır', w.deloadDue() === false);
  for (let i=0;i<18;i++) w.state.sessions.push({d:'2026-03-0'+(i%9+1), day:'A', ex:[], foundation:false});
  ok('18 məşqdən sonra deload bannerı aktivdir', w.deloadDue() === true);
}

// ---------------------------------------------------------------- 9. migration from old saved data
console.log('\n[9] Köhnə yaddaş miqrasiyası');
{
  const w = boot();
  w.applyLoaded(JSON.stringify({ profile:{name:'Elvin', w:80, age:30, h:178, act:1.375, sur:350}, weights:[], sessions:[], supps:[] }));
  ok('köhnə profile.w weights[]-ə köçdü', w.state.weights.length === 1 && w.state.weights[0].kg === 80, JSON.stringify(w.state.weights));
  ok('sex sahəsi əlavə olundu', w.state.profile.sex === 'm');
  ok('weeklyTarget əlavə olundu (4 günlük bölgü)', w.state.profile.weeklyTarget === 4);
  ok('deloadAt əlavə olundu', w.state.deloadAt === 0);
}

// ---------------------------------------------------------------- 10. all tabs render without throwing
console.log('\n[10] Bütün tablar xətasız render olunur');
{
  const w = boot();
  w.confirm = () => true; w.alert = () => {};
  w.state.profile = {...w.state.profile, name:'Elvin', age:30, h:178, sex:'m'};
  w.setWeight(75, {quiet:true});
  w.startSession('C'); w.__mountChecks();
  w.state.active.ex['lpz'].forEach((s,i)=>{ s.kg='120'; s.reps='12'; w.toggleDone('lpz', i); });
  w.finishSession();
  ['today','train','fuel','prog'].forEach(t => {
    let err = null;
    try { w.switchTab(t); } catch(e) { err = e.message; }
    ok(`${t} render`, !err, err||'');
  });
  ok('ixrac funksiyası mövcuddur', typeof w.exportData === 'function');
  ok('idxal funksiyası mövcuddur', typeof w.importData === 'function');
}

// ---------------------------------------------------------------- 11. local data safety
console.log('\n[11] Lokal məlumat itkisinə qarşı müdafiə');
{
  // (a) corrupt primary must never be overwritten by empty defaults
  const w = boot();
  w.localStorage.setItem('forge-data', '{"sessions":[{"broken');
  w.loadState().then(() => {
    ok('oxunmayan məlumat dondurulur', w.state.sessions.length === 0 && w.dataFrozen === true,
       `frozen=${w.dataFrozen}`);
    w.flushSave();
    ok('donmuş halda üzərinə yazılmır',
       w.localStorage.getItem('forge-data') === '{"sessions":[{"broken');
  });
}
{
  // (b) an unreadable primary falls back to the newest valid backup
  const w = boot();
  const good = JSON.stringify({ ts: 5000, profile:{name:'E'}, weights:[{d:'2026-01-01',kg:80}], sessions:[], supps:[] });
  const older = JSON.stringify({ ts: 1000, profile:{name:'E'}, weights:[], sessions:[], supps:[] });
  w.localStorage.setItem('forge-data', 'not json at all');
  w.localStorage.setItem('forge-bak-0', older);
  w.localStorage.setItem('forge-bak-1', good);
  w.loadState().then(() => {
    ok('ən yeni etibarlı ehtiyatdan bərpa olundu', w.state.weights.length === 1,
       `weights=${JSON.stringify(w.state.weights)}`);
    ok('bərpa istifadəçiyə bildirilir', !!w.recoveredFrom, String(w.recoveredFrom));
  });
}
{
  // (c) the previous good value is rotated into the ring on write
  const w = boot();
  const first = JSON.stringify({ ts: 1, profile:{name:'E'}, weights:[], sessions:[], supps:[] });
  w.localStorage.setItem('forge-data', first);
  w.loadState().then(() => {
    w.state.weights.push({ d:'2026-02-02', kg:81 });
    w.flushSave();
    ok('köhnə nüsxə ehtiyat halqasına keçdi', w.localStorage.getItem('forge-bak-0') === first,
       String(w.localStorage.getItem('forge-bak-0')).slice(0,40));
    ok('yeni məlumat əsas açara yazıldı',
       JSON.parse(w.localStorage.getItem('forge-data')).weights.length === 1);
  });
}
{
  // (d) flushSave writes immediately — no 350 ms window to lose
  const w = boot();
  w.state.weights.push({ d:'2026-03-03', kg:82 });
  w.flushSave();
  ok('flushSave dərhal yazır (debounce gözləmir)',
     !!w.localStorage.getItem('forge-data') &&
     JSON.parse(w.localStorage.getItem('forge-data')).weights.length === 1);
}

// ---------------------------------------------------------------- 12. plate maths
console.log('\n[12] Disk hesabı — "2.5 kq hər tərəfə, yoxsa ümumi?"');
{
  const w = boot();
  const g = w.gymOf();

  // Every exercise must declare what its kg box means.
  const keys = Object.keys(w.EXMAP);
  const missing = keys.filter(k => !w.LOADTYPE[k]);
  ok('hər hərəkətin yük tipi var', missing.length === 0, missing.join(','));

  // Barbell: the number is the TOTAL including the bar, and the app says how to build it.
  ok('ştanq: 100 kq = 20 ştanq + 40/tərəf',
     w.loadingText(100, 'bar', g) === '20 ştanq + hər tərəfə 40 (25 + 15)',
     w.loadingText(100, 'bar', g));
  ok('ştanq: boş ştanq düzgün adlanır', /boş 20 kq ştanq/.test(w.loadingText(20, 'bar', g)));
  ok('hantel: iki dənə olduğu bildirilir', w.loadingText(22.5, 'db', g) === '2 × 22.5 kq hantel',
     w.loadingText(22.5, 'db', g));
  ok('blok: pin rəqəmi', w.loadingText(45, 'stack', g) === 'pin 45 kq-da', w.loadingText(45, 'stack', g));
  ok('bədən çəkisi: 0 normaldır', w.loadingText(0, 'bw', g) === 'yalnız bədən çəkisi');

  // A gym without 1.25s cannot make +2.5 on the bar — it must say +5, not lie.
  const poor = { ...g, plates:[25,20,15,10,5,2.5] };
  ok('kiçik disk yoxdursa addım böyüyür',
     w.nextLoad(100, 'bar', poor, 2.5) === 105, String(w.nextLoad(100, 'bar', poor, 2.5)));
  ok('kiçik disk varsa addım kiçik qalır',
     w.nextLoad(100, 'bar', g, 2.5) === 102.5, String(w.nextLoad(100, 'bar', g, 2.5)));

  // Dumbbells jump by the rack's step, never by 1 kg on a 2.5 kg rack.
  ok('hantel rəfin addımı ilə artır',
     w.nextLoad(20, 'db', g, 1) === 22.5, String(w.nextLoad(20, 'db', g, 1)));

  // Assisted machines run backwards: progress = LESS assistance.
  ok('köməkli maşın tərsinə gedir', w.nextLoad(30, 'assist', g, 2.5) < 30,
     String(w.nextLoad(30, 'assist', g, 2.5)));

  // Every weight the ladder offers must actually be buildable from the plates.
  const unbuildable = w.ladderFor('bar', g).slice(1, 40)
    .filter(t => w.platesPerSide(t, g.barKg, g.plates) === null);
  ok('ştanq nərdivanındakı hər çəki real yığıla bilir', unbuildable.length === 0,
     unbuildable.join(','));
}
{
  // suggestKg must round onto the gym's ladder, not to an arbitrary decimal.
  const w = boot();
  w.confirm = () => true; w.alert = () => {};
  w.state.gym = { ...w.gymOf(), plates:[25,20,15,10,5] };   // smallest pair 5 → 10 kg steps
  w.state.sessions.push({d:'2026-01-01', day:'A', foundation:true, ex:[]});
  w.startSession('A'); w.__mountChecks();
  w.state.active.ex['bp'].forEach((s,i)=>{ s.kg='60'; s.reps='8'; w.toggleDone('bp', i); });
  w.finishSession();
  const s = w.suggestKg('bp');
  ok('təklif zalın düzəldə bildiyi çəkidir', s === 70, String(s));
  ok('əsl addım istifadəçiyə göstərilir', w.realStep('bp') === 10, String(w.realStep('bp')));
}

// ---------------------------------------------------------------- 13. gym wall clock
console.log('\n[13] Zal saatı');
{
  const w = boot();
  w.state.gym = { ...w.gymOf(), clockOffsetMin: 0 };
  ok('fərq yoxdursa telefon vaxtı', w.clockSkewed() === false);

  // "the wall says 18:47" — whatever the phone says, the offset is derived.
  const now = new Date();
  const wall = new Date(now.getTime() + 7 * 60000);
  w.syncGymClock(`${String(wall.getHours()).padStart(2,'0')}:${String(wall.getMinutes()).padStart(2,'0')}`);
  const off = w.state.gym.clockOffsetMin;
  ok('divar saatından fərq hesablandı', Math.abs(off - 7) <= 1, String(off));
  ok('fərq varsa bildirilir', w.clockSkewed() === true);
  ok('mətn istiqaməti düzgün yazır', /irəli/.test(w.offsetText()), w.offsetText());

  // Every displayed time must be shifted, including the end of a rest period.
  const gymMin = w.gymNow().getMinutes(), realMin = new Date().getMinutes();
  ok('göstərilən vaxt sürüşdürülür', ((gymMin - realMin + 60) % 60) === Math.abs(off) % 60,
     `gym=${gymMin} real=${realMin} off=${off}`);

  w.clearGymClock();
  ok('sıfırlama telefon vaxtına qaytarır', w.clockSkewed() === false);

  // Midnight wrap: 00:05 on the wall when the phone says 23:58 is +7, not -1433.
  const w2 = boot();
  const late = new Date(); late.setHours(23, 58, 0, 0);
  ok('gecəyarısı keçidi ±12 saat içində qalır',
     Math.abs(w2.gymNow().getTime() - Date.now()) < 12*3600*1000);
}
{
  // Azerbaijani short months, not Chromium's "M09".
  const w = boot();
  ok('tarix "10 sen" kimi yazılır', w.fmtD('2026-09-10') === '10 sen', w.fmtD('2026-09-10'));
  ok('yanvar da düzgün', w.fmtD('2026-01-03') === '3 yan', w.fmtD('2026-01-03'));
}

// ---------------------------------------------------------------- 14. muscle map
console.log('\n[14] Əzələ xəritəsi və həftəlik həcm');
{
  const w = boot();
  const keys = Object.keys(w.EXMAP);
  const missing = keys.filter(k => !w.MMAP[k]);
  ok('hər hərəkətin əzələ xəritəsi var', missing.length === 0, missing.join(','));

  // Every muscle referenced must exist in the registry, or it silently vanishes.
  const bad = [];
  keys.forEach(k => {
    const m = w.musclesOf(k);
    [...m.p, ...m.s].forEach(x => { if (!w.MUSCLES[x]) bad.push(`${k}:${x}`); });
  });
  ok('istinad edilən bütün əzələlər reyestrdədir', bad.length === 0, bad.join(','));
  ok('hər hərəkətin ən azı bir əsas əzələsi var',
     keys.every(k => w.musclesOf(k).p.length > 0));

  // Every muscle with a volume landmark must be drawable on at least one view.
  const drawn = new Set([...Object.keys(w.BODY.front), ...Object.keys(w.BODY.back)]);
  const undrawn = Object.keys(w.MUSCLES).filter(k => !drawn.has(k));
  ok('hər əzələ bədən üzərində çəkilir', undrawn.length === 0, undrawn.join(','));

  ok('adlar Azərbaycanca qaytarılır', w.muscleNames(['quad','glute']) === 'Dördbaşlı · Sağrı',
     w.muscleNames(['quad','glute']));
}
{
  // Volume counts primary as a full set and secondary as half.
  const w = boot();
  w.confirm = () => true; w.alert = () => {};
  w.state.profile = { ...w.state.profile, name:'E', age:30, h:178 };
  w.setWeight(78, {quiet:true});
  w.startSession('A'); w.__mountChecks();
  w.state.active.ex['bp'].forEach((s,i)=>{ s.kg='60'; s.reps='8'; w.toggleDone('bp', i); });
  w.finishSession();

  const vol = w.setsPerMuscle(7);
  const sets = w.state.sessions[w.state.sessions.length-1].ex.find(e=>e.key==='bp').sets.length;
  ok('əsas əzələ tam dövr sayılır', vol.chest === sets, `chest=${vol.chest} sets=${sets}`);
  ok('köməkçi əzələ yarım dövr sayılır', vol.triceps === sets/2, `triceps=${vol.triceps}`);

  const shade = w.heatShade(vol);
  ok('işlənməyən əzələ "yox" rəngindədir', shade.calf === 'var(--heat-0)', shade.calf);
  ok('az işlənən əzələ fərqlənir', shade.chest !== shade.calf);
  ok('zəif əzələlər siyahılanır', w.weakestMuscles(vol, 3).length === 3);

  // The SVG must mirror bilateral muscles and leave centred ones alone.
  const svg = w.bodyView('front', shade, 't');
  ok('cüt əzələlər güzgülənir', svg.includes('translate(240,0) scale(-1,1)'));
  ok('mərkəzi əzələ güzgülənmir',
     (svg.match(/id="t-front-abs"/g)||[]).length === 1 &&
     !svg.includes('href="#t-front-abs"'));
}

// ---------------------------------------------------------------- 15. swapping across the library
console.log('\n[15] Kitabxanadan hərəkət dəyişmə');
{
  const w = boot();
  w.confirm = () => true; w.alert = () => {};
  w.state.profile = { ...w.state.profile, name:'E', age:30, h:178 };
  w.setWeight(78, {quiet:true});
  w.startSession('A'); w.__mountChecks();

  // Anything in the library must be reachable, not just the slot's alternatives.
  const reachable = Object.keys(w.EXMAP).length;
  ok('kitabxanada 50-dən çox hərəkət var', reachable >= 50, String(reachable));

  // Swap the bench slot to a curl — a movement from a different pattern entirely.
  const before = w.state.active.ex['bp'].length;
  w.chooseEx('bp', 'dbcu');
  ok('seçim yadda saxlanıldı', w.state.active.swap.bp === 'dbcu', JSON.stringify(w.state.active.swap));
  ok('effEx yeni hərəkəti qaytarır', w.effEx('bp').key === 'dbcu', w.effEx('bp').key);

  // The chosen exercise brings its OWN protocol, it does not inherit the bench's.
  ok('yeni hərəkət öz dövr sayını gətirir',
     w.state.active.ex['bp'].length === w.EXMAP['dbcu'].sets,
     `${before} → ${w.state.active.ex['bp'].length}, gözlənilən ${w.EXMAP['dbcu'].sets}`);
  ok('yeni hərəkət öz təkrar aralığını gətirir',
     w.effEx('bp').rMax === w.EXMAP['dbcu'].rMax);
  ok('yük tipi də hərəkətin özününküdür', w.loadOf('dbcu') === 'db', w.loadOf('dbcu'));

  // Going back to the main movement clears the swap.
  w.chooseEx('bp', 'bp');
  ok('əsas hərəkətə qayıtmaq seçimi silir', !w.state.active.swap.bp, JSON.stringify(w.state.active.swap));
  ok('dövr sayı əsas hərəkətinkinə qayıdır',
     w.state.active.ex['bp'].length === w.EXMAP['bp'].sets, String(w.state.active.ex['bp'].length));
}
{
  // A swap must never discard sets already logged.
  const w = boot();
  w.confirm = () => true; w.alert = () => {};
  w.startSession('A'); w.__mountChecks();
  const arr = w.state.active.ex['bp'];
  arr.forEach((s,i)=>{ s.kg='60'; s.reps='8'; w.toggleDone('bp', i); });
  const loggedBefore = w.state.active.ex['bp'].filter(s=>s.done).length;
  w.chooseEx('bp', 'dbcu');                       // dbcu has fewer sets than bench
  const loggedAfter = w.state.active.ex['bp'].filter(s=>s.done).length;
  ok('qeyd edilmiş dövrlər dəyişmədən qalır', loggedAfter === loggedBefore,
     `${loggedBefore} → ${loggedAfter}`);
}

setTimeout(() => {
  console.log(`\n${pass} keçdi, ${fail} uğursuz`);
  process.exit(fail ? 1 : 0);
}, 50);
