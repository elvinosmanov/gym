/* ================= cloud sync (Supabase) =================
   localStorage is the fast/offline store and is written on every change.
   The cloud is pushed only at meaningful checkpoints (see cloudPush callers) and
   on a 60 s idle timer, so typing in a number field does not ship state per keystroke.
   Pulls are a real field-level MERGE, not last-write-wins — see mergeState(). */
const SB_URL = "https://jcavlzmsnwaqbaduhtkj.supabase.co";  // Supabase Project URL
const SB_KEY = "sb_publishable_Uoe0k2MtlM8gRcFo6T8sWA_jF1KNqpB";  // Supabase publishable (anon) key
let sb = null, sbUser = null, sbStatus = "", sbWarn = "";
let pushT = null, cloudDirty = false, pushing = false, pushAgain = false, lastSync = 0, lastHide = 0;
function sbReady(){ return !!(SB_URL && SB_KEY && window.supabase); }

/* ---- SİLİNMƏ DAMĞALARI ----
   Birləşdirmə iki tərəfin qeydlərini BİRLƏŞDİRİR. Damğa olmasa, silinən məşq
   qarşı tərəfdə hələ durduğu üçün növbəti sinxronda geri qayıdırdı — yəni
   “sil” düyməsi bulud açıq olanda heç vaxt işləmirdi. İndi silinən açar
   yadda saxlanılır və hər iki tərəfdən süzülür. */
const sesKey = s => s.id || (s.d+"|"+s.day);
/* Bulud/idxal məlumatı da yerli kimi miqrasiyadan keçir — köhnə versiyalı
   cihazın yazdığı format birbaşa birləşdirilməsin. migrationNote yerli qalır. */
function normalizeRemote(d){
  if(!d || typeof d !== "object") return null;
  const keepNote = migrationNote;
  const out = migrate({...JSON.parse(JSON.stringify(DEFAULTS)), ...d, profile:{...DEFAULTS.profile, ...(d.profile||{})}}, d.pv || 1);
  migrationNote = keepNote;
  return out;
}
function tomb(field, key){
  if(!key) return;
  const a = state[field] = Array.isArray(state[field]) ? state[field] : [];
  if(!a.includes(key)) a.push(key);
  if(a.length > TOMB_CAP) state[field] = a.slice(-TOMB_CAP);
}
/* Damğa siyahısının həddi. Əvvəl 1000 idi; həddən çıxan ən köhnə damğa itəndə
   uzun müddət açılmamış cihaz həmin silinmiş qeydi geri gətirə bilirdi. Açarlar
   qısadır (~30 simvol), 5000 damğa ~150 KB edir. */
const TOMB_CAP = 5000;
/* Açar → son dəyişiklik vaxtı (həm yazma, həm silmə). userEx və vid üçün:
   silinən açar da vaxt damğası saxlayır, ona görə birləşdirmə onu geri gətirmir. */
function stampKey(field, key){
  const f = field + "Ts";
  if(!state[f] || typeof state[f] !== "object") state[f] = {};
  state[f][key] = Date.now();
}
/* Hər açar üçün daha yeni damğalı tərəf qalib gəlir. Qalib tərəfdə açar yoxdursa,
   deməli orada silinib. Hər iki tərəf damğasızdırsa (köhnə nüsxələr) birləşmə
   əvvəlki kimidir: preferRemote ilə kimin dəyəri üstündür. */
