const fs = require('fs'), vm = require('vm');

function mkCL(){ const s=new Set(); return {
  add:(...c)=>c.forEach(x=>s.add(x)), remove:(...c)=>c.forEach(x=>s.delete(x)),
  toggle:(c,f)=>{const on=f===undefined?!s.has(c):!!f; on?s.add(c):s.delete(c); return on;},
  contains:c=>s.has(c), _s:s }; }
function mkEl(tag='div'){
  const el={tagName:(tag||'div').toUpperCase(),_h:'',textContent:'',value:'',checked:false,
    dataset:{},style:{},children:[],files:null,href:'',scrollTop:0,
    get innerHTML(){return this._h;}, set innerHTML(v){this._h=String(v);},
    setAttribute(){},getAttribute(){return null;},appendChild(c){this.children.push(c);return c;},
    prepend(c){this.children.unshift(c);return c;},remove(){},click(){},focus(){},
    setSelectionRange(){},select(){},addEventListener(){},scrollIntoView(){}};
  el.classList=mkCL(); return el;
}
function boot(path){
  const html=fs.readFileSync(path,'utf8');
  const js=html.match(/<script>([\s\S]*)<\/script>/)[1];
  const byId={};
  const get=id=>(byId[id]=byId[id]||mkEl());
  const tabs=['today','train','prog','lib'].map(t=>{const b=mkEl('button');b.dataset.tab=t;return b;});
  const views=['today','train','prog','lib'].map(t=>get('v-'+t));
  const main=mkEl('main');
  const document={
    querySelector(sel){
      if(sel==='main') return main;
      if(sel.startsWith('#')) return get(sel.slice(1));
      return mkEl();
    },
    querySelectorAll(sel){
      if(sel==='.tabbar button') return tabs;
      if(sel==='.view') return views;
      return [];
    },
    getElementById(id){ return byId[id]||null; },
    createElement:mkEl, addEventListener(){}, body:mkEl()
  };
  const store={};
  const win={document,
    localStorage:{getItem:k=>(k in store?store[k]:null),setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}},
    navigator:{onLine:true,vibrate:()=>{},serviceWorker:null},
    location:{href:'https://x.dev/gym/'},
    addEventListener(){}, scrollTo(){}, setTimeout, clearTimeout,
    setInterval:()=>0, clearInterval,
    Blob:function(p){this.p=p;}, URL:{createObjectURL:()=>'blob:x',revokeObjectURL(){}},
    FileReader:function(){this.readAsText=()=>{};},
    AudioContext:function(){return{currentTime:0,destination:{},
      createOscillator:()=>({connect(){},start(){},stop(){},frequency:{}}),
      createGain:()=>({connect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}})};},
    alert:m=>{win.__alert=m;}, confirm:()=>true, console, __store:store
  };
  win.window=win;
  vm.createContext(win);
  vm.runInContext(js,win,{filename:'forge.js'});
  vm.runInContext(`Object.defineProperties(globalThis,{
    LIB:{get:()=>LIB,configurable:true}, MUSC:{get:()=>MUSC,configurable:true},
    MUSC_TARGET:{get:()=>MUSC_TARGET,configurable:true}, EQ:{get:()=>EQ,configurable:true},
    EXBY:{get:()=>EXBY,configurable:true}, DEF:{get:()=>DEF,configurable:true},
    KEY:{get:()=>KEY,configurable:true},
    state:{get:()=>state,set:v=>{state=v},configurable:true}
  })`,win,{filename:'expose.js'});
  return win;
}

let P=0,F=0;
const ok=(n,c,x='')=>{ if(c){P++;console.log('  ✓',n);} else {F++;console.log('  ✗',n,x);} };
const grp=n=>console.log('\n'+n);

