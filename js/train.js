/* ================= QIZIŞMA =================
   Günə uyğun 3-5 dəqiqəlik siyahı. Ümumi qan dövranı → həmin günün oynaqları →
   ilk hərəkətin yüngül təkrarları. İşarələr aktiv məşqdə saxlanılır, proqressiyaya
   təsir etmir — sadəcə heç nəyi unutmamaq üçün. */
const WARMUPS = {
  P:[{t:"Yüngül kardio — velosiped və ya yerində qaçış", d:"2 dəq"},
     {t:"Qol dairələri — irəli və geri", d:"15 + 15"},
     {t:"Rezinlə çiyin açması (band pull-apart)", d:"20 təkrar"},
     {t:"Divar boyunca kürək sürüşdürmə (wall slide)", d:"10 təkrar"},
     {t:"Boş ştanqla bench press", d:"10 təkrar"}],
  L:[{t:"Yüngül kardio — velosiped və ya kürək çəkmə aparatı", d:"2 dəq"},
     {t:"Turnikdən sərbəst asılma", d:"20-30 saniyə"},
     {t:"Rezinlə kürək çəkməsi (band row)", d:"15 təkrar"},
     {t:"Kürək sümüyü çəkmələri (scapular pull-up)", d:"10 təkrar"},
     {t:"Çox yüngül lat pulldown", d:"12 təkrar"}],
  G:[{t:"Velosiped və ya yerində qaçış", d:"3 dəq"},
     {t:"Bədən çəkisi ilə çömbəlmə", d:"15 təkrar"},
     {t:"Ayaq yellənmələri — ön-arxa və yan", d:"hər ayaq 10"},
     {t:"Boş ştanqla omba açması (hip hinge)", d:"12 təkrar"},
     {t:"Boş ştanqla çömbəlmə", d:"10 təkrar"}],
  F:[{t:"Yüngül kardio", d:"2 dəq"},
     {t:"Ən yaxşı ümumi uzanma (world's greatest stretch)", d:"hər tərəf 5"},
     {t:"Rezinlə çiyin açması", d:"15 təkrar"},
     {t:"Bədən çəkisi ilə çömbəlmə", d:"10 təkrar"},
     {t:"Yüngül push-up", d:"10 təkrar"}]
};
function warmupCard(D){
  const items = WARMUPS[D] || [];
  const live = !!(state.active && state.active.day===D);
  const done = live && !!state.active.warmDone;
  /* yığılmış saxlanılır — hər məşqdə oxumağa ehtiyac yoxdur, lazım olanda açılır */
  return `<details class="rules wu ${done?"done":""}" id="wuCard">
    <summary><span>Qızışma · 3-5 dəq${done?" · bitdi ✓":""}</span></summary>
    <div class="inner">
      <ol class="wulist">${items.map(w=>`<li><b>${w.t}</b><small>${w.d}</small></li>`).join("")}</ol>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn sm ghost"${act("startTimer",240,"Qızışma")}>⏱ 4 dəq</button>
        ${live ? `<button class="btn sm ${done?"ghost":""}" style="flex:1"${act("toggleWarmDone")}>${done?"✓ bitdi — geri al":"Qızışmanı bitdi kimi işarələ"}</button>` : ""}
      </div>
      <div class="small" style="margin-top:10px">Sonra ilk hərəkətə tədricən keçin: boş ştanqla ×10, ~50% ×6, ~70% ×3 — bu qızışma dövrləri iş dövrü sayılmır. İlk iş dövrünü işarələyəndə qızışma avtomatik bitmiş sayılır.</div>
    </div>
  </details>`;
}
function toggleWarmDone(){
  const a = state.active; if(!a) return;
  a.warmDone = !a.warmDone;
  save();
  redrawWarm();
  if(a.warmDone) toast("Qızışma bitdi — işə başlayın");
}
function redrawWarm(){
  const a = state.active; if(!a) return;
  const el = document.getElementById("wuCard");
  /* yalnız bu kartı yenidən çəkirik — açıq “qaydalar” bölməsi və fokus itməsin */
  if(el) el.outerHTML = warmupCard(a.day); else renderTrain();
}

/* ================= MƏŞQ VAXTI =================
   Problem: bəzən taymeri başlatmağı və ya bitirməyi unudursunuz.
   Həll: vaxt düymələrdən yox, QEYDLƏRDƏN hesablanır. Başlanğıc + hər işarələnmiş
   dövrün vaxtı nöqtə kimi saxlanılır; qonşu nöqtələr arasındakı fasilə 20 dəqiqədən
   çox olarsa, yalnız 20 dəqiqə sayılır. Beləliklə:
     · “Bitir”i basmağı unutsanız — saatlarla açıq qalan məşq vaxtı şişirtmir.
     · Zalda uzun söhbət/gözləmə olsa — o boşluq da kəsilir.
     · Başlatmağı unutsanız — başlanğıcı geriyə sürüşdürə bilirsiniz (aşağıda).
   Rəqəm “zalda keçən real vaxt”dır, ilk qeyddən sonuncu qeydə qədər. */
const GAP_CAP = 20*60000;   /* dövrlər arası ən çox sayılan fasilə */
const TAIL_CAP = 5*60000;   /* sonuncu dövrdən “Bitir”ə qədər sayılan vaxt */
function sessionMarks(a){
  const m = [];
  if(a && a.startedAt) m.push(a.startedAt);
  Object.values((a && a.ex) || {}).forEach(sets => sets.forEach(s => { if(s.t) m.push(s.t); }));
  return m.sort((x,y)=>x-y);
}
function sessionSeconds(a, tailCap){
  const m = sessionMarks(a);
  if(!m.length) return null;
  let tot = 0;
  for(let i=1;i<m.length;i++) tot += Math.min(m[i]-m[i-1], GAP_CAP);
  if(tailCap) tot += Math.min(Date.now()-m[m.length-1], tailCap);
  return Math.round(tot/1000);
}
function sessionMinutes(a, tailCap){
  const s = sessionSeconds(a, tailCap);
  return s==null ? null : Math.round(s/60);
}
function lastMark(a){ const m = sessionMarks(a); return m.length ? m[m.length-1] : 0; }
/* açıq qalmış məşq: sonuncu qeyddən STALE_MIN dəqiqədən çox keçib */
const STALE_MIN = 90;
function staleMins(){
  const a = state.active; if(!a) return 0;
  const l = lastMark(a); if(!l) return 0;
  const m = (Date.now()-l)/60000;
  return m >= STALE_MIN ? Math.round(m) : 0;
}
function staleHours(){ return staleMins() ? staleMins()/60 : 0; }
function hm(min){
  if(min==null) return "—";
  return min >= 60 ? `${Math.floor(min/60)} sa ${min%60} dəq` : `${min} dəq`;
}
/* dəqiqədən dəqiq: saniyəni də göstərir — “Bitir” anında yadda saxlanan
   müddət artıq yalnız dəqiqəyə yuvarlanmır (rec.sec), bura onu göstərir */
