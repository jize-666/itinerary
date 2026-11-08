# Daftar Tugas: *Lakon Tiga Hari*

Rencana: [`tasks/plan.md`](plan.md) · PRD: [`docs/PRD.md`](../docs/PRD.md) · **Serah terima: Senin 28 Des 2026**
Ukuran: **S** = 1–2 file · **M** = 3–5 file · **L** = 5+ file (dipecah lagi kalau perlu)
🔑 = butuh izin atau tindakan host sebelum mulai

---

## Fase 0 — Desain & Prototipe (Minggu 1: 9 – 15 Nov 2026)

- [x] **Tugas 1: Preview gong ageng 3D**
  - **Deskripsi:** Prototipe three.js mandiri: badan gong (lathe) dengan pencu dan bibir, material perunggu PBR (bekas tempa, patina tipis), gayor sederhana dengan ornamen ujung, cahaya hangat blencong, dan kamera mengorbit. Ditampilkan lewat Three.js Viewer.
  - **Kriteria terima:** gong terbaca jelas sebagai gong ageng Jawa · pantulan logam terlihat premium dari dekat · host menyetujui (atau memberi revisi)
  - **Verifikasi:** preview tampil di chat · jalan mulus di laptop · catatan revisi host tercatat di `docs/design/decisions.md`
  - **Dependensi:** —
  - **File:** `prototypes/gong/scene.js`, `docs/design/decisions.md`
  - **Ukuran:** S

- [x] **Tugas 2: Preview gunungan SVG + cahaya blencong**
  - **Deskripsi:** Gambar SVG gunungan (gapura, dua raksasa penjaga, pohon kehidupan, satwa) + generator pola tatahan. Diberi ketebalan seperti kulit, lalu disinari dari belakang sehingga cahaya menembus lubang dan bayangan berpola jatuh ke bidang.
  - **Kriteria terima:** siluet dikenali sebagai gunungan · cahaya dan bayangan berpola terlihat · host menyetujui
  - **Verifikasi:** preview di Three.js Viewer · SVG valid dan ukurannya < 200 KB
  - **Dependensi:** —
  - **File:** `prototypes/gunungan/gunungan.svg`, `prototypes/gunungan/tatahan.js`, `prototypes/gunungan/scene.js`
  - **Ukuran:** M

- [x] **Tugas 3: Prototipe motion di Framer** 🔑 *(izin membuat project Framer baru)*
  - **Deskripsi:** Project Framer baru "Lakon Tiga Hari — Motion" berisi: navigasi per slide, text reveal per baris/kata, stagger, mask reveal ala sapuan gunungan, horizontal gallery, dan shared element panel → detail. Nilai timing mengikuti PRD §9.
  - **Kriteria terima:** host bisa mencoba prototipe di browser/HP · host menyetujui "rasa" gerak · nilai final tercatat
  - **Verifikasi:** link preview Framer dibagikan · `docs/design/motion-tokens.md` berisi nilai yang disetujui
  - **Dependensi:** —
  - **File:** (Framer) + `docs/design/motion-tokens.md`
  - **Ukuran:** M

- [ ] **Tugas 4: Token visual & styleframe per bab**
  - **Deskripsi:** Kunci palet (PRD §6.3), pasangan font, skala tipografi, dan satu styleframe per bagian (gate, prolog, Hari 1–3, epilog) di Framer.
  - **Kriteria terima:** kontras teks ≥ 4,5:1 di semua kombinasi yang dipakai · host menyetujui styleframe
  - **Verifikasi:** `docs/design/tokens.md` + tangkapan styleframe di `docs/design/`
  - **Dependensi:** 3
  - **File:** `docs/design/tokens.md`, `docs/design/styleframes/*.png`
  - **Ukuran:** S

- [ ] **Tugas 5: Draf konten EN/ID + shot list final**
  - **Deskripsi:** Tulis teks prolog, 3 hari, dan semua tempat (story, why, tips, dress code, Plan B) dalam EN dan ID sesuai PRD §10, plus daftar slot foto final.
  - **Kriteria terima:** setiap tempat punya teks EN dan ID · setiap fakta lapangan bertanda [V] · nada sesuai PRD §6.5
  - **Verifikasi:** host membaca dan menyetujui `docs/content/draft.md`
  - **Dependensi:** —
  - **File:** `docs/content/draft.md`, `docs/content/shot-list.md`
  - **Ukuran:** S

