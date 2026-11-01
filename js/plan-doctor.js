/* ================= PLAN DOKTORU =================
   Planı qurduqdan sonra onu oxuyur və konkret, bir toxunuşla tətbiq edilən təklif
   verir. Dörd mənbəyə baxır: hərəkət sırası (çoxoynaqlı əvvəl), bir dövrdəki əzələ
   balansı, günün uzunluğu və tarixçədən görünən durğunluq. Heç nəyi özbaşına
   dəyişmir — hər təklifin yanında düymə var, basmaq sənin işindir. */
const DAY_FOCUS = {
  P:["chest","delts","triceps"], L:["lats","traps","rdelt","biceps"],
  G:["quads","hams","glutes","calves"], F:["chest","lats","quads","delts","hams","glutes"]
};
/* bir dövrdə (4 məşq ≈ 8 gün) əzələ başına məqsədli effektiv dövr aralığı */
const MUS_GOAL = {
  chest:[10,22], lats:[10,22], quads:[10,22], delts:[10,22], hams:[9,20], glutes:[8,20],
  traps:[8,20], rdelt:[8,20], biceps:[8,20], triceps:[8,20], calves:[8,20], abs:[6,20]
};
const SIDE_MUS = ["abs","forearm","lowback"];            /* günün mövzusunu təyin etmir */
/* Çoxoynaqlı (compound) təyini. Əvvəl yalnız əzələ sayına baxırdım, amma o yanılır:
   Hack Squat və Leg Press cəmi iki əzələ daşıyır, halbuki hər ikisi ağır çoxoynaqlı
   hərəkətdir. Ona görə əvvəlcə hərəkətin adındakı model oxunur (press/row/squat/dip…),
   izolyasiya sözləri (curl/raise/extension/fly…) isə onu ləğv edir. */
const ISO_RX  = /(curl|extension|fly|flye|raise|shrug|kick|push-?down|crunch|pull-?apart|face pull|lateral|rear delt|abduction|adduction|plank|bike|sit-?up|pull-?over|skull|sissy|pec deck)/i;
const COMP_RX = /(press|row|pull-?down|pull-?up|chin-?up|dip|squat|lunge|thrust|deadlift|step-?up|push-?up|good morning|split)/i;
function isComp(e){
  if(!e) return false;
  const n = e.name || "";
  if(ISO_RX.test(n)) return false;
  if(COMP_RX.test(n)) return true;
  return ((e.pri||[]).length + (e.sec||[]).length) >= 3;
}
const muscleDay = m => DAYS.find(D => (DAY_FOCUS[D]||[]).includes(m)) || "F";
const exNm = k => esc((libEx(k)||{}).name || k);
/* əzələni ƏSAS işlədən namizədlər: şəkli olan və daha hədəfli olanlar öndə */
function candFor(m, exclude){
  const used = new Set(exclude||[]);
  return libKeys().filter(k=>!used.has(k)).map(k=>({k, e:libEx(k)}))
    .filter(x => x.e && (x.e.pri||[]).includes(m))
    .sort((a,b)=> (frames(b.e).length?1:0)-(frames(a.e).length?1:0)
               || ((a.e.pri||[]).length-(b.e.pri||[]).length))
    .map(x=>x.k);
}
/* ---- SIRA BALI ----
   Zalda qəbul edilmiş sıra: ağır çoxoynaqlı hərəkətlər əvvəldə (ən təzə olduğun
   anda), sonra yüngül çoxoynaqlılar, sonra böyük əzələ izolyasiyaları, ən sonda
   kiçik əzələlər (baldır, qarın, said). Bal nə qədər yüksəkdirsə, hərəkət bir o
   qədər əvvələ düşməlidir. */
const MUS_SIZE = { quads:5, glutes:5, chest:5, lats:5, hams:4, traps:4, delts:3,
  lowback:2, triceps:2, biceps:2, rdelt:2, calves:1, abs:1, forearm:1 };
