/* ================= PLAN (öz proqramını qur) =================
   state.plan[D] mövcud olduqda həmin gün tamamilə istifadəçinindir; olmadıqda
   PROGRAM_DEF-dəki standart sıra işləyir. Beləliklə "standarta qaytar" = sadəcə sil. */
let planDay = null, libFilter = "all", libQuery = "";

function ensurePlan(D){
  state.plan = state.plan || {};
  if(!Array.isArray(state.plan[D])) state.plan[D] = daySlots(D).map(s => ({...s}));
  else {
    /* saxlanmış planı daySlots-un gördüyü ilə eyniləşdiririk ki, indekslər üst-üstə düşsün */
    const clean = state.plan[D].filter(s => s && libEx(s.k));
    if(clean.length !== state.plan[D].length) state.plan[D] = clean;
  }
  return state.plan[D];
}
function planLocked(D){ return !!(state.active && state.active.day===D); }
function planTouch(){
  state.planTs = Date.now();     /* planın öz vaxtı — birləşdirmə buna baxır */
  buildProgram(); save();
  cloudPush(true);               /* 10 saniyə gözləmir: plan dəyişikliyi dərhal gedir */
  renderPlan();
}
function selPlanDay(k){ planDay = k; renderPlan(); }

/* Plan kartının altındakı sətir: sıra düzgündürmü, düz deyilsə necə olmalıdır.
   Həmişə görünür — “mənə sıra haqqında heç nə demir” sualının cavabı budur. */
