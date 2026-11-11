# HANDOFF

Diperbarui 11 Nov 2026 (WIB) · branch kerja `claude/gallant-hopper-1jlpo0` · PR #5 terbuka, menunggu host klik Squash and merge
Konteks proyek dan aturan yang tidak boleh dilanggar: `docs/handoff/FABLE-5.2.md`. Keputusan desain: `docs/design/decisions.md`.

## 1. Yang selesai

**F1, film 2D** (Tugas 17–20) sudah bisa ditonton dari prolog sampai credits di `/film/`.

- Mesin slide murni di `src/engine/slides/`: `controller.ts` (satu gerakan = satu slide, antrean maksimal satu, scrub jari 35%), `input.ts` (pengenal gerakan roda/trackpad dari amplop kecepatan, sentuhan, keyboard), `build-slides.ts` (trip-data → ±50 slide dan bab), `timeline.ts` (transisi di atas Web Animations), `live.ts`.
- Tampilan di `src/components/film/`: `Film.tsx`, `director.ts`, `transitions.ts` (slide, rel gallery, sapuan kayon, crossfade Calm), `Slides.tsx`, `Gallery.tsx`, `DetailSheet.tsx`, `Chrome.tsx`, `film.css`.
- Yang ada di layar: gallery menyamping per hari (9, 8, 9 panel), sheet detail dengan shared element, indikator bab, hash per bab (`#day-2`), petunjuk sekali pakai, sakelar Calm, tombol Today, ganti bahasa tanpa pindah slide.
- Slide tiket dan credits pas selayar (roda dan geseran tetap memindah slide); panduan Add to Home Screen dibuka sebagai sheet.
- Alat: `scripts/preview/measure-film.cjs` (ukur kehalusan) dan `scripts/preview/record-film.cjs` (rekam video HD gerak lambat).
- Pratinjau untuk host sudah dikirim (11 Nov): 2 video HD 60 fps (desktop 1920×1080, HP 1080 px tegak) dan 4 lembar tangkapan layar EN/ID dengan data asli. Berkas itu memuat nama asli tamu, jadi tidak ada di repo. Versi bernama tiruan: `docs/design/previews/film_f1_desktop_en.jpg` dan `film_f1_hp_id.jpg`.
- Dokumen: bagian "Film 2D, F1" di `docs/design/decisions.md`, tabel v4 di `docs/design/motion-tokens.md`, Tugas 17–20 di `tasks/todo.md`.
- Keputusan host di sesi ini: hibrida GSAP (F1 tanpa GSAP, GSAP masuk di F2 untuk koreografi 3D); branch ini dibangun di atas `claude/zen-knuth-6kig68`.
- **PR #5 siap di-merge (11 Nov).** `main` sudah digabung ke branch ini, jadi PR tidak lagi konflik dan isinya tinggal F1 (39 berkas). Judul dan deskripsi PR sudah diganti dari "Fase 2: Today" menjadi F1. Pratinjau Vercel: https://kulonuwun-solo-git-claude-gallant-hopper-1jlpo0-jixx1.vercel.app

## 2. Hasil tes atau kendala

- Hijau (dijalankan ulang 11 Nov sesudah merge `main`): `pnpm typecheck`, `pnpm lint`, `pnpm test` (172 unit), `pnpm content:check`, `pnpm build`, `pnpm test:e2e` (116 lulus, 10 dilewati per perangkat).
- Kehalusan (Chromium tanpa GPU): 0 frame > 50 ms di 10 momen desktop dan 11 momen iPhone, frame terpanjang 33 ms.
- Belum diuji di perangkat nyata: trackpad MacBook dan Safari iPhone. Jejak trackpad di tes adalah model, bukan rekaman; ambangnya ada di `SLIDE` dan `INPUT` (`src/engine/motion/tokens.ts`). Web Animations di Safari belum teruji (hanya Chromium tersedia di sesi).
- Lighthouse a11y untuk film belum dijalankan.
- Foto masih 0, jadi panel gallery berupa poster tipografi. Kontak di `trip_private` masih kosong, jadi slide tim dan tombol "Message your host" belum muncul di produksi.
- Gong masih cakram 2D tanpa bunyi; audio per adegan belum ada.
- Data asli dari backend (kode tamu dev) terbaca benar di film: nama panggilan di judul, nama lengkap di tiket, tanpa data tim untuk peran tamu.
- **Audit host, tes langsung (11 Nov):** transisi pagi → malam di gallery kurang rapi dan kurang mulus. Sekarang langitnya lima lapisan terpisah (subuh, siang, senja, malam) yang di-crossfade per panel menurut `phase` stop, dan mataharinya bagian dari gambar latar, jadi ia melompat antar posisi alih-alih bergerak.
- `main` sudah memuat Fase 2 (Today, PWA, bunyi tombol) lewat PR #4 (squash, `993ab0f`). F1 baru ada di branch ini sampai PR #5 di-merge.
- PR #5 sempat konflik di 8 berkas karena squash PR #4 memutus riwayat: isi `main` sama persis dengan `4cdffd2` (leluhur branch ini), tetapi commit-nya berbeda. Diselesaikan dengan merge `main` tanpa mengubah satu berkas pun (tree sebelum dan sesudah identik).
- Graphify mengindeks `main`, jadi berkas film belum ada di graf sampai branch ini di-merge. Untuk berkas itu, baca langsung dari disk.

## 3. Langkah berikutnya

0. **Perbaiki siklus waktu di gallery (catatan audit host, kerjakan sebelum F2).** Yang diminta host:
   - Matahari muncul perlahan mulai dari jadwal pertama setelah sarapan.
   - Matahari bergerak saat slide digeser (mouse/jari) dan berhenti saat slide berhenti.
   - Posisi matahari mengikuti jam jadwal tiap stop.
   - Perpindahan ke jadwal berikutnya halus, tanpa lompatan.

   Titik masuk di kode: lapisan `.fl-sky` di `src/components/film/film.css`, lintasan langit di `src/components/film/transitions.ts`, dan `sky` per slide di `src/engine/slides/build-slides.ts` (sekarang hanya dari `stop.phase`). Arah perbaikan: satu elemen matahari yang posisinya dihitung dari `stop.start` terhadap `day.sunrise`/`day.sunset`, digerakkan lewat lintasan `Timeline` yang sama dengan rel kartu (transform saja), supaya ikut scrub dan berhenti bersama slide; warna langit bergradasi mengikuti jam yang sama.
1. Host meninjau F1 (pratinjau foto dan video) dan mencobanya di iPhone serta MacBook; kalibrasi ambang bila terasa kurang pas.
2. Host klik **Squash and merge** di PR #5 (https://github.com/jize-666/itinerary/pull/5). Sesudah itu produksi ikut diperbarui dan `/film/` berisi F1.
   - Sesudah PR #5 di-merge, mulai pekerjaan berikutnya dari `main` terbaru (`git fetch origin main && git checkout -B <branch> origin/main`). Jangan menumpuk commit di atas riwayat lama: squash membuat riwayatnya berbeda dan PR berikutnya akan konflik lagi.
3. F2, panggung 3D (Tugas 23): R3F dimuat lazy hanya di `/film/`, satu canvas di belakang DOM, shot kamera per slide dari `Timeline.progress()`, tier High/Medium/Low/Static dengan pemantau FPS, infrastruktur aset per bab, overlay FPS lewat `/film/?fps=1`, GSAP untuk koreografi.
4. Sesudah itu F3 (gong produksi dengan bunyi) dan F4 (gunungan produksi dan gerbang sinematik).
