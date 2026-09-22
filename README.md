# FORGE

Azərbaycan dilində, telefon üçün qurulmuş kütlə (hipertrofiya) məşq tətbiqi. Tək HTML faylı — build yoxdur, oflayn işləyir (PWA).

## Proqram

`İtələmə → Çəkmə → Ayaq → Tam bədən`, sonra yenidən başdan. Məşq günlərini Ayarlardan seçirsən (standart: bazar ertəsi, çərşənbə axşamı, cümə axşamı, şənbə). Həftədə 4 məşq = tam bir dövr, yəni hər həftə eyni gün eyni məşq düşür. Hərəkət sırası təqvimdən asılı deyil — bir gün buraxsan, sıradakı məşq itmir.

## Nə var

- **107 hərəkətlik kitabxana** — hər birinin iki kadrlı (başlanğıc/bitiş) **real zal fotosu**, texnika ipuçları və ümumi səhvləri
- **Plan redaktoru** — istənilən günə hərəkət əlavə et, sil, yerini dəyiş, dövr/təkrar/istirahəti qur, öz hərəkətini yarat (şəkli və işlədiyi əzələlərlə)
- **Biseps seçimləri elmə görə** — çiyin arxada (Incline, Bayesian) qolun yuxarı hissəsini, çiyin öndə (Preacher, Spider) dirsəyə yaxın hissəni daha çox böyüdür (Kassiano 2025, n=63, 8 həftə). Kitabxanada hər iki mövqedən variantlar var, ⇄ siyahısı bu sıra ilə düzülüb
- **Sıra tövsiyəsi** — Plan bölməsində hər gün üçün “ağırdan yüngülə” ideal sıra yazılır (1. Bench Press · 2. Chest Dips …) və bir toxunuşla tətbiq olunur; izolyasiya ağır hərəkətin qabağına düşübsə ayrıca xəbərdarlıq çıxır
- **Plan doktoru** — planı qurduqdan sonra onu oxuyur və konkret təklif verir: çoxoynaqlı hərəkəti izolyasiyanın önünə keçir, bir dövrdə az işlənən əzələyə dövr/hərəkət əlavə et, hədəfdən çox işlənəni azalt, başqa günə uyğun hərəkəti həmin günə köçür, üç məşqdir ilişmiş hərəkəti alternativi ilə əvəz et. Hər təklif bir toxunuşla tətbiq olunur
- **Əzələ xəritəsi** — real anatomik ön/arxa illüstrasiya üzərində hansı əzələnin nə qədər işlədiyi (əsas dövr tam, köməkçi yarım sayılır), gün və tam dövr üzrə
- **Məşqə baxış** — “Bugün” kartında növbəti məşqin bütün hərəkətləri bir siyahıda: dövr×təkrar və bu gün qaldırılacaq çəki, yanında ↑ artım / → eyni çəki / ↓ yüngülləşdirmə işarəsi. Zala girməzdən əvvəl 10 saniyəlik oxu
- **Gündəlik brifinq** — bu gün hansı hərəkətdə çəki artmalı, hansı əzələ geri qalıb, çəki trendi, keçən məşqin qeydi
- **Video** — hər hərəkət üçün YouTube axtarışı, istəsən öz videonu təyin edirsən
- **Məşq qeydləri** — məşqin sonunda qeyd yazırsan, növbəti dəfə həmin gün açılanda qarşına çıxır
- **Adət tanıma** — plan 8-12 desə də, son üç məşqi həmişə 10-da bitirmisənsə, alqoritm 12 gözləmir: 10-a çatanda çəkini artırır. Plan doktoru diapazonu da düzəltməyi təklif edir
- **Aşağı doldurma** — dövrü ✓ etdikdə çəki və təkrar altındakı toxunulmamış dövrlərə keçir (10 etdinsə altındakılar 10; sonrakını 8 etsən, ondan aşağısı 8). Tətbiqin yazdığı rəqəmlər boz göstərilir və ✓ basılmayana qədər qeyd edilmir
- **Proqressiya alqoritmi** — qərar təkrar sayına yox, hər dövrün təxmini 1TM-nə (kq×(1+təkrar/30)) baxır. Çəkini artırıb bir-iki təkrar itirmək irəliləmə sayılır; durğunluq üç məşqdən sonra aşkarlanır və yüngülləşdirmə təklif olunur
- **Analiz** — hər hərəkət üçün trend (həftədə neçə kq), status, növbəti addım və proqnoz: “bu tempi saxlasan 80 kq-a 6 həftəyə çatırsan”
- **Günə uyğun qızışma** siyahısı + 4 dəqiqəlik taymer
- **Real vaxt sayğacı** — vaxt qeydlərdən hesablanır: dövrlər arası 20 dəqiqədən uzun boşluqlar sayılmır. "Bitir"i unutsan, 3 saatdan sonra məşq özü bağlanır və düzgün müddətlə yadda saxlanılır
- **Çəki qaydası: hər tərəfə** — ştanq, Smith və disklə yüklənən aparatlarda xanaya BİR tərəfin diskləri yazılır, dəmirin öz çəkisi sayılmır (kartda “hər tərəfə 20 + 2.5 · cəmi 65 kq” kimi açılır). Hanteldə bir hantelin rəqəmi, yığınlı aparatda yığın rəqəmi. Köhnə qeydlər olduğu kimi qalır — oxunarkən avtomatik çevrilir (conv damğası)
- **Avadanlığa uyğun artım** — ştanq/disk hər tərəfə +2.5, ayaq compoundları +10, hantel +2.5, yığın +5; istənilən hərəkətin addımı Plan → ⚙ bölməsindən ayrıca qurulur
- **Alternativ ailəsi** — aparat dolu olanda alternativə keçəndə tətbiq artıq “ilk dəfə” demir: eyni ailədən son qeydi referens göstərir, avadanlıq tipi eynidirsə çəkini də təklif edir
- **Yük tipi** — hər hərəkət kq xanasının nəyi ölçdüyünü bilir (ştanq cəmi / bir hantel / yığın / əlavə disk) və ştanq hərəkətlərində hər tərəfə hansı diskləri taxmalı olduğunu göstərir
- **Geri sayım kartda da işləyir** — tam ekran taymeri kiçiltsən və ya istirahəti keçsən belə, kartdakı sayğac dövrün qeyd vaxtından hesablanıb işləməyə davam edir
- **İstirahət** — hər dövrdən sonra növbəti dövrün dəqiq saatı yazılır (zalın divar saatı ilə), sonuncu dövrdən sonra istirahət göstərilmir. Tam ekran taymer istəyə bağlıdır və divar vaxtına bağlıdır — telefonu bağlasan da düzgün qalır
- Bədən çəkisi və təxmini 1TM qrafikləri
- **Çəkisiz qeydin qarşısı alınır** — aparat/ştanq hərəkətində çəki xanası boşdursa ✓ qəbul edilmir (əvvəl belə dövrlər tarixçəyə `0 kq` düşürdü və “Son: BÇ×12” kimi görünürdü). Köhnə 0 kq qeydlər tarixçədə qalır, amma proqressiya hesabına girmir
- **Ləğv edilən məşq geri qayıtmır** — bağlanan yarımçıq məşqə damğa qoyulur; sinxronizasiya buludda qalmış köhnə nüsxəni dirildə bilmir (başqa cihazda həqiqətən davam edən məşq isə qorunur)
- **Plan buludda öz vaxt damğası ilə saxlanılır** — planı yalnız DAHA YENİ plan əvəz edə bilər. Əvvəl ümumi `ts` həll edirdi və ts hər yadda saxlamada yenilənirdi, ona görə planı olmayan köhnə nüsxə səninkini silə bilirdi. Plan dəyişikliyi dərhal göndərilir, düymə basmaq lazım deyil
- **Silmək həqiqətən silir** — silinən məşq/çəki üçün damğa saxlanılır; birləşdirmə iki tərəfi birləşdirdiyi üçün əvvəl silinən qeyd növbəti sinxronda geri qayıdırdı
- **Tarixçə təmizliyi** — gələcək tarixli, sınaq id-li və ya bütün dövrləri eyni olan qeydləri tapıb siyahı ilə göstərir, işarələyib birdəfəyə silirsən (Ayarlar)
- **Yaddaş**: localStorage + istəyə bağlı Supabase bulud sinxronizasiyası. Bulud heç vaxt kor-koranə üzərinə yazılmır — hər yazıdan əvvəl oxunub birləşdirilir, ona görə köhnə nüsxəli cihaz başqa cihazın qeydlərini silə bilmir. Hər məşqin sabit id-si var. + .json ixrac/idxal

