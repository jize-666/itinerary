# Catatan Keputusan Desain

Catatan ini merekam keputusan visual & audio yang sudah diambil, beserta yang masih menunggu persetujuan host.

## Status checkpoint 0 (Fase 0)
| Item | Status | Preview |
|---|---|---|
| Tugas 1: Gong ageng 3D | ✅ **v3 "Murka" + Batara Kala disetujui host (8 Nov 2026)**, termasuk ayunan tabuh dari samping & suaranya | `prototypes/gong/scene.js` · v3: `docs/design/previews/gong_v3_idle.png`, `gong_v3_pukul.png`, `gong_v3_batara.png`, `gong_v3.mp4` (bersuara) |
| Tugas 2: Gunungan + blencong + kelir | ✅ **v3 "Gunungan Murka" disetujui host (8 Nov 2026)**, termasuk gerak (balikan, goyang, sapuan dalang) & suaranya | `prototypes/gunungan/scene.js` · v3: `docs/design/previews/gunungan_v3_hero.png`, `gunungan_v3_api.png`, `gunungan_v3_flat.png`, `gunungan_v3_kala.png`, `gunungan_v3_gerak.mp4`, `gunungan_v3_sapuan.mp4`, `gunungan_v3_suara.mp4` (bersuara) |
| Keris 3D "Naga Sasra" (tambahan, permintaan host) | ✅ disetujui host (8 Nov 2026) | `prototypes/keris/scene.js` · `docs/design/previews/keris_hero.png`, `keris_bangkit.png`, `keris_sarung.png`, `keris.mp4` (bersuara) |
| Boarding pass "Tiket Lakon" (Tugas 32, satu tamu) | **menunggu persetujuan** | `prototypes/boarding-pass/scene.js` · `docs/design/previews/boarding_pass_wide.png`, `boarding_pass_ayun.png`, `boarding_pass_belakang.png`, `boarding_pass.mp4` (bersuara; nama "Your Name", versi bernama hanya dikirim ke host) |
| Audio gamelan + gerbang dua tombol | ✅ disetujui host (8 Nov 2026) | `public/audio/*`, `src/engine/audio/*` · lihat "Audio gamelan" di bawah |
| Tugas 3: Prototipe motion (Framer) | ✅ disetujui host (8 Nov 2026, v2) | Framer: https://framer.com/projects/JFpFbDKBsfnsgzvi6f8r (tekan Preview) · `docs/design/motion-tokens.md` |

## Keputusan yang sudah diambil (7 Nov 2026)
- **Gong ageng** menjadi objek hero 3D utuh. Badan gong dibuat dengan *lathe*. Material perunggu memakai tekstur prosedural: bekas tempa, garis bubut, dan patina. **Pencu** sengaja dibuat lebih licin karena bagian itu yang sering dipukul.
- Tekstur gong memakai **UV planar dari depan**. Dengan UV *lathe* bawaan, bekas tempa meregang jadi garis radial seperti "mata".
- **Gayor memakai palang lurus**. Palang yang melengkung ke atas sempat dicoba, tapi siluetnya mirip **torii Jepang**, jadi diganti. Ornamennya: kuncup + ukel emas di tengah dan kuncup di ujung tiang.
- **Gunungan digambar di kode** (kanvas 1400×2000) dengan tiga lapisan: alpha (lubang tatahan), warna (sungging + prada), dan metal/rough (prada mengilap). Bentuknya diberi ketebalan 8 mm.
- Bayangan berpola dibuat dengan `customDepthMaterial` yang memakai `alphaMap`, sehingga **cahaya benar-benar menembus lubang tatahan**.
- **Kelir** (layar kain) memakai pencahayaan dua sisi, jadi bayangan dari blencong di belakang terlihat dari depan seperti pertunjukan wayang sungguhan.
- Gunungan ditancapkan di **gedebog**.
- **Cahaya blencong mengikuti kursor** (di HP nanti mengikuti gyroscope). Kalau tidak ada gerakan selama 3 dtk, cahaya kembali bergoyang sendiri.

- **Prototipe motion di Framer** berisi 7 bagian: gate "Kulonuwun?" (reveal per huruf, kotak kode bertahap, pendar blencong), prolog (reveal per baris dan per kata, angka bertahap), kartu bab (letterbox, foto tirai, sapuan gunungan), horizontal gallery Hari 1 (panggung sticky dengan langit pagi → senja → malam yang ikut scroll), Stop Card yang bisa dibuka-tutup (shared element), gong dengan riak, dan boarding pass yang bisa ditarik lalu kembali sendiri.

## Upgrade v2 (8 Nov 2026), atas masukan host: "efforts maks"
- **Gong v2:** bisa diklik (tabuh berayun, riak, gelombang kejut layar dengan aberasi warna, percikan emas, kamera bergetar). Gayor lak merah dengan relief lung-lungan emas, **kepala naga** di kedua ujung palang, cincin kuningan di tali, tiang pendopo, tikar pandan, berkas cahaya + debu. Kilau saat dipukul sengaja diredam supaya gong tidak berubah jadi gumpalan putih.
- **Gunungan v2:** **dua raksasa penjaga** (mahkota bertingkat, jamang, sumping, ukel emas, gada), **6 burung** di dahan, warna sungging bergradasi, batang bertatah, titik inten di renda, **sisi belakang bergambar api** yang berpendar dan bisa dibalik dengan klik, **lampu blencong** perunggu berbentuk garuda yang terlihat, kelir kain anyam dalam gawangan kayu.
- Perbaikan teknis: `shadowSide = DoubleSide` supaya bayangan tatahan tetap jatuh di kelir saat gunungan dibalik.
- **Framer:** semua teks diganti komponen kode `KineticText` (6 efek + kilau emas), angka pakai `RollingNumber`, ditambah pita `VelocityMarquee`, dan gong diganti `GongStrike` yang bisa dipukul. Tiket epilog jadi **BELITUNG (TJQ) → SOLO (SOC)**.

## Gunungan v3 "Murka" (8 Nov 2026), atas permintaan host: "lebih serem, sangar dan gahar"
Tetap di pakem wayang (kala/banaspati, macan-banteng, naga, raksasa penjaga, sisi geni), tapi nadanya diubah jadi menakutkan.
- **Wajah kala/banaspati** jadi pusat: rambut api tiga lapis yang condong ke atas, tanduk gading bercincin emas, alis menyala berbulu api, kerut murka di dahi, rongga mata cekung, mata melotot berurat dengan kelopak miring ke dalam, hidung bercuping lebar, kerut menyeringai, mulut menganga dengan siung atas dan taring bawah mencuat, lidah menjulur menjilat puncak gapura, dua tangan bercakar muncul dari balik api.
- **Mata dan mulut kala berlubang.** Blencong diposisikan segaris dengan wajah kala dan tengah kelir, jadi **bayangan wajah raksasa dengan mata dan mulut menyala** jatuh tepat di kelir (pembesaran ±2×).
- **Pupil celah 3D** (bara + celah hitam) mengambang di lubang mata, mengikuti kursor, dan kalau diam melirik sendiri lalu sesekali menatap penonton. Celahnya ikut menjatuhkan bayangan, jadi mata di kelir juga bercelah dan ikut bergerak.
- **Macan vs banteng** berhadapan siap bertarung di bawah pohon hayat (macan mengaum, banteng menunduk dengan tanduk ke depan dan dengus napas). **Sepasang naga bermahkota** melilit batang dengan rahang menganga, lidah bercabang, sirip punggung. Burung-burung v2 dihapus supaya komposisi tidak ramai.
- **Raksasa penjaga**: gada berduri diangkat tinggi, rambut gimbal terurai, mata menyala, alis murka, siung dan taring, cakar.
- **Sisi geni**: lidah api melengkung-S bergradasi, dan **wajah iblis** muncul dari kobaran. Wajah itu sejajar persis dengan kala, jadi lubang mata dan mulut kala menjadi mata dan mulut iblis yang menyala.
- **Cahaya**: lampu utama hangat-netral (prada tetap terbaca emas), rim merah darah dari kanan, **bara merah dari bawah** (gaya pencahayaan horor), blencong yang sesekali hampir padam sehingga bayangan melompat, **denyut jantung "deg-deg"** tiap 2,1 dtk yang menyalakan mata, bara yang naik, dan semburan bara + getar kamera saat gunungan dibalik.
- **Post**: vignette lebih berat, aberasi warna yang berdenyut, grade (hitam ditekan, highlight hangat, bayangan sedikit dingin), grain.
- **Kamera** sudut rendah dengan lensa 42° supaya gunungan menjulang dan wajah bayangan utuh di kelir.
- Teknis: kanvas tekstur memakai `willReadFrequently` (raster CPU). Tanpa itu frame pertama di renderer software butuh ±59 dtk karena ribuan path ber-clip; dengan itu ±1,5 dtk. Ada peta **emisi** keempat untuk bagian yang menyala (iris, mata satwa, lidah, permata).

## Gong v3 "Murka" + Batara Kala (8 Nov 2026), atas permintaan host: gong "vibe-nya sama kaya gunungan"
- **Pembukaan**: kepingan bara berkumpul membara, gong muncul lalu mendingin jadi perunggu gelap berpatina.
- **Jantung gong**: pencu berdenyut merah (deg-deg) seirama mata Batara Kala. Retakan bara hanya menyala saat dipukul, supaya gong tidak terlihat pecah saat diam.
- **Pukulan**: retakan bara menjalar dari pencu, riak merah, gelombang kejut, semburan bara, **kedua naga gayor menyemburkan api** (partikel warna-per-titik + kilatan di mulut), kamera bergetar.
- **Naga gayor** garang: rahang menganga, gigi & taring, mulut berbara, mata merah, tanduk, sirip punggung.
- **Puncak gayor = Batara Kala**, wayang kulit gaya Surakarta (pilihan host, menggantikan topeng kala yang lebih mirip relief candi/Bali): menyamping menghadap kanan (kelompok kiwa), makutha membulat condong ke belakang + turida, garuda mungkur, praba, rambut gimbal, mata plelengan menyala, irung bentulan, gusen bersiung, brengos & jenggot, kain bokongan parang bertatah, sungging emas di tepi dalam, gapit/cempurit & tuding, berdiri jangkahan. Tinggi ±1,05 m, aura merah berdenyut di belakangnya. **[V] ikonografi Batara Kala gagrak Surakarta perlu dicek dalang/guide.** Catatan jujur: digambar prosedural dari ingatan, jadi masih "bergaya wayang". Untuk keaslian penuh, alternatifnya foto wayang kulit asli berlisensi (butuh akses jaringan ke Wikimedia, lihat Tugas 6).
- **Batara Kala menggenggam keris 3D** (lihat di bawah): kepalan tergambar di bidang wayang, keris dipasang tepat di belakang bidang sehingga kepalan menutupi gagangnya. Pamor keris menyala saat gong dipukul.
- Cahaya: rim merah sorot ke gayor (bukan cahaya terarah yang menyiram lantai), bara dari bawah, grade gelap sama dengan gunungan.