function hms(sec){
  if(sec==null) return "—";
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
  if(h) return `${h} sa ${m} dəq`;
  return s ? `${m} dəq ${s} san` : `${m} dəq`;
}
function clockChip(){
  const a = state.active; if(!a) return "";
  const live = sessionMinutes(a, staleHours() ? 0 : GAP_CAP);   /* açıq qalıbsa quyruq sayılmır */
  const idle = Math.round((Date.now()-lastMark(a))/60000);
  return `<button type="button" class="clock"${act("openClockFix")}>
    <span class="cl-l">Zalda</span><b class="num">${hm(live)}</b>
    <span class="cl-r">${idle>=10?`son qeyddən ${idle} dəq`:"davam edir"} · düzəlt</span></button>`;
}
function openClockFix(){
  const a = state.active; if(!a) return;
  const st = new Date(a.startedAt||Date.now());
  $("#sheet").innerHTML = `${SHEETHEAD}
    <h3>Məşq vaxtı</h3>
    <div class="stag">Başlanğıc: ${String(st.getHours()).padStart(2,"0")}:${String(st.getMinutes()).padStart(2,"0")} · hesablanan: ${hm(sessionMinutes(a, staleHours() ? 0 : GAP_CAP))}</div>
    <div class="small" style="margin:8px 0 12px">Zala girəndə tətbiqi açmağı unutmusunuzsa, başlanğıcı geriyə sürüşdürün. Vaxt onsuz da qeydlərdən hesablanır: dövrlər arasındakı 20 dəqiqədən uzun boşluqlar sayılmır, ona görə “Bitir”i basmağı unutmağınız nəticəni pozmur.</div>
    <div class="chips fil">
      <button type="button" class="pick"${act("shiftStart",-5)}>−5 dəq</button>
      <button type="button" class="pick"${act("shiftStart",-10)}>−10 dəq</button>
      <button type="button" class="pick"${act("shiftStart",-15)}>−15 dəq</button>
      <button type="button" class="pick"${act("shiftStart",5)}>+5 dəq</button>
    </div>
    <button class="btn block ghost" style="margin-top:12px"${act("closeSheet")}>Bağla</button>`;
  openSheet();
}
function shiftStart(min){
  const a = state.active; if(!a || !a.startedAt) return;
  const first = sessionMarks(a).filter(t=>t!==a.startedAt)[0] || Date.now();
  a.startedAt = Math.min(Math.max(a.startedAt + min*60000, Date.now()-8*3600000), first);
  save(); openClockFix(); renderTrain();
  toast("Başlanğıc düzəldildi: " + hm(sessionMinutes(a, staleHours() ? 0 : GAP_CAP)));
}
/* açıq qalmış məşq üçün xəbərdarlıq kartı (Bugün və Məşq səhifələrində) */
function staleCard(){
  if(!staleMins()) return "";
  const a = state.active;
  return `<div class="warnnote">
    <b>Məşq hələ də açıqdır.</b> Sonuncu dövr ${hm(staleMins())} əvvəl qeyd edilib —
    yəqin “Bitir”i basmağı unutmusunuz. Real vaxt buna görə şişmir: hesablanan müddət
    <b>${hm(sessionMinutes(a, 0))}</b>.
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn sm" style="flex:1"${act("finishSession")}>Bitir və yadda saxla</button>
      <button class="btn sm ghost" style="flex:1"${act("switchTab","train")}>Davam edirəm</button>
    </div></div>`;
}
/* canlı saat: yalnız aktiv məşq varkən və səhifə görünəndə işləyir */
setInterval(()=>{
  if(!state.active || document.hidden) return;
  const el = document.querySelector(".clock");
  if(el) el.outerHTML = clockChip();
}, 30000);

/* Məşqin əvvəlində: bu gün hansı əzələlər yüklənəcək — anatomik xəritə üstündə
   qırmızı, yanında ən çox işləyən əzələlərin siyahısı. */
function dayMuscleCard(D){
  const slots = daySlots(D);
  /* məşq gedirsə, ⇄ ilə dəyişdirilmiş hərəkət nəzərə alınır — kart altındakı
     kartlarla ziddiyyət təşkil etməsin */
  const live = (state.active && state.active.day===D)
    ? slots.map(s => ({ ...s, k: (state.active.swap && state.active.swap[s.k]) || s.k }))
    : slots;
  const vol = muscleVolume(live);
  const top = Object.keys(MUSN).map(m=>({m, v:vol[m]||0})).filter(r=>r.v>0).sort((a,b)=>b.v-a.v);
  if(!top.length) return "";
  const sets = slots.reduce((a,s)=>a+(+s.sets||0),0);
  return `<div class="card daymus"><div class="dm-in">
    <div class="exhead" style="align-items:center;margin-bottom:4px">
      <div><div class="name">Bu gün işləyən əzələlər</div>
      <div class="small">${sets} iş dövrü · ~${dayMinutes(D)} dəq</div></div>
    </div>
    <div class="bodywrap sm">
      <div class="bodyfig">${bodySVG("front",vol)}</div>
      <div class="bodyfig">${bodySVG("back",vol)}</div>
      <div class="muslist">${top.map(r=>`<div class="musrow"><span class="md" style="opacity:${Math.min(1, 0.45 + r.v*0.05).toFixed(2)}"></span>
        <span class="mnm">${MUSN[r.m]}</span><span class="mvv num">${Math.round(r.v*10)/10}</span></div>`).join("")}</div>
    </div>
  </div></div>`;
}
/* “Son:” sətri. Bu hərəkətin öz qeydi yoxdursa, ailədən referens göstərilir —
   əks halda alternativə keçəndə kart tamamilə boş qalırdı. */
