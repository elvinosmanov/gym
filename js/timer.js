/* ================= rest timer =================
   Saat DİVAR VAXTINA bağlıdır (tEnd), saymağa yox: brauzer fon rejimində
   setInterval-i dayandırır və köhnə variantda taymer qaldığı yerdən davam edirdi.
   İndi qayıdanda real qalan vaxt göstərilir, vaxt keçibsə bitmiş sayılır.
   Vaxt state.active.rest-də saxlanılır — səhifə yenilənsə də davam edir. */
let tInt=null, tEnd=0, tTotal=0;
const RING_C = 565.5; // 2*pi*90, matches the SVG circle radius
function tLeftNow(){ return Math.max(0, Math.ceil((tEnd - Date.now())/1000)); }
function startTimer(sec,label){
  clearInterval(tInt);
  tTotal = sec; tEnd = Date.now() + sec*1000;
  if(state.active){ state.active.rest = { end:tEnd, total:sec, label }; save(); }
  if(state.profile.noTimer) return;          /* ekran taymeri söndürülüb — yalnız saat */
  const el=$("#timer"); el.classList.add("on"); el.classList.remove("done");
  $("#timerLab").textContent = String(label||"").toUpperCase();
  $("#timerStart").textContent = "Başla: " + fmtClock(tEnd, false, true);
  tickRender();
  acquireWakeLock();
  tInt = setInterval(tick,1000);
}
function tick(){
  tickRender();
  if(tLeftNow()<=0){
    clearInterval(tInt); tInt=null; $("#timer").classList.add("done"); beep();
    try{navigator.vibrate && navigator.vibrate([160,90,160]);}catch(e){}
    releaseWakeLock();
    setTimeout(()=>{ if(tLeftNow()<=0) $("#timer").classList.remove("on"); },1900);
  }
}
function tickRender(){
  const left = tLeftNow();
  const m=Math.floor(left/60), s=left%60;
  $("#timerDigits").textContent = m+":"+String(s).padStart(2,"0");
  const frac = tTotal>0 ? Math.min(1,Math.max(0,left/tTotal)) : 0;
  $("#timerRing").setAttribute("stroke-dashoffset", (RING_C*(1-frac)).toFixed(1));
}
function timerAdd(){
  tEnd = Math.max(tEnd, Date.now()) + 30000;
  tTotal = Math.max(tTotal, Math.ceil((tEnd-Date.now())/1000));
  if(state.active && state.active.rest) { state.active.rest.end = tEnd; save(); }
  $("#timer").classList.remove("done");
  $("#timerStart").textContent = "Başla: " + fmtClock(tEnd, false, true);
  if(!tInt){ $("#timer").classList.add("on"); acquireWakeLock(); tInt=setInterval(tick,1000); }
  tickRender();
}
/* Ekranı bağlayır, amma istirahəti ləğv etmir — geri sayım kartda davam edir */
function timerHide(){ $("#timer").classList.remove("on"); releaseWakeLock(); }
function timerSkip(){ clearInterval(tInt); tInt=null; tEnd=0; tTotal=0; $("#timer").classList.remove("on"); releaseWakeLock(); if(state.active) delete state.active.rest; }
/* səhifə yenidən açılanda davam edən istirahəti bərpa et */
function resumeTimer(){
  const r = state.active && state.active.rest;
  if(!r || !r.end) return;
  const left = Math.round((r.end - Date.now())/1000);
  if(left <= 0){ if(state.active) delete state.active.rest; return; }
  tTotal = r.total || left; tEnd = r.end;
  if(state.profile.noTimer) return;
  const el=$("#timer"); el.classList.add("on"); el.classList.remove("done");
  $("#timerLab").textContent = String(r.label||"").toUpperCase();
  $("#timerStart").textContent = "Başla: " + fmtClock(tEnd, false, true);
  tickRender(); acquireWakeLock(); tInt = setInterval(tick,1000);
}

/* ---- keep the screen awake while resting (iOS 16.4+ Safari) ---- */
let wakeLock = null;
async function acquireWakeLock(){
  try{ if("wakeLock" in navigator){ wakeLock = await navigator.wakeLock.request("screen"); } }catch(e){}
}
function releaseWakeLock(){ try{ wakeLock && wakeLock.release(); }catch(e){} wakeLock=null; }
document.addEventListener("visibilitychange", ()=>{
  if(document.visibilityState !== "visible"){
    lastHide = Date.now();
    flushSave();
    /* Tətbiq arxa fona keçir: gözləyən dəyişikliyi elə indi buluda yaz.
       Əvvəl yazı 10 saniyəlik gecikmə (və ya 60 saniyəlik təkrar cəhd) gözləyirdi —
       telefonu cibə qoyub zaldan çıxanda həmin pəncərə heç vaxt gəlmirdi. */
    if(sbUser && cloudDirty) doPush();
    return;
  }
  /* Köhnə kod yalnız açılışda bir dəfə oxuyurdu: tətbiq günlərlə açıq qalsa,
     başqa cihazda edilən məşqi heç vaxt görmürdü. İndi 5 dəqiqədən uzun
     fasilədən sonra qayıdanda bulud yenidən oxunur. */
  if(sbUser && lastHide && Date.now()-lastHide > 60000){
    cloudSync().then(()=>refresh());
  }
  if(tInt){ acquireWakeLock(); tickRender(); if(tLeftNow()<=0) tick(); }   /* fonda keçən vaxt nəzərə alınır */
  const el = document.querySelector(".clock"); if(el) el.outerHTML = clockChip();
});
function beep(){
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    [0,0.22].forEach(t=>{
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.type="square"; o.frequency.value=880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001,ctx.currentTime+t);
      g.gain.exponentialRampToValueAtTime(0.18,ctx.currentTime+t+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+t+0.16);
      o.start(ctx.currentTime+t); o.stop(ctx.currentTime+t+0.18);
    });
  }catch(e){}
}
