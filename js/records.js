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
    ${rec.id ? `<button class="btn block ghost" style="margin-top:14px"${act("shareSession",rec.id)}>📤 Şəkil kimi paylaş</button>` : ""}
    <button class="btn block" style="margin-top:8px"${act("closeSheet")}>Əla</button>`;
}
function showSummary(rec){
  if(!rec || rec.foundation) return false;
  const R = sessionReport(rec);
  $("#sheet").innerHTML = summaryHTML(rec, R);
  openSheet();
  return true;
}

/* ================= PAYLAŞMA: XÜLASƏ ŞƏKİL KİMİ =================
   1080×1350 (Instagram/Telegram üçün 4:5) PNG, tamamilə cihazda çəkilir —
   heç yerə göndərilmir. Telefonda sistemin “Paylaş” pəncərəsi açılır; dəstək
   yoxdursa fayl yüklənir. Şəkil SİNXRON yaradılır (toDataURL): iOS Safari
   navigator.share-i yalnız toxunuşun içində qəbul edir, gözləmə onu pozur. */
const DAY_HEX = { a:"#e0484e", b:"#4a7dff", c:"#f3b73f", d:"#33b56f" };
function fitText(ctx, txt, max){
  txt = String(txt);
  const w = t => { const m = ctx.measureText(t); return (m && m.width) || 0; };
  if(w(txt) <= max) return txt;
  while(txt.length > 1 && w(txt + "…") > max) txt = txt.slice(0, -1);
  return txt + "…";
}
function summaryCanvas(rec, R){
  const W = 1080, H = 1350, P = 80;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  const meta = dayMeta(rec.day), accent = DAY_HEX[meta.cls] || "#f3b73f";
  const disp = "600 {s}px Oswald, 'Arial Narrow', sans-serif", body = "{w} {s}px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
  const F = (tpl, s, w) => tpl.replace("{s}", s).replace("{w}", w || 400);
  x.fillStyle = "#101318"; x.fillRect(0, 0, W, H);
  x.fillStyle = accent; x.fillRect(0, 0, W, 14);
  /* başlıq */
  x.textBaseline = "alphabetic";
  x.fillStyle = "#96a0ad"; x.font = F(body, 30, 600);
  x.fillText("FORGE · " + fmtD(rec.d), P, 120);
  x.fillStyle = "#eef1f5"; x.font = F(disp, 84);
  x.fillText(fitText(x, meta.name, W - 2*P), P, 220);
  /* göstəricilər */
  const stats = [
    ["MÜDDƏT", rec.sec != null ? hms(rec.sec) : "—"],
    ["TONAJ", R.ton.toLocaleString("az") + " kq"],
    ["DÖVR", String(R.sets)]
  ];
  const bw = (W - 2*P - 40) / 3;
  stats.forEach(([k, v], i) => {
    const bx = P + i*(bw + 20), by = 270;
    x.fillStyle = "#1e232b"; x.fillRect(bx, by, bw, 150);
    x.fillStyle = "#96a0ad"; x.font = F(body, 24, 600); x.fillText(k, bx + 26, by + 48);
    x.fillStyle = "#eef1f5"; x.font = F(disp, 50); x.fillText(fitText(x, v, bw - 40), bx + 26, by + 118);
  });
  let y = 500;
  if(R.tonPct != null){
    x.font = F(body, 28, 600); x.fillStyle = R.tonPct >= 0 ? "#3ecf8e" : "#e0484e";
    x.fillText(`${R.tonPct > 0 ? "+" : ""}${R.tonPct}% tonaj keçən ${meta.name.split(" · ")[0]} məşqinə görə`, P, y - 24);
    y += 30;
  }
  /* rekordlar */
  if(R.prs.length){
    x.fillStyle = "#f3b73f"; x.font = F(body, 28, 700);
    x.fillText(`🏆  ${R.prs.length} REKORD`, P, y); y += 56;
    R.prs.slice(0, 4).forEach(p => {
      x.fillStyle = "#eef1f5"; x.font = F(body, 34, 600);
      x.fillText(fitText(x, p.name, W - 2*P), P, y); y += 44;
      x.fillStyle = "#f3b73f"; x.font = F(body, 30, 500);
      x.fillText(fitText(x, prPlain(p, p.u), W - 2*P), P, y); y += 58;
    });
    y += 10;
  }
  /* hərəkətlər: ən güclü dövr */
  x.fillStyle = "#96a0ad"; x.font = F(body, 26, 700);
  x.fillText("HƏRƏKƏTLƏR", P, y); y += 22;
  const rows = rec.ex.slice(0, Math.max(1, Math.floor((H - 110 - y) / 62)));
  rows.forEach(e => {
    y += 62;
    const sets = realSets(e.key, normSets(e.key, e.sets, rec.conv));
    const top = sets.length ? (liftStats(e.key, sets).top || sets.reduce((a, s) => s.reps > a.reps ? s : a, sets[0])) : null;
    const val = top ? `${top.kg > 0 ? top.kg : "BÇ"} × ${top.reps}` : "";
    x.fillStyle = "#1e232b"; x.fillRect(P, y - 44, W - 2*P, 2);
    x.font = F(disp, 38); x.fillStyle = "#eef1f5";
    const vw = (x.measureText(val) || {}).width || 0;
    x.textAlign = "right"; x.fillText(val, W - P, y); x.textAlign = "left";
    x.font = F(body, 32, 500);
    x.fillText(fitText(x, (e.name || exName(e.key)) + `  ·  ${e.sets.length} dövr`, W - 2*P - vw - 30), P, y);
  });
  if(rec.ex.length > rows.length){
    x.fillStyle = "#6b7480"; x.font = F(body, 26, 500);
    x.fillText(`+${rec.ex.length - rows.length} hərəkət daha`, P, y + 50);
  }
  x.fillStyle = "#6b7480"; x.font = F(body, 24, 500);
  x.fillText("FORGE — kütlə məşqi", P, H - 56);
  return c;
}
function dataURLBlob(u){
  const [head, b64] = u.split(",");
  const bin = atob(b64), arr = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: (head.match(/:(.*?);/) || [])[1] || "image/png" });
}
function shareSession(id){
  const rec = state.sessions.find(s => s.id === id);
  if(!rec){ toast("Məşq tapılmadı"); return; }
  let blob;
  try{ blob = dataURLBlob(summaryCanvas(rec, sessionReport(rec)).toDataURL("image/png")); }
  catch(e){ toast("Şəkil yaradıla bilmədi"); return; }
  const name = `forge-${rec.d}-${rec.day}.png`;
  let file = null;
  try{ file = new File([blob], name, { type: "image/png" }); }catch(e){}
  if(file && navigator.canShare && navigator.canShare({ files: [file] })){
    navigator.share({ files: [file], title: `${dayMeta(rec.day).name} · ${fmtD(rec.d)}` })
      .catch(e => { if(!e || e.name !== "AbortError") download(); });
    return;
  }
  download();
  function download(){
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast("Şəkil yükləndi");
  }
}