## Keris 3D "Naga Sasra" (8 Nov 2026), atas permintaan host: "bikin keris 3D semaksimalmu"
- Skala asli (meter), semuanya prosedural. Pembuat model `buildKeris()` ada di antara penanda `KERIS BUILDER START/END` dan disalin identik ke adegan gong.
- **Wilah luk 13** (dhapur Naga Sasra): penampang lensa bergigir, lebar menyempit ke pucuk, **pamor** nikel bergelombang + beras wutah. Baja doff gelap, pamornya mengilap perak (peta metal/roughness terpisah). **Naga kinatah emas** mengikuti luk di kedua muka bilah, kepala bermahkota bermata merah di gandhik. Ricikan: gandhik, kembang kacang, greneng.
- **Ganja** terpisah (sirah cecak & buntut cecak), **mendhak** emas bermata merah, **ukiran Tunggak Semi** timoho berpelet (melengkung, tunas berukir lewat bump map), **warangka Ladrang** + **gandar berpendhok** emas bermotif lung-lungan.
- **Adegan**: keris tersarung melayang → warangka tergeser lepas sepanjang bilah (nyabut) → **pamor menyala dari pangkal ke pucuk** (shader sapuan pada peta emisi) → semburan bara di pucuk + gelombang kejut → melayang & berputar pelan, jantungnya berdenyut. Klik keris = bangkitkan lagi.
- **[V] perlu dicek empu/kolektor**: jumlah luk, ricikan, bentuk ukiran & warangka gaya Surakarta.

## Gerak gunungan dioptimalkan (8 Nov 2026), atas permintaan host: "dibuat smooth, agak kasar dikit gapapa"
- Semua gerak kini **berbasis waktu nyata (dt)**, bukan per frame: penghalus eksponensial `1 − e^(−k·dt)`, kecepatan bara/debu per detik. Hasilnya sama di layar 30/60/120 Hz (dulu lerp 0,06 per frame: terlalu cepat di 120 Hz, tersendat saat frame turun).
- **Goyang organik**: gabungan beberapa gelombang tak seirama (bukan sinus tunggal), plus sedikit condong mengikuti kursor.
- **Balikan berpegas** (frekuensi 0,95 Hz, redaman 0,62): gunungan terangkat ±5 cm dan miring saat berputar, lewat ±8% lalu mantap dalam ±1,3 dtk (setengah putaran ±0,2 dtk). Diuji numerik: identik di 30/60/120 fps.
- **Getar kayon** — tekstur "agak kasar": dalang menggetarkan gunungan cepat (±10 Hz, meluruh dalam ±1 dtk). Muncul setelah balikan mendarat, saat kursor mulai menyentuh gunungan, dan sesekali saat diam (tiap 6–10 dtk).
- Lirikan pupil cepat lalu berhenti (penghalus 16/dtk), blencong mengikuti kursor dengan lembut (3,6/dtk).
- Preview gerak: `docs/design/previews/gunungan_v3_gerak.mp4` (24 fps, klik di detik 0,5: mulai berputar → tampak tipis dari samping → kilatan saat sisi api terbuka → lewat sedikit, getar kayon, mantap). Saat waktu dikunci (`window.__fixedT`), gerak berhenti supaya uji & screenshot akurat.
- **Performa**: resolusi adaptif (pixel ratio turun 0,25 kalau rata-rata < 45 fps, naik lagi kalau > 57 fps), peta bayangan 1536 di perangkat sentuh (2048 di desktop). `window.__fps` untuk memantau.

## Revisi audit host (8 Nov 2026)
**Gong**
- **Cara memukul**: tabuh tidak lagi bergerak lurus seperti menombak. Diayun melengkung dari samping seperti ayunan bisbol, berporos di tangan pemain di sisi kanan gong: load (kepala tabuh terangkat di atas bahu, tangan mundur) → jeda singkat → ayunan makin cepat, turun & mendatar → kena pencu menyamping (bantalan tergencet) → pantulan lembut → kembali menggantung. Referensi: gong ageng dipukul di pencu dengan tabuh berkepala bulat berbantal tebal, pukulannya lembut; urutan ayunan bisbol load → stride → rotasi → kontak → follow-through. Arah kontak diverifikasi numerik.
- **Kamera diam** (tanpa putar otomatis, tanpa getar; masih bisa diputar manual). Yang bergerak gongnya: **berayun maju-mundur seperti bandul** (periode ±1,6 dtk, meluruh ±2,6 dtk) + dengung halus maju-mundur. Gerak miring ke samping dihapus. Gayor & Batara Kala tetap diam (rangka kokoh). Riak menempel di muka gong.

**Gunungan sebelum mode ngamuk** (sisi depan)
- **Goyang diam diperbesar ke ±13,7°** (mode ngamuk tetap ±7°), berpindah halus saat dibalik.
- **Koreografi sapuan dalang** tiap 7–11 dtk (tidak saat kursor di atas gunungan): disapukan ±31° ke kiri/kanan sambil condong & terangkat 6 cm → tertahan & dikibaskan ±0,4 dtk → kembali → **ditancapkan** (menukik sedikit + getar kayon). Arah bergantian, kadang acak.
- Diukur: lompatan terbesar per frame 0,044 rad (dari getar kayon), sisanya mulus. Preview: `gunungan_v3_sapuan.mp4`.

## Audio gamelan (8 Nov 2026), atas persetujuan host (Q11, opsi b)
**Sumber.** Empat rekaman gamelan Solo milik host sendiri (izin aman). Rekaman mentah tidak di-commit; hasil olahannya ada di `public/audio`, dibangun ulang dengan `scripts/audio/build-audio.sh`.

| Berkas | Asal | Peran | Olahan |
|---|---|---|---|
| `gamelan/kebo-giro.mp3` (61 dtk) | "kebo giro" | Sambutan, diputar sekali setelah "Begin with gamelan", lalu crossfade 4 dtk ke keraton | −16 LUFS |
| `gamelan/keraton.mp3` (60 dtk) | "gamelan keraton" | Latar bab, diulang tanpa jeda (crossfade equal-power 4 dtk) | Noise paling tebal: lantai noise −51 → −64 dB, −16 LUFS |
| `gamelan/gendhing.mp3` (59 dtk) | "gendhing gamelan" | Momen murka & penutup, berakhir dengan gong | −16 LUFS |
| `sfx/gong-ageng.mp3` (6,3 dtk) | "suara gong", pukulan pertama | Gong dipukul | Bum +4 dB, "nong" lebih terang, sustain dinaikkan, puncak −1 dB |
| `sfx/keris-bangkit.mp3` | "sret" ElevenLabs + denting bilah & dengung pamor sintesis | Keris dicabut & bangkit | −17 LUFS |
| `sfx/api-naga.mp3`, `sfx/gunungan-balik.mp3` | Sintesis numpy (`synth_sfx.py`) | Napas api naga; gunungan dibalik ke sisi api | −16 LUFS |

Semua musik diolah dengan langkah yang sama: buang rumble (<26 Hz), kurangi noise, −1,5 dB di 280 Hz ("lumpur"), +1,5 dB di 3 kHz, kompresi sangat ringan, lalu kenyaringan disamakan (loudnorm 2 tahap, linear). Format MP3 karena satu-satunya yang diputar semua browser, termasuk Chromium tanpa codec proprietary yang dipakai e2e.

**Perilaku.**
- Tidak pernah berbunyi tanpa klik. "Begin quietly" tidak mengunduh satu byte audio pun.
- "Begin with gamelan": Kebo Giro (1,5 MB) diunduh lebih dulu; keraton & SFX baru diunduh setelah sambutan berbunyi.
- Level: gendhing 0,55, efek 0,9; gendhing turun ke 0,32 sebentar saat efek berbunyi.
- Tab disembunyikan → konteks audio dihentikan (hemat baterai); kembali → lanjut di titik yang sama.
- iOS 17+: kategori `playback`, jadi tetap berbunyi meski sakelar senyap aktif [V]. iOS lama mengikuti sakelar senyap.
- Menyalakan suara belakangan lewat toggle langsung masuk ke keraton (sambutan hanya di gerbang).

**Preview bersuara** (dicampur dengan `scripts/audio/mix_previews.py` memakai level, kurva, dan ducking yang sama dengan mesin audio; ±−16 LUFS, puncak ≤ −1 dB):
- `gong_v3.mp4` (diperpanjang ke 10 dtk supaya gong sempat berdengung lalu gelap): **gong penutup gendhing jatuh tepat di pukulan** (4,22 dtk), dilapis pukulan gong rekaman host + napas api naga. Gong rekaman gendhing dan gong SFX disejajarkan di titik mekar frekuensi rendahnya (keduanya diukur; tanpa ini selisihnya 138 ms dan terdengar seperti dua pukulan). Inilah makna gong ageng di film: menutup satu gongan.
- `keris.mp4`: keraton pelan di bawah; "sret" di ujung tarikan, denting bilah jatuh di 2,08 dtk (bilah lepas 2,0 → pamor menyala 2,15), dengung pamor mengikuti cahaya.
- `gunungan_v3_suara.mp4` (sapuan + balikan disambung, 6,3 dtk): keraton tenang + kibasan & "tancap" pelan saat sapuan dalang; diklik → kibasan terkeras tepat saat gunungan tampak tipis dari samping, dentum + api saat sisi api menghadap depan, dan gendhing rapat masuk menggantikan keraton.

## Satu tamu (9 Nov 2026), kabar host: "2 rekan tamunya tidak jadi ikut"
Permintaan host: masuk kode dan halaman utama harus terasa istimewa untuk satu orang.

- **Aturan privasi tetap:** nama tamu hanya di `trip_private.guest.party` (Supabase), tidak di repo, PRD, maupun bundle. Gerbang publik tidak boleh tahu namanya.
- **Gerbang sebelum kode:** *A private invitation* · *Enter the code written for you*. Benang emas turun dari atas layar ke judul (motif benang emas film) dan pendar blencong bernapas di belakang "Kulonuwun?" (token `loop.blencong`).
- **Setelah kode benar:** trip-data langsung diunduh (sekalian preload untuk Today). "Sugeng rawuh, **[nama]**." (nama berwarna prada, muncul dari blur), *This lakon was written for one guest.*, lalu **tiket pribadi** berayun masuk seperti tag yang digantung: *Admit one*, nama, TJQ → CGK → SOC, tanggal, kursi *With the host*, gate *Kulonuwun*. Kunjungan berikutnya: *Welcome back. Your seat is still saved.* Tim tidak disapa dengan nama tamu.
- **Today:** sapaan dari data privat (*Welcome, [nama]. This lakon was written for you.*), **hitung mundur** menurut kalender WIB (*N days until Solo* → *Tomorrow, Solo.* → *Today, Solo.*), tiket yang sama.
- **Boarding pass 3D** (`prototypes/boarding-pass/`): satu tag pada benang emas (tali verlet 18 titik + kartu kaku 4 titik; produksi: Rapier). Kartu nila 7,4 × 15 cm dengan cetak foil emas (metalness + timbul), tepi bersepuh, mata ayam kuningan, simpul benang melewati lubang. Depan: nama (pas satu baris otomatis), rute dengan benang bertitik dan pesawat kecil, info 2 × 2, perforasi, barcode foil, *Hosted by*. Belakang: kawung foil + **monogram inisial** + *Matur nuwun*. Bisa diseret; ditarik lalu dilepas → berayun, berputar memperlihatkan belakang, lalu tenang menghadap depan (puntir benang). Nama dibaca dari `window.__guestName` saat runtime, jadi preview bernama tidak di-commit; preview di repo memakai "Your Name".

