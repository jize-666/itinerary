# HANDOFF

Diperbarui 11 Nov 2026 (WIB) · branch kerja `claude/gallant-hopper-1jlpo0` · **PR #5 terbuka dan siap di-merge** (F1 + siklus waktu + gallery 2,5D) · sesudah ini menunggu arahan host
Konteks proyek dan aturan yang tidak boleh dilanggar: `docs/handoff/FABLE-5.2.md`. Keputusan desain: `docs/design/decisions.md`.

## 1. Yang direvisi (sesi 11 Nov)

Dua tugas dari daftar di `CLAUDE.md`, keduanya selesai.

**Tugas 1: siklus waktu di gallery** (dari audit host: transisi pagi → malam tidak mulus, matahari melompat).
- Langit dan matahari kini dihitung dari jam stop (`src/engine/slides/sky.ts`, murni dan dites). Tiap panel membawa jam stop-nya dan jam terbit/terbenam hari itu.
- Satu elemen matahari (`.fl-sun`) melintas di pita langit di atas kartu: kiri → kanan = terbit → terbenam, tertinggi di tengah hari, membesar dan menghangat menjelang terbenam.
- Aturan muncul: hari yang dibuka dengan sarapan (Hari 1, 3) → matahari tak tampak sampai sarapan, muncul perlahan di jadwal berikutnya. Hari yang punya jadwal sebelum sarapan (Hari 2, **keputusan host 11 Nov**) → matahari mengikuti jam terbit asli, jadi sudah menyembul di panel "Matahari terbit di Kemuning".
- Warna langit bergradasi menurut jam yang sama, bukan sekali ganti per fase.
- Geraknya memakai `Timeline` yang sama dengan rel kartu: ikut jari saat scrub, diam saat jari diam, berhenti bersama slide.

**Tugas 2: gallery 2,5D** (host memilih: kedalaman berlapis, gallery dulu, tetap DOM tanpa WebGL).
- Rel kartu berada di ruang berperspektif. Kartu aktif menghadap penonton; tetangganya lebih jauh dan berpaling seperti panel di drum yang berputar. Saat pindah panel, kartu yang datang membuka dari miring ke datar.
- Parallax latar: bukit dipisah dari langit jadi dua elemen (`.fl-hills`); bukit dekat bergeser lebih lambat daripada kartu, bukit jauh diam bersama langit, matahari berjalan menurut jam.
- Bayangan kontak di bawah kartu. Calm tetap datar (tanpa perspektif, tanpa parallax).
- `Timeline` mendapat saluran `z` dan `rotateY` (tetap satu `transform`). Nilai kedalaman di `DEPTH` (`src/engine/motion/tokens.ts`).

**Pendukung.**
- `scripts/preview/record-film.cjs` punya tur kedua: argumen ke-5 `gallery` merekam satu hari penuh di gallery Hari 1 (di iphone termasuk scrub jari yang ditahan).
- Dokumen: `docs/design/decisions.md` bagian "Siklus waktu di gallery" dan "Gallery 2,5D"; `docs/design/motion-tokens.md` v5 (`SKY`) dan v6 (`DEPTH`).
- Pratinjau dikirim ke host di chat (video HP dan desktop, lembar tangkapan layar). Datanya bernama tiruan, jadi lembarnya juga ada di repo: `docs/design/previews/film_siklus_waktu_desktop_en.jpg`, `film_siklus_waktu_hp_id.jpg`, `film_25d_transisi_desktop_en.jpg`.

**Sebelum sesi ini (F1, Tugas 17–20), sudah di PR #5 juga.** Film 2D dari prolog sampai credits di `/film/`: mesin slide (`src/engine/slides/`: `controller.ts`, `input.ts`, `build-slides.ts`, `timeline.ts`, `live.ts`), tampilan (`src/components/film/`), gallery menyamping per hari (9, 8, 9 panel), sheet detail, indikator bab, hash per bab, Calm, ganti bahasa di tempat. Keputusan host: hibrida GSAP (F1 tanpa GSAP, GSAP masuk di F2).

## 2. Pekerjaan sekarang: status, hasil tes, kendala

