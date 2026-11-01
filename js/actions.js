/* ================= HADİSƏ DİSPETÇERİ =================
   HTML-in içinə JS yazmırıq (köhnə inline hadisə atributları kimi): idxaldan və ya buluddan gələn
   mətn atributdan çıxıb kod kimi işləyə bilərdi, həm də belə sətirləri izləmək
   çətindir. Əvəzinə markup yalnız data-act="ad" və data-args='[JSON]' daşıyır,
   bütün kliklər isə bir dinləyicidən keçir. Funksiya YALNIZ aşağıdakı siyahıdan
   seçilir — window[ad] heç vaxt oxunmur.

   act("planMove", D, i, -1)  →  ' data-act="planMove" data-args="[&quot;P&quot;,0,-1]"'
   Arqumentlər həmişə JSON + esc() ilə yazılır, ona görə dırnaq atributdan çıxmır.
   İnput/change hadisələrində (data-input / data-change) xananın dəyəri sonuncu
   arqument kimi əlavə olunur; funksiyanın içində `this` = elementin özü. */
function act(name, ...args){
  return ` data-act="${esc(name)}"` + (args.length ? ` data-args="${esc(JSON.stringify(args))}"` : "");
}
function onInput(name, ...args){
  return ` data-input="${esc(name)}"` + (args.length ? ` data-args="${esc(JSON.stringify(args))}"` : "");
}
function onChange(name, ...args){
  return ` data-change="${esc(name)}"` + (args.length ? ` data-args="${esc(JSON.stringify(args))}"` : "");
}

/* bir neçə addımlı və ya `this` istəyən kiçik əməliyyatlar */
function toggleChip(){
  const on = this.classList.toggle("on");
  this.setAttribute("aria-pressed", on ? "true" : "false");
}
function pickImport(){ const f = $("#impFile"); if(f) f.click(); }
function importFile(){ importData(this); }
function dismissMigration(){ migrationNote = ""; renderToday(); }
function slotRemove(D, i){ closeSheet(); planRemove(D, i); }

/* İCAZƏ SİYAHISI — data-act / data-input / data-change yalnız bunları çağıra bilər */
const ACTIONS = {
  /* naviqasiya, vərəq, dialoq */
  switchTab, closeSheet, askYes, toast,
  /* taymer */
  timerAdd, timerHide, timerSkip, startTimer,
  /* bugün */
  hideInstall, saveSetup, skipFoundation, startSession, addWeight, toggleSupp, dismissMigration,
  /* məşq */
  toggleWarmDone, openClockFix, shiftStart, finishSession, cancelSession, saveWithNote,
  selDay, stepVal, setVal, toggleDone, loadInfo, openTech, openSwap, chooseEx,
  sessRemove, sessAddSet, sessAdd, openVidSet, saveVid, setRir, rirToggle, shareSession,
  /* plan */
  selPlanDay, planMove, openSlotEdit, applySlot, slotRemove, openLibPick, planReset, planPick,
  libSetFilter, libSearch, openCustom, saveCustom, delCustom, toggleChip, setVolMode,
  advReorder, advMove, advReplace, advSets, advAdd, advShift, advRange,
  /* ayarlar */
  saveSet, toggleDay, setGymClock, resetGymClock, toggleTimerScreen, openJunk, purgeJunk,
  syncNow, forcePlanPush, sbSignOut, sbSignIn, sbSignUp, exportData, pickImport, importFile,
  /* proqres */
  delWeight, delSession
};

function actArgs(el){
  const raw = el.getAttribute("data-args");
  if(!raw) return [];
  try{ const a = JSON.parse(raw); return Array.isArray(a) ? a : []; }
  catch(e){ return []; }
}
function runAct(el, name, extra){
  const fn = Object.prototype.hasOwnProperty.call(ACTIONS, name) ? ACTIONS[name] : null;
  if(typeof fn !== "function") return;
  const args = actArgs(el);
  if(extra) args.push(...extra);
  fn.apply(el, args);
}