const LOAD_RANK = { bar:2, bw:1.8, db:1.5, db1:1.5, smith:1, plate:1, stack:0.5 };
function exRank(e){
  if(!e) return 0;
  const pri = e.pri || [];
  const size = pri.length ? Math.max(...pri.map(m => MUS_SIZE[m] || 1)) : 1;
  return (isComp(e) ? 10 : 0) + size + (LOAD_RANK[e.load] || 0);
}
/* mövcud sıranı ideal sıra ilə müqayisə edir */
function orderCheck(slots){
  const cur = slots.map((sl,i)=>({ i, k:sl.k, r:exRank(libEx(sl.k)) }));
  const ideal = cur.slice().sort((a,b)=> b.r - a.r || a.i - b.i);
  let worst = 0;
  cur.forEach((a,x)=> cur.forEach((b,y)=>{ if(y>x && b.r - a.r > worst) worst = b.r - a.r; }));
  return { ideal, same: ideal.every((x,n)=> x.i === n), worst };
}
function planAdvice(D){
  const slots = daySlots(D), out = [];
  if(!slots.length) return out;
  const keys  = slots.map(s=>s.k);
  const week  = muscleVolume(DAYS.flatMap(k=>daySlots(k)));
  const dayV  = muscleVolume(slots);
  const sets  = slots.reduce((a,s)=>a+(+s.sets||0),0);
  const mins  = dayMinutes(D);
  const focus = DAY_FOCUS[D] || [];
  const v  = m => Math.round((week[m]||0)*10)/10;
  const lo = m => MUS_GOAL[m] ? MUS_GOAL[m][0] : 0;
  const hi = m => MUS_GOAL[m] ? MUS_GOAL[m][1] : 99;

  /* 1) SIRA — hansı hərəkət əvvəl, hansı sonra */
  const oc = orderCheck(slots);
  /* Hədd 5-dir: çoxoynaqlı hərəkət izolyasiyanın arxasına düşəndə fərq 10-dan
     böyük olur. İki ağır hərəkət arasındakı 1-2 ballıq fərq (məs. bench əvvəl,
     çiyin sonra) zövq məsələsidir — onun üçün xəbərdarlıq vermirik. */
  if(!oc.same && oc.worst >= 5){
    const first = oc.ideal[0], last = oc.ideal[oc.ideal.length-1];
    const list = oc.ideal.map((x,n)=>`${n+1}. ${exNm(x.k)}`).join(" · ");
    const why = [];
    if(first.i !== 0) why.push(`<b>${exNm(first.k)}</b> birinci olmalıdır — günün ən ağır çoxoynaqlı hərəkətidir, ən təzə olduğun anda edilməlidir`);
    if(last.i !== slots.length-1) why.push(`<b>${exNm(last.k)}</b> sona qalmalıdır — kiçik əzələ işidir; əvvəldə etsən böyük hərəkətlərdə çəkin düşür`);
    if(!why.length) why.push("ağır hərəkətlər əvvələ, izolyasiya sona toplanmalıdır");
    out.push({ sev:1, ic:"↕", t:"Hərəkətlərin sırası optimal deyil",
      w:`${why.join("; ")}. Təklif olunan sıra: <b>${list}</b>.`,
      a:[{l:"Sıranı tətbiq et", f:`advReorder('${D}')`},
         ...(first.i!==0 ? [{l:`${exNm(first.k)} birinci olsun`, f:`advMove('${D}',${first.i},0)`}] : [])] });
  }

  /* 2) BALANS — günün hədəf əzələsi bütün dövrdə azdır */
  const handled = new Set();
  const lowM = focus.filter(m => MUS_GOAL[m] && v(m) < lo(m)).sort((a,b)=> v(a)-v(b))[0];
  if(lowM){
    handled.add(lowM);
    const cand = candFor(lowM, keys)[0];
    /* onsuz da hədəfin üstündə olan əzələyə işləyən və zəif əzələyə toxunmayan slot */
    const overIdx = slots.findIndex(s=>{
      const e = libEx(s.k); if(!e || isComp(e)) return false;   /* ağır çoxoynaqlı hərəkəti heç vaxt qurban vermirik */
      const pri = (e.pri||[]).filter(m=>!SIDE_MUS.includes(m));
      if(!pri.length || pri.includes(lowM) || (e.sec||[]).includes(lowM)) return false;
      return pri.every(m => v(m) > hi(m));
    });
    if(cand && overIdx>=0){
      out.push({ sev:0, ic:"⇄", t:`<b>${exNm(slots[overIdx].k)}</b> yerinə <b>${exNm(cand)}</b>`,
        w:`${MUSN[lowM]} bütün dövr boyu cəmi <b>${v(lowM)}</b> dövr alır — hədəf ${lo(lowM)}-${hi(lowM)}. <b>${exNm(slots[overIdx].k)}</b>-in işlətdiyi əzələ isə onsuz da hədəfin üstündədir. Bu dəyişiklik həcmi artıq yerdən zəif yerə köçürür, gün isə uzanmır.`,
        a:[{l:"Əvəz et", f:`advReplace('${D}',${overIdx},'${cand}')`},
           {l:"Özüm seçim", f:`openLibPick('${D}',${overIdx})`}] });
    } else if(sets <= 22){
      /* bu gün onsuz da həmin əzələyə işləyən hərəkət varsa, yeni hərəkət əlavə etməkdənsə
         ona bir dövr artırmaq daha ucuz və daha yaxşı yoldur */
      const hasIdx = slots.findIndex(s=>{
        const e = libEx(s.k);
        return e && (e.pri||[]).includes(lowM) && (+s.sets||0) < 5;
      });
      const acts = [];
      if(hasIdx>=0) acts.push({l:`${exNm(slots[hasIdx].k)} +1 dövr`, f:`advSets('${D}',${hasIdx},1)`});
      if(cand) acts.push({l:`${hasIdx>=0?"Yeni hərəkət":"Əlavə et"}: ${exNm(cand)}`, f:`advAdd('${D}','${cand}')`});
      acts.push({l:"Özüm seçim", f:`openLibPick('${D}',null)`});
      if(acts.length) out.push({ sev:0, ic:"＋", t:`${MUSN[lowM]} üçün həcm azdır`,
        w:`${MUSN[lowM]} bütün dövrdə <b>${v(lowM)}</b> effektiv dövr alır, hədəf <b>${lo(lowM)}-${hi(lowM)}</b>. Bu gün həmin əzələnin günüdür və hələ yer var (${sets} dövr ≈ ${mins} dəq).${hasIdx>=0?` Ən sadə yol: <b>${exNm(slots[hasIdx].k)}</b>-ə bir dövr artırmaq.`:""}`,
        a: acts });
    } else if(cand){
      out.push({ sev:1, ic:"!", t:`${MUSN[lowM]} az işlənir`,
        w:`Bütün dövrdə <b>${v(lowM)}</b> dövr (hədəf ${lo(lowM)}-${hi(lowM)}), amma bu gün onsuz da ${sets} dövrdür — əlavə etmək gününü uzadar. Ya mövcud bir hərəkəti <b>${exNm(cand)}</b> ilə əvəz et, ya da başqa günə sal.`, a:[] });
    }
  }

  /* 3) ÇOX — bir əzələ hədəfin üstündədir, bu gün ona işləyir */
  const overM = Object.keys(MUS_GOAL)
    .filter(m => v(m) > hi(m) && (dayV[m]||0) > 0)
    .sort((a,b)=> v(b)-v(a))[0];
  if(overM){
    let bi = -1, bv = 0;
    slots.forEach((s,i)=>{
      const e = libEx(s.k); if(!e) return;
      const c = ((e.pri||[]).includes(overM) ? +s.sets : 0) + ((e.sec||[]).includes(overM) ? s.sets/2 : 0);
      if(c > bv){ bv = c; bi = i; }
    });
    if(bi>=0) out.push({ sev:1, ic:"⏬", t:`${MUSN[overM]} hədəfdən çoxdur`,
      w:`Bir dövrdə <b>${v(overM)}</b> dövr alır (yuxarı hədd ${hi(overM)}). Bu qədər həcm daha çox əzələ vermir, bərpanı yeyir. Ən çox pay verən <b>${exNm(slots[bi].k)}</b>-dir — ondan bir dövr azalt.`,
      a:[{l:"⚙ Dövrləri ayarla", f:`openSlotEdit('${D}',${bi})`}] });
  }

  /* 4) GÜNÜN MÖVZUSU — hərəkət başqa günə uyğundur */
  if(D!=="F"){
    for(let i=0;i<slots.length;i++){
      const e = libEx(slots[i].k); if(!e) continue;
      const pri = (e.pri||[]).filter(m=>!SIDE_MUS.includes(m));
      if(!pri.length || pri.some(m=>focus.includes(m))) continue;
      const to = muscleDay(pri[0]);
      if(to===D || daySlots(to).some(s=>s.k===slots[i].k)) continue;
      out.push({ sev:1, ic:"→", t:`<b>${exNm(slots[i].k)}</b> ${DAY_META[to].name.split(" · ")[0]} gününə`,
        w:`Bu gün ${focus.map(m=>MUSN[m]).join(", ")} günüdür, bu hərəkət isə ${pri.map(m=>MUSN[m]).join(", ")} işlədir. Ayrı gündə həmin əzələ təzə olur — həm çəki, həm bərpa udur.`,
        a:[{l:`${DAY_META[to].name.split(" · ")[0]} gününə köçür`, f:`advShift('${D}',${i},'${to}')`}] });
      break;
    }
  }

  /* 5) DURĞUNLUQ — tarixçə deyir ki bu hərəkət üç məşqdir yerində sayır */
  for(let i=0;i<slots.length && out.length<6;i++){
    const k = slots[i].k;
    if(exSessions(k,8).length < 5) continue;
    const p = progressPlan(k);
    if(!p || p.action!=="deload") continue;
    const alt = (ALT_OF[k]||[]).filter(a=>!keys.includes(a) && libEx(a))[0];
    out.push({ sev:0, ic:"↺", t:`<b>${exNm(k)}</b> ilişib`,
      w:`Son üç məşqdə bu hərəkətdə irəliləmə yoxdur. ${alt ? `Eyni əzələni başqa bucaqdan yükləyən <b>${exNm(alt)}</b> adətən durğunluğu qırır — 4-6 həftə onu et, sonra istəsən geri qayıt.` : `Bir məşq çəkini ~10% endirib təkrarları rahat vur, sonra yenidən qalx.`}`,
      a: alt ? [{l:`${exNm(alt)} ilə əvəz et`, f:`advReplace('${D}',${i},'${alt}')`}] : [] });
    break;
  }

  /* 6) DÖVRDƏ HEÇ İŞLƏNMƏYƏN ƏZƏLƏ */
  Object.keys(MUS_GOAL).forEach(m=>{
    if(v(m) > 0 || muscleDay(m)!==D || handled.has(m)) return;   /* yuxarıda onsuz da təklif verilib */
    const c = candFor(m, keys)[0];
    out.push({ sev:0, ic:"!", t:`${MUSN[m]} bütün dövrdə heç işlənmir`,
      w:`Dörd məşqin heç birində bu əzələyə iş düşmür. ${c?`Bu gün ona uyğun gündür — <b>${exNm(c)}</b> boşluğu bağlayır.`:""}`,
      a: c ? [{l:"Əlavə et", f:`advAdd('${D}','${c}')`}] : [] });
  });

  /* 7) TƏKRAR DİAPAZONU — plan deyir 12, sən həmişə 10-da bitirirsən */
  for(let i=0;i<slots.length;i++){
    const ex = mkEx(slots[i], D), h = habitReps(slots[i].k, ex);
    if(!h) continue;
    out.push({ sev:1, ic:"⇲", t:`<b>${exNm(slots[i].k)}</b> üçün diapazon ${ex.rMin}-${h}`,
      w:`Son üç məşqin hamısında <b>${h} təkrarda</b> bitirmisən, plan isə ${ex.rMin}-${ex.rMax} yazır. Alqoritm onsuz da ${h}-ı hədəf götürür (çəki ${h}-a çatanda artır), amma diapazonu da düzəltsək kartda “${ex.rMax}” yazısı yalan olmaz.`,
      a:[{l:`${ex.rMin}-${h} et`, f:`advRange('${D}',${i},${ex.rMin},${h})`}] });
    break;
  }

  /* 8) UZUNLUQ */
  if(sets > 26 || mins > 85)
    out.push({ sev:1, ic:"⏱", t:"Gün uzundur", w:`${sets} iş dövrü ≈ <b>${mins} dəq</b>. 60-75 dəqiqədən sonra dövrlərin keyfiyyəti düşür. Ən az pay verən izolyasiya hərəkətini çıxar və ya bir dövr azalt.`, a:[] });
  else if(sets < 12)
    out.push({ sev:1, ic:"＋", t:"Gün yüngüldür", w:`Cəmi ${sets} iş dövrü ≈ ${mins} dəq. Zalda onsuz da olursan — 2-3 dövr artırmaq və ya bir hərəkət əlavə etmək dövrün həcmini nəzərəçarpan artırar.`, a:[] });

  return out.sort((a,b)=> a.sev-b.sev);
}
function adviceCard(D){
  const list = planAdvice(D).slice(0,5);
  if(!list.length) return `<div class="card"><div class="sug ok"><div class="si">✓</div>
    <div class="sb"><b>Planda düzəltməli bir şey görmürəm</b><small>Sıra düzgündür (ağır hərəkətlər əvvəldə), hədəf əzələlərin hamısı bir dövrdə 10-20 dövr aralığındadır və gün uzunluğu normaldır. Yeni məşq qeydləri gəldikcə bura yenidən baxılır.</small></div></div></div>`;
  return `<div class="card">
    ${list.map(s=>`<div class="sug ${s.sev===0?"crit":""}">
      <div class="si">${s.ic}</div>
      <div class="sb"><b>${s.t}</b><small>${s.w}</small>
        ${s.a.length?`<div class="sact">${s.a.map(a=>`<button onclick="${a.f}">${esc(a.l)}</button>`).join("")}</div>`:""}
      </div></div>`).join("")}
    <div class="small" style="margin-top:10px">Təkliflər məcburi deyil — plan sənindir. Rəqəmlər bir dövrdən (4 məşq) gəlir: əsas əzələ üçün dövr tam, köməkçi üçün yarım sayılır.</div>
  </div>`;
}
function advMove(D,from,to){
  if(planLocked(D)){ toast("Aktiv məşq var — əvvəlcə onu bitirin"); return; }
  const p = ensurePlan(D);
  if(from<0 || from>=p.length || to<0 || to>=p.length) return;
  const [x] = p.splice(from,1); p.splice(to,0,x);
  planTouch(); toast("Sıra dəyişdirildi");
}
function advReorder(D){
  if(planLocked(D)){ toast("Aktiv məşq var — əvvəlcə onu bitirin"); return; }
  const p = ensurePlan(D);
  const oc = orderCheck(p);
  if(oc.same){ toast("Sıra onsuz da düzgündür"); return; }
  ask("Sıra dəyişdirilsin?",
      "Hərəkətlər ağırdan yüngülə doğru düzüləcək:\n\n" + oc.ideal.map((x,n)=>`${n+1}. ${(libEx(x.k)||{}).name||x.k}`).join("\n"),
      "Tətbiq et", ()=>{
        state.plan[D] = oc.ideal.map(x => p[x.i]);
        planTouch(); toast("Sıra yeniləndi");
      });
}
function advRange(D,i,a,b){
  if(planLocked(D)){ toast("Aktiv məşq var — əvvəlcə onu bitirin"); return; }
  const p = ensurePlan(D); if(!p[i]) return;
  p[i].rMin = Math.max(1, Math.min(50, a));
  p[i].rMax = Math.max(p[i].rMin, Math.min(50, b));
  planTouch(); toast(`${exNm(p[i].k)}: ${p[i].rMin}-${p[i].rMax} təkrar`);
}
function advSets(D,i,d){
  if(planLocked(D)){ toast("Aktiv məşq var — əvvəlcə onu bitirin"); return; }
  const p = ensurePlan(D); if(!p[i]) return;
  const n = Math.max(1, Math.min(10, (+p[i].sets||3) + d));
  if(n === p[i].sets){ toast("Həddə çatıb"); return; }
  p[i].sets = n; planTouch(); toast(`${exNm(p[i].k)}: ${n} dövr`);
}
function advAdd(D,key){
  if(planLocked(D)){ toast("Aktiv məşq var — əvvəlcə onu bitirin"); return; }
  planPick(D,key,null);
}
function advReplace(D,i,key){
  if(planLocked(D)){ toast("Aktiv məşq var — əvvəlcə onu bitirin"); return; }
  const p = ensurePlan(D); if(!p[i]) return;
  ask("Hərəkət əvəz edilsin?", `“${exNm(p[i].k)}” → “${exNm(key)}”.\n\nKeçmiş qeydləriniz və qrafikləriniz silinmir.`,
      "Əvəz et", ()=>planPick(D,key,i));
}
function advShift(D,i,to){
  if(planLocked(D) || planLocked(to)){ toast("Aktiv məşq var — əvvəlcə onu bitirin"); return; }
  const p = ensurePlan(D); if(!p[i]) return;
  const k = p[i].k;
  ask("Başqa günə köçürülsün?", `“${exNm(k)}” ${DAY_META[D].name} günündən çıxarılıb ${DAY_META[to].name} gününə əlavə olunacaq.`,
      "Köçür", ()=>{
        const t = ensurePlan(to);
        if(t.some(s=>s.k===k)){ toast("Artıq həmin gündədir"); return; }
        const [sl] = ensurePlan(D).splice(i,1); t.push(sl);
        planTouch(); toast(`${DAY_META[to].name} gününə köçürüldü`);
      });
}
