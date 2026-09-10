# FORGE — düzəldilmiş versiya

## Yerləşdirmə

Repo kökünə (və ya `gym/` qovluğuna) bu faylların hamısını qoy:

```
index.html
sw.js
manifest.webmanifest
icon-192.png
icon-512.png
icon-maskable-512.png
```

Bütün yollar **nisbidir**, ona görə alt qovluqda (`elvinosmanov.github.io/gym/`) də işləyir. Heç bir quraşdırma addımı yoxdur.

`supabase.sql` yerləşdirilmir — onu Supabase Dashboard → SQL Editor-də icra et. **Bunu koddan əvvəl et:** RLS aktiv deyilsə, publishable açarla istənilən adam bütün qeydləri silə bilər.

Service worker yeniləyəndə `sw.js` içindəki `CACHE_VERSION` dəyərini artır (indi `forge-v2`, növbətidə `forge-v3`), yoxsa istifadəçilərdə köhnə nüsxə qalır.

## Nə dəyişdi

| # | Problem | Düzəliş | Toxunulan funksiyalar |
|---|---|---|---|
| 1 | Proqram "tam bədən" adlanırdı, əslində Push/Pull/Legs idi — kürək, biseps, triseps və yan delta həftədə cəmi 1 dəfə işləyirdi | A/B/C yenidən quruldu: hər gündə 1 diz + 1 omba + 1 itələmə + 1 çəkmə + izolyasiya. Günlər indi ağırlığa görə fərqlənir (ağır/orta/həcm), əzələ qrupuna görə yox | `PROGRAM`, `ALTS`, `RULES[0]`, gün altyazıları |
| 2 | 0 kq-lıq dövrlər səssizcə silinirdi — Back Extension kimi bədən çəkisi hərəkətləri tarixçəyə heç düşmürdü | Filtr `kg>0` yerinə `reps>0` şərtinə keçdi; `bw:true` bayrağı əlavə olundu, belə hərəkətlərdə proqressiya təkrarla gedir | `finishSession`, `suggestKg`, `hintFor`, `perfStr`, `renderProg` |
| 3 | ✓ düyməsi boş təkrar sahəsinə `rMax` yazırdı → app uydurma data üzərində çəki artırırdı | Təkrar heç vaxt avtomatik yazılmır; `rMax` yalnız placeholder qalır, boş dövr üçün toast xəbərdarlığı çıxır | `toggleDone`, `smartReps`, `finishSession` |
| 4 | Qəsdən yüngül "təməl" məşqi proqressiya bazasına düşürdü → real işçi çəkiyə çatmaq həftələr alırdı | `lastPerf()` foundation sessiyalarını keçir; tarixçə və qrafiklər onları yenə göstərir | `lastPerf`, `afterFoundationOnly`, `hintFor` |
| 5 | Bədən çəkisi iki yerdə saxlanılırdı — Qida tabında dəyişdirəndə Bugün tabı köhnə rəqəmi göstərirdi | `state.weights[]` yeganə mənbədir; `profile.w` yalnız ilk qurulum toxumu | `setWeight`, `addWeight`, `fuelWeight`, `renderFuelOut`, `migrate` |
| 6a | Supabase RLS yoxlanmamışdı | `supabase.sql` + app-daxili `rlsSelfCheck()` xəbərdarlığı | `rlsSelfCheck` |
| 6b | `upsert` unikal açarsız yeni sətir yaradırdı, `maybeSingle()` sonra partlayırdı | `onConflict: "user_id"` + SQL-də primary key; xətalar indi toast ilə görünür | `cloudPush` |
| 6c | Hər klaviatura vuruşu buluda tam state göndərirdi | Lokal yazma 350 ms; bulud yalnız mənalı hadisələrdə + 10 s debounce + 60 s idle + oflayn növbə | `save`, `scheduleCloud` |
| 6d | `cloudMerge` əslində birləşdirmirdi — tam əvəzləmə idi, iki cihazda oflayn işləsən biri itirdi | Həqiqi birləşdirmə: məşqlər `tarix+gün`, çəkilər `tarix`, əlavələr məntiqi VƏ YA; davam edən məşq heç vaxt silinmir | `mergeStates`, `cloudSync` |
| 7 | Oflayn işləmirdi — manifest və service worker yox idi | PWA: manifest, ikonlar, cache-first SW, oflayn banneri | `sw.js`, `manifest.webmanifest`, head meta |
| 8 | Lokal ehtiyat nüsxə yox idi | JSON ixrac/idxal; idxal əvəz etmir, birləşdirir | `exportData`, `importData` |
| 9.1 | Hər ✓-də bütün görünüş yenidən qurulurdu — açıq panel bağlanır, fokus itirdi | Yalnız həmin düymə yenilənir | `toggleDone` |
| 9.2 | BSS ipucu "hər əl üçün ayrıca qeyd edin" deyirdi, UI-də isə bir sahə var idi | İpucu UI-nin edə bildiyinə uyğunlaşdırıldı | `PROGRAM.C.bss.cues` |
| 9.3 | Deload yalnız mətndə vardı, izlənmirdi | 18 real məşqdən sonra Bugün tabında banner | `deloadDue`, `dismissDeload` |
| 9.4 | "Bu həftə / 3" bazar ertəsinə bağlı idi | Sürüşən 7 gün + `profile.weeklyTarget` | `weekCount`, `weeklyTarget` |
| 9.5 | Mifflin düsturu yalnız kişi üçün sərt kodlanmışdı | Cins seçimi (`-161` qadın üçün); köhnə istifadəçilər üçün default dəyişmir | `renderFuelOut`, `saveSetup`, `fuelIn` |
| 9.6 | Yemək şablonu sabit 3050 kkal idi, hesablanmış hədəflə uyuşmurdu | Şablon hədəfə görə miqyaslanır, əmsal göstərilir | `mealRatio`, `MEALS` |
| 9.7 | `loadState()` xətada localStorage-a keçmirdi | `return` götürüldü, fallback işləyir | `loadState` |
| — | `~60-70 dəq` təxmini yanlış idi | Set sayı + istirahət + qızışmadan hesablanır (A ≈ 75-85 dəq) | `estMinutes` |