Bütün təsdiq pəncərələri tətbiqin özündədir — brauzerin `confirm()`/`alert()` pəncərələri PWA və daxili brauzerlərdə bloklana bildiyi üçün istifadə olunmur.

## İşə salmaq

`index.html` faylını brauzerdə açmaq kifayətdir. Tam PWA (oflayn keş, ana ekrana əlavə) üçün https və ya localhost lazımdır:

```bash
python3 -m http.server 8000
```

## Yerləşdirmə

Bütün yollar nisbidir, ona görə alt qovluqda da (`elvinosmanov.github.io/gym/`) işləyir. Quraşdırma addımı yoxdur.

⚠️ **Supabase işlədirsinizsə, koddan əvvəl `supabase.sql` faylını Supabase Dashboard → SQL Editor-də icra edin.** RLS aktiv deyilsə, publishable açarla istənilən adam bütün qeydləri oxuya və silə bilər. Tətbiqin özündə RLS yoxlaması var — problem varsa Bugün səhifəsində xəbərdarlıq göstərir.

⚠️ **Yeni versiya atanda `sw.js` içindəki `CACHE_VERSION` dəyərini artırın** (`forge-v24` → `forge-v38`), yoxsa istifadəçilərdə köhnə nüsxə qalır.

`supabase.sql` yerləşdirmə üçün deyil — onu Supabase SQL Editor-də icra edin.

## Şəkillər

Əzələ xəritəsinin anatomik fiqurları: [Termininja](https://commons.wikimedia.org/wiki/User:Termininja) / Wikimedia Commons — [Muscular system.svg](https://commons.wikimedia.org/wiki/File:Muscular_system.svg) və [Muscular system-back.svg](https://commons.wikimedia.org/wiki/File:Muscular_system-back.svg), **CC BY-SA 3.0**. Repoda `body-front.png` və `body-back.png` kimi saxlanılır (oflayn işləsin deyə).

Hərəkət fotoları [free-exercise-db](https://github.com/yuhonas/free-exercise-db) layihəsindəndir (Unlicense — ictimai mülkiyyət). Hər hərəkətin iki kadrı var: başlanğıc və bitiş vəziyyəti. jsDelivr CDN-dən verilir, repoda saxlanılmır.

## Qeyd

Tibbi məsləhət deyil. Texnikanı mümkün olanda canlı yoxlatdırın.