## Animasi masuk kode, transisi, dan itinerary (9 Nov 2026), atas masukan host: "animasinya kurang banget"
**Revisi (9 Nov 2026), masukan host: "text reveal-nya masih template".** Blur-naik, flip per huruf, dan huruf acak diganti reveal yang lahir dari dunia lakon (`src/components/motion/Kinetic.tsx`):

| Reveal | Gerak | Dipakai di |
|---|---|---|
| **Bayang** | Huruf lahir sebagai bayangan wayang di kelir (hitam, besar, kabur) yang berkedip oleh blencong, menajam saat "didekatkan dalang", lalu dibalik ke sisi bercat dengan pendar emas. Urutan dari tengah ke luar. | "Kulonuwun?", "Sugeng rawuh", judul tiap hari (dengan kilat kelir kecil di belakangnya) |
| **Canting** | Kata digambar garis emas oleh ujung canting yang menyala (dengan tetes malam di belakangnya), lalu warna meresap naik seperti pewarna di kain mori. | Nama panggilan tamu, "for [nama]" |
| **Gamelan** | Kata dipukul masuk mengikuti irama tabuhan (ketukan tidak rata, aksen tiap empat ketuk), kata terakhir ditutup **riak gong**. | Ajakan gerbang, sapaan, subjudul hari, kalimat Film |
| **Benang** | Benang emas terjahit di bawah teks, tiap huruf ditarik naik saat benang lewat; benang tinggal sebagai garis tipis. | Kicker ("A private invitation", "Today"), label hari |
| **Gunungan** | Siluet kayon menyapu dari kiri ke kanan dan membuka judul di belakangnya (`wipe.gunungan`). | Judul Today & Film |

Stop itinerary "dirangkai" ke benang: titik fase meletup dulu, lalu isinya meluncur keluar dari benang. Semua teks tetap utuh di DOM (spasi biasa, bukan non-breaking) untuk pembaca layar, terjemahan, dan tes.

**Performa (9 Nov 2026), masukan host: "reveal-nya kurang smooth".** Diukur tanpa perekam (Long Animation Frames + jeda rAF, render 3× tanpa GPU): sebelum optimasi, momen kode benar → "Sugeng rawuh" punya 9 frame tersendat beruntun (67–100 ms) dan judul Today 2 frame (70–91 ms). Penyebab: animasi blur per huruf, `text-shadow`, warna, `clip-path`, `left`, `gap`, `background-position`. Sesudah: **0 frame > 50 ms** di keempat momen (sambutan, tekan Begin, judul Film, judul Today), diukur dua kali. Aturannya sekarang: **hanya opacity & transform yang dianimasikan**; efek mahal (blur bayangan, garis canting, kilau) digambar sekali di lapisannya sendiri, dan "membuka" teks memakai jendela geser (overflow hidden + translate berlawanan). Patah yang masih terlihat di video berasal dari perekam di server tanpa GPU; rekaman preview memakai teknik gerak lambat (waktu halaman diperlambat 4×, lalu video dipercepat kembali).

Yang tetap dari putaran pertama:
- **Kotak kode:** muncul berurutan; huruf meletup saat diketik; gelombang cahaya saat memeriksa; goyang + kilat merah saat salah; kode benar → kotak menyala, memipih jadi benang emas, kilat blencong membuka ke sambutan.
- **Sambutan:** tiket berayun + kilau foil; tempat tiket disiapkan (layout tidak meloncat).
- **Masuk ke itinerary:** stempel **"Admitted"** → tirai letterbox dengan garis emas → halaman berganti → tirai membuka; pukulan **gong** bila gamelan menyala.
- **Today:** hitung mundur bergulir, benang emas menjalar di antara stop dengan titik berwarna menurut fase.
- Reduced motion mematikan semuanya.

## Today, Fase 2 (9 Nov 2026), "lanjut fase 2, kerjakan semaksimal mungkin"
Today adalah layar yang dibuka tamu di jalan, jadi informasi datang dulu, seremoni belakangan.

- **Tiga wajah menurut kalender WIB** (`src/engine/today/schedule.ts`): *sebelum trip* = hitung mundur + tiket + checklist *Before you go* (dicentang di perangkat) + panduan Add to Home Screen; *selama trip* = kepala hari (Day N · tanggal, terbit/terbenam, dress code), kartu **Now / Next**, jadwal; *setelah trip* = epilog + tiket sebagai kenang-kenangan. Gerbang mengarahkan kunjungan ulang selama trip langsung ke Today, dan ikon Home Screen membuka Today.
- **Now / Next** berbentuk tiket kecil berlubang dengan pendar blencong: yang sedang berlangsung + sisa waktu + garis kemajuan; berikutnya + hitung mundur ("in 45 min", "Tomorrow, 04:00") + **jam jemput** dari data privat, terlihat tanpa ketukan. Malam hari, jadwal yang disorot otomatis pindah ke hari esok (subuh Hari 2 berangkat 04.00).
- **Jadwal**: pilihan hari (hari ini bertitik blencong), benang emas dengan titik fase, stop lewat diredupkan lewat warna (kontras tetap ≥ 4,5:1), chip dress code & makanan (Halal · tingkat manis · *No banana*), tombol Maps & salin alamat. Di HP, jam ditulis di atas judul supaya isi stop selebar layar.
- **Rain plan**: toggle; rencana hujan per stop muncul, dan hujan tipis turun di belakang jadwal (pola digambar sekali, yang bergerak hanya transform).
- **Dock bantuan** (revisi 10 Nov, lihat di bawah): WhatsApp host dengan pesan EN terisi, telepon, dan **SOS** (sheet bawah memakai `<dialog>` bawaan: fokus terkunci, Escape menutup, fokus kembali ke tombol). Isi sheet: 112/119/110, kontak (WhatsApp + telepon), alamat penginapan.
- **Offline**: service worker menyimpan halaman, JS/CSS, font Latin, manifest & ikon; data disimpan aplikasi per token. Indikator "Updated just now" / "Offline · saved …".
- **Pratinjau**: `/today/?at=2027-04-08T10:45` memutar Today ke momen itu (jam WIB) supaya host bisa melihat wajah "selama trip" sebelum April.
- **Ikon Home Screen**: gunungan prada di atas nila dengan pendar blencong (`public/icons/`), aman untuk masker ikon Android.
- **Anggaran JS**: 150 KB gz / 129 KB br. Target PRD 120 KB gz lebih kecil dari kerangka React + Next sendiri (≈ 119 KB gz), jadi yang dijaga adalah kode aplikasi (≈ 20 KB br): mesin audio dan kamus lengkap dikeluarkan dari chunk layout.

## Tombol Today (10 Nov 2026), masukan host: "button UI + logonya belum cocok, buat lebih modern dan elegant"
Acuan host: *button placement* (pola baca HP: aksi di bawah, utama paling menonjol; form: utama di kiri; modal: tutup di kanan atas), *font size & padding* (HP 14–16 pt; padding 12 di sisi ikon, 20 di sisi teks), *sizes & spacing* (tinggi 40, target sentuh 44/56).

- **Tombol tekan 3D** (`.pb`, `src/components/motion/PressFx.tsx`): wajah tombol duduk di atas "tebal" 3–5 px; saat ditekan (jari, mouse, Spasi/Enter) wajah turun ke tebalnya dan bayangan lembut meredup serta merapat, lalu memantul kembali. Ketukan secepat apa pun tetap terlihat ditekan minimal 110 ms. Tombol utama & SOS memberi getar halus di Android. Hanya transform & opacity yang bergerak. Varian: emas (utama), nada-emas (Maps, WhatsApp di sheet), kaca nila (sekunder), merah lampion (SOS & nomor darurat).
- **Dock**: kiri → kanan = WhatsApp host (tombol utama paling lebar, 56 px, label kecil "WHATSAPP" di atas nama), telepon host (ikon 56 px), **SOS**. Tanpa kontak di data, dock hanya berisi SOS.
- **Ikon** baru satu gaya (garis 1,6, ujung bulat, `src/components/Icons.tsx`): obrolan, telepon, sirene, pin, salin → centang setelah tersalin, tutup.
- **Jadwal**: Open in Maps (utama, kiri) · Copy address (sekunder, kanan), tinggi 40 px, celah 10 px.
- **Sheet SOS**: judul kiri atas, tombol tutup di kanan atas; nomor darurat sebagai tombol merah besar 86 px; tiap kontak: WhatsApp (kiri) + Call (kanan).
- **Tanpa translator** (rekan tamu tidak jadi berangkat; host yang menerjemahkan): kontak translator dihapus dari rancangan, teks Pasar Klewer jadi "your host has your back" (konten Supabase ikut diperbarui).
- Nomor telepon dinormalkan ke +62 supaya bisa dipanggil dari SIM mana pun; nomor darurat pendek tetap apa adanya.

## Satu bahasa tombol untuk seluruh alur (10 Nov 2026), "benerin semua button UI-nya, dari masukin kode sampai sekarang, sesuain sama temanya"
- **Satu sistem** (`.pb` + `PressFx`) dari gerbang sampai Today: emas prada (utama; tombol utama besar bertekstur **kawung** tipis), kaca nila bergaris rambut emas (sekunder), nada-emas (Maps), merah lampion (SOS). Saat ditekan wajah tombol turun ke tebalnya, bayangan meredup, dan **cahaya blencong** menyala dari atas wajah tombol lalu meredup pelan.
- **Sakelar yang menyala tetap tertekan**: pilihan hari, Rain plan (rona hujan nila muda), speaker (emas).
- **Sakelar segmen 3D** untuk EN/ID dan iPhone/Android: lintasan dipahat ke dalam, kunci emas timbul bergeser ke pilihan aktif dan ikut tertekan saat disentuh.
- **Pengaturan di kanan atas**: [speaker] [EN | ID]. Speaker tidak lagi melayang di atas isi halaman.
- **Kotak kode** jadi celah yang dipahat (bayangan dalam, bibir emas); huruf "diletakkan" ke dalamnya.
- **Sambutan**: "Use a different code" pindah ke kiri atas (pil kecil berikon kunci); tombol mulai menempel di bawah layar di atas gradasi, tiket tetap bisa di-scroll.
- **Satu tombol mulai** (revisi host: "click langsung muncul gamelan, tapi fitur mute jangan dihilangkan"): "Begin the lakon" / "Mulai lakonnya" dengan ikon gong. Speaker sudah tampil sejak sambutan (bawaan menyala, diingat); di-mute sebelum mulai → lakon dimulai hening tanpa mengunduh audio.
- Checklist *Before you go*: kotak centang jadi tombol kecil 3D yang tertekan dan menyala emas.
- Film: "Open Today" emas berkawung berikon kalender. Today: "Try again", "Watch the film" (ikon putar), "Refresh". 404: "Back to the gate".
- Lighthouse a11y 100 di gerbang, sambutan, film, dan Today (EN & ID).

## Bunyi klik tombol (10 Nov 2026), permintaan host: "SFX click button, jangan pakai yang lama"
- Tiga bunyi baru, diputar saat jari **menyentuh** tombol (bukan saat dilepas) dan **hanya bila gamelan menyala**; di-mute → hening:
  - `ui-pop` (tombol emas & SOS), `ui-click` (tombol kaca/sekunder): dari paket SFX yang dibawa host. Host menyatakan paket itu bebas lisensi dan sudah mendapat izin kreatornya lewat DM (10 Nov 2026). Bukti izin disimpan host, di luar repo.
  - `ui-tok` (sakelar: EN/ID, Rain plan, pilihan hari, checklist, speaker): ketukan keprak dalang, dibuat dengan ElevenLabs (paket gratis, 50 kredit).