- [ ] **Tugas 6: Sourcing foto berlisensi** 🔑 *(akses jaringan ke situs foto, atau host mengunduh)*
  - **Deskripsi:** Cari 10–15 foto utama sesuai shot list dari sumber yang diizinkan (PRD §12.6) dan catat di manifest.
  - **Kriteria terima:** ≥ 10 slot terisi · setiap foto punya sumber, pemilik, lisensi, dan tautan lisensi · tidak ada ND
  - **Verifikasi:** `content:check` (setelah Tugas 8) lolos untuk manifest
  - **Dependensi:** 5
  - **File:** `content/trips/solo/photos/manifest.json`, `content/trips/solo/photos/src/*`
  - **Ukuran:** M (berlanjut paralel, target selesai 29 Nov)

### ✅ Checkpoint 0
- [x] Host menyetujui gong, gunungan, dan rasa motion (8 Nov 2026). Token & draf konten menyusul di Tugas 4 & 8.
- [x] Keputusan dicatat di `docs/design/decisions.md` · v3 gong, gunungan, keris, gerak, dan audio disetujui host (8 Nov 2026)

---

## Fase 1 — Fondasi & Akses (12 – 22 Nov 2026)

- [x] **Tugas 7: Scaffold proyek + CI** ✅ 8 Nov 2026 · Next 16 static export, lint/typecheck/test/content:check/build/e2e (desktop + iPhone 14 Pro) di CI
  - **Deskripsi:** Next.js (App Router, static export), TypeScript strict, ESLint, Vitest, Playwright, pnpm, plus GitHub Actions (lint, typecheck, test, build). Versi library dicek lewat Context7.
  - **Kriteria terima:** `pnpm build` menghasilkan folder statis · CI hijau di branch
  - **Verifikasi:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
  - **Dependensi:** —
  - **File:** `package.json`, `next.config.ts`, `tsconfig.json`, `.github/workflows/ci.yml`, `vitest.config.ts`
  - **Ukuran:** M

- [x] **Tugas 8: Schema konten + `content:check` + data trip Solo** ✅ 8 Nov 2026 · 5 hari, 35 stop, 41 fakta [V] · 16 unit test · `content:check --strict` untuk penguncian H-4 · cspell ditunda ke penguncian konten (kamus Jawa/Indonesia perlu disusun dulu)
  - **Deskripsi:** Schema Zod (PRD §13.4), skrip validasi (kelengkapan EN/ID, format dan tumpang tindih jam, foto ada di manifest, lisensi diizinkan, cspell), lalu `trip.ts` diisi dari draf Tugas 5.
  - **Kriteria terima:** data Solo lolos validasi · string yang kosong atau jam yang bentrok membuat `content:check` gagal
  - **Verifikasi:** `pnpm content:check` + unit test kasus gagal
  - **Dependensi:** 5, 7
  - **File:** `content/schema.ts`, `content/trips/solo/trip.ts`, `scripts/content-check.ts`, `tests/unit/content.test.ts`
  - **Ukuran:** M

- [x] **Tugas 9: Project Supabase + migrasi + RLS** ✅ 8 Nov 2026 · `itinerary-solo` (ap-southeast-1), migrasi `init` + `access_config_vault`; anon ditolak di tabel & RPC (dites); advisor hanya INFO `rls_enabled_no_policy` (disengaja)
  - **Deskripsi:** Project `itinerary-solo` di ap-southeast-1. Tabel `trip_content`, `trip_private`, `access_attempts`. RLS aktif tanpa policy untuk anon/authenticated.
  - **Kriteria terima:** anon key tidak bisa membaca tabel mana pun · security advisor Supabase tanpa peringatan
  - **Verifikasi:** query uji pakai anon key → kosong/ditolak · `get_advisors` bersih
  - **Dependensi:** 7
  - **File:** `supabase/migrations/0001_init.sql`, `supabase/config.toml`
  - **Ukuran:** S

