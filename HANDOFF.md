# HANDOFF

Diperbarui 11 Nov 2026 (WIB) · branch kerja `claude/gallant-hopper-1jlpo0` (dibuat ulang dari `main` sesudah PR #5 di-merge) · **tugas aktif: home 2,5D + benahi UI home**
Konteks proyek dan aturan yang tidak boleh dilanggar: `docs/handoff/FABLE-5.2.md`. Keputusan desain: `docs/design/decisions.md`.

## 1. Tugas aktif: home 2,5D + benahi UI home

**Permintaan host (11 Nov, di tengah sesi beres-beres):** "upgrade home ke 2,5d sama benerin ui home, catat di handoff.md dulu".

- **Yang dimaksud "home"** (tafsiran sesi ini, belum dikonfirmasi host): halaman `/`, yaitu gerbang "Kulonuwun?" (kotak kode booking) dan sambutan sesudah kode benar (sapaan, tiket, tombol "Begin the lakon"). Berkasnya: `src/components/{Gate,CodeInput,BeginChoice,Ticket}.tsx`, gaya di `src/app/globals.css`.
- **Yang dimaksud "2,5D"** mengikuti keputusan host 11 Nov untuk gallery: kedalaman berlapis (parallax antar lapisan, perspektif dan kemiringan ringan pada kartu, bayangan), tetap DOM dengan `transform` dan `opacity`, bukan WebGL. Gerbang harus tetap ringan (target ≤ 80 KB gz sebelum kode benar) dan menghormati reduced motion.
- **"Benerin UI home"**: host belum merinci apa yang salah. Langkah pertama adalah memotret home di desktop dan iPhone tiruan (EN dan ID), mendaftar cacat yang terlihat, lalu memperbaikinya. Daftar cacat dan perbaikannya dicatat di bagian ini.
- **Status:** dicatat, belum ada kode yang diubah.

## 2. Yang selesai di sesi ini (beres-beres, pilihan host)

- **PR #5 sudah di-merge** host (11 Nov, squash "revisi design (#5)"). Isi `main` sama persis dengan branch kerja sebelum merge. Branch kerja dibuat ulang dari `origin/main`.
- **Lighthouse a11y untuk film: 100.** Dijalankan dengan Lighthouse 13.6 pada build `main`, data tiruan, di 16 layar (hero, tiap jenis slide prolog, judul hari, intro hari, panel gallery, sheet detail, gong, epilog, pass, credits) × EN/ID × HP/desktop = 64 audit, semuanya 100, termasuk audit kontras. Batasnya: Lighthouse tidak bisa menilai kontras teks di atas gradasi atau gambar, jadi teks di atas langit tetap perlu dilihat mata di perangkat nyata.
- Di `main`: `pnpm typecheck`, `pnpm lint`, `pnpm test` (195 unit), `pnpm build` hijau.

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

## 4. Rencana ke depan

Urutan usulan; host yang memutuskan.

1. **Home 2,5D + benahi UI home** (bagian 1), sedang dikerjakan.
2. **Host:** coba `/film/` dan home di iPhone dan MacBook asli.
3. **Penyesuaian gallery dari tinjauan host**: kemiringan kartu (`DEPTH.cardTurn`, `cardZ`), jarak parallax (`DEPTH.hillsNear`), letak dan ukuran matahari (`.fl-sunbox`), kartu tetangga padat atau tembus pandang.
4. **2,5D film di luar gallery**: parallax saat pindah slide vertikal, kedalaman pada kartu judul hari dan gong.
5. **F2, panggung 3D** (Tugas 23): R3F dimuat lazy hanya di `/film/`, tier High/Medium/Low/Static, overlay FPS. Perlu keputusan host: apakah 2,5D menjadi tier Medium/Low di bawah panggung 3D, atau menggantikannya.
6. F3 (gong produksi dengan bunyi) dan F4 (gunungan produksi dan gerbang sinematik).
7. Di luar film: foto berlisensi (Tugas 6, 21), kontak di `trip_private`, verifikasi fakta [V].

Setiap pekerjaan baru dimulai dari `main` terbaru: `git fetch origin main && git checkout -B <branch> origin/main`. Jangan menumpuk commit di atas riwayat lama; squash membuat riwayatnya berbeda dan PR berikutnya akan konflik.

## 5. Panduan PR: Squash and merge

**Keadaan semua PR per 11 Nov.** PR #1 sampai #5 sudah di-merge ke `main`. PR untuk tugas aktif (bagian 1) belum dibuat.

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
