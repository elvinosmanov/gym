const fs = require('fs');
const { boot: shimBoot } = require('./shim');

let pass = 0, fail = 0;
const ok = (name, cond, extra='') => {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗', name, extra); }
};

function boot() { return shimBoot('index.html'); }

// ---------------------------------------------------------------- 1. program shape
console.log('\n[1] Proqram strukturu — hər gün tam bədən?');
{
  const w = boot();
  const P = w.PROGRAM;
  const tagsOf = d => P[d].ex.map(e => e.tag).join(' ');
  ['A','B','C'].forEach(d => {
    const t = tagsOf(d);
    const hasLegs = /Dördbaşlı|Arxa bud|Sağrı|Baldır/.test(t);
    const hasPull = P[d].ex.some(e => /kürək/i.test(e.tag));
    const hasPush = P[d].ex.some(e => /Döş|Çiyin|Triseps|delta/i.test(e.tag));
    ok(`${d}: ayaq+çəkmə+itələmə hamısı var`, hasLegs && hasPull && hasPush,
       `legs=${hasLegs} pull=${hasPull} push=${hasPush}`);
  });
}

// ---------------------------------------------------------------- 2. bodyweight sets survive
console.log('\n[2] Bədən çəkisi ilə (0 kq) qeyd edilən dövrlər saxlanılırmı?');
{
  const w = boot();
  w.confirm = () => true; w.alert = m => { w.__alert = m; };
  w.state.profile = {...w.state.profile, name:'T', age:30, h:178, w:75};
  w.startSession('C'); w.__mountChecks();                                  // C-də Back Extension var (bw)
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
  w.startSession('A'); w.__mountChecks();                                   // ilk məşq = foundation
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
  w.state.sessions.push({d:'2026-01-01', day:'A', foundation:true, ex:[]});
  w.startSession('A'); w.__mountChecks();
  w.state.active.ex['sq'].forEach((s,i) => { s.kg='100'; s.reps='8'; w.toggleDone('sq', i); }); // hamısı rMax
  w.finishSession();
  ok('hamısı rMax → +5 kq (sq inc=5)', w.suggestKg('sq') === 105, String(w.suggestKg('sq')));
  w.startSession('A'); w.__mountChecks();
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
  ok('həftəlik hədəf profildən gəlir', w.weeklyTarget() === 3, String(w.weeklyTarget()));
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
  ok('weeklyTarget əlavə olundu', w.state.profile.weeklyTarget === 3);
  ok('deloadAt əlavə olundu', w.state.deloadAt === 0);
}

// ---------------------------------------------------------------- 10. all tabs render without throwing
console.log('\n[10] Bütün tablar xətasız render olunur');
{
  const w = boot();
  w.confirm = () => true; w.alert = () => {};
  w.state.profile = {...w.state.profile, name:'Elvin', age:30, h:178, sex:'m'};
  w.setWeight(75, {quiet:true});
  w.startSession('B'); w.__mountChecks();
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

setTimeout(() => {
  console.log(`\n${pass} keçdi, ${fail} uğursuz`);
  process.exit(fail ? 1 : 0);
}, 50);
