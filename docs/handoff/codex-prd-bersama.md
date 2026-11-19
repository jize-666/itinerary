# Aturan bersama PRD Codex: Tugas 10, 11, 12

19 November 2026 · disusun Claude atas permintaan host ("sekalian project berat apalagi yg belum? biar codex yang mengerjakanya. susun prd, jangan batasi kemampuan design codex, maksimalkan kerjanya.")

Berkas ini wajib dibaca bersama tiap PRD tugas:

- `codex-prd-10-lereng-lawu.md`: Hari 2, lereng Lawu, kebun teh, Candi Cetho dan Candi Sukuh.
- `codex-prd-11-canting-mori.md`: Hari 3, canting, malam (lilin batik), dan kain mori.
- `codex-prd-12-boarding-pass-3d.md`: tiket bertali 3D dengan fisika.

Kirim berkas ini bersama satu PRD tugas ke Codex. Isinya hanya hal yang berlaku di ketiga tugas: lingkungan repo, batas keras, cara serah terima, dan uji penerimaan. Bila PRD tugas bertentangan dengan berkas ini, PRD tugas yang dipakai.

## Prompt siap tempel (English)

> You are building one of the remaining heavy 3D pieces of "A Three-Day Lakon", the private trip film in the `jize-666/itinerary` repo (Next.js 16 static export, React 19, three 0.187, @react-three/fiber 9.8, TypeScript strict, pnpm). Read `codex-prd-bersama.md` (shared rules) and the task PRD attached with it. You have full creative and technical freedom over art direction, modelling, shaders, lighting, simulation, camera choreography, sound and interaction, and you are encouraged to go beyond what the PRD describes. The only fixed things are the hard limits in §3 of the shared rules (CSP without WebAssembly or external origins, the host's camera-motion rule, performance on the host's iPhone at tier High, privacy, not breaking existing features) and the acceptance tests. If you find a better approach than one written in the PRD, use it and explain why in your README. Work from the latest `main`, deliver one PR (or ZIP) per task as described in §4, and write all user-facing text in English and Indonesian.

---

## 1. Semangat: desain dibebaskan

Host meminta kemampuan desain Codex tidak dibatasi. Karena itu:

- **Ruang bebas.** Semua yang tidak tercantum di §3 (batas keras) dan di "Uji penerimaan" PRD tugas adalah keputusan Codex. Itu mencakup gaya visual, cara memodelkan, shader, pencahayaan, simulasi, koreografi kamera, komposisi, jumlah dan urutan momen, suara, interaksi, dan antarmuka. Gagasan di PRD tugas yang ditandai **benih** adalah titik awal, bukan keharusan.
- **Lebih baik dari PRD itu diharapkan.** Bila Codex menemukan pendekatan yang lebih indah, lebih ringan, atau lebih kuat ceritanya daripada yang tertulis, pakai pendekatan itu dan tulis alasannya di README.
- **Boleh mengusulkan pelonggaran batas keras.** Contohnya WASM untuk Rapier atau dekoder KTX2. Tulis usulannya di README beserta untung-ruginya. Host yang memutuskan. Sampai host setuju, hasil serahan tetap harus jalan tanpa pelonggaran itu.
- **Kualitas yang dicari: sinematik dan terasa nyata.** Ini film perjalanan pribadi untuk satu tamu, dibuat oleh host. Penonton membukanya di iPhone dan MacBook. Detail kecil yang benar (cahaya pagi yang tepat di lereng yang tepat, kilap lilin yang mendingin, serat kertas tiket) lebih penting daripada jumlah efek.

## 2. Lingkungan repo (fakta, cek di `main` terbaru)