- Masing-masing < 4 KB, dimuat bersama SFX lain setelah sambutan berbunyi; volume 0,45 dan tidak merendahkan gendhing. Bisa ditimpa per tombol lewat `data-sfx`.

## Film 2D, F1 (10–11 Nov 2026), "lanjut F1"
Film kini bisa ditonton dari prolog sampai credits di `/film/`. Lapisan ini sekaligus menjadi tier **Static** dan **Calm**; panggung 3D (F2) nanti dipasang di belakangnya dan digerakkan oleh sumber kemajuan yang sama.

**Susunan.** `buildFilm()` (`src/engine/slides/build-slides.ts`) memetakan respons trip-data menjadi ±50 slide: prolog (hero, pembuka, 5 fakta kota, rute + penghitung, tim, frasa Jawa, kartu kedatangan) → tiap hari (kartu judul berletterbox, intro, gallery menyamping, gong penutup yang menunjuk hari berikutnya) → epilog (penutup, kartu kepulangan, tiket + Open Today / Add to Home Screen / pesan ke host) → credits. Tidak ada teks itinerary di bundle.

**Mesin.** Tiga bagian murni yang dites tanpa browser:
- `controller.ts`: state machine diam / scrub / transisi. Maksimal satu langkah diantrekan (sisa transisi dipercepat 1,8×); roda dan trackpad dibuang sampai transisi 80%; arah berlawanan membalik transisi di tempat; scrub jari lanjut di 35% atau sentakan searah.
- `input.ts`: `WheelGestures` mengenali gerakan dari amplop kecepatan (naik → puncak → meluruh), bukan sekadar kunci waktu. Langkah baru hanya dari jeda, balik arah, atau dorongan yang naik jelas di atas dasar peluruhan (paling cepat 450 ms setelah langkah sebelumnya). Event yang digabung browser saat thread utama tersendat dikenali dari kecepatan rata-ratanya dan tidak dihitung gerakan baru.
- `timeline.ts`: transisi di atas Web Animations dengan lintasan berupa angka, sehingga bisa mengikuti jari, dilanjutkan dari posisi jari, dibalik di tengah jalan, dan kemajuannya dibaca dari jam yang sama (`progress()`, untuk kamera 3D).

**Empat rupa transisi** (`src/components/film/transitions.ts`), semuanya hanya `opacity` dan `transform`:
| Rupa | Kapan | Gerak |
|---|---|---|
| slide | antar slide dalam satu bab | lapisan lama memudar naik, lapisan baru masuk dari arah perjalanan, 1,1 dtk `power3.inOut` |
| inner | di dalam gallery | rel kartu bergeser satu kartu, kartu aktif menyala, tetangganya meredup, 0,9 dtk |
| wipe | antar bab dan lompatan | bayangan kayon (gapura, pohon hayat, tatahan) menyapu layar; isi berganti saat intinya menutup, 1,6 dtk |
| fade | Calm / reduced motion | crossfade 0,45 dtk, tanpa scrub dan tanpa reveal |

**Keputusan yang berbeda dari PRD** (alasan teknis, sesuai §8 serah-terima):
- **Tanpa GSAP dan Lenis di F1** (hibrida, disetujui host 10 Nov). Transisi DOM lewat Web Animations berjalan di compositor, jadi teks tetap mulus saat WebGL membebani thread utama. GSAP masuk di F2 untuk koreografi kamera dan adegan 3D. Scroll sheet detail dan credits memakai scroll bawaan.
- **Scrub hanya untuk sentuhan.** Browser tidak memberi tahu kapan jari terangkat dari trackpad, jadi gesekan trackpad dihitung satu langkah (dengan pengenalan inersia di atas), bukan diikuti seperti jari di layar.
- **Sapuan gunungan memakai bayangan yang menutup layar**, bukan mask `clip-path`: aturan performa hanya mengizinkan opacity dan transform.
- **Shared element panel → sheet memakai FLIP**, bukan View Transitions. View Transitions memotret seluruh halaman dan terukur 83 ms per frame tanpa GPU; FLIP (satu animasi transform pada judul, selaras dengan gerak sheet) 33 ms dan jalan di semua browser.
- **Gallery 9, 8, dan 9 panel** (PRD: 5–8). Tamu minta semua stop tampil; istirahat, transfer, dan ibadah dilebur sebagai catatan "First / Then" di panel tetangganya.
- **Panel tanpa foto.** Foto masih 0 (Tugas 6), jadi semua panel berbentuk poster tipografi: jam besar, lukisan garis fase (matahari naik / tinggi / turun, bulan sabit), nama, alasan, chip. Bila manifest berisi foto untuk `stop.photo`, foto itu tampil di kepala kartu.
- **Bayang kini mengelompokkan huruf per kata** (komponen bersama gerbang dan Today): judul panjang hanya patah di spasi. `textContent` tetap sama.

**Langit** (gerbang, subuh, siang, senja, malam) digambar sekali per lapisan dan hanya opacity-nya yang berganti. Di gallery kadarnya dihitung dari jam stop, lihat "Siklus waktu di gallery" di bawah. Slide berteks rendah mendapat bidang gelap lembut supaya kontras terjaga di langit terang.

**Reveal teks** baru berjalan saat penonton tiba (±450 ms setelah transisi dimulai; saat sapuan kayon lewat tengah layar). Lapisan tetangga dipasang lebih dulu dalam keadaan tersembunyi supaya transisi bisa langsung mulai.

**Kehalusan** (`node scripts/preview/measure-film.cjs`, Chromium tanpa GPU, 11 Nov 2026): **0 frame > 50 ms** di 10 momen desktop dan 11 momen iPhone (hero, slide maju/mundur, sapuan kayon, masuk gallery, geser panel, scrub jari, buka/tutup sheet, gong → bab berikutnya). Frame terpanjang 33 ms. Dua perbaikan yang membuatnya tercapai: lapisan slide tanpa `will-change` (sebelumnya 60–78 ms saat reveal teks mulai), dan FLIP menggantikan View Transitions.

**Uji.** 80 unit test baru (mesin slide, jejak roda/trackpad tiruan, lintasan, pemetaan data termasuk konten Solo: tiap stop tampil tepat sekali) dan 39 e2e (`e2e/film.spec.ts`, desktop + iPhone).

**Siklus waktu di gallery (revisi 11 Nov 2026, dari audit host).** Sebelumnya langit berganti sekali per fase stop dan mataharinya bagian dari gambar latar siang, jadi ia melompat. Sekarang (`src/engine/slides/sky.ts`, murni dan dites):
- Tiap panel membawa jam stop-nya (`clock`) dan cahaya hari itu (`light`: jam terbit, terbenam, dan kapan matahari mulai tampak). Intro hari memakai jam panel pertama, jadi warna langit tidak berganti saat masuk gallery; mataharinya sendiri hanya digambar di gallery.
- **Satu elemen matahari** (`.fl-sun`) bergerak di pita langit di atas kartu: kiri → kanan = terbit → terbenam, busurnya tertinggi di tengah hari, dan ia terbit serta terbenam di balik tepi atas kartu. Menjelang cakrawala ia membesar dan menghangat jadi jingga. Ukuran pita diatur CSS (`.fl-sunbox`), letaknya dalam persen pita, jadi sama di HP, desktop, dan layar mendatar.
- **Aturan host: matahari muncul perlahan mulai dari jadwal pertama setelah sarapan.** Sarapan dikenali dari data sebagai panel makan pertama hari itu yang mulai sebelum 10:00. Di hari yang dibuka dengan sarapan (Hari 1 dan 3), matahari tak tampak sampai jam itu, lalu memudar masuk sambil naik selama perpindahan ke panel berikutnya.
- **Hari yang punya jadwal sebelum sarapan (keputusan host 11 Nov, Hari 2):** matahari mengikuti jam terbit yang sebenarnya. Panel yang melewati jam terbit ("Matahari terbit di Kemuning", 05:15–06:30, terbit 05:35) memakai langit 20 menit sesudah terbit, jadi matahari jingga sudah menyembul rendah di timur, lalu penuh saat sarapan. Hari tanpa sarapan di data juga mengikuti jam terbit.
- **Warna langit mengikuti jam yang sama.** Kadar lapisan subuh, siang, dan senja linear di antara titik-titik waktu relatif terhadap terbit/terbenam (`SKY` di tokens), jadi pagi makin terang dan sore makin jingga dari panel ke panel, bukan sekali ganti.
- **Bergerak bersama slide.** Perpindahan panel = jam berjalan dari stop asal ke stop tujuan, dicuplik jadi titik kunci untuk `Timeline` yang sama dengan rel kartu. Hasilnya matahari ikut jari saat scrub, diam saat jari diam, dan berhenti bersama slide; transisi penuh memakai kurva yang sama dengan rel.
- Lapisan yang tertutup penuh oleh lapisan di atasnya tidak digambar (`skyCovered`), supaya jumlah lapisan selayar yang dikomposisi tetap kecil.
- Slide tanpa jam (prolog, judul, gong, kartu kedatangan/kepulangan) dan hari tanpa jam terbit/terbenam tetap memakai langit fase seperti sebelumnya. Calm: tanpa gerak, matahari memudar lalu muncul di letak barunya.
- Terukur (Chromium tanpa GPU, iPhone tiruan): selama scrub ditahan, matahari bergeser 0 px di 36 frame berturut-turut; di transisi penuh tidak ada langkah mundur dan lompatan terbesar per frame 2,6 px.

**Gallery 2,5D (11 Nov 2026, permintaan host).** Arti yang dipilih host: kedalaman berlapis di film yang sudah ada, gallery dulu, tetap DOM dengan `transform` dan `opacity` (bukan WebGL; panggung 3D tetap F2). Nilainya di `DEPTH` (`src/engine/motion/tokens.ts`), CSS membacanya lewat variabel `--depth-*`.
- **Rel kartu di ruang berperspektif** (1100 px). Kartu aktif menghadap penonton; tetangganya 110 px lebih jauh dan berpaling 14° seperti panel di drum yang berputar (tepi luarnya menjauh). Saat pindah panel, kartu yang datang "membuka" dari miring ke datar dan kartu yang pergi berpaling. `Timeline` mendapat dua saluran baru, `z` dan `rotateY`, tetap satu `transform`, jadi geraknya ikut jari saat scrub seperti yang lain.
- **Parallax latar.** Bukit dipisah dari lapisan warna langit menjadi dua elemen (`.fl-hills`). Bukit dekat bergeser sedikit tiap pindah panel (26% lebarnya selama satu hari), lebih lambat daripada kartu; bukit jauh diam bersama langit; matahari berjalan menurut jam. Jadi ada empat bidang yang geraknya berbeda: langit dan bukit jauh, matahari, bukit dekat, kartu.
- **Bayangan kontak** di bawah tiap kartu, supaya kartu terasa melayang di atas lanskap.
- **Calm tetap datar:** tanpa perspektif dan tanpa parallax (crossfade memudarkan seluruh rel, dan opacity pada rel meratakan ruang 3D-nya).
- Kenapa bukit jauh tidak ikut bergeser: terukur. Tiap lapisan selayar yang ikut digeser memberatkan frame di Chromium tanpa GPU, sedangkan perspektif kartu hampir tidak. Bukit dekat juga dijadikan lapisan tetap selama di gallery supaya tidak digambar ulang di tiap perpindahan.
- Kehalusan (`measure-film.cjs`, 11 Nov): iPhone tiruan 0 frame > 50 ms, terpanjang 17 ms. Desktop tanpa GPU: p95 33 ms saat pindah panel, dan di sebagian pengukuran ada satu frame 50–67 ms (sebelum 2,5D: 0 frame > 50 ms). Perlu dilihat di MacBook asli; di perangkat ber-GPU lapisan sebanyak ini ringan.
- Belum: kedalaman di slide selain gallery (menunggu tinjauan host), kedalaman di dalam kartu (lukisan fase dan teks pada bidang berbeda), dan kemiringan yang mengikuti kursor atau giroskop.