function orderLine(D, slots){
  if(!slots || slots.length < 2) return "";
  const oc = orderCheck(slots);
  if(oc.same) return `<div class="small" style="margin-top:10px;color:var(--green)">✓ Sıra düzgündür — ağır çoxoynaqlı hərəkətlər əvvəldə, izolyasiya sonda.</div>`;
  const list = oc.ideal.map((x,n)=>`${n+1}. ${esc((libEx(x.k)||{}).name || x.k)}`).join(" · ");
  /* Kiçik fərq (iki ağır hərəkətin yeri) zövq məsələsidir — onu qüsur kimi
     göstərmirik, sadəcə alternativ sıra kimi yazırıq. */
  const soft = oc.worst < 5;
  return `<div class="small" style="margin-top:10px">
    ${soft
      ? `<span style="color:var(--green)">✓ Sıra qaydasındadır</span> — ağır hərəkətlər əvvəldədir. Tam “ağırdan yüngülə” variant belə olardı:`
      : `<b style="color:var(--c)">Sıra optimal deyil</b> — izolyasiya ağır hərəkətin qabağına düşüb. Düzgün sıra:`}
    <b style="color:var(--ink)">${list}</b>${soft ? " — fərq kiçikdir, istəsən indiki sıranı saxla." : ""}
    <button class="techbtn" style="margin-top:8px"${act("advReorder",D)}>Bu sıranı tətbiq et</button>
  </div>`;
}
function renderPlan(){
  if(!planDay || !DAY_META[planDay]) planDay = nextDay();
  const D = planDay, meta = DAY_META[D], slots = daySlots(D);
  const custom = !!(state.plan && state.plan[D]);
  const locked = planLocked(D);
  const days = DAYS.map(k=>`<button class="daysel ${planDay===k?"on":""}"${act("selPlanDay",k)} aria-pressed="${planDay===k}">
      <span class="plate plate-${DAY_META[k].cls} ${planDay===k?"on":""}"><span>${DAY_META[k].letter}</span></span>
      <b>${DAY_META[k].name.split(" · ")[0]}</b></button>`).join("");

  const rows = slots.map((sl,i)=>{
    const ex = mkEx(sl, D);
    return `<div class="planrow">
      ${exImg(ex,"exanim sm still")}
      <div class="ptxt"><b>${esc(ex.name)}</b><small>${ex.sets} × ${ex.rMin}-${ex.rMax} · ${Math.round(ex.rest/60*10)/10} dəq<br>${esc(ex.tag||"")}</small></div>
      <div class="pbtns">
        <button type="button"${act("planMove",D,i,-1)} ${i===0?"disabled":""} aria-label="${esc(ex.name)} — yuxarı">↑</button>
        <button type="button"${act("planMove",D,i,1)} ${i===slots.length-1?"disabled":""} aria-label="${esc(ex.name)} — aşağı">↓</button>
        <button type="button"${act("openSlotEdit",D,i)} aria-label="${esc(ex.name)} — ayarla">⚙</button>
      </div>
    </div>`;
  }).join("");

  const mine = Object.keys(state.userEx||{});
  $("#view-plan").innerHTML = `
    <div class="sect">Günü seçin</div>
    <div class="dayrow">${days}</div>

    ${locked ? `<div class="warnnote">Bu gün üzrə məşq davam edir — dəyişiklik etmək üçün əvvəlcə məşqi bitirin və ya ləğv edin.</div>` : ""}

    <div class="sect">${meta.name} · ${slots.length} hərəkət · ~${dayMinutes(D)} dəq</div>
    <div class="card">
      ${rows || `<div class="empty">Bu gün boşdur — aşağıdan hərəkət əlavə edin.</div>`}
      <button class="btn block ghost" style="margin-top:12px"${act("openLibPick",D,null)}>＋ Hərəkət əlavə et</button>
      ${custom ? `<button class="btn block danger" style="margin-top:10px"${act("planReset",D)}>↺ Standart plana qaytar</button>` : ""}
      ${orderLine(D, slots)}
      <div class="small" style="margin-top:8px">⚙ düyməsi ilə dövr, təkrar diapazonu və istirahəti dəyişin.</div>
    </div>

    <div class="sect">Plan doktoru</div>
    ${adviceCard(D)}

    <div class="sect">Hansı əzələ nə qədər işləyir</div>
    ${volumeCard(D)}

    <div class="sect">Mənim hərəkətlərim</div>
    <div class="card">
      ${mine.length ? mine.map(k=>{
        const e = mkEx(defSlot(k), null);
        return `<div class="planrow">
          ${exImg(e,"exanim sm still")}
          <div class="ptxt"><b>${esc(e.name)}</b><small>${e.sets} × ${e.rMin}-${e.rMax} · ${esc(e.tag||"")}</small></div>
          <div class="pbtns">
            <button type="button"${act("openCustom",k)} aria-label="${esc(e.name)} — düzəliş">⚙</button>
            <button type="button" class="del"${act("delCustom",k)} aria-label="${esc(e.name)} — sil">✕</button>
          </div>
        </div>`;
      }).join("") : `<div class="empty">Hələ öz hərəkətiniz yoxdur.</div>`}
      <button class="btn block" style="margin-top:12px"${act("openCustom","")}>＋ Öz hərəkətini yarat</button>
      <div class="small" style="margin-top:10px">Kitabxanada olmayan bir hərəkət edirsinizsə onu buradan yaradın — sonra istənilən günə əlavə edə bilərsiniz.</div>
    </div>

    <div class="sect">Qeyd</div>
    <div class="card tight"><div class="small">Dəyişiklikləriniz yalnız gələcək məşqlərə təsir edir; tarixçə və qrafiklər olduğu kimi qalır. Bir hərəkəti plandan çıxarsanız belə, onun keçmiş qeydləri Proqres bölməsində saxlanılır.
      ${sbUser ? `<br><br>☁︎ Plan dəyişiklikləri <b style="color:var(--ink)">dərhal</b> buludda yadda saxlanılır — düymə basmağa ehtiyac yoxdur. Tətbiq yenilənəndə də plan qalır: buludda planın öz vaxt damğası var və yalnız daha yeni plan onu əvəz edə bilər.` : `<br><br>☁︎ Bulud hesabına daxil deyilsən — plan yalnız bu cihazda saxlanılır. Ayarlardan daxil olsan, plan da buludda qalar.`}</div></div>`;
}