document.addEventListener("click", e=>{
  const el = e.target.closest && e.target.closest("[data-act]");
  if(!el) return;
  /* söndürülmüş düymə heç nə etmir — köhnə onclick də işləmirdi */
  if(el.disabled || el.getAttribute("aria-disabled") === "true") return;
  runAct(el, el.getAttribute("data-act"));
});
/* role="button" olan qeyri-düymə elementlər klaviaturadan da işləsin */
document.addEventListener("keydown", e=>{
  if(e.key !== "Enter" && e.key !== " ") return;
  const el = e.target;
  if(!el || !el.matches || !el.matches('[data-act][role="button"]')) return;
  e.preventDefault();
  el.click();
});
document.addEventListener("input", e=>{
  const el = e.target;
  const name = el && el.getAttribute && el.getAttribute("data-input");
  if(name) runAct(el, name, [el.value]);
});
document.addEventListener("change", e=>{
  const el = e.target;
  const name = el && el.getAttribute && el.getAttribute("data-change");
  if(name) runAct(el, name, [el.value]);
});
/* <img> xətası yuxarı qalxmır — capture fazasında tuturuq.
   data-fb="ph": şəkil yüklənmədi → kartda yer tutucu; data-fb="rm": ikinci kadr sadəcə silinir */
function imgFallback(el){
  const fb = el.getAttribute("data-fb");
  if(fb === "ph"){ const box = el.closest(".exanim"); if(box) box.classList.add("ph"); }
  else if(fb === "rm") el.remove();
}
document.addEventListener("error", e=>{
  const el = e.target;
  if(el && el.tagName === "IMG" && el.hasAttribute("data-fb")) imgFallback(el);
}, true);
/* Eyni ünvan artıq bir dəfə uğursuz olubsa, brauzer xətanı element hələ səhifəyə
   qoşulmamış (innerHTML təhlil olunarkən) verə bilər — o hadisə document-ə çatmır.
   Ona görə yeni əlavə olunan şəkilləri bir də yoxlayırıq: artıq “sınıq”dırsa,
   eyni ehtiyat yolu işləyir. Lazy, hələ yüklənməmiş şəkil complete=false olur. */
if(typeof MutationObserver === "function"){
  new MutationObserver(ms=>{
    for(const m of ms) for(const n of m.addedNodes){
      if(n.nodeType !== 1) continue;
      const list = n.matches("img[data-fb]") ? [n] : n.querySelectorAll("img[data-fb]");
      list.forEach(i=>{ if(i.complete && i.naturalWidth === 0 && i.getAttribute("src")) imgFallback(i); });
    }
  }).observe(document.documentElement, { childList:true, subtree:true });
}

/* ================= VƏRƏQ / DİALOQ: fokus =================
   Vərəq açılanda fokus içəri keçir, Tab içəridə dövr edir, Escape bağlayır,
   bağlananda fokus vərəqi açan elementə qayıdır. openSheet/closeSheet hər
   açılış yerindən çağırılır (train.js). */
const FOCUSABLE = 'button:not([disabled]),[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
function sheetFocusables(){
  const sh = $("#sheet");
  return [...sh.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null || el === document.activeElement);
}
document.addEventListener("keydown", e=>{
  const sh = $("#sheet");
  if(!sh || !sh.classList.contains("on")) return;
  if(e.key === "Escape"){ e.preventDefault(); closeSheet(); return; }
  if(e.key !== "Tab") return;
  const f = sheetFocusables();
  if(!f.length){ e.preventDefault(); sh.focus(); return; }
  const first = f[0], last = f[f.length-1], cur = document.activeElement;
  if(!sh.contains(cur)){ e.preventDefault(); (e.shiftKey ? last : first).focus(); return; }
  if(e.shiftKey && (cur === first || cur === sh)){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && cur === last){ e.preventDefault(); first.focus(); }
});