**Belum, dan perlu perangkat nyata:**
- Kalibrasi ambang di trackpad MacBook dan Safari iPhone (jejak di tes adalah model, bukan rekaman). Semua ambang ada di `SLIDE` dan `INPUT` (`src/engine/motion/tokens.ts`).
- Web Animations di Safari belum teruji di sini (hanya Chromium tersedia).
- ~~Lighthouse a11y untuk film belum dijalankan.~~ Dijalankan 11 Nov (Lighthouse 13.6, data tiruan): 100 di 16 layar × EN/ID × HP/desktop. Kontras teks di atas gradasi langit tidak bisa dinilai Lighthouse; itu tetap perlu dilihat di perangkat nyata.
- Gong masih cakram 2D tanpa bunyi (F3); audio per adegan (Tugas 36); slide tim hanya muncul bila kontak sudah diisi di `trip_private`.

## Home 2,5D dengan desain baru (11 Nov 2026), permintaan host: "upgrade home ke 2,5d", lalu "ganti aja design nya, button juga"

Home = halaman `/` (gerbang kode dan sambutan). Arti 2,5D sama dengan gallery: kedalaman berlapis, DOM dengan `transform` dan `opacity`, bukan WebGL. Nilainya di `HOME` (`src/engine/motion/tokens.ts`), CSS membacanya lewat variabel `--hm-*` dan `--k-*`. Gayanya di `src/components/home/home.css`, terpisah dari `globals.css`.

- **Panggung** (`home/Scene.tsx`). Dari belakang ke depan: langit malam berbintang dengan pendar blencong, punggung Lawu (kakinya lebih pucat, kesan kabut), perbukitan, lantai pendapa bermotif kawung yang direbahkan dengan perspektif, dua kayon penjaga, debu emas. Lima bidang bergeser dengan jarak berbeda saat kursor bergerak (10, 18, 28, 34, 54 px di tepi layar); langit dan bintang diam. Di layar sentuh tidak ada kursor, jadi bidang-bidang itu berayun pelan lewat CSS (16 dtk bolak-balik). Panggungnya satu untuk gerbang dan sambutan; saat kode benar kayon tinggal menyibak, adegan tidak diulang.
- **Kartu tergantung** (`Hang`). Undangan dan boarding pass tergantung di benang emas, berayun masuk seperti bandul (titik gantung 70vh di atas kartu), lalu miring mengikuti kursor (paling banyak 7° dan 4,5°). Di dalam kartu ada tiga bidang: alas, isi (22 px di depan), cap (40 px di depan), ditambah bayangan 80 px di belakang, jadi saat miring semuanya bergeser satu terhadap yang lain. Sudut kartu berlekuk seperti tiket; tepinya emas 1 px.
- **Kode.** Dua baki berlekuk (3 + 6 sel) dengan titik emas di sel kosong, supaya jumlah huruf terbaca sebelum mengetik. Huruf jatuh dari depan; memeriksa = huruf bergelombang; salah = goyang dan cincin merah lampion; benar = huruf menyala berurutan, kayon menyibak, kilat blencong, kartu berbalik 90° dan boarding pass berbalik masuk.
- **Sambutan.** Boarding pass baru (`home/Pass.tsx`): mendatar dengan sobekan di layar ≥ 640 px, tegak di HP. Cap "Admitted" jatuh dari depan saat lakon dimulai. Kunjungan ulang memakai tunda 0,35×. Judul tidak lagi pecah di tanda baca di HP ("Sugeng rawuh," lalu nama).
- **Tombol baru (`.hb`).** Utama: kapsul foil gading-emas dengan medali gong di kanan; kilau menyapu saat disorot, mengecil sedikit saat ditekan. "Use a different code": tautan berbenang emas, pindah dari kiri atas ke bawah tombol utama. Speaker: cincin tipis, emas saat menyala. Bahasa: kapsul bergaris dengan kunci gading (`Seg` varian `line`). Sejak 14 Nov bahasa kapsul ini juga dipakai Today (lihat "Today 2,5D"); film tetap `.pb`.
- **HP.** Kartu di paruh atas layar supaya tidak tertutup keyboard; puncak Lawu dan kayon terlihat di bawahnya. Tombol utama menempel di bawah layar.
- **Reduced motion.** Tanpa parallax, ayunan, atau debu bergerak; sambutan langsung tampil.

**Kenapa begini (terukur).** Tanpa GPU, tiap lapisan selayar tambahan dan tiap `filter` memberatkan semua frame. Versi pertama berjalan 29 ms per frame saat diam di desktop. Dua perubahan mengembalikannya ke 17 ms: (1) langit, pendar, bintang, dan vinyet digabung jadi satu lapisan dasar, lantai dipersempit ke ukuran yang benar-benar terlihat; (2) bayangan kartu memakai `box-shadow` yang digambar sekali, bukan `filter: blur` yang dihitung ulang compositor di tiap frame (sendirian menghabiskan separuh frame).

**Hasil ukur** (`scripts/preview/measure-home.cjs`, Chromium tanpa GPU, 11 Nov): iPhone tiruan 0 frame > 50 ms di enam momen, terpanjang 33 ms. Desktop: diam 17 ms, p95 33 ms di semua momen; masih ada 1–2 frame 50–83 ms saat gerbang berganti jadi sambutan (React memasang sambutan, tertutup kilat blencong). Lighthouse a11y 100 di gerbang, mengetik, kode salah, dan sambutan (EN/ID, HP/desktop).

**Belum.** Safari belum diuji (`preserve-3d`, mask sudut lekuk). Kemiringan mengikuti giroskop di HP belum ada. Gaya tombol baru belum dipakai di Today dan film.

Pratinjau: `docs/design/previews/home_25d_desktop_en.jpg`, `home_25d_hp_id.jpg`, `home_sebelum_sesudah_desktop.jpg`. Video gerak lambat direkam dengan `scripts/preview/record-home.cjs`.

## Sesi per tab (11 Nov 2026), keputusan host

Host: "udah gw reset browser tapi masih masuk tanpa nulis pw, udah buka tab baru juga masih masuk". Sebelumnya token disimpan permanen (PRD FR-03 lama). Dari tiga pilihan, host memilih: **kode diminta lagi di tiap tab atau browser baru; Today yang dipasang ke Home Screen tetap ingat.**

- Tab browser biasa: sesi dan salinan trip di `sessionStorage`. Muat ulang di tab yang sama tetap masuk.
- Aplikasi Home Screen (`display-mode: standalone` atau `navigator.standalone`): tetap `localStorage`, karena Today harus bisa dibuka offline (FR-33) dan verifikasi kode butuh jaringan. Sesinya bertanda `app: 1`.
- Sesi permanen lama dihapus bersama salinan trip-nya saat halaman dibuka. Yang bertanda `app` dibiarkan, karena di Android penyimpanan aplikasi dipakai bersama tab browser.
- Akibat untuk tamu: Today di tab browser biasa meminta kode tiap tab baru dan butuh sinyal. Untuk dipakai di jalan, Today perlu dipasang ke Home Screen.
- Kode: `src/lib/device-store.ts`, `sweepLegacy` di `src/lib/session.ts`. PRD FR-03 sudah diperbarui.

## Panggung 3D, fondasi (12 Nov 2026), arahan host: "upgrade panggung 3D semaksimal mungkin", "step by step (output) per task"

Tugas 5 di `CLAUDE.md`: kanvas, mesin film 3D, tier kualitas, pemantau FPS, dan latar pertama (pendapa, blencong, lanskap, langit). Gong, gunungan, benang emas, dan diorama per bab menyusul di Tugas 6–12; sampai itu jadi, gong, gunungan, dan boarding pass yang tampak masih versi DOM/CSS di atas kanvas, dan tengah pendapa masih kosong.

**Film 2,5D tidak dibuang.** Ia menjadi tier Static. Kanvas WebGL diletakkan di atas langit 2,5D dan di bawah grain serta teks; begitu frame pertamanya tergambar ia memudar masuk (0,9 dtk), lalu langit 2,5D tidak digambar lagi. Teks itinerary tetap DOM di atas kanvas (FR-12). Film tetap 2,5D bila: Calm atau reduced motion, tanpa WebGL2, renderer perangkat lunak, bundle 3D gagal dimuat, konteks WebGL hilang, atau terlalu berat bahkan di tier terendah.

**Tiga lapis kode.**
- `src/engine/stage/` murni (tanpa DOM, tanpa three), jadi bisa dites: `tier.ts`, `shots.ts`, `mood.ts`, `cue.ts`, `terrain.ts`.
- `src/components/film/StageMount.tsx`: pintu yang ringan, tanpa three. Menebak tier, memuat bundle 3D dengan `import()`, dan memutuskan kapan kembali ke 2,5D.
- `src/components/film/stage3d/`: three + React Three Fiber, hanya diunduh di `/film/` saat 3D dipakai. Gerbang dan Today tidak memuatnya (dijaga e2e).

**R3F hanya memasang kanvas.** Dunia, loop, dan gambar per frame ada di `stage3d/runtime.ts`, di luar React, dengan `frameloop="never"` dan loop sendiri. Alasannya dua: aturan lint React melarang mengubah nilai dari dalam komponen, dan loop sendiri bisa berhenti saat tab tersembunyi serta menggambar tiap dua frame saat diam di tier Low.

**Tanpa drei, tanpa pustaka post-processing, tanpa tekstur.** Rantai post ditulis sendiri (`stage3d/post.ts`): target HDR half float, bloom bertingkat dengan ambang di atas putih (hanya nyala, matahari, dan lampu yang berpijar), ACES, sRGB, dither. Semua pola (kawung lantai, lung-lungan saka, petak sawah, bintang) digambar shader, jadi tajam di layar retina dan tidak ada gambar yang diunduh.

**Satu sumber waktu dengan DOM.** `Director.cursor()` memberi letak film (slide asal, tujuan, kemajuan transisi); `createCues` mengubahnya menjadi shot kamera dan keadaan langit. Jendela pergantian langit (`SKY_WINDOW`) dipakai `transitions.ts` dan panggung 3D, jadi keduanya berganti warna di saat yang sama.

**Shot kamera** (`shots.ts`): satu shot per jenis slide, dalam dua rumpun.
- Orbit, mengitari pusat panggung: hero, pembuka, intro, fakta (tiap fakta satu sudut, dari kiri ke kanan), tim, frasa, judul hari, gong, epilog, boarding pass.
- Vista, dari tepi belakang pendapa memandang dataran dan Lawu: rute, kartu kedatangan dan kepulangan, intro hari, gallery, credits (mendongak ke bintang).
- Perpindahan: orbit ke orbit lewat busur (tidak menembus tengah panggung), orbit ke vista melengkung ke atas, di dalam gallery lurus menyamping, dan saat sapuan gunungan kamera dipotong di tengah.
- Layar tegak: lensa dilebarkan sampai 56°, sisanya kamera mundur sampai lebar gayor gong muat, dan kamera mendongak sedikit supaya lantai tidak memenuhi separuh layar di belakang teks.