| Hal | Nilai |
| --- | --- |
| Framework | Next.js 16.4.6, App Router, `output: "export"` (HTML statis, tanpa server). Dilayani Vercel dan `scripts/serve-out.mjs` (port 4173). |
| Pustaka | React 19.3.1, three 0.187.0, @react-three/fiber 9.8.2, zod 4.6.7. **Tidak ada** drei, pustaka post-processing, Rapier, gsap, atau lenis. |
| Alat | TypeScript strict, pnpm 10.28.0, Node 22, ESLint, Vitest 4, Playwright 1.63 |
| CSP produksi (`vercel.json`) | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; connect-src 'self' https://<proyek>.supabase.co; worker-src 'self' blob:; object-src 'none'` |
| Bahasa | Inggris dan Indonesia. `useI18n()` di `src/engine/i18n/useI18n.ts` (`lang`, `tx({ en, id })`). Teks situs di `src/engine/i18n/strings.ts`. |
| Gerbang privat | Halaman terbuka sesudah kode akses: `useRequireSession()` di `src/components/useRequireSession.ts`. Data trip (termasuk nama tamu) datang saat runtime dari Supabase, tidak pernah ada di bundle. |
| Film | `/film/`. Slide disusun `src/engine/slides/build-slides.ts`: prolog → tiap hari (`title`, `dayintro`, `panel` × n di gallery menyamping, `gong`) → epilog (`epilogue`, `daycard`, `pass`) → `credits`. Hash bab: `#prologue`, `#day-1`, `#day-2`, `#day-3`, `#epilogue`, `#credits`. |
| Panggung 3D film | `src/components/film/stage3d/` (three + R3F, hanya diunduh di `/film/`) dan logika murni di `src/engine/stage/`. R3F hanya memasang kanvas. Loop sendiri di `stage3d/runtime.ts` (`frameloop="never"`). Shot kamera per slide ada di `engine/stage/shots.ts` (`shotFor`). Satu lanskap yang sama untuk semua hari (`engine/stage/terrain.ts`, Lawu di cakrawala timur). |
| Shader panggung | Semua material panggung menulis **HDR linear** dan memakai uniform bersama `COMMON` dari `stage3d/shared.ts`: langit, arah matahari, cahaya kunci, ambien, lampu blencong, kabut, malam, kilatan gong. Rantai post ditulis sendiri (`stage3d/post.ts`): HDR half float, MSAA per tier, bloom bertingkat, DOF (gallery, tier High), ACES, grading per fase, sRGB, dither. |
| Tier kualitas | `engine/stage/tier.ts`. High: DPR 2, MSAA 4×, bloom 5, partikel penuh, DOF. Medium: DPR 1,5, MSAA 2×, bloom 4, partikel ½. Low: DPR 1, tanpa MSAA, bloom 3, partikel 15%, gambar tiap dua frame saat diam. Static: film 2,5D (DOM, tanpa WebGL). Pengatur FPS menurunkan resolusi dulu, lalu efek. **iPhone/iPad dipaksa High** (keputusan host); hanya turun bila median fps < 35 selama 10 dtk. |
| Parameter uji | `/film/?stage=high\|medium\|low\|static` mengunci tier. `?fps` menampilkan hamparan fps dan tier. `?clawd=0` mematikan maskot. |
| Calm | Sakelar Calm (kunci `localStorage` `lakon.calm`) dan `prefers-reduced-motion` **mematikan WebGL**: film tampil 2,5D. |
| Isi 3D yang sudah ada | Pendapa, gong ageng (dipukul, zoom, dikitari ±90°), gunungan pembuka/penutup, blencong, lanskap sawah dan Lawu, langit mengikuti jam, Bengawan Solo dan larung lampion di gallery, gerbang dimensi antar panel, grading dan partikel per fase, Clawd (maskot pemandu, bersuara EN). Ringkasan keputusan desain: `docs/design/decisions.md`. |
| Gerak pandang | `src/components/film/look.ts` (kursor di desktop, kemiringan HP di HP; izin sensor iOS diminta pada sentuhan pertama) dan `src/engine/motion/view.ts`. Satu sumber untuk 3D dan 2,5D. |
| Maskot Clawd | `src/engine/mascot/` (otak, kalimat `lines.ts`, suara `voice.ts`) dan `stage3d/claude.ts`, `guide.ts`. Kalimat baru boleh ditambah. Kalimat tanpa klip suara tampil tanpa suara, karena klip dibuat terpisah oleh Claude. |
| Pratinjau | `scripts/preview/record-film.cjs` (rekaman gerak lambat dengan jam virtual, mulus walau tanpa GPU) dan `scripts/preview/client-data.ts` (data trip April dari `content/trips/solo`). |

## 3. Batas keras (tidak boleh dilanggar tanpa izin host)

### 3.1 Teknis