- [x] **Tugas 10: Edge Function `verify-access`** ✅ 8 Nov 2026 · secret di Supabase Vault · dites langsung: kode salah 401, kode tamu (huruf kecil pun) → token guest, kode tim → token team · rate limit per IP terbukti di `access_attempts` (egress cloud memakai banyak IP, jadi kunci 5× tidak bisa direproduksi dari sini; logika dites unit)
  - **Deskripsi:** Normalisasi kode → hash → perbandingan constant-time terhadap secret, rate limit via `access_attempts`, lalu terbitkan token HMAC `{role, exp}`.
  - **Kriteria terima:** kode salah → 401 · kode tamu/tim → token dengan role yang benar · 5 kali salah → terkunci 30 dtk
  - **Verifikasi:** unit test Deno + uji curl ke fungsi yang sudah di-deploy
  - **Dependensi:** 9
  - **File:** `supabase/functions/verify-access/index.ts`, `supabase/functions/_shared/token.ts`, `supabase/functions/verify-access/test.ts`
  - **Ukuran:** M

- [x] **Tugas 11: Edge Function `trip-data` + `health` + `content:publish`** ✅ 8 Nov 2026 · tanpa token/token palsu 401 · tamu tanpa kunci `team` · tim dengan `team` · ETag → 304 (bug diperbaiki: gateway mengubah ETag jadi `W/`) · `health` 200 · data privat belum diisi host
  - **Deskripsi:** `trip-data` memverifikasi token, menggabungkan konten dan data privat, lalu membuang field tim kalau role = guest. `health` untuk keep-alive. Skrip `content:publish` mengunggah konten yang sudah tervalidasi.
  - **Kriteria terima:** tanpa token → 401 · token tamu → tanpa `teamNote`/`estCost` · token tim → lengkap
  - **Verifikasi:** unit test filter role + uji ke fungsi yang sudah di-deploy
  - **Dependensi:** 8, 10
  - **File:** `supabase/functions/trip-data/index.ts`, `supabase/functions/health/index.ts`, `scripts/content-publish.ts`, `tests/unit/role-filter.test.ts`
  - **Ukuran:** M

- [x] **Tugas 12: Gate UI dasar + token + toggle bahasa + noindex** ✅ 8 Nov 2026 · 9 kotak (format `XXX-XXXXXX`), tempel/huruf kecil/tanda hubung dimaafkan, goyang + pesan EN/ID, hitung mundur saat terkunci · token di perangkat → kunjungan ulang langsung ke tombol Begin · tamu → `/film`, tim → `/today` · `/today` versi awal (jadwal sebagai teks dari trip-data) · EN/ID tanpa reload & tersimpan · 18 e2e baru (backend di-mock) + uji langsung ke Supabase dengan kode dev
  - **Deskripsi:** Halaman gate fungsional (belum sinematik): input kode per karakter, pesan EN/ID, token disimpan, redirect ke `/film` atau `/today`, toggle bahasa, meta robots + `robots.txt`.
  - **Kriteria terima:** alur kode salah/benar berjalan · **hasil build tidak mengandung nama tempat, nama tamu, atau nomor** · bahasa tersimpan
  - **Verifikasi:** e2e Playwright (gate, token, bahasa) + tes grep pada folder build
  - **Dependensi:** 11
  - **File:** `src/app/page.tsx`, `src/components/CodeInput.tsx`, `src/engine/i18n/*`, `src/lib/session.ts`, `e2e/gate.spec.ts`
  - **Ukuran:** M

- [ ] **Tugas 13: Deploy preview + keep-alive** 🔑 *(host menautkan repo ke Vercel, atau memilih GitHub Pages)* · disiapkan 8 Nov 2026: `vercel.json` (noindex, CSP, header keamanan; e2e berjalan di bawahnya), `keep-alive.yml`, `docs/deploy.md` · **menunggu:** merge ke `main` + import di Vercel + domain dimasukkan ke CORS
  - **Deskripsi:** Hosting statis dengan header `noindex` dan CSP, deploy Edge Functions, dan GitHub Actions terjadwal yang mem-ping `health` tiap 2–3 hari.
  - **Kriteria terima:** URL preview bisa dibuka di HP · header benar · job keep-alive sukses
  - **Verifikasi:** cek header lewat curl · log run GitHub Actions
  - **Dependensi:** 12
  - **File:** `vercel.json`, `.github/workflows/keep-alive.yml`
  - **Ukuran:** S