function perfLine(key, p){
  if(p) return `<div class="lastline">Son (${fmtD(p.d)}): <b class="num">${perfStr(p)}</b></div>`;
  const ref = famPerf(key);
  if(!ref) return "";
  return `<div class="lastline">Referens — <b>${esc(ref.name)}</b> (${fmtD(ref.d)}): <b class="num">${perfStr(ref)}</b>`
    + `${ref.sameLoad ? "" : " <span class=\"atn\">· fərqli avadanlıq</span>"}</div>`;
}
/* ================= TRAIN ================= */
function renderTrain(){
  if(viewDay===null) viewDay = nextDay();
  if(state.active) viewDay = state.active.day;
  if(!PROGRAM[viewDay]) viewDay = nextDay();
  const D = PROGRAM[viewDay];
  const days = DAYS.map(k=>`<button class="daysel ${state.active&&state.active.day!==k?"lock":""}"${act("selDay",k)} aria-label="${esc(DAY_META[k].name)}" aria-pressed="${viewDay===k}">
      <span class="plate plate-${DAY_META[k].cls} ${viewDay===k?"on":""}"><span>${DAY_META[k].letter}</span></span>
      <b>${DAY_META[k].name.split(" · ")[0]}</b></button>`).join("");

  const rules = `<details class="rules"><summary>Məşqçinin qaydaları — bir dəfə oxuyun</summary><div class="inner">
      <div class="rule" style="border-bottom:1px solid var(--line)"><p style="padding-top:10px">${WARMUP}</p></div>
      ${RULES.map(r=>`<div class="rule"><b>${r.t}</b><p>${r.d}</p></div>`).join("")}
    </div></details>`;

  let body;
  if(state.active && state.active.day===viewDay){
    const extras = activeExtras(viewDay);
    body = D.ex.concat(extras.map(k => EXMAP[k])).map((ex,i)=>{
      const extra = i >= D.ex.length;
      const eff = extra ? ex : effEx(ex.key), swapped = eff.key!==ex.key;
      /* plan məşq gedərkən dəyişdirilibsə açar əskik ola bilər — çökmək əvəzinə qururuq */
      if(!Array.isArray(state.active.ex[ex.key]) || !state.active.ex[ex.key].length)
        state.active.ex[ex.key] = Array.from({length:ex.sets}, ()=>({ kg:"", reps:"", done:false, auto:true }));
      const p = lastPerf(eff.key), st = state.active.ex[ex.key];
      /* bütün dövrləri ✓ olan hərəkət bir sətirə yığılır — bitənə yenidən baxmağa
         ehtiyac yoxdur. Toxunanda açılır (düzəliş üçün). */
      const allDone = exDone(ex.key);
      if(allDone && !exOpen.has(ex.key)) return `<div class="card ex exdone" id="exc-${ex.key}" style="--dc:var(--${D.cls})">
        <button type="button" class="exdonebtn"${act("toggleExCard",ex.key)} aria-expanded="false" aria-label="${esc(eff.name)} — bitdi, aç">
          <span class="ok">✓</span>
          <span class="nm"><b>${i+1}. ${esc(eff.name)}</b><small class="num">${esc(doneSummary(ex.key))}</small></span>
          <span class="mut">aç</span>
        </button></div>`;
      const rows = st.map((s,si)=>{
        const pkg = smartKg(ex.key,si), prep = smartReps(ex.key,si);
        const kgPh = (pkg!=null && pkg>0) ? pkg : (eff.bodyweight ? "BÇ" : "kq");
        return `<div class="setrow">
          ${rirIdxHTML(ex.key, si)}
          <div class="stepper">
            <button type="button"${act("stepVal",ex.key,si,"kg",-1)} aria-label="Dövr ${si+1}: çəkini azalt">−</button>
            <input id="in-${ex.key}-${si}-kg" type="text" inputmode="decimal" step="0.5" placeholder="${esc(kgPh)}" value="${esc(s.kg)}" class="${s.auto?"gh":""}"${onInput("setVal",ex.key,si,"kg")} aria-label="Dövr ${si+1}: çəki (${esc(unitOf(eff))})">
            <button type="button"${act("stepVal",ex.key,si,"kg",1)} aria-label="Dövr ${si+1}: çəkini artır">+</button>
          </div>
          <div class="stepper">
            <button type="button"${act("stepVal",ex.key,si,"reps",-1)} aria-label="Dövr ${si+1}: təkrarı azalt">−</button>
            <input id="in-${ex.key}-${si}-reps" type="text" inputmode="numeric" placeholder="${esc(prep)}" value="${esc(s.reps)}" class="${s.auto?"gh":""}"${onInput("setVal",ex.key,si,"reps")} aria-label="Dövr ${si+1}: təkrar">
            <button type="button"${act("stepVal",ex.key,si,"reps",1)} aria-label="Dövr ${si+1}: təkrarı artır">+</button>
          </div>
          <button type="button" id="ck-${ex.key}-${si}" class="check ${s.done?"done":""} ${s.done&&s.pr?"pr":""}"${act("toggleDone",ex.key,si)} aria-pressed="${!!s.done}" aria-label="Dövr ${si+1}: bitdi">✓</button>
        </div>
        <div id="rr-${ex.key}-${si}">${rirRowHTML(ex.key, si)}</div>`;
      }).join("");
      const h = hintFor(eff,p);
      const wk = (st[0] && parseFloat(st[0].kg)) || suggestKg(eff.key);
      /* Qızışma faizləri ÜMUMİ yükdən hesablanır, sonra yenidən xanadakı vahidə
         (ştanqda hər tərəfə) çevrilir — əks halda dəmirin öz çəkisi nəzərə alınmır
         və 40% real 40% olmur. */
      const rampKg = f => {
        if(eff.load !== "bar") return r25(wk*f);
        const bar = gymCfg().bar, tot = wk*2 + bar;
        return Math.max(0, r25((tot*f - bar)/2));
      };
      const rampOK = eff.rest>=120 && wk && (eff.load==="bar" ? (wk*2+gymCfg().bar) >= 40 : wk >= 30);
      const ramp = rampOK ? `<div class="ramp">Qızışma dövrləri: <b class="num">${rampKg(0.4)} × 8 → ${rampKg(0.6)} × 5 → ${rampKg(0.8)} × 3</b>${eff.load==="bar" ? " <span class=\"atn\">(hər tərəfə — boş dəmir də bir dövrdür)</span>" : ""} — sonra iş dövrləri (sayılmır)</div>` : "";
      const pb = plateBreak(wk, eff), dst = exStep(eff.key);
      const plateLine = pb ? `<div class="ramp"><b class="num">${wk} kq</b> = ${pb}</div>`
        : (dst && wk > 0) ? `<div class="ramp"><b class="num">${wk} ${unitOf(eff)}</b> = ${Math.round(wk/dst*10)/10} daş × ${dst}</div>` : "";
      return `<div class="card ex" id="exc-${ex.key}" style="--dc:var(--${D.cls})">
        <div class="exhead"><div class="exname">
          ${exImg(eff,"exanim sm")}
          <div>
            <div class="name">${i+1}. ${esc(eff.name)}</div>
            <div class="meta"><span class="tag hot">${eff.sets} × ${eff.rMin}-${eff.rMax}</span><span class="tag">⏱ ${Math.round(eff.rest/60*10)/10} dəq</span><button type="button" class="tag lt"${act("loadInfo",eff.key)} aria-label="Çəki xanası: ${esc(loadTag(eff))} — izah">${esc(loadTag(eff))}</button>${swapped?`<span class="tag swp">alternativ</span>`:""}${extra?`<span class="tag swp">əlavə</span>`:""}</div>
          </div>
        </div><div class="exbtns">${extra
          ? `<button class="techbtn"${act("openTech",viewDay,null,ex.key)}>Texnika</button><button class="techbtn"${act("sessRemove",ex.key)} aria-label="məşqdən çıxar">✕ Çıxar</button>`
          : `<button class="techbtn"${act("openTech",viewDay,i)}>Texnika</button>${swapOpts(ex.key).length>1?`<button class="techbtn"${act("openSwap",ex.key)} aria-label="alternativ hərəkət seç">⇄ Dəyiş</button>`:""}`}</div></div>
        ${perfLine(eff.key, p)}
        <div class="hint ${h.cls}">${h.txt}</div>
        ${plateLine}
        ${ramp}
        <div class="sethdr"><div>Dövr</div><div>${unitOf(eff)}</div><div>Təkrar</div><div>✓</div></div>
        ${rows}
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="techbtn"${act("sessAddSet",ex.key)}>＋ Dövr əlavə et</button>
          ${allDone ? `<button class="techbtn"${act("toggleExCard",ex.key)} aria-expanded="true">▴ Yığ</button>` : ""}
        </div>
        <div id="rl-${ex.key}">${restLineHTML(ex.key)}</div>
      </div>`;
    }).join("");
    body += `<button class="btn block ghost" style="margin-top:6px"${act("openLibPick",viewDay,null,"sess")}>＋ Bu məşqə hərəkət əlavə et</button>
             <div class="small" style="margin:6px 0 10px;text-align:center">Plana yazılmır — yalnız bu məşqin qeydinə düşür.</div>
             <button class="btn block" style="margin-top:6px"${act("finishSession")}>Bitir və yadda saxla</button>
             <button class="btn block danger" style="margin-top:10px"${act("cancelSession")}>Məşqi ləğv et</button>`;
  } else {
    body = D.ex.map((ex,i)=>{
        const p = lastPerf(ex.key), h = hintFor(ex,p);
        return `<div class="card ex" style="--dc:var(--${D.cls})">
          <div class="exhead"><div class="exname">
            ${exImg(ex,"exanim sm")}
            <div>
              <div class="name">${i+1}. ${esc(ex.name)}</div>
              <div class="meta"><span class="tag hot">${ex.sets} × ${ex.rMin}-${ex.rMax}</span><span class="tag">⏱ ${Math.round(ex.rest/60*10)/10} dəq</span><span class="tag lt">${esc(loadTag(ex))}</span></div>
            </div>
          </div><button class="techbtn"${act("openTech",viewDay,i)}>Texnika</button></div>
          ${perfLine(ex.key, p)}
          <div class="hint ${h.cls}">${h.txt}</div>
        </div>`;
      }).join("") +
      `<button class="btn block" style="margin-top:6px"${act("startSession",viewDay)}>${D.name} başla</button>`;
  }

  $("#view-train").innerHTML = `
    <div class="dayrow">${days}</div>
    ${state.active && state.active.day===viewDay ? clockChip() : ""}
    ${staleCard()}
    ${(state.active && state.active.day===viewDay) ? "" : dayMuscleCard(viewDay)}
    ${rules}
    <div class="sect">${D.name} · ${D.sub}</div>
    ${(state.active ? state.active.foundation : isFirstEver()) ? `<div class="warnnote">${FOUNDATION_NOTE}</div>` : ""}
    ${lastNote(viewDay) ? `<div class="card tight"><div class="small" style="letter-spacing:.12em;text-transform:uppercase;font-size:10px;color:var(--dim)">Keçən ${D.name} məşqindən qeydin</div>
      <div style="font-size:13.5px;margin-top:6px">${esc(lastNote(viewDay))}</div></div>` : ""}
    ${warmupCard(viewDay)}
    ${body}`;
}
/* ---- bitmiş hərəkətlər və “növbəti hərəkətə get” ---- */
const exOpen = new Set();              /* bitmiş, amma istifadəçinin açdığı kartlar */
function exDone(key){
  const st = state.active && state.active.ex[key];
  return !!(st && st.length && st.every(s => s.done));
}
function doneSummary(key){
  return (state.active.ex[key] || []).map(s => `${numVal(s.kg) > 0 ? numVal(s.kg) : "BÇ"}×${numVal(s.reps) || 0}`).join(", ");
}
function toggleExCard(key){
  const card = document.getElementById(`exc-${key}`);
  const top = card ? card.getBoundingClientRect().top : null;
  if(exOpen.has(key)) exOpen.delete(key); else exOpen.add(key);
  renderTrain();
  /* kart yerində qalsın — üstündəki hündürlük dəyişsə belə */
  const el = document.getElementById(`exc-${key}`);
  if(el && top != null) jumpTo(el.getBoundingClientRect().top + (window.scrollY||0) - top);
}
/* ilk bitməmiş hərəkətin kartına sürüşdür; tapılmasa false */
function scrollToNext(smooth){
  const a = state.active; if(!a) return false;
  const keys = PROGRAM[a.day].ex.map(e => e.key).concat(activeExtras(a.day));
  const k = keys.find(k => !exDone(k));
  if(!k || k === keys[0] && !(a.ex[k]||[]).some(s => s.done)) return false;   /* heç nə edilməyib — yuxarıdan başla */
  const el = document.getElementById(`exc-${k}`); if(!el) return false;
  const y = el.getBoundingClientRect().top + (window.scrollY||0) - 12;
  if(smooth) window.scrollTo({ top: Math.max(0, y), behavior: "smooth" }); else jumpTo(y);
  return true;
}
function selDay(k){ if(state.active && state.active.day!==k){ toast("Əvvəlcə cari məşqi bitirin və ya ləğv edin"); return; } viewDay=k; renderTrain(); }
function startSession(day){
  const foundation = isFirstEver();
  const exState = {};
  PROGRAM[day].ex.forEach(ex=>{
    const sug = suggestKg(ex.key), rep = suggestReps(ex.key);
    const setCount = foundation ? Math.max(2, Math.round(ex.sets/2)) : ex.sets;
    /* auto:true = “bu rəqəmi tətbiq yazıb”. Boz göstərilir, yadda saxlanmır və
       sən toxunan (və ya ✓ basdığın) an adi dəyərə çevrilir. Beləliklə eyni
       rəqəmi üç dəfə yazmaq lazım gəlmir, amma etmədiyin dövr də qeyd olunmur. */
    exState[ex.key] = Array.from({length:setCount},()=>(
      { kg: sug ?? "", reps: rep>0 ? String(rep) : "", done:false, auto:true }));
  });
  /* startedAt: saat “Başla”dan işə düşür. Zala gec açmısınızsa Məşq səhifəsindəki
     saat çipindən geriyə sürüşdürün — openClockFix(). */
  state.active = { day, started: todayISO(), startedAt: Date.now(), warmDone: false, ex: exState, foundation };
  viewDay = day; save(); switchTab("train");
  toast(foundation ? "Təməl məşqi başladı — yüngül saxlayın." : `${PROGRAM[day].name} başladı · saat işə düşdü.`);
}
/* Məşq gedərkən plandan kənar hərəkət: plan kilidli qalır (başqa məşqlərə təsir
   etmir), hərəkət yalnız bu məşqin dövrlərinə əlavə olunur və buildRecord onu
   tarixçəyə yazır. Çəki/təkrar təklifi adi hərəkətdəki kimidir. */
