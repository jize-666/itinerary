# HANDOFF

Diperbarui 12 Nov 2026 (WIB) · branch kerja `claude/gallant-hopper-1jlpo0` (dibuat ulang dari `main` sesudah PR #6) · **tugas aktif: panggung 3D, dikerjakan per tugas (bagian 0)**
Konteks proyek dan aturan yang tidak boleh dilanggar: `docs/handoff/FABLE-5.2.md`. Keputusan desain: `docs/design/decisions.md`.

## 0. Tugas aktif: panggung 3D (permintaan host 12 Nov)

**Kata host (12 Nov, sesudah merge PR #6), prioritas tinggi:** "mesin film; panggung 3D React Three Fiber (target ≥ 55 fps di HP flagship); gong (buat jadi 3D); gunungan sebagai gerbang sinematik; benang emas (remodel/design) dan siklus waktu; diorama Solo, Lawu, dan canting; boarding pass 3D dengan fisika. Bebas menggunakan bahasa/pemrograman apa, yang penting hasil maksimal/lebih bagus dari sebelumnya. Boleh remodel, redesign, asal tidak jauh dari konsep. Intinya upgrade panggung 3D semaksimal mungkin. Step by step (output) per task/kerjaan."

**Urutan kerja** (sama dengan Tugas 5–12 di `CLAUDE.md`; tiap tugas ditutup dengan output yang sudah dites, pratinjau ke host, commit + push, dan pembaruan berkas ini):

| # | Tugas | Acuan | Status |
|---|---|---|---|
| 5 | Panggung 3D (R3F) + mesin film 3D: kanvas, shot kamera per slide, tier kualitas, pemantau FPS | F2, Tugas 23 | **sedang dikerjakan**: tersambung, terender, tes unit dan e2e 3D lulus, sudah diukur; e2e penuh, video, pratinjau, dan dokumen belum (lihat di bawah) |
| 6 | Gong ageng 3D + pukulan | F3, Tugas 24 | belum |
| 7 | Gunungan: gerbang sinematik + sapuan antar bab | F4, Tugas 25 | belum |
| 8 | Benang emas (desain ulang) + siklus waktu 3D + post-FX + partikel | F5, Tugas 26, 27, 31 | belum |
| 9 | Diorama Solo | F6, Tugas 28 | belum |
| 10 | Lereng Lawu | F6, Tugas 29 | belum |
| 11 | Canting + kain mori | F6, Tugas 30 | belum |
| 12 | Boarding pass 3D dengan fisika | F7, Tugas 32 | belum |

### Kemajuan Tugas 5 (catatan 12 Nov, pekerjaan masih berjalan)

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

**Status sebenarnya (12 Nov, diperbarui atas permintaan host di tengah sesi).** Tugas 5 **belum selesai**; yang sudah dan yang belum:

Sudah, dan sudah dibuktikan:
- Kanvas tersambung ke film lewat `src/components/film/StageMount.tsx` (muat lazy, tebak tier, `?stage=high|medium|low|static`, `?fps`, jatuh ke 2,5D bila gagal) dan `Film.tsx` + `film.css`.
- Terender di Chromium sesi ini (WebGL2 lewat SwiftShader, tier dipaksa): semua shader terkompilasi, 26 slide data tiruan tergambar di desktop 1280×720 dan HP tegak, dengan teks DOM terbaca di atasnya.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` (245 tes; 34 baru di `tests/unit/stage.test.ts`), dan `pnpm build` lulus.
- e2e baru `e2e/stage.spec.ts`: 26 lulus (13 tes × desktop dan iPhone): tanpa GPU / `?stage=static` / reduced motion / Calm tetap 2,5D, Calm dimatikan → kanvas kembali, kanvas tergambar dan bukan bidang kosong, kamera pindah per slide dan kembali saat mundur, kamera gallery bergeser per panel, overlay `?fps`, gerbang dan Today tidak memuat three.
- Skrip ukur `scripts/preview/measure-stage.cjs`, dijalankan sekali di desktop 1440×900 @2x:

  | Tier | Kanvas | Draw call | Segitiga | CPU thread utama per frame (diam) |
  |---|---|---|---|---|
  | High | 2880×1800 | 15–19 | ±25 ribu | 0,5–1,8 ms |
  | Medium | 2160×1350 | 13–17 | ±25 ribu | 0,5–1,8 ms |
  | Low | 1440×900 | 11–14 | ±25 ribu | 0,5–0,9 ms |

  Bundle 3D (lazy, hanya di `/film/` saat 3D dipakai): **+943 KB mentah, +251 KB gzip** di atas film 2,5D (606 KB mentah, 188 KB gzip). Sebagian besar adalah three; R3F mengimpor seluruh namespace three sehingga tidak bisa dipangkas.

Belum, atau belum dibuktikan:
- **`pnpm test:e2e` penuh dan `pnpm content:check` belum dijalankan ulang** sesudah perubahan ini (baru `e2e/stage.spec.ts` yang dijalankan).
- **fps nyata tidak diketahui.** Sesi ini tanpa GPU; target ≥ 55 fps di HP flagship hanya bisa diukur host di perangkat (`/film/?fps`). Lama sampai frame pertama di sini 3–10 detik, tetapi itu angka SwiftShader, bukan angka perangkat.
- Baris "hero" di skrip ukur mencatat 7–14 ms: angka itu rata-rata bergerak yang masih memuat frame-frame awal (kompilasi shader), bukan beban tetap. Belum saya pisahkan di skrip, jadi skrip masih mencetak "PERLU DICEK".
- Skrip ukur belum dijalankan di profil iPhone.
- Transisi antar slide (gerak kamera, sapuan gunungan) baru diuji lewat angka kamera di e2e; **belum saya tonton sebagai video**.
- Pratinjau foto dan video belum dikirim ke host.
- `docs/design/decisions.md` bagian "Panggung 3D" belum ditulis; `CLAUDE.md` belum dicentang.
- Belum diuji di Safari, iPhone, atau MacBook asli.

Yang ditemukan dan diperbaiki saat render pertama: kata tercadang GLSL (`patch`), sisi jala lanskap terbalik (lanskap tidak tergambar), `smoothstep` dengan dua batas sama di sisi tegak (bintik acak), nyala blencong berbentuk kotak, debu terlalu besar, kabut menutup seluruh lanskap. Yang ditambahkan: petak sawah (sebagian tergenang dan memantulkan langit), lampu desa sebagai titik (`stage3d/village.ts`), balok tumpang sari tempat blencong digantung, gradien langit yang direntang per shot (`skyStretch`) supaya tepi atas layar tetap gelap seperti film 2,5D, tepi bawah gambar diturunkan supaya penanda bab terbaca.

Catatan untuk yang melanjutkan: pendapa masih kosong di tengah (gong 3D baru di Tugas 6); gong, gunungan, dan boarding pass yang tampak sekarang masih versi DOM/CSS di atas kanvas. `next dev` membuat `AGENTS.md` otomatis; berkas itu sudah masuk `.gitignore`.

**Keputusan yang sudah tertanam di kode.**
- Calm dan reduced motion → tanpa WebGL, film 2,5D yang sekarang.
- Renderer perangkat lunak (tanpa GPU) → otomatis Static.
- Matahari 3D berada di titik layar yang sama dengan matahari 2,5D (diukur dari `.fl-sunbox`). Akibatnya kamera gallery memandang lanskap dari atas, dengan cakrawala tepat di atas kartu.
- Gallery untuk sementara memakai satu lanskap umum; diorama per bab menyusul di Tugas 9–11.

**Sisa Tugas 5, urut.**
1. Jalankan `pnpm content:check` dan `pnpm test:e2e` penuh; perbaiki bila ada yang pecah.
2. Skrip ukur: pisahkan frame awal dari beban tetap, jalankan juga di profil iPhone.
3. Rekam video (`scripts/preview/record-film.cjs` dengan `?stage=`), tonton transisinya, perbaiki yang janggal.
4. Kirim pratinjau foto dan video ke host.
5. Tulis bagian "Panggung 3D" di `docs/design/decisions.md`, centang Tugas 5 di `CLAUDE.md` bila semuanya lulus, perbarui berkas ini, commit + push, siapkan PR.

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

**Keadaan semua PR per 12 Nov.** PR #1 sampai #6 sudah di-merge ke `main` (#6: home 2,5D + sesi per tab, squash "redesign (#6)"). PR untuk tugas aktif (bagian 0) dibuat saat host memintanya.

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