**Matahari dan langit menyalin film 2,5D.**
- Matahari 3D jatuh di titik layar yang sama dengan matahari 2,5D: lintasannya diukur dari `.fl-sunbox`, dan Lawu ditaruh menurut lintasan itu supaya kedua ujungnya (terbit dan terbenam) tetap rendah.
- Film 2,5D membentangkan gradien langit dari kaki sampai puncak layar, sedangkan kamera 3D hanya melihat ±10° langit di gallery. Karena itu ketinggian pada gradien dikalikan per shot (`skyStretch`): tepi atas layar selalu jatuh di bagian gelap, sehingga label hari tetap terbaca.
- Arah cahaya dihitung terpisah dari letak matahari di layar (`lightElevation`): rendah saat terbit dan terbenam, tinggi di tengah hari.
- Warna langit, cahaya, kabut, bintang, dan kuat blencong diturunkan dari kadar lapisan langit yang sama (`mood.ts`).

**Tier** (`tier.ts`):

| Tier | Batas DPR | MSAA | Tingkat bloom | Partikel | Saat diam |
|---|---|---|---|---|---|
| High | 2 | 4× | 5 | penuh | tiap frame |
| Medium | 1,5 | 2× | 4 | separuh | tiap frame |
| Low | 1 | tanpa | 3 | 15% | tiap dua frame |
| Static | film 2,5D | | | | |

- Tier awal ditebak dari nama GPU. HP flagship sengaja mulai dari High; memori ≤ 2 GB atau ≤ 2 inti mulai dari Low.
- Pengatur FPS: rata-rata < 50 fps selama ±3 dtk → turun satu anak tangga (resolusi dulu, baru efek); stabil ≥ 58 fps → naik lagi sesudah jeda; anak tangga yang terbukti berat tidak dicoba ulang; layar 30 Hz (Low Power Mode) dikenali dan tidak dianggap berat; di bawah 20 fps pada anak tangga terendah → Static.
- `?stage=high|medium|low|static` memaksa tier (pengatur hanya mengukur) dan `?fps` menampilkan overlay. Keduanya untuk uji.
- Bayangan dinamis dan depth of field sudah punya tempat di spesifikasi tier tetapi **belum dipakai**; itu pekerjaan Tugas 8.

**Angka terukur** (Chromium tanpa GPU, desktop 1440×900 @2x, `scripts/preview/measure-stage.cjs`): 11–19 draw call dan ±25 ribu segitiga per frame di semua slide; CPU thread utama 0,4–1,3 ms per frame saat diam (anggaran 60 fps: 16,7 ms). Bundle 3D menambah 943 KB mentah (251 KB gzip) di atas 606 KB (188 KB gzip) film 2,5D; sebagian besar three, yang tidak bisa dipangkas karena R3F mengimpor seluruh namespace-nya.

**Yang belum diketahui.** fps di perangkat nyata. Sesi kerja tidak punya GPU, jadi target ≥ 55 fps di HP flagship hanya bisa diukur host dengan membuka `/film/?fps`. Belum diuji di Safari, iPhone, atau MacBook.

## Gong ageng 3D di panggung (12 Nov 2026), arahan host: "remodel/redesign gong kan? kerjakan", "per tugas output dulu, step by step"

Tugas 6 di `CLAUDE.md`, dikerjakan bertahap. Bagian ini mencatat langkah 1–3 (mesin, model, dan pukulan beserta bunyinya). Atas arahan host 12 Nov malam ("lewati keris dan batara kala, lanjut langsung ke gunungan"), Batara Kala dan keris tidak dikerjakan di tugas ini; kepingan bara di prolog ikut ditunda.

**Acuan dan yang diubah.** Bentuk dan perilakunya mengikuti prototipe "Gong Murka" yang disetujui host 8 Nov (`prototypes/gong/scene.js`): profil badan (pencu, leher, dua punggung recep, pundak, bau), gayor berlak merah dengan dua naga prada di ujung palang, tabuh berbantal kain, jantung bara di pencu. Cara menggambarnya ditulis ulang: prototipe memakai bahan bawaan three, tekstur kanvas 2048 px, bayangan dinamis, dan ±69 ribu segitiga hanya untuk badan gong.

**Tiga draw call, tanpa tekstur.** Badan gong satu jala (52 titik profil × 88 juring, ±14 ribu segitiga); gayor, kedua naga, tali, cincin, dan cantolan satu jala; tabuh satu jala. Bahan (lak, prada, sisik, tulang, bara, tali, kayu, kain) dibedakan di shader lewat atribut `aTag`, bukan lewat material terpisah. Tambahan beban: ±25 ribu segitiga dan 3 draw call, hanya saat gong terlihat; saat kamera memandang lanskap (gallery) gong ada di belakang kamera dan tidak digambar (dijaga e2e).

**Perunggu.** Semua detail dihitung di shader dari letak di muka gong: bekas tempa (sel Voronoi, kemiringannya dihitung langsung tanpa cuplikan tambahan), garis bubut di pencu dan punggung recep, patina kehijauan di tempat yang jarang tersentuh, pencu dan punggung recep yang mengilap karena sering tergosok. Detail yang lebih kecil dari satu piksel dipudarkan supaya tidak berkedip saat kamera bergerak. Karena langit malam nyaris hitam, pantulan logam tidak diambil dari langit saja: `stageEnv` menghitung lingkungan dari langit, lantai yang disinari blencong, dan pendar di sekitar arah lampu.

**Bayangan tanpa shadow map.** Shader lantai memotong sinar dari tiap titik lantai ke blencong dengan bidang gayor; di bidang itu rakitan cukup diwakili bentuk 2D (cakram gong, dua tiang, palang, dua naga). Tepi bayangan makin lembut makin jauh jatuhnya. Biayanya beberapa operasi per piksel lantai, sama di semua tier.

**Yang diubah dari prototipe, dan alasannya.**
- **Tabuh digantung di cantolan tiang kanan**, tegak. Di prototipe tabuh melayang miring di udara; di adegan film itu terbaca sebagai benda yang lupa ditaruh. Saat dipukul tabuh lepas dari cantolan dan diayun dari titik yang sama dengan prototipe.
- **Poros ayun gong di sisi bawah palang**, tempat talinya diikat, jadi tali dan gong berayun sebagai satu benda. Di prototipe porosnya di tengah tali dan talinya diam. Simpangan di pusat gong dipertahankan (±3,8 cm); periodenya 1,8 dtk (prototipe 1,6) karena bandulnya lebih panjang.
- **Gelang naga digambar shader** (sisik prada berselang gelang lak), bukan cincin geometri: lebih hemat dan tepinya tetap tajam.
- **Gigi bawah naga berdiri di rahangnya.** Di prototipe gigi itu melayang di bawah rahang (tidak terlihat dari jarak prototipe).
- **Kamera terhentak dan bergetar saat gong kena, tetapi halus.** Audit host 8 Nov meminta "kamera diam, tanpa getar"; host 12 Nov malam: "pasang aja, asal lebih smooth dari yang kemarin". Getar lama (prototipe) langsung muncul dengan simpangan penuh dan bergetar 9–11 Hz. Yang sekarang (`cameraKick` di `src/engine/stage/gong.ts`): naik dari nol dengan kecepatan nol (frame pertama di 60 fps baru ±seperempat jalan), hentakan = kamera mundur ±1% jaraknya dalam ±0,08 dtk lalu berayun balik sekali (±sepertiga) seperti pegas berperedam, getar = sinus 3,6–4,8 Hz yang meluruh dalam ±1,5 dtk, paling jauh ±0,6% tinggi layar. Rumus tertutup dari detik sejak hantaman, jadi sama di laju frame berapa pun; pukulan beruntun dijumlahkan sehingga tidak melompat. Simpangan getar dihitung dalam ukuran layar, jadi sama di layar lebar dan tegak. Teks dan tombol (DOM) tidak ikut bergetar.

**Pukulan (langkah 3).**
- **Satu pemicu.** Lapisan DOM memanggil `stageBus.strikeGong()` (`src/engine/stage/bus.ts`, tanpa three). Otomatis 0,26 dtk sesudah tamu tiba di slide gong penutup hari (keputusan host 12 Nov: "otomatis dan manual"), dan manual lewat tombol `.fs-strike` (klik, tap, Enter). Geseran jari yang dibatalkan tidak dihitung tiba. Pukulan baru ditolak sampai tabuh kembali menggantung (1,5 dtk sejak diayun), jadi ketukan beruntun tidak menumpuk.
- **Garis waktu** sama dengan prototipe: ancang-ancang, jeda, ayunan makin cepat, kena pencu di 0,52 dtk, pantulan, kembali ke cantolan. Semua efek dimulai tepat saat kena.
- **Retakan bara dan riak digambar di shader badan gong**, tanpa jala atau draw call tambahan. Riak menempel di muka gong (audit host 8 Nov), empat cincin yang menyusul tiap 0,16 dtk.
- **Bunga api dan napas api kedua naga = satu `Points`.** Geraknya rumus tertutup dari jam hantaman di vertex shader (tanpa pembaruan buffer dari JS), dan hanya digambar ±2,2 dtk per pukulan: satu draw call tambahan, nol saat diam. Di tier rendah titiknya lebih jarang (49% di Low), ukurannya tetap.
- **Kilatan menerangi seluruh pendapa.** Satu lampu titik di depan pencu ada di uniform bersama (`uFlash`), jadi lantai, tiang, dan gayor ikut terang sesaat. Saat diam nilainya nol dan cabangnya di shader tidak dihitung.
- **Pukulan beruntun.** Ayunan, dengung, dan panas adalah jumlah tanggapan tiap hantaman (bandul itu linear), jadi memukul gong yang masih berayun tidak membuatnya melompat. Riak dan api memakai dua lajur bergantian, supaya efek pukulan sebelumnya selesai dengan wajar.
- **Satu jam.** Pukulan dicatat pada jam panggung (jam frame 3D terakhir), bukan jam dinding, supaya ayunan tabuh, efek, dan kamera tidak bisa saling bergeser.
- **Bunyi.** `gong` dijadwalkan di Web Audio tepat saat tabuh kena (0,52 dtk sesudah dipicu) dan merendahkan gendhing sebentar; `api-naga` menyusul 0,08 dtk kemudian pada 55%. Keduanya dimuat lebih dulu saat tamu menuju slide gong. Suara dimatikan atau lakon belum dimulai: hening dan tidak ada yang diunduh (dijaga e2e).
- **Film 2,5D** (Static, Calm, reduced motion): cakram gong CSS beriak dan bunyi gong langsung, otomatis saat tiba dan tiap diklik.
- **Tabuh terangkat sedikit** saat kursor atau fokus keyboard ada di tombol pukul: tanda bahwa gong bisa dipukul.