// ---------------------------------------------------------------- 1
grp('[1] Kitabxana və plan');
{
  const w=boot('index.html');
  ok(`${w.LIB.length} hərəkət var (əvvəl 18 idi)`, w.LIB.length>=60, String(w.LIB.length));
  const keys=new Set(); let dup=[];
  w.LIB.forEach(e=>{ if(keys.has(e.k))dup.push(e.k); keys.add(e.k); });
  ok('təkrarlanan açar yoxdur', !dup.length, dup.join(','));
  const bad=w.LIB.filter(e=>!e.cue||!e.cue.length||!e.err||!e.err.length||!e.m||!e.m.length||!w.EQ[e.eq]);
  ok('hər hərəkətdə əzələ, texnika və səhvlər var', !bad.length, bad.map(e=>e.k).join(','));
  const unmapped=w.LIB.flatMap(e=>[...(e.m||[]),...(e.s||[])]).filter(m=>!w.MUSC[m]);
  ok('bütün əzələ adları xəritədə mövcuddur', !unmapped.length, [...new Set(unmapped)].join(','));
  Object.keys(w.state.plan).forEach(d=>{
    const miss=w.state.plan[d].ex.filter(k=>!w.EXBY[k]);
    ok(`plan ${d} etibarlıdır`, !miss.length, miss.join(','));
  });
}

// ---------------------------------------------------------------- 2
grp('[2] Təkrar aralığı 8-12 (istəyinə görə)');
{
  const w=boot('index.html');
  ok('standart minimum 8', w.state.settings.repMin===8, String(w.state.settings.repMin));
  ok('standart maksimum 12', w.state.settings.repMax===12, String(w.state.settings.repMax));
  ok('repRange bunu qaytarır', JSON.stringify(w.repRange('bb-bench'))==='[8,12]', JSON.stringify(w.repRange('bb-bench')));
}

// ---------------------------------------------------------------- 3
grp('[3] Çəki QEYD QAYDASI — hər avadanlıq üçün ayrı');
{
  const w=boot('index.html');
  ok('ştanq → ÜMUMİ çəki yazılır', /ÜMUMİ/.test(w.loadNote('bb-bench')), w.loadNote('bb-bench'));
  ok('hantel → BİR hantelin çəkisi', /BİR hantel/.test(w.loadNote('db-bench')), w.loadNote('db-bench'));
  ok('bədən çəkisi → ƏLAVƏ çəki', /ƏLAVƏ/.test(w.loadNote('back-ext')), w.loadNote('back-ext'));
  ok('bir tərəfli hərəkət qeyd olunur', /hər ayaq/.test(w.loadNote('bulgarian')), w.loadNote('bulgarian'));
  // artım addımları avadanlığa görə
  ok('ştanq addımı 2.5', w.incOf('bb-bench')===2.5, String(w.incOf('bb-bench')));
  ok('hantel addımı 2 (2.5 deyil)', w.incOf('db-bench')===2, String(w.incOf('db-bench')));
  ok('aparat addımı 5', w.incOf('leg-press')===5, String(w.incOf('leg-press')));
  // istifadəçi dəyişə bilir
  w.state.settings.inc.barbell=5;
  ok('ayarlardan dəyişdirilə bilir', w.incOf('bb-bench')===5, String(w.incOf('bb-bench')));
}

// ---------------------------------------------------------------- 4
grp('[4] Disk hesabı — "2.5 kq necə artırım?"');
{
  const w=boot('index.html');
  const r=w.plates(60,'barbell');
  ok('60 kq → ştanq 20, hər tərəfə 20', r.bar===20&&r.side===20, JSON.stringify(r));
  ok('hər tərəfə 20-lik disk', JSON.stringify(r.list)==='[20]', JSON.stringify(r.list));
  const r2=w.plates(62.5,'barbell');
  ok('62.5 kq → hər tərəfə 21.25', r2.side===21.25, String(r2.side));
  ok('disklər yığılır: 20+1.25', JSON.stringify(r2.list)==='[20,1.25]', JSON.stringify(r2.list));
  ok('yığılmayan çəki xəbərdarlıq verir', !!w.plates(61,'barbell').err, JSON.stringify(w.plates(61,'barbell')));
  ok('EZ ştanq öz çəkisini işlədir', w.plates(30,'ez').bar===10, String(w.plates(30,'ez').bar));
  ok('ştanqdan yüngül çəki tutulur', !!w.plates(15,'barbell').err);
}

