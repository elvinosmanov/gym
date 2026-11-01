/* ================= AYARLAR ================= */
/* ================= TARİXÇƏ TƏMİZLİYİ =================
   Buluda səhvən düşmüş sınaq qeydləri real məşqlərin arasında itir. Bu bölmə
   onları üç əlamətə görə tapır və birdəfəyə silməyə imkan verir. Heç nə
   avtomatik silinmir — siyahını görüb özün seçirsən. */
function junkReason(s){
  if(!s) return null;
  if(s.d > todayISO()) return "gələcək tarix";
  if(/^(\d{4}-\d{2}-\d{2})\|[PLGF]\|(\1|1)$/.test(s.id||"")) return "sınaq id-si";
  const all = (s.ex||[]).flatMap(e=>e.sets||[]);
  if(all.length >= 9 && all.every(x => x.kg===all[0].kg && x.reps===all[0].reps))
    return `bütün dövrlər eyni (${all[0].kg}×${all[0].reps})`;
  return null;
}
function junkList(){
  return state.sessions.map((s,i)=>({ s, i, why: junkReason(s) })).filter(x => x.why);
}
function openJunk(){
  const list = junkList();
  if(!list.length){ toast("Şübhəli qeyd yoxdur"); return; }
  const n = list.reduce((a,x)=>a + x.s.ex.reduce((y,e)=>y+e.sets.length,0), 0);
  $("#sheet").innerHTML = `${SHEETHEAD}
    <h3>Şübhəli qeydlər</h3>
    <div class="stag">${list.length} məşq · ${n} dövr — işarələnənlər silinəcək</div>
    <div class="junkl">${list.map(x=>`<label class="junkr">
      <input type="checkbox" checked data-i="${x.i}">
      <span><b>${fmtD(x.s.d)} · ${esc(dayMeta(x.s.day).name)}</b>
        <small>${x.s.ex.reduce((y,e)=>y+e.sets.length,0)} dövr · ${esc(x.why)}</small></span>
    </label>`).join("")}</div>
    <div class="small" style="margin:10px 0">Sənin real məşqlərin bu siyahıda görünmür. Əmin deyilsənsə həmin sətrin işarəsini götür.</div>
    <button class="btn block danger"${act("purgeJunk")}>İşarələnənləri sil</button>
    <button class="btn block ghost" style="margin-top:8px"${act("closeSheet")}>İmtina</button>`;
  openSheet();
}
function purgeJunk(){
  const idx = [...document.querySelectorAll(".junkr input:checked")].map(el=>parseInt(el.dataset.i));
  if(!idx.length){ toast("Heç nə seçilməyib"); return; }
  const set = new Set(idx);
  state.sessions.forEach((s,i)=>{ if(set.has(i)) tomb("gone", sesKey(s)); });
  state.sessions = state.sessions.filter((_,i)=>!set.has(i));
  save(); cloudPush(true); closeSheet(); refresh();
  toast(`${idx.length} qeyd silindi`);
}
/* Planı bu cihazdakı variantla hər yerdə qalib et */
function forcePlanPush(){
  if(!state.plan || !Object.keys(state.plan).length){ toast("Bu cihazda özəl plan yoxdur"); return; }
  state.planTs = Date.now(); save(); cloudPush(true);
  toast("Bu cihazdakı plan buluda yazıldı");
}
function renderSettings(){
  const p = state.profile, c = gymCfg(), w = latestW();
  $("#view-set").innerHTML = `
    <div class="sect">Sən</div>
    <div class="card">
      <div class="grid2">
        <div class="field"><label>Ad</label><input id="st-name" value="${esc(p.name)}"${onChange("saveSet")}></div>
        <div class="field"><label>Həftədə məşq</label><input value="${weeklyTarget()} gün" disabled></div>
      </div>
      <div class="inline-log" style="margin-top:4px">
        <input id="st-w" type="text" inputmode="decimal" step="0.1" placeholder="${w?w.toFixed(1):"bugünkü çəki (kq)"}" aria-label="Bugünkü çəki (kq)">
        <button class="btn sm"${act("addWeight","st-w")}>Çəkini qeyd et</button>
      </div>
    </div>

    <div class="sect">Zalın avadanlığı</div>
    <div class="card">
      <div class="small" style="margin-bottom:10px">Çəki artımı təklifləri və disk hesablayıcısı buradan hesablanır.
        <br><br><b style="color:var(--ink)">Çəki qaydası:</b> ştanq, Smith və disklə yüklənən aparatlarda xanaya <b style="color:var(--ink)">BİR tərəfin</b> çəkisini yaz — dəmirin öz çəkisi sayılmır. Hantellərdə bir hantelin rəqəmi, yığınlı aparatlarda (kəndir, blok) yığındakı rəqəm yazılır.</div>
      <div class="grid2">
        <div class="field"><label>Dəmirin çəkisi (kq)</label><input id="st-bar" type="text" inputmode="decimal" step="0.5" value="${esc(c.bar)}"${onChange("saveSet")}></div>
        <div class="field"><label>Ən kiçik disk (kq)</label><input id="st-plate" type="text" inputmode="decimal" step="0.5" value="${esc(c.plate)}"${onChange("saveSet")}></div>
      </div>
      <div class="grid2">
        <div class="field"><label>Hantel addımı (kq)</label><input id="st-db" type="text" inputmode="decimal" step="0.5" value="${esc(c.db)}"${onChange("saveSet")}></div>
        <div class="field"><label>Aparat addımı (kq)</label><input id="st-stack" type="text" inputmode="decimal" step="0.5" value="${esc(c.stack)}"${onChange("saveSet")}></div>
      </div>
      <div class="field"><label>Aparat yığınının vahidi</label>
        <select id="st-unit"${onChange("saveSet")}>
          <option value="kg" ${p.stackUnit!=="lb"?"selected":""}>kq — yığında kq yazılıb</option>
          <option value="lb" ${p.stackUnit==="lb"?"selected":""}>lb — yığında funt (lbs) yazılıb</option>
        </select></div>
      ${p.stackUnit==="lb" ? `<div class="field"><label>Aparat addımı (lb)</label>
        <input id="st-stacklb" type="text" inputmode="decimal" step="1" value="${esc(+p.stackStepLb||10)}"${onChange("saveSet")}></div>` : ""}
      <div class="hint" style="margin-top:6px">İndiki artımlar: ştanq/disk <b>hər tərəfə +${c.plate} kq</b> · hantel <b>+${c.db} kq</b> · aparat <b>+${p.stackUnit==="lb" ? (+p.stackStepLb||10)+" lb" : c.stack+" kq"}</b>.
        Ayaq hərəkətlərində addım daha böyükdür (hər tərəfə +10). İstənilən hərəkətin addımını <b>Plan → ⚙</b> bölməsindən ayrıca qura bilərsən.</div>
      ${p.stackUnit==="lb" ? `<div class="small" style="margin-top:8px">Aparatlarda rəqəmi <b style="color:var(--ink)">olduğu kimi lb ilə</b> yaz — çevirmə lazım deyil. Ştanq və hantellər kq olaraq qalır. Ümumi tonajda lb avtomatik kq-a çevrilir.</div>` : ""}
    </div>

    <div class="sect">Məşq günləri</div>
    <div class="card">
      <div class="small" style="margin-bottom:10px">Həftənin hansı günləri zala gedirsən? Cədvəl və “növbəti məşq” bildirişi buna görə qurulur.</div>
      <div class="chips fil">${[1,2,3,4,5,6,0].map(d=>`<button type="button" class="pick ${trainDays().includes(d)?"on":""}"${act("toggleDay",d)} aria-pressed="${trainDays().includes(d)}">${WD_FULL[d]}</button>`).join("")}</div>
      <div class="hint" style="margin-top:10px">Həftədə <b>${weeklyTarget()}</b> məşq · sıra: ${DAYS.map(k=>DAY_META[k].name.split(" · ")[0]).join(" → ")} → yenidən başdan.
      ${weeklyTarget()===4 ? " Həftədə 4 məşq = tam bir dövr, yəni hər həftə eyni gün eyni məşq düşür." : ""}</div>
    </div>

    <div class="sect">Zalın saatı</div>
    <div class="card">
      <div class="small" style="margin-bottom:10px">Zalın divar saatına bax və elə olduğu kimi yaz — fərqi tətbiq özü hesablayır.</div>
      <div class="inline-log">
        <input id="st-clock" type="time" step="1" value="${fmtClock(Date.now(), false, true)}">
        <button class="btn sm"${act("setGymClock")}>Təyin et</button>
      </div>
      <div class="hint" style="margin-top:10px">Telefon: <b>${fmtClock(Date.now(), true, true)}</b> · Zal: <b>${fmtClock(Date.now(), false, true)}</b>${
        (parseInt(p.clockOffset)||0) ? ` <span style="color:var(--c)">(${fmtOffset(parseInt(p.clockOffset)||0)})</span>` : " — fərq yoxdur"}</div>
      ${(parseInt(p.clockOffset)||0) ? `<button class="btn sm ghost" style="margin-top:10px"${act("resetGymClock")}>Fərqi sıfırla</button>` : ""}
    </div>

    <div class="sect">İstirahət</div>
    <div class="card tight">
      <button class="suppbtn ${p.noTimer?"":"on"}"${act("toggleTimerScreen")} aria-pressed="${!p.noTimer}">
        <span class="si">✓</span>
        <span class="st"><b>Tam ekran taymer</b><small>${p.noTimer?"Söndürülüb — yalnız “növbəti dövr: 14:32” yazısı göstərilir":"Dövrü işarələdikdə geri sayım açılır"}</small></span>
      </button>
      <div class="small" style="margin-top:8px">Söndürsən də hər dövrdən sonra növbəti dövrün dəqiq saatı kartda yazılır — zalın saatına baxıb işləyə bilərsən. Sonuncu dövrdən sonra istirahət göstərilmir.</div>
    </div>
    ${sbReady() ? `<div class="sect">Bulud yedəyi</div>
    <div class="card tight">${ sbUser
      ? `<div class="small">☁️ <b style="color:var(--ink)">${esc(sbUser.email)}</b>${sbStatus?` · ${sbStatus}`:""}${lastSync?` · sonuncu: ${fmtClock(lastSync, true)}`:""}</div>
         <div class="hint" style="margin-top:8px">Bu cihazda: <b>${state.sessions.length}</b> məşq · <b>${state.sessions.reduce((a,r)=>a+r.ex.reduce((x,e)=>x+e.sets.length,0),0)}</b> dövr · <b>${state.weights.length}</b> çəki qeydi${cloudDirty?` · <b style="color:var(--c)">göndərilməmiş dəyişiklik var</b>`:""}.
           Məşqi bitirən kimi və tətbiqi bağlayan kimi bulud yenilənir.
           Bulud üzərinə kor-koranə yazılmır — əvvəlcə oxunur və birləşdirilir, ona görə başqa cihazdakı qeydlər silinmir.</div>
         <div style="display:flex;gap:8px;margin-top:10px">
           <button class="btn sm" style="flex:1"${act("syncNow")}>İndi sinxronla</button>
           <button class="btn sm ghost"${act("forcePlanPush")} title="planı bu cihazdan yaz">Planı yaz</button>
           <button class="btn sm ghost"${act("sbSignOut")}>Çıxış</button>
         </div>`
      : `<div class="small" style="margin-bottom:4px">Daxil olun — qeydləriniz buludda saxlansın, telefon dəyişəndə və ya Safari yaddaşı silinəndə itməsin.</div>
         <div class="field"><label>E-poçt</label><input id="sb-email" type="email" autocomplete="email" placeholder="ad@epoçt.com"></div>
         <div class="field"><label>Şifrə</label><input id="sb-pass" type="password" autocomplete="current-password" placeholder="••••••"></div>
         <div style="display:flex;gap:8px">
           <button class="btn sm" style="flex:1"${act("sbSignIn")}>Daxil ol</button>
           <button class="btn sm ghost" style="flex:1"${act("sbSignUp")}>Qeydiyyat</button>
         </div>` }</div>` : ""}

    <div class="sect">Versiya</div>
    <div class="card tight"><div class="small">Rejim: <b style="color:${isStandalone()?"var(--green)":"var(--c)"}">${isStandalone() ? "ana ekran tətbiqi" : "brauzer tabı"}</b>${isStandalone() ? "" : " — tam ekran üçün Safari-dən “Ana ekrana əlavə et”"}.
      <br>Bu cihazda işləyən nüsxə: <b style="color:var(--ink)">${APP_VERSION}</b>.
      Səhifəni yeniləsən və rəqəm dəyişməsə, köhnə nüsxə keşdən açılır — brauzeri tam bağlayıb yenidən aç.</div></div>

    ${junkList().length ? `<div class="sect">Tarixçə təmizliyi</div>
    <div class="card tight">
      <div class="small"><b style="color:var(--c)">${junkList().length} şübhəli məşq</b> tapıldı — gələcək tarixli, sınaq id-li və ya bütün dövrləri eyni olan qeydlər. Bunlar real məşqlərin arasına qarışıb və qrafikləri korlayır.</div>
      <button class="btn sm" style="margin-top:10px;width:100%"${act("openJunk")}>Bax və sil</button>
    </div>` : ""}

    <div class="sect">Yerli nüsxə</div>
    <div class="card tight">
      <div class="small" style="margin-bottom:10px">Bulud xarici xidmətdir. Vaxtaşırı öz nüsxənizi yükləyin — fayl sizdə qalır, heç bir hesab tələb olunmur.</div>
      <div style="display:flex;gap:8px">
        <button class="btn sm" style="flex:1"${act("exportData")}>Yüklə (.json)</button>
        <button class="btn sm ghost" style="flex:1"${act("pickImport")}>Faylı geri yüklə</button>
      </div>
      <input id="impFile" type="file" accept="application/json,.json" style="display:none" aria-label="Yedək faylı seç"${onChange("importFile")}>
      <div class="small" style="margin-top:8px">Geri yükləmə <b style="color:var(--ink)">əvəz etmir</b> — mövcud qeydlərlə birləşdirilir.</div>
    </div>

  `;
}
/* Zalın saatı: istifadəçi divar saatındakı vaxtı olduğu kimi yazır, fərqi biz
   hesablayırıq. Gecəyarısını keçən fərqlər ±12 saat aralığına sıxılır. */