- [x] **Tugas 13a: Mesin audio + gerbang dua tombol** ✅ 8 Nov 2026 · atas persetujuan host (Q11, opsi b)
  - **Deskripsi:** Rekaman gamelan host diolah (`scripts/audio/build-audio.sh`: buang rumble & noise, EQ, −16 LUFS) jadi MP3; SFX keris dari ElevenLabs + sintesis. `AudioEngine` (Web Audio): Kebo Giro sekali → crossfade ke keraton yang diulang tanpa jeda, efek di atas gendhing dengan ducking, jeda saat tab disembunyikan, kategori `playback` di iOS. Gerbang: "Begin with gamelan" / "Begin quietly" + toggle speaker.
  - **Kriteria terima:** "Begin quietly" → 0 request audio · "with gamelan" → Kebo Giro berbunyi, toggle mematikan & menyalakan · pilihan diingat · tidak ada bunyi tanpa klik
  - **Verifikasi:** `tests/unit/audio.test.ts` (preferensi, matematika loop, jadwal BedPlayer) + `e2e/sound.spec.ts` (desktop + iPhone)
  - **File:** `src/engine/audio/*`, `src/components/{Gate,BeginChoice,SoundToggle}.tsx`, `public/audio/*`, `scripts/audio/*`
  - **Ukuran:** M

### ✅ Checkpoint 1
- [ ] Gate berfungsi di HP nyata · data hanya keluar lewat token · CI hijau · keep-alive jalan

---

## Fase 2 — Today (23 – 29 Nov 2026)

- [ ] **Tugas 14: Logika Today**
  - **Deskripsi:** Penentuan sebelum/selama/setelah trip, hari ke-N, kartu Now/Next, dan hitung mundur. Semua dihitung di zona Asia/Jakarta.
  - **Kriteria terima:** hasil benar untuk perangkat ber-zona Singapura maupun Jakarta · pergantian hari tepat di 00.00 WIB
  - **Verifikasi:** unit test dengan jam palsu (≥ 10 skenario)
  - **Dependensi:** 11
  - **File:** `src/engine/today/schedule.ts`, `tests/unit/today.test.ts`
  - **Ukuran:** S

- [ ] **Tugas 15: UI Today**
  - **Deskripsi:** Header hari, Now/Next, timeline, tombol Maps dan copy alamat, chip dress code dan penanda makanan, toggle Plan B, sheet darurat, bilah kontak WhatsApp.
  - **Kriteria terima:** dari layar Today ke jam jemput ≤ 1 ketukan · semua link Maps membuka tempat yang benar · Lighthouse a11y ≥ 95
  - **Verifikasi:** e2e + cek manual setiap link Maps + Lighthouse
  - **Dependensi:** 14
  - **File:** `src/app/today/page.tsx`, `src/components/today/*` (≤ 5 komponen), `e2e/today.spec.ts`
  - **Ukuran:** M

- [ ] **Tugas 16: PWA offline + Add to Home Screen**
  - **Deskripsi:** Service worker (cache shell, respons `trip-data` terakhir, dan gambar Today), manifest dan ikon PWA, panduan iOS/Android, indikator "Last updated".
  - **Kriteria terima:** Today terbuka dalam mode pesawat setelah kunjungan pertama · ikon dan nama benar di Home Screen
  - **Verifikasi:** e2e offline (Playwright) + uji nyata di iPhone & Android
  - **Dependensi:** 15
  - **File:** `src/sw.ts`, `public/manifest.webmanifest`, `public/icons/*`, `src/components/InstallGuide.tsx`
  - **Ukuran:** M

### ✅ Checkpoint 2
- [ ] Today teruji di iPhone & Android, termasuk mode pesawat · tampil default selama jendela trip

---

## Fase 3 — Film 2D (26 Nov – 6 Des 2026)

- [ ] **Tugas 17: Mesin slide**
  - **Deskripsi:** Input roda/swipe/trackpad/keyboard (GSAP Observer), akumulasi ambang, pengabaian inersia, antrean satu langkah, scrub dengan jari (ambang 35%), dan hash per bab.
  - **Kriteria terima:** satu event roda atau keyboard = tepat satu slide · inersia trackpad tidak melompati slide · `#day-2` membuka bab yang benar
  - **Verifikasi:** unit test state machine + e2e + uji manual MacBook trackpad & swipe HP
  - **Dependensi:** 12
  - **File:** `src/engine/slides/controller.ts`, `src/engine/slides/input.ts`, `tests/unit/slides.test.ts`, `e2e/slides.spec.ts`
  - **Ukuran:** M