function planMove(D,i,dir){
  if(planLocked(D)){ toast("Aktiv məşq var — əvvəlcə onu bitirin"); return; }
  const p = ensurePlan(D), j = i+dir;
  if(j<0 || j>=p.length) return;
  const t = p[i]; p[i] = p[j]; p[j] = t;
  planTouch();
}
function planRemove(D,i){
  if(planLocked(D)){ toast("Aktiv məşq var — əvvəlcə onu bitirin"); return; }
  const p = ensurePlan(D);
  const nm = (libEx(p[i].k)||{}).name || p[i].k;
  ask("Hərəkət çıxarılsın?", `“${esc(nm)}” bu gündən çıxarılacaq.\n\nKeçmiş qeydləriniz və qrafikləriniz silinmir.`, "Çıxar",
      ()=>{ p.splice(i,1); planTouch(); toast("Çıxarıldı"); }, true);
}
function planReset(D){
  if(planLocked(D)){ toast("Aktiv məşq var — əvvəlcə onu bitirin"); return; }
  ask("Standart plana qaytarılsın?", "Bu gün üçün etdiyiniz dəyişikliklər itəcək — hərəkətlər ilkin siyahıya qayıdacaq.", "Qaytar",
      ()=>{ if(state.plan) delete state.plan[D]; planTouch(); toast("Standart plan bərpa edildi"); }, true);
}
function planPick(D, key, idx){
  const p = ensurePlan(D);
  if(p.some((s,i)=> s.k===key && i!==idx)){ toast("Bu hərəkət artıq həmin gündədir"); return; }
  if(idx===null || idx===undefined) p.push(defSlot(key));
  else p[idx] = { ...defSlot(key), sets:p[idx].sets, rMin:p[idx].rMin, rMax:p[idx].rMax, rest:p[idx].rest };
  closeSheet(); planTouch();
  toast(idx===null||idx===undefined ? "Əlavə edildi" : "Dəyişdirildi");
}

const GRP = { push:"İtələmə (döş · çiyin · triseps)", pull:"Çəkmə (kürək · biseps)", legs:"Ayaq", core:"Qarın · Bel", mine:"Mənim hərəkətlərim" };
function libSetFilter(g){ libFilter = g; renderLibList(); }
function libSearch(v){ libQuery = (v||"").toLowerCase(); renderLibList(); }
/* mode "sess": aktiv məşqə əlavə (plan kilidi tətbiq olunmur, plana yazılmır) */
function openLibPick(D, idx, mode){
  const sess = mode==="sess";
  if(sess ? !(state.active && state.active.day===D) : planLocked(D)){ toast("Aktiv məşq var — əvvəlcə onu bitirin"); return; }
  libFilter = { P:"push", L:"pull", G:"legs" }[D] || "all";   /* günün qrupu ilə başla */
  libQuery = "";
  $("#sheet").innerHTML = `${SHEETHEAD}
    <h3>${sess?"Bu məşqə hərəkət əlavə et":idx===null?"Hərəkət əlavə et":"Hərəkəti əvəz et"}</h3>
    <div class="stag">${DAY_META[D].name}${sess?" · yalnız bu məşq":""}</div>
    <input class="srch" id="libq" placeholder="Axtar: bench, hantel, triseps, fly..." aria-label="Hərəkət axtar"${onInput("libSearch")}>
    <div class="chips fil" id="libfil"></div>
    <div id="liblist" class="swaplist"></div>
    <button class="btn block ghost" style="margin-top:6px"${act("closeSheet")}>Bağla</button>`;
  $("#sheet").dataset.d = D; $("#sheet").dataset.i = (idx===null||idx===undefined) ? "" : String(idx);
  $("#sheet").dataset.mode = sess ? "sess" : "";
  renderLibList();
  openSheet();
}
function renderLibList(){
  const fil = $("#libfil"), box = $("#liblist");
  if(!box) return;
  const D = $("#sheet").dataset.d, iRaw = $("#sheet").dataset.i;
  const idx = iRaw==="" ? null : parseInt(iRaw);
  const groups = ["all","push","pull","legs","core","mine"];
  fil.innerHTML = groups.map(g=>`<button type="button" class="pick ${libFilter===g?"on":""}"${act("libSetFilter",g)} aria-pressed="${libFilter===g}">${g==="all"?"Hamısı":(GRP[g]||g).split(" (")[0]}</button>`).join("");
  const mine = Object.keys(state.userEx||{});
  let keys = libFilter==="mine" ? mine : libKeys().filter(k => libFilter==="all" || (libEx(k)||{}).g===libFilter);
  /* axtarış ada, əzələ teqinə VƏ avadanlığa baxır — "hantel" yazıb aparatsız
     variantları tapmaq üçün (aparat dolu olanda lazım olur) */
  if(libQuery) keys = keys.filter(k => {
    const e = libEx(k) || {};
    const hay = [e.name, e.tag, LOAD_LBL[e.load] ? LOAD_LBL[e.load].s : "", e.load].join(" ").toLowerCase();
    return hay.includes(libQuery);
  });
  if(!keys.length){ box.innerHTML = `<div class="empty">Tapılmadı.</div>`; return; }
  /* həmin gündə artıq olan hərəkətlər əlçatmaz göstərilir — əvvəl ＋ ilə təklif
     edilir, basdıqda isə rədd edilirdi */
  const sess = $("#sheet").dataset.mode === "sess";
  /* aktiv məşqdə ⇄ ilə seçilmiş alternativlər və əvvəl əlavə edilənlər də “var” sayılır */
  const inDay = sess ? sessTaken(D) : new Set(daySlots(D).map((s,i)=> i===idx ? null : s.k).filter(Boolean));
  box.innerHTML = keys.map(k=>{
    const e = mkEx(defSlot(k), null);
    const dup = inDay.has(k);
    /* hər sətir öz əməliyyatını data-act ilə daşıyır: seçilə bilən → əlavə/əvəz, artıq olan → izah */
    const pick = dup ? act("toast", "Bu hərəkət artıq " + (sess ? "bu məşqdədir" : DAY_META[D].name + " günündədir"))
      : sess ? act("sessAdd", k) : act("planPick", D, k, idx);
    return `<button type="button" class="swopt${dup?" dis":""}"${pick}>
      ${exImg(e,"exanim sm still")}
      <span class="swtxt"><b>${esc(e.name)}</b><small>${dup?"bu gündə var":`${esc(e.tag||"")} · ${e.sets}×${e.rMin}-${e.rMax}`}</small></span>
      <span class="swck">${dup?"✓":"＋"}</span>
    </button>`;
  }).join("");
}