/* Məşqdə “tutulmuş” açarlar: faktiki hərəkətlər + ⇄ ilə dəyişdirilmiş slotun öz
   açarı (onun dövrləri a.ex[slotKey]-dədir, əlavə hərəkət onları üzərinə yazardı) */
function sessTaken(D){
  return new Set(dayEffKeys(D).concat(daySlots(D).map(s => s.k)));
}
function sessAdd(key){
  const a = state.active; if(!a || !EXMAP[key]) return;
  if(sessTaken(a.day).has(key)){ toast("Bu hərəkət artıq bu məşqdədir"); return; }
  a.extra = Array.isArray(a.extra) ? a.extra : [];
  a.extra.push(key);
  if(!Array.isArray(a.ex[key]) || !a.ex[key].length){
    const sug = suggestKg(key), rep = suggestReps(key);
    a.ex[key] = Array.from({length:EXMAP[key].sets}, ()=>(
      { kg: sug ?? "", reps: rep>0 ? String(rep) : "", done:false, auto:true }));
  }
  closeSheet(); save(); cloudPush(); renderTrain();
  toast(`Əlavə edildi: ${EXMAP[key].name}`);
}
function sessRemove(key){
  const a = state.active; if(!a || !Array.isArray(a.extra)) return;
  const drop = () => {
    a.extra = a.extra.filter(k => k!==key);
    delete a.ex[key];
    save(); cloudPush(); renderTrain(); toast("Məşqdən çıxarıldı");
  };
  const done = (a.ex[key]||[]).filter(s => s.done).length;
  if(done) ask("Hərəkət məşqdən çıxarılsın?", `“${esc(EXMAP[key].name)}” üçün qeyd etdiyin ${done} dövr itəcək.`, "Çıxar", drop, true);
  else drop();
}
/* planlanandan artıq dövr etdinsə — əlavə sətir. Boz təklif kimi başlayır, ✓ basılmasa qeyd olunmur. */
function sessAddSet(key){
  const st = state.active && state.active.ex[key]; if(!st) return;
  const last = st[st.length-1] || {};
  st.push({ kg: last.kg ?? "", reps: last.reps ?? "", done:false, auto:true });
  save(); renderTrain();
}
function setVal(key,i,f,v){
  const s = state.active.ex[key][i];
  /* “22,5” kimi yazılanı nöqtəli saxlayırıq — hesablamalar hamısı parseFloat ilədir */
  s[f] = String(v).replace(",", ".");
  delete s.auto;                        /* əl ilə yazıldı — artıq təklif deyil */
  const row = document.getElementById(`in-${key}-${i}-${f}`);
  if(row) row.classList.remove("gh");
  save();
}
function smartKg(key,i){
  const st = state.active.ex[key];
  for(let j=i-1;j>=0;j--){ const v=parseFloat(st[j].kg); if(v) return v; }
  const p = lastPerf(effEx(key).key);
  if(p) return p.sets[i]?.kg ?? p.sets[p.sets.length-1].kg;
  return null;
}
function smartReps(key,i){
  const st = state.active.ex[key];
  for(let j=i-1;j>=0;j--){ const v=parseFloat(st[j].reps); if(v) return v; }
  return suggestReps(effEx(key).key);
}
function stepVal(key,i,f,dir){
  const s = state.active.ex[key][i];
  const step = f==="kg" ? (EXMAP[key].inc || 2.5) : 1;
  let v = numVal(s[f]);
  if(!v){ v = f==="kg" ? (smartKg(key,i) ?? step) : smartReps(key,i); } /* first tap = accept suggestion */
  else v += dir*step;
  v = Math.max(0, Math.round(v*10)/10);
  s[f] = String(v); delete s.auto;
  const inp = document.getElementById(`in-${key}-${i}-${f}`);
  if(inp){ inp.value = v; inp.classList.remove("gh"); }
  save();
}
/* Taymerdən asılı olmamaq üçün: hər dövrdən sonra növbəti dövrün DƏQİQ saatı
   yazılır (zal saatı fərqi tətbiq olunmuş). Sonuncu dövrdən sonra istirahət
   göstərilmir — növbəti hərəkətə keçilir. */