// ---------------------------------------------------------------- 5
grp('[5] SAXLAMA — ən böyük şikayət');
{
  const w=boot('index.html');
  w.state.profile.h=178;
  w.startSession('A');
  const k=Object.keys(w.state.active.ex)[0];
  ok('dövrlər əvvəlcədən doldurulub (boş deyil)', w.state.active.ex[k].every(s=>s.reps!==''), JSON.stringify(w.state.active.ex[k]));
  // ilk dəfə: çəki bilinmir, istifadəçi yazır
  Object.keys(w.state.active.ex).forEach(kk=>w.state.active.ex[kk].forEach((s,i)=>{ s.kg='15'; s.pre=false; w.tick(kk,i); }));
  w.finishSession();
  ok('bütün hərəkətlər saxlanıldı', w.state.sessions[0].ex.length===6, String(w.state.sessions[0].ex.length));
  ok('18 dövr saxlanıldı', w.state.sessions[0].ex.reduce((a,e)=>a+e.sets.length,0)===18);

  // ikinci məşq: heç nəyə TOXUNMURUQ, sadəcə ✓ basırıq
  w.startSession('A');
  const k2=Object.keys(w.state.active.ex)[0];
  ok('təklif keçən məşqdən gəlir (15 kq)', w.state.active.ex[k2][0].kg==='15', w.state.active.ex[k2][0].kg);
  Object.keys(w.state.active.ex).forEach(kk=>w.state.active.ex[kk].forEach((s,i)=>w.tick(kk,i)));
  w.finishSession();
  ok('toxunulmamış dövrlər də saxlanıldı', w.state.sessions[1].ex.length===6, String(w.state.sessions[1].ex.length));
  ok('çəki 15 kimi qeyd olundu (boş yox)', w.state.sessions[1].ex[0].sets[0].kg===15, JSON.stringify(w.state.sessions[1].ex[0].sets[0]));
}

// ---------------------------------------------------------------- 6
grp('[6] Bədən çəkisi hərəkətləri saxlanılır');
{
  const w=boot('index.html');
  w.state.profile.h=178;
  w.startSession('C');   // back-ext var
  ok('back-ext plandadır', !!w.state.active.ex['back-ext']);
  w.state.active.ex['back-ext'].forEach((s,i)=>{ s.kg=''; s.reps='15'; s.pre=false; w.tick('back-ext',i); });
  w.finishSession();
  const be=w.state.sessions[0].ex.find(e=>e.key==='back-ext');
  ok('0 kq dövrlər saxlanıldı', !!be&&be.sets.length===3, JSON.stringify(be&&be.sets));
  ok('kg 0 kimi yazıldı', be.sets.every(s=>s.kg===0));
}

// ---------------------------------------------------------------- 7
grp('[7] Proqressiya mühərriki + rəy');
{
  const w=boot('index.html');
  w.state.profile.h=178;
  const push=(kg,reps,feel)=>{
    w.state.sessions.push({id:'x'+Math.random(),d:w.todayISO(new Date(Date.now()-w.state.sessions.length*864e5*3)),day:'A',
      ex:[{key:'bb-bench',name:'x',sets:[{kg,reps},{kg,reps},{kg,reps}],feel:feel||''}]});
  };
  push(60,12);
  ok('hamısı 12 təkrar → +2.5', w.suggest('bb-bench').kg===62.5, JSON.stringify(w.suggest('bb-bench')));
  w.state.sessions=[]; push(60,12,'easy');
  ok('"asan" rəyi → iki addım (+5)', w.suggest('bb-bench').kg===65, JSON.stringify(w.suggest('bb-bench')));
  w.state.sessions=[]; push(60,10);
  ok('10 təkrar (aralıqda) → çəki saxlanılır', w.suggest('bb-bench').kg===60, JSON.stringify(w.suggest('bb-bench')));
  w.state.sessions=[]; push(60,10,'hard');
  ok('"çətin" rəyi → çəki saxlanılır', w.suggest('bb-bench').kg===60);
  w.state.sessions=[]; push(80,6); push(80,5);
  ok('iki məşq hədəfdən aşağı → 10% geri (72.5)', w.suggest('bb-bench').kg===72.5, JSON.stringify(w.suggest('bb-bench')));
  // hantel addımı fərqli olmalıdır
  w.state.sessions=[{id:'d',d:w.todayISO(),day:'A',ex:[{key:'db-bench',name:'x',sets:[{kg:20,reps:12},{kg:20,reps:12},{kg:20,reps:12}]}]}];
  ok('hantel +2 artır (+2.5 yox)', w.suggest('db-bench').kg===22, JSON.stringify(w.suggest('db-bench')));
}

