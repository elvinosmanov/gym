/* ================= AÇILIŞ REJİMİ =================
   iOS-da yalnız SAFARI-nin “Ana ekrana əlavə et” əmri əsl tətbiq yaradır.
   Chrome/Brave-dən əlavə edilən qısayol həmin brauzerin içində, ünvan sətri ilə
   açılır — “yenə brauzer kimi açılır” şikayətinin adətən səbəbi budur. */
function isStandalone(){
  return !!(window.navigator.standalone
    || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches));
}
function isIOS(){
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function isIOSSafari(){
  return isIOS() && /Safari/i.test(navigator.userAgent)
    && !/CriOS|FxiOS|EdgiOS|OPiOS|Brave/i.test(navigator.userAgent) && !window.brave;
}
function installCard(){
  if(isStandalone() || state.profile.hideInstall) return "";
  if(!isIOS()) return "";
  const url = location.origin + location.pathname.replace(/[^/]*$/, "");
  return `<div class="card tight" style="margin-top:12px">
    <div class="h-big" style="font-size:19px">Tam ekranda aç</div>
    ${isIOSSafari()
      ? `<div class="small" style="margin-top:6px">Aşağıdakı <b style="color:var(--ink)">Paylaş</b> düyməsi → <b style="color:var(--ink)">“Ana ekrana əlavə et”</b>. Sonra tətbiqi həmişə həmin ikondan aç — ünvan sətri və brauzer düymələri yox olur, oflayn da işləyir.</div>`
      : `<div class="small" style="margin-top:6px">Bu brauzerdən əlavə etsən yenə brauzer kimi açılacaq — iOS-da tam ekran tətbiq yalnız <b style="color:var(--ink)">Safari</b>-dən yaranır. Ünvanı Safari-də aç, sonra Paylaş → “Ana ekrana əlavə et”.
         <br><br><b style="color:var(--ink)">${esc(url)}</b></div>`}
    <div class="small" style="margin-top:8px">Ana ekran tətbiqinin yaddaşı brauzer tabından ayrıdır — açandan sonra Ayarlardan bulud hesabına daxil ol ki, qeydlərin oraya gəlsin.</div>
    <button class="btn sm ghost" style="margin-top:10px;width:100%" onclick="hideInstall()">Bağla</button>
  </div>`;
}
function hideInstall(){ state.profile.hideInstall = true; save(); renderToday(); }
function profileDone(){ const p=state.profile; return !!(p.setupDone || (p.name && (p.w || state.weights.length))); }
function isFirstEver(){ return state.sessions.length===0 && !state.profile.skipFoundation; }
function isoOf(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function suppToday(kind){ const e=state.supps.find(x=>x.d===todayISO()); return !!(e && e[kind]); }
function toggleSupp(kind){
  const t = todayISO();
  let e = state.supps.find(x=>x.d===t);
  if(!e){ e = {d:t, creatine:false, protein:false}; state.supps.push(e); state.supps.sort((a,b)=>a.d<b.d?-1:1); }
  e[kind] = !e[kind]; e.ts = Date.now();
  save(); renderToday();
}
function suppStreak(kind){
  let n=0, d=new Date();
  while(true){
    const e = state.supps.find(x=>x.d===isoOf(d));
    if(!e || !e[kind]) break;
    n++; d.setDate(d.getDate()-1);
  }
  return n;
}
const FOUNDATION_NOTE = "1-ci gün · Təməl Məşqi — yüngül saxlayın. Bədəniniz hər hərəkəti təhlükəsiz öyrənsin deyə demək olar ki, çox asan hiss olunan çəki seçin (~50-60% səy). Bu günkü dövrlər yarıya endirilib; tam həcm və proqressiv yükləmə növbəti məşqdən başlayacaq.";

/* ================= tabs ================= */
let viewDay = null, selLift = null;
function switchTab(name){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("on"));
  $("#view-"+name).classList.add("on");
  document.querySelectorAll(".tabbar button").forEach(b=>b.classList.toggle("on", b.dataset.tab===name));
  ({today:renderToday, train:renderTrain, plan:renderPlan, set:renderSettings, prog:renderProg})[name]();
  window.scrollTo({top:0});
}
function refresh(){ const on=document.querySelector(".tabbar button.on").dataset.tab; switchTab(on); }

/* ================= GÜNDƏLİK BRİFİNQ =================
   Məqsəd: telefonda 20 saniyə. Bu gün nə etməli, nəyə diqqət, harada geri qalırsan. */
function loggedVolume(days){
  const cut = Date.now() - days*86400000, vol = {};
  state.sessions.forEach(s=>{
    const [y,m,d] = s.d.split("-").map(Number);
    if(new Date(y,m-1,d).getTime() < cut) return;
    s.ex.forEach(e=>{
      const lib = histEx(e.key); if(!lib) return;
      const n = e.sets.length;
      (lib.pri||[]).forEach(k=>vol[k] = (vol[k]||0) + n);
      (lib.sec||[]).forEach(k=>vol[k] = (vol[k]||0) + n/2);
    });
  });
  return vol;
}
function tonnage(s){
  return s.ex.reduce((a,e)=>{
    const f = unitOf(histEx(e.key)) === "lb" ? 0.4536 : 1;   /* tonajda hamısı kq-a çevrilir */
    /* iki tərəfli avadanlıqda xanadakı rəqəm bir tərəfdir — tonaj üçün ikiqat */
    const side = SIDE_LOADS.includes((histEx(e.key)||{}).load) ? 2 : 1;
    return a + normSets(e.key, e.sets, s.conv).reduce((b,st)=>b + (st.kg||0)*f*side*st.reps, 0);
  }, 0);
}
/* bu gün çəki artırılacaq hərəkətlər */
function dueIncreases(day){
  const out = [];
  (PROGRAM[day] ? PROGRAM[day].ex : []).forEach(ex=>{
    const pl = progressPlan(ex.key);
    if(!pl) return;
    const H = exSessions(ex.key, 1);
    const top = H.length ? H[0].top.kg : 0;
    if(pl.action === "up" && pl.kg > top) out.push({t:`${ex.name}: ${top} → <b>${pl.kg} ${unitOf(ex)}</b>`, c:"up", i:"↑"});
    else if(pl.action === "deload") out.push({t:`${ex.name}: üç məşqdir yerində sayır — <b>${pl.kg} ${unitOf(ex)}</b>-a en`, c:"", i:"↓"});
    else if(pl.action === "down") out.push({t:`${ex.name}: çəki ağır gəlib — <b>${pl.kg} ${unitOf(ex)}</b>-a qayıt`, c:"", i:"↓"});
  });
  return out;
}
function briefItems(day){
  const items = [], vol = loggedVolume(14);
  dueIncreases(day).slice(0,3).forEach(x=>items.push({i:x.i, t:x.t, c:x.c}));
  /* 14 gündə heç işlənməyən və ya çox az işlənən əzələ */
  const low = Object.keys(MUSN).filter(m=>(vol[m]||0) < 4);
  if(state.sessions.length >= 3 && low.length)
    items.push({i:"!", t:`Son 2 həftədə az işlənib: <b>${low.slice(0,3).map(m=>MUSN[m]).join(", ")}</b>`, c:""});
  /* çəki trendi */
  if(state.weights.length >= 2){
    const w = state.weights[state.weights.length-1], w0 = state.weights.find(x=>x.d >= isoOf(new Date(Date.now()-14*86400000))) || state.weights[0];
    const d = Math.round((w.kg - w0.kg)*10)/10;
    if(w0 !== w) items.push({i:"◷", t:`Bədən çəkisi 2 həftədə <b>${d>0?"+":""}${d} kq</b> — kütlə üçün hədəf +0.5-1 kq`, c: d>0?"up":""});
  }
  const n = lastNote(day);
  if(n) items.push({i:"✎", t:`Keçən qeydin: <i>${esc(n)}</i>`, c:""});
  if(!items.length) items.push({i:"→", t:"İlk məşqini qeyd et — buradakı tövsiyələr sənin rəqəmlərindən çıxacaq.", c:""});
  return items;
}
/* ================= TODAY ================= */
/* “Bugün” kartındakı qısa siyahı: nə edəcəyəm və hansı çəki ilə — bir baxışda.
   Çəkilər proqressiya alqoritmindən gəlir, yəni məşqi açanda görəcəyinin eynisidir. */
const PEEK_MARK = { up:"↑", down:"↓", deload:"↓", reps:"→", hold:"→", first:"•", ref:"≈" };
function planPeek(D){
  const list = PROGRAM[D] ? PROGRAM[D].ex : [];
  if(!list.length) return "";
  let anyNew = false;
  const rows = list.map((e,i)=>{
    const p = progressPlan(e.key), u = unitOf(e);
    const eff = p && p.kg;
    let val, cls;
    if(eff > 0){
      /* bədən çəkisi hərəkətində rəqəm ƏLAVƏ diskdir, hərəkətin öz çəkisi deyil */
      val = e.bodyweight ? `BÇ +${p.kg} ${u}` : `${p.kg} ${u}`;
      cls = p.action==="up" ? "up" : (p.action==="down"||p.action==="deload" ? "dn" : "");
    }
    else if(e.bodyweight){ val = "bədən çəkisi"; cls = ""; }
    else { val = "çəki seç"; cls = "new"; anyNew = true; }
    const reps = (p && p.reps) || e.rMax;
    return `<div class="prow">
      <span class="pn">${i+1}. ${esc(e.name)}</span>
      <span class="ps">${e.sets}×${reps}</span>
      <span class="pv ${cls}">${val}<i>${PEEK_MARK[p && p.action] || ""}</i></span>
    </div>`;
  }).join("");
  return `<div class="peek">${rows}</div>
    <div class="peekleg">↑ ÇƏKİ ARTIR · → EYNİ ÇƏKİ, TƏKRAR ARTIR · ↓ YÜNGÜLLƏŞDİR${anyNew?" · • İLK DƏFƏ":""}</div>`;
}
function renderToday(){
  const p = state.profile, nd = nextDay(), D = PROGRAM[nd];
  const last = state.sessions[state.sessions.length-1];
  const nt = nextTrainISO(), rest = isRestToday();
  const w = latestW();
  const prevW = state.weights.length>1 ? state.weights[state.weights.length-2].kg : null;
  const dlt = (w && prevW) ? (w-prevW) : null;
  const tip = TIPS[(state.sessions.length + new Date().getDate()) % TIPS.length];

  let setup = "";
  if(!profileDone()){
    setup = `<div class="card">
      <div class="h-big">Başlayaq</div>
      <div class="sub" style="margin-top:2px">İki xana — proqres izlənməsi bununla işə düşür.</div>
      <div class="grid2">
        <div class="field"><label>Ad</label><input id="su-name" value="${esc(p.name)}"></div>
        <div class="field"><label>Çəki (kq) — istəyə bağlı</label><input id="su-w" type="text" inputmode="decimal" step="0.1" value="${esc(p.w)}" placeholder="70"></div>
      </div>
      <button class="btn block" onclick="saveSetup()">Yadda saxla və başla</button>
    </div>`;
  }

  $("#view-today").innerHTML = `
    ${migrationNote ? `<div class="warnnote" style="margin-top:12px">${migrationNote}
      <button class="btn sm ghost" style="margin-top:10px" onclick="migrationNote='';renderToday()">Başa düşdüm</button></div>` : ""}
    ${staleCard()}
    ${installCard()}
    ${p.name && profileDone() ? `<div class="h-big" style="margin:8px 2px 0">Hazırsınız, ${esc(p.name)}.</div>` : ""}
    ${setup}
    <div class="sect">Növbəti məşq</div>
    <div class="card">
      <div class="exhead">
        <div>
          <div class="h-big"><span class="mini-plate mp-${D.cls}"></span>${D.name}</div>
          <div class="sub">${D.sub} · ${D.ex.length} hərəkət · ~${dayMinutes(nd)} dəq</div>
        </div>
      </div>
      <div class="lastline" style="margin:8px 0 12px">${ state.active ? `<b>Məşq davam edir</b> — zalda ${hm(sessionMinutes(state.active, staleHours() ? 0 : GAP_CAP))}.` : last ? `Son məşq: <b>${fmtD(last.d)}</b> · ${dayMeta(last.day).name}` : `Birinci gün. Sıra: <b>İtələmə → Çəkmə → Ayaq → Tam bədən</b>, sonra yenidən başdan.` }</div>
      ${state.active ? "" : planPeek(nd)}
      ${(state.active ? state.active.foundation : isFirstEver()) ? `<div class="warnnote" style="margin-bottom:12px">${FOUNDATION_NOTE}
        ${!state.active ? `<button class="btn sm ghost" style="margin-top:10px" onclick="skipFoundation()">Bu mənim ilk məşqim deyil — tam həcmlə başla</button>` : ""}</div>` : ""}
      <button class="btn block" onclick="${state.active ? "switchTab('train')" : `startSession('${nd}')`}">${state.active ? "Məşqə davam et" : D.name+" başla"}</button>
      ${!state.active && rest ? `<div class="small" style="margin-top:10px;text-align:center">Bu gün cədvəldə yoxdur — növbəti məşq <b style="color:var(--ink)">${WD_FULL[wdOf(nt)]}, ${fmtD(nt)}</b>. İstəsən bu gün də başlaya bilərsən.</div>` : ""}
    </div>

    <div class="sect">Bu gün nəyə diqqət</div>
    <div class="card">
      <div class="brief">${briefItems(nd).map(b=>`<div class="brow ${b.c}"><span class="bi">${b.i}</span><p>${b.t}</p></div>`).join("")}</div>
    </div>

    <div class="sect">Həftəlik cədvəl</div>
    <div class="card tight">
      <div class="strip">${scheduleStrip().map((d,i)=>{
        return `<div class="sday ${d.on?"on":""} ${i===0?"today":""}">
          <span class="wd">${WD_SHORT[wdOf(d.iso)]}</span>
          <span class="dn num">${d.iso.slice(-2)}</span>
          <span class="dot"></span></div>`;
      }).join("")}</div>
      <div class="small" style="margin-top:10px">Sarı nöqtə = məşq günü. Sıradakı məşq <b style="color:var(--ink)">${D.name}</b> — bir gün buraxsan itmir, növbəti məşq gününə sürüşür.</div>
    </div>

    ${profileDone() && !wLoggedToday() ? `<div class="card tight wlog">
      <div class="inline-log">
        <input id="qw" type="text" inputmode="decimal" step="0.1" placeholder="Bugünkü çəki (kq)${w?" · son "+w.toFixed(1).replace(/\.0$/,""):""}">
        <button class="btn sm" onclick="addWeight('qw')">Qeyd et</button>
      </div>
      <div class="small" style="margin-top:8px">Səhər, yeməkdən əvvəl çəkil. Qeyd etdikdən sonra bu sahə bu günlük yığılır.</div>
    </div>` : ""}

    <div class="stats">
      <div class="stat"><div class="v num">${w ? w.toFixed(1).replace(/\.0$/,"") : "—"}<small> kq</small></div><div class="l">Bədən çəkisi ${dlt!==null?`<span class="${dlt>=0?"delta-up":"delta-dn"}">${dlt>=0?"+":""}${dlt.toFixed(1)}</span>`:""}${wLoggedToday()?` <span style="color:var(--green)">✓</span>`:""}</div></div>
      <div class="stat"><div class="v num">${weekCount()}<small> / ${weeklyTarget()}</small></div><div class="l">Son 7 gün</div></div>
      <div class="stat"><div class="v num">${state.sessions.length}</div><div class="l">Ümumi məşq sayı</div></div>
    </div>

    ${profileDone() ? `<div class="sect">Bədən çəkisini qeyd et</div>
    <div class="card tight"><div class="inline-log">
      <input id="qw2" type="text" inputmode="decimal" step="0.1" placeholder="${w?w.toFixed(1):"kq"}">
      <button class="btn sm" onclick="addWeight('qw2')">Qeyd et</button>
    </div><div class="small" style="margin-top:8px">Həftədə 2-3 dəfə, səhərlər, yeməkdən əvvəl çəkilin. Kütlə dövründə hədəf: <b style="color:var(--ink)">+0.25-0.5 kq/həftə</b>.</div></div>` : ""}

    <div class="sect">Əlavələr</div>
    <div class="card tight"><div class="supprow">
      <button class="suppbtn ${suppToday("creatine")?"on":""}" onclick="toggleSupp('creatine')">
        <span class="si">✓</span>
        <span class="st"><b>Kreatin</b><small>5 q, hər gün</small></span>
        <span class="sk">${suppStreak("creatine")} gün 🔥</span>
      </button>
      <button class="suppbtn ${suppToday("protein")?"on":""}" onclick="toggleSupp('protein')">
        <span class="si">✓</span>
        <span class="st"><b>Protein tozu</b><small>zülal hədəfini bağlamaq üçün</small></span>
        <span class="sk">${suppStreak("protein")} gün 🔥</span>
      </button>
    </div></div>

    <div class="sect">Məşqçinin köşəsi</div>
    <div class="card coach"><div class="cq">“</div><div><p>${tip}</p><div class="who">— Protokol</div></div></div>`;
}