- Versi pustaka mengikuti tabel §2. Dependensi baru boleh, asal ditulis di README beserta lisensi, ukuran gzip, dan alasannya. Impor per modul.
- **Tanpa WebAssembly, `eval`, `new Function`, atau asal luar.** Akibatnya Rapier, dekoder Draco/meshopt WASM, dan transcoder Basis/KTX2 tidak bisa dipakai. Fon, skrip, tekstur, dan data dari CDN juga tidak bisa. Semua aset ada di repo (`public/…`) atau dibuat di kode. Web Worker dari `blob:` atau berkas sendiri boleh.
- Bundle 3D baru hanya dimuat di halaman yang memakainya (lewat `import()`), tidak masuk ke gerbang, home, atau Today. Anggaran PRD situs: JS gerbang ≤ 80 KB gzip, Today ≤ 120 KB gzip tanpa WebGL.
- Aset per bab ≤ 6 MB sesudah kompresi, total film ≤ 25 MB. Aset dimuat bertahap per bab dan dilepas bila babnya sudah jauh. Tekstur maksimal 2048 px (PNG/WebP/AVIF, atau prosedural).
- **Tidak ada kebocoran WebGL.** Semua geometri, material, tekstur, dan render target dilepas saat tidak dipakai. Tamu bisa bolak-balik `/film/` ⇄ `/diorama/` ⇄ `/today/`.
- **Fitur yang sudah ada tetap jalan dan semua tes yang ada tetap lulus.** Fitur yang dimaksud: gong, gunungan, Clawd dan suaranya, sungai dan lampion, grading, partikel, DOF, tier dan pengatur fps, film 2,5D, Today, home, dan diorama. Bila desain baru sengaja mengganti perilaku lama, misalnya lanskap Hari 2, ubah tesnya dengan alasan yang ditulis di README.

### 3.2 Aturan host untuk semua objek 3D

- **Gerak kamera di semua objek** (host 13 Nov: "pastikan di setiap objek 3D (semua), harus ada semuanya itu. bahkan di film 2,5D juga harus ada; perspective shift, scroll driven depth, kamera parallax"). Setiap objek dan slide 3D baru wajib punya:
  - **kamera parallax**: kursor di desktop, kemiringan HP di HP. Pakai sumber yang sama, `look.ts`.
  - **perspective shift**: kamera sungguh berpindah dan perspektif berubah, bukan gambar 2D yang digeser.
  - **kedalaman yang mengikuti gulir**: selama perpindahan slide, kedalaman bergerak mengikuti kemajuan gulir, geseran jari, atau trackpad, dan berhenti saat gulir berhenti. Bukan animasi yang berjalan sendiri sesudah gulir.
- **Aturan kamera PRD situs**: tanpa roll, rotasi ≤ 15°/dtk, perubahan FOV halus.
- **"Beban hemat tapi jangan turunkan kualitas"** (host 12 Nov). Hemat lewat cara menggambar: instancing, LOD, culling, memanggang ke tekstur saat memuat, buffer efek setengah resolusi dengan upsampling yang menjaga tepi, atau akumulasi temporal. Jangan hemat dengan menurunkan DPR, resolusi, atau detail di tier High.
- **"Video = output"** (host 12 Nov). Hasil tiap tugas ditunjukkan dengan video yang mulus (§6).

### 3.3 Kinerja (yang mengikat adalah fps, bukan jumlah draw call)

- iPhone host (generasi terbaru, tier High dipaksa): rata-rata ≥ 55 fps dan frame p95 ≤ 20 ms di slide baru, termasuk saat perpindahan slide.
- MacBook Air seri M: ≥ 58 fps.
- Pengatur fps situs boleh tetap bekerja seperti sekarang, jangan dilawan. Laporkan per tier: ms per frame (median dan p95), draw call, dan segitiga, saat diam dan saat bergerak.
- Ukuran panggung sekarang sebagai pembanding: 11–19 draw call dan ±25 ribu segitiga per frame. CPU 0,4–1,3 ms per frame saat diam.

### 3.4 Privasi

- Tidak ada nama asli tamu, nomor WhatsApp, alamat, jam jemput, atau kode booking di repo, tes, tangkapan layar, atau video. Data privat datang saat runtime dari Supabase.
- Di pratinjau, nama tamu = **"Jize"** (nama host). WhatsApp, alamat, dan jam jemput diisi pengganti netral.
- Tes e2e memakai data tiruan yang sudah ada di `e2e/helpers.ts`. Tes `e2e/smoke.spec.ts` ("bundle statis tidak memuat data trip") harus tetap lulus.

### 3.5 Isi dan budaya