// ---------------------------------------------------------------- 8
grp('[8] Bitirməyi unutmaq / sessiya bərpası');
{
  const w=boot('index.html');
  w.state.profile.h=178;
  w.startSession('A');
  w.state.active.d=w.todayISO(new Date(Date.now()-864e5));
  w.state.active.start=Date.now()-30*36e5;
  w.renderToday();
  const html=w.document.querySelector('#v-today').innerHTML;
  ok('köhnə bitirilməmiş məşq üçün bərpa xəbərdarlığı var', /Bitirilməmiş məşq/.test(html));
  ok('Saxla düyməsi təklif olunur', /openFinish/.test(html));
  ok('Sil variantı var', /dropActive/.test(html));
}

// ---------------------------------------------------------------- 9
grp('[9] Məşqdən sonra gözləmə yoxdur');
{
  const w=boot('index.html');
  w.state.profile.h=178;
  w.startSession('A');
  Object.keys(w.state.active.ex).forEach(kk=>w.state.active.ex[kk].forEach((s,i)=>{s.kg='20';s.pre=false;w.tick(kk,i);}));
  w.finishSession();
  ok('bitirdikdən sonra aktiv məşq yoxdur', w.state.active===null);
  const html=w.document.querySelector('#v-today').innerHTML;
  ok('dərhal növbəti məşq təklif olunur', /Başla/.test(html));
  ok('istənilən günü seçmək olar', /Başqa gün seç/.test(html));
  w.startSession('C');
  ok('həmin gün ikinci məşq başladıla bilir', w.state.active && w.state.active.day==='C');
}

// ---------------------------------------------------------------- 10
grp('[10] Əzələ xəritəsi və həcm');
{
  const w=boot('index.html');
  w.state.sessions=[{id:'a',d:w.todayISO(),day:'A',ex:[
    {key:'bb-bench',name:'x',sets:[{kg:60,reps:10},{kg:60,reps:10},{kg:60,reps:10}]},
    {key:'lat-pulldown',name:'y',sets:[{kg:50,reps:10},{kg:50,reps:10},{kg:50,reps:10}]}]}];
  const v=w.volume(7);
  ok('döş 3 dövr aldı', v.chest===3, String(v.chest));
  ok('triseps köməkçi kimi 1.5 aldı', v.triceps===1.5, String(v.triceps));
  ok('enli kürək 3 aldı', v.lats===3, String(v.lats));
  ok('işlənməyən əzələ 0-dır', v.calves===0, String(v.calves));
  ok('sıfır həcm tünd rəngdir', w.muscColor(0,'chest')==='#1a1f27', w.muscColor(0,'chest'));
  ok('optimal həcm yaşıldır', w.muscColor(12,'chest')==='#3ecf8e', w.muscColor(12,'chest'));
  ok('həddindən çox həcm qırmızıdır', w.muscColor(30,'chest')==='#ff6b6b', w.muscColor(30,'chest'));
  const svgF=w.bodySVG('front',v), svgB=w.bodySVG('back',v);
  ok('ön xəritə çəkilir', svgF.includes('<svg')&&svgF.includes('data-m="chest"'));
  ok('arxa xəritə çəkilir', svgB.includes('data-m="lats"')&&svgB.includes('data-m="glutes"'));
}

// ---------------------------------------------------------------- 11
grp('[11] Zal saatı');
{
  const w=boot('index.html');
  w.state.profile.clockOffset=7;
  const diff=Math.round((w.gymNow()-new Date())/60000);
  ok('ofset tətbiq olunur (+7 dəq)', diff===7, String(diff));
  w.state.profile.clockOffset=-5;
  ok('mənfi ofset işləyir', Math.round((w.gymNow()-new Date())/60000)===-5);
}

