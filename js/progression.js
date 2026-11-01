/* ================= KÖHNƏ QEYDLƏRİN OXUNUŞU =================
   v37-yə qədər ştanq/disk hərəkətlərində xanaya CƏMİ çəki yazılırdı (dəmir daxil).
   İstifadəçi köhnə qeydlərin olduğu kimi qalmasını istədi — ona görə saxlanmış
   rəqəmlərə toxunmuruq, sadəcə OXUYARKƏN yeni qaydaya çeviririk: (cəmi − dəmir)/2.
   Beləliklə 60 kq bench ilə yeni 20 kq (hər tərəfə) müqayisə edilə bilir və
   proqressiya “çəkin üç dəfə düşüb” demir. Yeni qeydlərdə conv:2 damğası olur. */
const CONV = 2;
function normKg(key, kg, conv){
  if((conv||1) >= CONV) return kg;
  const e = EXMAP[key] || (typeof ARCHIVE!=="undefined" && ARCHIVE[key]) || libEx(key) || {};
  if(!SIDE_LOADS.includes(e.load)) return kg;
  const bar = e.load==="bar" ? gymCfg().bar : 0;
  return Math.max(0, Math.round(((kg - bar)/2)*100)/100);
}
function normSets(key, sets, conv){
  let out = (conv||1) >= CONV ? (sets||[]) : (sets||[]).map(x => ({...x, kg: normKg(key, x.kg, conv)}));
  /* daş çəkisi olan aparatda mümkün olmayan qeydi (55, daş 6.5) ən yaxın real
     çəki (52) kimi oxuyuruq — 1TM, trend və təklif eyni rəqəmə baxsın. Saxlanmış
     rəqəmə toxunmuruq; raw = qeyddə yazılan. */
  if(exStep(key)) out = out.map(x => (x.kg > 0 && dasN(key, x.kg) === null) ? {...x, kg: snapKg(key, x.kg), raw: x.kg} : x);
  return out;
}
function bwEx(key){
  const e = EXMAP[key] || (typeof ARCHIVE!=="undefined" && ARCHIVE[key]) || libEx(key);
  return !!(e && (e.bodyweight || e.load==="bw"));
}
function realSets(key, sets){
  return (sets||[]).filter(s => s.reps>0 && (bwEx(key) || s.kg>0));
}
function lastPerf(key, opts = {}){
  for(let i=state.sessions.length-1;i>=0;i--){
    if(state.sessions[i].foundation && !opts.includeFoundation) continue;
    const f = state.sessions[i].ex.find(e=>e.key===key);
    if(!f) continue;
    const sets = realSets(key, normSets(key, f.sets, state.sessions[i].conv));
    if(sets.length) return { d:state.sessions[i].d, sets };
  }
  return null;
}
/* ================= ALTERNATİV AİLƏSİ =================
   Zalda aparat dolu olanda alternativə keçirsən. Tətbiq onu tamamilə ayrı hərəkət
   kimi görürdü: “ilk dəfə” yazır, referens çəki vermir, proqressiya sıfırdan
   başlayırdı. İndi eyni ailədən (⇄ siyahısı) ən son qeyd referens kimi işlənir.
   Çəki tarixçələri ayrı qalır — hanteldə 30 kq ilə aparatda 30 kq eyni yük deyil. */
