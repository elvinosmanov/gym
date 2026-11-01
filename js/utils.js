/* ================= tiny utils ================= */
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("on"); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove("on"),2400); }
function mondayOf(d){ const x=new Date(d); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x; }
/* state.weights[] is the ONLY source of truth. profile.w is seed-only and never read here
   — migrate() copies it into weights[] once for users created before this split. */
function wLoggedToday(){ return state.weights.some(x => x.d === todayISO()); }
function latestW(){ return state.weights.length ? state.weights[state.weights.length-1].kg : null; }
/* single writer for bodyweight: Bugün, Qida and Proqres all funnel through this */
function setWeight(v){
  if(!(v>=25 && v<=350)) return false;
  const t = todayISO(), ex = state.weights.find(x=>x.d===t);
  if(Array.isArray(state.goneW)) state.goneW = state.goneW.filter(d => d!==t);   /* yenidən yazıldı */
  if(ex){ ex.kg = v; ex.ts = Date.now(); }
  else state.weights.push({ d:t, kg:v, ts:Date.now() });
  state.weights.sort((a,b)=>a.d<b.d?-1:1);
  state.profile.w = v; /* kept in sync only so old exports still round-trip */
  return true;
}
function e1rm(kg,reps){ return kg*(1+reps/30); }
function nextDay(){
  if(state.active) return state.active.day;
  if(!state.sessions.length) return DAYS[0];
  const last = state.sessions[state.sessions.length-1].day;
  /* an A/B/C session from the old program gives indexOf === -1, which lands on DAYS[0] */
  return DAYS[(DAYS.indexOf(last)+1) % DAYS.length];
}
/* ---- həftəlik cədvəl ----
   Məşq günləri təqvimə bağlıdır: istifadəçi hansı həftə günlərində zala getdiyini
   Ayarlardan seçir (standart: bazar ertəsi, çərşənbə axşamı, cümə axsamı, şənbə).
   Hərəkət sırası (İtələmə → Çəkmə → Ayaq → Tam bədən) cədvəldən asılı deyil —
   bir gün buraxsan, sıradakı məşq itmir, sadəcə növbəti məşq gününə sürüşür. */
const WD_SHORT = ["B.","B.e","Ç.a","Ç.","C.a","C.","Ş."];
const WD_FULL  = ["Bazar","Bazar ertəsi","Çərşənbə axşamı","Çərşənbə","Cümə axşamı","Cümə","Şənbə"];
function trainDays(){
  const d = state.profile.days;
  return (Array.isArray(d) && d.length) ? d : [1,2,4,6];
}
function addDaysISO(iso, n){
  const [y,m,d] = iso.split("-").map(Number);
  const dt = new Date(y, m-1, d); dt.setDate(dt.getDate()+n);
  return isoOf(dt);
}
function wdOf(iso){ const [y,m,d] = iso.split("-").map(Number); return new Date(y, m-1, d).getDay(); }
function isTrainDay(iso){ return trainDays().includes(wdOf(iso)); }
function nextTrainISO(){
  if(state.active) return todayISO();
  const today = todayISO();
  const doneToday = state.sessions.some(s => s.d === today);
  for(let i = doneToday ? 1 : 0; i < 14; i++){
    const iso = addDaysISO(today, i);
    if(isTrainDay(iso)) return iso;
  }
  return today;
}
function isRestToday(){ return nextTrainISO() > todayISO(); }
/* növbəti 7 gün: seçilmiş həftə günləri işarələnir */
function scheduleStrip(){
  const out = [];
  for(let i=0;i<7;i++){
    const iso = addDaysISO(todayISO(), i);
    out.push({ iso, on: isTrainDay(iso) });
  }
  return out;
}
/* Foundation day 1 is deliberately submaximal (halved sets, ~50-60% effort). Feeding it
   to the progression math anchors every later session to a light baseline, so progression
   lookups skip it. History and charts pass includeFoundation:true and still show it. */
/* Bədən çəkisi ilə edilən hərəkətlərdə kq=0 normaldır (Pull-Up, Back Extension,
   Hanging Knee Raise…). Ştanq/hantel/aparat hərəkətində isə 0 real qeyd deyil —
   sadəcə çəki xanası boş qalıb. Belə dövrlər tarixçədə qalır, amma proqressiya
   və “Son:” sətri onları saymır, əks halda bütün hesabı aşağı çəkir. */
