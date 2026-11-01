/* ================= state & persistence ================= */
/* Bump when PROGRAM's day->exercise mapping changes. applyLoaded() uses it to
   retire an in-progress session whose exercise keys no longer match its day. */
const PROGRAM_VERSION = 4;
/* APP_VERSION — js/version.js */
/* profile.w is SEED-ONLY: written during first-run setup, then never read again.
   state.weights[] is the single source of truth for bodyweight — see latestW().
   plan/userEx: the user's own program edits (Plan tab). plan[D] absent = default day. */
const DEFAULTS = { profile:{name:"",w:"", days:[1,2,4,6],
    /* zal avadanlığı — çəki artımları və disk hesablayıcısı buradan gəlir */
    barKg:20, plate:2.5, dbStep:2.5, stackStep:5, stackUnit:"kg", stackStepLb:10, clockOffset:0},
  weights:[], sessions:[], active:null, supps:[], plan:null, planTs:0, userEx:{}, vid:{},
  gone:[], goneW:[], userExTs:{}, vidTs:{}, pv:PROGRAM_VERSION };
let state = JSON.parse(JSON.stringify(DEFAULTS));
let storageOK = true, saveT = null;

const $ = s => document.querySelector(s);
/* iPhone-da Azərbaycan klaviaturası onluq ayırıcı kimi VERGÜL verir. type="number"
   xanası vergüllü dəyəri etibarsız sayır və .value BOŞ qayıdır — ona görə “78,5”
   yazanda çəki ümumiyyətlə qeyd olunmurdu. Rəqəm xanaları artıq mətn xanasıdır
   (inputmode ilə eyni klaviatura açılır) və bütün oxunuşlar buradan keçir. */
function numVal(v){
  const n = parseFloat(String(v == null ? "" : v).replace(",", ".").trim());
  return isNaN(n) ? NaN : n;
}
function intVal(v){
  const n = parseInt(String(v == null ? "" : v).replace(",", ".").trim(), 10);
  return isNaN(n) ? NaN : n;
}
/* hər vərəqin yuxarısında qalan bağla düyməsi — uzun vərəqdə aşağı sürüşdürmək lazım deyil */
/* Bağlama düyməsi SVG-dir: “✕” simvolu bəzi telefonlarda (iOS Safari) şriftdə
   olmadığı üçün boş görünürdü. SVG hər yerdə eyni çəkilir. */
const SHEETHEAD = '<div class="shead"><span class="grab"></span>'
  + '<button class="xbtn" onclick="closeSheet()" aria-label="bağla">'
  + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18"/></svg></button></div>';