## Bu budaqda əlavə düzəlişlər

| # | Problem | Düzəliş | Toxunulan funksiyalar |
|---|---------|---------|----------------------|
| 10 | İstirahət taymeri `tLeft--` ilə sayırdı — telefon kilidlənəndə brauzer `setInterval`-ı boğur (iOS-da tamam dondurur), ona görə taymer dəqiqələrlə sürüşürdü; səhifə yenilənəndə isə tamam itirdi | Hədəf **vaxt möhürü** saxlanılır və qalan vaxt hər dəfə saatdan hesablanır; `localStorage`-a yazılır və açılışda bərpa olunur. Vaxtı bitmiş taymer dirilmir, siqnal yalnız ekran açıq olanda çalır | `startTimer`, `tick`, `tickRender`, `timerAdd`, `timerSkip`, `restoreTimer`, `visibilitychange` |
| 11 | Modal səhifəni "udurdu": arxa fon sürüşməyə açıq qalırdı, uzun texnika vərəqində yeganə *Bağla* düyməsi ekrandan aşağıda qalırdı, `Esc` yox idi — çıxmaq üçün səhifəni yeniləmək lazım gəlirdi | `openSheet()`: arxa fon kilidlənir və bağlananda skrol mövqeyi qaytarılır, başlıqda həmişə görünən ✕, `Esc` və aşağı sürüşdürüb bağlama | `openSheet`, `closeSheet`, `openTech`, `openSwap`, `.sheet-head/.sheet-body` |
| 12 | Lokal itki riski: oxuma xətası `state`-i boş `DEFAULTS`-da qoyurdu, növbəti `save()` isə real datanın üstünə yazırdı. Ehtiyat nüsxə yalnız əl ilə ixracdan ibarət idi. 350 ms gecikmə heç vaxt "flush" edilmirdi | Oxuma alınmasa yazma **dondurulur** (xam nüsxəni endirmə + "sıfırdan başla" seçimi); gündə bir dəfə fırlanan 3-lük ehtiyat halqası, hər mənbə ayrıca `try/catch` ilə oxunur və ən yeni **etibarlı** nüsxə qalib gəlir; `pagehide`/`freeze`/`visibilitychange` zamanı sinxron yazma | `loadState`, `bestStored`, `rotateBackups`, `writeNow`, `save`, `flushSave`, `renderSaveNote` |
| 13 | `inc` rəqəminin vahidi yox idi: "2.5 kq hər tərəfə, yoxsa ümumi?" sualına cavab verilmirdi və zalın düzəldə bilmədiyi addımlar təklif olunurdu (EZ ştanqa +2.5, hantelə +1) | Hər hərəkətə **yük tipi** verildi (ştanq/EZ/Smith/disk-hər tərəfə/hantel/blok/bədən çəkisi/köməkli/rezin) + zal inventarı (disk cütləri, ştanq çəkiləri, hantel və blok addımı). Təklif həmişə zalın **real yığa bildiyi** çəkidir, necə yığılacağı yazılır | `LOADTYPE`, `LOADS`, `ladderFor`, `nextLoad`, `loadingText`, `suggestKg`, `realStep`, `gymCardHTML` |
| 14 | Divardakı saat telefondan fərqli olur, amma app yalnız telefon vaxtını bilirdi; tarix isə Chromium-un "az" lokalı ucbatından "2026 M09 10" kimi görünürdü | Zal saatı: fərqi bir dəfə yazırsan, başlıq və istirahət taymeri ("07:19-də davam") həmin saata uyğunlaşır. Ay/gün adları əl ilə yazıldı | `syncGymClock`, `gymNow`, `backAt`, `renderDateChip`, `fmtD` |
| 15 | Hansı hərəkətin nəyi işlətdiyi yalnız mətn etiketi idi; həftə ərzində hansı əzələnin az işləndiyi görünmürdü | Ön/arxa əzələ xəritəsi: texnika vərəqində əsas/köməkçi əzələlər bədən üzərində rənglənir, Proqres tabında son 7 günün istilik xəritəsi + əzələ başına dövr | `MUSCLES`, `MMAP`, `bodyView`, `exerciseBody`, `heatShade`, `setsPerMuscle`, `volumeHTML` |

