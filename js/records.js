/* ================= REKORDLAR VƏ MƏŞQ XÜLASƏSİ =================
   Əvvəl məşq bitəndə yalnız qısa toast çıxırdı: “P · 54:12 · növbəti: Çəkmə”.
   Nəyin yaxşılaşdığını görmək üçün Analiz səhifəsində hərəkət-hərəkət gəzmək
   lazım idi. İndi:
     · dövrü ✓ edəndə rekorddursa dərhal deyilir (🏆 toast);
     · “Yadda saxla”dan sonra xülasə vərəqi açılır: rekordlar, ilk dəfə edilən
       hərəkətlər, tonaj və eyni günün keçən məşqi ilə müqayisə;
     · Analiz səhifəsində son rekordların siyahısı.

   Hamısı eyni qaydaya baxır: qeyd oxunarkən normSets/realSets-dən keçir (köhnə
   format, daş çəkisi, çəkisiz dövr), təməl məşqi baza sayılmır — o, qəsdən yüngül
   idi və ondan sonrakı hər məşq “rekord” görünərdi. İlk qeyd heç vaxt rekord
   deyil: müqayisə ediləcək heç nə yoxdur. */

const PR_EPS = 0.05;   /* yuvarlaqlaşdırma səsini rekord saymırıq */

/* bir hərəkətin bir məşqdəki dövrlərindən göstəricilər */
function liftStats(key, sets){
  const loaded = sets.filter(s => s.kg > 0);
  const st = { e1:0, kg:0, kgReps:0, bwReps:0, top:null };
  loaded.forEach(s=>{
    const e = e1rm(s.kg, s.reps);
    if(e > st.e1){ st.e1 = e; st.top = s; }
    if(s.kg > st.kg || (s.kg === st.kg && s.reps > st.kgReps)){ st.kg = s.kg; st.kgReps = s.reps; }
  });
  sets.filter(s => !(s.kg > 0)).forEach(s=>{ if(s.reps > st.bwReps) st.bwReps = s.reps; });
  return st;
}
function sessSets(key, s){
  const f = s.ex.find(e => e.key === key);
  return f ? realSets(key, normSets(key, f.sets, s.conv)) : [];
}
/* state.sessions[0..upto) üzrə ən yaxşı göstəricilər (təməl məşqi xaric) */
function bestBefore(key, upto){
  const n = upto == null ? state.sessions.length : upto;
  let b = null;
  for(let i=0;i<n;i++){
    const s = state.sessions[i];
    if(!s || s.foundation) continue;
    const sets = sessSets(key, s);
    if(!sets.length) continue;
    const st = liftStats(key, sets);
    if(!b) b = { e1:0, kg:0, kgReps:0, bwReps:0, n:0 };
    b.n++;
    if(st.e1 > b.e1) b.e1 = st.e1;
    if(st.kg > b.kg || (st.kg === b.kg && st.kgReps > b.kgReps)){ b.kg = st.kg; b.kgReps = st.kgReps; }
    if(st.bwReps > b.bwReps) b.bwReps = st.bwReps;
  }
  return b;
}
const f1 = v => Math.round(v*10)/10;
/* Bir hərəkət üçün ən çox BİR rekord qaytarır — ən güclü olanı:
   ağır çəki > təxmini 1TM > bədən çəkisi ilə təkrar. Hər birini ayrıca yazmaq
   eyni nəticəni üç dəfə deməkdir. */
function prOf(key, st, prior){
  if(!prior) return null;
  if(st.kg > 0 && st.kg > prior.kg + PR_EPS)
    return { kind:"kg", val:st.kg, reps:st.kgReps, prev:prior.kg, e1:f1(st.e1) };
  if(st.e1 > 0 && prior.e1 > 0 && st.e1 > prior.e1 + PR_EPS)
    return { kind:"e1", val:f1(st.e1), prev:f1(prior.e1), kg:st.top.kg, reps:st.top.reps };
  if(st.bwReps > 0 && !(st.kg > 0) && st.bwReps > prior.bwReps)
    return { kind:"reps", val:st.bwReps, prev:prior.bwReps };
  return null;
}
function prText(p, u){
  u = u || "kq";
  if(p.kind === "kg") return `ən ağır çəki: <b>${p.val} ${u} × ${p.reps}</b> <span class="mut">(əvvəl ${p.prev})</span>`;
  if(p.kind === "e1") return `<b>${p.kg} ${u} × ${p.reps}</b> — təxmini 1TM <b>${p.val}</b> <span class="mut">(əvvəl ${p.prev})</span>`;
  return `bədən çəkisi ilə <b>${p.val} təkrar</b> <span class="mut">(əvvəl ${p.prev})</span>`;
}
function prPlain(p, u){ return prText(p, u).replace(/<[^>]+>/g, ""); }

/* Saxlanmış (və ya saxlanacaq) qeyd üçün tam hesabat.
   idx: qeydin state.sessions-dakı yeri; verilməsə, sonda olduğu fərz edilir. */
