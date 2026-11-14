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
   - **Pratinjau** foto dan/atau video dikirim ke host di chat (video lewat `scripts/preview/record-film.cjs`, Today lewat `scripts/preview/record-today.cjs`). Berkas yang memuat nama asli tamu tidak boleh masuk repo.
   - **Data pratinjau = trip klien April** (aturan host 14 Nov: "kalo record preview pake akun client aja yang april"): rekam dengan trip Solo 7–11 April 2027 yang sebenarnya, bukan data tiruan e2e. Buat datanya dengan `pnpm -s exec tsx scripts/preview/client-data.ts <scratchpad>/client.json` (konten `content/trips/solo`, disusun sama seperti respons `trip-data`), simpan di scratchpad. Data privat (nama asli, WhatsApp, jam jemput) hanya ada di Supabase dan kode booking klien tidak tersimpan di repo, jadi di pratinjau diisi pengganti ("Your Name"). Rekam versi **desktop dan HP** untuk halaman yang punya keduanya (Today, home).
   - **PR** siap **Squash and merge**: commit, push, tanpa konflik dengan `main`, judul dan deskripsi sesuai isi. Host sendiri yang klik merge; jangan pernah merge sendiri.
   - **Perbarui berkas ini**: centang tugas yang selesai, tulis tanggalnya, catat sisa pekerjaan. Perbarui juga `HANDOFF.md`.

## Daftar tugas (kerjakan urut)

Diperbarui 14 Nov 2026.

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
  - Gaya tombol baru dipakai juga di Today sejak 14 Nov (lihat 4b); film tetap `.pb`.
- [x] **4. Sesi per tab.** ✅ 11 Nov 2026. Keluhan host: browser sudah di-reset dan tab baru masih masuk tanpa kode. Keputusan host: kode diminta lagi di tiap tab atau browser baru; Today yang dipasang ke Home Screen tetap ingat supaya bisa offline. Rinciannya: `docs/design/decisions.md` bagian "Sesi per tab" dan `HANDOFF.md` bagian 1b.

- [x] **4b. Today 2,5D dengan desain dan tombol baru.** ✅ 14 Nov 2026. Permintaan host 14 Nov (dengan tangkapan layar Today sebelum trip): "ini sekalian, button ui, design nya sekalian. buat 2,5D sekalian, sekaligus fitur yang gw mau seperti di handoff.md". Latar berlapis (langit mengikuti jam, Lawu, perbukitan, debu emas), kamera parallax (kursor/kemiringan HP), perspective shift pada kartu dan judul, kedalaman ikut gulir (scroll-driven animation), tombol kapsul berbahasa home, medali centang Before you go. Rinciannya: `docs/design/decisions.md` bagian "Today 2,5D" dan `HANDOFF.md` bagian 0. Sisa pekerjaan, menunggu tinjauan host atas video:
  - Uji di iPhone asli: izin sensor gerak diminta sekali dari sentuhan pertama; scroll-driven animation butuh Safari 26 ke atas (di bawahnya kartu diam, parallax tetap).

### Panggung 3D (arahan host 12 Nov 2026, prioritas tinggi)

Kata host: "upgrade panggung 3D semaksimal mungkin", "step by step (output) per task/kerjaan", bebas teknologi, boleh remodel dan redesign asal tidak jauh dari konsep. Rincian dan status: `HANDOFF.md` bagian 0. Tiap tugas ditutup dengan output yang sudah dites, pratinjau ke host, commit + push, dan pembaruan `HANDOFF.md`.

Aturan tambahan dari host (12 Nov, sesudah Tugas 5):
- **"beban hemat tapi jangan turunkan kualitas"**: hemat lewat cara menggambar, bukan lewat menurunkan resolusi atau detail.
- **"video=output"**: pratinjau tiap tugas berupa video yang mulus. Video Tugas 5 yang pertama patah-patah dan host minta direkam ulang; cara dan kendalanya ada di `HANDOFF.md` bagian 0.
- **"tunggu arahan ku dulu"**: sesudah Tugas 5, jangan mulai rekam ulang atau Tugas 6 sebelum host memberi arahan.
- **Gerak kamera di semua objek (13 Nov):** "pastikan di setiap objek 3D (semua), harus ada semuanya itu. bahkan di film 2,5D juga harus ada; perspective shift, scroll driven depth, kamera parallax". Setiap objek dan slide 3D yang sudah ada maupun yang akan dibuat, dan film 2,5D, wajib punya: kamera parallax (kursor di desktop, kemiringan HP di HP), perspective shift (perspektif sungguh berubah), dan kedalaman yang mengikuti gulir. Rinciannya di `HANDOFF.md` bagian 0.