function openSlotEdit(D,i){
  if(planLocked(D)){ toast("Aktiv məşq var — əvvəlcə onu bitirin"); return; }
  const sl = daySlots(D)[i], ex = mkEx(sl, D);
  $("#sheet").innerHTML = `${SHEETHEAD}
    ${exImg(ex,"exanim big")}
    <h3>${esc(ex.name)}</h3><div class="stag">${esc(ex.tag||"")}</div>
    <div class="grid2">
      <div class="field"><label>Dövr sayı</label><input id="sl-sets" type="text" inputmode="numeric" min="1" max="10" value="${esc(ex.sets)}"></div>
      <div class="field"><label>İstirahət (san)</label><input id="sl-rest" type="text" inputmode="numeric" min="15" max="300" step="15" value="${esc(ex.rest)}"></div>
    </div>
    <div class="grid2">
      <div class="field"><label>Təkrar — min</label><input id="sl-rmin" type="text" inputmode="numeric" min="1" max="50" value="${esc(ex.rMin)}"></div>
      <div class="field"><label>Təkrar — maks</label><input id="sl-rmax" type="text" inputmode="numeric" min="1" max="50" value="${esc(ex.rMax)}"></div>
    </div>
    <div class="field"><label>${ex.load==="stack" ? `Bir daşın çəkisi (${esc(unitOf(ex))})` : `Artım addımı (${esc(unitOf(ex))}${isSide(ex) ? " — hər tərəfə" : ""})`}</label>
      <input id="sl-inc" type="text" inputmode="decimal" min="0.5" max="50" step="0.5" value="${esc(ex.inc)}"></div>
    <div class="small">${ex.load==="stack"
      ? "Aparatın yığınında hər daş neçə kq-dırsa onu yaz (məs. 6.5). Təkliflər həmişə onun misli olacaq: 6.5, 13, 19.5, 26 … Bu hərəkət hansı gündə olursa olsun işləyir."
      : `Bu aparat neçə-neçə artırsa, onu yaz. ${isSide(ex) ? "Rəqəm bir tərəfə düşən artımdır — hər tərəfə 10-luq disk əlavə edirsənsə 10 yaz." : ""}`}</div>
    <div class="small">Maks təkrara bütün dövrlərdə çatdıqda tətbiq çəkini <b>+${ex.inc} ${esc(unitOf(ex))}</b>${isSide(ex) ? " (hər tərəfə)" : ""} artırmağı təklif edir.</div>
    <button class="btn block" style="margin-top:12px"${act("applySlot",D,i)}>Yadda saxla</button>
    <button class="btn block ghost" style="margin-top:8px"${act("openLibPick",D,i)}>⇄ Başqa hərəkətlə əvəz et</button>
    <button class="btn block danger" style="margin-top:8px"${act("slotRemove",D,i)}>Bu gündən çıxar</button>`;
  openSheet();
}
function applySlot(D,i){
  const p = ensurePlan(D);
  const n = (id,min,max,dflt) => { const v = intVal($("#"+id).value); return (isNaN(v)||v<min||v>max) ? dflt : v; };
  const cur = p[i];
  cur.sets = n("sl-sets",1,10,cur.sets);
  cur.rest = n("sl-rest",15,300,cur.rest);
  let a = n("sl-rmin",1,50,cur.rMin), b = n("sl-rmax",1,50,cur.rMax);
  if(a > b){ const t=a; a=b; b=t; }
  cur.rMin = a; cur.rMax = b;
  const iv = numVal($("#sl-inc").value);
  if(!isNaN(iv) && iv >= 0.5 && iv <= 50){
    cur.inc = iv;
    /* yığınlı aparatda bu, daşın çəkisidir — hərəkətə bağlı saxlanılır */
    if((libEx(cur.k)||{}).load === "stack"){
      state.profile.exStep = { ...(state.profile.exStep||{}), [cur.k]: iv };
    }
  }
  closeSheet(); planTouch(); toast("Yadda saxlanıldı");
}

