# Aturan kerja di repo ini

- Saat mulai sesi, baca `HANDOFF.md` kalau ada.
- Untuk tugas aktif, pakai `query_graph` dari Graphify dulu buat mencari file dan fungsi yang relevan. Buka bagian kode yang diperlukan saja dan cek perubahan lokal sebelum mengedit.
- **Setiap menyelesaikan satu tugas, kecil maupun besar, wajib memperbarui `HANDOFF.md` dan rencana pekerjaan berikutnya** (aturan host, 11 Nov 2026). Isinya 3 poin: yang selesai, hasil tes atau kendala, dan langkah berikutnya. Jangan menunggu akhir sesi; perbarui begitu tugasnya selesai, lalu commit.
- Permintaan baru dari host di tengah sesi dicatat dulu di `HANDOFF.md` sebelum kodenya dikerjakan.

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

Diperbarui 12 Nov 2026.

- [x] **1. Selesaikan revisi film 2D.** ✅ 11 Nov 2026. Catatan audit host (tes langsung, 11 Nov): siklus waktu di gallery belum rapi dan belum mulus. Yang diminta dan sudah dikerjakan:
  - Matahari muncul perlahan mulai dari jadwal pertama setelah sarapan.
  - Matahari bergerak saat slide digeser (mouse/jari) dan berhenti saat slide berhenti.
  - Posisi matahari mengikuti jam jadwal tiap stop.
  - Perpindahan ke jadwal berikutnya halus, tanpa lompatan.

  Keputusan host 11 Nov: di hari yang punya jadwal sebelum sarapan (Hari 2), matahari mengikuti jam terbit asli, jadi sudah menyembul di panel "Matahari terbit di Kemuning". Rinciannya: `docs/design/decisions.md` bagian "Siklus waktu di gallery". Catatan: mouse tidak men-scrub (hanya roda/trackpad per langkah); yang mengikuti tangan hanya scrub jari.
- [x] **2. Jadikan film 2D menjadi 2,5D.** ✅ 11 Nov 2026 untuk gallery. Jawaban host 11 Nov atas pertanyaan awal: 2,5D = kedalaman berlapis di film yang sudah ada (parallax antar lapisan, perspektif dan kemiringan ringan pada kartu, bayangan), tetap DOM dengan `transform` dan `opacity`, bukan WebGL; diterapkan di **gallery dulu**. Rinciannya: `docs/design/decisions.md` bagian "Gallery 2,5D". Sisa pekerjaan, semuanya menunggu tinjauan host atas pratinjau:
  - 2,5D di slide selain gallery (prolog, judul hari, gong, epilog, credits).
  - Uji di MacBook dan iPhone asli: di Chromium tanpa GPU, pindah panel di desktop sesekali mencatat satu frame 50–67 ms (angka lengkap di `HANDOFF.md` bagian 3).
  - Hubungan dengan F2 (panggung 3D) belum diputuskan host.
- [x] **3. Home 2,5D dengan desain baru.** ✅ 11 Nov 2026. Permintaan host 11 Nov: "upgrade home ke 2,5d sama benerin ui home", diperjelas "ganti aja design nya, button juga". Home = halaman `/` (gerbang kode dan sambutan); 2,5D memakai arti dari Tugas 2. Yang dikerjakan: panggung berlapis yang mengikuti kursor, kartu undangan dan boarding pass tergantung di benang emas, tombol baru (`.hb`) khusus home. Rinciannya: `docs/design/decisions.md` bagian "Home 2,5D dengan desain baru" dan `HANDOFF.md` bagian 1. Sisa pekerjaan, menunggu tinjauan host:
  - Uji di Safari, iPhone, dan MacBook asli (di sesi hanya Chromium).
  - Apakah gaya tombol baru ikut dipakai di Today dan film.
- [x] **4. Sesi per tab.** ✅ 11 Nov 2026. Keluhan host: browser sudah di-reset dan tab baru masih masuk tanpa kode. Keputusan host: kode diminta lagi di tiap tab atau browser baru; Today yang dipasang ke Home Screen tetap ingat supaya bisa offline. Rinciannya: `docs/design/decisions.md` bagian "Sesi per tab" dan `HANDOFF.md` bagian 1b.

### Panggung 3D (arahan host 12 Nov 2026, prioritas tinggi)

Kata host: "upgrade panggung 3D semaksimal mungkin", "step by step (output) per task/kerjaan", bebas teknologi, boleh remodel dan redesign asal tidak jauh dari konsep. Rincian dan status: `HANDOFF.md` bagian 0. Tiap tugas ditutup dengan output yang sudah dites, pratinjau ke host, commit + push, dan pembaruan `HANDOFF.md`.

Aturan tambahan dari host (12 Nov, sesudah Tugas 5):
- **"beban hemat tapi jangan turunkan kualitas"**: hemat lewat cara menggambar, bukan lewat menurunkan resolusi atau detail.
- **"video=output"**: pratinjau tiap tugas berupa video yang mulus. Video Tugas 5 yang pertama patah-patah dan host minta direkam ulang; cara dan kendalanya ada di `HANDOFF.md` bagian 0.
- **"tunggu arahan ku dulu"**: sesudah Tugas 5, jangan mulai rekam ulang atau Tugas 6 sebelum host memberi arahan.

- [x] **5. Panggung 3D (React Three Fiber) + mesin film 3D.** ✅ 12 Nov 2026. Kanvas lazy hanya di `/film/`, shot kamera per slide yang mengikuti transisi, tier kualitas High/Medium/Low/Static, pemantau FPS, overlay FPS (`/film/?fps`), dan latar pertama (pendapa, blencong, lanskap sawah dan Lawu, langit yang mengikuti jam). Rinciannya: `docs/design/decisions.md` bagian "Panggung 3D, fondasi" dan `HANDOFF.md` bagian 0. Sisa pekerjaan:
  PR #7 di-merge host 12 Nov. Uji host di iPhone (produksi, `/film/?fps`): 59–60 fps di tier Medium; host: "oke sih, aku anggep udah selesai". Catatan:
  - Tier High tidak pernah terlihat di HP host dan penyebabnya belum dipastikan (lihat `HANDOFF.md` bagian 0). Cek dengan `/film/?fps&stage=high`.
  - Pengatur sempat menurunkan resolusi satu anak tangga, jadi HP itu tidak punya banyak ruang di atas Medium: tiap isi baru perlu dicek lagi di perangkat.
  - Belum diuji di MacBook, Android, atau iPhone lama.
- [ ] **6. Gong ageng 3D** dengan pukulan (klik/tap/Enter) dan bunyi.
- [ ] **7. Gunungan** sebagai gerbang sinematik dan sapuan antar bab.
- [ ] **8. Benang emas (desain ulang) dan siklus waktu 3D**, post-FX, partikel.
- [ ] **9. Diorama Solo.**
- [ ] **10. Lereng Lawu.**
- [ ] **11. Canting dan kain mori.**
- [ ] **12. Boarding pass 3D dengan fisika.**

Panduan merge untuk host ada di `HANDOFF.md` bagian 5.

Sesudah daftar ini habis, tanya host sebelum lanjut.