function mergeKeyed(lo, ro, lts, rts, preferRemote){
  lo = lo || {}; ro = ro || {}; lts = lts || {}; rts = rts || {};
  const out = {}, ts = {};
  new Set([...Object.keys(lo), ...Object.keys(ro), ...Object.keys(lts), ...Object.keys(rts)]).forEach(k=>{
    const l = lts[k] || 0, r = rts[k] || 0;
    let src;
    if(l || r) src = r > l ? ro : lo;
    else src = preferRemote ? (k in ro ? ro : lo) : (k in lo ? lo : ro);
    if(k in src) out[k] = src[k];
    if(l || r) ts[k] = Math.max(l, r);
  });
  return { out, ts };
}
/* ---- merge: union by natural key, never destructive ---- */
function mergeState(local, remote){
  if(!remote) return local;
  const out = {...local};

  /* sessions keyed on date+day; on collision keep the record with more logged sets */
  const setsOf = r => (r.ex||[]).reduce((a,e)=>a+(e.sets?e.sets.length:0), 0);
  const smap = new Map();
  /* İki tərəfdə də vaxt damğası varsa daha yeni qeyd qalib gəlir (düzəliş itmir);
     damğasız köhnə qeydlərdə əvvəlki qayda: daha çox dövrü olan */
  const newer = (s, cur) => (s.ts && cur.ts && s.ts !== cur.ts) ? s.ts > cur.ts : setsOf(s) > setsOf(cur);
  (local.sessions||[]).forEach(s=>smap.set(sesKey(s), s));
  (remote.sessions||[]).forEach(s=>{
    const k = sesKey(s), cur = smap.get(k);
    if(!cur || newer(s, cur)) smap.set(k, {...s, note:(s.note || (cur && cur.note) || undefined)});
  });
  const goneS = new Set([...(local.gone||[]), ...(remote.gone||[])]);
  out.gone = [...goneS].slice(-TOMB_CAP);
  out.sessions = [...smap.values()].filter(x => !goneS.has(sesKey(x))).sort((a,b)=>a.d<b.d?-1:1);

  /* weights keyed on date; on collision keep the later ts */
  const wmap = new Map();
  (local.weights||[]).forEach(w=>wmap.set(w.d, w));
  (remote.weights||[]).forEach(w=>{
    const cur = wmap.get(w.d);
    if(!cur || (w.ts||0) > (cur.ts||0)) wmap.set(w.d, w);
  });
  /* Silmə damğası tarix → silinmə VAXTI (goneWTs). Çəki yalnız damğadan əvvəl
     yazılıbsa süzülür: silib sonra eyni günə yenidən yazılan çəki qalır.
     goneW — vaxtsız köhnə damğalar; onlar əvvəlki kimi həmin günü həmişə süzür. */
  const goneW = new Set([...(local.goneW||[]), ...(remote.goneW||[])]);
  out.goneW = [...goneW].slice(-TOMB_CAP);
  const gts = {};
  [local.goneWTs, remote.goneWTs].forEach(m => Object.entries(m||{}).forEach(([d,t]) => { gts[d] = Math.max(gts[d]||0, +t||0); }));
  out.goneWTs = gts;
  out.weights = [...wmap.values()]
    .filter(w => !goneW.has(w.d) && !(gts[w.d] && gts[w.d] >= (w.ts||0)))
    .sort((a,b)=>a.d<b.d?-1:1);

  /* supps keyed on date. Damğalı qeydlərdə daha yeni olan qalib gəlir — beləcə
     işarəni geri götürmək də sinxronlaşır. Damğasız köhnə qeydlərdə OR. */
  const pmap = new Map();
  (local.supps||[]).forEach(s=>pmap.set(s.d, {...s}));
  (remote.supps||[]).forEach(s=>{
    const cur = pmap.get(s.d);
    if(!cur) pmap.set(s.d, {...s});
    else if(cur.ts || s.ts){ if((s.ts||0) > (cur.ts||0)) pmap.set(s.d, {...s}); }
    else { cur.creatine = cur.creatine || s.creatine; cur.protein = cur.protein || s.protein; }
  });
  out.supps = [...pmap.values()].sort((a,b)=>a.d<b.d?-1:1);

  /* PLAN AYRICA DAMĞA İLƏ BİRLƏŞİR.
     Əvvəl plan ümumi “ts” ilə həll olunurdu, ts isə HƏR yadda saxlamada yenilənir
     (bir dövr qeyd etmək belə). Nəticədə: telefonda planı dəyişirsən, sonra başqa
     nüsxə (Safari tabı ↔ ekrana əlavə edilmiş tətbiq — onların yaddaşı ayrıdır)
     nəyisə yazır, onun ts-i daha yeni olur və HƏLƏ PLANI OLMAYAN nüsxə səninkini
     üzərinə yazırdı. İndi planı yalnız daha yeni planTs üstələyir. */
  const lpt = local.planTs||0, rpt = remote.planTs||0;
  if(rpt > lpt)      out.plan = remote.plan || null;
  else if(lpt > rpt) out.plan = local.plan || null;
  else               out.plan = local.plan || remote.plan || null;   /* damğasız köhnə nüsxələr */
  out.planTs = Math.max(lpt, rpt) || undefined;

  /* profile: last-write-wins on ts is acceptable */
  const remoteNewer = (remote.ts||0) > (local.ts||0);
  if(remoteNewer) out.profile = {...local.profile, ...(remote.profile||{})};
  /* öz hərəkətləri və videolar açar-açar, öz damğaları ilə — silinən geri qayıtmır */
  ["userEx","vid"].forEach(f=>{
    const m = mergeKeyed(local[f], remote[f], local[f+"Ts"], remote[f+"Ts"], remoteNewer);
    out[f] = m.out; out[f+"Ts"] = m.ts;
  });
  /* Bu cihazdakı yarımçıq məşq HƏR ZAMAN qorunur — sinxronizasiya onu silməməlidir.
     Qarşı tərəfdəki isə yalnız HƏQİQƏTƏN davam edirsə götürülür.
     Əvvəl sadəcə “local.active || remote.active” idi və bu, aşağıdakı səhvi verirdi:
     məşqi ləğv edirdin (yerli null olurdu), amma buludda hələ dururdu; planda bir
     hərəkət dəyişdirmək — hətta sadəcə tətbiqi bağlamaq — sinxronu işə salırdı və
     həmin məşq özü yenidən “başlayırdı”. İndi iki süzgəc var: bağlanma damğasından
     köhnə məşq qaytarılmır, tarixçəyə onsuz da yazılmış məşq də qaytarılmır. */
  const ended = Math.max(local.activeEnded||0, remote.activeEnded||0);
  if(ended) out.activeEnded = ended;
  const actKey = a => (a.startedAt ? isoOf(new Date(a.startedAt)) : (a.started||"")) + "|" + a.day + "|" + (a.startedAt||"");
  const stillLive = a => !!a && (a.startedAt||0) > ended && !out.sessions.some(s => s.id === actKey(a));
  out.active = local.active || (stillLive(remote.active) ? remote.active : null) || null;
  out.ts = Math.max(local.ts||0, remote.ts||0);
  return out;
}