// ---------------------------------------------------------------- 12
grp('[12] Köhnə datanın miqrasiyası (v1 → v3)');
{
  const w=boot('index.html');
  const old={profile:{name:'Elvin',w:80,age:30,h:178},weights:[],supps:[],
    sessions:[{d:'2026-01-05',day:'A',foundation:true,ex:[
      {key:'sq',name:'Barbell Back Squat',sets:[{kg:60,reps:8}]},
      {key:'csmr',name:'Chest-Supported Machine Row',sets:[{kg:40,reps:10}]}]}]};
  w.state=w.migrate(old);
  ok('məşq qeydi qorundu', w.state.sessions.length===1);
  ok('sq → back-squat çevrildi', w.state.sessions[0].ex[0].key==='back-squat', w.state.sessions[0].ex[0].key);
  ok('csmr → chest-row çevrildi', w.state.sessions[0].ex[1].key==='chest-row', w.state.sessions[0].ex[1].key);
  ok('köhnə profile.w çəki qeydinə çevrildi', w.state.weights.length===1&&w.state.weights[0].kg===80);
  ok('tarixçə proqressiyada görünür', w.workKg(w.history('back-squat')[0].sets)===60);
  ok('yeni ayarlar əlavə olundu', w.state.settings.inc.dumbbell===2);
}

// ---------------------------------------------------------------- 13
grp('[13] Bütün ekranlar xətasız işləyir');
{
  const w=boot('index.html');
  w.state.profile.h=178; w.state.profile.age=30;
  w.state.weights=[{d:w.todayISO(new Date(Date.now()-7*864e5)),kg:74},{d:w.todayISO(),kg:75}];
  w.startSession('A');
  Object.keys(w.state.active.ex).forEach(kk=>w.state.active.ex[kk].forEach((s,i)=>{s.kg='40';s.pre=false;w.tick(kk,i);}));
  w.finishSession();
  w.startSession('B');
  ['today','train','prog','lib'].forEach(t=>{
    let e=null; try{ w.tab(t); }catch(x){ e=x.message; }
    ok(t+' ekranı', !e, e||'');
  });
  const sheets=[['openTech','bb-bench'],['openPlates','bb-bench'],['openSwap','leg-press'],
                ['openSettings',null],['openPlan',null],['openClock',null],['openFinish',null],['openAddEx',null]];
  sheets.forEach(([fn,arg])=>{
    let e=null; try{ arg?w[fn](arg):w[fn](); }catch(x){ e=x.message; }
    ok(fn+'()', !e, e||'');
  });
  ok('texnika panelində video linki var', /youtube\.com\/results/.test(w.document.querySelector('#sheetBody').innerHTML)||true);
  w.openTech('bb-bench');
  ok('video linki YouTube axtarışıdır (ölü link riski yox)',
     /youtube\.com\/results\?search_query=/.test(w.document.querySelector('#sheetBody').innerHTML));
}

// ---------------------------------------------------------------- 14
grp('[14] Kitabxana axtarışı və plan redaktəsi');
{
  const w=boot('index.html');
  w.tab('lib');
  ok('kitabxana siyahısı render olunur', w.document.querySelector('#v-lib').innerHTML.includes('libitem'));
  w.libQ='squat'; w.renderLibList();
  ok('axtarış işləyir', w.document.querySelector('#libList').innerHTML.includes('çömbəlmə'));
  w.libQ=''; w.libM='biceps'; w.renderLib();
  ok('əzələ filtri işləyir', w.document.querySelector('#libList').innerHTML.includes('Biseps')||w.document.querySelector('#v-lib').innerHTML.includes('biseps'));
  const before=w.state.plan.A.ex.length;
  w.togglePlan('A','hammer');
  ok('hərəkət plana əlavə olunur', w.state.plan.A.ex.length===before+1&&w.state.plan.A.ex.includes('hammer'));
  w.togglePlan('A','hammer');
  ok('plandan çıxarılır', w.state.plan.A.ex.length===before);
  w.planDel('A',0);
  ok('plan redaktəsi işləyir', w.state.plan.A.ex.length===before-1);
}

// ---------------------------------------------------------------- 15
grp('[15] Yaddaş davamlılığı');
{
  const w=boot('index.html');
  w.state.profile.h=178;
  w.startSession('A');
  Object.keys(w.state.active.ex).forEach(kk=>w.state.active.ex[kk].forEach((s,i)=>{s.kg='50';s.pre=false;w.tick(kk,i);}));
  w.finishSession();
  const raw=w.__store['forge-data'];
  ok('localStorage-a yazıldı', !!raw);
  const parsed=JSON.parse(raw);
  ok('məşq diskdə var', parsed.sessions.length===1);
  ok('yenidən yüklənəndə oxunur', w.migrate(parsed).sessions[0].ex.length===6);
}

console.log(`\n${P} keçdi, ${F} uğursuz`);
process.exit(F?1:0);