- Model 3D dibuat sendiri, atau berlisensi CC0/CC BY dengan atribusi. Data peta OSM berlisensi ODbL dan wajib diberi atribusi. Lisensi DEM dicatat. Semua atribusi masuk ke credits film dan README.
- Fakta sejarah dan budaya ditulis dengan sumber di README. Tempat ibadah yang masih aktif (Candi Cetho, Candi Sukuh) dan motif batik larangan keraton digambarkan dengan hormat (rinciannya di PRD tugas).
- Semua teks yang terlihat tamu ditulis dua bahasa dalam bentuk `{ en, id }`.

## 4. Bentuk penyerahan

- **Mulai dari `main` terbaru**, sesudah PR yang memuat berkas ini di-merge. Tulis hash commit dasar di README.
- **Satu PR (atau ZIP) per tugas.**
  - Berkas baru diserahkan utuh.
  - Perubahan pada berkas yang sudah ada diserahkan sebagai diff (`git diff <commit-dasar>`) di dalam ZIP, supaya tidak menimpa perubahan yang masuk ke `main` sesudahnya.
- **Urutan yang disarankan: 10 → 11, sedangkan 12 boleh paralel.** Tugas 10 dan 11 sama-sama mengganti dunia 3D satu bab. Tugas yang masuk lebih dulu menentukan sambungan "dunia per bab" di `runtime.ts`, dan tugas berikutnya memakai sambungan itu. Tugas 12 hanya menyentuh slide tiket. Bila dikerjakan paralel, perubahan pada berkas bersama dibuat sekecil mungkin dan didaftar di README. Berkas bersama: `runtime.ts`, `shots.ts`, `cue.ts`, `tier.ts`, `build-slides.ts`, `Slides.tsx`, `Film.tsx`, `strings.ts`.
- **README per tugas**: `docs/handoff/README-<tugas>.md`. Isinya:
  - cara pasang;
  - keputusan desain dan alasannya, termasuk yang berbeda dari PRD;
  - dependensi baru;
  - sumber data dan lisensinya;
  - skrip pengolah data;
  - angka kinerja per tier;
  - hasil semua tes;
  - batasan yang diketahui;
  - usulan untuk host.
- **Jangan diubah**: `HANDOFF.md`, `CLAUDE.md`, `docs/previews-ledger.json`, `.claude/`, `vercel.json`, dan apa pun di Supabase. `docs/design/decisions.md` ditulis Claude dari README. Usulan perubahan CSP ditulis di README.

## 5. Uji penerimaan bersama

- Lulus semua: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm content:check`, `pnpm build`, `pnpm test:e2e`.
- Logika murni (pose kamera, lintasan, fisika, waktu, pembagian progres) diuji Vitest tanpa DOM dan tanpa WebGL. Taruh logika itu di `src/engine/…`.
- E2E berjalan di Chromium tanpa GPU (SwiftShader) dan tidak boleh bergantung pada fps. Pakai `?stage=low`, dan sediakan atribut data, misalnya `data-ready` atau `data-beat`, supaya tes bisa menunggu keadaan.
  - Catatan: `e2e/stage.spec.ts` baris ±530 kadang habis waktu di container 4 inti. Di CI lulus.
- Tier Static, Calm, dan peramban tanpa WebGL2: film tetap utuh dan terbaca (2,5D). Tidak ada galat konsol baru.
- Kalimat dan label baru lengkap dalam dua bahasa, dibuktikan dengan tes.

## 6. Pratinjau (video = output)

- Video mulus desktop (1440 × 900) dan HP (profil iPhone di perekam), dari slide yang dibuat.
  - Perekam: `scripts/preview/record-film.cjs`. Boleh ditambah mode baru, misalnya `lawu`, `canting`, `tiket`, dan dijelaskan di kepala berkasnya.
  - Data: `pnpm -s exec tsx scripts/preview/client-data.ts <folder-sementara>/client.json`, nama tamu "Jize".
- Video dan tangkapan layar **tidak masuk repo**. Serahkan terpisah, atau sebut cara membuatnya ulang.
- Claude merekam ulang sesudah memasang, untuk host.

## 7. Yang dikerjakan Claude sesudah penyerahan (bukan tugas Codex)

- Memasang dan meninjau PR/ZIP, menjalankan seluruh tes, dan memperbaiki konflik dengan `main`.
- Klip suara Clawd untuk kalimat baru.
- Tautan masuk dari Today dan diorama, bila PRD tugas meminta halaman sendiri.
- Pratinjau untuk host (desktop dan HP) dan catatannya di ledger Drive.
- Memperbarui `docs/design/decisions.md`, `HANDOFF.md`, dan `CLAUDE.md`.
- PR siap Squash and merge. Host yang menekan merge.