function sessionReport(rec, idx){
  if(idx == null){ idx = state.sessions.indexOf(rec); if(idx < 0) idx = state.sessions.length; }
  const prs = [], firsts = [];
  if(!rec.foundation) rec.ex.forEach(e=>{
    const sets = realSets(e.key, normSets(e.key, e.sets, rec.conv));
    if(!sets.length) return;
    const prior = bestBefore(e.key, idx);
    if(!prior){ firsts.push({ key:e.key, name:e.name || exName(e.key) }); return; }
    const p = prOf(e.key, liftStats(e.key, sets), prior);
    if(p) prs.push({ key:e.key, name:e.name || exName(e.key), u: unitOf(histEx(e.key) || {}), ...p });
  });
  let prev = null;
  for(let i=idx-1;i>=0;i--){
    const s = state.sessions[i];
    if(s && s.day === rec.day && !s.foundation && s.id !== rec.id){ prev = s; break; }
  }
  const ton = Math.round(tonnage(rec));
  const prevTon = prev ? Math.round(tonnage(prev)) : null;
  return {
    prs, firsts, ton, prevTon, prevD: prev ? prev.d : null,
    tonPct: prevTon ? Math.round((ton - prevTon) / prevTon * 100) : null,
    sets: rec.ex.reduce((a,e)=>a + e.sets.length, 0),
    lifts: rec.ex.length, sec: rec.sec
  };
}

/* Məşq gedərkən: bu dövr indiyə qədərki ən yaxşını keçirmi?
   Müqayisə: tarixçə + bu məşqdə artıq ✓ edilmiş digər dövrlər. Beləliklə
   80 × 8 rekorddursa, sonrakı 80 × 7 yenidən “rekord” deyilmir. */
function livePR(slotKey, i){
  const a = state.active;
  if(!a || a.foundation || !a.ex || !a.ex[slotKey]) return null;
  const eff = effEx(slotKey); if(!eff) return null;
  const key = eff.key;
  const prior = bestBefore(key);
  if(!prior) return null;
  const toSet = s => ({ kg: numVal(s.kg) || 0, reps: numVal(s.reps) || 0 });
  const others = a.ex[slotKey].filter((s,j) => j !== i && s.done).map(toSet).filter(s => s.reps > 0);
  if(others.length){
    const o = liftStats(key, realSets(key, others));
    if(o.e1 > prior.e1) prior.e1 = o.e1;
    if(o.kg > prior.kg || (o.kg === prior.kg && o.kgReps > prior.kgReps)){ prior.kg = o.kg; prior.kgReps = o.kgReps; }
    if(o.bwReps > prior.bwReps) prior.bwReps = o.bwReps;
  }
  const me = realSets(key, [toSet(a.ex[slotKey][i])]);
  if(!me.length) return null;
  const p = prOf(key, liftStats(key, me), prior);
  return p ? { key, name: eff.name, u: unitOf(eff), ...p } : null;
}

/* Bütün tarixçədə rekord qırılan anlar — Analiz səhifəsi üçün (yenidən köhnəyə) */
function recentPRs(limit){
  const out = [], best = {};
  state.sessions.forEach(s=>{
    if(s.foundation) return;
    s.ex.forEach(e=>{
      const sets = realSets(e.key, normSets(e.key, e.sets, s.conv));
      if(!sets.length) return;
      const st = liftStats(e.key, sets), prior = best[e.key];
      const p = prOf(e.key, st, prior);
      if(p) out.push({ d:s.d, key:e.key, name: exName(e.key), u: unitOf(histEx(e.key) || {}), ...p });
      const b = prior || (best[e.key] = { e1:0, kg:0, kgReps:0, bwReps:0, n:0 });
      b.n++;
      if(st.e1 > b.e1) b.e1 = st.e1;
      if(st.kg > b.kg || (st.kg === b.kg && st.kgReps > b.kgReps)){ b.kg = st.kg; b.kgReps = st.kgReps; }
      if(st.bwReps > b.bwReps) b.bwReps = st.bwReps;
    });
  });
  return out.reverse().slice(0, limit || 8);
}

/* ---- xülasə vərəqi: “Yadda saxla”dan sonra ---- */
function summaryHTML(rec, R){
  const prs = R.prs.length
    ? `<div class="sumsec"><div class="sumh">🏆 Rekordlar · ${R.prs.length}</div>
        ${R.prs.map(p=>`<div class="sumpr"><b>${esc(p.name)}</b><span>${prText(p, p.u)}</span></div>`).join("")}</div>`
    : `<div class="small" style="margin-top:10px">Bu dəfə rekord yoxdur — bu normaldır: rekord hər məşqdə yox, bir neçə məşqdən bir gəlir. Vacib olan planı yerinə yetirmək idi.</div>`;
  const firsts = R.firsts.length
    ? `<div class="small" style="margin-top:10px">İlk dəfə: <b>${R.firsts.map(f=>esc(f.name)).join(", ")}</b> — növbəti dəfə bu rəqəmlərdən davam edəcəyik.</div>` : "";
  const cmp = R.tonPct != null
    ? `<span class="${R.tonPct>=0?"up":"down"}">${R.tonPct>0?"+":""}${R.tonPct}%</span> <span class="mut">keçən dəfəyə (${fmtD(R.prevD)}) görə</span>` : "";
  return `${SHEETHEAD}
    <h3>${esc(dayMeta(rec.day).name)} · bitdi</h3>
    <div class="stag">${R.lifts} hərəkət · ${R.sets} dövr${R.sec!=null ? ` · ${hms(R.sec)}` : ""}</div>
    <div class="sumgrid">
      <div><span class="lbl">Tonaj</span><b class="num">${R.ton.toLocaleString("az")} kq</b>${cmp ? `<small>${cmp}</small>` : ""}</div>
      <div><span class="lbl">Rekord</span><b class="num">${R.prs.length}</b><small class="mut">${R.firsts.length ? `${R.firsts.length} yeni hərəkət` : "&nbsp;"}</small></div>
    </div>
    ${prs}${firsts}
    <button class="btn block" style="margin-top:14px"${act("closeSheet")}>Əla</button>`;
}
function showSummary(rec){
  if(!rec || rec.foundation) return false;
  const R = sessionReport(rec);
  $("#sheet").innerHTML = summaryHTML(rec, R);
  openSheet();
  return true;
}
