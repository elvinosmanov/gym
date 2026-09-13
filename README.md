# FORGE

Azərbaycan dilində, telefon üçün qurulmuş kütlə (hipertrofiya) məşq tətbiqi. Tək HTML faylı — build yoxdur, oflayn işləyir (PWA).

## Proqram

`İtələmə → Çəkmə → Ayaq → Tam bədən`, sonra yenidən başdan. **Bir gün məşq, bir gün istirahət** — cədvəl təqvimə yox, son məşqə bağlıdır, ona görə bir gün gecikmək sıranı pozmur.

## Nə var

- **85 hərəkətlik kitabxana** — hər birinin iki kadrlı (başlanğıc/bitiş) animasiyalı illüstrasiyası, texnika ipuçları və ümumi səhvləri
- **Plan redaktoru** — istənilən günə hərəkət əlavə et, sil, yerini dəyiş, dövr/təkrar/istirahəti qur, öz hərəkətini yarat (şəkli və işlədiyi əzələlərlə)
- **Əzələ xəritəsi** — ön/arxa bədən üzərində hansı əzələnin nə qədər işlədiyi (əsas dövr tam, köməkçi yarım sayılır), gün və tam dövr üzrə
- **İkiqat proqressiya** — bütün dövrlərdə diapazonun yuxarı həddinə çatanda tətbiq çəki artırmağı təklif edir
- **Günə uyğun qızışma** siyahısı + 4 dəqiqəlik taymer
- **Real vaxt sayğacı** — vaxt qeydlərdən hesablanır: dövrlər arası 20 dəqiqədən uzun boşluqlar sayılmır, ona görə "Bitir"i basmağı unutmaq nəticəni pozmur
- **İstirahət taymeri** (ekranı yatmağa qoymur), bədən çəkisi və təxmini 1TM qrafikləri, kalori/makro hesablayıcısı
- **Yaddaş**: localStorage + istəyə bağlı Supabase bulud sinxronizasiyası (sahə səviyyəsində birləşdirmə, son-yazan-qalib deyil) + .json ixrac/idxal

Bütün təsdiq pəncərələri tətbiqin özündədir — brauzerin `confirm()`/`alert()` pəncərələri PWA və daxili brauzerlərdə bloklana bildiyi üçün istifadə olunmur.

## İşə salmaq

`index.html` faylını brauzerdə açmaq kifayətdir. Tam PWA (oflayn keş, ana ekrana əlavə) üçün https və ya localhost lazımdır:

```bash
python3 -m http.server 8000
```

## Yerləşdirmə

Bütün yollar nisbidir, ona görə alt qovluqda da (`elvinosmanov.github.io/gym/`) işləyir. Quraşdırma addımı yoxdur.

⚠️ **Supabase işlədirsinizsə, koddan əvvəl `supabase.sql` faylını Supabase Dashboard → SQL Editor-də icra edin.** RLS aktiv deyilsə, publishable açarla istənilən adam bütün qeydləri oxuya və silə bilər. Tətbiqin özündə RLS yoxlaması var — problem varsa Bugün səhifəsində xəbərdarlıq göstərir.

⚠️ **Yeni versiya atanda `sw.js` içindəki `CACHE_VERSION` dəyərini artırın** (`forge-v5` → `forge-v6`), yoxsa istifadəçilərdə köhnə nüsxə qalır.

`test.js`, `smoke.js`, `check.js`, `shim.js` və `supabase.sql` yerləşdirmə üçün deyil.

## Şəkillər

Hərəkət illüstrasiyaları Wikimedia Commons-dandır (CC BY-SA 3.0) — birbaşa link verilir, repoda saxlanılmır.

## Qeyd

Tibbi məsləhət deyil. Texnikanı mümkün olanda canlı yoxlatdırın.