- [ ] **Tugas 18: Daftar slide dari data + overlay teks**
  - **Deskripsi:** Ubah data trip menjadi urutan slide (prolog, Hari 0, bab, gallery, gong, epilog, credits), lalu render overlay DOM dengan text reveal/stagger/mask sesuai token motion.
  - **Kriteria terima:** seluruh cerita bisa diikuti slide demi slide · teks memakai token, tanpa angka yang ditulis langsung
  - **Verifikasi:** unit test pemetaan data → slide + screenshot e2e per bab
  - **Dependensi:** 3, 8, 17
  - **File:** `src/engine/slides/build-slides.ts`, `src/app/film/page.tsx`, `src/components/film/SlideOverlay.tsx`, `src/engine/motion/tokens.ts`
  - **Ukuran:** M

- [ ] **Tugas 19: Horizontal gallery + panel foto + sheet detail**
  - **Deskripsi:** Slide menyamping per hari, panel foto (crop sesuai focal point), panel tipografi, dan sheet detail dengan shared element (View Transitions, fallback crossfade).
  - **Kriteria terima:** satu swipe menggeser tepat satu panel · sheet detail berisi semua field · kembali ke panel yang sama
  - **Verifikasi:** e2e + uji manual di HP
  - **Dependensi:** 18, 21
  - **File:** `src/components/film/Gallery.tsx`, `src/components/film/Panel.tsx`, `src/components/film/DetailSheet.tsx`
  - **Ukuran:** M

- [ ] **Tugas 20: Calm mode + titik bab + petunjuk navigasi**
  - **Deskripsi:** Toggle Cinematic/Calm (otomatis aktif dengan reduced motion), indikator bab yang bisa diketuk, petunjuk "Scroll or swipe", dan toggle bahasa di film.
  - **Kriteria terima:** reduced motion → tanpa gerak kamera dan scrub · titik bab melompat ke bab yang benar
  - **Verifikasi:** e2e dengan emulasi `prefers-reduced-motion`
  - **Dependensi:** 18
  - **File:** `src/components/film/ChapterDots.tsx`, `src/components/film/MotionToggle.tsx`, `e2e/calm.spec.ts`
  - **Ukuran:** S

### ✅ Checkpoint 3
- [ ] Film 2D lengkap dari awal sampai akhir · FR-20a lolos di trackpad & HP · review host

---

## Fase 4 — Pipeline Aset (paralel, 16 Nov – 6 Des 2026)

- [ ] **Tugas 21: Pipeline foto + credits otomatis**
  - **Deskripsi:** `assets:build` (sharp): crop 16:9 & 9:16 sesuai focal point, AVIF/WebP berbagai ukuran, tekstur KTX2. Daftar credits dibuat otomatis dari manifest.
  - **Kriteria terima:** semua foto manifest terproses · ukuran sesuai anggaran PRD §12.1 · credits lengkap
  - **Verifikasi:** `pnpm assets:build` + `content:check`
  - **Dependensi:** 6, 8
  - **File:** `scripts/assets/photos.ts`, `scripts/assets/credits.ts`, `public/photos/*`
  - **Ukuran:** M

- [ ] **Tugas 22: Depth map & mask subjek** 🔑 *(akses jaringan untuk bobot model)*
  - **Deskripsi:** Buat depth map (mis. Depth Anything V2 Small) dan mask subjek untuk foto panel, lalu rapikan manual bila perlu.
  - **Kriteria terima:** setiap foto panel punya depth map + mask · tidak ada artefak yang mencolok saat parallax
  - **Verifikasi:** cek visual di halaman uji parallax
  - **Dependensi:** 21
  - **File:** `scripts/assets/depth.py`, `public/photos/*-depth.*`, `public/photos/*-mask.*`
  - **Ukuran:** M

---

## Fase 5 — Film 3D (30 Nov – 18 Des 2026)