**Status.** Semua pekerjaan ada di PR #5 (https://github.com/jize-666/itinerary/pull/5), tanpa konflik dengan `main`. Menunggu host: tinjau pratinjau, klik Squash and merge (panduan di bagian 4), lalu beri arahan berikutnya. Tidak ada pekerjaan yang sedang berjalan.

**Hasil tes (11 Nov, pada commit terakhir).**
- Hijau: `pnpm typecheck`, `pnpm lint`, `pnpm test` (195 unit), `pnpm content:check`, `pnpm build`, `pnpm test:e2e` (135 lulus, 11 dilewati per perangkat; desktop + iPhone 14 Pro).
- Gerak matahari per frame (iPhone tiruan): saat jari ditahan di tengah scrub, matahari bergeser 0 px selama 36 frame; di transisi penuh tidak ada langkah mundur, lompatan terbesar per frame 2,6 px.
- Kehalusan (`measure-film.cjs`, Chromium tanpa GPU): iPhone tiruan 0 frame > 50 ms di 11 momen, terpanjang 17 ms. **Desktop tanpa GPU: p95 33 ms saat pindah panel, dan di sebagian pengukuran ada satu frame 50–67 ms** (sebelum 2,5D: 0 frame > 50 ms). Penyebab terukur: lapisan selayar yang ikut digeser (bukit), bukan perspektif kartu. Sudah diringankan (bukit jauh diam, bukit dekat jadi lapisan tetap selama di gallery). Di perangkat ber-GPU lapisan sebanyak ini ringan, tetapi belum dibuktikan di MacBook asli.

**Kendala dan hal yang belum.**
- Belum diuji di perangkat nyata: trackpad MacBook dan Safari iPhone. Perspektif 3D (`preserve-3d`) dan Web Animations di Safari belum teruji; di sesi hanya ada Chromium. Ambang gerakan ada di `SLIDE` dan `INPUT`.
- Mouse tidak men-scrub (keputusan F1: roda/trackpad = satu langkah per gerakan). Dengan mouse, matahari dan kartu bergerak selama transisi lalu berhenti; yang mengikuti tangan hanya scrub jari.
- "Sarapan" dikenali dari data sebagai panel makan pertama hari itu yang mulai sebelum 10:00 (`SKY.breakfastBefore`). Tidak ada penanda sarapan khusus di skema konten.
- 2,5D baru di gallery. Slide lain (prolog, judul hari, gong, epilog, credits) masih datar, menunggu tinjauan host.
- Kartu tetangga masih tembus pandang (redup lewat opacity, seperti F1), jadi di tengah transisi bukit terlihat menembus kartu. Kalau host ingin kartu padat, perlu lapisan peredup di dalam kartu.
- Lighthouse a11y untuk film belum dijalankan.
- Foto masih 0, jadi panel gallery berupa poster tipografi. Kontak di `trip_private` masih kosong, jadi slide tim dan tombol "Message your host" belum muncul di produksi.
- Gong masih cakram 2D tanpa bunyi; audio per adegan belum ada.
- Graphify mengindeks `main`, jadi berkas film belum ada di graf sampai PR #5 di-merge. Sampai itu, baca langsung dari disk.

## 3. Rencana ke depan

Urutan usulan; host yang memutuskan.

1. **Host:** tinjau pratinjau, merge PR #5 (bagian 4), coba `/film/` di iPhone dan MacBook asli. Yang perlu diperhatikan: kehalusan pindah panel di MacBook, perspektif kartu di Safari, dan apakah ambang gesekan terasa pas.
2. **Penyesuaian dari tinjauan host** (PR kecil dari `main` terbaru): misalnya kuat-lemahnya kemiringan kartu (`DEPTH.cardTurn`, `cardZ`), jarak parallax (`DEPTH.hillsNear`), letak dan ukuran matahari (`.fl-sunbox`), kartu tetangga padat atau tembus pandang.
3. **2,5D di luar gallery**, bila host setuju setelah melihat gallery: parallax saat pindah slide vertikal (langit, bukit, teks pada kecepatan berbeda), kedalaman pada kartu judul hari dan gong.
4. **Kedalaman di dalam kartu** dan kemiringan yang mengikuti kursor/giroskop: opsional, belum diminta.
5. **F2, panggung 3D** (Tugas 23): R3F dimuat lazy hanya di `/film/`, satu canvas di belakang DOM, shot kamera per slide dari `Timeline.progress()`, tier High/Medium/Low/Static dengan pemantau FPS, overlay FPS lewat `/film/?fps=1`, GSAP untuk koreografi. Perlu keputusan host: apakah 2,5D ini menjadi tier Medium/Low di bawah panggung 3D, atau menggantikannya.
6. F3 (gong produksi dengan bunyi) dan F4 (gunungan produksi dan gerbang sinematik).
7. Di luar film: foto berlisensi (Tugas 6, 21), kontak di `trip_private`, Lighthouse a11y, verifikasi fakta [V].

