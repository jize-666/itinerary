# Aturan kerja di repo ini

- Saat mulai sesi, baca `HANDOFF.md` kalau ada.
- Untuk tugas aktif, pakai `query_graph` dari Graphify dulu buat mencari file dan fungsi yang relevan. Buka bagian kode yang diperlukan saja dan cek perubahan lokal sebelum mengedit.
- **Setiap menyelesaikan satu tugas, kecil maupun besar, wajib memperbarui `HANDOFF.md` dan rencana pekerjaan berikutnya** (aturan host, 11 Nov 2026). Isinya 3 poin: yang selesai, hasil tes atau kendala, dan langkah berikutnya. Jangan menunggu akhir sesi; perbarui begitu tugasnya selesai, lalu commit.
- Permintaan baru dari host di tengah sesi dicatat dulu di `HANDOFF.md` sebelum kodenya dikerjakan.
- **Bagi tugas** (arahan host 18 Nov: "jangan lupa bagi tugas. haiku untuk task paling ringan, sonnet untuk task sedang, dan kamu opus, otaknya"): pekerjaan paling ringan (mengukur, mencocokkan, mendaftar, memindai) ke subagen Haiku; pekerjaan sedang (mengubah kode atau dokumen dengan arahan jelas, menulis tes) ke subagen Sonnet; Opus merencanakan, memutuskan, meninjau hasil subagen, dan menggabungkan. Fable hanya atas izin host.

## Kalau host bilang "lanjut tugas, baca isi claude.md"