- [ ] **Tugas 23: Panggung R3F + shot kamera + tier kualitas**
  - **Deskripsi:** Satu canvas R3F yang hidup sepanjang film. Setiap slide punya shot (kamera, fokus, keadaan cahaya) yang di-tween oleh mesin slide. Ditambah manajer tier (PerformanceMonitor + hysteresis), overlay FPS khusus dev, render dijeda saat tab tersembunyi, dan dispose per bab.
  - **Kriteria terima:** shot berpindah sinkron dengan slide · tier turun/naik sesuai FPS · tanpa kebocoran memori setelah bolak-balik antar bab
  - **Verifikasi:** overlay FPS + profil memori Chrome
  - **Dependensi:** 17, 18
  - **File:** `src/engine/three/Stage.tsx`, `src/engine/three/shots.ts`, `src/engine/three/quality.ts`
  - **Ukuran:** M

- [ ] **Tugas 24: Gong produksi + hero + pukulan gong**
  - **Deskripsi:** Gong dari Tugas 1 dipindah ke engine. Momen hero: kepingan emas berkumpul menjadi gong. Pukulan gong: deformasi getar, gelombang cahaya, dan partikel di akhir setiap hari. Gong terakhir di epilog.
  - **Kriteria terima:** close-up tajam di retina · pukulan sinkron dengan transisi antar bab · ≥ 55 fps di HP flagship
  - **Verifikasi:** overlay FPS di perangkat nyata + review host
  - **Dependensi:** 1, 23
  - **File:** `src/themes/solo/gong/*` (≤ 4 file)
  - **Ukuran:** M

- [ ] **Tugas 25: Gunungan produksi + gate sinematik + sapuan bab**
  - **Deskripsi:** Gunungan dari Tugas 2 dipindah ke engine. Gate: blencong, volumetric light menembus tatahan, cahaya mengikuti kursor (gyroscope di HP), animasi "membuka". Sapuan gunungan sebagai mask reveal antar bab.
  - **Kriteria terima:** gate → prolog tanpa layar loading (preload) · izin gyroscope iOS diminta lewat ketukan "Begin" · fallback sentuh kalau izin ditolak
  - **Verifikasi:** uji manual iPhone/Android + e2e gate yang sudah ada tetap hijau
  - **Dependensi:** 2, 23
  - **File:** `src/themes/solo/gunungan/*`, `src/app/page.tsx`
  - **Ukuran:** M

- [ ] **Tugas 26: Siklus waktu + post-FX**
  - **Deskripsi:** Keadaan subuh/siang/senja/malam (LUT, langit, kabut, cahaya) di-blend mengikuti posisi slide. Selective bloom, DOF, grain, dan vignette per tier.
  - **Kriteria terima:** pergantian fase halus tanpa lompatan warna · foto dari banyak sumber terlihat satu karakter warna · tier Low tetap indah
  - **Verifikasi:** screenshot per fase + overlay FPS
  - **Dependensi:** 23
  - **File:** `src/engine/three/timeOfDay.ts`, `src/engine/three/PostFX.tsx`, `src/themes/solo/luts/*`
  - **Ukuran:** M

- [ ] **Tugas 27: Benang emas**
  - **Deskripsi:** Garis tube berpendar yang tergambar sesuai progres slide, menyambung antar bab, dan terlihat di atas diorama.
  - **Kriteria terima:** garis maju/mundur sesuai navigasi · kilau ikut bloom
  - **Verifikasi:** uji visual maju-mundur
  - **Dependensi:** 26
  - **File:** `src/themes/solo/thread/*`
  - **Ukuran:** S

- [ ] **Tugas 28: Diorama Solo** 🔑 *(akses jaringan ke OSM/Overpass)*
  - **Deskripsi:** Bangunan, jalan, dan sungai dari OSM di-extrude bergaya miniatur. Landmark (keraton, Pasar Gede, Mangkunegaran) dimodel sederhana. Ada versi malam dengan jendela dan lampu menyala. Shot Hari 1 dan prolog.
  - **Kriteria terima:** landmark dikenali · ≤ 6 MB setelah kompresi · atribusi OSM ada di credits
  - **Verifikasi:** overlay FPS + ukuran aset + review host
  - **Dependensi:** 26, 27
  - **File:** `scripts/assets/osm-diorama.ts`, `src/themes/solo/diorama/*`, `public/models/diorama.glb`
  - **Ukuran:** M

