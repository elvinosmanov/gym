# FORGE v3 — 22 şikayətin hər birinə cavab

Bu yamaq deyil, yenidən qurulmuş versiyadır. Köhnə `forge-data` avtomatik oxunur, məşq tarixçən itmir.

## Yerləşdirmə

`index.html`, `sw.js`, `manifest.webmanifest` və 3 ikonu repoya qoy. Yollar nisbidir — `/gym` alt qovluğunda işləyir. `test.js` yerləşdirmə üçün deyil.

Yeni versiya atanda `sw.js` içindəki `CACHE` dəyərini artır (`forge-v3` → `forge-v4`), yoxsa telefonda köhnə nüsxə qalır.

---

## Hər şikayət, nə edildi

| # | Şikayət | Nə edildi |
|---|---|---|
| 1 | Məşq bitəndən sonra yenə gözləmə səhifəsi açılır | Gözləmə anlayışı tamamilə silindi. Bitirən kimi Bugün açılır və dərhal növbəti məşqi təklif edir. «Başqa gün seç» ilə istənilən gün, istənilən vaxt başladıla bilər — eyni gün iki məşq də olar |
| 2 | Əsas hərəkətlər yoxdur, olanları bəyənmirəm | **61 hərəkət** (əvvəl 18). Deadlift, front squat, pull-up, dips, hip thrust, T-bar row, preacher curl, ab wheel və s. Plan tam redaktə olunur: Ayarlar → Günləri redaktə et, və ya kitabxanadan «Plana əlavə et» |
| 3, 14 | Bəzi məşqlər save olmur, ilk dəfə edirmiş kimi davranır | Kök səbəb: köhnə versiya `kg>0 && reps>0` tələb edirdi, boş qalan sahə isə dövrü səssizcə atırdı. İndi dövrlər **əvvəlcədən real rəqəmlərlə doldurulur**, ✓ isə təsdiqdir. Toxunmasan da saxlanılır |
| 4 | Popup telefonda çətin bağlanır, webdə nəhəngdir | Yeni modal: sağ üstdə ✕, fonda toxunma bağlayır, Esc bağlayır, hündürlük 86vh ilə məhdud və içəridə skrol olur. Masaüstündə 620px mərkəzdə |
| 5 | Telefonda vaxt itirmək istəmirəm, qısa xülasə lazımdır | Bugün səhifəsi indi brifinqdir: hansı gün, neçə dəqiqə, **nə dəyişir** (hansı hərəkətdə neçə kq artır), bu həftə hansı əzələ geridədir, bir düymə. Ortalama 10 saniyəlik oxu |
| 6 | Proqres səhifəsi faydasızdır | Tam yenidən quruldu: əzələ xəritəsi, həftəlik həcm qrafiki, **4 həftəlik güc dəyişimi cədvəli**, dayanmış hərəkətlərin avtomatik aşkarlanması, rekordlar, bədən çəkisi trendi. Ayrı-ayrı məşqləri açmağa ehtiyac yoxdur |
| 7 | Bitirməyi basmağı unuduram | Bitirilməmiş məşq 5 saatdan çox və ya keçmiş tarixdəndirsə, Bugün səhifəsində bərpa xəbərdarlığı çıxır: Saxla / Davam et / Sil. Ayrıca tab bağlananda dərhal diskə yazılır |
| 8, 15 | Hər tərəf, yoxsa bütöv? 2.5 kq necə artırım? | Hər hərəkət kartında mavi zolaq: **«Ştanq — ÜMUMİ çəki, ştanq daxil»** / «Hantel — BİR hantelin çəkisi» / «Bədən çəkisi — ƏLAVƏ çəki». Ştanq hərəkətlərində **Disklər** düyməsi: 62.5 kq → ştanq 20 + hər tərəfə 20 və 1.25. Sualının birbaşa cavabı: 2.5 kq artım = hər tərəfə 1.25 |
| 9 | Təkrarlar çoxdur, mənə 8-12 lazımdır | Standart 8-12 oldu. Ayarlardan dəyişdirilir. İstəsən hər hərəkətin öz aralığını da işə salmaq olar |
| 10 | Hərəkət çeşidi yoxdur | Ayrıca **Hərəkətlər** tabı: axtarış + 16 əzələ qrupu üzrə filtr. Məşq zamanı «+ Hərəkət» və «⇄» ilə dəyişmək olur |
| 11 | Əzələ diaqramı keyfiyyətsizdir | Real SVG bədən — ön və arxa görünüş, 16 əzələ qrupu ayrıca. Rəng son 7 günün dövr sayına görə: boz = işlənməyib, sarı = az, yaşıl = optimal, qırmızı = həddindən çox. Altında hər əzələ üçün hədəf aralığı ilə zolaq |
| 12 | Məşq sonunda qeyd yaza bilim, növbəti dəfə təklif versin | Bitirmə panelində hər hərəkət üçün **Asan / Normal / Çətin** düymələri + ümumi qeyd sahəsi. «Asan» → növbəti dəfə iki addım artım, «Çətin» → çəki saxlanılır. Bu, birbaşa proqressiya mühərrikinə qoşulub |
| 13 | Zalın saatı fərqlidir | Başlıqdakı saata toxun, divardakı vaxtı yaz — ofset yadda qalır. Bütün vaxtlar, o cümlədən «bitiş ≈ 19:40», zal saatı ilə göstərilir |
| 16 | Hantellər 2.5 artır, halbuki 2 olmalıdır | Artım addımı avadanlıq növünə görə ayrıdır və **Ayarlardan dəyişdirilir**: ştanq 2.5, hantel 2, aparat/kabel 5. Zalındakı ən kiçik diskə uyğun qur |
| 17 | Şəkildən heç nə anlamıram, video lazımdır | Şəkillər silindi. Hər hərəkətdə qırmızı **«Videoda bax»** düyməsi — YouTube axtarışına açılır. Konkret video ID yazmadım: onlar silinir, axtarış linki isə heç vaxt ölmür |
| 18 | Seated cable row save olunmur, EZ curl 2.5 artmır | İkisi də yuxarıdakı iki kök səbəb idi (#3 və #16). Testlərdə hər ikisi ayrıca yoxlanılır |
| 19 | Qida hissəsinə girmirəm | Tab tamamilə silindi. Kalori hesablayıcısı yoxdur |
| 20 | Təklifə toxunmasam save etmir, mənasızdır | Düzəldi. Təklif olunan rəqəmlər **real dəyərdir**, ✓ isə «bunu etdim» deməkdir. Heç nəyə toxunmadan bütün məşqi qeyd etmək olar |
| 21 | İlk dəfə 15 kq etmişəmsə, ikincidə niyə boş qəbul edir | Düzəldi — testdə məhz bu ssenari yoxlanılır: 15 kq ilə məşq, sonrakı məşq 15 kq ilə açılır və toxunmadan saxlanılır |

---

## Sənə uyğun olmaya bilər — deyəcəyim iki şey

**Təkrar sayı (#9).** 8-12 hipertrofiya üçün yaxşı aralıqdır, amma «yalnız çəki önəmlidir» tam doğru deyil. Çəki × təkrar × dövr — yəni ümumi iş həcmi — böyüməni sürükləyən şeydir. Ağır baza hərəkətlərində 5-8, izolyasiyada 12-20 daha səmərəli olur. Ayarlarda «hər hərəkətin öz aralığı» seçimi var, bir ay sınayıb müqayisə edə bilərsən.

**Qollar həftədə bir dəfə birbaşa işləyir.** Standart planda biseps 3, triseps 3 dövr alır. Çəkmə və itələmə həcmi bunu qismən örtür, amma qol ölçüsü prioritetdirsə, kitabxanadan hammer curl və overhead extension əlavə et — indi bu bir toxunuşdur.

---

## Növbəti addımlar (#22) — faydaya görə sıralanmış

1. **Qızışma dövrləri.** Hazırda yalnız iş dövrləri var. İşçi çəkidən avtomatik qızışma pilləsi (40% × 5, 60% × 3, 80% × 1) hesablansın və ayrıca göstərilsin — ağır çömbəlmədə bu vacibdir.
2. **Bulud sinxronizasiyası geri.** Köhnə versiyada Supabase var idi, bu versiyada yalnız lokal yaddaş + JSON ixrac/idxal qoydum ki, sadə və etibarlı olsun. Telefon dəyişəndə itki riski var — bir cihazdan çox işlədəcəksənsə, əvvəlki Supabase qatını bu sxemə uyğunlaşdıraq.
3. **Hərəkət başına qeyd.** İndi rəy 3 düymə + ümumi qeyddir. Hərəkət səviyyəsində sərbəst mətn («sağ çiyin ağrıdı») əlavə olunsa, növbəti məşqdə həmin hərəkətin üstündə görünə bilər.
4. **1TM kalkulyatoru və güc standartları.** Yaşına və çəkinə görə «bu hərəkətdə başlanğıc / orta / güclü» səviyyəsi — motivasiya üçün faydalıdır.
5. **Məşq müddəti və dincəlmə statistikası.** Faktiki dövrarası fasilələri ölçüb «istirahətin çox uzundur, məşq 95 dəqiqə çəkir» kimi konkret geri bildirim.
6. **Avtomatik deload.** Proqres səhifəsi artıq dayanmış hərəkətləri göstərir; növbəti addım — 6-8 həftədən sonra yüngül həftəni özü təklif etsin.
7. **Öz videonu əlavə etmək.** Zalda özünü çəkib linki hərəkətə yapışdırmaq — texnikanı zamanla müqayisə etmək üçün ən effektiv üsuldur.

Hansını istəsən növbəti dəfə onu qurarıq.