/* ---- öz hərəkətin ---- */
const clean = s => String(s||"").replace(/[<>]/g,"").trim();
function openCustom(key){
  const e = (key && state.userEx && state.userEx[key]) || { name:"", tag:"", g:"push", sets:3, rMin:10, rMax:12, rest:90, inc:2.5, cues:[] };
  $("#sheet").innerHTML = `${SHEETHEAD}
    <h3>${key?"Hərəkətə düzəliş":"Öz hərəkətini yarat"}</h3>
    <div class="field"><label>Ad</label><input id="cx-name" value="${esc(e.name)}" placeholder="məs. Landmine Press"></div>
    <div class="grid2">
      <div class="field"><label>Qrup</label><select id="cx-g">${["push","pull","legs","core"].map(g=>`<option value="${g}" ${e.g===g?"selected":""}>${GRP[g].split(" (")[0]}</option>`).join("")}</select></div>
      <div class="field"><label>İşləyən əzələ</label><input id="cx-tag" value="${esc(e.tag)}" placeholder="Döş · Triseps"></div>
    </div>
    <div class="grid3">
      <div class="field"><label>Dövr</label><input id="cx-sets" type="text" inputmode="numeric" value="${esc(e.sets)}"></div>
      <div class="field"><label>Təkrar min</label><input id="cx-rmin" type="text" inputmode="numeric" value="${esc(e.rMin)}"></div>
      <div class="field"><label>Təkrar maks</label><input id="cx-rmax" type="text" inputmode="numeric" value="${esc(e.rMax)}"></div>
    </div>
    <div class="grid2">
      <div class="field"><label>İstirahət (san)</label><input id="cx-rest" type="text" inputmode="numeric" step="15" value="${esc(e.rest)}"></div>
      <div class="field"><label>Çəki addımı (kq)</label><input id="cx-inc" type="text" inputmode="decimal" step="0.5" value="${esc(e.inc)}"></div>
    </div>
    <div class="field"><label>Əsas işləyən əzələlər</label>
      <div class="chips fil" id="cx-pri">${Object.keys(MUSN).map(m=>`<button type="button" class="pick ${(e.pri||[]).includes(m)?"on":""}" data-m="${m}"${act("toggleChip")} aria-pressed="${(e.pri||[]).includes(m)}">${MUSN[m]}</button>`).join("")}</div></div>
    <div class="field"><label>Köməkçi əzələlər (yarım dövr sayılır)</label>
      <div class="chips fil" id="cx-sec">${Object.keys(MUSN).map(m=>`<button type="button" class="pick ${(e.sec||[]).includes(m)?"on":""}" data-m="${m}"${act("toggleChip")} aria-pressed="${(e.sec||[]).includes(m)}">${MUSN[m]}</button>`).join("")}</div></div>
    <div class="field"><label>Şəkil (istəyə bağlı)</label><input id="cx-img" value="${esc(e.url||e.file||"")}" placeholder="şəkil linki və ya Commons fayl adı"></div>
    <div class="field"><label>Texnika qeydləri — hər sətir ayrı</label><textarea id="cx-cues" rows="4" placeholder="Dirsəklər bədənə yaxın&#10;Yuxarıda bir saniyə sıxın">${esc((e.cues||[]).join("\n"))}</textarea></div>
    <button class="btn block" style="margin-top:6px"${act("saveCustom",key||"")}>Yadda saxla</button>
    <button class="btn block ghost" style="margin-top:8px"${act("closeSheet")}>İmtina</button>`;
  openSheet();
}
function saveCustom(key){
  const name = clean($("#cx-name").value);
  if(!name){ toast("Ad yazın"); return; }
  const num = (id,d,min,max) => { const v = numVal($("#"+id).value); return (isNaN(v)||v<min||v>max) ? d : v; };
  const img = clean($("#cx-img").value);
  const k = key || ("u" + Date.now().toString(36));
  state.userEx = state.userEx || {};
  const prev = state.userEx[k] || {};
  state.userEx[k] = {
    name, tag: clean($("#cx-tag").value) || "Öz hərəkətim", g: $("#cx-g").value,
    sets: num("cx-sets", 3, 1, 10), rMin: num("cx-rmin", 10, 1, 50), rMax: num("cx-rmax", 12, 1, 50),
    rest: num("cx-rest", 90, 15, 300), inc: num("cx-inc", 2.5, 0.5, 20),
    cues: clean($("#cx-cues").value).split("\n").map(s=>s.trim()).filter(Boolean),
    mist: prev.mist || [],
    pri: [...document.querySelectorAll("#cx-pri .pick.on")].map(el=>el.dataset.m),
    sec: [...document.querySelectorAll("#cx-sec .pick.on")].map(el=>el.dataset.m),
    url: safeURL(img), file: safeURL(img) ? "" : img.replace(/["'<>]/g,"")
  };
  stampKey("userEx", k);
  if(state.userEx[k].rMin > state.userEx[k].rMax){
    const t = state.userEx[k].rMin; state.userEx[k].rMin = state.userEx[k].rMax; state.userEx[k].rMax = t;
  }
  closeSheet(); planTouch();
  toast(key ? "Yeniləndi" : `“${name}” yaradıldı — indi günə əlavə edin`);
}
function delCustom(k){
  const nm = (state.userEx[k]||{}).name || k;
  const used = DAYS.filter(D => daySlots(D).some(s => s.k===k));
  const extra = used.length ? `\n\nO, bu günlərdən də çıxarılacaq: ${used.map(D=>DAY_META[D].name).join(", ")}.` : "";
  ask("Hərəkət silinsin?", `“${esc(nm)}” kitabxanadan tamamilə silinəcək.${esc(extra)}`, "Sil", ()=>{
    used.forEach(D => { const p = ensurePlan(D); const i = p.findIndex(s=>s.k===k); if(i>=0) p.splice(i,1); });
    delete state.userEx[k]; stampKey("userEx", k);
    planTouch(); toast("Silindi");
  }, true);
}