function toggleDay(d){
  const cur = trainDays().slice();
  const i = cur.indexOf(d);
  if(i >= 0){ if(cur.length === 1){ toast("Ən azı bir gün seçilməlidir"); return; } cur.splice(i,1); }
  else cur.push(d);
  state.profile.days = cur.sort((a,b)=>((a+6)%7)-((b+6)%7));   /* bazar ertəsindən başlasın */
  save(); cloudPush(); renderSettings();
}
function setGymClock(){
  const v = ($("#st-clock").value || "").split(":");
  const hh = parseInt(v[0]), mm = parseInt(v[1]), ss = parseInt(v[2])||0;
  if(isNaN(hh) || isNaN(mm)){ toast("Saatı yaz: 16:45"); return; }
  const now = new Date();
  /* saniyə ilə: köhnə versiya yalnız dəqiqəyə yuvarlayırdı — zalın saatı ilə
     telefonun fərqi 30 saniyəyə qədər ola bilər, o da növbəti dövrün göstərilən
     vaxtına birbaşa təsir edir. clockOffset indi SANİYƏ ilə saxlanılır. */
  let diff = (hh*3600 + mm*60 + ss) - (now.getHours()*3600 + now.getMinutes()*60 + now.getSeconds());
  if(diff > 43200) diff -= 86400;
  if(diff < -43200) diff += 86400;
  state.profile.clockOffset = diff;
  save(); cloudPush(); renderSettings();
  toast(diff ? `Zal saatı təyin edildi (${fmtOffset(diff)})` : "Saatlar üst-üstə düşür");
}
function resetGymClock(){ state.profile.clockOffset = 0; save(); cloudPush(); renderSettings(); toast("Sıfırlandı"); }
function toggleTimerScreen(){
  state.profile.noTimer = !state.profile.noTimer;
  if(state.profile.noTimer) timerSkip();
  save(); cloudPush(); renderSettings();
}
function saveSet(){
  const p = state.profile, n = (id,d) => { const v = numVal($("#"+id).value); return isNaN(v) ? d : v; };
  p.name = ($("#st-name").value || "").replace(/[<>]/g,"").trim() || "İdmançı";
  p.barKg = Math.max(0, n("st-bar", 20));
  p.plate = Math.max(0.25, n("st-plate", 2.5));
  p.dbStep = Math.max(0.5, n("st-db", 2.5));
  p.stackStep = Math.max(0.5, n("st-stack", 5));
  const su = $("#st-unit"); if(su) p.stackUnit = su.value === "lb" ? "lb" : "kg";
  const sl = $("#st-stacklb"); if(sl) p.stackStepLb = Math.max(1, n("st-stacklb", 10));
  buildProgram();          /* artım addımları yük tipindən hesablanır — yenidən qurulmalıdır */
  save(); cloudPush(); renderSettings();
  toast("Ayarlar yadda saxlanıldı");
}
/* zalın divar saatı ilə uyğunlaşdırılmış vaxt */
function fmtClock(ts, raw, withSec){
  const off = raw ? 0 : (parseInt(state.profile.clockOffset)||0)*1000;
  const d = new Date(ts + off);
  const p = n => String(n).padStart(2,"0");
  return p(d.getHours()) + ":" + p(d.getMinutes()) + (withSec ? ":" + p(d.getSeconds()) : "");
}
/* clockOffset saniyə ilə saxlanılır (Zalın saatı) — fərqi oxunaqlı yaz */
function fmtOffset(sec){
  const a = Math.abs(sec), m = Math.floor(a/60), s = a%60;
  const mag = m ? (s ? `${m} dəq ${s} san` : `${m} dəq`) : `${s} san`;
  return (sec>0?"+":"-") + mag;
}
function exportData(){
  const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `forge-${todayISO()}.json`;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 0);
  toast("Fayl yükləndi");
}
function importData(input){
  const file = input.files && input.files[0];
  input.value = ""; /* so re-picking the same file fires change again */
  if(!file) return;
  const rd = new FileReader();
  rd.onload = () => {
    let d;
    try{ d = JSON.parse(rd.result); }catch(e){ info("Fayl oxunmadı", "Düzgün FORGE .json faylı seçin."); return; }
    if(!d || typeof d !== "object" || !Array.isArray(d.sessions) || !Array.isArray(d.weights)){
      info("Fayl uyğun deyil", "Bu FORGE yedək faylına oxşamır (sessions/weights tapılmadı)."); return;
    }
    const ns = d.sessions.length, nw = d.weights.length, nsp = Array.isArray(d.supps) ? d.supps.length : 0;
    ask("Fayldan birləşdirilsin?", `${ns} məşq · ${nw} çəki qeydi · ${nsp} əlavə günü\n\nMövcud qeydləriniz silinmir — yalnız çatışmayanlar əlavə olunur.`, "Birləşdir", ()=>{
      state = mergeState(state, normalizeRemote(d));
      buildProgram();
      save(); cloudPush(); refresh();
      toast(`Birləşdirildi — ${state.sessions.length} məşq, ${state.weights.length} çəki qeydi`);
    });
  };
  rd.readAsText(file);
}
/* Təməl günü yeni başlayanlar üçündür. Tarixçəsi itmiş (və ya onsuz da məşq edən)
   istifadəçi onu keçib birbaşa tam həcmlə başlaya bilər. */