async function sbBoot(){
  if(!sbReady()) return;
  sb = window.supabase.createClient(SB_URL, SB_KEY);
  try{
    const { data } = await sb.auth.getSession();
    sbUser = data.session ? data.session.user : null;
  }catch(e){ sbUser = null; }
  if(sbUser){ await cloudSync(); rlsProbe(); }
  refresh();
}

/* Was named cloudMerge while doing whole-state replacement. It merges now. */
async function cloudSync(){
  if(!sb || !sbUser) return;
  try{
    const { data, error } = await sb.from("forge_data").select("data,updated_at").eq("user_id", sbUser.id).maybeSingle();
    if(error){
      /* a duplicate user_id row makes maybeSingle() throw — that is a schema fault,
         not a transient one, and it must not fail quietly in a card nobody opens */
      sbStatus = "xəta";
      toast("Bulud oxunmadı: " + (error.message||"naməlum xəta"));
      return;
    }
    const remote = data && data.data ? normalizeRemote(data.data) : null;
    if(remote){
      const before = JSON.stringify(state);
      state = mergeState(state, remote);
      state.pv = PROGRAM_VERSION;
      buildProgram();
      if(JSON.stringify(state) !== before){
        try{ localStorage.setItem("forge-data", JSON.stringify(state)); }catch(e){}
      }
    }
    sbStatus = "sinxrondur"; lastSync = Date.now();
    await cloudPush(true);
  }catch(e){ sbStatus = "oflayn"; cloudDirty = true; }
}