function restLineHTML(key){
  const a = state.active; if(!a || !a.ex[key]) return "";
  const sets = a.ex[key], eff = effEx(key);
  let last = -1;
  sets.forEach((s,i)=>{ if(s.done && s.t) last = i; });
  if(last < 0) return "";
  if(last === sets.length-1)
    return `<div class="restline done">Bu hərəkət bitdi — istirahət etmədən növbəti hərəkətə keç.</div>`;
  const at = sets[last].t + eff.rest*1000;
  const over = Date.now() > at;
  /* Geri sayım kartın içində də gedir: tam ekran taymerdən çıxsan (və ya onu
     söndürsən) belə neçə saniyə qaldığını görürsən. Rəqəm dövrün qeyd olunma
     vaxtından hesablanır, taymerdən asılı deyil. */
  return `<div class="restline ${over?"over":""}">İstirahət <b>${Math.round(eff.rest/60*10)/10} dəq</b> — `
    + `növbəti dövr:<br><b class="at">${fmtClock(at, false, true)}</b> <span class="atn">zal saatı ilə</span>`
    + ` · <b class="cdn" data-cd="${at}">${cdText(at)}</b></div>`;
}
function cdText(at){
  const left = Math.round((at - Date.now())/1000);
  if(left <= 0) return "vaxt gəlib";
  return Math.floor(left/60) + ":" + String(left%60).padStart(2,"0");
}
/* bir saniyəlik ümumi sayğac — səhifədəki bütün geri sayımları yeniləyir */
setInterval(()=>{
  document.querySelectorAll("[data-cd]").forEach(el=>{
    const at = +el.dataset.cd;
    const t = cdText(at);
    if(el.textContent !== t) el.textContent = t;
    el.classList.toggle("over", at - Date.now() <= 0);
  });
}, 1000);
function toggleDone(key,i){
  const s = state.active.ex[key][i]; s.done = !s.done;
  if(s.done){
    s.t = Date.now();   /* real vaxt bu nöqtələrdən hesablanır — sessionMinutes() */
    /* ✓ = "bu dövrü göstərildiyi kimi etdim". Boz rəqəm yalnız təklifdir; onu
       həqiqi dəyərə çevirməsək, dövr yadda saxlanarkən atılırdı və növbəti məşqdə
       hərəkət "ilk dəfə" kimi görünürdü. Fərqli olubsa xananı əl ilə düzəldirsən. */
    if(!parseFloat(s.kg)){ const k = smartKg(key,i); if(k > 0) s.kg = String(k); }
    if(!(parseFloat(s.reps) > 0)){ const r = smartReps(key,i); if(r > 0) s.reps = String(r); }
    /* Çəki xanası boş qalmış aparat/ştanq dövrü tarixçəyə “0 kq” kimi düşürdü:
       həm “Son: BÇ×12” kimi görünürdü, həm də proqressiyanı sıfıra dartırdı.
       Belə halda ✓ qəbul edilmir — əvvəlcə çəki yazılmalıdır. */
    if(!(parseFloat(s.kg) > 0) && !effEx(key).bodyweight){
      s.done = false; save();
      const el = document.getElementById(`in-${key}-${i}-kg`);
      if(el){
        el.focus(); el.select && el.select();
        el.classList.add("bad"); setTimeout(()=>el.classList.remove("bad"), 1100);
      }
      toast("Əvvəlcə çəkini yaz — çəkisiz dövr qeyd edilmir");
      const b0 = document.getElementById(`ck-${key}-${i}`);
      if(b0){ b0.classList.remove("done"); b0.setAttribute("aria-pressed", "false"); }
      return;
    }
    delete s.auto;                       /* təsdiqlənən dövr artıq təklif deyil */
    /* ehtiyat seçimi bu dövr üçün açılır, eyni hərəkətin digər dövrlərində bağlanır */
    state.active.ex[key].forEach((o,j)=>{ if(j!==i && o.rirOpen){ o.rirOpen = false; redrawRir(key,j); } });
    if(s.rir == null) s.rirOpen = true;
    ["kg","reps"].forEach(f=>{
      const el = document.getElementById(`in-${key}-${i}-${f}`);
      if(el) el.classList.remove("gh");
    });
    /* AŞAĞI DOLDURMA: təsdiqlədiyin dövrün çəki/təkrarı altındakı toxunulmamış
       dövrlərə keçir. 10 etdinsə, altındakılar 10 olur; növbətini 8 etsən,
       ondan aşağısı 8 olur. Əl ilə yazdığın dövrə toxunulmur. */
    const stAll = state.active.ex[key];
    for(let j=i+1;j<stAll.length;j++){
      const o = stAll[j];
      if(o.done || !o.auto) continue;
      o.kg = s.kg; o.reps = s.reps;
      const ik = document.getElementById(`in-${key}-${j}-kg`), ir = document.getElementById(`in-${key}-${j}-reps`);
      if(ik) ik.value = o.kg;
      if(ir) ir.value = o.reps;
    }
    const inp = document.getElementById(`in-${key}-${i}-kg`), inr = document.getElementById(`in-${key}-${i}-reps`);
    if(inp) inp.value = s.kg;
    if(inr) inr.value = s.reps;
    /* qızışmanı bitdi kimi işarələməyi unutmaq adi haldır: iş dövrünə başladınsa
       qızışma onsuz da bitib */
    if(!state.active.warmDone){ state.active.warmDone = true; redrawWarm(); }
    /* sonuncu dövrdən sonra istirahət yoxdur — növbəti hərəkətə keçilir */
    if(i < state.active.ex[key].length - 1) startTimer(EXMAP[key].rest, effEx(key).name);
    else toast("Hərəkət bitdi — növbəti hərəkətə keç");
    /* rekord: dərhal deyirik — zalda motivasiya elə o an lazımdır */
    const pr = livePR(key, i);
    if(pr){
      s.pr = true;
      toast(`🏆 Rekord · ${pr.name}: ${prPlain(pr, pr.u)}`);
      try{ navigator.vibrate && navigator.vibrate([40, 60, 40]); }catch(e){}
    } else delete s.pr;
  } else if(state.active.rest && state.active.rest.label === effEx(key).name){
    /* ✓ geri götürüləndə köhnə istirahət sayğacı arxa fonda işləməyə davam edirdi:
       “növbəti dövr” xətti yoxa çıxırdı, amma üzük köhnə vaxta doğru saymağa davam
       edirdi. Yenidən ✓ edəndə TAM YENİ istirahət başlayırdı — nəticədə əslində
       gözlədiyin vaxtdan çox gözləmiş olurdun. İndi geri götürəndə sayğac da təmizlənir. */
    timerSkip();
  }
  save();
  /* Task 9.1: full renderTrain() here rebuilt the whole view, collapsing the open
     rules <details> and dropping input focus mid-workout. Only the tick changes. */
  const btn = document.getElementById(`ck-${key}-${i}`);
  const rl = document.getElementById(`rl-${key}`);
  if(rl) rl.innerHTML = restLineHTML(key);
  if(!s.done){ delete s.pr; delete s.rir; delete s.rirOpen; }
  redrawRir(key, i);
  if(btn){ btn.classList.toggle("done", s.done); btn.classList.toggle("pr", !!(s.done && s.pr)); btn.setAttribute("aria-pressed", String(!!s.done)); }
  else renderTrain();
}
/* ================= EHTİYAT TƏKRAR (RIR) =================
   “Neçə təkrar də edə bilərdin?” — 0 = daha bir təkrar mümkün deyildi, 4+ = çox
   asan idi. Məcburi deyil: ✓-dən sonra dövrün altında kiçik sıra açılır, seçmə-
   sən heç nə dəyişmir. Seçsən proqressiya ondan istifadə edir:
     · ən ağır dövr belə 3+ ehtiyatla bitibsə — çəki yüngüldür, artırılır;
     · “durğunluq” görünür, amma orta ehtiyat 2+ idisə — problem çəkidə yox,
       səydədir: yüngülləşdirmək əvəzinə son dövrü 0-1 ehtiyatla bitirmək deyilir;
     · adət tanıma (həmişə 10-da dayanırsan) yalnız tükənərək dayananda işləyir —
       2+ ehtiyatla dayanırsansa bu tavan deyil, ona görə 12 hədəfi qalır. */
