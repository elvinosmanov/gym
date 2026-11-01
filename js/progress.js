/* ================= PROGRESS ================= */
function chartSVG(pts,color,unit){
  if(!pts.length) return `<div class="empty">Hələ heç nə qeyd edilməyib — məlumat burada özü çəkilir.</div>`;
  const W=340,H=150,L=8,R=14,T=18,B=22;
  const ys = pts.map(p=>p.y);
  let mn=Math.min(...ys), mx=Math.max(...ys);
  if(mn===mx){mn-=1;mx+=1;} const pad=(mx-mn)*0.15; mn-=pad; mx+=pad;
  const X=i=> L + (W-L-R) * (pts.length===1 ? 0.5 : i/(pts.length-1));
  const Y=v=> T + (H-T-B) * (1-(v-mn)/(mx-mn));
  const path = pts.map((p,i)=>`${i?"L":"M"}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ");
  const dots = pts.map((p,i)=>`<circle cx="${X(i).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${i===pts.length-1?4.5:3}" fill="${i===pts.length-1?color:"#171b21"}" stroke="${color}" stroke-width="2"/>`).join("");
  const lastX=X(pts.length-1), lastY=Y(pts[pts.length-1].y);
  const anchor = lastX > W-64 ? "end" : "middle";
  const grid = [0.25,0.5,0.75].map(f=>`<line x1="${L}" x2="${W-R}" y1="${(T+(H-T-B)*f).toFixed(1)}" y2="${(T+(H-T-B)*f).toFixed(1)}" stroke="#232933" stroke-width="1"/>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img">
    ${grid}
    <path d="${path}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}
    <text x="${lastX}" y="${Math.max(lastY-11,12)}" text-anchor="${anchor}" font-size="12.5" font-weight="700" fill="${color}" font-family="var(--mono)">${pts[pts.length-1].y}${unit}</text>
    <text x="${L}" y="${H-4}" font-size="10" fill="#6b7480">${fmtD(pts[0].d)}</text>
    <text x="${W-R}" y="${H-4}" text-anchor="end" font-size="10" fill="#6b7480">${fmtD(pts[pts.length-1].d)}</text>
  </svg>`;
}
/* kiçik trend xətti — hər hərəkət kartı üçün */
function spark(vals, color){
  if(vals.length < 2) return "";
  const W=84, H=26, mn=Math.min(...vals), mx=Math.max(...vals), r=(mx-mn)||1;
  const pts = vals.map((v,i)=>`${(i/(vals.length-1)*W).toFixed(1)},${(H-2 - (v-mn)/r*(H-4)).toFixed(1)}`);
  return `<svg class="spk" viewBox="0 0 ${W} ${H}"><polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${W}" cy="${(H-2 - (vals[vals.length-1]-mn)/r*(H-4)).toFixed(1)}" r="2.6" fill="${color}"/></svg>`;
}
/* cədvələ nə qədər əməl olunub — son 28 gün */
function adherence(){
  let planned = 0, done = 0;
  for(let i=0;i<28;i++){
    const iso = addDaysISO(todayISO(), -i);
    if(isTrainDay(iso)) planned++;
    if(state.sessions.some(s=>s.d===iso)) done++;
  }
  return { planned, done, pct: planned ? Math.round(done/planned*100) : 0 };
}
/* gün tipi üzrə vaxt bölgüsü */
function timeByDay(){
  const m = {};
  DAYS.forEach(d=>m[d]={n:0,min:0,sets:0});
  state.sessions.forEach(s=>{
    if(!m[s.day]) return;
    m[s.day].n++;
    m[s.day].min += (s.min||0);
    m[s.day].sets += s.ex.reduce((a,e)=>a+e.sets.length,0);
  });
  return m;
}
function renderProg(){
  const wPts = state.weights.map(x=>({d:x.d, y:Math.round(x.kg*10)/10}));
  const real = state.sessions.filter(s=>!s.foundation);
  const mins = real.filter(s=>s.min!=null);
  const avgMin = mins.length ? Math.round(mins.reduce((a,s)=>a+s.min,0)/mins.length) : null;
  const monthISO = todayISO().slice(0,7);
  const thisMonth = state.sessions.filter(s=>s.d.slice(0,7)===monthISO).length;
  const totTon = Math.round(state.sessions.reduce((a,s)=>a+tonnage(s),0));
  const adh = adherence();
  const tbd = timeByDay();

  /* ---- hərəkət analizi: əsas dəyər buradadır ---- */
  const keys = [...new Set(state.sessions.flatMap(s=>s.ex.map(e=>e.key)))];
  const rows = keys.map(k=>{
    const H = exSessions(k, 10, true);   /* göstərmək üçün təməl məşq də daxildir */
    if(!H.length) return null;
    const t = liftTrend(k), pl = progressPlan(k) || {action:"first", kg:null, reps:0, cls:"", txt:""}, pj = projection(k);
    return { k, name: exName(k), H, t, pl, pj, last: H[0], u: unitOf(EXMAP[k]||{}) };
  }).filter(Boolean).sort((a,b)=> a.last.d < b.last.d ? 1 : -1);

  const STAT = { up:{t:"irəliləyir",c:"up"}, flat:{t:"yerində sayır",c:"flat"}, down:{t:"geriləyir",c:"down"} };
  const liftCards = rows.length ? rows.map(r=>{
    const st = r.t ? STAT[r.t.status] : null;
    const vals = r.H.slice().reverse().map(h=>h.e1);
    return `<div class="lift">
      <div class="lhead">
        <div class="lname">${esc(r.name)}</div>
        ${st ? `<span class="lbadge ${st.c}">${st.t}</span>` : `<span class="lbadge">${r.last.foundation?"təməl":"yeni"}</span>`}
      </div>
      <div class="lrow">
        <div class="lnum"><b class="num">${r.last.bw ? `${r.last.top.reps} təkrar` : `${r.last.top.kg}${r.u==="lb"?" lb":""} × ${r.last.top.reps}`}</b><small>son ən güclü dövr · ${fmtD(r.last.d)}${r.last.bw ? "" : (r.last.top.raw ? ` · <span style="color:var(--c)">qeyddə ${r.last.top.raw} yazılıb</span>` : dasN(r.k, r.last.top.kg) ? ` · ${dasN(r.k, r.last.top.kg)} daş` : "")}</small></div>
        ${spark(vals, r.t && r.t.status==="down" ? "#e0484e" : "#3ecf8e")}
      </div>
      ${r.t ? `<div class="lmeta">${r.last.bw
          ? `Ən yaxşı dövr <b class="num">${Math.round(r.t.e1)}</b> təkrar · ${r.t.n} məşq · ${r.t.change>=0?"+":""}${Math.round(r.t.change*10)/10} təkrar${r.t.days>=7?` (${Math.round(r.t.days/7)} həftədə)`:""}`
          : `Təxmini 1TM <b class="num">${Math.round(r.t.e1)}</b> ${r.u} · ${r.t.n} məşq · ${r.t.change>=0?"+":""}${Math.round(r.t.change*10)/10} ${r.u}${r.t.days>=7?` (${Math.round(r.t.days/7)} həftədə)`:""} · həftədə <b>${r.t.perWeek>=0?"+":""}${Math.round(r.t.perWeek*10)/10}</b>`}</div>` : ""}
      <div class="lnext ${r.pl.cls}">Növbəti: <b>${r.pl.kg==null?"iş çəkisini seç":(r.last.bw && !(r.pl.kg>0) ? `${r.pl.reps} təkrar` : `${r.pl.kg} ${r.u}${dasTxt(r.k, r.pl.kg)} × ${r.pl.reps}`)}</b>${
        r.pl.action==="up"?" — çəki artır":r.pl.action==="deload"?" — yüngülləşdir":r.pl.action==="down"?" — geri qayıt":r.pl.action==="reps"?" — təkrar artır":""}</div>
      ${!r.last.bw && r.last.top.raw ? `<div class="small" style="margin-top:6px">${offStepNote(r.k, r.last.top.raw)}</div>` : ""}
      ${r.pj ? `<div class="lproj">Bu tempi saxlasan <b>${r.pj.target} ${r.pj.unit}</b>-a təxminən <b>${r.pj.weeks} həftəyə</b> çatırsan.</div>` : ""}
    </div>`;
  }).join("") : `<div class="empty">İki məşq qeyd et — analiz burada özü qurulacaq.</div>`;

  /* ---- diqqət tələb edən nöqtələr ---- */
  const warn = [];
  rows.filter(r=>r.pl.action==="deload").forEach(r=>warn.push(`<b>${esc(r.name)}</b> — üç məşqdir irəliləmə yoxdur, ${r.pl.kg} ${r.u}-a enib yenidən qalx.`));
  rows.filter(r=>r.t && r.t.status==="down").slice(0,3).forEach(r=>warn.push(`<b>${esc(r.name)}</b> — trend aşağıdır (həftədə ${Math.round(r.t.perWeek*10)/10} ${r.u}). Yuxu və qidanı yoxla.`));
  const vol = loggedVolume(14);
  const low = Object.keys(MUSN).filter(m=>(vol[m]||0) < 4);
  if(state.sessions.length>=3 && low.length) warn.push(`Son 2 həftədə az işlənib: <b>${low.slice(0,4).map(m=>MUSN[m]).join(", ")}</b>.`);
  if(adh.planned>=4 && adh.pct<70) warn.push(`Son 4 həftədə cədvəlin <b>${adh.pct}%</b>-i tutulub (${adh.done}/${adh.planned}). Artım əvvəlcə davamiyyətdən gəlir.`);
  if(state.weights.length>=3){
    const w=state.weights[state.weights.length-1], w0=state.weights.find(x=>x.d>=addDaysISO(todayISO(),-21))||state.weights[0];
    const d=Math.round((w.kg-w0.kg)*10)/10;
    if(w0!==w && d<=0) warn.push(`Bədən çəkisi 3 həftədə <b>${d} kq</b> — kütlə üçün kalori artımı lazımdır.`);
  }

  const volRows = Object.keys(MUSN).map(m=>({m, v:vol[m]||0})).sort((a,b)=>b.v-a.v);
  const volMax = Math.max(10, ...volRows.map(r=>r.v));

  const prs = []; const best = {};
  state.sessions.forEach(s=>s.ex.forEach(e=>normSets(e.key, e.sets, s.conv).forEach(st=>{
    if(!(st.kg>0)) return;
    const v = e1rm(st.kg, st.reps);
    if(!best[e.key] || v > best[e.key].v + 0.01){ best[e.key] = {v, kg:st.kg, reps:st.reps, d:s.d, name:e.name}; prs.push({...best[e.key], key:e.key}); }
  })));
  const recentPR = prs.slice(-6).reverse();

  const hist = state.sessions.length ? state.sessions.slice().reverse().map((s,ri)=>{
    const i = state.sessions.length-1-ri;
    const n = s.ex.reduce((a,e)=>a+e.sets.length,0);
    const durTxt = s.sec!=null ? hms(s.sec) : (s.min!=null ? hm(s.min) : null);
    return `<details class="hist"><summary><span><span class="mini-plate mp-${dayMeta(s.day).cls}"></span><b>${dayMeta(s.day).name}</b>${s.foundation?` <span class="prbadge">TƏMƏL</span>`:""} · ${fmtD(s.d)}</span><span class="hs num">${n} dövr${durTxt?` · ${durTxt}`:""}</span></summary>
      ${(s.conv||1) < CONV && s.ex.some(e=>SIDE_LOADS.includes((histEx(e.key)||{}).load))
        ? `<div class="histnote" style="color:var(--dim)">Köhnə qayda ilə yazılıb: ştanq/disk hərəkətlərində rəqəm <b>cəmi çəkidir</b> (dəmir daxil). Qrafiklər və proqressiya onu avtomatik hər tərəfə çevirir.</div>` : ""}
      ${s.note ? `<div class="histnote">“${esc(s.note)}”</div>` : ""}
      ${s.ex.map(e=>`<div class="histset"><b>${esc(e.name)}</b> — <span class="num">${perfStr(e)}</span></div>`).join("")}
      <button class="btn sm danger" style="margin:8px 0 10px" onclick="delSession(${i})">Məşqi sil</button>
    </details>`;
  }).join("") : `<div class="empty">Hələ məşq yoxdur.</div>`;

  $("#view-prog").innerHTML = `
    <div class="stats">
      <div class="stat"><div class="v num">${thisMonth}</div><div class="l">Bu ay məşq</div></div>
      <div class="stat"><div class="v num">${adh.pct}<small>%</small></div><div class="l">Cədvəl · 4 həftə</div></div>
      <div class="stat"><div class="v num">${avgMin!=null?avgMin:"—"}<small> dəq</small></div><div class="l">Orta müddət</div></div>
    </div>

    ${!state.sessions.length ? `<div class="card"><div class="h-big" style="font-size:19px">Analiz üçün məşq lazımdır</div>
      <div class="small" style="margin-top:8px">Hesabında <b style="color:var(--ink)">bitmiş məşq yoxdur</b> — ona görə bu səhifə boşdur. Bədən çəkisi qeydlərin (${state.weights.length}) yerindədir, aşağıda qrafikdə görünür.
      <br><br>Səbəb: köhnə versiyada “Bitir və yadda saxla” düyməsi dövrlərin təkrar xanası boş qaldıqda heç nə saxlamırdı və xəbərdarlıq pəncərəsi telefonda görünmürdü. Bu düzəldilib.
      <br><br>Bir məşq bitir — analiz dərhal görünəcək, ikinci məşqdən sonra trend və proqnoz da qoşulacaq.</div></div>` : ""}

    ${warn.length ? `<div class="sect">Diqqət tələb edir</div>
    <div class="card"><div class="brief">${warn.slice(0,5).map(w=>`<div class="brow"><span class="bi">!</span><p>${w}</p></div>`).join("")}</div></div>` : ""}

    <div class="sect">Hərəkət analizi</div>
    <div class="card">${liftCards}</div>

    <div class="sect">Vaxt və həcm</div>
    <div class="card">
      <div class="mlist wide">${DAYS.filter(d=>tbd[d].n).map(d=>`<div class="mrowv">
        <span class="mn">${DAY_META[d].name.split(" · ")[0]}</span>
        <span class="mb"><i style="width:${Math.round(tbd[d].min/Math.max(1,...DAYS.map(x=>tbd[x].min))*100)}%"></i></span>
        <span class="mv num">${tbd[d].n}× · ${Math.round(tbd[d].min/tbd[d].n)} dəq</span>
      </div>`).join("") || `<div class="empty">Məşq qeyd etdikcə doldurulacaq.</div>`}</div>
      <hr class="split">
      <div class="kcalrow"><span>Ümumi qaldırılan yük</span><span><b class="num">${totTon.toLocaleString()}</b> kq</span></div>
      <div class="kcalrow"><span>Ümumi məşq · dövr</span><span><b class="num">${real.length}</b> · <b class="num">${state.sessions.reduce((a,s)=>a+s.ex.reduce((b,e)=>b+e.sets.length,0),0)}</b></span></div>
    </div>

    <div class="sect">Son 14 gün · əzələ yükü</div>
    <div class="card">
      ${state.sessions.length ? `<div class="mlist">${volRows.map(r=>`<div class="mrowv ${r.v?"":"zero"}">
        <span class="mn">${MUSN[r.m]}</span>
        <span class="mb"><i style="width:${Math.round(r.v/volMax*100)}%"></i></span>
        <span class="mv num">${r.v ? Math.round(r.v*10)/10 : "—"}</span>
      </div>`).join("")}</div>
      <div class="small" style="margin-top:10px">Həqiqətən qeyd etdiyin dövrlərdən hesablanıb. 2 həftədə əzələ başına <b style="color:var(--ink)">14-30 dövr</b> yaxşı aralıqdır.</div>`
      : `<div class="empty">İlk məşqini bitir.</div>`}
    </div>

    <div class="sect">Rekordlar</div>
    <div class="card">
      ${recentPR.length ? recentPR.map(p=>`<div class="prrow">
        <span class="pn">${esc(p.name)}</span><span class="pv num">${p.kg} × ${p.reps}</span><span class="pd">${fmtD(p.d)}</span>
      </div>`).join("") : `<div class="empty">Hələ rekord yoxdur.</div>`}
    </div>

    <div class="sect">Bədən çəkisi</div>
    <div class="card">
      <div class="chartbox">${chartSVG(wPts,"#4a7dff"," kq")}</div>
      <div class="inline-log" style="margin-top:10px">
        <input id="pw" type="text" inputmode="decimal" step="0.1" placeholder="Bugünkü çəkini qeyd et (kq)">
        <button class="btn sm" onclick="addWeight('pw')">Qeyd et</button>
      </div>
      ${state.weights.length?`<div class="loglist">${state.weights.slice(-6).reverse().map(x=>{
        const idx = state.weights.indexOf(x);
        return `<div class="logrow"><span class="num"><b>${x.kg} kq</b></span><span class="d">${fmtD(x.d)}</span><button class="xdel" onclick="delWeight(${idx})">✕</button></div>`;
      }).join("")}</div>`:""}
    </div>

    <div class="sect">Tarixçə</div>
    <div class="card">${hist}</div>`;
}
function delWeight(i){ ask("Çəki qeydi silinsin?", `${state.weights[i].kg} kq · ${fmtD(state.weights[i].d)}`, "Sil", ()=>{ tomb("goneW", state.weights[i].d); state.weights.splice(i,1); if(state.weights.length) state.profile.w = state.weights[state.weights.length-1].kg; save(); cloudPush(true); renderProg(); toast("Silindi"); }, true); }
function delSession(i){ const s=state.sessions[i]; ask("Məşq tarixçədən silinsin?", `${dayMeta(s.day).name} · ${fmtD(s.d)}`, "Sil", ()=>{ tomb("gone", sesKey(s)); state.sessions.splice(i,1); save(); cloudPush(true); renderProg(); toast("Silindi"); }, true); }

/* ================= ƏZƏLƏ XƏRİTƏSİ =================
   Hər hərəkət pri[] (əsas) və sec[] (köməkçi) əzələ siyahısı daşıyır. Həcm:
   əsas əzələ üçün dövr sayı tam, köməkçi üçün yarım sayılır — bu, həcm hesabında
   qəbul edilmiş yanaşmadır. Plan bölməsində rəqəm və rəng canlı yenilənir. */
const MUSN = {
  chest:"Döş", delts:"Çiyin (ön/yan)", rdelt:"Arxa delta", biceps:"Biseps", triceps:"Triseps",
  forearm:"Said", abs:"Qarın", lats:"Enli kürək", traps:"Trapesiya · orta kürək", lowback:"Bel",
  glutes:"Sağrı", quads:"Dördbaşlı (bud ön)", hams:"Arxa bud", calves:"Baldır"
};
/* Anatomik xəritə: fon — real anatomik illüstrasiya (Wikimedia Commons,
   CC BY-SA 3.0, Termininja), CSS ilə boz tonlanır. Üstündə hər əzələ qrupu
   üçün qırmızı örtük; şəffaflıq həftəlik dövr sayından gəlir.
   Koordinatlar 500x700 şəkil sahəsinə uyğundur. Hər forma sol yarı üçün
   çəkilib və güzgülənir (mərkəz x=250). */
const SHAPES = {
  front:{
    traps:`M249 114 C233 118 216 128 203 140 C209 147 222 145 233 138 C241 132 246 123 249 118 Z`,
    delts:`M196 138 C174 144 158 160 152 180 C150 196 160 204 174 200 C188 195 196 176 200 158 C202 146 202 140 196 138 Z`,
    chest:`M208 154 C196 165 193 187 200 199 C214 207 232 207 246 203 L246 152 C232 147 217 148 208 154 Z`,
    biceps:`M160 190 C149 205 145 232 150 250 C160 258 172 249 176 230 C180 212 174 194 166 188 Z`,
    forearm:`M143 262 C128 282 118 318 122 345 C132 356 146 345 150 322 C155 296 152 274 143 262 Z`,
    abs:`M215 214 L247 214 L247 328 C234 325 223 313 218 295 C213 270 212 236 215 214 Z`,
    quads:`M204 374 C192 404 190 452 198 492 C212 506 234 498 240 470 C247 436 246 398 240 374 Z`
  },
  back:{
    traps:`M249 108 C229 114 209 127 194 142 C204 165 218 188 231 205 L247 214 L247 108 Z`,
    rdelt:`M194 134 C172 142 158 160 153 180 C151 196 161 204 175 200 C189 195 197 176 200 157 C202 144 201 137 194 134 Z`,
    lats:`M194 192 C173 214 170 252 186 284 L244 292 L244 222 Z`,
    lowback:`M224 264 L248 264 L248 300 C238 298 229 288 225 276 Z`,
    triceps:`M160 188 C148 204 143 232 149 252 C159 260 171 250 175 231 C179 212 173 193 165 186 Z`,
    glutes:`M200 308 C184 322 183 350 199 366 C218 376 240 370 246 352 C250 332 244 312 226 304 C216 301 207 303 200 308 Z`,
    hams:`M200 382 C188 410 186 452 196 486 C212 500 234 490 240 462 C247 428 245 400 238 382 Z`,
    calves:`M204 512 C194 536 192 576 202 602 C216 614 234 604 238 580 C241 552 232 524 220 512 Z`
  }
};
const BODY_IMG = { front:"body-front.png", back:"body-back.png" };
function muscleVolume(slots){
  const vol = {};
  slots.forEach(sl=>{
    const e = libEx(sl.k); if(!e) return;
    const n = Math.max(1, +sl.sets || 1);
    (e.pri||[]).forEach(m => vol[m] = (vol[m]||0) + n);
    (e.sec||[]).forEach(m => vol[m] = (vol[m]||0) + n/2);
  });
  return vol;
}
function volOpacity(v){ return v>0 ? Math.min(0.18 + v*0.055, 0.95) : 0; }
function bodySVG(view, vol){
  const parts = Object.entries(SHAPES[view]).map(([m,d])=>{
    const v = vol[m]||0;
    if(!v) return "";
    return `<g fill="#e8332f" fill-opacity="${volOpacity(v).toFixed(2)}" stroke="#5e0c0e" stroke-opacity="0.55" stroke-width="1.6"><path d="${d}"/><path d="${d}" transform="translate(500,0) scale(-1,1)"/></g>`;
  }).join("");
  return `<div class="bodyimg">
    <img src="${BODY_IMG[view]}" alt="${view==="front"?"ön görünüş":"arxa görünüş"}" loading="lazy">
    <svg viewBox="0 0 500 700" aria-hidden="true">${parts}</svg>
  </div>`;
}
/* Plan bölməsindəki kart: gün / həftə seçimi ilə */
let volMode = "day";
function setVolMode(m){ volMode = m; renderPlan(); }
function volumeCard(D){
  const slots = volMode==="week" ? DAYS.flatMap(k=>daySlots(k)) : daySlots(D);
  const vol = muscleVolume(slots);
  const sets = slots.reduce((a,s)=>a+(+s.sets||0),0);
  const mins = volMode==="week" ? DAYS.reduce((a,k)=>a+dayMinutes(k),0) : dayMinutes(D);
  const rows = Object.keys(MUSN)
    .map(m=>({m, v:vol[m]||0}))
    .sort((a,b)=>b.v-a.v);
  const max = Math.max(1, ...rows.map(r=>r.v));
  return `<div class="card">
    <div class="chips fil" style="margin-bottom:10px">
      <span class="pick ${volMode==="day"?"on":""}" onclick="setVolMode('day')">Bu gün</span>
      <span class="pick ${volMode==="week"?"on":""}" onclick="setVolMode('week')">Tam dövr (4 məşq)</span>
    </div>
    <div class="bodywrap">
      <div class="bodyfig">${bodySVG("front",vol)}<span>Ön</span></div>
      <div class="bodyfig">${bodySVG("back",vol)}<span>Arxa</span></div>
    </div>
    <div class="credit">Anatomik illüstrasiya: Termininja / Wikimedia Commons · CC BY-SA 3.0</div>
    <div class="kcalrow" style="margin-top:2px"><span>Cəmi <b class="num">${sets}</b> iş dövrü</span><span>~<b class="num">${mins}</b> dəqiqə</span></div>
    <hr class="split">
    <div class="mlist">${rows.map(r=>`<div class="mrowv ${r.v?"":"zero"}">
      <span class="mn">${MUSN[r.m]}</span>
      <span class="mb"><i style="width:${Math.round(r.v/max*100)}%"></i></span>
      <span class="mv num">${r.v ? (Math.round(r.v*10)/10) : "—"}</span>
    </div>`).join("")}</div>
    <div class="small" style="margin-top:10px">Rəqəm = <b style="color:var(--ink)">effektiv dövr sayı</b>: əsas əzələ üçün dövr tam, köməkçi əzələ üçün yarım sayılır. Tam dövr = 4 məşq ≈ 8 gün; böyümə üçün əzələ başına bir dövrdə <b style="color:var(--ink)">10-20 iş dövrü</b> yaxşı aralıqdır. ${volMode==="week"?"Aşağıdakı siyahı dörd günün cəmidir — boş qalan əzələ varsa, ona hərəkət əlavə edin.":"Ümumi mənzərə üçün yuxarıdan “Tam dövr”ə keçin."}</div>
  </div>`;
}