| 16 | Proqram 3 günlük tam bədən A/B/C idi, sən isə əslində **İtələmə / Çəkmə / Ayaq / Tam bədən** işləyirsən — app sənin həftənə uyğun gəlmirdi | Bölgü 4 günə keçdi. Gün açarları (A/B/C/D) saxlanıldı ki, köhnə tarixçə öz gününü tapsın; hərəkət açarları da dəyişmədi, ona görə bütün proqressiya tarixçəsi qalır. Yan delta, baldır və qarın tək gündə həftəlik minimuma çatmadığı üçün Tam bədən günündə təkrarlanır | `EXDEF`, `DAYS`, `PROGRAM`, `ROT`, `nextDay`, `weeklyTarget` |

### Yeni gün quruluşu

| Gün | Ad | Hərəkətlər | Set | Təxmini |
|-----|-----|-----------|-----|---------|
| A | İtələmə | Bench · Overhead Press · Incline DB Press · Lateral Raise · Triceps Pushdown | 18 | ~43 dəq |
| B | Çəkmə | Lat Pulldown · Cable Row · Chest-Supported Row · Face Pull · EZ Curl | 18 | ~40 dəq |
| C | Ayaq | Squat · RDL · Leg Press · Leg Curl · Calf Raise · Cable Crunch | 21 | ~54 dəq |
| D | Tam bədən | Bulgarian Split Squat · DB Bench · One-Arm Row · Lateral Raise · Calf · Crunch · Back Extension | 21 | ~41 dəq |

Günü dəyişmək üçün `DAYS` obyektindəki açar siyahısını redaktə etmək kifayətdir — hərəkət tərifləri `EXDEF`-də ayrıca durur. `smoke.js` [1] bölməsi hər dəyişiklikdən sonra həftəlik əzələ örtüyünü yoxlayır.

## Data uyğunluğu

Köhnə `forge-data` avtomatik miqrasiya olunur (`migrate()`): heç bir məşq, çəki və ya əlavə qeydi itmir. Hərəkət açarları (`sq`, `bp`, `lp` …) saxlanılıb, ona görə keçmiş tarixçə yeni proqramda da görünür. `llc` və `csmr` alternativlərdən əsas slota keçdi — eyni açarla, yəni onlarla əvvəl etdiyin məşqlər də sayılır. `ham` və `fly` alternativlərə keçdi, silinmədi.

## Test

`smoke.js` app-ın öz kodunu icra edib 84 yoxlama aparır (proqram strukturu, bədən çəkisi dövrləri, uydurma təkrarların qarşısının alınması, foundation izolyasiyası, ikiqat proqressiya, birləşdirmə, miqrasiya, bütün tabların render olunması, lokal məlumat müdafiəsi, disk hesabı, zal saatı, əzələ xəritəsi, həftəlik örtük):

```
node smoke.js
```

Bunun üçün `shim.js` və `check.js` də lazımdır. Bunlar app-ın hissəsi deyil — yerləşdirmə zamanı yükləmə.

## Hələ də sənin qərarını gözləyən

- **Şriftlər** hələ Google Fonts-dan gəlir. SW ilk ziyarətdən sonra keşləyir, amma tam oflayn təminat üçün `Oswald` və `JetBrains Mono` woff2 fayllarını repoya qoyub `@font-face` yazmaq lazımdır.
- **Hərəkət şəkilləri** Wikimedia-dadır, SW runtime-da keşləyir. Tam nəzarət istəyirsənsə lokal qovluğa köçür.
- **Qollar həftədə 1 dəfə birbaşa işləyir** (3 set biseps, 3 set triseps). Çoxlu çəkmə/itələmə həcmi bunu kompensasiya edir. Daha çox qol istəyirsənsə: C günündə `abs` slotunu `ham` (Hammer Curl) ilə əvəzlə.