const RIR_OPTS = [0,1,2,3,4];
const rirLabel = v => v >= 4 ? "4+" : String(v);
function rirOk(v){ const n = numVal(v); return v !== "" && v != null && Number.isFinite(n) && n >= 0 && n <= 10; }
function recSet(s){
  const o = { kg: parseFloat(s.kg)||0, reps: parseFloat(s.reps) };
  if(rirOk(s.rir)) o.rir = Math.min(4, Math.round(numVal(s.rir)));
  return o;
}
function rirIdxHTML(key, i){
  const s = state.active.ex[key][i];
  if(!s.done) return `<div class="idx num">${i+1}</div>`;
  const has = rirOk(s.rir);
  return `<button type="button" id="ri-${key}-${i}" class="idx num rirbtn ${has?"has":""}"${act("rirToggle",key,i)} aria-label="Dövr ${i+1}: ehtiyat təkrar${has?` — ${rirLabel(s.rir)}`:""}" aria-expanded="${!!s.rirOpen}">${i+1}${has?`<small>R${rirLabel(s.rir)}</small>`:""}</button>`;
}
function rirRowHTML(key, i){
  const s = state.active.ex[key][i];
  if(!s.done || !s.rirOpen) return "";
  return `<div class="rirrow" role="group" aria-label="Dövr ${i+1}: daha neçə təkrar edə bilərdin?">
    <span>Daha neçə təkrar?</span>
    <div>${RIR_OPTS.map(v=>`<button type="button" class="rirc ${rirOk(s.rir)&&+s.rir===v?"on":""}"${act("setRir",key,i,v)} aria-pressed="${rirOk(s.rir)&&+s.rir===v}">${rirLabel(v)}</button>`).join("")}</div>
  </div>`;
}
function redrawRir(key, i){
  const row = document.getElementById(`rr-${key}-${i}`);
  if(row) row.innerHTML = rirRowHTML(key, i);
  const old = document.getElementById(`ri-${key}-${i}`) || (row && row.previousElementSibling && row.previousElementSibling.querySelector(".idx"));
  if(old) old.outerHTML = rirIdxHTML(key, i);
}
function setRir(key, i, v){
  const s = state.active && state.active.ex[key] && state.active.ex[key][i]; if(!s || !s.done) return;
  if(rirOk(s.rir) && +s.rir === v) delete s.rir; else s.rir = v;   /* eyni çipə ikinci toxunuş = geri al */
  s.rirOpen = false;
  save(); redrawRir(key, i);
}
function rirToggle(key, i){
  const s = state.active && state.active.ex[key] && state.active.ex[key][i]; if(!s || !s.done) return;
  s.rirOpen = !s.rirOpen;
  save(); redrawRir(key, i);
}
/* qeyd qurma ayrıca: həm “Bitir” düyməsi, həm avtomatik bağlama eyni məntiqi işlədir */
function buildRecord(a){
  /* d: məşqin BAŞLADIĞI gün — gecə yarısını keçən məşq dünənə yazılsın deyə */
  const startISO = a.startedAt ? isoOf(new Date(a.startedAt)) : (a.started || todayISO());
  /* id olmadan açar “tarix|gün” idi: eyni gün eyni tipdə iki məşq etsən,
     birləşdirmə onlardan yalnız birini saxlayırdı. */
  const sec = sessionSeconds(a, staleHours() ? 0 : TAIL_CAP);
  const rec = { id: startISO+"|"+a.day+"|"+(a.startedAt||Date.now()), ts: Date.now(), d: startISO, day: a.day, ex: [], conv: CONV,
    foundation: !!a.foundation, min: sec==null ? null : Math.round(sec/60), sec };
  let n = 0, skipped = 0, zero = 0;
  const logged = s => parseFloat(s.reps) > 0 && !(s.auto && !s.done);   /* boz təklif ≠ edilmiş dövr */
  PROGRAM[a.day].ex.forEach(ex=>{
    const eff = effEx(ex.key);
    const raw = a.ex[ex.key] || [];
    /* a ticked set with no reps cannot be scored — count it so we can say so out loud */
    skipped += raw.filter(s=>s.done && !(parseFloat(s.reps)>0)).length;
    /* reps is the only requirement: kg 0 is legitimate (Back Extension, Assisted Pull-Up,
       Hanging Knee Raise, Decline Sit-Up, Band Pull-Apart all start unloaded) */
    const sets = raw.filter(logged).map(recSet);
    if(!eff.bodyweight) zero += sets.filter(x=>!(x.kg>0)).length;
    if(sets.length){ rec.ex.push({key:eff.key, name:eff.name, sets}); n += sets.length; }
  });
  /* Məşq gedərkən hərəkət plandan çıxarılsa (və ya kitabxanadan silinsə), onun
     qeyd edilmiş dövrləri yuxarıdakı dövrədən kənarda qalır — burada yığılır ki,
     yazılmış heç bir dövr itməsin. */
  Object.keys(a.ex || {}).forEach(k=>{
    if(rec.ex.some(e => e.key===k)) return;
    const sets = (a.ex[k]||[]).filter(logged).map(recSet);
    if(sets.length){ rec.ex.push({ key:k, name: exName(k), sets }); n += sets.length; }
  });
  return { rec, n, skipped, zero };
}
function finishSession(){
  const a = state.active; if(!a) return;
  const { rec, n, skipped, zero } = buildRecord(a);
  if(!n){
    info("Təkrar sayı yazılmayıb",
      "Məşqi yadda saxlamaq üçün ən azı bir dövrün TƏKRAR xanası dolu olmalıdır — tək ✓ işarəsi kifayət etmir, çünki proqressiya təkrar sayına baxır.\n\nÇəki xanası boş qala bilər (bədən çəkisi ilə edilən hərəkətlərdə normaldır).");
    return;
  }
  const warn = (skipped ? `<div class="hint warn" style="margin-top:10px">Diqqət: işarələnmiş ${skipped} dövr təkrar sayı boş olduğu üçün qeyd edilməyəcək.</div>` : "")
    + (zero ? `<div class="hint warn" style="margin-top:10px">Diqqət: ${zero} dövrdə çəki yazılmayıb — onlar <b>0 kq</b> kimi yazılacaq və növbəti dəfə çəki təklifi verə bilməyəcəyəm. İmtina edib çəkiləri doldurmaq daha yaxşıdır.</div>` : "");
  const dur = rec.sec!=null ? ` · <b>${hms(rec.sec)}</b>` : "";
  const prev = lastNote(a.day);
  $("#sheet").innerHTML = `${SHEETHEAD}
    <h3>${PROGRAM[a.day].name} yadda saxlanılsın?</h3>
    <div class="stag">${n} dövr${dur}</div>
    ${warn}
    ${prev ? `<div class="small" style="margin-top:10px">Keçən dəfəki qeydin: <i>“${esc(prev)}”</i></div>` : ""}
    <div class="field" style="margin-top:12px"><label>Bu məşq üçün qeyd (istəyə bağlı)</label>
      <textarea id="fin-note" rows="3" placeholder="məs. bench çətin gəldi, çiyin ağrıdı — növbəti dəfə çəkini saxla"></textarea></div>
    <button class="btn block"${act("saveWithNote")}>Bəli, yadda saxla</button>
    <button class="btn block ghost" style="margin-top:8px"${act("closeSheet")}>İmtina</button>`;
  pendingRec = rec;
  openSheet();
}
let pendingRec = null;
function saveWithNote(){
  const rec = pendingRec; if(!rec) return;
  const t = $("#fin-note");
  const note = t ? t.value.replace(/[<>]/g,"").trim().slice(0,400) : "";
  if(note) rec.note = note;
  rec.ts = Date.now();
  pendingRec = null; closeSheet(); saveSession(rec);
}
/* həmin gün tipi üçün sonuncu qeyd — növbəti dəfə göz önünə çıxarılır */
function lastNote(day){
  for(let i=state.sessions.length-1;i>=0;i--){
    const s = state.sessions[i];
    if(s.day===day && s.note) return s.note;
  }
  return "";
}
/* Yarımçıq məşq bağlananda (bitirildi, ləğv edildi, avtomatik bağlandı) bu
   damğa qoyulur. Birləşdirmə ondan köhnə “yarımçıq məşq”i geri qaytarmır —
   əks halda buludda qalmış nüsxə növbəti sinxronda məşqi özü başladırdı. */