- [x] **5. Panggung 3D (React Three Fiber) + mesin film 3D.** ✅ 12 Nov 2026. Kanvas lazy hanya di `/film/`, shot kamera per slide yang mengikuti transisi, tier kualitas High/Medium/Low/Static, pemantau FPS, overlay FPS (`/film/?fps`), dan latar pertama (pendapa, blencong, lanskap sawah dan Lawu, langit yang mengikuti jam). Rinciannya: `docs/design/decisions.md` bagian "Panggung 3D, fondasi" dan `HANDOFF.md` bagian 0. Sisa pekerjaan:
  PR #7 di-merge host 12 Nov. Uji host di iPhone (produksi, `/film/?fps`): 59–60 fps di tier Medium; host: "oke sih, aku anggep udah selesai". Catatan:
  - Tier High tidak pernah terlihat di HP host. Penyebabnya ditemukan 14 Nov: Safari melaporkan ≤ 4 inti sehingga iPhone diturunkan ke Medium. Sejak 14 Nov iPhone/iPad dipaksa High (arahan host "paksa tier high ke iphone"), dan pengatur hanya melepasnya bila rata-rata < 35 fps. Host cek `/film/?fps` di iPhone: harus tertulis `high ×1 (paksa)`.
  - Pengatur sempat menurunkan resolusi satu anak tangga, jadi HP itu tidak punya banyak ruang di atas Medium: tiap isi baru perlu dicek lagi di perangkat.
  - Belum diuji di MacBook, Android, atau iPhone lama.
- [x] **6. Gong ageng 3D** dengan pukulan (klik/tap/Enter) dan bunyi. ✅ 13 Nov 2026. Gong, gayor, dan naga 3D; dipukul sendiri saat tiba di slide gong dan lagi dengan klik/tap/Enter; kilatan, retakan bara, riak, bunga api, napas api naga, bunyi, hentakan kamera (habis tepat di 2,5 dtk); bingkai slide gong dilebarkan. Ditambah atas arahan host 13 Nov: zoom gong (cubit, Ctrl+roda, tombol +/−) dan dua tahap gulir. Rinciannya: `docs/design/decisions.md` bagian "Gong ageng 3D di panggung" dan `HANDOFF.md` bagian 0. Sisa pekerjaan:
  - Uji di perangkat nyata (`/film/?fps`), termasuk cubit dan giroskop.
  - Kepingan bara yang berkumpul jadi gong di prolog: ditunda, dikerjakan bila host masih mau. Batara Kala dan keris: dilewati atas arahan host.
- [x] **7. Gunungan** sebagai pembuka dan penutup film (keputusan host 13 Nov: "pembuka dan penutupan saja, sapuanya pakai yang lama"; sapuan antar bab tetap bayangan kayon DOM). ✅ 14 Nov 2026. Rupa dua muka (Agung, dan Murka gaya wayang dengan garuda) diterima host 13 Nov. Pembuka: film 3D dibuka dengan gunungan tertancap di gedebog di depan kelir berlampu (bayangan tatahan jatuh di kelir); gulir/geser/panah maju mencabutnya (di HP mengikuti jari) dan kamera maju ke prolog; mundur di slide pertama menancapkannya lagi. Penutup: di credits gulir maju (atau diam 12 dtk) menancapkannya lagi dengan gong. Klik/tap/Enter membaliknya ke muka Murka. Rinciannya: `docs/design/decisions.md` bagian "Gunungan pembuka dan penutup film" dan `HANDOFF.md` bagian 0. Sisa pekerjaan, menunggu tinjauan host atas video:
  - Uji di perangkat nyata (`/film/?fps`): gerbang di HP, geser jari, bunyi balik dan gong tancep.
  - Lama menunggu gunungan di 4G belum diukur (tekstur ±1,2–1,6 MB diunduh bersamaan dengan bundle 3D; sesudah 6 dtk film dibuka tanpa gerbang).
- [ ] **8. Benang emas (desain ulang) dan siklus waktu 3D**, post-FX, partikel.
- [ ] **9. Diorama Solo.**
- [ ] **10. Lereng Lawu.**
- [ ] **11. Canting dan kain mori.**
- [ ] **12. Boarding pass 3D dengan fisika.**

Panduan merge untuk host ada di `HANDOFF.md` bagian 5.

Sesudah daftar ini habis, tanya host sebelum lanjut.
