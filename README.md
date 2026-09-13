# FORGE

Azərbaycan dilində, telefon üçün qurulmuş kütlə (hipertrofiya) məşq tətbiqi. Tək HTML faylı — build yoxdur, oflayn işləyir (PWA).

## Proqram

`İtələmə → Çəkmə → Ayaq → Tam bədən`, sonra yenidən başdan. Məşq günlərini Ayarlardan seçirsən (standart: bazar ertəsi, çərşənbə axşamı, cümə axşamı, şənbə). Həftədə 4 məşq = tam bir dövr, yəni hər həftə eyni gün eyni məşq düşür. Hərəkət sırası təqvimdən asılı deyil — bir gün buraxsan, sıradakı məşq itmir.

## Nə var

- **102 hərəkətlik kitabxana** — hər birinin iki kadrlı (başlanğıc/bitiş) **real zal fotosu**, texnika ipuçları və ümumi səhvləri
- **Plan redaktoru** — istənilən günə hərəkət əlavə et, sil, yerini dəyiş, dövr/təkrar/istirahəti qur, öz hərəkətini yarat (şəkli və işlədiyi əzələlərlə)
- **Əzələ xəritəsi** — real anatomik ön/arxa illüstrasiya üzərində hansı əzələnin nə qədər işlədiyi (əsas dövr tam, köməkçi yarım sayılır), gün və tam dövr üzrə
- **Gündəlik brifinq** — bu gün hansı hərəkətdə çəki artmalı, hansı əzələ geri qalıb, çəki trendi, keçən məşqin qeydi
- **Video** — hər hərəkət üçün YouTube axtarışı, istəsən öz videonu təyin edirsən
- **Məşq qeydləri** — məşqin sonunda qeyd yazırsan, növbəti dəfə həmin gün açılanda qarşına çıxır
- **Proqressiya alqoritmi** — qərar təkrar sayına yox, hər dövrün təxmini 1TM-nə (kq×(1+təkrar/30)) baxır. Çəkini artırıb bir-iki təkrar itirmək irəliləmə sayılır; durğunluq üç məşqdən sonra aşkarlanır və yüngülləşdirmə təklif olunur
- **Analiz** — hər hərəkət üçün trend (həftədə neçə kq), status, növbəti addım və proqnoz: “bu tempi saxlasan 80 kq-a 6 həftəyə çatırsan”
- **Günə uyğun qızışma** siyahısı + 4 dəqiqəlik taymer
- **Real vaxt sayğacı** — vaxt qeydlərdən hesablanır: dövrlər arası 20 dəqiqədən uzun boşluqlar sayılmır. "Bitir"i unutsan, 3 saatdan sonra məşq özü bağlanır və düzgün müddətlə yadda saxlanılır
- **Yük tipi** — hər hərəkət kq xanasının nəyi ölçdüyünü bilir (ştanq cəmi / bir hantel / yığın / əlavə disk) və ştanq hərəkətlərində hər tərəfə hansı diskləri taxmalı olduğunu göstərir
- **İstirahət** — hər dövrdən sonra növbəti dövrün dəqiq saatı yazılır (zalın divar saatı ilə), sonuncu dövrdən sonra istirahət göstərilmir. Tam ekran taymer istəyə bağlıdır və divar vaxtına bağlıdır — telefonu bağlasan da düzgün qalır
- Bədən çəkisi və təxmini 1TM qrafikləri
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

⚠️ **Yeni versiya atanda `sw.js` içindəki `CACHE_VERSION` dəyərini artırın** (`forge-v20` → `forge-v21`), yoxsa istifadəçilərdə köhnə nüsxə qalır.

`supabase.sql` yerləşdirmə üçün deyil — onu Supabase SQL Editor-də icra edin.

## Şəkillər

Əzələ xəritəsinin anatomik fiqurları: [Termininja](https://commons.wikimedia.org/wiki/User:Termininja) / Wikimedia Commons — [Muscular system.svg](https://commons.wikimedia.org/wiki/File:Muscular_system.svg) və [Muscular system-back.svg](https://commons.wikimedia.org/wiki/File:Muscular_system-back.svg), **CC BY-SA 3.0**. Repoda `body-front.png` və `body-back.png` kimi saxlanılır (oflayn işləsin deyə).

Hərəkət fotoları [free-exercise-db](https://github.com/yuhonas/free-exercise-db) layihəsindəndir (Unlicense — ictimai mülkiyyət). Hər hərəkətin iki kadrı var: başlanğıc və bitiş vəziyyəti. jsDelivr CDN-dən verilir, repoda saxlanılmır.

## Qeyd

Tibbi məsləhət deyil. Texnikanı mümkün olanda canlı yoxlatdırın.
