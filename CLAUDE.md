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

- [x] **1. Selesaikan revisi film 2D.** ✅ 11 Nov 2026. Catatan audit host (tes langsung, 11 Nov): siklus waktu di gallery belum rapi dan belum mulus. Yang diminta dan sudah dikerjakan:
  - Matahari muncul perlahan mulai dari jadwal pertama setelah sarapan.
  - Matahari bergerak saat slide digeser (mouse/jari) dan berhenti saat slide berhenti.
  - Posisi matahari mengikuti jam jadwal tiap stop.
  - Perpindahan ke jadwal berikutnya halus, tanpa lompatan.

  Keputusan host 11 Nov: di hari yang punya jadwal sebelum sarapan (Hari 2), matahari mengikuti jam terbit asli, jadi sudah menyembul di panel "Matahari terbit di Kemuning". Rinciannya: `docs/design/decisions.md` bagian "Siklus waktu di gallery". Catatan: mouse tidak men-scrub (hanya roda/trackpad per langkah); yang mengikuti tangan hanya scrub jari.
- [x] **2. Jadikan film 2D menjadi 2,5D.** ✅ 11 Nov 2026 untuk gallery. Jawaban host 11 Nov atas pertanyaan awal: 2,5D = kedalaman berlapis di film yang sudah ada (parallax antar lapisan, perspektif dan kemiringan ringan pada kartu, bayangan), tetap DOM dengan `transform` dan `opacity`, bukan WebGL; diterapkan di **gallery dulu**. Rinciannya: `docs/design/decisions.md` bagian "Gallery 2,5D". Sisa pekerjaan, semuanya menunggu tinjauan host atas pratinjau:
  - 2,5D di slide selain gallery (prolog, judul hari, gong, epilog, credits).
  - Uji di MacBook dan iPhone asli: di Chromium tanpa GPU, pindah panel di desktop sesekali mencatat satu frame 50–67 ms (angka lengkap di `HANDOFF.md` bagian 2).
  - Hubungan dengan F2 (panggung 3D) belum diputuskan host.

**Daftar ini sudah habis (11 Nov 2026). Tunggu arahan host; jangan mulai pekerjaan baru sendiri.** Panduan merge untuk host ada di `HANDOFF.md` bagian 4.

Sesudah daftar ini habis, tanya host sebelum lanjut. Roadmap F2–F4 ada di `HANDOFF.md` bagian 3.