function famOf(key){
  const fam = new Set([key]);
  Object.keys(ALT_OF).forEach(base=>{
    const alts = ALT_OF[base] || [];
    if(base === key || alts.includes(key)){ fam.add(base); alts.forEach(a => fam.add(a)); }
  });
  return [...fam];
}
function famPerf(key){
  const own = (libEx(key) || {}).load;
  let best = null;
  famOf(key).forEach(k=>{
    if(k === key) return;
    const p = lastPerf(k);
    if(p && (!best || p.d > best.d))
      best = { ...p, key:k, name: exName(k), sameLoad: (libEx(k)||{}).load === own };
  });
  return best;
}
/* true when the only record we hold for this lift is the foundation session */
function onlyFoundation(key){
  return !lastPerf(key) && !!lastPerf(key, {includeFoundation:true});
}
function perfStr(p){ return p.sets.map(s=>`${s.kg>0?s.kg:"BÇ"}×${s.reps}`).join(", "); }
/* ================= PROQRESSİYA ALQORİTMİ =================
   Köhnə məntiq primitiv idi: “bütün dövrlərdə maks təkrara çatdınmı?” — çatmadınsa
   eyni çəkidə saxlayırdı. Bu, real zalda baş verəni görmürdü: son dövrdə çəkini
   artırıb 12 əvəzinə 10 təkrar etmək GERİLƏMƏ deyil, İRƏLİLƏMƏDİR.

   Ona görə qərar təkrar sayına yox, hər dövrün TƏXMİNİ 1TM-nə baxır (Epley:
   kq × (1 + təkrar/30)). Bu, çəki ilə təkrarı bir ölçüyə gətirir:
     60×10 = 80.0     62.5×9  = 81.3     65×8 = 82.3
   Yəni çəkini artırıb bir-iki təkrar itirmək hesabda irəliləmədir — alqoritm bunu
   görür və “eyni çəkidə qal” demir.

   Baxdığı şeylər: ən yaxşı dövrün 1TM-i, iş çəkisi, ümumi həcm (kq×təkrar) və
   son üç məşqin trendi. Nəticədə konkret göstəriş verir: çəki artır / təkrar
   artır / yüngülləşdir. */
function exSessions(key, limit, withFoundation){
  const out = [];
  for(let i=state.sessions.length-1; i>=0 && out.length<(limit||8); i--){
    const s = state.sessions[i];
    if(s.foundation && !withFoundation) continue;
    const f = s.ex.find(e=>e.key===key);
    if(!f || !f.sets.length) continue;
    const sets = realSets(key, normSets(key, f.sets, s.conv));
    if(!sets.length) continue;
    let top = sets[0];
    sets.forEach(x=>{ if(e1rm(x.kg, x.reps) > e1rm(top.kg, top.reps)) top = x; });
    const bw = sets.every(x => !(x.kg > 0));                /* bədən çəkisi: 1TM mənasızdır */
    if(bw) sets.forEach(x=>{ if(x.reps > top.reps) top = x; });
    out.push({
      d: s.d, sets, bw, foundation: !!s.foundation,
      top,                                                   /* ən güclü dövr */
      e1: bw ? top.reps : e1rm(top.kg, top.reps),
      vol: sets.reduce((a,x)=>a + (x.kg||0)*x.reps, 0),      /* həcm: kq × təkrar */
      reps: sets.reduce((a,x)=>a+x.reps, 0)
    });
  }
  return out;                                                /* yenidən köhnəyə doğru */
}
const r05 = v => Math.round(v*2)/2;
/* bir məşqin ehtiyat təkrarları (qeyd edilibsə): ən çətin dövr və orta */
function rirOf(h){
  const r = (h && h.sets || []).map(s => s.rir).filter(v => typeof v === "number");
  if(!r.length) return null;
  return { min: Math.min(...r), avg: r.reduce((a,v)=>a+v,0)/r.length, n: r.length };
}
/* ---- ADƏT: faktiki bitirdiyin təkrar ----
   Plan “8-12” yazsa da, adam üç məşqdir hər dəfə 10-da dayanırsa, 12 gözləmək
   mənasızdır: çəki heç vaxt artmır və hər məşqdə “çatmadın” mesajı görünür.
   Son üç məşqin ən yüksək təkrarı eynidirsə, onu şəxsi tavan sayırıq —
   proqressiya həmin rəqəmə çatanda çəki artırır. */