1. Hal pertama: baca berkas ini, lalu `HANDOFF.md`. Jangan mulai dari ingatan atau ringkasan sesi.
2. Cek status PR branch kerja. Kalau sudah di-merge, mulai dari `main` terbaru (`git fetch origin main && git checkout -B <branch> origin/main`), jangan menumpuk commit di riwayat lama.
3. Kerjakan "Daftar tugas" di bawah secara urut, mulai dari tugas pertama yang belum dicentang. Jangan melompati urutan.
4. Setiap sesi wajib ditutup dengan keempat hal ini:
   - **Output**: perubahan yang benar-benar jalan dan sudah dites (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm content:check`, `pnpm build`, `pnpm test:e2e`).
   - **Pratinjau** foto dan/atau video dikirim ke host di chat (video lewat `scripts/preview/record-film.cjs`, Today lewat `scripts/preview/record-today.cjs`). Berkas yang memuat nama asli tamu tidak boleh masuk repo.
   - **Pratinjau dicatat untuk Google Drive host** (folder `previews`, id `1H-wMJltMnVnX2oJFjLQ9BkaTMVSHJCiX`; aturan host 17 Nov: "tandai yang sudah dikirim dan yang belum dikirim, ingatkan aku jika sudah menyentuh 1gb", mengganti "langsung up ke gdrive").
     - Tiap pratinjau yang dikirim ke host di chat langsung dicatat: `python3 scripts/preview/drive-upload.py catat <berkas>...` (buku catatan `docs/previews-ledger.json`).
     - Bila `status` menulis "INGATKAN HOST" (yang belum di Drive ≥ 1 GB), ingatkan host di chat dan minta token Google baru lewat formulir aman (langkahnya di `HANDOFF.md`).
     - Setelah token ada, jalankan `unggah 1H-wMJltMnVnX2oJFjLQ9BkaTMVSHJCiX`. Token OAuth Playground berlaku ±1 jam; 401 = minta token baru.
   - **Data pratinjau = trip klien April** (aturan host 14 Nov: "kalo record preview pake akun client aja yang april"): rekam dengan trip Solo 7–11 April 2027 yang sebenarnya, bukan data tiruan e2e. Buat datanya dengan `pnpm -s exec tsx scripts/preview/client-data.ts <scratchpad>/client.json` (konten `content/trips/solo`, disusun sama seperti respons `trip-data`), simpan di scratchpad. Data privat (nama asli, WhatsApp, jam jemput) hanya ada di Supabase dan kode booking klien tidak tersimpan di repo, jadi di pratinjau diisi pengganti. Nama tamu di pratinjau = nama host, **"Jize"** (arahan host 17 Nov: "pakai namaku jika mau record, jize"); WhatsApp, alamat, dan jam jemput tetap pengganti netral. Rekam versi **desktop dan HP** untuk halaman yang punya keduanya (Today, home).
   - **PR** siap **Squash and merge**: commit, push, tanpa konflik dengan `main`, judul dan deskripsi sesuai isi. Host sendiri yang klik merge; jangan pernah merge sendiri.
   - **Perbarui berkas ini**: centang tugas yang selesai, tulis tanggalnya, catat sisa pekerjaan. Perbarui juga `HANDOFF.md`.

## Daftar tugas (kerjakan urut)

Diperbarui 19 Nov 2026 (PR #12–#18 di-merge; Tugas 8 selesai, tinggal sisa yang menunggu host). Di luar urutan, atas arahan host 18 Nov malam ("bukan suara. supabase, connect in"): Jize Zone v2 tersambung ke Supabase "live-second-brain" dan tayang di https://jize-zone.vercel.app; tinggal URL login di Supabase (`HANDOFF.md` bagian 0). Suara Clawd 39 klip EN dan gong datar film 2,5D selesai 19 Nov, PR menunggu host. Berikutnya: Tugas 9 dengan arahan host.

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
  - Gaya tombol baru dipakai juga di Today sejak 14 Nov (lihat 4b dan 4c, tanpa tebal 3D); film tetap `.pb`. Kartu boarding pass home kini modul bersama `src/components/pass/` (home, Today, slide tiket film).
- [x] **4. Sesi per tab.** ✅ 11 Nov 2026. Keluhan host: browser sudah di-reset dan tab baru masih masuk tanpa kode. Keputusan host: kode diminta lagi di tiap tab atau browser baru; Today yang dipasang ke Home Screen tetap ingat supaya bisa offline. Rinciannya: `docs/design/decisions.md` bagian "Sesi per tab" dan `HANDOFF.md` bagian 1b.

- [x] **4b. Today 2,5D dengan desain dan tombol baru.** ✅ 14 Nov 2026. Permintaan host 14 Nov (dengan tangkapan layar Today sebelum trip): "ini sekalian, button ui, design nya sekalian. buat 2,5D sekalian, sekaligus fitur yang gw mau seperti di handoff.md". Latar berlapis (langit mengikuti jam, Lawu, perbukitan, debu emas), kamera parallax (kursor/kemiringan HP), perspective shift pada kartu dan judul, kedalaman ikut gulir (scroll-driven animation), tombol kapsul berbahasa home, medali centang Before you go. Rinciannya: `docs/design/decisions.md` bagian "Today 2,5D" dan `HANDOFF.md` bagian 0. Sisa pekerjaan, menunggu tinjauan host atas video:
  - Uji di iPhone asli: izin sensor gerak diminta sekali dari sentuhan pertama; scroll-driven animation butuh Safari 26 ke atas (di bawahnya kartu diam, parallax tetap).

- [x] **4c. Audit host 1–5.** ✅ 14 Nov 2026. Arahan host: "perbaiki audit 1-5, step by step, per audit wajib cek point di handoff.md". Dua belas butir di `HANDOFF.md` bagian 0 ("Audit host 1–5") dicentang satu per satu dengan bukti tes, satu commit per audit. Isinya: segi delapan hitam di blencong, gunungan, dan kelir (NaN di shader: `pow` berdasar negatif, `atan(0, 0)` di pusat lampu balik kelir, `sqrt` negatif, `smoothstep` terbalik; plus saringan NaN di rantai post), sheet SOS dan seluruh Today berdesain baru (tombol tanpa tebal, boarding pass home di Today dan film lewat `src/components/pass/`, hitung mundur angka besar, medali hari, kartu stop, tanpa garis punggung bukit), bingkai prolog headline di HP tegak, bidang gelap teks film yang tembus saat HP dimiringkan, dan hemat bandwidth GPU di tier High. Dikonfirmasi host di iPhone produksi 14 Nov 19.11 WIB ("fps aman, ga berat. done"): `high ×1 (paksa)` bertahan, segi delapan tidak terlihat di blencong, fase gong 40 fps (sebelumnya 30), intro prolog rata-rata 42. Cadangan fps (efek tembus pandang ke target tanpa MSAA) tidak dikerjakan; tetap tercatat di `HANDOFF.md` bagian 0 sebagai pilihan.

### Panggung 3D (arahan host 12 Nov 2026, prioritas tinggi)

Kata host: "upgrade panggung 3D semaksimal mungkin", "step by step (output) per task/kerjaan", bebas teknologi, boleh remodel dan redesign asal tidak jauh dari konsep. Rincian dan status: `HANDOFF.md` bagian 0. Tiap tugas ditutup dengan output yang sudah dites, pratinjau ke host, commit + push, dan pembaruan `HANDOFF.md`.

Aturan tambahan dari host (12 Nov, sesudah Tugas 5):
- **"beban hemat tapi jangan turunkan kualitas"**: hemat lewat cara menggambar, bukan lewat menurunkan resolusi atau detail.
- **"video=output"**: pratinjau tiap tugas berupa video yang mulus. Video Tugas 5 yang pertama patah-patah dan host minta direkam ulang; cara dan kendalanya ada di `HANDOFF.md` bagian 0.
- **"tunggu arahan ku dulu"**: sesudah Tugas 5, jangan mulai rekam ulang atau Tugas 6 sebelum host memberi arahan.
- **Gerak kamera di semua objek (13 Nov):** "pastikan di setiap objek 3D (semua), harus ada semuanya itu. bahkan di film 2,5D juga harus ada; perspective shift, scroll driven depth, kamera parallax". Setiap objek dan slide 3D yang sudah ada maupun yang akan dibuat, dan film 2,5D, wajib punya: kamera parallax (kursor di desktop, kemiringan HP di HP), perspective shift (perspektif sungguh berubah), dan kedalaman yang mengikuti gulir. Rinciannya di `HANDOFF.md` bagian 0.

- [x] **5. Panggung 3D (React Three Fiber) + mesin film 3D.** ✅ 12 Nov 2026. Kanvas lazy hanya di `/film/`, shot kamera per slide yang mengikuti transisi, tier kualitas High/Medium/Low/Static, pemantau FPS, overlay FPS (`/film/?fps`), dan latar pertama (pendapa, blencong, lanskap sawah dan Lawu, langit yang mengikuti jam). Rinciannya: `docs/design/decisions.md` bagian "Panggung 3D, fondasi" dan `HANDOFF.md` bagian 0. Sisa pekerjaan:
  PR #7 di-merge host 12 Nov. Uji host di iPhone (produksi, `/film/?fps`): 59–60 fps di tier Medium; host: "oke sih, aku anggep udah selesai". Catatan:
  - Tier High tidak pernah terlihat di HP host. Penyebabnya ditemukan 14 Nov: Safari melaporkan ≤ 4 inti sehingga iPhone diturunkan ke Medium. Sejak 14 Nov iPhone/iPad dipaksa High (arahan host "paksa tier high ke iphone"). Revisi 14 Nov sore (keluhan host "masih medium"): perangkat yang dipaksa hanya turun bila fps median < 35 terus-menerus 10 dtk, dan kembali ke High begitu lancar; frame lambat saat memuat tidak lagi melepas paksaan. Dikonfirmasi host 14 Nov 19.11 WIB: intro prolog dan slide gong tertulis `high ×1 (paksa)`.
  - Pengatur sempat menurunkan resolusi satu anak tangga, jadi HP itu tidak punya banyak ruang di atas Medium: tiap isi baru perlu dicek lagi di perangkat.
  - Belum diuji di MacBook, Android, atau iPhone lama.
- [x] **6. Gong ageng 3D** dengan pukulan (klik/tap/Enter) dan bunyi. ✅ 13 Nov 2026. Gong, gayor, dan naga 3D; dipukul sendiri saat tiba di slide gong dan lagi dengan klik/tap/Enter; kilatan, retakan bara, riak, bunga api, napas api naga, bunyi, hentakan kamera (habis tepat di 2,5 dtk); bingkai slide gong dilebarkan. Ditambah atas arahan host 13 Nov: zoom gong (cubit, Ctrl+roda, tombol +/−) dan dua tahap gulir. Rinciannya: `docs/design/decisions.md` bagian "Gong ageng 3D di panggung" dan `HANDOFF.md` bagian 0. Sisa pekerjaan:
  - Uji di perangkat nyata (`/film/?fps`), termasuk cubit dan giroskop.
  - Kepingan bara yang berkumpul jadi gong di prolog: ditunda, dikerjakan bila host masih mau. Batara Kala dan keris: dilewati atas arahan host.
- [x] **7. Gunungan** sebagai pembuka dan penutup film (keputusan host 13 Nov: "pembuka dan penutupan saja, sapuanya pakai yang lama"; sapuan antar bab tetap bayangan kayon DOM). ✅ 14 Nov 2026. Rupa dua muka (Agung, dan Murka gaya wayang dengan garuda) diterima host 13 Nov. Pembuka: film 3D dibuka dengan gunungan tertancap di gedebog di depan kelir berlampu (bayangan tatahan jatuh di kelir); gulir/geser/panah maju mencabutnya (di HP mengikuti jari) dan kamera maju ke prolog; mundur di slide pertama menancapkannya lagi. Penutup: di credits gulir maju (atau diam 12 dtk) menancapkannya lagi dengan gong. Klik/tap/Enter membaliknya ke muka Murka. Rinciannya: `docs/design/decisions.md` bagian "Gunungan pembuka dan penutup film" dan `HANDOFF.md` bagian 0. Sisa pekerjaan, menunggu tinjauan host atas video:
  - Uji di perangkat nyata (`/film/?fps`): gerbang di HP, geser jari, bunyi balik dan gong tancep.
  - Lama menunggu gunungan di 4G belum diukur (tekstur ±1,2–1,6 MB diunduh bersamaan dengan bundle 3D; sesudah 6 dtk film dibuka tanpa gerbang).
- [x] **7b. Gong ditabuh di slide judul hari, sebelum gallery** (permintaan host 14 Nov 16.44; dikerjakan atas perintah host "kerjakan tugas 7B"). ✅ 14 Nov 2026. Jawaban host: `dayintro` tetap ada, gong penutup hari tetap dipukul, berlaku untuk semua hari dan hero prolog. Yang dikerjakan:
  - Di judul hari dan hero prolog, langkah maju pertama mengeluarkan teks (huruf tersedot ke pencu gong bersama debu emas) dan menabuh gong tanpa hentakan kamera; langkah berikutnya baru pindah. Mundur mengembalikan teks tanpa pukulan.
  - Gallery 3D: letak Z (kamera bergeser ±1 m per panel; tanah dekat, dataran, Lawu bergeser berbeda) dan depth of field (tier High: fokus dekat saat diam, ditarik ke lanskap selama geseran mengikuti gulir atau jari).

  Rinciannya: `docs/design/decisions.md` bagian "Gong ditabuh di slide judul hari dan hero prolog" dan "Gallery 3D: letak Z dan depth of field", dan `HANDOFF.md` bagian 0. Sisa pekerjaan, menunggu host:
  - Tinjau video dan PR #12; uji di iPhone produksi (`/film/?fps`): tahap gong di judul, dan fps gallery dengan DOF di `high ×1 (paksa)`. Beban DOF di renderer perangkat lunak +16% waktu frame, hanya di gallery High.
  - Api naga saat gong judul ditabuh sebagian keluar bingkai atas (kamera sengaja tidak diubah); bila host ingin terlihat utuh, shot judul perlu dilebarkan.
  - Tambahan 14 Nov malam (host: "dua dua nya, 90derajat"): zoom di judul hari dan hero, dan kamera mengitari gong ±90° (seret mouse, jari, atau trackpad) di judul, hero, dan gong penutup. Digabung di PR #12 (host: "gabung pr sebelumnya dan sekarang"). CI merah PR #12 diperbaiki: tes DOF memperlambat geseran lewat laju animasi, dan tarikan jari pelan tapi panjang di slide tanpa scrub kini satu langkah.
- [x] **Maskot Clawd (permintaan host 15 Nov, di luar urutan; dikerjakan atas arahan host).** Pemandu 3D di film: rupa dari `claude-3d-reference-kit` v4 milik host (M1, "update maskot"), gerak lentur (arahan host "ganti aturan tanpa stretch itu"), gelembung ucapan piksel dengan perkenalan dan reaksi klik (M2, "nama dia clawd", "gas m2"), memandu di film 3D dan menggantikan teks petunjuk lama (M3, 16 Nov: "jangan lupa untuk menghapus semua text pemandu yang lama"). ✅ M1–M3 16 Nov 2026, M4 17 Nov 2026 (host: "selesain project clawd dulu, baru aku merge ketika sudah selesai"): Clawd juga di film 2,5D (balok CSS 3D), teks petunjuk lama dihapus seluruhnya, gerak pandang Clawd di kedua film. Rinciannya: `docs/design/decisions.md` bagian "Maskot pemandu…", "Clawd: gelembung…", "Clawd memandu di film 3D", "Clawd di film 2,5D…", dan `HANDOFF.md` bagian 0. Sisa pekerjaan:
  - Uji di iPhone produksi (`/film/?fps`): fps dengan Clawd di `high ×1 (paksa)`, ketukan pada Clawd, letaknya di gallery, dan Clawd 2,5D (Calm).
  - Suara Clawd (17 Nov): host memilih suara perempuan buatan host sendiri. Clone tidak bisa (konektor ElevenLabs tanpa alat clone, paket berbayar host habis), jadi dibuat lewat Voice Design. Pilihan host "clawd-deep-6" tersimpan sebagai suara "Clawd" di akun ElevenLabs host. Pemutar suaranya sudah dipasang 17 Nov (klip diputar saat gelembung muncul, gelembung menunggu klip, ikut sakelar suara; `docs/design/decisions.md` bagian "Suara Clawd"), di PR #13 (di-merge 17 Nov) bersama kenaikan Next.js 16.4.3 → 16.4.6 untuk GHSA-mfr8-8qww-v76h (host: "bebas, asal hasil yang terbaik"). Rekaman 78 klip menyusul di PR berikutnya; contoh EN/ID tertunda antrean gratis ElevenLabs. Rencana: `HANDOFF.md` bagian 0, "Rencana PR suara Clawd".
  - ✅ 17 Nov: emosi suara per kalimat. Dasarnya tenang; marah, senang, terkejut, dan mengantuk mengikuti reaksi Clawd (host: "kalo marah ya nada merah/tinggi, seneng/happy ya ekspresif").
  - ✅ 17 Nov: gelembung ucapan tidak pernah menutupi badan Clawd. Gelembung menyempit, pindah sisi, atau hurufnya diperkecil (host: "jangan sampai clawd terpotong bubble chat").
  - Suara baru (17–18 Nov, host: "suara clawd, ganti dengan ini"): rekaman pesan suara teman host, yang sudah setuju suaranya dipakai.
    - Rekaman dijernihkan (warna suara berubah ±1 dB; host: "jangan sampai rusak suaranya").
    - Ditiru dengan Chatterbox di CPU container, karena kuota ZeroGPU Hugging Face habis.
    - Empat contoh sudah dikirim ke host: tenang EN, marah EN, tenang ID dengan setelan Melayu, dan tenang ID dengan model Inggris.
    - ⏭️ 78 klip: dilewati dulu (host 18 Nov: "kerjakan tugas 8.2 + 8.3 dulu"). Dikerjakan sesudah host memilih contoh. Rekaman tidak masuk repo.
    - Pilihan host 18 Nov ("gw pilih suara temen gw yang en. gausa kasih indo."): suara teman host, bahasa Inggris saja. Jadi 39 klip EN, tanpa klip ID (film berbahasa Indonesia: Clawd tanpa suara). 39 klip dibuat 18 Nov oleh sesi branch `claude/gallant-hopper-1jlpo0` (pratinjau dan cadangan `clawd-klip-final.zip` dikirim ke host); rekaman yang dijernihkan dan venv Chatterbox masih ada di container sesi itu. Catatan PR #17 bahwa rekaman hilang hanya berlaku untuk container sesi Jize Zone.
    - ✅ 19 Nov: 39 klip masuk repo dari zip kiriman host ("ini suara clawd"). Diperiksa Haiku (nama, teks, kenyaringan) dan Sonnet (transkripsi Whisper lokal), diolah dengan jeda di tengah klip paling lama 0,6 dtk. Video pratinjau bersuara 2,5D dan 3D, desktop dan HP, dikirim. Sisa: host mendengar `intro.0`, `gong.1`, `tip.kayon.0`.
  - ✅ 19 Nov: gong datar di film 2,5D diperjelas jadi gong ageng perunggu (host bertanya "gada gong tapi bilang see the gong", memilih "a"). Rinciannya: `docs/design/decisions.md` bagian "Gong datar di film 2,5D diperjelas".
- [x] **8. Benang emas (desain ulang) dan siklus waktu 3D**, post-FX, partikel. ✅ 18 Nov 2026 (8.1–8.4). Dimulai 17 Nov atas arahan host ("mulai saja tugas 8"). Rincian dan status: `HANDOFF.md` bagian 0.
  - [x] **8.1 Desain ulang benang emas.** ✅ 17 Nov 2026.
    - Dua versi benang emas tidak memuaskan host ("upgrade lah, keliatan basic banget"), jadi konsepnya diganti atas pilihan host ("b aja coba").
    - Konsep baru, **Bengawan Solo dan larung lampion**:
      - sungai berkelok di pita bawah kartu gallery, memantulkan langit menurut jam;
      - satu lampion per tempat singgah;
      - perahu lampion hanyut mengikuti gulir dan menyalakan lampion yang dilewati.
    - Rinciannya: `docs/design/decisions.md` bagian "Bengawan Solo dan larung lampion".
  - [x] **Gerbang dimensi di gallery** (permintaan host 17 Nov, di luar rencana awal: "kayak ada vibes masuk atau keluar dimensi"). ✅ 17 Nov 2026.
    - Tiap geser panel, kamera menukik menembus kartu: lensa melebar, garis cahaya, riak, dan warna terpecah di tepi.
    - Dihaluskan atas arahan host ("bikin lebih smooth"; "kurangi dikit"): dorongan 2,3 m, lensa +20°.
    - Rinciannya: `docs/design/decisions.md` bagian "Gerbang dimensi di gallery".
  - [x] **8.2 Sisa siklus waktu 3D:** grading per fase (subuh, siang, senja, malam) di semua slide 3D, bukan hanya gallery. ✅ 18 Nov 2026 (host: "kerjakan tugas 8.2 + 8.3 dulu").
    - Grading dihitung dari keadaan langit yang sama dengan langit dan cahaya, jadi ikut jam tiap slide dan bergeser mulus mengikuti gulir.
    - Fase: gerbang (hero, judul, credits), malam (intro, gong penutup), subuh (pembuka hari), dan gallery mengikuti jam tempat singgah.
  - [x] **8.3 Post-FX.** ✅ 18 Nov 2026.
    - DOF gallery (dari 7b) dan efek gerbang dimensi sudah ada sebelumnya.
    - Grading warna di pass FINAL: CDL, saturasi, dan split toning sesudah encode sRGB, tanpa pass baru.
    - Kekuatannya satu angka (`GRADE_STRENGTH`), menunggu penilaian host.
    - Rinciannya: `docs/design/decisions.md` bagian "Grading warna per fase di semua slide 3D".
  - [x] **8.4 Partikel per fase.** ✅ 18 Nov 2026 (host: "dah gw merge, lanjut 8.4").
    - Empat jenis butir dalam satu draw call: debu lampu (gerbang), embun (subuh), debu emas (siang, menjingga saat senja), kunang-kunang (malam).
    - Kadarnya dari bobot fase yang sama dengan grading, jadi ikut jam tiap slide dan bergeser mulus mengikuti gulir.
    - Embun dan debu emas melayang di ruang udara di depan kamera; kunang-kunang di atas sawah, tepi sungai, dan halaman pendapa.
    - Rinciannya: `docs/design/decisions.md` bagian "Partikel per fase di panggung 3D".
  - Sisa pekerjaan, menunggu host:
    - tinjauan video gerbang dimensi versi halus;
    - jawaban soal kaki Clawd 3D yang tertutup kartu gallery;
    - uji di iPhone produksi (`/film/?fps`), termasuk sungai dan gerbang di `high ×1 (paksa)`.
- [ ] **9. Diorama Solo.**
- [ ] **10. Lereng Lawu.**
- [ ] **11. Canting dan kain mori.**
- [ ] **12. Boarding pass 3D dengan fisika.**

Panduan merge untuk host ada di `HANDOFF.md` bagian 5.

Sesudah daftar ini habis, tanya host sebelum lanjut.
