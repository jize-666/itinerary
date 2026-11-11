# HANDOFF

Diperbarui 11 Nov 2026 (WIB) · branch kerja `claude/gallant-hopper-1jlpo0` (dibuat ulang dari `main` sesudah PR #5 di-merge) · **tugas aktif: home 2,5D dengan desain baru (kode jalan, tes hijau; tinggal poles, pratinjau, PR)**
Konteks proyek dan aturan yang tidak boleh dilanggar: `docs/handoff/FABLE-5.2.md`. Keputusan desain: `docs/design/decisions.md`.

## 1. Tugas aktif: home 2,5D dengan desain baru (Tugas 3)

**Permintaan host (11 Nov, berurutan):** "upgrade home ke 2,5d sama benerin ui home, catat di handoff.md dulu" → "ganti aja design nya, button juga" → "setelah menulis design, update ke handoff.md, sekalian planning pekerjaan selanjutnya".

Home = halaman `/` (gerbang kode dan sambutan). 2,5D memakai arti dari Tugas 2: kedalaman berlapis, DOM dengan `transform` dan `opacity`, bukan WebGL.

**Yang selesai (desain baru sudah ditulis dan jalan).**
- **Panggung berlapis** (`src/components/home/Scene.tsx`, `home.css`): langit malam, bintang, punggung Lawu, kabut, perbukitan, lantai pendapa bermotif kawung yang direbahkan dengan perspektif, dua kayon penjaga, pendar blencong, debu emas. Tiap lapisan bergeser dengan jarak berbeda mengikuti kursor (`useDepth.ts`, hitungan murni di `src/engine/motion/tilt.ts`); di layar sentuh lapisan berayun pelan lewat CSS. Nilai kedalaman di `HOME` (`src/engine/motion/tokens.ts`).
- **Gerbang:** kartu undangan bersudut lekuk tergantung di benang emas, berayun masuk seperti bandul, miring mengikuti kursor. Di dalamnya tiga bidang (alas, isi, cap) yang bergeser satu terhadap yang lain. Kode diketik ke dua baki (3 + 6 sel) dengan titik penanda di sel kosong. Kode benar → huruf menyala, kayon menyibak, kilat blencong, kartu berbalik.
- **Sambutan:** boarding pass baru (`home/Pass.tsx`), mendatar dengan sobekan di layar lebar dan tegak di HP, masuk dengan berbalik; cap "Admitted" jatuh dari depan saat lakon dimulai. Kunjungan ulang memakai tunda yang lebih singkat (0,35×).
- **Tombol baru (`.hb`)**: tombol utama kapsul foil gading-emas dengan medali gong, tautan berbenang emas untuk "Use a different code" (pindah ke bawah tombol utama), tombol speaker cincin tipis, sakelar bahasa kapsul bergaris (`Seg` varian `line`). Gaya baru hanya dipakai di home; Today dan film masih memakai `.pb`.
- **HP:** kartu di paruh atas layar (tidak tertutup keyboard), lanskap dengan puncak Lawu terlihat di bawahnya; tombol utama menempel di bawah layar.
- `globals.css` berkurang dari 3.200 ke 2.671 baris: aturan gerbang, kotak kode, dan sambutan lama dibuang. `Ticket.tsx` lama tetap dipakai Today dan film.

**Hasil tes dan kendala.**
- Hijau: `pnpm typecheck`, `pnpm lint`, `pnpm test` (203 unit, 8 baru untuk hitungan parallax), `pnpm build`, `pnpm test:e2e` (135 lulus, 11 dilewati per perangkat).
- Belum: tes e2e khusus kedalaman home, Lighthouse a11y home dengan desain baru, pemeriksaan layar kecil 360 px dan HP rebah, pratinjau foto dan video untuk host, dokumen desain.
- Hanya diuji di Chromium. `preserve-3d` dan mask sudut lekuk belum dilihat di Safari.

**Langkah berikutnya (urut).**
1. Periksa kemiringan kartu saat kursor di tepi, cap saat mulai, layar 360 px, HP rebah, teks ID; perbaiki yang janggal.
2. Tambah e2e untuk home 2,5D (variabel parallax ikut kursor, kayon menyibak, reduced motion diam) dan jalankan Lighthouse a11y home (target 100).
3. Ukur kehalusan (0 frame > 50 ms) di gerbang, saat kode benar, dan saat mulai.
4. Tulis `docs/design/decisions.md` bagian "Home 2,5D" dan `docs/design/motion-tokens.md` (`HOME`).
5. Kirim pratinjau foto dan video gerak lambat ke host; buka PR.

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

1. **Home 2,5D dengan desain baru** (bagian 1): sisa langkahnya di sana, lalu PR.
2. **Host:** tinjau pratinjau home, merge PR, lalu coba home dan `/film/` di iPhone dan MacBook asli (Safari belum pernah diuji).
3. **Putuskan gaya tombol:** apakah tombol baru (`.hb`) ikut dipakai di Today dan film, atau `.pb` tetap di sana. Kalau ikut, itu PR tersendiri: Today punya banyak tombol (dock, Rain plan, tab hari) dan tes `data-pressed`.
4. **Penyesuaian gallery dari tinjauan host**: kemiringan kartu (`DEPTH.cardTurn`, `cardZ`), jarak parallax (`DEPTH.hillsNear`), letak dan ukuran matahari (`.fl-sunbox`), kartu tetangga padat atau tembus pandang.
5. **2,5D film di luar gallery**: parallax saat pindah slide vertikal, kedalaman pada kartu judul hari dan gong.
6. **F2, panggung 3D** (Tugas 23): R3F dimuat lazy hanya di `/film/`, tier High/Medium/Low/Static, overlay FPS. Perlu keputusan host: apakah 2,5D menjadi tier Medium/Low di bawah panggung 3D, atau menggantikannya.
7. F3 (gong produksi dengan bunyi) dan F4 (gunungan produksi dan gerbang sinematik).
8. Di luar film: foto berlisensi (Tugas 6, 21), kontak di `trip_private`, verifikasi fakta [V].

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
