# HANDOFF

Diperbarui 11 Nov 2026 (WIB) · branch kerja `claude/gallant-hopper-1jlpo0` · PR #5 terbuka (F1 + revisi siklus waktu), menunggu host klik Squash and merge
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
- **Siklus waktu di gallery (Tugas 1 di `CLAUDE.md`, 11 Nov).** Langit dan matahari kini dihitung dari jam stop (`src/engine/slides/sky.ts`): satu elemen matahari (`.fl-sun`) melintas di pita langit di atas kartu, kiri → kanan = terbit → terbenam; tak tampak sampai sarapan, muncul perlahan di jadwal berikutnya; warna langit bergradasi menurut jam yang sama. Geraknya memakai `Timeline` yang sama dengan rel kartu, jadi ikut jari saat scrub dan berhenti bersama slide. Rincian: `docs/design/decisions.md` bagian "Siklus waktu di gallery", token `SKY` di `docs/design/motion-tokens.md` v5.
- `scripts/preview/record-film.cjs` punya tur kedua: argumen ke-5 `gallery` merekam satu hari penuh di gallery Hari 1 (di iphone termasuk scrub jari yang ditahan).
- Pratinjau siklus waktu sudah dikirim ke host di chat (11 Nov): 2 video HD 60 fps (HP dan desktop) dan lembar tangkapan layar. Datanya bernama tiruan, jadi lembarnya juga ada di repo: `docs/design/previews/film_siklus_waktu_desktop_en.jpg` dan `film_siklus_waktu_hp_id.jpg`.
- **PR #5 siap di-merge (11 Nov).** `main` sudah digabung ke branch ini, jadi PR tidak lagi konflik dan isinya tinggal F1 (39 berkas). Judul dan deskripsi PR sudah diganti dari "Fase 2: Today" menjadi F1. Pratinjau Vercel: https://kulonuwun-solo-git-claude-gallant-hopper-1jlpo0-jixx1.vercel.app

## 2. Hasil tes atau kendala

- Hijau (11 Nov, sesudah revisi siklus waktu): `pnpm typecheck`, `pnpm lint`, `pnpm test` (190 unit, 18 baru di `tests/unit/sky.test.ts`), `pnpm content:check`, `pnpm build`, `pnpm test:e2e` (127 lulus, 11 dilewati per perangkat; 6 uji baru "siklus waktu di gallery").
- Gerak matahari terukur per frame (iPhone tiruan): saat jari ditahan di tengah scrub, matahari bergeser 0 px selama 36 frame; di transisi penuh tidak ada langkah mundur, lompatan terbesar per frame 2,6 px.
- Kehalusan (`measure-film.cjs`, Chromium tanpa GPU): iPhone 0 frame > 50 ms di 11 momen, terpanjang 17 ms. Desktop: momen gallery 0 frame > 50 ms di tiga kali ukur, p95 17–33 ms (sebelum revisi 17 ms; tambahannya dari lapisan matahari). Momen "slide → slide" di prolog kadang mencatat satu frame tepat di 50 ms; itu sudah ada sebelum revisi (terpanjang 50 ms juga di kode lama) dan berpindah-pindah antar pengukuran, jadi derau mesin tanpa GPU.
- **Menunggu keputusan host:**
  - Hari 2: panel "Matahari terbit di Kemuning" (05:15) dan sarapan (06:45) tampil tanpa matahari, sesuai aturan "muncul setelah sarapan". Mataharinya baru muncul di Candi Cetho (08:15). Kalau host ingin matahari sudah terbit di panel Kemuning, ubah aturan `sunFrom` di `dayLight()` (`src/engine/slides/sky.ts`).
  - "Sarapan" dikenali dari data sebagai panel makan pertama hari itu yang mulai sebelum 10:00 (`SKY.breakfastBefore`). Tidak ada penanda sarapan khusus di skema konten.
  - Mouse tidak men-scrub (keputusan F1: hanya roda/trackpad per langkah). Dengan mouse, matahari bergerak selama transisi lalu berhenti; yang mengikuti tangan hanya scrub jari.
- Belum diuji di perangkat nyata: trackpad MacBook dan Safari iPhone. Jejak trackpad di tes adalah model, bukan rekaman; ambangnya ada di `SLIDE` dan `INPUT` (`src/engine/motion/tokens.ts`). Web Animations di Safari belum teruji (hanya Chromium tersedia di sesi).
- Lighthouse a11y untuk film belum dijalankan.
- Foto masih 0, jadi panel gallery berupa poster tipografi. Kontak di `trip_private` masih kosong, jadi slide tim dan tombol "Message your host" belum muncul di produksi.
- Gong masih cakram 2D tanpa bunyi; audio per adegan belum ada.
- Data asli dari backend (kode tamu dev) terbaca benar di film: nama panggilan di judul, nama lengkap di tiket, tanpa data tim untuk peran tamu.
- Audit host, tes langsung (11 Nov): transisi pagi → malam di gallery kurang rapi dan kurang mulus (langit di-crossfade per fase, matahari bagian dari gambar latar sehingga melompat). Sudah diperbaiki, lihat bagian 1.
- `main` sudah memuat Fase 2 (Today, PWA, bunyi tombol) lewat PR #4 (squash, `993ab0f`). F1 baru ada di branch ini sampai PR #5 di-merge.
- PR #5 sempat konflik di 8 berkas karena squash PR #4 memutus riwayat: isi `main` sama persis dengan `4cdffd2` (leluhur branch ini), tetapi commit-nya berbeda. Diselesaikan dengan merge `main` tanpa mengubah satu berkas pun (tree sebelum dan sesudah identik).
- Graphify mengindeks `main`, jadi berkas film belum ada di graf sampai branch ini di-merge. Untuk berkas itu, baca langsung dari disk.

## 3. Langkah berikutnya

1. Host meninjau pratinjau siklus waktu (video HP dan desktop) dan memutuskan tiga hal di bagian 2 ("Menunggu keputusan host"). Sekalian mencoba F1 di iPhone dan MacBook; kalibrasi ambang bila terasa kurang pas.
2. Host klik **Squash and merge** di PR #5 (https://github.com/jize-666/itinerary/pull/5). Saran Claude: merge dulu, 2,5D dikerjakan sebagai PR terpisah. Sesudah itu produksi ikut diperbarui dan `/film/` berisi F1.
   - Sesudah PR #5 di-merge, mulai pekerjaan berikutnya dari `main` terbaru (`git fetch origin main && git checkout -B <branch> origin/main`). Jangan menumpuk commit di atas riwayat lama: squash membuat riwayatnya berbeda dan PR berikutnya akan konflik lagi.
3. **Tugas 2 di `CLAUDE.md`: film 2D menjadi 2,5D.** Tanyakan dulu ke host arti 2,5D yang dimaksud dan hubungannya dengan F2 sebelum menulis kode. Bahan yang sudah ada: matahari dan lapisan langit kini elemen terpisah yang digerakkan `Timeline`, jadi parallax antar lapisan bisa memakai lintasan yang sama.
4. F2, panggung 3D (Tugas 23): R3F dimuat lazy hanya di `/film/`, satu canvas di belakang DOM, shot kamera per slide dari `Timeline.progress()`, tier High/Medium/Low/Static dengan pemantau FPS, infrastruktur aset per bab, overlay FPS lewat `/film/?fps=1`, GSAP untuk koreografi.
5. Sesudah itu F3 (gong produksi dengan bunyi) dan F4 (gunungan produksi dan gerbang sinematik).