- [ ] **Tugas 29: Lereng Lawu + kebun teh + Candi Sukuh** 🔑 *(akses jaringan untuk DEM)*
  - **Deskripsi:** Terrain dari heightmap, barisan teh (instanced), Candi Sukuh berundak, fog + volumetric sunrise. Shot Hari 2.
  - **Kriteria terima:** suasana kabut pagi terasa · ≤ 6 MB · ≥ 55 fps di HP flagship (tier High/Medium)
  - **Verifikasi:** overlay FPS + review host
  - **Dependensi:** 26
  - **File:** `scripts/assets/dem-terrain.ts`, `src/themes/solo/lawu/*`
  - **Ukuran:** M

- [ ] **Tugas 30: Canting + kain mori + torehan malam**
  - **Deskripsi:** Model canting (lathe + tube), kain dengan shader/simulasi sederhana, dan torehan malam yang membentuk motif parang/kawung lalu menyambung ke benang emas. Shot Hari 3.
  - **Kriteria terima:** *payoff* "benang emas = lilin batik" terbaca jelas · motif rapi
  - **Verifikasi:** review host + overlay FPS
  - **Dependensi:** 26, 27
  - **File:** `src/themes/solo/batik/*`
  - **Ukuran:** M

- [ ] **Tugas 31: Sistem partikel per fase**
  - **Deskripsi:** Kepingan emas (hero gong), gelombang pukulan, debu di berkas cahaya, kabut/daun teh, percikan arang, dan serbuk emas. Jumlahnya mengikuti tier.
  - **Kriteria terima:** jumlah partikel turun otomatis di tier rendah · tidak ada lonjakan frame saat muncul
  - **Verifikasi:** overlay FPS per tier
  - **Dependensi:** 23, 26
  - **File:** `src/engine/three/particles/*`
  - **Ukuran:** M

### ✅ Checkpoint 5
- [ ] S1–S2 (PRD §4) tercapai di perangkat uji dengan semua inti 3D aktif · review host

---

## Fase 6 — Finale & Polish (14 – 20 Des 2026)

- [ ] **Tugas 32: Boarding pass bertali + epilog**
  - **Deskripsi:** Tag dengan physics Rapier (tali), satu per tamu dari data privat, swipe antar nama, "Hosted by", serta tombol Open Today / Add to Home Screen / Message your host.
  - **Kriteria terima:** bisa ditarik dan diayun di desktop dan HP · nama dari data privat (tidak ada di bundle)
  - **Verifikasi:** uji manual + tes grep bundle tetap lolos
  - **Dependensi:** 23, 11
  - **File:** `src/themes/solo/boarding-pass/*`, `src/components/film/Epilogue.tsx`
  - **Ukuran:** M

- [ ] **Tugas 33: End credits**
  - **Deskripsi:** Credits bergulir ala film (tim, foto, font, data peta) + halaman `/credits` statis.
  - **Kriteria terima:** setiap foto di manifest muncul dengan pemilik + lisensi + tautan
  - **Verifikasi:** e2e membandingkan isi credits dengan manifest
  - **Dependensi:** 21
  - **File:** `src/components/film/EndCredits.tsx`, `src/app/credits/page.tsx`, `e2e/credits.spec.ts`
  - **Ukuran:** S

- [ ] **Tugas 34: Polish interaksi**
  - **Deskripsi:** Microinteraction (input kode, toggle, tombol), tilt panel + kilau mengikuti pointer/gyro, letterbox kartu bab, shared element gate → prolog dan kartu bab → header Today, kartu "Say it in Javanese".
  - **Kriteria terima:** semua baris matriks efek PRD §8 tercentang · Calm mode tetap bersih
  - **Verifikasi:** checklist matriks efek di `docs/qa/effects-checklist.md`
  - **Dependensi:** 19, 24, 25
  - **File:** `src/components/film/*` (≤ 5 file), `docs/qa/effects-checklist.md`
  - **Ukuran:** M