function endActive(){ state.activeEnded = Date.now(); state.active = null; exOpen.clear(); }
/* “Bitir”i unutmaq daha məlumat itirmir: 3 saatdan çox toxunulmayan məşq
   tətbiq növbəti dəfə açılanda özü bağlanır, vaxt sonuncu qeydə qədər sayılır. */
function autoFinishStale(){
  const a = state.active;
  if(!a || !staleMins()) return;
  const { rec, n } = buildRecord(a);
  if(n){
    state.sessions.push(rec); endActive(); save(); cloudPush(true);
    migrationNote = `“Bitir” basılmamışdı — <b>${esc(dayMeta(rec.day).name)}</b> məşqi avtomatik yadda saxlanıldı: `
      + `${n} dövr · ${hms(rec.sec)}. Vaxt sonuncu qeyd edilmiş dövrə qədər hesablanıb, açıq qaldığı saatlar sayılmayıb.`
      + (()=>{ const R = sessionReport(rec); return R.prs.length ? ` 🏆 ${R.prs.length} rekord: ${R.prs.map(p=>esc(p.name)).join(", ")}.` : ""; })();
  } else {
    endActive(); save(); cloudPush(true);
    migrationNote = "Yarımçıq qalmış məşq bağlandı — heç bir dövr qeyd edilmədiyi üçün tarixçəyə yazılmadı.";
  }
}
function saveSession(rec){
  state.sessions.push(rec); endActive(); timerSkip(); save(); cloudPush(true);
  const nxt = DAYS[(DAYS.indexOf(rec.day)+1) % DAYS.length];
  viewDay = nxt;
  switchTab("today");
  /* xülasə vərəqi; təməl məşqində (müqayisə yoxdur) köhnə qısa toast qalır */
  if(!showSummary(rec)) toast(`${dayMeta(rec.day).name} · ${hms(rec.sec)} · növbəti: ${DAY_META[nxt].name}`);
}
function cancelSession(){ ask("Məşq ləğv edilsin?", "Bu məşqdə qeyd etdiyiniz dövrlər itiriləcək. Tarixçəyə heç nə yazılmayacaq.", "Bəli, ləğv et", ()=>{ endActive(); timerSkip(); save(); cloudPush(true); renderTrain(); toast("Məşq ləğv edildi"); }, true); }

/* ================= technique sheet ================= */
function openTech(day,i,extraKey){
  /* extraKey: məşqə sonradan əlavə edilmiş hərəkət — planda indeksi yoxdur, alternativi də */
  const base = extraKey ? EXMAP[extraKey] : PROGRAM[day].ex[i];
  const ex = (!extraKey && state.active && state.active.day===day) ? effEx(base.key) : base;
  const alts = extraKey ? [] : swapOpts(base.key).slice(1);   /* günün başqa slotlarında olanlar çıxarılıb */
  const nf = frames(ex).length;
  $("#sheet").innerHTML = `${SHEETHEAD}
    ${exImg(ex,"exanim big")}
    ${nf>1?`<div class="framelbl"><span>Başlanğıc ⇄ Bitiş</span><span>avtomatik oynayır</span></div>`:""}
    <h3>${esc(ex.name)}</h3><div class="stag">${esc(ex.tag||"")}</div>
    <div class="protoc">
      <span class="tag hot">${ex.sets} × ${ex.rMin}-${ex.rMax}</span>
      <span class="tag">istirahət ${Math.round(ex.rest/60*10)/10} dəq</span>
      <span class="tag">proqres: +${ex.inc} ${unitOf(ex)}</span>
    </div>
    <div class="hint" style="margin-top:8px">Çəki xanası: <b>${loadTag(ex)}</b> — ${LOAD_LBL[ex.load]?LOAD_LBL[ex.load].l:""}</div>
    <div class="cuelist">${(ex.cues||[]).map(c=>`<div class="cue good"><div class="ic">✓</div><p>${esc(c)}</p></div>`).join("")}</div>
    ${(ex.mist||[]).length?`<hr class="split">
    <div class="small" style="letter-spacing:.12em;text-transform:uppercase;font-size:10.5px;margin-bottom:2px">Ümumi səhvlər</div>
    <div class="cuelist">${ex.mist.map(c=>`<div class="cue bad"><div class="ic">✕</div><p>${esc(c)}</p></div>`).join("")}</div>`:""}
    ${alts.length?`<hr class="split">
    <div class="small">Avadanlıq məşğuldursa, alternativlər: <b style="color:var(--ink)">${alts.map(a=>esc(a.name)).join(" · ")}</b> — məşq zamanı kartdakı “⇄ Dəyiş” düyməsi ilə keçin.</div>`:""}
    <div style="display:flex;gap:8px;margin-top:14px">
      <a class="btn" style="flex:1" href="${esc(vidURL(ex))}" target="_blank" rel="noopener noreferrer">▶ Video${(state.vid&&state.vid[ex.key])?"":" axtar"}</a>
      <button class="btn ghost"${act("openVidSet",ex.key)} aria-label="video təyin et">⚙</button>
    </div>
    <button class="btn block ghost" style="margin-top:8px"${act("closeSheet")}>Bağla</button>`;
  openSheet();
}
/* ================= VİDEO =================
   Şəkil hərəkətin yolunu göstərir, sürəti və nəfəsi yox. Hər hərəkət üçün
   YouTube axtarışı açılır; bəyəndiyin videonu təyin etsən, birbaşa o açılır
   (state.vid-də saxlanılır, bulud sinxronizasiyasına düşür). */
