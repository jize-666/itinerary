# Catatan Keputusan Desain

Catatan ini merekam keputusan visual yang sudah diambil, beserta yang masih menunggu persetujuan host.

## Status checkpoint 0 (Fase 0)
| Item | Status | Preview |
|---|---|---|
| Tugas 1: Gong ageng 3D | v2 ✅ disetujui · **v3 "Murka" + Batara Kala menunggu persetujuan** | `prototypes/gong/scene.js` · v3: `docs/design/previews/gong_v3_idle.png`, `gong_v3_pukul.png`, `gong_v3_batara.png`, `gong_v3.mp4` |
| Tugas 2: Gunungan + blencong + kelir | v2 ✅ disetujui (8 Nov 2026) · **v3 "Gunungan Murka" menunggu persetujuan** | `prototypes/gunungan/scene.js` · v3: `docs/design/previews/gunungan_v3_hero.png`, `gunungan_v3_api.png`, `gunungan_v3_flat.png`, `gunungan_v3_kala.png`, `gunungan_v3.mp4` |
| Keris 3D "Naga Sasra" (tambahan, permintaan host) | **menunggu persetujuan** | `prototypes/keris/scene.js` · `docs/design/previews/keris_hero.png`, `keris_bangkit.png`, `keris_sarung.png`, `keris.mp4` |
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

## Belum masuk preview v1 (direncanakan setelah arah disetujui)
- ~~Dua raksasa penjaga & burung~~ (sudah di v2). ~~Banteng & macan~~ (sudah di v3). **Kera** belum.
- Sisi belakang bergambar api sudah ada di v2. Kebenaran detailnya tetap perlu dicek guide/translator [V].
- ~~Model blencong yang terlihat~~ (sudah di v2).

## Cara menjalankan preview secara lokal
Skrip prototipe memakai global yang sama dengan Three.js Viewer: `THREE`, `OrbitControls`, `EffectComposer`, `RenderPass`, `UnrealBloomPass`, `canvas`, `width`, `height`. Untuk uji tangkapan layar, `window.__fixedT` bisa diisi untuk mengunci waktu animasi. Gunungan v3 juga punya `window.__flipGunungan(true)` (langsung ke sisi geni tanpa animasi) dan `window.__gunungan` (kanvas tekstur untuk dicek datar).