- [ ] **Tugas 35: OG image + pesan WhatsApp**
  - **Deskripsi:** Gambar link preview yang netral (gunungan di latar nila), metadata, dan template pesan pengantar EN (link dan kode dikirim di pesan terpisah).
  - **Kriteria terima:** preview tampil benar saat link ditempel di WhatsApp · tanpa info pribadi
  - **Verifikasi:** uji tempel link di WhatsApp
  - **Dependensi:** 13
  - **File:** `public/og.png`, `src/app/layout.tsx`, `docs/launch/whatsapp-message.md`
  - **Ukuran:** S

- [ ] **Tugas 36: Audio per adegan** *(dasar selesai 8 Nov 2026 di Tugas 13a)*
  - **Deskripsi:** Pasang `playSfx`/`playBed` ke adegan: gong dipukul → `gong` + `api-naga` di frame tumbukan; gunungan dibalik → `gunungan-balik` + pindah ke `gendhing`; keris bangkit → `keris-bangkit`; penutup → `gendhing` sampai gong akhir. Opsional: ganti SFX sintesis dengan versi ElevenLabs.
  - **Kriteria terima:** efek jatuh ≤ 50 ms dari visual · tidak pernah bunyi tanpa aksi pengguna · sambutan ≤ 1,5 MB sebelum mulai berbunyi
  - **Verifikasi:** uji manual iPhone (sakelar senyap on/off) & Android · e2e `sound.spec.ts`
  - **Dependensi:** 13a, 24, 25
  - **File:** `src/engine/audio/*`, adegan terkait
  - **Ukuran:** S

### ✅ Checkpoint 6
- [ ] Matriks efek PRD §8 terpenuhi · review host menyeluruh

---

## Fase 7 — QA & Serah Terima (21 – 27 Des 2026 → serah terima Senin 28 Des) · Tugas 39–40 menjelang trip

- [ ] **Tugas 37: Uji perangkat + tuning performa** 🔑 *(akses iPhone & Android flagship, Q10)*
  - **Deskripsi:** Jalankan matriks perangkat PRD §14, ukur FPS per bab, lalu tuning sampai target tercapai.
  - **Kriteria terima:** S1–S4 hijau di semua perangkat dalam matriks
  - **Verifikasi:** laporan `docs/qa/devices.md` berisi angka per perangkat per bab
  - **Dependensi:** CP6
  - **File:** `docs/qa/devices.md` + perbaikan terkait
  - **Ukuran:** M

- [ ] **Tugas 38: Aksesibilitas + proofread EN/ID**
  - **Deskripsi:** Audit a11y, alt text, kontras, dan keyboard. Proofread EN oleh penutur yang fasih (Q13) dan review istilah Jawa oleh guide/translator.
  - **Kriteria terima:** 0 typo · Lighthouse a11y Today ≥ 95 · istilah Jawa disetujui
  - **Verifikasi:** cspell + Lighthouse + tanda tangan reviewer di `docs/qa/proofread.md`
  - **Dependensi:** CP6
  - **File:** `content/trips/solo/trip.ts`, `docs/qa/proofread.md`
  - **Ukuran:** S

- [ ] **Tugas 39: Verifikasi fakta pertama (H-14)**
  - **Deskripsi:** Cek semua item [V] (jam buka, harga, jadwal wayang orang, aturan keraton, nomor darurat) lalu isi `verifiedAt`.
  - **Kriteria terima:** semua [V] terverifikasi atau diganti
  - **Verifikasi:** `content:check` memperingatkan field `verifiedAt` yang kosong
  - **Dependensi:** 8
  - **File:** `content/trips/solo/trip.ts`
  - **Ukuran:** S

- [ ] **Tugas 40: Runbook peluncuran (H-5 → H-1)** 🔑 *(revisi host di H-5)*
  - **Deskripsi:** H-5: revisi host lalu `content:publish`. H-4: verifikasi kedua, cek status Supabase, dry-run. H-3 (atau lebih awal): kirim link + kode di pesan terpisah. H-1: cek terakhir.
  - **Kriteria terima:** tamu berhasil masuk · Today menampilkan Hari 0 dengan benar
  - **Verifikasi:** checklist `docs/launch/runbook.md` tercentang semua
  - **Dependensi:** 37, 38, 39
  - **File:** `docs/launch/runbook.md`
  - **Ukuran:** S

### ✅ Checkpoint 7
- [ ] Semua ukuran keberhasilan PRD §4 hijau · tamu berhasil masuk · standby selama trip