**Bingkai slide gong.** Di langkah 2 gong memenuhi paruh atas layar dan kedua naga terpotong tepi atas. Api naga tidak akan terlihat di bingkai itu. Jadi shot slide gong dilebarkan (`GONG_SHOT` di `shots.ts`): seluruh gayor, kedua naga, dan ruang semburan apinya ada di layar, gong di atas teks penutup hari. Harganya: gong lebih kecil di layar (±25% tinggi layar di desktop, sebelumnya ±48%). Bidang sentuh tombol pukul dihitung dari proyeksi gong pada shot ini (`gongSpot`), jadi selalu tepat di atas gong di layar lebar maupun tegak. Bingkai lebar ini dipertahankan sesudah hentakan kamera dipasang lagi (tafsir Claude, belum ditegaskan host): hentakannya mundur, jadi kedua naga dan apinya tetap di dalam layar.

**Belum dikerjakan dari daftar prototipe:** gelombang kejut selayar (distorsi di rantai post) dan pendar api di mulut naga sebagai lampu tersendiri. Keduanya masuk akal digarap bersama post-FX di Tugas 8.

**Lapisan DOM.** Saat 3D hidup, cakram gong CSS di prolog dan di slide penutup hari tidak digambar. Tombol pukul (`.fs-strike`) tetap ada untuk keyboard dan screen reader, menjadi bidang sentuh di atas gong, dan teks penutup hari turun ke bawah gong. Film 2,5D (Static, Calm, reduced motion) tidak berubah.

**Kamera pratinjau.** `window.__lakonStage.cam = [x, y, z, lihatX, lihatY, lihatZ, fov]` memaksa kamera, untuk memotret detail dari dekat. Hanya dipakai skrip pratinjau.

## Gunungan 3D di panggung: sapuan antar bab dan dua muka (12–13 Nov 2026), arahan host: "redesign/remodel/upgrade ke duanya", lalu dua foto acuan

**Status: rupa dua muka diterima host (13 Nov). Sapuan antar bab dikembalikan ke bayangan kayon DOM atas keputusan host 13 Nov ("pembuka dan penutupan saja, sapuanya pakai yang lama"); gunungan 3D dipakai di pembuka dan penutup film, lihat bagian berikut.**

**Cara menggambar.** Gambar gunungan dilukis kode kanvas (`scripts/assets/gunungan-paint.js`) dan dipanggang menjadi tekstur WebP (`scripts/assets/bake-gunungan.cjs` → `public/film/gunungan/`). Di perangkat tamu tidak ada kode melukis dan tidak ada jeda: tekstur diunduh di latar sesudah panggung 3D tampil (tier High 2000 px, lainnya 1500 px), dan sampai siap sapuan memakai bayangan kayon DOM yang lama. Lembaran dan tabirnya dua draw call, nol saat tidak menyapu. Relief, kilap prada, lubang tembus berdinding, kulit tembus cahaya, lentur, pupil bara, dan api geni semuanya dari shader dan dua tekstur per muka (warna + alpha, dan aux: prada, bagian menyala, tinggi relief).

**Dua muka pada satu lembaran.** Maju ke bab berikutnya memperlihatkan muka **Agung**, mundur memperlihatkan baliknya, muka **Murka**, dengan api geni yang naik dari kaki.

**Muka Agung (13 Nov).** Acuan host: foto kayon gapuran gaya Surakarta ("jangan mirip 100%, cukup jadi acuan"). Siluet berbahu dengan palemahan merah bersudut jungkit; bidang merah tua penuh lung-lungan prada yang lekuknya ditatah tembus; pohon hayat dililit naga hijau dengan burung dan kembang; banteng dan macan berhadapan; gapura beratap tumpang dengan pintu hijau, undakan, dan lantai ubin; sepasang makara biru yang rahangnya mengapit atap seolah menelan pendapa (host: "seolah olah menelan pendapa"), dibuat seram karena versi pertama ditolak ("ini kaya badut"); kala kecil di puncak gapura; sepasang lar; dua raksasa penjaga bertameng.

**Muka Murka (13 Nov sore–malam).** Arahan host, urut:
1. Foto sisi api sebuah kayon: "harusnya full muka barong seperti ini". Versi 1–2 (wajah pucat bulat) ditolak: "kaya badut", lalu "terlalu bulat muka mukanya, kaya kentang".
2. Versi 5 (wajah dirakit dari ukel, sisik api) ditolak: "mode murka, pas kebakar masih kurang. dan tanduk sama yang di pipinya itu kaya keong".
3. Foto gunungan wayang kulit sungguhan: "khas wayang nya bener bener hilang, remodel. kaya refrensi". Muka Murka dirombak total mengikuti susunan foto ini.
4. Garuda di bahu: "ga serem malah kaya bangau", lalu foto topeng garuda Bali ("ikuti garuda seperti foto yang saya kirim"), lalu "kayak tokek ... jelek giginya", lalu "lebih serem, lidah tajam, gigi tidak beraturan, muka monster, mahkota mewah".

Susunan sekarang (mengikuti foto gunungan): lidah api merah jambu bertatah menjulang ke pucuk dengan inti jingga, kala kecil berambut gimbal hitam di tengah atas, sepasang garuda menghadap ke dalam dengan lar emas, barong kuning bertangan di bawah dalam api hitam bertepi kuning, dan gapit naik di tengah.

Aturan menggambar muka Murka, dari penolakan-penolakan di atas:
- **Ciri wayang kulit datang dari cara menggambar**: tatahan tembus yang rapat (bubukan, seritan), sunggingan berjenjang dengan batas tegas (`band()`, bukan gradasi halus), cawi (arsir tinta halus), drenjeman (deret titik), dan prada di tepi. Gaya vektor rapi (sisik seragam, bidang polos) kehilangan ciri ini.
- **Jangan ada pilin bulat rapat** (dibaca "keong"), dan jangan bungkus wajah dengan satu kontur bulat ("kentang").
- **Seram, bukan lucu**: gigi tidak beraturan (panjang, lebar, dan kemiringan acak, ada celah, banyak taring), lidah tajam bercabang, mata merah berurat dengan pupil celah atau mata thelengan dalam rongga gelap, alis berat. Gigi bulat rapi dan mata bulat polos dibaca badut atau kadal.
- **Garuda mengikuti foto topeng garuda Bali**: paruh pendek yang bengkok tajam dengan ujung emas (paruh panjang lurus dibaca bangau atau tokek), kulit hijau bervolume (bukan pita warna), kumis hitam bergaris putih, telinga runcing bersumping emas, dan mahkota mewah (gelungan berukir, kelopak emas berenamel merah, permata bersetting).
- **Lubang tembus yang menyala tidak boleh terbaca sebagai mata kedua.** Yang tembus hanya pupil barong (tempat bara 3D), tatahan, dan kerongkongan.

**Api geni saat mundur** (host: "pas kebakar masih kurang"): kadar api naik begitu lembaran masuk layar dan penuh di tengah (`murkaRage`, puncak `GENI.peak` 0,56). Di bawah garis bakar kulit hangus dengan retakan bara dan kobaran tekstur geni; di atasnya lidah api per kolom yang tingginya acak dan percikan bara, sampai menjilat melewati pucuk dan keluar dari tepi lembaran (memudar sebelum batas bidang, jadi tidak terpotong lurus). Api menutupi kulit, bukan ditambahkan, supaya tidak memutih; warnanya ditulis di ruang linear karena keluaran panggung dikodekan sRGB. Barong, kala, dan kedua garuda tidak terbakar (`KAYON.spare`), jadi mereka tampak muncul dari tengah kobaran. Biayanya hanya saat mundur: beberapa noise dan satu sampel tekstur per piksel lembaran.

## Tier High dipaksa di iPhone/iPad (14 Nov 2026), keputusan host 12 Nov "paksa ke high", ditegaskan 14 Nov: "paksa tier high ke iphone, soalnya cuma dapet medium doang"

Uji host di iPhone menunjukkan 59–60 fps tetapi `medium ×0.82`. Penyebabnya: Safari menamai GPU-nya "Apple GPU" (tergolong High) tetapi melaporkan ≤ 4 inti, dan aturan lama menurunkan High ke Medium bila inti ≤ 4; pengatur FPS lalu sempat mengecilkan resolusi. Sekarang iPhone/iPad selalu mulai di High (`pinnedHigh`) dan pengatur menahannya di High ×1, tanpa mengecilkan resolusi, selama rata-rata fps ≥ 35. Di bawah itu (film benar-benar tersendat, misalnya iPhone lama) paksaan dilepas dan pengatur bekerja seperti biasa. Overlay `?fps` menulis `(paksa)`.

**Revisi 14 Nov sore, keluhan host "masih medium, di gong juga":** sesudah PR #10, overlay di iPhone masih `medium ×0.82` di gerbang (60 fps). Paksaan ternyata dilepas oleh beberapa frame lambat saat film dibuka (rata-rata satu jendela 3 dtk < 35 fps). Sesudahnya aturan biasa (turun bila < 50 fps) menurunkan iPhone yang jalan 40–48 fps di High sampai `medium ×0.82`, dan kunci "jangan coba lagi" mencegahnya kembali. Aturan baru untuk perangkat yang dipaksa:
- Keputusan memakai fps **median** jendela, bukan rata-rata: frame lambat sesaat (tekstur, shader) tidak menggesernya.
- Turun satu anak tangga hanya bila median < 35 fps terus-menerus selama 10 dtk; aturan biasa 50 fps tidak berlaku.
- Kembali naik sampai High ×1 begitu median ≥ 58 fps selama 8 dtk (jeda 20 dtk sejak perubahan terakhir).
- Overlay: `(paksa)` di High ×1; bila sedang di bawahnya `(paksa, turun: N fps)` dengan fps median saat diturunkan.

## Gunungan pembuka dan penutup film (14 Nov 2026), keputusan host 13 Nov: "pembuka dan penutupan saja, sapuanya pakai yang lama"

**Status: selesai, menunggu tinjauan host atas video pratinjau.** Berkas: `src/engine/stage/gate.ts` (mesin dan pose, murni, 25 tes unit), `stageBus.gate*` (`bus.ts`), shader kelir di `components/film/stage3d/gunungan.ts`, sambungan di `stage3d/runtime.ts`, `director.ts`, dan `Film.tsx`.