Setiap pekerjaan baru dimulai dari `main` terbaru: `git fetch origin main && git checkout -B <branch> origin/main`. Jangan menumpuk commit di atas riwayat lama; squash membuat riwayatnya berbeda dan PR berikutnya akan konflik.

## 4. Panduan PR: Squash and merge dari awal sampai akhir

**Keadaan semua PR per 11 Nov.**

| PR | Isi | Status |
|---|---|---|
| #1 | Fondasi web, gerbang kode, audio gamelan, backend Supabase, prototipe 3D | Sudah di-merge (8 Nov) |
| #2 | Untuk satu tamu: gerbang undangan pribadi, tiket, hitung mundur, boarding pass | Sudah di-merge (9 Nov) |
| #3 | Animasi khas lakon untuk gerbang, transisi, itinerary | Sudah di-merge (9 Nov) |
| #4 | Fase 2: Today, PWA, bunyi tombol ("add sfx") | Sudah di-merge (10 Nov) |
| **#5** | **Film 2D (F1) + siklus waktu + gallery 2,5D** | **Terbuka, siap di-merge** |

Jadi yang perlu di-merge tinggal **satu**: PR #5. PR #1–#4 sudah ada di `main`; tidak ada yang perlu diulang.

**Langkah merge PR #5 (di GitHub, lewat browser).**
1. Buka https://github.com/jize-666/itinerary/pull/5.
2. Gulir ke bawah sampai kotak merge. Pastikan tertulis **All checks have passed** dan **No conflicts with base branch**. Kalau pemeriksaan masih berjalan (lingkaran kuning), tunggu sampai hijau.
3. Klik panah kecil di samping tombol hijau, pilih **Squash and merge**. Jangan pilih "Create a merge commit" atau "Rebase and merge".
4. Klik **Squash and merge**, lalu **Confirm squash and merge**. Judul dan deskripsi boleh dibiarkan apa adanya.
5. Tombol "Delete branch" yang muncul sesudahnya boleh diklik atau diabaikan; keduanya aman.

**Sesudah merge.**
- Vercel otomatis membangun produksi dari `main`. Tunggu beberapa menit, lalu buka https://kulonuwun-solo.vercel.app/film/ dan pastikan filmnya tampil.
- Kalau hasilnya ingin dicoba dulu sebelum merge, pakai pratinjau branch: https://kulonuwun-solo-git-claude-gallant-hopper-1jlpo0-jixx1.vercel.app/film/

**Menarik semuanya ke komputer host (belum pernah pull).**
- Sudah punya foldernya:
  ```
  git checkout main
  git pull origin main
  pnpm install
  ```
- Belum punya foldernya:
  ```
  git clone https://github.com/jize-666/itinerary.git
  cd itinerary
  pnpm install
  ```
- Menjalankan di komputer: `pnpm dev`, lalu buka http://localhost:3000. Satu kali `git pull origin main` sudah membawa isi PR #1 sampai #5 sekaligus, karena semuanya berakhir di `main`.
- Kalau `git pull` menolak karena ada perubahan lokal: `git stash`, ulangi `git pull origin main`, lalu `git stash pop`.

**Untuk PR berikutnya.** Aturannya sama: satu PR per pekerjaan, merge dengan Squash and merge, yang lebih lama dulu. Sesudah merge, kabari Claude ("sudah merge") supaya pekerjaan berikutnya dimulai dari `main` terbaru. Claude tidak pernah merge sendiri.
