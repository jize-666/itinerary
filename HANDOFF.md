# HANDOFF

Diperbarui 13 Nov 2026 malam (WIB) · branch kerja `claude/gallant-hopper-1jlpo0` (dibuat ulang dari `main` sesudah PR #7) · **Tugas 7 (gunungan) sedang dikerjakan atas arahan host, prioritas tertinggi.** Tugas 6 (gong): kode pukulan dan hentakan kamera sudah di branch, **tes unit, e2e, dan videonya ditunda host sampai gunungan selesai** (daftarnya di bagian 0, "Utang gong").
Konteks proyek dan aturan yang tidak boleh dilanggar: `docs/handoff/FABLE-5.2.md`. Keputusan desain: `docs/design/decisions.md`.

## 0. Tugas aktif: panggung 3D (permintaan host 12 Nov)

### Tugas 7 (gunungan): kemajuan (13 Nov dini hari, ditulis atas permintaan host "update ke handoff dulu")

**Status singkat (13 Nov malam): muka Murka sudah dirombak bergaya wayang kulit mengikuti foto gunungan dari host, dengan garuda mengikuti foto topeng garuda Bali. Api geni saat mundur sudah diperkuat. Semuanya di-commit (`6f0e9db`), dan gambar datar serta tangkapan layar panggung (desktop, saat terbakar, HP tegak) sudah dikirim ke host; menunggu tanggapan. Yang BELUM: video sapuan (sedang direkam), e2e, gerbang pembuka.** Jangan dianggap selesai.

**Arahan host yang berlaku** (kata demi kata ada di "Tugas 6: kemajuan" di bawah, no. 4, 7, 8): gunungan dikerjakan dulu dengan prioritas tertinggi; tes unit dan e2e gong ditunda sampai gunungan selesai; "redesign/remodel/upgrade ke duanya. jangan yang 'murka' aja". Tafsir Claude atas kalimat terakhir (belum ditegaskan host): sapuan antar bab dan gerbang pembuka dua-duanya dirancang ulang, dan gunungannya tidak hanya berwajah "Murka".

**Arahan host 13 Nov (sesi baru sesudah `/clear`), kata demi kata, disertai satu foto kayon gapuran gaya Surakarta:**
"cek handoff.md / revisi design gunungan yang baru menjadi seperti foto yang gw kirim. jangan tiru 100% / jangan mirip 100%, cukup jadi acuan. / untuk mode "murka" tetap harus ada muka barong/wayangan nya."

Isi foto acuan: siluet berbahu yang menyempit ke pita dasar merah bersudut jungkit; seluruh bidang penuh sulur prada di atas dasar merah tua (bukan renda tembus); pohon hayat dililit seekor ular hijau, dengan burung dan kembang; macan dan banteng berhadapan; kala kecil di puncak gapura; gapura beratap tumpang (atas biru bermotif ombak, bawah emas berbelah ketupat), pintu hijau berbingkai merah, undakan dan lantai ubin; sepasang sayap dengan kepala makara biru; dua raksasa penjaga bertameng.

Tafsir Claude (belum ditegaskan host): yang direvisi adalah gambar gunungan di `scripts/assets/gunungan-paint.js` untuk **kedua muka**; susunan dan warnanya mengikuti foto, tetapi digambar ulang dengan gaya sendiri (tidak menjiplak). Muka Murka tetap memakai wajah kala/barong besar yang disetujui 8 Nov, sekarang di atas pintu gapura menggantikan atap. Rancangan "Agung" lama (bingkai nila, medali surya-padma, sepasang merak, renda belah ketupat) **diganti**. Status pengerjaannya ada di "Revisi rupa (13 Nov)" di bawah.

**Arahan susulan 13 Nov (dikirim saat pelukis baru sedang dipanggang), kata demi kata:** "meraknya bisa di samain kata prefrensi ga? seolah olah menelan pendapa". Tafsir Claude (belum ditegaskan host): "merak" = sepasang kepala bersayap biru di kiri-kanan atap gapura pada foto acuan (di pelukis bernama `makara` + `wing`); "kata prefrensi" = "kayak referensi". Yang diminta: kepala itu dibuat seperti di foto, rahangnya menganga lebar mengapit sisi atap sehingga pendapa tampak sedang ditelan dari kiri dan kanan, dengan bulu mengipas di belakangnya. Berlaku di muka Agung (di muka Murka atap diganti wajah kala besar, jadi di sana hanya sayapnya).

**Arahan susulan kedua 13 Nov (sesudah melihat gambar pertama kepala "merak"), kata demi kata:** "buat lebih serem lah kaya foto refrensi meraknya, di preference lebih kaya monster. ini kaya badut". Artinya: kepala "merak" versi pertama (biru cerah, mata bulat putih, bibir merah melengkung) ditolak karena lucu seperti badut; harus seram seperti monster di foto acuan. Yang diubah: warna lebih gelap, mata melotot berurat dengan iris menyala dan kelopak miring, alis api, tanduk, surai api, deret taring tak rata dan dua siung panjang, lidah bercabang, janggut api.

**Arahan host 13 Nov sore (sesi baru sesudah `/clear`), kata demi kata, disertai satu foto sisi api sebuah kayon (seluruh lembaran berupa sisik lidah api jingga-kuning, dengan satu wajah kala/barong besar berwarna pucat di tengah bawah: mata merah melotot, pilin-pilin putih dan merah muda, mulut merah menganga bertaring, lidah menjulur):**
"cek sapuan gunungan di handoff.md, sudah selesai? yang ini; (Lint, typecheck, dan 281 tes unit lulus. Saya cek tampilan di layar HP tegak, lalu menulis tes unit gunungan dan merekam video sapuan.) / revisi gunungan mode "murka" harusnya full muka barong seperti ini"

Jawaban atas "sudah selesai?", dari jejak di disk (sesi sebelumnya terputus ±05.01 UTC):
- **Cek HP tegak: sudah.** Dua tangkapan iPhone tiruan (maju di tengah, mundur dengan geni) dibuat 05.00; sapuan tampil benar.
- **Tes unit gunungan: sudah ditulis, belum sempat dijalankan.** `tests/unit/gunungan.test.ts` (10 tes) dibuat 05.01 dan belum di-commit. Dijalankan di sesi ini: `pnpm test` **291 lulus**, `pnpm typecheck` dan `pnpm lint` lulus.
- **Video sapuan: belum direkam.** Tidak ada berkas video sesudah gambar baru dipanggang.
- Semua pekerjaan revisi rupa 13 Nov (pelukis, tekstur, penyetelan cahaya shader, `sweepAt`) belum di-commit saat sesi terputus; di-commit di sesi ini sebagai titik aman sebelum muka Murka diubah.

Tafsir Claude atas revisinya (belum ditegaskan host): **muka Murka diganti seluruhnya**. Gapura, pohon hayat, naga, banteng, macan, sayap, dan penjaga dihapus dari muka Murka; seluruh lembaran menjadi kobaran lidah api bersisik, dan satu wajah barong/kala besar mengisi bagian tengah-bawah, seperti foto. Wajahnya pucat (putih tulang, merah muda, abu) supaya terbaca di atas api, bukan merah seperti versi 8 Nov. Muka Agung tidak diubah. Sisi geni (api yang menjalar saat mundur) digambar ulang supaya cocok dengan wajah baru. Arahan lama "jangan mirip 100%, cukup jadi acuan" dianggap tetap berlaku: susunannya mengikuti foto, gambarnya dibuat sendiri.

**Arahan susulan 13 Nov sore (sesudah melihat gambar kedua muka Murka baru), kata demi kata:** "kaya badut, revisi buat lebih mengerikan lagi". Yang ditolak: wajah pucat merah muda berkepala bulat, pilin pastel di sekeliling kepala (mirip telinga dan permen), hidung bulat, kumis pilin, gigi rata dan rapi, lidah pendek membulat. Arah perbaikannya (tafsir Claude): kulit abu tulang dengan bayang gelap dan aksen merah darah, tulang pipi bersudut, alis berat yang menaungi mata, mata dalam rongga hitam dengan urat merah, hidung pesek seperti tengkorak, mulut menganga sangat lebar dengan taring panjang tak rata, lidah panjang runcing, tanduk, dan surai api merah gelap.

**Arahan susulan berikutnya 13 Nov sore (dikirim saat versi ketiga sedang digambar), kata demi kata:** "terlalu bulat muka mukanya, kaya kentang. revisi ambil kaya di referensi lah". Yang ditolak: wajah yang dibungkus satu kontur bulat atau lonjong (versi pertama dan kedua bulat seperti kentang; versi ketiga, pelat abu bertanduk dengan surai api, masih berupa satu topeng utuh). Arah perbaikannya (tafsir Claude): susunan wajah mengikuti foto acuan sungguh-sungguh. Wajahnya lebar dan pendek, dan sosoknya tidak dibentuk kontur melainkan rakitan ukel (pilin) bertepi tajam: sepasang ukel mahkota putih di atas kepala, alis ukel yang memilin di pelipis, mata merah melotot yang berdekatan, moncong lebar bercuping pilin, pilin pipi bergerigi di kiri-kanan, mulut menganga selebar wajah dengan deret gigi, siung, dan taring, serta lidah panjang. Warnanya putih tulang, abu-hitam, merah darah, dan sedikit merah jambu kusam, dengan cecek di sepanjang alur seperti di foto. Tetap seram, sesuai arahan "badut" sebelumnya.

Sesi berganti model di titik ini (host: "lanjut opus, baca handoff.md serta claude.md terlebih dahulu sebelum melanjutkan"). Versi ketiga muka Murka sudah ada di pelukis tetapi belum di-commit; versi keempat (di atas) menggantikannya.

**Arahan host 13 Nov sore (sesudah melihat gambar muka Murka versi kelima), kata demi kata:** "mode murka, pas kebakar masih kurang. dan tanduk sama yang di pipinya iru kaya keong." Tafsir Claude (belum ditegaskan host):
- "pas kebakar masih kurang": api geni saat mundur terlalu lemah. Sekarang api hanya naik ±40% dari kaki dengan kadar 0,3, dan muka Murka di atasnya tetap terlihat seperti gambar diam. Yang diminta: kebakaran yang sungguh terasa. Api menjalar lebih tinggi sampai mengitari kepala, lidah apinya bergerak hidup, lembaran tampak membara (tepi bakar dan kulit yang menghitam di belakang garis api), dan wajah barong ikut menyala (mata dan mulut berpendar), tetapi wajahnya tetap terbaca.
- "tanduk sama yang di pipinya itu kaya keong": ukel mahkota (dibaca host sebagai tanduk) dan pilin pipi berbentuk pilin bulat rapat seperti cangkang keong. Yang diminta: bentuk lain yang tidak bulat memilin. Mahkota diganti tanduk sungguhan yang melengkung runcing dan beralur; pipi diganti sumping/jambang api: helai lancip bergerigi yang menyapu ke luar-belakang seperti lidah api, paling-paling ujungnya sedikit mengait, tanpa pilin bulat.

Rekaman video sapuan (tur `kayon`) yang sedang berjalan dihentikan karena memakai desain yang baru dikritik; direkam ulang sesudah revisi ini.

**Arahan host 13 Nov sore berikutnya (dikirim saat api geni sedang disetel), kata demi kata, disertai foto acuan ketiga:** "khas wayang nya bener bener hilang, remodel. kaya refrensi". Foto acuan: sebuah gunungan wayang kulit sungguhan. Badan atasnya lidah-lidah api merah jambu-magenta yang menjulang ke pucuk, penuh tatahan tembus dan garis prada, dengan inti api jingga-kuning di tengah. Di tengah atas ada kala kecil berwajah merah jambu dengan rambut hitam, bertaring. Di kiri-kanan bahu ada sepasang kepala garuda merah jambu berjambul, paruh menganga, dengan sayap lar emas berlapis di tepi luar. Di bawah ada wajah barong besar kuning keemasan: mata bulat melotot berpupil hitam, hidung besar, mulut merah lebar menyeringai dengan deret gigi putih, janggut atau lidah ungu, dua tangan bercakar di kiri-kanan, dan dikelilingi lidah api hitam bertepi kuning. Gapit (tangkai) terlihat naik di tengah.

Tafsir Claude (belum ditegaskan host): muka Murka versi kelima dan keenam (gaya vektor: sisik api rapi, tanduk, kipas helai) kehilangan ciri wayang kulit, jadi muka Murka **dirombak total mengikuti susunan foto ketiga ini**. Cirinya ditiru lewat cara menggambar wayang kulit: tatahan tembus yang rapat (bubukan, seritan, mas-masan), sunggingan bertingkat (warna berjenjang dari gelap ke terang dengan garis tinta halus), dan prada di tepi. Susunannya: lidah api merah jambu menjulang, kala kecil di atas, sepasang garuda dan lar di bahu, barong kuning bertangan di bawah dengan api hitam bertepi kuning. Arahan sebelumnya tetap berlaku: seram (bukan badut), tidak ada pilin bulat seperti keong. Siluet lembaran tidak diubah, karena dipakai bersama muka Agung. Penyetelan api geni (shader) tetap dipakai dan diuji ulang di gambar baru.

**Arahan host 13 Nov sore berikutnya (sesudah melihat muka Murka bergaya wayang), kata demi kata:** "revisi garuda nya dong, ga serem malah kaya bangau". Tafsir Claude: sepasang garuda di bahu terbaca sebagai bangau karena paruhnya panjang lurus, kepalanya kecil, dan matanya bulat polos. Yang dibuat: garuda wayang yang garang. Kepalanya besar dan berat, paruh pendek tebal bengkok seperti rajawali, mulut menganga lebar dengan gusi merah, deret taring tak rata, dan lidah. Alis tebal menaungi mata melotot yang miring, jamang dan sumping prada, jambul api yang berdiri, dan sisik atau bulu di pipi. Bagian lain muka Murka tidak diubah.

**Susulan host (dikirim saat garuda baru sedang digambar), kata demi kata:** "nih referensi", disertai dua foto topeng garuda Bali (tampak samping). Isi fotonya: kepala hijau (foto kedua abu kehijauan), moncong panjang dengan ujung paruh emas yang mengait, mulut menganga sangat lebar dengan rongga merah-jingga, deret gigi putih bulat di kedua rahang, taring panjang di belakang, lidah merah jambu menjulur; mata bulat besar melotot (putih, cincin jingga dan merah, pupil hitam); pita hitam bergaris putih halus di sepanjang rahang; telinga runcing dengan sumping emas yang menggantung; tanduk emas kecil di dahi; dan mahkota (gelungan) emas berukir tembus berlatar merah dengan permata merah dan hijau di belakang kepala. Garuda digambar ulang mengikuti foto ini, menghadap ke dalam seperti di foto gunungan. Host lalu menegaskan: "ikuti garuda seperti foto yang saya kirim".

**Tanggapan host atas garuda versi pertama yang mengikuti foto, kata demi kata:** "kayak tokek jir, jelek giginya kenap gitu". Tafsir Claude: kepala hijau rata berpita warna dengan moncong lurus panjang terbaca sebagai kadal (tokek), dan gigi bulat telur yang lepas-lepas terlihat jelek. Yang diubah: paruh atas melengkung dan mengait tajam ke bawah seperti rajawali dengan ujung emas besar, warna kepala bervolume (tidak bergaris), ukiran emas di pipi dan alis, rongga mata hitam, dan deret gigi runcing yang rapat menempel di gusi merah, dengan taring panjang di atas dan di bawah.

**Arahan host berikutnya (dikirim saat garuda versi paruh bengkok sedang digambar), kata demi kata:** "baut lebih serem, lidah tajam, gigi tidak beraturan, muka monster, mahkota mewah". Yang dibuat: gigi dengan panjang, lebar, dan kemiringan acak (ada yang renggang, ada taring tambahan); lidah panjang meruncing dan bercabang tajam; muka monster (kulit hijau gelap, mata merah berurat dengan pupil celah, alis berat, duri emas di punggung paruh, kerut di moncong, tanduk lebih besar); mahkota mewah (jamang bertingkat dengan kelopak emas tinggi berlapis enamel merah, puncak berpermata, permata besar bersetting emas, dan lingkaran lidah api emas di tepi gelungan).

### Revisi rupa (13 Nov)

| Langkah | Isi | Status |
|---|---|---|
| 1 | Kedua muka digambar ulang mengikuti foto kayon gapuran (siluet berbahu, bidang merah penuh lung prada, pohon hayat dililit naga, gapura, lar, penjaga) | **selesai**, sudah dilihat hasil panggang dan di panggung |
| 2 | Kepala "merak" (makara) menelan atap pendapa, dibuat seram | **selesai** (belum ada tanggapan host atas versi seramnya) |
| 3 | Cahaya shader diturunkan (lampu dalang, kilap prada, pendar blencong) karena gambar baru jauh lebih terang dari renda lama | **selesai** |
| 4 | Muka Murka: wajah barong penuh (versi 1–6, gaya vektor) | **diganti** oleh langkah 6; versi 1–2 ditolak ("kaya badut", "kaya kentang"), versi 5 ditolak ("kebakar masih kurang", tanduk dan pipi "kaya keong") |
| 5 | Api geni lebih hebat (shader) | **selesai**: kulit hangus dengan retakan bara, lidah api hidup di atas garis bakar sampai keluar pucuk, percikan bara, tokoh tidak terbakar (`KAYON.spare`), kadar puncak `GENI.peak` 0,56 |
| 6 | Muka Murka bergaya wayang mengikuti foto gunungan (arahan "khas wayang nya bener bener hilang") | **selesai**, menunggu tanggapan host |
| 7 | Garuda mengikuti foto topeng garuda Bali (arahan "kaya bangau", "kayak tokek", "lebih serem ... mahkota mewah") | **selesai**, menunggu tanggapan host |
| 8 | Video sapuan kedua muka ke host | **selesai**: tur `kayon` (desktop 1920×1080, 60 fps, 13,7 dtk, tier High) dikirim 13 Nov malam; frame-frame sapuan mundur sudah dicek (muka Murka terbakar, tokoh utuh) |

**Muka Murka sekarang (13 Nov malam), yang dibuat.** Di `scripts/assets/gunungan-paint.js`, bagian "RUPA MURKA", digambar dengan cara wayang kulit (tatahan tembus, sunggingan berjenjang lewat `band()`, cawi, drenjeman, prada):
- Lidah api merah jambu bertatah (`lidah()`) menjulang ke pucuk dan condong ke sumbu, dengan inti api jingga di tengah; dasar merah anggur bertatah bubukan.
- Kala kecil di tengah atas: rambut gimbal hitam bertepi kuning, wajah merah jambu, mata thelengan, taring.
- Sepasang garuda menghadap ke dalam, mengikuti foto topeng garuda Bali: kepala hijau gelap, paruh bengkok berujung emas, mulut menganga dengan gigi tak beraturan dan banyak taring, lidah tajam bercabang, mata merah berurat berpupil celah, kumis hitam bergaris putih, duri dan tanduk emas, telinga runcing bersumping emas, gelungan merah berukir kelopak emas dengan permata dan lingkar lidah api emas, serta jamang bertingkat berenamel merah. Di belakangnya lar (sayap) emas berlapis.
- Barong kuning di bawah (mata di `KY` 1440, `KAYON.eyes` [0,4343, 0,306] dan [0,5657, 0,306]): mahkota api, wajah bersungging kuning ke merah, mata thelengan bercincin merah dengan pupil tembus (tempat bara 3D), hidung besar, mulut lebar menyeringai dengan gigi runcing dan taring, janggut ungu, dan tangan bercakar yang keluar dari api hitam bertepi kuning.
- Gapit naik di tengah lembaran, seperti di foto.
- Api geni tidak membakar barong, kala, dan kedua garuda (`KAYON.spare`, empat elips).
- Muka Agung tidak berubah.

**Rancangan yang dipilih (12 Nov; rupanya diganti arahan 13 Nov di atas, susunan dua mukanya tetap).** Satu lembaran gunungan bermuka dua:
- muka **Agung** (baru): bingkai dan panel dasar nila, pohon hayat utuh, medali surya-padma berlubang (cahaya tembus di sela kelopak), sepasang merak, naga, banteng dan macan, gapura dan dua raksasa penjaga. Tanpa wajah kala besar dan tanpa gigi api.
- muka **Murka**: gambar yang disetujui host 8 Nov (kala/banaspati), dengan pupil bara di lubang mata dan **sisi geni** (api + wajah iblis) yang menjalar dari bawah lewat shader.
- Maju ke bab berikutnya memperlihatkan muka Agung; mundur memperlihatkan baliknya, muka Murka yang membara di kaki.

**Yang sudah ditulis.**
- `scripts/assets/gunungan-paint.js`: pelukis kanvas (salinan bagian gambar `prototypes/gunungan/scene.js` + rupa Agung). Prototipe acuan tidak diubah.
- `scripts/assets/bake-gunungan.cjs`: menjalankan pelukis di Chromium dan menulis tekstur ke `public/film/gunungan/` (9 berkas WebP, 2,7 MB; satu perangkat hanya mengunduh 5 di antaranya, ±1,2 MB di Medium/Low dan ±1,6 MB di High). Per rupa: warna + alpha lubang, dan `aux` (R prada, G bagian menyala, B tinggi relief). Jalankan ulang skrip ini tiap gambar diubah, lalu commit hasilnya. **Gambar Agung sudah dilihat** (hasil panggang, bukan di panggung) dan tampak benar.
- `src/engine/stage/gunungan.ts` (murni): ukuran lembaran, tabir (`VEIL`), batas gerak (`SWEEP`), `sweepPose(p, dir, aspect, t)`, jendela teks (`SWEEP_TEXT`). `p` adalah kemajuan yang **sudah di-ease** (`Timeline.progress()`).
- `src/components/film/stage3d/gunungan.ts`: lembaran (satu draw call) + tabir gelap berpendar blencong (satu draw call), nol saat tidak menyapu. Di shader: lubang tembus dan berdinding setebal kulit, relief dari peta tinggi, prada mengilap mengikuti lampu yang bergeser dengan kursor, kulit tembus cahaya, kulit melentur saat disapukan, tangkai tanduk, pupil kala, api geni. Diletakkan langsung di ruang kamera, jadi tidak terpengaruh potongan kamera di tengah sapuan.
- `src/engine/stage/bus.ts`: `setKayon`, `kayon`, `claimSweep`, `sweep`. `planTransition` (`src/components/film/transitions.ts`) mengklaim sapuan 3D bila `data-stage="on"` dan tekstur sudah siap; kalau belum, bayangan kayon DOM (`.fl-wipe`) tetap dipakai seperti sebelumnya. Pada sapuan 3D teks lama dipudarkan lebih awal dan teks baru dimunculkan lebih lambat, karena teks ada di atas kanvas dan tidak tertutup tabir.
- `src/components/film/stage3d/runtime.ts`: gunungan dibuat dan diperbarui tiap frame; `window.__lakonStage.kayon` (tekstur siap) dan `.sweep` (sedang menyapu).

**Hasil tes dan kendala.**
- `pnpm typecheck`, `pnpm lint`, `pnpm test` (294 tes; 13 di `tests/unit/gunungan.test.ts`: elips tokoh yang tidak terbakar, kurva `murkaRage`, jangkauan api) dan `pnpm build` lulus (13 Nov malam, sesudah garuda versi terakhir). Tiga tes e2e baru untuk sapuan 3D di `e2e/stage.spec.ts` sudah ditulis tetapi **belum dijalankan**. `pnpm test:e2e` **belum dijalankan** sejak gunungan ditulis.
- Beban di panggung saat gunungan tampil (tier High, Chromium tanpa GPU): 24 draw call, ±52 ribu segitiga, kerja CPU per frame 1–3 ms. Tekstur Murka sedikit lebih besar karena api yang rapat (2000 px: 573 KB, sebelumnya 485 KB).
- Shader gunungan sudah jalan di Chromium (tanpa GPU): arah muka, letak, lubang tembus, dan geni benar di tangkapan layar desktop dan iPhone tiruan.
- Tes e2e sapuan kayon yang lama mungkin gagal bila mengandalkan `.fl-wipe` saat 3D hidup (belum dicek).
- Beban belum diukur. Perkiraan memori tekstur: ±23 MB di Medium/Low, ±41 MB di High. Perlu dicek di HP host dengan `/film/?fps`.
- `scripts/assets/gunungan-paint.js` dikecualikan dari lint (`eslint-disable`, kode gambar padat salinan prototipe).

**Langkah berikutnya, urut.**
1. ~~Lihat sapuan di layar~~ sudah (13 Nov): desktop dan HP tegak, maju dan mundur. Alat: `window.__lakonStage.sweepAt = [p, arah, geni]` menahan gunungan di satu titik sapuan.
2. ~~Muka Murka baru~~ sudah: bergaya wayang dengan garuda mengikuti foto (`6f0e9db`); tunggu tanggapan host atas gambarnya.
3. ~~Tes unit `gunungan.ts`~~ sudah (10 tes); e2e sapuan belum disesuaikan.
3b. ~~Video pratinjau sapuan (kedua muka) ke host~~ sudah (13 Nov malam). Perekamnya: `STAGE=high node scripts/preview/record-film.cjs <data.json> <keluaran.mp4> desktop 0.02 kayon` (±12 menit).
4. Gerbang pembuka: gunungan ditancapkan di depan blencong saat film dibuka, lalu disibak ke prolog; klik membaliknya ke muka Murka. Video ke host.
5. Catat di `docs/design/decisions.md`, centang di `CLAUDE.md`.
6. Sesudah gunungan: "Utang gong" di bawah (tes unit, e2e penuh sekali, cek bingkai, video gong ditabuh).

### Tugas 6: kemajuan (12 Nov sore)

**Arahan host di sesi ini, kata demi kata, urut:**
1. "baca tugas di handoff.md / remodel/redesign gong kan? kerjakan. / preview panggung 3D belum?"
2. "update handoff.md lalu preview gong nya, pas di tabuh juga. (output)" (dikirim saat langkah 2 sedang dites). Artinya: berkas ini diperbarui dulu, lalu video pratinjau gong yang juga memperlihatkan gong ditabuh. Jadi pukulan (langkah 3) dikerjakan sekarang, sebelum video direkam.

3. "cek handoff.md, tugasmu yang ini; Sedang menulis langkah 3 (pukulan): pemicu dari tombol dan otomatis saat tiba di slide gong, ayunan tabuh dan gong, retakan bara, riak, bunga api, napas api naga, dan bunyi. sudah selesai?" (sesi baru sesudah `/clear`, 12 Nov malam). Jawabannya: belum. Saat sesi sebelumnya terputus, yang sudah tertulis (belum di-commit) baru bagian murni: `src/engine/stage/bus.ts`, `createStrikes` dan `gongSpot` di `src/engine/stage/gong.ts`, `projectPoint` di `shots.ts`, dan `audioStatus.scene` di `src/engine/audio/status.ts`. Model 3D, tombol, dan pemicu otomatis belum tersambung. Langkah 3 dilanjutkan di sesi ini.

4. "setelah sudah (output previews gong) lewati keris dan batara kala, lanjut langsung ke gunungan. (priority max) catat ini di handoff.md" (dikirim saat langkah 3 sedang dites, 12 Nov malam). Artinya: sesudah video pratinjau gong (termasuk saat ditabuh) dikirim, **langkah 5 (Batara Kala dan keris) dilewati** dan pekerjaan langsung pindah ke **Tugas 7, gunungan, prioritas tertinggi**. Ini mengganti keputusan 12 Nov "Batara Kala dan keris ikut Tugas 6". Tafsir Claude (belum ditegaskan host): langkah 4 (kepingan bara berkumpul menjadi gong di prolog) ikut ditunda, karena host bilang "lanjut langsung ke gunungan"; kalau host tetap menginginkannya, dikerjakan sesudah gunungan.

5. "cek di handoff.md / tugasmu yang: Audit host 8 Nov mengunci 'kamera diam saat gong dipukul', jadi getar dan hentakan yang baru saya tambahkan saya cabut. Bingkai slide gong saya lebarkan agar kedua api naga tetap terlihat tanpa menggerakkan kamera. (pasang aja, asal lebih smooth dari yang kemarin)" (sesi baru sesudah `/clear`, 12 Nov malam). Artinya: **getar dan hentakan kamera saat gong dipukul dipasang lagi**, dengan syarat lebih halus dari yang lama. Ini mengganti keputusan audit 8 Nov "kamera diam, tanpa getar" khusus untuk pukulan gong. Tafsir Claude (belum ditegaskan host): bingkai lebar slide gong tetap dipakai, karena tanpa itu api kedua naga terpotong; yang berubah hanya kameranya ikut terhentak.

6. "dan tugasmu yang: Suite e2e yang sedang berjalan masih memakai build sebelum bingkai kamera diubah, jadi saya hentikan, build ulang, cek gambar bingkai barunya, baru jalankan e2e penuh sekali di akhir. (sudah?)" (menyusul, sesi yang sama). Jawabannya dari jejak di disk: **build ulang sudah** (`out/` bertanggal 16.21, sesudah perubahan sumber terakhir 16.20); **cek gambar bingkai baru dan e2e penuh belum** (`test-results/` hanya berisi sisa suite yang dihentikan 16.20, tidak ada jalan sesudah build). Keduanya dikerjakan di sesi ini, sesudah getar dan hentakan kamera dipasang, supaya e2e penuh cukup sekali.

7. "lewati tes unit dan e2e (tapi beri catatan di handoff), selesaikan setelah gunungan. kerjakan gunungan terlebih dahulu." (menyusul, saat tes unit hentakan kamera baru dijalankan). Artinya: **tes unit dan e2e gong ditunda sampai gunungan selesai**, dan **Tugas 7 (gunungan) dikerjakan sekarang**. Utang tesnya dicatat di "Utang gong" di bawah; jangan dianggap sudah lulus.

8. "redesign/remodel/upgrade ke duanya. jangan yang "murka "aja" (menyusul, saat Tugas 7 baru dimulai; jawaban atas laporan Claude bahwa gambar gunungan "Murka" dipanggang jadi tekstur untuk sapuan antar bab dan gerbang pembuka). Tafsir Claude (belum ditegaskan host; dipilih yang paling luas supaya tidak ada yang terlewat): (a) **sapuan antar bab dan gerbang pembuka dua-duanya dirancang ulang dan ditingkatkan**, bukan hanya ditempeli gambar lama; (b) **gunungannya tidak hanya berwajah "Murka"**: dibuat rupa kedua yang tenang dan agung, dan kedua sisi ditingkatkan (relief tatahan, kulit tembus cahaya, api yang hidup). Rincian rancangannya di "Tugas 7: kemajuan" di bawah.

| Langkah | Isi | Status |
|---|---|---|
| 1 | Mesin murni + tes unit | **selesai** |
| 2 | Badan gong, gayor, naga, tabuh di panggung | **selesai**, sudah di-commit (`e3cacd5`) |
| 3 | Pukulan (otomatis saat tiba di slide gong + klik, tap, Enter), efek, bunyi, hentakan kamera | **kode tertulis dan di-commit; tes dan video ditunda atas arahan host** (lihat "Utang gong") |
| 4 | Momen prolog: kepingan bara berkumpul menjadi gong | ditunda (sesudah gunungan, bila host masih mau) |
| 5 | Batara Kala dan keris di puncak gayor | **dilewati** atas arahan host |
| 6 | Ukur, dokumen, PR saat host meminta | sebagian (lihat di bawah) |

**Arahan host 13 Nov malam (sesudah gambar muka Murka gaya wayang dan garuda dikirim), kata demi kata:** "sudah, gong agung kemarin belum di test ya? sama test e2e? kalau belum test sekalian. baca handoff.md harusnya ada". Tafsir Claude: "sudah" = rupa gunungan (muka Murka gaya wayang dan garuda) diterima; sekarang **utang gong di bawah dilunasi**: tes unit gong, e2e penuh sekali (termasuk tiga tes e2e gunungan yang baru), cek gambar bingkai slide gong, video gong ditabuh, dan ukur beban.

**Pertanyaan host 13 Nov malam (sesudah video sapuan gunungan dikirim), kata demi kata:** "loh itu gunungan buat kayon? bukan buat setelah/sebelum film?". Jawaban dari catatan: Tugas 7 di `CLAUDE.md` berbunyi "Gunungan sebagai gerbang sinematik dan sapuan antar bab", jadi rencananya dua-duanya. Yang sudah jadi baru sapuan antar bab; gerbang pembuka (sebelum film) belum dikerjakan, dan penutup (sesudah film) belum ada di rencana. Ditanyakan ke host mana yang dipakai (kotak pertanyaan ditolak host; dijawab di chat).

**Susulan host, kata demi kata:** "terus yang ini buat apa?", disertai tangkapan layar adegan gunungan di gedebog dengan blencong dan bayangan di kelir. Jawaban: itu `prototypes/gunungan/scene.js`, prototipe adegan gunungan dari tahap desain (disetujui 8 Nov, `docs/design/decisions.md` bagian "Gunungan v3 Murka"). Prototipe itu hanya acuan rupa dan gerak; tidak dipakai di film produksi. Rencana "gerbang pembuka" di Tugas 7 justru adegan seperti itu di panggung film (gunungan ditancapkan di depan blencong saat film dibuka, lalu disibak ke prolog), dan belum dibuat.

**Susulan host, kata demi kata:** "ini? katanya matanya bisa ngikut in kursor, ini adegan/fase apa?", disertai tangkapan layar prototipe yang sama (tulisan "GERAKKAN KURSOR · MATANYA MENGIKUTIMU · KLIK GUNUNGAN = SISI API"). Jawaban: itu halaman pratinjau prototipe "Gunungan v3 Murka" dari Fase 0 (checkpoint 0, persetujuan desain sebelum web dibangun; `prototypes/README.md`, Tugas 2), bukan adegan film. Di sana pupil kala mengikuti kursor dan klik membalik ke sisi geni. Di film, sebagian sudah terbawa (pupil bara di mata barong melirik mengikuti kursor dan lampu dalang bergeser saat sapuan), tetapi adegan interaktifnya baru akan masuk lewat gerbang pembuka Tugas 7, yang belum dibuat. Masih menunggu jawaban host: gunungan dipakai di pembuka, penutup, dan/atau sapuan antar bab.

**Keputusan host 13 Nov malam, kata demi kata:** "pembuka dan penutupan saja, sapuanya pakai yang lama". Artinya:
- **Sapuan antar bab kembali ke bayangan kayon DOM yang lama** (`.fl-wipe`), juga saat panggung 3D hidup. Gunungan 3D tidak lagi menyapu antar bab.
- **Gunungan 3D dipakai untuk pembuka dan penutup film**: pembuka = gerbang sebelum prolog (adegan seperti prototipe: gunungan di depan blencong, bayangan di kelir, mata mengikuti kursor, klik membalik ke muka Murka, lalu disibak ke prolog); penutup = gunungan ditancapkan lagi sesudah film (tancep kayon). Rupa dua mukanya yang sudah diterima tetap dipakai.

**Utang gong (arahan host no. 7), dilunasi 13 Nov malam atas arahan "kalau belum test sekalian":**
- **Tes unit:** `tests/unit/gong.test.ts` **31/31 lulus**, termasuk tes hentakan kamera yang dulu gagal (sesudah `KICK.backDecay` 0,22) dan satu tes baru (hentakan habis tepat nol sesudah `KICK.end`). `pnpm test` penuh: 294 lulus.
- **Bug yang ditemukan e2e dan diperbaiki:** hentakan kamera meluruh eksponensial tanpa pernah tepat nol, jadi panggung terus menghitung transformasi kamera (sesudah 15 dtk masih 7,7e-22). Sekarang `cameraKick` mengembalikan nol sesudah `KICK.end` = 2,5 dtk; potongannya < 0,01 piksel (`e3be5fb`).
- **e2e:** suite penuh pertama (sebelum perbaikan): 207 lulus, 13 dilewati (sama dengan sebelumnya), 2 gagal (tes hentakan kamera baru, desktop dan iPhone, karena bug di atas). Sesudah perbaikan, kelompok "gong ageng 3D" **16/16 lulus** (desktop + iPhone). Tes baru: hentakan kamera di `e2e/stage.spec.ts`. Suite penuh kedua (sesudah perbaikan dan pengembalian sapuan) sedang berjalan.
- **Gambar bingkai baru slide gong:** sudah dicek di video: seluruh gayor, kedua naga, dan semburan apinya masuk layar; teks penutup hari di bawah gong.
- **Video gong ditabuh:** direkam (tur `gong`, desktop 1920×1080, 60 fps) lalu dipotong ke bagian gong saja (11,4 dtk, dari tiba di slide gong sampai pukulan kedua dengan klik), karena lompatan bab di rekaman masih memakai gunungan 3D yang sesudahnya dikembalikan ke kayon lama. Dikirim ke host 13 Nov malam.
- `scripts/preview/measure-stage.cjs`: belum dijalankan ulang (sesudah e2e). Belum diuji di perangkat nyata.

**Pertanyaan host 13 Nov malam, kata demi kata:** "tunggu, di fase gong itu kan 3D ya? bisa di zoom out/in? perspective shift, scroll driven depth, kamera parallax nya gimana?". Jawaban dari kode (`stage3d/runtime.ts`, `engine/stage/shots.ts`): tiap slide punya satu shot kamera (slide gong: `GONG_SHOT`, orbit tetap, lensa 32°); perpindahan antar slide menggerakkan kamera mengikuti kemajuan transisi (di HP mengikuti jari saat digeser; roda mouse/trackpad per langkah); parallax hanya mengikuti kursor mouse (geser kecil kamera, perspektif sungguhan) plus napas pelan; di HP tidak ada parallax selain napas; zoom in/out (cubit atau roda) tidak ada; satu-satunya gerak maju-mundur di slide gong adalah hentakan saat gong dipukul. Ditawarkan ke host sebagai pilihan, belum dikerjakan.

**Jawaban host, kata demi kata:** "semua". Jadi keempat pilihan dikerjakan, khusus slide gong saat panggung 3D hidup kecuali disebut lain:
1. **Zoom**: cubit di HP, Ctrl+roda / cubit trackpad di laptop; kamera maju mendekati gong dan mundur, dengan batas.
2. **Kedalaman ikut gulir**: gulir maju pertama mendorong kamera mendekat ke gong, gulir maju berikutnya baru pindah slide; gulir mundur saat dekat mundur dulu ke bidikan biasa.
3. **Parallax HP dari kemiringan (giroskop)**: kamera bergeser saat HP dimiringkan (semua slide 3D, seperti parallax kursor); di iPhone izin diminta sekali.
4. **Parallax lebih terasa**: geseran kursor diperbesar dan kamera ikut sedikit memutar (semua slide 3D).

**Arahan host berikutnya (menyusul "semua"), kata demi kata:** "pastikan di setiap objek 3D (semua), harus ada semuanya itu. bahkan di film 2,5D juga harus ada; perspective shift, scroll driven depth, kamera parallax. catat di handoff.md".

**ATURAN TETAP (berlaku untuk semua objek 3D yang sudah ada dan yang akan dibuat di Tugas 7–12, dan untuk film 2,5D):** setiap objek atau slide harus punya
- **kamera parallax**: kamera (3D) atau lapisan (2,5D) bergeser mengikuti kursor di desktop dan kemiringan HP (giroskop) di HP;
- **perspective shift**: geseran itu mengubah perspektif sungguhan, bukan hanya menggeser gambar: kamera sedikit memutar mengitari objeknya (3D), lapisan dekat bergeser lebih jauh dari lapisan jauh dan bidang miring ringan (2,5D);
- **scroll-driven depth**: kedalaman mengikuti gulir: saat menggulir, kamera (3D) atau lapisan (2,5D) bergerak maju-mundur dalam kedalaman mengikuti kemajuan gulir (di HP mengikuti jari).
Plus untuk gong (pilihan 1 dan 2 di atas): zoom cubit/Ctrl+roda dan dua tahap gulir (dekat dulu, baru pindah slide).

Tafsir Claude atas "scroll-driven depth" untuk slide selain gong (belum ditegaskan host): kedalaman mengikuti kemajuan gulir di dalam perpindahan slide, bukan menambah satu langkah gulir di setiap slide, karena itu menggandakan jumlah gulir sepanjang film dan melanggar FR-20a ("satu event roda = tepat satu slide", dijaga e2e). Dua tahap gulir hanya di slide gong, sesuai pilihan 2 yang diminta host.

**Gerak pandang: yang sudah dibuat (13 Nov malam).**
- `src/engine/motion/view.ts` (murni, 10 tes di `tests/unit/view.test.ts`): `VIEW` (besar geseran, lirikan, kemiringan HP, dorongan kedalaman, geseran lapisan 2,5D), `scrollDepth(p)`, `tiltLook`/`recenterBase` (kemiringan HP relatif terhadap cara memegang, ikut putaran layar), `GONG_ZOOM`, `gongStep` (dua tahap gulir), `zoomByWheel`, `zoomByPinch`.
- `src/components/film/look.ts`: satu sumber arah pandang untuk 3D dan 2,5D (kursor mouse; giroskop di HP, izin iPhone diminta sekali dari sentuhan pertama; reduced motion = diam; getar tangan diabaikan supaya panggung bisa istirahat).
- **3D, semua slide** (`stage3d/runtime.ts`): kamera bergeser `VIEW.shiftX/Y` lalu memandang ulang objeknya (perspective shift), dan maju `scrollDepth(p)` × jarak di tengah perpindahan slide (mengikuti gulir; di HP mengikuti jari).
- **Gong** (`bus.ts`, `input.ts`, `director.ts`, `runtime.ts`): Ctrl+roda / cubit trackpad, cubit dua jari, tombol + dan −; gulir maju pertama mendekat (roda dan geser jari; panah keyboard tetap per slide); mundur saat dekat menjauh dulu. Saat dekat titik bidik berpindah ke pusat gong; bidang sentuh tombol pukul mengikuti gong tiap frame; teks penutup hari memudar (`--gong-zoom`); di slide itu cubit tidak menjadi zoom halaman (`data-gongzoom` → `touch-action: none`, `gesturestart` dicegah). Di slide gong 3D jari tidak men-scrub: tiap geser dinilai saat dilepas.
- **2,5D** (`Film.tsx`, `film.css`, `transitions.ts`): `--lx/--ly` menggeser langit (berlawanan, sedikit), bukit (lebih jauh), dan isi slide (searah, bidang teks memutar ±2,4°); transisi slide dan kayon memakai `scale` sebagai kedalaman ikut gulir. Calm = diam.
- Tangkapan layar sudah dicek: gong biasa, kursor kanan/kiri-bawah, gulir pertama (dekat), tombol −, gulir mundur (jauh); 2,5D kursor kiri/kanan dan tengah transisi (lapisan lama ×1,044, baru ×0,95).
- e2e baru di `e2e/stage.spec.ts`: dua tahap gulir gong, zoom +/−/Ctrl+roda, parallax kamera 3D, parallax dan kedalaman 2,5D.
- **Tes:** `pnpm test` 304 lulus; typecheck dan lint lulus. e2e penuh dengan gerak pandang dijalankan, lalu **dihentikan di tes ke-81 dari 222** supaya video bisa direkam (perekam butuh CPU sendirian). Sampai titik itu dua gagal, keduanya sudah diperbaiki dan dijalankan ulang: (1) `film.spec` "Calm: gallery datar": `scale` di wadah langit ikut menggeser bukit 19 px dalam Calm, sekarang hanya lapisan warna langit yang bergeser (24/24 tes gallery dan Calm lulus); (2) `stage.spec` "dua tahap gulir": lulus sendiri, gagal hanya di bawah beban penuh karena jeda roda 300 ms, diperlonggar jadi 700 ms. Tes gerak pandang 4/4 lulus (2 dilewati di iPhone: tes kursor). **e2e penuh belum dijalankan ulang sampai habis** sesudah perbaikan ini.
- **Video dikirim ke host (13 Nov malam):** tur `kamera` (gong 3D, desktop 1920×1080, 60 fps, 36,9 dtk, `STAGE=high`, K 0,04) dan tur `datar` (film 2,5D, `STAGE=static`, 28,5 dtk). Frame keduanya sudah dicek. Sesuai arahan host, **sesudah video dikirim pekerjaan berhenti dan menunggu perintah host**.

**Arahan host 13 Nov malam, kata demi kata:** "buatkan pr tugas semua sesi ini, aku ingin merge". Yang dikerjakan: jalankan semua cek (lint, typecheck, test, content:check, build, e2e penuh sampai habis), pastikan tanpa konflik dengan `main`, perbarui `CLAUDE.md` dan `HANDOFF.md`, lalu buka PR siap **Squash and merge** berisi semua pekerjaan sejak PR #7 (gong 3D, gunungan, gerak pandang). Host sendiri yang menekan merge.
- Belum: uji di HP sungguhan (giroskop, cubit), ukur beban (`measure-stage.cjs` sempat berhenti karena batas waktu).

**Arahan host 13 Nov malam, kata demi kata:** "mana videonya? kirim preview nya, fitur 3d gong sama film nya. habis itu setelah di kirim, tunggu perintahku lagi". Artinya: kirim video pratinjau fitur gerak pandang di gong 3D (tur `kamera`) dan di film (2,5D), lalu **berhenti dan menunggu perintah host** (jangan memulai pekerjaan baru).

**Hentakan dan getar kamera (arahan host no. 5), yang ditulis.** `cameraKick`, `KICK`, `kickSize` di `src/engine/stage/gong.ts` (murni); dijumlahkan per hantaman di `createStrikes().at()` (`kick`); dipasang ke kamera di `src/components/film/stage3d/runtime.ts` sesudah napas dan parallax. Angkanya: mundur ±0,9% jarak dalam ±0,08 dtk lalu berayun balik sekali; getar 3,6–4,8 Hz, paling jauh ±0,6% tinggi layar, habis ±1,5 dtk; mulai dari nol tanpa sentakan. Sekalian: hantaman lama sekarang dilupakan sesudah 12 dtk (dulu hanya 3 hantaman terakhir yang dihitung, sehingga pukulan keempat beruntun menggeser gong ±1 cm). Rinciannya di `docs/design/decisions.md` bagian "Gong ageng 3D di panggung".

**Yang selesai (langkah 1–2).**
- `src/engine/stage/gong.ts` (murni): ukuran rakitan, profil badan gong, garis waktu pukulan (sikap tabuh per saat), ayunan bandul, dengung, panas bara, kilatan, riak, napas api, denyut jantung.
- `src/components/film/stage3d/gong.ts`: badan perunggu tempa (bekas tempa, garis bubut, patina, pencu mengilap, jantung bara berdenyut), gayor berlak merah dengan ukiran prada, dua naga bersisik dengan rahang menganga, tali dan cincin gantungan, tabuh yang digantung di cantolan tiang kanan. **Tiga draw call, tanpa tekstur.** Bahan dibedakan di shader lewat atribut `aTag`.
- Bayangan gong dan gayor di lantai dihitung di shader lantai (`GONG_SHADOW`, dipakai `pendapa.ts`), tanpa shadow map.
- Saat 3D hidup: cakram gong CSS (prolog dan slide penutup hari) tidak digambar; tombol pukul tetap ada sebagai bidang sentuh di atas gong; teks penutup hari turun ke bawah gong (`film.css`). Shot slide gong disetel ulang (`shots.ts`).
- Kamera pratinjau: `window.__lakonStage.cam = [x, y, z, lihatX, lihatY, lihatZ, fov]`.
- Perekam punya tur `gong` (`scripts/preview/record-film.cjs`).
- Keputusan desain dan beda dari prototipe: `docs/design/decisions.md` bagian "Gong ageng 3D di panggung".

**Hasil tes (langkah 1–2).**
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (260 tes; 15 baru di `tests/unit/gong.test.ts`), `pnpm build` lulus.
- `pnpm test:e2e`: 183 lulus, 13 dilewati (sama dengan sebelumnya). Empat tes e2e baru untuk gong di `e2e/stage.spec.ts` (× desktop dan iPhone = 8) lulus saat dijalankan sendiri; belum dijalankan bersama seluruh suite.
- Beban di prolog, tier High (dari overlay): 22 draw call, ±51,5 ribu segitiga (sebelum gong: 19 dan ±26 ribu). Saat kamera memandang lanskap, gong tidak digambar. `measure-stage.cjs` belum dijalankan ulang.
- Hanya dilihat di Chromium tanpa GPU (desktop 1280×720 dan iPhone tiruan). **Belum diuji di perangkat nyata**; HP host tidak punya banyak ruang di atas Medium, jadi perlu dicek dengan `/film/?fps` sesudah merge.

**Kendala dan catatan.**
- Blencong tergantung ±1,7 m dari naga kiri: naga itu dan ujung kiri palang sangat terang. Kilap lak sudah dibatasi; kalau masih mengganggu, pilihannya menggeser blencong (mengubah latar Tugas 5).
- Di HP tegak, gayor kecil di prolog dan judul menutup palang.
- Kepala naga dari sangat dekat masih kasar (bola-bola yang dipipihkan); dari jarak kamera film tidak terlihat.

**Langkah berikutnya.** Tugas 7 (gunungan), lalu kembali ke "Utang gong": `pnpm test`, build, cek gambar bingkai, e2e penuh sekali, video pratinjau gong saat ditabuh.

### Keadaan saat sesi ditutup (12 Nov, sesudah merge PR #7)

**Arahan host yang terakhir, kata demi kata, urut:**
1. "sudah merge, dan hasilnya stabil di medium, gada high nya ya? tapi oke sih. aku anggep udah selesai" (Tugas 5 diterima).
2. "beban hemat tapi jangan turunkan kualitas. tadi video preview juga ngeframe, record ulang yang biasanya pake slowmotion itu."
3. "catat di handoff dulu, planning mu. aku mau clear sesi ini"
4. "video=output, tunggu arahan ku dulu. pastikan sudah di catat di handoff"

5. "berikan video previews dulu, lalu output dan berhenti" (arahan sesudah sesi dilanjutkan, 12 Nov). Artinya: rekam ulang video pratinjau Tugas 5 sampai mulus dan kirim, laporkan hasilnya, lalu berhenti. Tugas 6 tetap belum boleh dimulai.

6. "baca tugas di handoff.md / remodel/redesign gong kan? kerjakan. / preview panggung 3D belum?" (sesi berikutnya, 12 Nov sore). Artinya: Tugas 6 boleh dimulai, dan host menanyakan video pratinjau panggung 3D. Rekaman ulang (`panggung3d-desktop-hd-v2.mp4`, 1920×1080, 60 fps, tier High, 38 dtk, K = 0,0125) ternyata sudah selesai direkam di sesi sebelumnya tetapi belum tercatat terkirim; dikirim ke host di chat saat itu juga. Isinya 35–58 gambar berbeda per detik saat bergerak (rekaman pertama 3–7).

**Yang berlaku sejak itu.**
- **Tunggu arahan host.** Sesi berikutnya tidak boleh langsung merekam atau mulai Tugas 6. Baca berkas ini, laporkan keadaannya, lalu tanyakan mana yang dikerjakan dulu.
- **Beban hemat, kualitas tidak turun.** Berlaku untuk semua isi 3D baru. Hemat lewat cara menggambar (sedikit draw call, tidak digambar saat di luar layar, gerak dihitung shader), bukan lewat menurunkan resolusi, MSAA, atau detail.
- **Video = output.** Tafsir Claude (belum ditegaskan host): hasil tiap tugas harus diserahkan sebagai video pratinjau yang mulus, bukan foto atau angka saja. Kalau tafsir ini penting untuk keputusan, tanyakan dulu.

**Belum ada kode Tugas 6 yang ditulis.** Yang dikerjakan sesudah merge hanya membaca prototipe gong dan satu percobaan perekam (di bawah). Working tree bersih; isi branch = `main` (`064fbdc`) + commit dokumen.

#### A. Rekam ulang video pratinjau Tugas 5 (diminta host, belum dikerjakan)

Video yang dikirim (`STAGE=high node scripts/preview/record-film.cjs <data> <keluaran.mp4> desktop 0.04 stage`, 1920×1080, 38 dtk) **patah-patah**. Sebabnya: Chromium di sesi ini menggambar WebGL di CPU, ±1,4 frame per detik di 1080p tier High (Medium 1,6; Low 720p 4,4). Selama satu frame 3D digambar, seluruh halaman ikut tertahan, jadi dengan K = 0,04 video hanya mendapat ±35 frame per detik yang tidak rata. Supaya tiap frame video 60 fps punya gambar baru, perlu K ≤ fps nyata ÷ 60.

Percobaan yang **gagal**, jangan diulang tanpa perubahan: waktu virtual Chrome (`Emulation.setVirtualTimePolicy` jeda/maju 16,7 ms per frame) + `Page.captureScreenshot` per frame. Jam halaman memang maju 16,7 ms per langkah, tetapi satu langkah memakan ±10 detik nyata, loop 3D tetap berjalan di waktu nyata (8–46 frame per langkah), dan transisi slide selesai dalam satu langkah, jadi geraknya tidak terekam. Penyebabnya belum dicari.

Pilihan untuk sesi berikutnya (belum dicoba, urut dari yang paling pasti):
1. Perekam yang sama dengan K lebih kecil, mesin dibiarkan sepi (tanpa build, tes, atau tangkapan layar lain selama merekam): `STAGE=high node scripts/preview/record-film.cjs <data> <keluaran.mp4> desktop 0.0125 stage`. Perkiraan ±50 menit untuk 38 dtk video. Adegan gallery siang kemungkinan lebih lambat dari 1,4 fps; kalau masih patah di sana, kecilkan K lagi atau pendekkan tur.
2. Tangkap per frame dengan kendali frame (`HeadlessExperimental.beginFrame`, Chromium dijalankan dengan `--enable-begin-frame-control --run-all-compositor-stages-before-draw`). Menjamin satu frame render per frame video dan tidak terganggu pekerjaan lain, tetapi belum pernah dicoba di repo ini.
3. Tanyakan host apakah video 1280×720 boleh (±3 kali lebih cepat digambar). Jangan diputuskan sendiri: host bilang kualitas jangan turun.

Data tiruan untuk perekam (jangan pakai data tamu asli): `filmFixture("guest", { breakfast: true })` dari `e2e/helpers.ts`, ditulis ke JSON di luar repo dengan `pnpm exec tsx`. Server: `pnpm build && node scripts/serve-out.mjs` (port 4173).

#### B. Rencana Tugas 6, gong ageng 3D (belum dimulai)

Acuan yang sudah disetujui host 8 Nov: `prototypes/gong/scene.js` ("Gong Murka" + Batara Kala; lihat `docs/design/decisions.md` bagian "Gong v3"). Prototipe memakai MeshStandardMaterial, tekstur kanvas, bayangan, dan 69 ribu segitiga untuk badan gong; itu terlalu berat dan tidak cocok dengan panggung produksi (semua material shader sendiri, tanpa tekstur, uniform bersama). Jadi bentuk dan perilakunya disalin, cara menggambarnya ditulis ulang.

Ukuran dan letak: prototipe ±2,5 m lebar (gong r 0,506 m di y 1,1; tiang gayor ±0,86; palang y 1,88; naga sampai x ±1,27). Shot kamera Tugas 5 dibuat untuk lebar 3,5 m dan pusat (0; 1,5; 0), jadi seluruh rakitan diskala ±1,35 kali.

Susunan berkas yang direncanakan:
- `src/engine/stage/gong.ts` (murni, dites): profil badan gong (titik `front` di prototipe baris 556–561), garis waktu pukulan (`IMPACT` 0,52 dtk, ancang-ancang 105°, pantulan 22°; baris 890–904), ayunan bandul (periode 1,6 dtk, luruh 2,6 dtk), dengung, panas bara, riak, denyut jantung (`beat`, baris 866).
- `src/engine/stage/bus.ts` (murni): pesan kecil dari DOM ke panggung ("pukul gong") supaya komponen film tidak mengimpor three.
- `src/components/film/stage3d/gong.ts`: badan gong (lathe, ±15 ribu segitiga di High, lebih sedikit di Low), gayor + kedua naga + tali + cincin digabung jadi **satu** jala dengan atribut jenis bahan (lak merah, prada, tulang, bara), tabuh, riak (satu bidang, cincin digambar shader), bunga api + napas api naga (satu Points, geraknya dihitung di vertex shader dari waktu pukulan).
- Perunggu: bekas tempa dan patina dari derau, garis bubut, pantulan langit + pantulan hangat dari arah blencong dan lantai (langit malam gelap, jadi tanpa itu gong tampak hitam), retakan bara yang menjalar dari pencu hanya saat dipukul, pencu berdenyut.
- Tambahan beban yang ditargetkan: ±5–7 draw call dan ±25 ribu segitiga, hanya saat gong di dalam layar (di shot vista gong ada di belakang kamera dan tidak digambar). Ukur dengan `scripts/preview/measure-stage.cjs`, lalu host cek lagi di HP dengan `/film/?fps`.

Pukulan:
- Satu pemicu untuk klik, tap, dan Enter: tombol DOM `.fs-strike` di slide gong (`GongClose` di `src/components/film/Slides.tsx`) tetap ada untuk screen reader dan keyboard. Saat 3D hidup tombol itu ditaruh tepat di atas gong di layar (letaknya dihitung dari proyeksi gong saat kamera tiba) dan gong CSS disembunyikan. Kanvas tetap `pointer-events: none`.
- Bunyi: `gong` dan `api-naga` sudah ada di `src/engine/audio/catalog.ts`. `audioStatus` (`src/engine/audio/status.ts`) sekarang hanya mengenal bunyi klik; perlu satu jalur untuk SFX adegan, tetap hening bila tamu mematikan suara.
- Efek: tabuh mengayun, gong terdorong lalu berayun, dengung, retakan bara, riak, bunga api, kedua naga menyembur api, kamera bergetar.

Urutan kerja yang direncanakan, tiap langkah dirender dan dicek dulu:
1. Mesin murni + tes unit.
2. Badan gong, gayor, naga, tabuh; cek di shot hero, judul hari, dan gong, desktop dan HP.
3. Pukulan + bunyi + tombol; e2e (klik, Enter, Calm tetap 2,5D, tanpa bunyi saat dimatikan).
4. Momen hero: kepingan bara berkumpul menjadi gong.
5. Batara Kala di puncak gayor.
6. Ukur, video pratinjau yang mulus, dokumen, lalu PR saat host meminta.

**Keputusan host atas tiga hal yang tadinya menunggu (12 Nov), kata demi kata:**
"point 1; ikut tugas 6, tapi per tugas output dulu. jadi step by step.
point 2; ya setuju. otomatis dan manual
point 3; paksa ke high."

Artinya:
1. **Batara Kala dan keris ikut Tugas 6**, tetapi dikerjakan bertahap: tiap langkah di "Urutan kerja" di atas ditutup dengan output (video pratinjau) ke host dulu, baru lanjut ke langkah berikutnya. Jangan mengerjakan seluruh Tugas 6 sekaligus.
2. **Pukulan gong otomatis dan manual.** Gong dipukul sendiri saat tamu tiba di slide gong penutup hari (dengan bunyi bila suara menyala), dan bisa dipukul lagi dengan klik, tap, atau Enter.
3. **Tier awal dipaksa ke High.** Belum dikerjakan. Yang harus diubah: aturan di `guessTier` (`src/engine/stage/tier.ts`) yang menurunkan High ke Medium bila browser melaporkan ≤ 4 inti, beserta tes unitnya di `tests/unit/stage.test.ts`. Sebelum mengubah, pastikan dulu apakah aturan itu memang penyebab HP host mulai di Medium (belum dibuktikan). Pengatur FPS tetap berlaku: kalau High terlalu berat, ia menurunkannya sendiri. Sesudah diubah, minta host cek lagi dengan `/film/?fps`.

Ketiganya baru dicatat, belum ada yang dikerjakan: arahan yang berlaku tetap "video pratinjau dulu, lalu output dan berhenti".

**Kata host (12 Nov, sesudah merge PR #6), prioritas tinggi:** "mesin film; panggung 3D React Three Fiber (target ≥ 55 fps di HP flagship); gong (buat jadi 3D); gunungan sebagai gerbang sinematik; benang emas (remodel/design) dan siklus waktu; diorama Solo, Lawu, dan canting; boarding pass 3D dengan fisika. Bebas menggunakan bahasa/pemrograman apa, yang penting hasil maksimal/lebih bagus dari sebelumnya. Boleh remodel, redesign, asal tidak jauh dari konsep. Intinya upgrade panggung 3D semaksimal mungkin. Step by step (output) per task/kerjaan."

**Urutan kerja** (sama dengan Tugas 5–12 di `CLAUDE.md`; tiap tugas ditutup dengan output yang sudah dites, pratinjau ke host, commit + push, dan pembaruan berkas ini):

| # | Tugas | Acuan | Status |
|---|---|---|---|
| 5 | Panggung 3D (R3F) + mesin film 3D: kanvas, shot kamera per slide, tier kualitas, pemantau FPS | F2, Tugas 23 | **selesai 12 Nov**, PR #7 di-merge, diterima host sesudah uji di iPhone (lihat di bawah) |
| 6 | Gong ageng 3D + pukulan | F3, Tugas 24 | kode tertulis; tes dan video ditunda host (lihat "Utang gong") |
| 7 | Gunungan: gerbang sinematik + sapuan antar bab | F4, Tugas 25 | **sedang dikerjakan** |
| 8 | Benang emas (desain ulang) + siklus waktu 3D + post-FX + partikel | F5, Tugas 26, 27, 31 | belum |
| 9 | Diorama Solo | F6, Tugas 28 | belum |
| 10 | Lereng Lawu | F6, Tugas 29 | belum |
| 11 | Canting + kain mori | F6, Tugas 30 | belum |
| 12 | Boarding pass 3D dengan fisika | F7, Tugas 32 | belum |

### Tugas 5: hasil (12 Nov)

**Yang sudah ditulis.**
- Dependensi baru: `three` 0.187, `@react-three/fiber` 9.8.2, `@types/three`. Tanpa drei dan tanpa pustaka post-processing; rantai post ditulis sendiri supaya bundle kecil.
- Mesin murni (tanpa DOM, tanpa three), di `src/engine/stage/`:
  - `tier.ts`: tier High/Medium/Low/Static, tebakan tier awal dari GPU, dan pengatur FPS. Tangga 7 anak tangga (tiap tier punya resolusi penuh dan resolusi dikecilkan): rata-rata < 50 fps selama ±3 dtk → turun, stabil ≥ 58 fps → naik lagi dengan jeda. Layar 30 Hz (Low Power Mode) dikenali dan ambangnya dibagi dua.
  - `shots.ts`: satu shot kamera per jenis slide, penyesuaian untuk layar tegak, dan perpindahan antar shot (mengitari panggung, melengkung melewati gayor, atau potong saat sapuan gunungan).
  - `mood.ts`: keadaan langit film (`SkyState`) → warna langit, cahaya matahari/bulan, cahaya sekitar, kabut, bintang, kuat blencong.
  - `cue.ts`: letak film (slide asal, tujuan, kemajuan transisi) → shot + langit. `SKY_WINDOW` sekarang dipakai bersama oleh `transitions.ts` (DOM) dan panggung 3D.
  - `terrain.ts`: bentuk tanah (bukit pendapa, dataran, Gunung Lawu).
- `director.ts` mendapat `cursor()`: sumber waktu yang sama untuk DOM dan 3D.
- Bagian three.js, di `src/components/film/stage3d/` (dimaksudkan sebagai bundle lazy): uniform dan GLSL bersama, kubah langit (gradien, matahari, bulan, bintang), lanskap (terasering, lampu desa di malam hari, kabut), pendapa (lantai kawung emas, empat saka, blandar), blencong (wadah, nyala, berkas cahaya), debu emas, rantai post (HDR, bloom, ACES, dither), dan `Stage3D.tsx` (kanvas R3F dengan loop sendiri yang berhenti saat tab tersembunyi).

**Status (12 Nov, sesudah merge).** Tugas 5 selesai. PR #7 di-merge host (squash "redesign 3D (#7)", `064fbdc`), dan host menerimanya: "hasilnya stabil di medium ... oke sih. aku anggep udah selesai".

**Uji host di perangkat (produksi, `/film/?fps`, 12 Nov ±13.16 WIB, iPhone di Safari lewat 4G; modelnya tidak disebut).** Tiga tangkapan layar overlay:

| Slide | Laju layar | Rata-rata 3 dtk | CPU per frame | Tier |
|---|---|---|---|---|
| Frasa Jawa (prolog) | 60 fps | 60 | 0,8 ms | medium ×1 |
| Gong penutup Hari 1 | 59 fps | 58 | 0,8 ms | medium ×1 |
| Boarding pass (epilog) | 59 fps | 60 | 0,7 ms | medium ×0.82 |

17 draw call dan 26 ribu segitiga di ketiganya. Target ≥ 55 fps tercapai di tier Medium. Dua hal yang perlu diingat:
- **Tier High tidak pernah terlihat di HP host**, dan penyebabnya belum dipastikan. Dua kemungkinan: (a) aturan tier awal menurunkan High ke Medium bila browser melaporkan ≤ 4 inti (`guessTier` di `src/engine/stage/tier.ts`), dan Safari iOS diduga membatasi angka itu; (b) mulai di High lalu diturunkan pengatur FPS sebelum host melihatnya. Cara memastikan: buka `/film/?fps&stage=high` di HP yang sama dan lihat fps-nya.
- **Pengatur sempat menurunkan satu anak tangga** (medium ×1 → ×0.82) di antara tangkapan kedua dan ketiga, jadi di suatu saat rata-rata 3 dtk jatuh di bawah 50 fps. Slide atau transisi mana yang menyebabkannya tidak diketahui. Artinya HP ini tidak punya banyak ruang di atas Medium; tiap isi baru (gong, gunungan) perlu dicek lagi di perangkat.

Yang berlaku saat PR dibuat (dipertahankan sebagai catatan):

Sudah, dan sudah dibuktikan di sesi ini:
- Kanvas tersambung ke film lewat `src/components/film/StageMount.tsx` (muat lazy, tebak tier, `?stage=high|medium|low|static`, `?fps`, jatuh ke 2,5D bila gagal) dan `Film.tsx` + `film.css`.
- Terender di Chromium tanpa GPU (WebGL2 lewat SwiftShader, tier dipaksa): semua shader terkompilasi, 26 slide data tiruan tergambar di desktop dan HP tegak, teks DOM terbaca di atasnya.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (245 tes; 34 baru di `tests/unit/stage.test.ts`), `pnpm content:check`, `pnpm build`, dan `pnpm test:e2e` (183 lulus, 13 dilewati seperti sebelumnya) lulus pada commit terakhir.
- e2e baru `e2e/stage.spec.ts`, 14 tes × desktop dan iPhone: tanpa GPU / `?stage=static` / reduced motion / Calm tetap 2,5D; Calm dimatikan → kanvas kembali; kanvas tergambar dan bukan bidang kosong; kamera pindah per slide dan kembali saat mundur; kamera gallery bergeser per panel; CSP produksi tidak memblokir 3D dan tidak ada galat shader; overlay `?fps`; gerbang dan Today tidak memuat three.
- Video HD desktop (1920×1080, tier High, 38 dtk, data tiruan) sudah dikirim ke host dan sudah ditonton frame demi frame: prolog, sapuan gunungan, satu hari di gallery (subuh → malam), gong. Tidak ada lompatan kamera atau frame kosong.
- Ukuran (`scripts/preview/measure-stage.cjs`, desktop 1440×900; ukuran kanvas dari jalanan @2x, draw call dan waktu CPU dari jalanan terakhir dengan `DPR=1`, sesudah tiga frame awal dikeluarkan dari rata-rata). Skrip menutup dengan "OK: CPU thread utama ≤ 1.33 ms per frame di semua tier":

  | Tier | Kanvas | Draw call | Segitiga | CPU thread utama per frame (diam) |
  |---|---|---|---|---|
  | High | 2880×1800 | 15–19 | ±25 ribu | 0,5–1,3 ms |
  | Medium | 2160×1350 | 13–17 | ±25 ribu | 0,5–1,2 ms |
  | Low | 1440×900 | 11–14 | ±25 ribu | 0,4–0,9 ms |

  Bundle 3D (lazy, hanya di `/film/` saat 3D dipakai): **+943 KB mentah, +251 KB gzip** di atas film 2,5D (606 KB mentah, 188 KB gzip). Sebagian besar three; R3F mengimpor seluruh namespace three sehingga tidak bisa dipangkas.

Belum, atau belum dibuktikan:
- ~~fps nyata tidak diketahui.~~ Sudah diuji host di iPhone, lihat tabel di atas. Cara ujinya: buka film, lalu di tab yang sama ubah alamat jadi `/film/?fps` (baris pertama overlay = laju layar sekarang, `avg` = rata-rata 3 dtk pengatur tier, baris kedua = tier dan skala resolusi).
- **Pratinjau branch tidak bisa login.** Backend hanya menerima origin produksi dan localhost (`DEFAULT_ORIGINS` di `supabase/functions/_shared/http.ts`), jadi gerbang di domain pratinjau Vercel menampilkan "No connection". Host memilih merge ke `main` daripada menambah secret `ALLOWED_ORIGINS`. Untuk branch berikutnya: uji perangkat sebelum merge butuh secret itu.
- Video HP dan foto pratinjau tidak dibuat: host sudah melihat langsung di HP dan menganggap Tugas 5 selesai.
- Skrip ukur belum dijalankan di profil iPhone.
- Sudah dilihat host di Safari iPhone. Belum diuji di MacBook, Android, atau iPhone lama.

Yang ditemukan dan diperbaiki saat render pertama: kata tercadang GLSL (`patch`), sisi jala lanskap terbalik (lanskap tidak tergambar), `smoothstep` dengan dua batas sama di sisi tegak (bintik acak), nyala blencong berbentuk kotak, debu terlalu besar, kabut menutup seluruh lanskap. Yang ditambahkan: petak sawah (sebagian tergenang dan memantulkan langit), lampu desa sebagai titik (`stage3d/village.ts`), balok tumpang sari tempat blencong digantung, gradien langit yang direntang per shot (`skyStretch`), tepi bawah gambar diturunkan supaya penanda bab terbaca. Rincian keputusan: `docs/design/decisions.md` bagian "Panggung 3D, fondasi".

Catatan untuk yang melanjutkan: pendapa masih kosong di tengah (gong 3D baru di Tugas 6); gong, gunungan, dan boarding pass yang tampak sekarang masih versi DOM/CSS di atas kanvas. `next dev` membuat `AGENTS.md` otomatis; berkas itu sudah masuk `.gitignore`. Perekam video (`record-film.cjs`) menerima `STAGE=high|medium|low` dan tur `stage`; di server tanpa GPU pakai K = 0,04 (±15 menit untuk 38 dtk video).

**Keputusan yang sudah tertanam di kode.**
- Calm dan reduced motion → tanpa WebGL, film 2,5D yang sekarang.
- Renderer perangkat lunak (tanpa GPU) → otomatis Static.
- Matahari 3D berada di titik layar yang sama dengan matahari 2,5D (diukur dari `.fl-sunbox`). Akibatnya kamera gallery memandang lanskap dari atas, dengan cakrawala tepat di atas kartu.
- Gallery untuk sementara memakai satu lanskap umum; diorama per bab menyusul di Tugas 9–11.

**Langkah berikutnya.** Tugas 6: gong ageng 3D (rencananya di "Rencana Tugas 6–12" di bawah). Branch kerja sudah dimulai ulang dari `main` terbaru (`064fbdc`). Karena HP host tidak punya banyak ruang di atas Medium, gong harus hemat: satu draw call untuk badan, tanpa bayangan dinamis, dan diukur ulang dengan `measure-stage.cjs`.

### Rencana Tugas 6–12

- **6, gong:** badan dari profil yang diputar, perunggu dengan pantulan langit, gayor dan naga, Batara Kala, pencu berdenyut, kepingan bara yang berkumpul. Pukulan lewat klik/tap/Enter dengan SFX `gong` (`AudioEngine.playSfx`). Tombol DOM tetap ada sebagai pemicu yang bisa dibaca screen reader; gong CSS (`.fs-gong`) disembunyikan saat 3D hidup.
- **7, gunungan:** bentuk kayon yang sudah ada (`src/components/motion/kayon.ts`) dijadikan lembaran bertatah dengan ketebalan. Dipakai sebagai gerbang sesudah kode benar (bundle 3D baru dimuat sesudah kode benar) dan sebagai sapuan antar bab pengganti `.fl-wipe` di tier 3D. Sisi geni dan blencong yang mengikuti kursor.
- **8, benang emas dan siklus waktu:** benang sebagai kurva ber-shader yang tergambar mengikuti kemajuan film. Siklus waktu 3D sebagian sudah masuk di Tugas 5 (langit, matahari, arah cahaya); sisanya grading per bab, depth of field di tier High, partikel per fase.
- **9–11, diorama Solo, Lawu, canting:** data OSM dan DEM butuh akses jaringan; dicek saat tugasnya dimulai, dan bila diblokir host diminta membukanya. Cadangan: bentuk prosedural tanpa data luar.
- **12, boarding pass:** fisika tali dan kartu ditulis sendiri (tanpa WASM) kecuali host mengizinkan `wasm-unsafe-eval` di CSP untuk Rapier.

**Keputusan awal** (rinciannya ditulis di `docs/design/decisions.md` saat tugasnya selesai):
- Film 2,5D yang sekarang menjadi tier **Static**: dipakai saat reduced motion, Calm, tanpa WebGL, dan selama bundle 3D dimuat. Tidak ada yang dibuang.
- Bundle 3D dimuat lazy hanya di `/film/`. Home sebelum kode benar dan Today tetap tanpa WebGL.
- Teks itinerary tetap DOM di atas kanvas (FR-12).
- CSP produksi tidak mengizinkan WASM (`script-src` tanpa `wasm-unsafe-eval`). Ini berpengaruh ke pilihan mesin fisika di Tugas 12 (Rapier memakai WASM).
- Sesi cloud tidak punya GPU: FPS di HP flagship tidak bisa diukur dari sini. Yang diukur: waktu CPU per frame, jumlah draw call dan segitiga, dan perilaku tier. Angka fps nyata menunggu uji host di perangkat.

## 1. Home 2,5D dengan desain baru (Tugas 3, selesai 11 Nov)

**Permintaan host (11 Nov, berurutan):** "upgrade home ke 2,5d sama benerin ui home, catat di handoff.md dulu" → "ganti aja design nya, button juga" → "setelah menulis design, update ke handoff.md, sekalian planning pekerjaan selanjutnya".

Home = halaman `/` (gerbang kode dan sambutan). 2,5D memakai arti dari Tugas 2: kedalaman berlapis, DOM dengan `transform` dan `opacity`, bukan WebGL. Rincian desain dan alasannya: `docs/design/decisions.md` bagian "Home 2,5D dengan desain baru"; nilai gerak: `docs/design/motion-tokens.md` v7.

**Yang selesai.**
- **Panggung berlapis** (`src/components/home/Scene.tsx`, `home.css`): langit malam berbintang, punggung Lawu, perbukitan, lantai pendapa bermotif kawung yang direbahkan dengan perspektif, dua kayon penjaga, debu emas. Lima bidang bergeser dengan jarak berbeda mengikuti kursor (`useDepth.ts`, hitungan murni di `src/engine/motion/tilt.ts`); di layar sentuh berayun pelan lewat CSS. Nilai di `HOME` (`src/engine/motion/tokens.ts`).
- **Gerbang:** kartu undangan bersudut lekuk tergantung di benang emas, berayun masuk seperti bandul, miring mengikuti kursor; tiga bidang di dalam kartu. Kode di dua baki (3 + 6 sel) dengan titik penanda. Kode benar → huruf menyala, kayon menyibak, kilat blencong, kartu berbalik.
- **Sambutan:** boarding pass baru (`home/Pass.tsx`), mendatar di layar lebar dan tegak di HP; cap "Admitted" jatuh dari depan saat mulai. Kunjungan ulang memakai tunda 0,35×.
- **Tombol baru (`.hb`)**: kapsul foil gading-emas dengan medali gong, tautan berbenang emas untuk "Use a different code" (di bawah tombol utama), speaker cincin tipis, sakelar bahasa kapsul bergaris (`Seg` varian `line`). Hanya di home; Today dan film tetap `.pb`.
- **HP:** kartu di paruh atas layar (tidak tertutup keyboard), puncak Lawu terlihat di bawahnya; tombol utama menempel di bawah layar.
- `globals.css` 3.200 → 2.671 baris (aturan gerbang, kotak kode, sambutan lama dibuang). `Ticket.tsx` lama tetap dipakai Today dan film.
- Skrip baru: `scripts/preview/measure-home.cjs` (kehalusan) dan `record-home.cjs` (video gerak lambat; argumen `desktop|iphone`, `en|id`).

**Hasil tes dan kendala.**
- Hijau pada commit terakhir: `pnpm lint`, `pnpm typecheck`, `pnpm test` (211 unit), `pnpm content:check`, `pnpm build`, `pnpm test:e2e` (155 lulus, 13 dilewati per perangkat; 8 uji baru di `e2e/home.spec.ts`).
- Lighthouse a11y home: 100 di gerbang, mengetik, kode salah, sambutan × EN/ID × HP/desktop.
- Kehalusan (`measure-home.cjs`, Chromium tanpa GPU): iPhone tiruan 0 frame > 50 ms di enam momen, terpanjang 33 ms. Desktop: diam 17 ms, p95 33 ms di semua momen, **masih ada 1–2 frame 50–83 ms** saat kursor menyapu dan saat gerbang berganti jadi sambutan. Versi pertama 29 ms per frame saat diam; penyebabnya `filter: blur` pada bayangan kartu dan lapisan selayar yang terlalu banyak, keduanya sudah diperbaiki.
- JS halaman home 192,7 KB gz (8 berkas, termasuk kerangka React dan Next), CSS 15,2 KB gz. Belum dibandingkan dengan sebelum perubahan (build `main` di worktree terpisah gagal di sesi ini).
- **Belum diuji di Safari dan perangkat nyata.** `preserve-3d`, mask sudut lekuk, dan `sessionStorage` di aplikasi Home Screen hanya dilihat di Chromium.
- Di desktop, puncak Lawu tertutup kartu; yang terlihat hanya lerengnya di kiri-kanan. Di HP puncaknya terlihat.

**Langkah berikutnya.** Host meninjau pratinjau dan merge PR (bagian 5), lalu mencoba di iPhone dan MacBook asli. Penyesuaian yang mungkin diminta: kuat-lemah kemiringan (`HOME.tiltY`, `tiltX`), jarak parallax (`HOME.layers`), ukuran kayon dan motif lantai (`home.css`), bentuk tombol.

## 1b. Sesi per tab: kode diminta lagi di tab atau browser baru (selesai 11 Nov)

**Kata host:** "benerin sekalian, itu ga ke reset reset di web nya, masa udah gw reset browser tapi masih masuk tanpa nulis pw, udah buka tab baru juga masih masuk tanpa nulis pw/langsung ke home". Sebelumnya token sengaja disimpan permanen (PRD FR-03 lama). **Keputusan host 11 Nov** (dari tiga pilihan): kode diminta lagi di tiap tab/browser baru; Today yang dipasang ke Home Screen tetap ingat.

**Yang selesai.**
- `src/lib/device-store.ts`: tab browser biasa menyimpan sesi dan salinan trip di `sessionStorage` (hidup selama tab itu); aplikasi Home Screen (standalone) tetap di `localStorage`. `session.ts` dan `trip.ts` memakainya.
- Sesi permanen lama di `localStorage` (termasuk milik host sekarang) tidak dipakai lagi dan dihapus bersama salinan trip-nya saat halaman dibuka (`sweepLegacy`). Sesi milik aplikasi Home Screen diberi tanda `app: 1` dan tidak ikut terhapus, karena di Android penyimpanannya dipakai bersama tab browser.

**Hasil tes dan akibatnya.**
- Hijau: 211 unit (8 baru untuk penyimpanan), 155 e2e (3 baru: tab baru meminta kode, sesi lama dibersihkan, Home Screen tetap ingat).
- Muat ulang di tab yang sama tetap masuk. "Duplicate tab" dan "Reopen closed tab" di Chrome ikut membawa sesi (sifat `sessionStorage`).
- **Akibat untuk tamu:** Today yang dibuka di tab browser biasa meminta kode tiap tab baru dan butuh sinyal. Supaya bisa offline di jalan, Today harus dipasang ke Home Screen; di sana kode diketik sekali lagi saat pertama dibuka, lalu diingat.
- Penanda Home Screen (`display-mode: standalone`, `navigator.standalone`) hanya dites dengan tiruan; belum dicoba di iPhone atau Android asli.

**Langkah berikutnya.** Host mencoba: tab baru harus meminta kode. Kalau panduan "Add to Home Screen" perlu menyebut bahwa kode diketik sekali lagi di aplikasi, tambahkan kalimatnya di Today.

## 1c. Cek ulang atas permintaan host (11 Nov malam)

**Pertanyaan host:** apakah galat "di HP dengan reduced motion, ayunan lapisan tidak dimatikan sepenuhnya setelah peringanan" sudah dikerjakan.

**Yang selesai.** Sudah, di commit `9f8e512`. Penyebabnya: sesudah peringanan, aturan ayunan layar sentuh memakai `.hm-l:not(.hm-dust)` yang lebih spesifik daripada aturan reduced motion (`.hm-l`), jadi ayunan tetap jalan. Aturan reduced motion di `home.css` sekarang memakai selektor yang sama dan letaknya sesudah aturan layar sentuh, jadi dia yang menang.

**Hasil tes.**
- Diulang dari build baru pada `9f8e512`: `pnpm lint`, `pnpm typecheck`, `pnpm test` (211), `pnpm content:check` (OK, 46 peringatan lama: fakta [V] dan foto), `pnpm build`, `pnpm test:e2e` (155 lulus, 13 dilewati per perangkat). Tes yang dulu gagal, `e2e/home.spec.ts` "reduced motion: tidak ada parallax, ayunan, atau debu bergerak", lulus di proyek `iphone` dan `desktop`.
- Diukur langsung di iPhone tiruan: tanpa reduced motion 18 animasi berjalan (`hm-sway`, `hm-card-sway`, `hm-sheen-sway`, `hm-dust`); dengan reduced motion 0 animasi berjalan, dan dua foto layar berjarak 2 detik identik.
- Pratinjau direkam ulang dari build ini dan dikirim ke host di chat (2 video, 4 foto, data tiruan); berkasnya tidak masuk repo.
- Kendala yang sama seperti bagian 1: belum diuji di Safari dan perangkat nyata.

**Langkah berikutnya.** Host meminta PR dibuat (11 Nov malam): **PR #6** sudah dibuka ke `main`, tanpa konflik. Host meninjau lalu Squash and merge; sesudah itu menunggu perintah host.

## 2. Beres-beres di awal sesi (pilihan host)

- **PR #5 sudah di-merge** host (11 Nov, squash "revisi design (#5)"). Branch kerja dibuat ulang dari `origin/main`.
- **Lighthouse a11y untuk film: 100.** Lighthouse 13.6, data tiruan, 16 layar × EN/ID × HP/desktop = 64 audit, semuanya 100, termasuk audit kontras. Batasnya: Lighthouse tidak bisa menilai kontras teks di atas gradasi atau gambar, jadi teks di atas langit tetap perlu dilihat di perangkat nyata.
- Skrip audit Lighthouse (film dan home) tidak masuk repo karena butuh `lighthouse` dan `puppeteer-core` yang bukan dependensi proyek. Caranya: pasang keduanya di folder luar repo, buka halaman dengan Puppeteer (sesi di `sessionStorage`, `trip-data` di-mock), lalu `startFlow` dengan `navigate` dan `snapshot` per layar.
- `docs/handoff/FABLE-5.2.md` diberi catatan bahwa statusnya keadaan 10 Nov.

## 3. Kendala dan hal yang belum (film)

- **Belum diuji di perangkat nyata** (host: belum dicoba per 11 Nov): trackpad MacBook dan Safari iPhone. Perspektif 3D (`preserve-3d`) dan Web Animations di Safari belum teruji; di sesi hanya ada Chromium. Ambang gerakan ada di `SLIDE` dan `INPUT`.
- Kehalusan desktop tanpa GPU: p95 33 ms saat pindah panel, dan di sebagian pengukuran ada satu frame 50–67 ms (iPhone tiruan: 0 frame > 50 ms). Belum dibuktikan di MacBook asli.
- Mouse tidak men-scrub (keputusan F1: roda/trackpad = satu langkah per gerakan); yang mengikuti tangan hanya scrub jari.
- "Sarapan" dikenali dari data sebagai panel makan pertama hari itu yang mulai sebelum 10:00 (`SKY.breakfastBefore`).
- 2,5D film baru di gallery. Slide lain (prolog, judul hari, gong, epilog, credits) masih datar.
- Kartu tetangga di gallery masih tembus pandang, jadi di tengah transisi bukit terlihat menembus kartu.
- Foto masih 0 (panel gallery berupa poster tipografi). Kontak di `trip_private` masih kosong, jadi slide tim dan tombol "Message your host" belum muncul di produksi.
- Gong masih cakram 2D tanpa bunyi; audio per adegan belum ada.
- Produksi tidak bisa dibuka dari sesi cloud (jaringan menolak `kulonuwun-solo.vercel.app`), jadi hasil deploy sesudah merge belum dicek dari sini.
- Skrip pratinjau film (`measure-film.cjs`, `record-film.cjs`, `record-flow.cjs`) sudah disesuaikan dengan sesi per tab dan tombol baru, tetapi `record-flow.cjs` belum dijalankan ulang sampai habis.

## 4. Rencana ke depan

Urutan usulan; host yang memutuskan. Daftar tugas di `CLAUDE.md` sudah habis.

1. **Host:** tinjau pratinjau home, merge PR #6 (bagian 5), lalu coba di perangkat nyata: tab baru harus meminta kode; home dan `/film/` di iPhone dan MacBook (Safari belum pernah diuji).
2. **Penyesuaian home dari tinjauan host** (PR kecil dari `main` terbaru).
3. **Putuskan gaya tombol:** apakah tombol baru (`.hb`) ikut dipakai di Today dan film, atau `.pb` tetap di sana. Kalau ikut, itu PR tersendiri: Today punya banyak tombol (dock, Rain plan, tab hari) dan tes `data-pressed`.
4. **Panduan Add to Home Screen:** tambahkan kalimat bahwa kode diketik sekali lagi di aplikasi, dan bahwa hanya aplikasi itu yang bisa offline (akibat sesi per tab, bagian 1b).
5. **Penyesuaian gallery dari tinjauan host**: kemiringan kartu (`DEPTH.cardTurn`, `cardZ`), jarak parallax (`DEPTH.hillsNear`), letak dan ukuran matahari (`.fl-sunbox`), kartu tetangga padat atau tembus pandang.
6. **2,5D film di luar gallery**: parallax saat pindah slide vertikal, kedalaman pada kartu judul hari dan gong. Panggung home (`home/Scene.tsx`) bisa jadi acuan.
7. **F2, panggung 3D** (Tugas 23): R3F dimuat lazy hanya di `/film/`, tier High/Medium/Low/Static, overlay FPS. Perlu keputusan host: apakah 2,5D menjadi tier Medium/Low di bawah panggung 3D, atau menggantikannya.
8. F3 (gong produksi dengan bunyi) dan F4 (gunungan produksi dan gerbang sinematik; kayon home yang menyibak adalah versi 2,5D-nya).
9. Di luar film: foto berlisensi (Tugas 6, 21), kontak di `trip_private`, verifikasi fakta [V].

Setiap pekerjaan baru dimulai dari `main` terbaru: `git fetch origin main && git checkout -B <branch> origin/main`. Jangan menumpuk commit di atas riwayat lama; squash membuat riwayatnya berbeda dan PR berikutnya akan konflik.

## 5. Panduan PR: Squash and merge

**Keadaan semua PR per 12 Nov.** PR #1 sampai #6 sudah di-merge ke `main` (#6: home 2,5D + sesi per tab, squash "redesign (#6)"). PR #7 (Tugas 5, fondasi panggung 3D) di-merge host 12 Nov (squash "redesign 3D (#7)"). PR untuk Tugas 6 dibuat saat host memintanya.

**Langkah merge (di GitHub, lewat browser).**
1. Buka halaman PR-nya.
2. Gulir ke kotak merge. Pastikan tertulis **All checks have passed** dan **No conflicts with base branch**. Kalau pemeriksaan masih berjalan (lingkaran kuning), tunggu sampai hijau.
3. Klik panah kecil di samping tombol hijau, pilih **Squash and merge**. Jangan pilih "Create a merge commit" atau "Rebase and merge".
4. Klik **Squash and merge**, lalu **Confirm squash and merge**.
5. Tombol "Delete branch" boleh diklik atau diabaikan; keduanya aman.

**Sesudah merge.**
- Vercel otomatis membangun produksi dari `main`. Tunggu beberapa menit, lalu buka https://kulonuwun-solo.vercel.app.
- Pratinjau branch sebelum merge: https://kulonuwun-solo-git-claude-gallant-hopper-1jlpo0-jixx1.vercel.app

**Menarik ke komputer host.** `git checkout main && git pull origin main && pnpm install`, lalu `pnpm dev` dan buka http://localhost:3000. Kalau `git pull` menolak karena ada perubahan lokal: `git stash`, ulangi `git pull origin main`, lalu `git stash pop`.

**Untuk PR berikutnya.** Satu PR per pekerjaan, Squash and merge, yang lebih lama dulu. Sesudah merge, kabari Claude ("sudah merge") supaya pekerjaan berikutnya dimulai dari `main` terbaru. Claude tidak pernah merge sendiri.