**Gagasannya dari pagelaran wayang.** Sebelum lakon dimulai, gunungan tertancap di tengah kelir; dalang mencabutnya (bedhol kayon) untuk membuka lakon dan menancapkannya lagi (tancep kayon) saat lakon selesai. Film memakai urutan yang sama:
- **Pembuka.** Film 3D yang dibuka di slide pertama mulai dengan gunungan muka Agung tertancap di gedebog, di depan kelir. Teks prolog menunggu. Gulir, geser, atau panah maju mencabutnya: naik dulu dari gedebog, lalu disapukan ke kanan dengan pucuk tertinggal dan kibasan, sedikit mendekat ke penonton; kelir ikut tersibak dan pendapa terbuka, kamera maju dari shot kayon ke shot prolog, dan teks prolog muncul di tengah jalan. Di HP cabutannya mengikuti jari (dilepas sesudah 30% atau dikibas maju: tercabut habis; sebelum itu: kembali tertancap). Langkah itu tidak memindah slide; langkah berikutnya memindah seperti biasa. Mundur di slide pertama menancapkannya lagi dari kanan.
- **Penutup.** Di credits, gulir maju menancapkan gunungan dari kiri, credits memudar, dan gong berbunyi tepat saat gunungan menancap. Tamu yang diam 12 dtk di credits melihatnya ditancapkan sendiri. Mundur mencabutnya, dan sesudah itu tidak ditancapkan sendiri lagi sampai tamu meninggalkan credits.
- **Balik muka.** Klik, tap, Enter, atau Spasi pada gunungan yang tertancap membaliknya dengan pegas yang sama dengan prototipe 8 Nov (lewat ±8% lalu mantap, selalu berputar ke arah yang sama), dengan bunyi `gunungan-balik`. Muka Murka menyala besar lalu membara lebih kecil (api geni yang sama dengan sapuan lama; barong, kala, dan garuda tidak terbakar), dan pupil barong mengikuti kursor. Tombolnya tak terlihat, tepat di atas gunungan, untuk keyboard dan screen reader (`aria-pressed` = muka Murka).
- **Kelir** (satu draw call bersama tabir): kain yang disinari blencong dari depan, dengan kolam cahaya hangat yang mengikuti kursor dan meredup ke cokelat gelap di tepi; anyaman halus; plisir merah di atas; palemahan gelap di kaki, tempat petunjuk gulir dan ajakan membalik duduk supaya terbaca; gedebog tempat tangkai tertancap (bagian tangkai di bawahnya tidak digambar). **Bayangan gunungan** jatuh di kain dari muka mana pun (FR-28b): siluet dan tatahan tembusnya diambil dari tekstur muka yang tampak dengan mip kasar (tepi lembut), sedikit membesar, menjauhi lampu, menyempit saat lembaran berpaling.
- **Gerak pandang** (aturan tetap 13 Nov): gunungan bergeser lebih jauh dari kelir saat kursor atau HP bergerak (parallax), lembarannya berpaling mengikuti arah pandang dengan perspektif sungguhan (perspective shift), dan kamera serta ukuran gunungan mengikuti kadar cabutan (kedalaman ikut gulir, di HP mengikuti jari).
- **Film 2,5D** (Calm, tanpa GPU, reduced motion): tanpa gerbang, seperti sebelumnya. Bila panggung 3D atau tekstur gunungan belum siap dalam 6 dtk, film dibuka tanpa gerbang; gulir maju sebelum gunungan tampil juga langsung membuka prolog. Supaya gunungan cepat tampil, teksturnya diunduh bersamaan dengan bundle 3D (`kayon-files.ts`), lalu memudar masuk.

**Pratinjau dan uji.** `window.__lakonStage.gate` (ujung, kadar tertancap, muka), `window.__lakonStage.gateAt = [tertancap, ujung, sudut balik, geni]` menahan gunungan di satu titik. Atribut `data-gate` (`wait`, `head`, `tail`) dan `data-face` di elemen film. Tur perekam `gerbang` (`scripts/preview/record-film.cjs`).

## Today 2,5D dengan desain dan tombol baru (14 Nov 2026), permintaan host: "ini sekalian, button ui, design nya sekalian. buat 2,5D sekalian, sekaligus fitur yang gw mau seperti di handoff.md"

**Status: selesai, menunggu tinjauan host atas video.** Acuan host: tangkapan layar Today di iPhone sebelum trip (kartu "The first scene", daftar "Before you go", SOS). Arti 2,5D sama dengan home dan film: kedalaman berlapis, DOM dengan `transform` dan `opacity`, tanpa WebGL. Today tetap ringan dan bisa offline. Berkas: `src/components/today/Scene.tsx`, `src/components/today/today.css` (lapisan di atas gaya dasar Today di `globals.css`), `Today.tsx`.

- **Latar.** Langit malam berbintang dengan pendar cakrawala yang warnanya mengikuti jam WIB (subuh merah jambu, siang emas pucat, senja jingga, malam blencong), punggung Lawu dan perbukitan dengan garis punggung yang disinari tipis supaya siluetnya terbaca, dan debu emas. Satu lapisan langit diam; yang bergerak hanya pita bukit dan debu.
- **Gerak pandang (aturan tetap 13 Nov, "fitur yang gw mau seperti di handoff.md").** Kamera parallax: `--lx/--ly` dari kursor (desktop) atau kemiringan HP (`look.ts`, sumber yang sama dengan film) menggeser tiap bidang sejauh kedalamannya. Perspective shift: kartu (Now/Next, tiket, Before you go, jadwal, panduan Home Screen) dan judul memutar sedikit mengikuti arah pandang dengan perspektif sungguhan. Kedalaman ikut gulir: saat halaman digulir, bukit turun dan membesar (yang dekat lebih banyak), judul menjauh, dan tiap kartu datang dari kedalaman saat masuk layar lalu mundur dan merebah saat keluar di atas. Semuanya scroll-driven animation (dihitung browser, tanpa JavaScript per gulir); browser tanpa dukungan tetap mendapat parallax dan kemiringan. Saat pandang diam, Today memeriksa arah pandang 5× per detik saja supaya HP tidak terus terbangun di jalan.
- **Tombol.** Bahasa yang sama dengan home: kapsul. Utama (WhatsApp, hari terpilih) foil gading-emas di atas tebal perunggu dengan medali ikon nila bercincin emas dan kilau yang menyapu saat disorot atau ditekan; SOS pernis merah lampion bergaris emas dengan medali sirene yang cincinnya berdenyut pelan; sekunder kaca nila bergaris emas. Tetap tombol tekan 3D (wajah turun ke tebalnya saat ditekan), yang disukai host. Pilihan hari dan nomor darurat tetap ubin berlekuk karena dua baris. Sakelar bahasa dan tombol suara di Today memakai gaya kapsul home (`.hb`, `.segl` dipindah dari `home.css` ke `globals.css` tanpa mengubah rupanya).
- **Before you go.** Kartu kaca; kunci centang menjadi medali bulat yang menyala foil emas dengan cincin yang memancar sekali saat dicentang; kartu yang selesai bernada emas. Bilah kemajuan emas berpendar.
- **Tepi atas.** Isi yang digulir memudar di bawah sakelar bahasa, tidak bertumpuk dengannya.
- **Gerak dikurangi.** Tanpa parallax, kedalaman gulir, kemiringan, dan debu.

Pratinjau: video `scripts/preview/record-today.cjs` (sebelum trip dan hari pertama; kemiringan HP tiruan).

**Revisi audit host 14 Nov ("button ui, masih versi lama", "design + ui masih versi lama", "design masih versi lama").** Yang dinilai host masih lama: tebal 3D di bawah tombol, ubin, tiket lama, dan garis punggung bukit yang bersinar. Keputusan yang menggantikan beberapa butir di atas:
- **Tombol tanpa tebal.** Semua tombol `.pb` di Today tidak lagi bertebal: ditekan = wajah mengecil dan menyala, bayangan merapat (sama dengan `.hb` home). "Watch the film" dan Rain plan memakai kapsul kaca `.hb--glass` / `.rain.hb` bermedali ikon. Film tetap `.pb` bertebal.
- **Kepala** rata tengah seperti home; **hitung mundur** angka besar gading-emas dengan kalimat kecil di bawahnya.
- **Boarding pass home di mana-mana.** Kartu home (alas kawung bertepi emas, mata tali, isi melayang, kilau) dipindah ke `src/components/pass/` dan dipakai home, Today, dan slide tiket film; tiket lama dihapus. Di Today dan film kartu tergantung di benang emas pendek dan berayun masuk sekali.
- **Garis punggung bukit dicabut.** Garisnya menembus kartu yang tembus pandang dan memotong teks; siluet kini terbaca dari puncak yang sedikit lebih terang.
- **The programme.** Hari = medali bernomor (dipilih = medali gading seperti kunci sakelar home); stop = kartu kaca di benang emas; jam miring gading; NEXT/NOW kapsul foil, OPTIONAL kapsul bergaris; chip makanan kapsul kaca bermedali kecil.
- **Sheet SOS.** Panel kaca nila bergaris emas, ubin 112/119/110 tanpa tebal dengan medali telepon, kartu kontak dan penginapan, fokus pindah ke judul saat dibuka.
- **Tepi atas** lebih tinggi dan pekat, jadi isi yang digulir tertutup di bawah sakelar bahasa.

## Gerak pandang di semua slide, 3D dan 2,5D (13 Nov 2026), aturan host

Arahan host, urut: "tunggu, di fase gong itu kan 3D ya? bisa di zoom out/in? perspective shift, scroll driven depth, kamera parallax nya gimana?", lalu "semua" (keempat pilihan yang ditawarkan), lalu "pastikan di setiap objek 3D (semua), harus ada semuanya itu. bahkan di film 2,5D juga harus ada; perspective shift, scroll driven depth, kamera parallax". Ini aturan tetap untuk objek 3D yang akan datang juga (`CLAUDE.md`).

- **Satu sumber arah pandang** (`components/film/look.ts`) untuk 3D dan 2,5D: kursor mouse di desktop, kemiringan HP di HP (relatif terhadap cara memegang, yang pelan-pelan menjadi netral; ikut putaran layar). Izin sensor di iPhone diminta sekali dari sentuhan pertama di film. Reduced motion dan Calm: diam. Getar tangan diabaikan supaya panggung bisa beristirahat.
- **3D:** kamera bergeser (`VIEW.shiftX/Y`) lalu memandang ulang objeknya, jadi perspektif sungguh berubah (bukan gambar yang digeser). Di tengah perpindahan slide kamera maju (`scrollDepth`) mengikuti kemajuan gulir; di HP mengikuti jari.
- **Gong:** zoom dengan cubit dua jari, Ctrl+roda / cubit trackpad, dan tombol + / −; dua tahap gulir (maju pertama mendekat, berikutnya pindah; mundur saat dekat menjauh dulu). Panah keyboard tetap per slide. Saat dekat titik bidik berpindah ke pusat gong, bidang sentuh tombol pukul mengikuti gong tiap frame, dan teks penutup hari memudar.
- **2,5D:** lapisan warna langit bergeser berlawanan arah dan sedikit; isi slide searah pandang dan bidang teksnya memutar ±2,4° (perspective shift). Kedalaman ikut gulir memakai `scale` di lintasan transisi: lapisan lama membesar seperti ditembus kamera, yang baru tumbuh dari kedalaman. Bukit tidak ikut bergeser (letaknya parallax gallery, harus nol dalam Calm). Semua lewat properti `translate`/`rotate`/`scale` sendiri, ditumpuk di atas `transform` yang dianimasikan transisi.
- **Tafsir "scroll-driven depth" di slide selain gong** (belum ditegaskan host): kedalaman mengikuti kemajuan gulir di dalam perpindahan slide, bukan satu langkah gulir tambahan per slide, karena itu menggandakan jumlah gulir dan melanggar FR-20a ("satu event roda = tepat satu slide").

## Belum masuk preview v1 (direncanakan setelah arah disetujui)
- ~~Dua raksasa penjaga & burung~~ (sudah di v2). ~~Banteng & macan~~ (sudah di v3). **Kera** belum.
- Sisi belakang bergambar api sudah ada di v2. Kebenaran detailnya tetap perlu dicek guide/translator [V].
- ~~Model blencong yang terlihat~~ (sudah di v2).

## Cara menjalankan preview secara lokal
Skrip prototipe memakai global yang sama dengan Three.js Viewer: `THREE`, `OrbitControls`, `EffectComposer`, `RenderPass`, `UnrealBloomPass`, `canvas`, `width`, `height`. Untuk uji tangkapan layar, `window.__fixedT` bisa diisi untuk mengunci waktu animasi. Gunungan v3 juga punya `window.__flipGunungan(true)` (langsung ke sisi geni tanpa animasi) dan `window.__gunungan` (kanvas tekstur untuk dicek datar).