function habitReps(key, ex){
  const H = exSessions(key, 6);
  if(H.length < 3) return null;
  const tops = H.slice(0,3).map(h => Math.max(...h.sets.map(s=>s.reps)));
  const X = tops[0];
  if(!tops.every(t => t===X)) return null;
  /* 2+ ehtiyatla dayanırsansa, bu tavan deyil — sadəcə erkən dayanırsan */
  if(H.slice(0,3).some(h => h.sets.some(s => s.reps === X && s.rir >= 2))) return null;
  const lo = (ex && ex.rMin) || 1, hi = (ex && ex.rMax) || 99;
  if(X < lo || X >= hi) return null;     /* diapazondan kənar, ya onsuz da tavandadır */
  return X;
}
/* əsas qərar funksiyası — bütün təkliflər buradan çıxır */
function progressPlan(key){
  const pl = progressPlanCore(key);
  /* son qeyd aparatda mümkün olmayan çəkidirsə, hesab yuvarlaqlaşdırılmış çəki ilədir —
     bunu açıq deyirik, yoxsa “55 × 9-dan sonra 52” səbəbsiz düşüş kimi görünür */
  const H = exSessions(key, 1);
  const note = H.length && !H[0].bw && H[0].top.raw ? offStepNote(key, H[0].top.raw) : "";
  if(pl && note) pl.txt = `<i>${note}</i> ` + pl.txt;
  return pl;
}
function progressPlanCore(key){
  /* Kitabxanadan çıxarılmış hərəkət tarixçədə qala bilər (məsələn deadlift silindi).
     Belə açar üçün minimal təsvir qururuq — əks halda bütün Proqres səhifəsi çökürdü. */
  const ex = EXMAP[key] || { ...(ARCHIVE[key] || {}), key, name: exName(key),
    rMin:8, rMax:12, sets:3, inc:(ARCHIVE[key] && ARCHIVE[key].inc) || 2.5, bodyweight:false };
    /* load qəsdən verilmir: unitOf "kq", incFor isə yuxarıdakı inc-i götürsün */
  const H = exSessions(key, 8);
  /* addım EXMAP-dəki reseptdən gəlir (⚙ və daş çəkisi daxil). Əvvəl burada
     incFor() idi və yığınlı aparatda ⚙-də yazdığın addıma baxmırdı. */
  const inc = +ex.inc > 0 ? +ex.inc : incFor(ex), u = unitOf(ex);
  const r05 = v => snapKg(key, v);
  const habit = habitReps(key, ex);
  const RMAX = habit || ex.rMax;       /* hədəf: ya planın tavanı, ya sənin adətin */
  const hNote = habit ? ` <i>Son üç məşqi həmişə ${habit} təkrarda bitirmisən — ona görə ${ex.rMax} gözləmirəm.</i>` : "";
  if(!H.length){
    const ref = famPerf(key);
    if(ref && ref.sets.length){
      const top = ref.sets.reduce((a,x)=> e1rm(x.kg,x.reps) > e1rm(a.kg,a.reps) ? x : a, ref.sets[0]);
      return { action:"ref", kg: ref.sameLoad ? r05(top.kg) : null,
        reps: Math.min(ex.rMax, Math.max(ex.rMin, top.reps || ex.rMax)), cls:"",
        txt: ref.sameLoad
          ? `Bu variantı ilk dəfə edirsən, amma eyni ailədən qeydin var: <b>${esc(ref.name)}</b> (${fmtD(ref.d)}) — <b>${perfStr(ref)}</b>. Avadanlıq eyni tipdədir, ona görə <b>${r05(top.kg)} ${u}</b> ilə başla; davamını mən aparacam.`
          : `Bu variantı ilk dəfə edirsən. Referens üçün: <b>${esc(ref.name)}</b> (${fmtD(ref.d)}) — <b>${perfStr(ref)}</b>. Avadanlıq fərqlidir (${esc(loadTag(libEx(ref.key)||{}))} ⇄ ${esc(loadTag(ex))}), ona görə rəqəmi birbaşa köçürmə: həmin çətinliyə uyğun çəki seç.` };
    }
    const only = onlyFoundation(key);
    return { action:"first", kg:null, reps:ex.rMax, cls:"",
      txt: only
        ? "Təməl məşqi qəsdən yüngül idi, ona görə baza sayılmır. Bu gün <b>real iş çəkisi</b> seç: son təkrardan sonra hələ ~2 təkrar edə biləcəyin çəki."
        : "İlk dəfə: ~2 əlavə təkrar edə biləcəyin çəki seç. Qeyd et — davamını mən götürəcəyəm." };
  }
  const L = H[0];                       /* sonuncu məşq */
  const best = Math.max(...H.map(h=>h.e1));
  const prevBest = H.length>1 ? Math.max(...H.slice(1).map(h=>h.e1)) : 0;
  const T = exStep(key) && L.top.kg > 0 ? snapKg(key, L.top.kg) : L.top.kg, R = L.top.reps;
  const bw = ex.bodyweight && !(T>0);
  const pr = L.e1 >= best - 0.01;       /* sonuncu məşq ən yaxşısıdır */
  const near = L.e1 >= prevBest * 0.985; /* 1.5% həddində — praktiki olaraq bərabər */
  /* durğunluq: son üç məşqdə ən yaxşı nəticə ondan əvvəlkiləri keçməyib */
  let stalled = false;
  /* tarixçədə aparatda mümkün olmayan çəki varsa (köhnə 5-lik addımla yazılmış 50,
     52.5, 55 hamısı 52-yə yuvarlanır) məşqlər süni olaraq bərabər görünür —
     belə qeydlərdən “durğunluq” nəticəsi çıxarmırıq */
  const fuzzy = H.some(h => h.sets.some(x => x.raw));
  if(H.length >= 5 && !fuzzy){
    const last3 = Math.max(...H.slice(0,3).map(h=>h.e1));
    const older = Math.max(...H.slice(3).map(h=>h.e1));
    stalled = last3 < older * 1.005;
  }
  const fmt = v => (Math.round(v*10)/10);
  const rir = rirOf(L);
  const easy = !!(rir && rir.min >= 3);          /* ən ağır dövr belə 3+ ehtiyatla */

  /* bədən çəkisi ilə: çəki yox, təkrar artır */
  if(bw){
    const allTop = L.sets.every(s=>s.reps>=RMAX);
    if(allTop) return { action:"up", kg:inc, reps:ex.rMin, cls:"up",
      txt:`Bədən çəkisi ilə bütün dövrlərdə ${RMAX} təkrara çatdın — indi <b>disk əlavə et</b> (${inc} ${u}) və ${ex.rMin} təkrardan başla.` };
    if(easy && R < RMAX) return { action:"reps", kg:0, reps:Math.min(RMAX, R+2), cls:"up",
      txt:`Keçən dəfə <b>${R} təkrar</b> və ən çətin dövrdə belə ${rir.min >= 4 ? "4+" : rir.min} təkrar ehtiyat qalmışdı — bu gün hədəf <b>${Math.min(RMAX,R+2)}</b>.` };
    if(R >= RMAX) return { action:"reps", kg:0, reps:RMAX, cls:"",
      txt:`Bədən çəkisi ilə: ən güclü dövrün artıq <b>${R} təkrar</b>. Qalan dövrləri də ${RMAX}-ə çatdır — hamısı çatanda disk əlavə edirik.` };
    return { action:"reps", kg:0, reps:Math.min(RMAX, R+1), cls:"",
      txt:`Bədən çəkisi ilə işlə. Keçən dəfə ən yaxşı dövr <b>${R} təkrar</b> idi — bu gün hədəf <b>${Math.min(RMAX,R+1)}</b>. Hamısı ${RMAX}-ə çatanda disk əlavə edəcəyik.` };
  }

  /* 1) hamısı yuxarı hədə çatıb -> çəki artır */
  if(L.sets.every(s=>s.reps>=RMAX) && L.sets.every(s=>r05(s.kg)>=T-0.01)){
    return { action:"up", kg:r05(T+inc), reps:ex.rMin, cls:"up",
      txt:`Keçən dəfə <b>${T} ${u}</b> ilə bütün dövrlərdə ${RMAX} təkrar. Bu gün <b>${r05(T+inc)} ${u}</b> (+${inc}) — ${ex.rMin} təkrardan başla.${hNote}` };
  }
  /* 2) ən güclü dövr yuxarı hədi keçib (qalan dövrlər daha yüngül olsa belə):
        deməli o çəki artıq mənimsənilib — növbəti dəfə üstünə qoy */
  if(R >= RMAX){
    return { action:"up", kg:r05(T+inc), reps:ex.rMin, cls:"up",
      txt:`Keçən dəfə ən güclü dövr <b>${T} ${u} × ${R}</b> — ${RMAX} hədəfini keçdin. Bu gün <b>${r05(T+inc)} ${u}</b> (+${inc}), ${ex.rMin} təkrardan başla.${hNote}` };
  }
  /* 3) çəki çox ağırdır: ən yaxşı dövr belə minimumdan aşağı */
  if(R < ex.rMin){
    /* Əvvəl diapazonda qalan İSTƏNİLƏN köhnə məşqin çəkisi götürülürdü — 8 məşq
       əvvəlki yüngül çəki ola bilərdi (50 × 7-dən sonra 20 kq təklif edirdi).
       İndi geri addım ən çox bir artım qədərdir. */
    const ok = H.find(h => h.top.reps >= ex.rMin);
    const back = Math.max(inc, Math.min(T, Math.max(T - inc, ok ? ok.top.kg : 0)));
    return { action:"down", kg:r05(back), reps:ex.rMin, cls:"warn",
      txt:`Keçən dəfə <b>${T} ${u} × ${R}</b> — diapazonun altında qaldı, yəni çəki hələ tezdir. Bu gün <b>${r05(back)} ${u}</b> ilə ${ex.rMin}-${RMAX} təkrara qayıt, sonra yenidən qalx.` };
  }
  /* 3b) ehtiyat çoxdur: ən ağır dövr belə 3+ təkrar ehtiyatla bitib — çəki yüngüldür.
         Diapazonun tavanını gözləmək bir-iki məşq itirmək deməkdir. */
  if(easy){
    const tgt = Math.min(RMAX, Math.max(ex.rMin, R));
    return { action:"up", kg:r05(T+inc), reps:tgt, cls:"up",
      txt:`Keçən dəfə <b>${T} ${u} × ${R}</b>, ən çətin dövrdə belə <b>${rir.min >= 4 ? "4+" : rir.min} təkrar ehtiyat</b> qalmışdı — çəki yüngüldür. Bu gün <b>${r05(T+inc)} ${u}</b> (+${inc}), hədəf ${tgt} təkrar.` };
  }
  /* 4) üç məşqdir yerində sayır -> yüngülləşdirmə.
        Amma dövrlər orta 2+ ehtiyatla bitibsə, bu durğunluq deyil, səy azlığıdır:
        çəkini endirmək problemi dərinləşdirər. */
  if(stalled && rir && rir.avg >= 2){
    return { action:"push", kg:r05(T), reps:Math.min(RMAX, R+1), cls:"warn",
      txt:`Üç məşqdir 1TM artmır, amma dövrləri orta <b>${fmt(rir.avg)} təkrar ehtiyatla</b> bitirmisən. Problem çəkidə deyil, səydədir: bu gün <b>eyni ${T} ${u}</b>, son dövrü <b>0-1 ehtiyatla</b> bitir (hədəf ${Math.min(RMAX,R+1)}+).` };
  }
  if(stalled){
    const dl = Math.max(inc, Math.min(r05(T*0.9), T - inc));   /* ən azı bir addım (bir daş) aşağı */
    return { action:"deload", kg:dl, reps:RMAX, cls:"warn",
      txt:`Üç məşqdir bu hərəkətdə irəliləmə yoxdur (ən yaxşı ${fmt(best)} ${u} 1TM). Bu gün <b>${dl} ${u}</b>-a en, ${RMAX} təkrarı asanlıqla vur, sonra yenidən yüksəl — bu, dayanmanı qırmağın ən qısa yoludur.` };
  }
  /* 5) rekord və ya ona bərabər: çəkini SAXLA, təkrar əlavə et.
        (köhnə məntiq burada səhvən “çatmadın, eyni çəkidə qal” deyirdi) */
  if(pr || near){
    const tgt = Math.min(RMAX, R+1);
    const gain = prevBest ? Math.round((L.e1 - prevBest)*10)/10 : 0;
    return { action:"reps", kg:r05(T), reps:tgt, cls:"up",
      txt: pr && gain > 0
        ? `Keçən dəfə <b>${T} ${u} × ${R}</b> — bu sənin ən güclü dövrün idi (təxmini 1TM ${fmt(L.e1)} ${u}, +${gain}). ${R} təkrar ${RMAX}-dən az olsa da bu irəliləmədir. Bu gün <b>eyni ${T} ${u}</b>, hədəf <b>${tgt} təkrar</b>.`
        : `Keçən dəfə <b>${T} ${u} × ${R}</b> — ən yaxşı nəticənə bərabərdir. Bu gün <b>${T} ${u}</b> ilə <b>${tgt} təkrar</b> hədəflə; ${RMAX}-ə çatanda çəki artacaq.${hNote}` };
  }
  /* 6) ən yaxşıdan geri qalıb — həcmi bərpa et */
  const bestH = H.reduce((a,h)=>h.e1>a.e1?h:a, H[0]);
  return { action:"hold", kg:r05(T), reps:Math.min(RMAX, R+1), cls:"",
    txt:`Keçən dəfə <b>${T} ${u} × ${R}</b>. Ən yaxşın <b>${bestH.top.kg} ${u} × ${bestH.top.reps}</b> (${fmtD(bestH.d)}) — bu gün əvvəlcə ona qayıt, sonra irəli. Hədəf: <b>${Math.min(RMAX,R+1)} təkrar</b>.` };
}
/* köhnə çağırış yerləri üçün nazik örtük */
function suggestKg(key){
  const p = progressPlan(key);
  if(!p || p.kg == null) return null;
  return p.kg;
}
function suggestReps(key){
  const p = progressPlan(key);
  return (p && p.reps) || (EXMAP[key] ? EXMAP[key].rMax : 10);
}
function hintFor(ex, p){
  const pl = progressPlan(ex.key);
  return pl ? { cls: pl.cls, txt: pl.txt } : { cls:"", txt:"" };
}
/* ---- trend və proqnoz: Proqres səhifəsi üçün ---- */
function liftTrend(key){
  const H = exSessions(key, 10);
  if(H.length < 2) return null;
  const pts = H.slice().reverse().map(h=>({ t:new Date(h.d).getTime()/86400000, y:h.e1, d:h.d }));
  const n = pts.length;
  const mx = pts.reduce((a,p)=>a+p.t,0)/n, my = pts.reduce((a,p)=>a+p.y,0)/n;
  let num=0, den=0;
  pts.forEach(p=>{ num += (p.t-mx)*(p.y-my); den += (p.t-mx)**2; });
  const perDay = den ? num/den : 0;
  const first = pts[0], last = pts[n-1];
  const days = Math.max(1, last.t - first.t);
  return {
    n, perWeek: perDay*7, e1: last.y, bestE1: Math.max(...pts.map(p=>p.y)),
    change: last.y - first.y, days,
    status: perDay*7 > 0.35 ? "up" : (perDay*7 < -0.35 ? "down" : "flat")
  };
}
/* cari iş çəkisindən növbəti dəyirmi mərhələyə nə qədər qalıb */
function projection(key){
  const t = liftTrend(key), ex = EXMAP[key] || ARCHIVE[key];
  if(!t || !ex || t.perWeek <= 0.15) return null;
  const inc = incFor(ex);
  const H = exSessions(key, 1);
  const cur = H.length ? H[0].top.kg : 0;
  if(!cur) return null;
  const step = unitOf(ex)==="lb" ? 10 : (inc>=5 ? 10 : 5);
  const target = Math.ceil((cur + 0.1)/step)*step;
  const weeks = Math.ceil((target - cur) / (t.perWeek * 0.75));   /* 1TM artımı iş çəkisinə tam keçmir */
  if(weeks < 1 || weeks > 40) return null;
  return { target, weeks, unit: unitOf(ex) };
}
const r25 = v => Math.round(v/2.5)*2.5;
/* Rolling 7 days, not since-Monday: training every other day drifts across the calendar
   week and a Monday anchor would report 2/3 on a perfectly on-schedule week. */
function weekCount(){
  const cut = new Date(); cut.setHours(0,0,0,0); cut.setDate(cut.getDate()-6);
  return state.sessions.filter(s=>{ const [y,m,d]=s.d.split("-").map(Number); return new Date(y,m-1,d)>=cut; }).length;
}
function weeklyTarget(){ return trainDays().length || 4; }
/* “Yüngül həftə” xatırlatması silindi — istifadəçi belə həftə keçirmir.
   Ayrı-ayrı hərəkətdə üç məşq irəliləmə olmayanda verilən yüngülləşdirmə
   təklifi (progressPlan → action:"deload") yerində qalır: o, həftə deyil,
   bir hərəkətin durğunluğunu qırmaq üçündür. */