function vidURL(ex){
  const own = safeURL(state.vid && state.vid[ex.key]);
  if(own) return own;
  return "https://www.youtube.com/results?search_query=" + encodeURIComponent(ex.name + " proper form technique");
}
function openVidSet(key){
  const ex = EXMAP[key]; if(!ex) return;
  $("#sheet").innerHTML = `${SHEETHEAD}
    <h3>Video təyin et</h3><div class="stag">${esc(ex.name)}</div>
    <div class="small" style="margin:8px 0 12px">Bəyəndiyin videonun linkini yapışdır — bundan sonra “Video” düyməsi birbaşa onu açacaq. Boş buraxsan, YouTube axtarışı açılır.</div>
    <div class="field"><input id="vd-url" value="${esc((state.vid&&state.vid[key])||"")}" placeholder="https://youtu.be/..."></div>
    <button class="btn block"${act("saveVid",key)}>Yadda saxla</button>
    <button class="btn block ghost" style="margin-top:8px"${act("closeSheet")}>İmtina</button>`;
  openSheet();
}
function saveVid(key){
  const v = ($("#vd-url").value||"").trim();
  state.vid = state.vid || {};
  const u = safeURL(v);
  if(u) state.vid[key] = u; else delete state.vid[key];
  stampKey("vid", key);
  save(); cloudPush(); closeSheet();
  toast(v ? "Video təyin edildi" : "Axtarışa qaytarıldı");
}
function loadInfo(key){
  const ex = EXMAP[key]; if(!ex) return;
  const d = LOAD_LBL[ex.load] || {s:"kq", l:"Qaldırdığın çəkini yaz."};
  info(`Çəki xanası: ${esc(loadTag(ex))}`, `${esc(ex.name)}\n\n${d.l}\n\nArtım addımı: +${ex.inc || incFor(ex)} ${unitOf(ex)}${exStep(ex.key) ? " (bir daşın çəkisi — Plan → ⚙)" : " (Ayarlar və ya Plan → ⚙ bölməsindən dəyişdirilir)"}.`);
}
/* Başlıqdan aşağı dartıb bağlamaq — düyməyə çatmaq çətin olanda da çıxış yolu var */
(function sheetSwipe(){
  let y0 = null;
  document.addEventListener("touchstart", e=>{
    const h = e.target.closest && e.target.closest(".shead");
    y0 = (h && !e.target.closest(".xbtn")) ? e.touches[0].clientY : null;
  }, {passive:true});
  document.addEventListener("touchmove", e=>{
    if(y0 === null) return;
    const dy = e.touches[0].clientY - y0;
    const sh = document.getElementById("sheet");
    /* geniş ekranda vərəq mərkəzdədir (başqa transform) — orada dartma yoxdur */
    if(sh && innerWidth < 560) sh.style.transform = dy > 0 ? `translateX(-50%) translateY(${dy}px)` : "";
  }, {passive:true});
  document.addEventListener("touchend", e=>{
    if(y0 === null) return;
    const sh = document.getElementById("sheet");
    const dy = (e.changedTouches[0].clientY - y0);
    if(sh) sh.style.transform = "";
    y0 = null;
    if(dy > 70) closeSheet();
  }, {passive:true});
})();
/* Vərəq dialoqdur (index.html: role="dialog" aria-modal="true"): açılanda fokus içəri
   keçir, bağlananda onu açan düyməyə qayıdır. Tab tələsi və Escape — js/actions.js. */
let sheetOpener = null;
function openSheet(){
  const sh = $("#sheet");
  if(!sh.classList.contains("on")){
    /* vərəqdən vərəqə keçəndə (⚙ → ⇄, Texnika → video) ilk açan element yadda qalır */
    const a = document.activeElement;
    sheetOpener = (a && a !== document.body && !sh.contains(a)) ? a : null;
  }
  const h = sh.querySelector("h3");
  if(h){ h.id = "sheetTitle"; sh.setAttribute("aria-labelledby", "sheetTitle"); }
  else sh.removeAttribute("aria-labelledby");
  $("#overlay").classList.add("on"); sh.classList.add("on");
  /* fokus ilk xanaya yox, vərəqin özünə — telefonda klaviatura özbaşına açılmasın */
  try{ sh.focus({preventScroll:true}); }catch(e){ sh.focus(); }
}
function closeSheet(){
  askFn = null;
  const sh = $("#sheet"), was = sh.classList.contains("on");
  $("#overlay").classList.remove("on"); sh.classList.remove("on");
  if(!was) return;
  const o = sheetOpener; sheetOpener = null;
  if(o && o.isConnected && typeof o.focus === "function"){ try{ o.focus({preventScroll:true}); }catch(e){} }
}

/* ---- təsdiq pəncərələri ----
   Brauzerin öz confirm()/alert() pəncərələri hər mühitdə görünmür (PWA, daxili
   brauzer, önizləmə paneli onları səssizcə bloklaya bilir) — belə olanda düymə
   “işləmir” kimi görünürdü. Ona görə bütün təsdiqlər tətbiqin öz vərəqindədir. */
let askFn = null;
function ask(title, body, okLabel, onOk, danger){
  askFn = onOk;
  $("#sheet").innerHTML = `${SHEETHEAD}
    <h3>${title}</h3>
    <div class="small" style="margin:8px 0 16px;white-space:pre-line;font-size:13.5px">${body}</div>
    <button class="btn block ${danger?"danger":""}"${act("askYes")}>${okLabel}</button>
    <button class="btn block ghost" style="margin-top:8px"${act("closeSheet")}>İmtina</button>`;
  openSheet();
}
function askYes(){ const f = askFn; askFn = null; closeSheet(); if(f) f(); }
function info(title, body){
  askFn = null;
  $("#sheet").innerHTML = `${SHEETHEAD}
    <h3>${title}</h3>
    <div class="small" style="margin:8px 0 16px;white-space:pre-line;font-size:13.5px">${body}</div>
    <button class="btn block"${act("closeSheet")}>Başa düşdüm</button>`;
  openSheet();
}