/* Checkpoint push. Debounced ~10 s; pass immediate=true to skip the wait. */
function cloudPush(immediate){
  if(!sb || !sbUser){ return Promise.resolve(); }
  clearTimeout(pushT);
  if(!immediate){ pushT = setTimeout(()=>doPush(), 10000); return Promise.resolve(); }
  return doPush();
}
async function doPush(){
  if(!sb || !sbUser) return;
  /* Yazı gedərkən gələn yeni yazı itmir: bitəndən sonra bir dəfə də göndərilir. */
  if(pushing){ pushAgain = true; return; }
  pushing = true; pushAgain = false;
  try{
    /* ƏN VACİB QAYDA: bulud sətri KOR-KORANƏ üzərinə yazılmır.
       Əvvəlcə bulud oxunur, yerli ilə birləşdirilir, sonra nəticə yazılır.
       Yazı “oxuduğum updated_at hələ də eynidirsə” şərti ilədir — iki cihaz eyni
       anda yazanda biri digərinin qeydini silə bilməz: şərt tutmasa, yenidən
       oxuyub birləşdiririk (ən çox 3 dəfə). */
    let ok = false;
    for(let attempt = 0; attempt < 3 && !ok; attempt++){
      const cur = await sb.from("forge_data").select("data,updated_at").eq("user_id", sbUser.id).maybeSingle();
      if(cur.error) throw cur.error;   /* oxuya bilmədiksə yazmırıq */
      const row = cur.data;
      if(row && row.data){
        const n0 = state.sessions.length + state.weights.length;
        state = mergeState(state, normalizeRemote(row.data));
        buildProgram();
        if(state.sessions.length + state.weights.length !== n0){
          try{ localStorage.setItem("forge-data", JSON.stringify(state)); }catch(e){}
        }
      }
      const payload = { user_id: sbUser.id, data: state, updated_at: new Date().toISOString() };
      let res;
      if(row){
        res = await sb.from("forge_data").update(payload)
          .eq("user_id", sbUser.id).eq("updated_at", row.updated_at).select("user_id");
      } else {
        /* sətir hələ yoxdur — ilk yazı. Eyni anda başqa cihaz da yaradıbsa
           unikal açar xətası verir və növbəti dövrədə birləşdiririk. */
        res = await sb.from("forge_data").insert(payload).select("user_id");
        if(res.error && /duplicate|unique|23505/i.test(res.error.message + (res.error.code||""))) continue;
      }
      if(res.error) throw res.error;
      ok = !!(res.data && res.data.length);
    }
    if(ok){ cloudDirty = false; sbStatus = "sinxrondur"; lastSync = Date.now(); }
    else { cloudDirty = true; sbStatus = "gözləyir"; }
  }catch(e){ cloudDirty = true; sbStatus = navigator.onLine === false ? "oflayn" : "gözləyir"; }
  pushing = false;
  if(pushAgain){ pushAgain = false; doPush(); }
}
/* idle heartbeat + retry when the network comes back */
setInterval(()=>{ if(sbUser && cloudDirty) doPush(); }, 60000);
window.addEventListener("online", ()=>{ if(sbUser && cloudDirty) doPush(); renderNet(); });
window.addEventListener("offline", ()=>renderNet());

/* RLS smoke test: ask for a row that is definitely not ours. With the policy in place
   this returns empty. If it returns data, every user's rows are world-readable. */
async function rlsProbe(){
  try{
    const { data, error } = await sb.from("forge_data").select("user_id").neq("user_id", sbUser.id).limit(1);
    if(!error && data && data.length){
      sbWarn = "⚠ TƏHLÜKƏSİZLİK: bulud bazasında RLS (Row Level Security) aktiv deyil — başqa istifadəçilərin qeydləri bu açarla oxuna bilir. Supabase-də siyasəti tətbiq edin.";
      refresh();
    }
  }catch(e){}
}

async function syncNow(){
  if(!sbUser){ toast("Əvvəlcə daxil ol"); return; }
  toast("Sinxronlaşdırılır…");
  const before = state.sessions.length;
  await cloudSync();
  renderSettings();
  const d = state.sessions.length - before;
  toast(d > 0 ? `Buluddan ${d} məşq gətirildi` : "Hər şey sinxrondur");
}
async function sbSignIn(){
  const email = $("#sb-email").value.trim(), pass = $("#sb-pass").value;
  if(!email || !pass){ toast("E-poçt və şifrəni daxil edin"); return; }
  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
  if(error){ toast("Daxil olmaq alınmadı: " + error.message); return; }
  sbUser = data.user;
  await cloudSync(); rlsProbe(); refresh();
  toast("Daxil oldunuz — bulud sinxronizasiyası aktivdir ☁️");
}
async function sbSignUp(){
  const email = $("#sb-email").value.trim(), pass = $("#sb-pass").value;
  if(!email || pass.length<6){ toast("E-poçt və ən azı 6 simvolluq şifrə daxil edin"); return; }
  const { data, error } = await sb.auth.signUp({ email, password: pass });
  if(error){ toast("Qeydiyyat alınmadı: " + error.message); return; }
  if(!data.session){ toast("Qeydiyyat tamam — e-poçtunuzu təsdiqləyin, sonra daxil olun"); return; }
  sbUser = data.user;
  await cloudPush(true); rlsProbe(); refresh();
  toast("Hesab yaradıldı — məlumatlar buludda ☁️");
}
async function sbSignOut(){
  try{ await sb.auth.signOut(); }catch(e){}
  sbUser = null; refresh(); toast("Çıxış edildi — qeydlər lokal davam edir");
}