function skipFoundation(){
  state.profile.skipFoundation = true;
  save(); cloudPush(); renderToday();
  toast("Tam həcmlə başlayırsan — dövrlər yarıya endirilməyəcək");
}
function saveSetup(){
  const p = state.profile;
  p.name = ($("#su-name").value || "").replace(/[<>]/g,"").trim() || "İdmançı";
  const w = numVal($("#su-w").value);
  if(w > 0 && !setWeight(w)){ toast("Çəki 25-350 kq arasında olmalıdır"); return; }
  /* “Yadda saxla” basıldısa kart bir daha çıxmır — çəki xanası boş qalsa belə.
     Əvvəl şərt “ad VƏ çəki” idi: çəkini yazmadan yadda saxlayan adam eyni kartı
     hər açılışda yenidən görürdü. Çəkini aşağıdakı gündəlik xanadan yazmaq olar. */
  p.setupDone = true;
  save(); cloudPush(); toast("Hazırdır 💪"); renderToday();
}
function addWeight(inputId){
  /* Bugün səhifəsində iki çəki xanası var idi və hər ikisinin id-si "qw" idi:
     aşağıdakına yazanda düymə yuxarıdakı BOŞ xananı oxuyurdu və çəki heç vaxt
     qeyd olunmurdu. İndi id-lər fərqlidir. */
  const el = $("#"+inputId), raw = el ? el.value.trim() : "";
  const v = numVal(raw);
  if(!raw){ toast("Əvvəlcə çəkini yaz, məs. 78.5"); if(el) el.focus(); return; }
  if(!setWeight(v)){ toast(`“${raw}” qəbul olunmadı — 25 ilə 350 arasında rəqəm yaz, məs. 78.5`); return; }
  save(); cloudPush(); toast(`${v} kq qeyd edildi`); refresh();
}
