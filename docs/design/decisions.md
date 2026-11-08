# Catatan Keputusan Desain

Catatan ini merekam keputusan visual yang sudah diambil, beserta yang masih menunggu persetujuan host.

## Status checkpoint 0 (Fase 0)
| Item | Status | Preview |
|---|---|---|
| Tugas 1: Gong ageng 3D | ✅ disetujui host (8 Nov 2026, v2) | `prototypes/gong/scene.js` · `docs/design/previews/gong_1100.png` (kepingan berkumpul), `gong_4600.png` (pukulan gong) |
| Tugas 2: Gunungan + blencong + kelir | v2 ✅ disetujui (8 Nov 2026) · **v3 "Gunungan Murka" menunggu persetujuan** | `prototypes/gunungan/scene.js` · v3: `docs/design/previews/gunungan_v3_hero.png`, `gunungan_v3_api.png`, `gunungan_v3_flat.png`, `gunungan_v3_kala.png`, `gunungan_v3.mp4` |
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

## Belum masuk preview v1 (direncanakan setelah arah disetujui)
- ~~Dua raksasa penjaga & burung~~ (sudah di v2). ~~Banteng & macan~~ (sudah di v3). **Kera** belum.
- Sisi belakang bergambar api sudah ada di v2. Kebenaran detailnya tetap perlu dicek guide/translator [V].
- ~~Model blencong yang terlihat~~ (sudah di v2).

## Cara menjalankan preview secara lokal
Skrip prototipe memakai global yang sama dengan Three.js Viewer: `THREE`, `OrbitControls`, `EffectComposer`, `RenderPass`, `UnrealBloomPass`, `canvas`, `width`, `height`. Untuk uji tangkapan layar, `window.__fixedT` bisa diisi untuk mengunci waktu animasi. Gunungan v3 juga punya `window.__flipGunungan(true)` (langsung ke sisi geni tanpa animasi) dan `window.__gunungan` (kanvas tekstur untuk dicek datar).
