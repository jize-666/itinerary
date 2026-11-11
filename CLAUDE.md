# Aturan kerja di repo ini

- Saat mulai sesi, baca `HANDOFF.md` kalau ada.
- Untuk tugas aktif, pakai `query_graph` dari Graphify dulu buat mencari file dan fungsi yang relevan. Buka bagian kode yang diperlukan saja dan cek perubahan lokal sebelum mengedit.
- Setiap selesai satu langkah penting, perbarui `HANDOFF.md` dalam 3 poin: yang selesai, hasil tes atau kendala, dan langkah berikutnya.

## Kalau host bilang "lanjut tugas, baca isi claude.md"

1. Hal pertama: baca berkas ini, lalu `HANDOFF.md`. Jangan mulai dari ingatan atau ringkasan sesi.
2. Cek status PR branch kerja. Kalau sudah di-merge, mulai dari `main` terbaru (`git fetch origin main && git checkout -B <branch> origin/main`), jangan menumpuk commit di riwayat lama.
3. Kerjakan "Daftar tugas" di bawah secara urut, mulai dari tugas pertama yang belum dicentang. Jangan melompati urutan.
4. Setiap sesi wajib ditutup dengan keempat hal ini:
   - **Output**: perubahan yang benar-benar jalan dan sudah dites (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm content:check`, `pnpm build`, `pnpm test:e2e`).
   - **Pratinjau** foto dan/atau video dikirim ke host di chat (video lewat `scripts/preview/record-film.cjs`). Berkas yang memuat nama asli tamu tidak boleh masuk repo.
   - **PR** siap **Squash and merge**: commit, push, tanpa konflik dengan `main`, judul dan deskripsi sesuai isi. Host sendiri yang klik merge; jangan pernah merge sendiri.
   - **Perbarui berkas ini**: centang tugas yang selesai, tulis tanggalnya, catat sisa pekerjaan. Perbarui juga `HANDOFF.md`.

## Daftar tugas (kerjakan urut)

Diperbarui 11 Nov 2026.

- [x] **1. Selesaikan revisi film 2D.** ✅ 11 Nov 2026, menunggu tinjauan host atas pratinjau. Catatan audit host (tes langsung, 11 Nov): siklus waktu di gallery belum rapi dan belum mulus. Yang diminta dan sudah dikerjakan:
  - Matahari muncul perlahan mulai dari jadwal pertama setelah sarapan.
  - Matahari bergerak saat slide digeser (mouse/jari) dan berhenti saat slide berhenti.
  - Posisi matahari mengikuti jam jadwal tiap stop.
  - Perpindahan ke jadwal berikutnya halus, tanpa lompatan.

  Rinciannya: `docs/design/decisions.md` bagian "Siklus waktu di gallery". Sisa yang menunggu keputusan host (lihat `HANDOFF.md` bagian 2):
  - Hari 2: panel "Matahari terbit di Kemuning" (05:15) dan sarapan (06:45) tampil tanpa matahari, karena aturannya "muncul setelah sarapan". Kalau host ingin matahari sudah terbit di panel itu, cukup ubah aturan `sunFrom` di `src/engine/slides/sky.ts`.
  - Mouse tidak men-scrub (hanya roda/trackpad per langkah); matahari bergerak selama transisi lalu berhenti. Scrub yang mengikuti tangan hanya ada untuk jari.
- [ ] **2. Jadikan film 2D menjadi 2,5D.** Permintaan host 11 Nov, dikerjakan sesudah tugas 1. Host belum merinci arti 2,5D, jadi tanyakan dulu di awal tugas. Tafsiran kerja (usulan Claude, belum disetujui host): kedalaman berlapis di film yang sudah ada, yaitu parallax antar lapisan (langit, latar, kartu, teks), perspektif dan kemiringan ringan pada kartu dan gallery, serta bayangan. Tetap DOM dengan `transform` dan `opacity`, bukan WebGL. Hubungannya dengan F2 (panggung 3D) juga perlu diputuskan host.

Sesudah daftar ini habis, tanya host sebelum lanjut. Roadmap F2–F4 ada di `HANDOFF.md` bagian 3.