const esc = s => String(s??"").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const todayISO = () => { const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
const fmtD = iso => { const [y,m,d]=iso.split("-").map(Number); return new Date(y,m-1,d).toLocaleDateString("az",{day:"numeric",month:"short"}); };
/* ================= proqramın qurulması =================
   PROGRAM sabit deyil: standart plan (PROGRAM_DEF) + istifadəçinin Plan bölməsindəki
   dəyişiklikləri (state.plan) + öz hərəkətləri (state.userEx) birləşdirilərək yığılır.
   Plan dəyişdikdə buildProgram() yenidən çağırılır — başqa heç nəyə toxunmadan. */
let PROGRAM = {};
const EXMAP = {};
/* Kitabxanadan çıxarılmış, lakin tarixçədə qalan hərəkətlər. Statistika və
   analiz bunları tanımalıdır — əks halda keçmiş dövrlər əzələ yükü hesabından
   düşür və “bu əzələ az işlənib” xəbərdarlığı yalan verir. */
const ARCHIVE = {
  rdl:{ name:"Romanian Deadlift", pri:["hams","glutes"], sec:["lowback"], inc:2.5 },
  ddl:{ name:"Dumbbell Romanian Deadlift", pri:["hams","glutes"], sec:["lowback"], inc:2 },
  smdl:{ name:"Smith Machine Deadlift", pri:["hams","glutes"], sec:["lowback"], inc:2.5 },
  dl:{ name:"Conventional Deadlift", pri:["hams","glutes","lowback"], sec:["traps","quads"], inc:5 }
};
function histEx(k){ return libEx(k) || ARCHIVE[k] || null; }
function libEx(k){ return (state.userEx && state.userEx[k]) || LIB[k] || null; }
function libKeys(){ return Object.keys(LIB).concat(Object.keys(state.userEx||{})); }
function defSlot(k){ const e = libEx(k) || {}; return { k, sets:e.sets||3, rMin:e.rMin||10, rMax:e.rMax||12, rest:e.rest||90 }; }
/* slotda öz artım addımı varsa o işləyir (⚙ redaktorundan) */
function slotInc(sl, e){ return (sl && exStep(sl.k)) || ((sl && +sl.inc > 0) ? +sl.inc : incFor(e)); }
/* HƏRƏKƏTİN ÖZ DAŞ ÇƏKİSİ: zaldakı aparatların yığını eyni deyil — cable row-da
   hər daş 6.5 kq, lat pulldown-da 7.5 kq ola bilər. Belə aparatda çəki yalnız
   daşın misli ola bilər (6.5, 13, 19.5 …). Ümumi “aparat addımı” (5) bunu bilmir
   və 25 kimi aparatda olmayan rəqəm təklif edirdi. Bu dəyər hərəkətə bağlıdır
   (hansı gündə, alternativ və ya əlavə kimi edilməsindən asılı olmayaraq). */
function exStep(key){
  const m = state.profile && state.profile.exStep;
  return (m && +m[key] > 0) ? +m[key] : 0;
}
/* "52 kq" → " (8 daş)". Daşın misli deyilsə null — o çəki bu aparatda yoxdur. */
function dasN(key, kg){
  const st = exStep(key);
  if(!st || !(kg > 0)) return undefined;
  const n = kg / st;
  return Math.abs(n - Math.round(n)) < 0.02 ? Math.round(n) : null;
}
function dasTxt(key, kg){
  const n = dasN(key, kg);
  return n ? ` (${n} daş)` : "";
}
/* Köhnə versiya daş çəkisini bilmirdi və 5-5 addımla 55 kimi rəqəm təklif edirdi;
   ✓ basılanda o rəqəm tarixçəyə düşüb. Belə qeyd üçün izah: aparatda nə var. */
function offStepNote(key, kg){
  if(dasN(key, kg) !== null) return "";
  const st = exStep(key), lo = Math.floor(kg/st), hi = lo + 1;
  const f = n => Math.round(n*st*100)/100;
  return `${kg} kq bu aparatda mümkün deyil (bir daş ${st} kq): ${lo} daş = ${f(lo)}, ${hi} daş = ${f(hi)}. Ən yaxını — ${snapKg(key, kg)} kq — götürülür.`;
}
/* çəkini aparatda mövcud olan rəqəmə yuvarlaq: daş çəkisi varsa onun mislinə,
   yoxsa 0.5-ə */
function snapKg(key, v){
  const st = exStep(key);
  if(!st) return Math.round(v*2)/2;
  return Math.round(Math.max(1, Math.round(v/st)) * st * 100) / 100;
}
function daySlots(D){
  const custom = state.plan && state.plan[D];
  if(Array.isArray(custom)) return custom.filter(s => libEx(s.k));
  return (PROGRAM_DEF[D] || []).map(defSlot);
}
/* ================= YÜK TİPİ =================
   Hər hərəkət kq xanasının NƏYİ ölçdüyünü bilir. Bu olmadan "2.5 kq artır"
   cümləsi mənasızdır: ştanqda 2.5 kq = hər tərəfə 1.25, hanteldə isə 2.5
   birbaşa hantelin öz çəkisidir. Artım addımı da buradan hesablanır, əl ilə
   yazılmış rəqəmdən yox — zalındakı ən kiçik disk/hantel addımı ayarlardadır. */
const LOAD_LBL = {
  bar:{s:"hər tərəfə", l:"Dəmirin öz çəkisi sayılmır — BİR tərəfə taxdığın disklərin cəmini yaz. Hər tərəfə 20+10 taxmısansa: 30."},
  plate:{s:"hər tərəfə", l:"Aparatın öz çəkisi sayılmır — BİR tərəfə taxdığın disklərin cəmini yaz."},
  smith:{s:"hər tərəfə", l:"Smith ştanqının öz çəkisi sayılmır — BİR tərəfdəki disklərin cəmini yaz."},
  db:{s:"bir hantel", l:"İKİ hantelin cəmini yox, BİR hantelin üzərindəki rəqəmi yaz."},
  db1:{s:"hantel çəkisi", l:"Tək hantellə edilir — hantelin öz rəqəmini yaz."},
  stack:{s:"yığın", l:"Aparatın çəki yığınındakı rəqəmi yaz."},
  bw:{s:"əlavə disk", l:"Bədən çəkisi ilə edilir. Əlavə disk/kəmər taxmısansa onu yaz, yoxsa boş burax."}
};
/* Aparatların əksəriyyəti lbs ilə damğalanır: kq-a çevirəndə addımlar 27, 32, 36
   kimi "səliqəsiz" çıxır. Ona görə aparat yığını üçün vahid seçilə bilir — lb
   seçiləndə rəqəmi olduğu kimi lb ilə yazırsan, artım da lb addımı ilə gedir.
   Ştanq, hantel və disklər həmişə kq-dır. */
function unitOf(ex){
  return (ex && ex.load === "stack" && state.profile.stackUnit === "lb") ? "lb" : "kq";
}
function loadTag(ex){
  const d = LOAD_LBL[ex && ex.load];
  return (d ? d.s : "kq") + (unitOf(ex) === "lb" ? " · lb" : "");
}
function gymCfg(){
  const p = state.profile || {};
  return { bar:+p.barKg||20, plate:+p.plate||2.5, db:+p.dbStep||2.5, stack:+p.stackStep||5 };
}
/* İKİ TƏRƏFLİ yüklənən avadanlıq: xanaya BİR tərəfin çəkisi yazılır, dəmir sayılmır */
const SIDE_LOADS = ["bar","plate","smith"];
const isSide = ex => !!ex && SIDE_LOADS.includes(ex.load);
function incFor(ex){
  const c = gymCfg();
  /* hərəkətin öz addımı varsa o qalib gəlir — leg press-ə hər tərəfə 10,
     bench-ə 2.5 lazımdır, hamısına eyni rəqəm uyğun gəlmir */
  const own = ex && +ex.inc > 0 ? +ex.inc : null;
  switch(ex && ex.load){
    case "bar": case "plate": case "smith": return own || c.plate;   /* HƏR TƏRƏFƏ bir disk */
    /* hantel və yığın: addım zalın avadanlığından gəlir, kitabxanadakı köhnə
       rəqəmdən yox — hantellər 2.5-lik, yığınlar 5-lik dəyişir */
    case "db": case "db1": return c.db;
    case "stack": return unitOf(ex)==="lb" ? (+state.profile.stackStepLb || 10) : c.stack;
    case "bw": return own || c.plate*2;
    default: return own || 2.5;
  }
}
/* Xanadakı rəqəm BİR tərəfin çəkisidir. Burada onu disklərə bölürük və
   yanında ümumi çəkini (dəmir daxil) məlumat üçün göstəririk. */
function plateBreak(sideKg, ex){
  if(!isSide(ex)) return null;
  const c = gymCfg();
  let side = +sideKg;
  if(!(side > 0)) return null;
  const total = ex.load==="bar" ? side*2 + c.bar : side*2;
  const out = [];
  [25,20,15,10,5,2.5,1.25].filter(p=>p>=c.plate).forEach(p=>{
    const n = Math.floor(side/p + 1e-9);
    if(n){ out.push(n>1 ? `${n}×${p}` : `${p}`); side = Math.round((side - n*p)*1000)/1000; }
  });
  if(side > 0.01 || !out.length) return null;
  return `hər tərəfə ${out.join(" + ")}`
    + ` · cəmi ${Math.round(total*10)/10} kq${ex.load==="bar" ? ` (dəmir ${c.bar} daxil)` : ""}`;
}
function mkEx(sl, D){
  const e = libEx(sl.k) || { name:sl.k, tag:"" };
  return { ...e, key:sl.k, day:D,
    sets:Math.max(1, +sl.sets||1), rMin:Math.max(1, +sl.rMin||1), rMax:Math.max(1, +sl.rMax||1),
    rest:Math.max(15, +sl.rest||60), inc: slotInc(sl, e), load: e.load || "stack",
    cues:e.cues || [], mist:e.mist || [],
    /* load:"bw" özü bədən çəkisi deməkdir — ayrıca bayraq unudulsa da (Chest Dips
       belə idi) çəkisiz dövr qadağası səhvən işə düşməsin */
    bodyweight: !!(e.bodyweight || e.load==="bw") };
}
function buildProgram(){
  PROGRAM = {};
  DAYS.forEach(D => { PROGRAM[D] = { ...DAY_META[D], ex: daySlots(D).map(sl => mkEx(sl, D)) }; });
  /* EXMAP hər hərəkəti tanıyır — plandan çıxarılanları da, çünki tarixçə və qrafiklər
     köhnə açarların adını buradan oxuyur. Plandakılar öz günündəki resepti daşıyır. */
  Object.keys(EXMAP).forEach(k => delete EXMAP[k]);
  libKeys().forEach(k => { EXMAP[k] = mkEx(defSlot(k), null); });
  DAYS.forEach(D => PROGRAM[D].ex.forEach(ex => {
    EXMAP[ex.key] = ex;
    /* alternativ slotun dövr/təkrar/istirahətini götürür, öz artım addımını saxlayır */
    (ALT_OF[ex.key] || []).forEach(ak => {
      if(libEx(ak)) EXMAP[ak] = mkEx({ k:ak, sets:ex.sets, rMin:ex.rMin, rMax:ex.rMax, rest:ex.rest }, D);
    });
  }));
}
buildProgram();   /* standart plan — loadState() məlumatı gətirəndə yenidən qurulur */

/* tarixçədə adı olan, lakin kitabxanadan çıxarılmış hərəkətlər üçün ad tapıcısı */
function exName(k){
  if(EXMAP[k]) return EXMAP[k].name;
  for(let i=state.sessions.length-1;i>=0;i--){
    const f = state.sessions[i].ex.find(e => e.key===k);
    if(f) return f.name;
  }
  return k;
}
/* Session length from the prescription itself, so it can never drift from PROGRAM.
   ~40 s under the bar per working set + the prescribed rest after each. Warm-up ramp is extra. */
function dayMinutes(D){
  const ex = PROGRAM[D].ex;
  const sets = ex.reduce((a,e)=>a+e.sets,0);
  const rest = ex.reduce((a,e)=>a+e.sets*e.rest,0);
  return Math.round((sets*40 + rest)/60/5)*5;
}
/* aktiv məşqdə slot üçün seçilmiş effektiv hərəkət (əsas və ya alternativ) */
function effEx(slotKey){
  const slot = EXMAP[slotKey];
  const ak = state.active && state.active.swap && state.active.swap[slotKey];
  if(!ak || !libEx(ak) || !slot) return slot;
  /* Alternativ HƏMİŞƏ slotun dövr/təkrar/istirahətini götürür. Əvvəl bu, EXMAP-dən
     oxunurdu; eyni hərəkət başqa gündə əsas slot olanda oradakı resept qalib gəlirdi
     və dəyişdirdikdə səhv rəqəm görünürdü. */
  return mkEx({ k:ak, sets:slot.sets, rMin:slot.rMin, rMax:slot.rMax, rest:slot.rest }, slot.day);
}
/* günün sonunda faktiki ediləcək hərəkətlər (⇄ ilə dəyişdirilənlər nəzərə alınır) */
function dayEffKeys(D){
  const sw = (state.active && state.active.day===D && state.active.swap) || {};
  return daySlots(D).map(s => sw[s.k] || s.k).concat(activeExtras(D));
}
/* Məşq başlayandan sonra əlavə edilən hərəkətlər — yalnız bu məşqə aiddir,
   plana yazılmır. Açarlar state.active.extra-da, dövrləri a.ex[key]-dədir. */
function activeExtras(D){
  const a = state.active;
  if(!a || (D && a.day!==D) || !Array.isArray(a.extra)) return [];
  return a.extra.filter(k => EXMAP[k]);
}
/* Bir slot üçün seçilə bilən hərəkətlər: əsas + günün BAŞQA slotlarında olmayan
   alternativlər. Əvvəl siyahı xam ALT_OF idi və məsələn Tyaqın alternativi kimi
   həmin gün onsuz da planda olan hərəkəti təklif edirdi — yəni eyni hərəkəti iki
   dəfə. İndi belə variantlar siyahıdan düşür. */
function swapOpts(slotKey){
  const base = EXMAP[slotKey];
  if(!base) return [];
  const cur = effEx(slotKey).key;
  const taken = new Set(dayEffKeys(base.day).filter(k => k!==cur && k!==slotKey));
  return [base, ...(ALT_OF[slotKey]||[]).filter(k => !taken.has(k)).map(k=>EXMAP[k]).filter(Boolean)];
}
function openSwap(slotKey){
  const opts = swapOpts(slotKey);
  const hid = (ALT_OF[slotKey]||[]).length - (opts.length-1);
  const cur = effEx(slotKey).key;
  $("#sheet").innerHTML = `${SHEETHEAD}
    <h3>Hərəkəti seçin</h3><div class="stag">${esc(EXMAP[slotKey].tag)} — aparat doludursa hantel variantını seç</div>
    <div class="swaplist">${opts.map((o,oi)=>{
      const p = lastPerf(o.key);
      return `<button class="swopt ${o.key===cur?"on":""}" onclick="chooseEx('${slotKey}','${o.key}')">
        ${exImg(o,"exanim sm")}
        <span class="swtxt"><b>${esc(o.name)}</b><small><span class="eq">${loadTag(o)}</span> ${p?`Son: ${perfStr(p)}`:"ilk dəfə"}</small></span>
        <span class="swck">${o.key===cur?"✓":""}</span>
      </button>`;
    }).join("")}</div>
    ${hid>0?`<div class="small">${hid} alternativ göstərilmir — onlar bu gün onsuz da planındadır.</div>`:""}
    <div class="small">Daimi dəyişiklik istəyirsinizsə — <b style="color:var(--ink)">Plan</b> bölməsindən bu slotu tamamilə əvəz edin.</div>
    <button class="btn block ghost" style="margin-top:10px" onclick="closeSheet()">Bağla</button>`;
  $("#overlay").classList.add("on"); $("#sheet").classList.add("on");
}
function chooseEx(slotKey, key){
  if(key===slotKey){ if(state.active.swap) delete state.active.swap[slotKey]; }
  else { state.active.swap = state.active.swap || {}; state.active.swap[slotKey] = key; }
  const sug = suggestKg(key);
  state.active.ex[slotKey].forEach(s=>{ if(!s.done){ s.kg = sug ?? ""; s.reps = ""; } });
  closeSheet(); save(); renderTrain();
  toast(`Seçildi: ${EXMAP[key].name}`);
}

let migrationNote = "";
/* Silently upgrade any older forge-data shape. Never drops sessions/weights/supps. */
/* Açarlar HTML atributlarına və onclick-ə yazılır. Yedək faylı və ya bulud
   istənilən mətn daşıya bilər — açar yalnız bu formada ola bilər. */
const SAFE_KEY = /^[A-Za-z0-9_]{1,40}$/;
const ISO_D = /^\d{4}-\d{2}-\d{2}$/;
const toNum = v => { const n = Number(v); return isFinite(n) ? n : 0; };
/* Gələn məlumatın formasını təmizlə: etibarsız açarları at, rəqəmləri rəqəmə çevir.
   Yerli, idxal və bulud məlumatı eyni yoldan keçir (migrate). */
function sanitize(s){
  const obj = o => (o && typeof o === "object" && !Array.isArray(o)) ? o : {};
  const keyed = o => Object.fromEntries(Object.entries(obj(o)).filter(([k]) => SAFE_KEY.test(k)));
  s.userEx = keyed(s.userEx);
  Object.values(s.userEx).forEach(e=>{
    ["sets","rMin","rMax","rest","inc"].forEach(f=>{ if(f in e) e[f] = toNum(e[f]); });
    ["pri","sec","cues","mist"].forEach(f=>{ e[f] = Array.isArray(e[f]) ? e[f].map(String) : []; });
    if(typeof e.name !== "string") e.name = String(e.name ?? "");
  });
  s.vid = keyed(s.vid);
  s.userExTs = keyed(s.userExTs); s.vidTs = keyed(s.vidTs);
  if(s.profile) s.profile.exStep = keyed(s.profile.exStep);
  s.weights = (Array.isArray(s.weights) ? s.weights : [])
    .filter(w => w && ISO_D.test(w.d)).map(w => ({...w, kg: toNum(w.kg), ts: toNum(w.ts)}));
  s.supps = (Array.isArray(s.supps) ? s.supps : []).filter(x => x && ISO_D.test(x.d));
  s.sessions = (Array.isArray(s.sessions) ? s.sessions : []).filter(x => x && ISO_D.test(x.d) && SAFE_KEY.test(x.day)).map(x => ({
    ...x,
    id: x.id == null ? x.id : String(x.id),
    ex: (Array.isArray(x.ex) ? x.ex : []).filter(e => e && SAFE_KEY.test(e.key)).map(e => ({
      ...e, name: String(e.name ?? ""),
      sets: (Array.isArray(e.sets) ? e.sets : []).map(st => ({...st, kg: toNum(st && st.kg), reps: toNum(st && st.reps)}))
    }))
  }));
  if(s.plan && typeof s.plan === "object") Object.keys(s.plan).forEach(D=>{
    if(!DAYS.includes(D)) { delete s.plan[D]; return; }
    if(Array.isArray(s.plan[D])) s.plan[D] = s.plan[D].filter(x => x && SAFE_KEY.test(x.k));
  });
  if(s.active && (typeof s.active !== "object" || !s.active.ex || typeof s.active.ex !== "object")) s.active = null;
  if(s.active && !SAFE_KEY.test(s.active.day)) s.active = null;
  if(s.active) s.active.ex = keyed(s.active.ex);
  ["gone","goneW"].forEach(f=>{ s[f] = Array.isArray(s[f]) ? s[f].map(String) : []; });
  return s;
}
function migrate(s, fromPv){
  sanitize(s);
  /* sex + weekly target: existing users keep the old hardcoded behaviour */
  if(!s.profile.sex) s.profile.sex = "m";
  if(!Array.isArray(s.profile.days) || !s.profile.days.length) s.profile.days = [1,2,4,6];
  if(!s.userEx || typeof s.userEx !== "object") s.userEx = {};
  /* v37: çəki qaydası dəyişdi (ştanq/disk = hər tərəfə, dəmir sayılmır) və
     addımlar böyüdü. Toxunulmamış köhnə standartları yeniləyirik; istifadəçi
     özü başqa rəqəm yazıbsa ona dəymirik. */
  if(!s.profile.convV){
    if(+s.profile.plate === 1.25) s.profile.plate = 2.5;
    if(+s.profile.dbStep === 2)   s.profile.dbStep = 2.5;
    s.profile.convV = 2;
  }
  /* aparatın daş çəkisi hər zalda fərqlidir — standart boşdur, Plan → ⚙-dan yazılır */
  if(!s.profile.exStep || typeof s.profile.exStep !== "object") s.profile.exStep = {};
  if(!s.vid || typeof s.vid !== "object") s.vid = {};
  /* köhnə qeydlərə determinist id — hər cihaz eyni id-ni hesablayır, dublikat olmur */
  (s.sessions||[]).forEach(x=>{ if(!x.id) x.id = x.d+"|"+x.day; });
  /* Kitabxanadan silinmiş hərəkət özəl planda qalsa, daySlots onu süzür, mutasiyalar
     isə süzülməmiş massivə indekslə girirdi — nəticədə ⚙ və ✕ başqa sətrə düşürdü. */
  if(s.plan) Object.keys(s.plan).forEach(D=>{
    if(Array.isArray(s.plan[D])) s.plan[D] = s.plan[D].filter(x => x && (LIB[x.k] || (s.userEx && s.userEx[x.k])));
  });
  if(s.plan !== null && typeof s.plan !== "object") s.plan = null;

  /* bodyweight: profile.w was a second source of truth. Seed weights[] from it once. */
  if(!s.weights.length && parseFloat(s.profile.w)){
    s.weights.push({ d: todayISO(), kg: parseFloat(s.profile.w), ts: 0 });
  }
  s.weights.forEach(w => { if(w.ts === undefined) w.ts = 0; });

  /* PROGRAM restructure: an active session holds sets keyed by exercise, but
     renderTrain() walks the NEW day's exercise list. Keys that moved days would
     read undefined and throw. Retire the unfinished session; history is untouched. */
  if(fromPv < PROGRAM_VERSION && s.active){
    /* Açarlar YÜKLƏNƏN state-in planından götürülür. Əvvəl qlobal PROGRAM-a baxırdı —
       o isə bu anda hələ ƏVVƏLKİ istifadəçi məlumatı ilə qurulmuş olur, ona görə
       yoxlama yanlış gündən oxuyurdu və yarımçıq məşq ləğv edilmirdi. */
    const dayKeys = (s.plan && Array.isArray(s.plan[s.active.day]))
      ? s.plan[s.active.day].map(x => x && x.k).filter(Boolean)
      : (PROGRAM_DEF[s.active.day] || null);
    /* dayKeys === null means the day itself no longer exists (A/B/C -> P/L/G/F) */
    const stale = dayKeys === null || dayKeys.some(k => !s.active.ex[k]);
    if(stale){
      s.active = null;
      migrationNote = "Proqram yeniləndi: artıq İtələmə → Çəkmə → Ayaq → Tam bədən bölgüsü işləyir, "
        + "bir gün məşq, bir gün istirahət. Yarımçıq qalmış məşq ləğv edildi, çünki günlərin hərəkətləri dəyişib. "
        + "Bitmiş məşq tarixçəniz və bütün çəki qeydləriniz olduğu kimi qalıb. "
        + "Hərəkətləri bəyənmirsinizsə — aşağıdakı <b>PLAN</b> bölməsindən hamısını özünüz qura bilərsiniz.";
    }
  }
  s.pv = PROGRAM_VERSION;
  return s;
}
function applyLoaded(v){
  if(!v) return;
  const d = JSON.parse(v);
  /* Read pv from the RAW payload. Reading it after the DEFAULTS spread would always
     see the current version — a pre-versioning save has no pv key at all, and
     JSON.stringify drops an explicit undefined, so the default would mask it. */
  const fromPv = d.pv || 1;
  state = migrate({...JSON.parse(JSON.stringify(DEFAULTS)), ...d, profile:{...DEFAULTS.profile, ...(d.profile||{})}}, fromPv);
  buildProgram();   /* the loaded state may carry the user's own plan */
}
async function loadState(){
  try{ /* inside Claude: artifact storage */
    if(typeof window.storage !== "undefined"){
      const r = await window.storage.get("forge-data");
      applyLoaded(r && r.value);
      return;
    }
  }catch(e){ /* fall through to localStorage — do NOT return, that skips the fallback */ }
  try{ /* self-hosted website: browser localStorage */
    applyLoaded(localStorage.getItem("forge-data"));
    return;
  }catch(e){}
  storageOK = false;
}
function save(){
  state.ts = Date.now();      /* set synchronously so a checkpoint cloudPush() right
                                 after save() ships the new timestamp, not the old one */
  if(sbUser) cloudDirty = true;
  clearTimeout(saveT);
  /* LOCAL ONLY. The cloud is pushed at checkpoints (finishSession, addWeight,
     delSession, delWeight, sign-in, import) plus a 60 s idle retry — a
     per-keystroke network write drains the battery on weak gym signal. */
  saveT = setTimeout(writeLocal, 350);
}
async function writeLocal(){
  saveT = null;
  const json = JSON.stringify(state);
  try{
    if(typeof window.storage !== "undefined"){ await window.storage.set("forge-data", json); return; }
    localStorage.setItem("forge-data", json);
  }catch(e){ if(storageOK){ storageOK=false; renderSaveNote(); } }
}
/* Gözləyən yerli yazını dərhal et. Tətbiq arxa fona keçəndə iOS səhifəni
   350 ms-lik gecikmə bitmədən öldürə bilər — son ✓ itirdi. */
function flushSave(){ if(saveT){ clearTimeout(saveT); writeLocal(); } }
window.addEventListener("pagehide", flushSave);
function renderSaveNote(){
  const el = $("#saveNote"); if(!el) return;
  let out = "";
  if(!storageOK) out += `<div class="warnnote">⚠ Bu brauzer kontekstində yadda saxlama mövcud deyil — səhifə bağlandıqda qeydlər sıfırlanacaq.</div>`;
  if(typeof navigator!=="undefined" && navigator.onLine===false)
    out += `<div class="warnnote">📴 Oflayn rejim — qeydlər telefonda saxlanılır və şəbəkə qayıdanda buluda göndəriləcək. Məşq etməyə davam edin.</div>`;
  if(sbWarn) out += `<div class="warnnote">${sbWarn}</div>`;
  el.innerHTML = out;
}
function renderNet(){ renderSaveNote(); }
