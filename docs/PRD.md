# PRD — *Lakon Tiga Hari*: Web Itinerary Sinematik Privat untuk Trip Solo

| | |
|---|---|
| **Status** | Draf v1.6 (**satu tamu**: gerbang, tiket pribadi, dan Today ditulis untuk satu orang). v1.5: audio gamelan masuk lingkup (rekaman host, gerbang dua tombol). v1.4: rute Belitung → Solo, katalog teks kinetik, gong & gunungan interaktif). v1.3: jadwal dipadatkan, selesai 28 Des 2026. v1.2: navigasi per slide, gong ageng sebagai objek hero 3D, inti 3D per bab, Figma tidak dipakai. Keputusan sementara Q1–Q6 direvisi host di H-5. |
| **Tanggal** | 7 November 2026 (trip ±5 bulan lagi, perkiraan awal April 2027) |
| **Pemilik produk** | Host (pemilik repo) |
| **Penyusun draf** | Claude, berdasarkan sesi tanya-jawab dengan host |
| **Bahasa dokumen** | Indonesia (istilah teknis dibiarkan dalam bahasa Inggris) |

**Legenda**
- **P0**: wajib ada di v1 · **P1**: sangat diinginkan di v1 · **P2**: dikerjakan kalau waktu cukup
- **[V]**: fakta lapangan (jam buka, harga, aturan, jadwal pertunjukan, ejaan istilah Jawa) yang **wajib diverifikasi** sebelum konten dikunci. Draf ini disusun tanpa akses internet ke sumber resmi.

---

## 0. Ringkasan

Kita membuat **satu web privat** untuk **satu tamu penting** (engine tetap mendukung 1–5) yang akan menjalani trip 3 hari di Solo (Surakarta). Web ini hanya punya **dua fungsi: jadwal trip dan pengenalan kota Solo**. Keduanya dikemas sebagai "film pendek" yang **dijalankan per slide**: satu scroll atau swipe memindahkan penonton ke satu shot berikutnya. Isinya prolog, tiga bab hari yang masing-masing bergerak dari **subuh sampai malam**, lalu epilog. Gunungan wayang membuka setiap babak, **gong ageng 3D** menutupnya, dan **benang emas** menjadi garis perjalanan yang menyambung semuanya. Bagian-bagian intinya **3D sungguhan**: gong, diorama kota Solo, lereng Lawu dengan Candi Sukuh, canting dan kain batik, serta boarding pass.

Web ini punya dua momen pakai:
1. **Sebelum berangkat (momen "wow")**: tamu membuka web di laptop, iPad, atau HP flagship dan menonton "film"-nya dengan efek penuh.
2. **Selama trip**: tamu memakai **mode Today** di HP, yaitu tampilan ringan, cepat, dan tetap jalan offline, berisi info hari itu dalam 1–2 ketukan.

Tamu ini **berpengaruh ke karir host**. Karena itu web ini juga menjadi cerminan host sebagai tuan rumah, dan standar kualitasnya adalah **maksimal**: nol typo, nol bug, diuji di perangkat sungguhan. Tenggat longgar, jadi kualitas lebih diutamakan daripada kecepatan.

---

## 1. Latar Belakang & Tujuan

### 1.1 Konteks
- Host menjamu tamunya sebagai bentuk **balas budi**. **Tidak ada transaksi** apa pun, baik di web maupun di trip.
- Tamu lancar berbahasa Inggris. Selama trip didampingi host dan guide lokal. **Tanpa translator** (keputusan host 10 Nov 2026: rekan tamu tidak jadi berangkat, host sendiri yang menerjemahkan).
- Host saat ini berada di Bangka Belitung dan baru ke Solo saat mengantar tamu. Karena itu **foto tidak bisa diambil sendiri**.
- Preferensi tamu (dari formulir yang diisi teman host berdasarkan info dari translator, lalu dikonfirmasi host):
  - **Aktivitas:** night ride, berburu sunrise/sunset, "movies", keliling santai
  - **Spot:** tempat estetik, alam & pemandangan, sejarah & budaya (keraton, batik), pasar & jajanan lokal
  - **Gaya trip:** **padat jadwal, ramai & hidup**
  - **Makan:** **halal, tanpa alkohol**. Manis boleh asal **tidak bikin eneg**. **Alergi pisang**. Kalau enak dan worth it, mahal tidak masalah.
  - **Penginapan:** wajib **kamar mandi dalam**, air bersih, lingkungan aman. Tanpa AC/wifi tidak masalah.
  - **Guide:** profesional, antusias, hangat & perhatian. **Kabari kalau terlambat. Jangan pernah meninggalkan tamu tiba-tiba.**
  - **Anggaran:** sekitar **Rp1–1,5 juta per hari** (lihat Asumsi A1)

### 1.2 Masalah yang diselesaikan
1. Itinerary biasa (PDF atau chat WhatsApp) terasa datar dan tidak meninggalkan kesan, padahal tamunya penting.
2. Tamu asing butuh **konteks budaya** (apa itu keraton, kenapa batik penting, kenapa ada dua istana) supaya kunjungannya bermakna.
3. Selama trip, tamu butuh info **cepat dan bisa diandalkan** (jam, titik jemput, dress code, kontak) tanpa harus menonton animasi.

### 1.3 Tujuan
| ID | Tujuan |
|---|---|
| G1 | Tamu merasakan momen "wow" saat pertama membuka web, dan pengalaman itu terasa personal, bukan template. |
| G2 | Setelah menonton, tamu paham garis besar 3 hari dan punya gambaran tentang Solo (sejarah, keraton, batik, kuliner). |
| G3 | Selama trip, info hari itu tersedia dalam ≤ 2 ketukan, termasuk saat sinyal lemah. |
| G4 | Web memperkuat citra host sebagai tuan rumah: rapi, akurat, perhatian pada detail. |
| G5 | Web bisa dipakai lagi untuk trip berikutnya cukup dengan mengganti data dan foto. |

---

## 2. Asumsi (koreksi kalau salah)

| ID | Asumsi | Dampak kalau salah |
|---|---|---|
| A1 | Anggaran Rp1–1,5 jt adalah **per orang per hari, belum termasuk transport** (sesuai acuan formulir). | Pemilihan tempat makan, aktivitas, dan penginapan di draf itinerary berubah. |
| A2 | Tamu sudah berada di **Belitung** sebelum Hari 0, lalu tamu dan host berangkat bersama dari Belitung ke Solo pada **Hari 0** (sore/malam), dan pulang di **Hari 4** (pagi), sehingga Hari 1–3 utuh. | Hari 1 atau Hari 3 perlu dipotong untuk perjalanan. |
| A3 | **Satu kode booking** untuk semua tamu, plus **satu kode tim** untuk host, guide, dan driver. | Kalau perlu kode per orang, mekanisme gate berubah sedikit. |
| A4 | Backend memakai **Supabase** (connector yang sudah terhubung), di **project baru** yang terpisah dari project lain milik host. Frontend berupa **situs statis**, sehingga bisa di-host di mana saja (default: Vercel, lihat §13.1). | Lihat Q8. |
| A5 | **Audio gamelan masuk v1** (disetujui host 8 Nov 2026, Q11). Gendhing berasal dari **rekaman gamelan Solo milik host sendiri** (diolah supaya jernih), bukan hasil AI. Tamu memilih sendiri di gerbang: **"Begin with gamelan"** atau **"Begin quietly"**. Web tidak pernah berbunyi tanpa klik tamu. | Kalau host berubah pikiran, cukup sembunyikan tombol "with gamelan"; tanpa audio, tidak ada byte audio yang diunduh. |
| A6 | **Tanpa analytics atau pelacakan** apa pun. | Kalau host ingin tahu kapan tamu membuka web, lihat Q9. |
| A7 | Lokasi penginapan di area tengah kota (sekitar Mangkunegaran/Keprabon) supaya titik malam bisa dijangkau dengan mudah. | Durasi transfer di jadwal berubah. |

### 2.1 Keputusan sementara (diatur penyusun, direvisi host di H-5)
Host masih menyusun rencana untuk Q1–Q6, jadi nilai di bawah ini menjadi **default kerja**. Semua desain dan kode dibangun supaya angka-angka ini **cukup diganti di data**, tanpa mengubah kode.

| # | Topik | Default sementara | Alasan |
|---|---|---|---|
| Q1 | Tanggal | **Hari 0 Rabu 7 Apr 2027** (tiba) · **Hari 1 Kamis 8 Apr** · **Hari 2 Jumat 9 Apr** · **Hari 3 Sabtu 10 Apr** · **Hari 4 Minggu 11 Apr** (pulang) | Di luar Ramadan/Idulfitri 2027 (perkiraan Feb–Mar) dan Iduladha (perkiraan pertengahan Mei) [V]. Keraton dikunjungi Kamis, menghindari kemungkinan tutup hari Jumat [V]. Sabtu malam cocok untuk Ngarsopuro Night Market [V]. April masuk peralihan ke musim kemarau, jadi lebih kering daripada Des–Feb, walau hujan sore masih mungkin [V]. |
| Q2 | Kedatangan & kepulangan | Perjalanan dimulai dari **Belitung (TJQ, Tanjung Pandan)**. **Hari 0:** host dan tamu terbang bersama **Belitung → Jakarta → Solo (TJQ → CGK → SOC)**, rute dikonfirmasi host 8 Nov 2026 [V jadwal & maskapai]. Hari 0: check-in + wedangan sambutan yang ringan (opsional). Pulang Hari 4 pagi. | Host ikut sepanjang perjalanan. Web bisa diperkenalkan langsung oleh host ke tamu saat masih di Belitung. |
| Q3 | Jumlah tamu | **1 tamu** (dikonfirmasi host 9 Nov 2026: dua rekan batal). Engine tetap mendukung 1–5. | Nama asli **hanya** di data privat Supabase (`trip_private.guest.party`), tidak pernah di repo, PRD, atau bundle |
| Q4 | "Movies" | **Malam film di bioskop** (Hari 2 malam; host: tamu masih menimbang tapi **condong ke bioskop**, 9 Nov 2026), dengan **Wayang Orang Sriwedari** sebagai pilihan tukar | Sesuai selera tamu, tanpa menutup pengalaman khas Solo |
| Q5 | Night ride | **Dibonceng motor oleh rider lokal berpengalaman** (jenis motor menyusul, helm disediakan) di rute pendek tengah kota, ±60–90 menit. Tamu **tidak menyetir sendiri**. Plan B: mobil. | Seru, aman, dan tidak bergantung pada SIM tamu |
| Q6 | Penginapan | Guesthouse/homestay bernuansa heritage di kawasan Mangkunegaran–Keprabon–Ngarsopuro, **kamar mandi dalam**. Kandidat dipilih paling lambat H-30 [V]. | Dekat titik malam dan sesuai syarat tamu |

### 2.2 Profil selera tamu (form dari teman tamu, versi terakhir 9 Nov 2026 + koreksi host di chat)
Tanpa identitas. Nama, nama panggilan, dan catatan kesehatan hanya ada di data privat Supabase.

| Topik | Jawaban | Dampak |
|---|---|---|
| Sapaan | Nama panggilan (bukan nama depan) | Gerbang & Today menyapa dengan nama panggilan; tiket memakai nama lengkap |
| Makan | Halal tidak wajib · manis **sedang** · pedas **sedang** · lihat catatan tim untuk pantangan | Pilihan kuliner & level sambal |
| Tempo | **Sedang** · kuat jalan kaki 30–60 menit sekali jalan · tahan panas "lumayan" · **kuat bangun subuh** | Sunrise tetap di jadwal; jeda teduh di siang hari, tidak ada jalan kaki > 1 jam |
| Minat | Sejarah & keraton, kuliner, batik & belanja, alam & kebun teh, foto, nongkrong malam (hampir semua) | Jadwal yang sekarang sudah cocok; malam boleh diperpanjang |
| "Movies" & night ride | Dua-duanya, **condong ke bioskop** (wayang: "coba saja"); night ride naik motor, **semangat** | Q4, Q5 |
| Budget | **Harus lebih hemat** dari Rp1–1,5 jt/hari · biaya di lapangan **dibayar host dulu, diganti nanti** | Q12 direvisi: angka target menyusul; `estCost` di catatan tim jadi dasar rekap penggantian |
| Penginapan | Guesthouse heritage | Q6 |
| Jadwal | **Tunjukkan semua** (tanpa kejutan tersembunyi) | Semua stop terlihat di film & Today |
| Perangkat | iPhone + laptop | Uji utama Safari iOS (sakelar senyap, gyroscope) dan desktop |
| Momen spesial | **Belum diketahui** | Kalau ada (mis. ulang tahun di tanggal trip): momen khusus di film + kejutan di hari itu |

---

## 3. Pengguna & Konteks Pakai

| Persona | Bahasa | Perangkat | Kapan | Yang dibutuhkan |
|---|---|---|---|---|
| **Tamu** (1 orang, berangkat dari Belitung) | **EN** | Laptop/iPad/HP flagship (pra-trip), HP flagship (selama trip) | H-3 sampai H-1, lalu selama trip | Pengalaman sinematik, cerita kota, info praktis cepat |
| **Host** | ID | HP | Semua fase | Kirim link, cek jadwal yang sama dengan tamu, catatan tim |
| **Guide** (translator dihapus 10 Nov 2026) | ID | HP | Selama trip | Jadwal yang **identik** dengan yang dilihat tamu, catatan tim |
| **Driver** | ID | HP | Selama trip | Jam dan titik jemput |

**Perjalanan pengguna (tamu):**
1. Menerima pesan WhatsApp dari host. **Link preview** (gambar OG) sudah menjadi kesan pertama.
2. Membuka link, lalu memasukkan **kode booking** di gate.
3. Menonton "film" sekitar 6–10 menit dengan scroll santai.
4. Diajak menyimpan web ke **Home Screen**.
5. Selama trip membuka **Today** untuk jam, lokasi, dress code, dan kontak.
6. *(v1.1, lihat §19)* Setelah trip, web yang sama menjadi galeri kenangan.

---

## 4. Ukuran Keberhasilan

| ID | Metrik | Target | Cara ukur |
|---|---|---|---|
| S1 | Kelancaran film di HP flagship | Rata-rata ≥ 55 fps, frame time p95 ≤ 20 ms di tier High/Medium | Overlay FPS (khusus dev) saat scroll penuh di perangkat uji (§14) |
| S2 | Kelancaran film di laptop | ≥ 58 fps di MacBook Air M-series (Safari & Chrome) | Sama seperti S1 |
| S3 | Kecepatan gate | LCP ≤ 1,5 dtk di 4G | Lighthouse mobile + uji nyata |
| S4 | Kecepatan Today | Interaktif ≤ 1,5 dtk di 4G, **berfungsi offline** setelah kunjungan pertama | Lighthouse + uji mode pesawat |
| S5 | Akses info harian | Dari layar terkunci HP sampai jam jemput hari itu: ≤ 2 ketukan (ikon Home Screen, lalu Today) | Uji skenario |
| S6 | Kualitas konten | 0 typo (EN & ID), 0 string hilang, semua item [V] sudah terverifikasi | `content:check` + spellcheck + proofread manusia |
| S7 | Lisensi foto | 100% foto tercatat di manifest dengan lisensi yang diizinkan | `content:check` |
| S8 | Privasi | Tanpa kode yang valid, tidak ada data trip, nama, atau nomor yang bisa diakses. Tidak terindeks mesin pencari. | Uji e2e + cek header |
| S9 | Pakai ulang | Trip baru cukup dengan mengganti 1 file data + folder foto + baris `trip_private` + secret kode, **tanpa mengubah kode engine** | Uji dengan data dummy trip kedua |
| S10 | Kesan (kualitatif) | Host dan guide yang mencoba sebagai "tamu" menilainya terasa premium dan personal | Dry-run sebelum kirim |

---

## 5. Cakupan

### 5.1 Termasuk di v1
| Prioritas | Item |
|---|---|
| P0 | Gate kode booking (dicek di server), sesi, `noindex` |
| P0 | Dua bahasa **EN (utama) / ID** yang ditulis manual, dengan toggle dan preferensi yang diingat |
| P0 | Film: prolog, 3 bab hari (subuh sampai malam), epilog, end credits, dengan **navigasi per slide** (scroll, swipe, keyboard, titik bab) |
| P0 | **Horizontal gallery** per hari (wajib), berupa slide yang bergerak menyamping |
| P0 | Mode Today + offline (PWA) + kontak WhatsApp |
| P0 | Sistem kualitas adaptif (tier) + Calm mode / dukungan reduced motion |
| P0 | Model data + validasi konten + manifest lisensi foto |
| P0 | **Objek hero 3D utuh: gong ageng** dengan gayor (rangka), material perunggu |
| P0 | Objek 3D inti: **gunungan** (siluet bertatah dengan ketebalan), **benang emas**, **boarding pass/luggage tag ber-physics** |
| P0 | **Inti 3D per bab:** diorama kota Solo (prolog & Hari 1), lereng Lawu + kebun teh + Candi Sukuh (Hari 2), canting + kain mori (Hari 3), dengan kamera berpindah antar shot |
| P1 | Kode tim + catatan tim |
| P1 | Gambar OG (link preview WhatsApp) + template pesan pengantar |
| P1 | Audio gamelan (rekaman host) + efek suara adegan; tamu memilih di gerbang, toggle selalu ada |
| P2 | Cuaca langsung di Today |

### 5.2 Tidak termasuk (v1)
- Panel admin/CMS dan editor visual
- Akun atau login per orang
- **Pembayaran, booking, atau transaksi apa pun**
- Chat, notifikasi push, atau pelacakan lokasi real-time (komunikasi tetap lewat WhatsApp)
- Galeri kenangan setelah trip (dipindah ke v1.1)
- Bahasa selain EN/ID
- SEO, halaman publik, analytics
- **Foto buatan AI untuk tempat yang benar-benar dikunjungi**

---

## 6. Arah Kreatif

### 6.1 Konsep: *Lakon Tiga Hari*
Dalam wayang kulit, satu **lakon** dimainkan semalam suntuk. **Gunungan (kayon)** ditancapkan di tengah kelir saat pembukaan dan penutupan, lalu digerakkan dalang untuk menandai pergantian babak [V]. Trip ini kita perlakukan sebagai satu lakon dengan tiga babak.

Empat perangkat visual menyatukan seluruh web:

1. **Gunungan, sang pembuka babak**: muncul di gate dan di awal setiap bab (gunungan menyapu layar sebagai *mask reveal*). Secara fisik, wayang kulit adalah **lembaran kulit pipih yang ditatah berlubang-lubang**. Jadi objeknya dibuat dari **SVG yang digambar ulang** (bentuk utama digambar, pola tatahan dibuat lewat kode), lalu diberi ketebalan seperti kulit: lubang besar menjadi lubang geometri sungguhan, lubang halus menjadi tekstur. Saat disinari blencong dari belakang, lubang-lubang itu menghasilkan **volumetric light dan bayangan berpola**.
2. **Gong ageng, sang penutup putaran (objek hero 3D utuh)**: dalam gamelan, pukulan gong ageng menandai **akhir satu gongan**, yaitu siklus frasa terpanjang [V]. Di film ini, setiap hari **ditutup dengan pukulan gong**: gelombang cahaya dan partikel menjalar dari pencu (tonjolan tengah gong), lalu transisi ke bab berikutnya. Gong tampil pertama kali di prolog sebagai **momen hero**: kepingan-kepingan emas berkumpul membentuk gong (padanan objek yang "terbentuk dari kepingan" di Referensi B), kamera mengelilinginya, dan pantulan perunggunya diterangi blencong. Modelnya dibuat di kode: badan gong memakai *lathe geometry* (profil diputar), material **perunggu PBR** (logam, bekas tempa, sedikit patina), dan gayor diberi ornamen ukir dari pipeline SVG yang sama dengan gunungan.
3. **Benang Emas**: satu garis emas berpendar yang tergambar seiring scroll dan menyambungkan semua tempat. Di Hari 3 (batik), kamera mengungkap bahwa garis itu ternyata **lilin (malam) yang mengalir dari canting**. Ini menjadi *payoff* naratif.
4. **Siklus waktu**: di tiap bab hari, pencahayaan, color grading, kabut, dan partikel bergerak dari **subuh, siang, senja, sampai malam**. Siklus ini sejalan dengan preferensi tamu (sunrise/sunset hunting dan night ride).

**Sentuhan film**, sesuai tamu yang menyukai "movies":
- **Letterbox** (bilah hitam rasio 2.39:1) muncul saat kartu judul bab
- Judul pembuka bergaya *opening titles*
- **Credits** di akhir dibuat sebagai *end credits* yang bergulir: host, guide, fotografer (kredit lisensi CC), dan "Thank you for watching"

### 6.2 Apa yang diambil dari video referensi (gaya saja, **bukan isi**)
| Referensi | Yang diambil | Yang **tidak** diambil |
|---|---|---|
| **A**: gaya "clean transitions" (2.5D berbasis foto) | **Navigasi per slide: satu scroll = satu shot.** Satu slide = satu visual full-bleed. Gambar baru menutup yang lama seperti tirai. Judul tebal dengan text reveal yang menyisakan jejak gerak (motion trail). Komposisi judul di kiri bawah + paragraf kecil di kanan. | Gambar komposit surreal (astronot, UFO, dan sejenisnya), teks, branding |
| **B**: gaya "3D WebGL" | Objek 3D yang terbentuk dari kepingan (dipakai untuk gong), perubahan warna latar seiring scroll (terang ke gelap ke hangat), **satu objek penghubung yang mengalir di semua section**, kartu gambar mengambang di ruang 3D (horizontal gallery), material logam/emas reflektif + bloom, **kartu gantung ber-physics di penutup** | Rantai, bintang berduri, kubus, tipografi raksasa nama studio, palet merah-cyan, isi |

File video referensi **tidak** di-commit ke repo karena hak ciptanya milik pihak lain. Deskripsi di atas sudah cukup sebagai acuan.

### 6.3 Palet (token awal, difinalkan di fase desain)
| Token | Nilai | Asal-usul | Dipakai di |
|---|---|---|---|
| `--mori` | `#F2EBDD` | Kain mori (kain batik sebelum diwarnai) | Latar terang, kertas |
| `--sogan` | `#7A4A26` | Cokelat soga, khas batik Solo | Teks utama di latar terang, aksen |
| `--sogan-deep` | `#3B2414` | Soga gelap | Bayangan, kontras |
| `--prada` | `#C8A25A` | Prada (lapisan emas pada wayang dan batik) | Benang emas, aksen, garis |
| `--nila` | `#121833` | Nila/indigo malam | Latar malam |
| `--blencong` | `#FFB257` | Nyala lampu blencong | Cahaya hangat, highlight yang di-bloom |
| `--lampion` | `#B8352B` | Merah lampion/klenteng | Aksen malam Hari 1 ("ramai & hidup") |
| `--teh` | `#6E8B5A` | Hijau kebun teh Kemuning | Aksen Hari 2 |

Nuansanya **hidup, bukan suram**. Siang terang dan bersih, senja keemasan, malam berpendar hangat dengan aksen lampion. Cokelat sogan tidak dipakai di seluruh layar.

### 6.4 Tipografi (kandidat, lisensi OFL, di-self-host via `next/font`)
- **Display:** *Fraunces* (serif variabel dengan sumbu "soft/wonk", jadi bisa elegan sekaligus sedikit main-main). Alternatif: *Instrument Serif*.
- **UI/Body:** *Manrope* atau *Inter Tight*, dengan angka tabular untuk jam.
- **Ornamen:** *Noto Sans Javanese* untuk aksara Jawa pada nomor/judul bab, **hanya** untuk kata yang ejaannya sudah diverifikasi penutur atau ahli [V].

### 6.5 Nada tulisan
- **EN (tamu):** hangat, elegan, sedikit main-main, seperti dipandu teman lokal yang sangat paham kotanya. Pakai sudut pandang orang kedua ("you"). Kalimat pendek. Setiap tempat berisi **1 fakta + 1 rasa**. Hindari klise seperti "hidden gem", "nestled", atau "a feast for the senses".
- **ID (tim):** bahasa Indonesia yang natural dan jelas, tanpa bahasa iklan.
- Contoh:
  - Gate: **"Kulonuwun?"** (salam Jawa untuk minta izin masuk rumah orang). Setelah kode benar: **"Monggo. Please, come in."** [V pemakaian oleh penutur]
  - Keraton (draf): *"Kings still live here. The Sunan's court has kept its rituals for nearly three centuries, so dress like you're meeting someone's grandmother."* [V]

### 6.6 Etika budaya (wajib)
- Gunungan dan wayang ditampilkan dengan hormat: tidak dibuat jenaka, tidak didistorsi secara aneh, dan tidak dipakai sebagai "maskot".
- Aturan keraton dan pura (dress code, area yang tidak boleh difoto) ditampilkan akurat [V].
- Istilah Jawa dan aksara Jawa ditinjau guide/host lokal sebelum rilis.

---

## 7. Struktur Pengalaman (Storyboard)

```
[Link preview WA] → [Gate "Kulonuwun?"] → [Prolog + kartu Hari 0: Arrival] → [Hari 1] → [Hari 2] → [Hari 3] → [Epilog + kartu Hari 4: Departure] → [End credits]
                                                  ↘ ─────────── Mode Today (bisa diakses kapan saja) ─────────── ↗
```

Hari 0 (kedatangan) dan Hari 4 (kepulangan) tampil sebagai **kartu ringkas** (jam, penjemputan, penginapan), bukan bab penuh.

### 7.0a Model navigasi: slide sinematik (P0)
Film **bukan halaman panjang yang di-scroll bebas**. Film adalah **rangkaian ±40–50 slide (shot)** di atas satu panggung 3D yang tetap di tempat.

- **Satu gerakan = satu slide.** Satu scroll roda mouse, satu swipe, satu gesekan trackpad, atau satu tombol panah/spasi/PageDown memindahkan penonton ke slide berikutnya. Gerakan sisa dari inersia trackpad diabaikan supaya tidak melompat dua slide.
- **Transisi adalah gerak kamera.** Setiap slide punya *shot* sendiri (posisi kamera, fokus DOF, keadaan cahaya, overlay teks). Pindah slide berarti kamera bergerak dari shot ke shot dengan koreografi (±1,0–1,6 dtk), sementara teks lama keluar dan teks baru masuk dengan reveal.
- **Bisa di-scrub dengan jari.** Saat menahan swipe atau gesekan trackpad, transisi **mengikuti jari** (scroll-scrubbing). Begitu dilepas, transisi diselesaikan kalau sudah lewat ±35%, atau kembali ke slide semula.
- **Arah:** antar bagian dan bab bergerak **vertikal**. Di dalam horizontal gallery tiap hari, slide bergerak **menyamping**. Scroll/swipe vertikal tetap memajukan slide, dan swipe horizontal juga bisa dipakai.
- **Selama transisi berjalan, input berikutnya ditahan** (maksimal satu antrean), supaya penonton tidak tersesat.
- **Lompat cepat:** titik bab (§7.7) dan URL hash per bab (mis. `#day-2`), supaya host bisa mengirim "lihat Hari 2" langsung.
- **Teks panjang** (detail tempat, credits) dibuka sebagai *sheet* yang bisa di-scroll biasa (smooth scrolling), lalu kembali ke slide.

### 7.0 Link preview (P1)
- Gambar OG berupa gunungan berpendar di latar nila, dengan judul *"A Three-Day Lakon: Solo"*. **Tanpa nama tamu atau info pribadi.**
- Title dan description netral.

### 7.1 Gate (P0)
- Layar gelap dengan grain tipis. Satu **lampu blencong** menyala pelan di belakang **gunungan** yang tertutup.
- **Pointer:** di desktop, kursor menggeser posisi cahaya sehingga bayangan berpola dari lubang gunungan ikut bergeser. Di HP dipakai gyroscope (setelah izin, lihat di bawah).
- Input kode berupa kotak per karakter. Mendukung paste, tidak peka huruf besar/kecil, dan mengabaikan spasi atau tanda hubung.
  - **Salah:** goyangan halus + pesan EN/ID. Setelah 5 kali salah, ada jeda 30 detik.
  - **Benar:** lampu membesar, cahaya menembus lubang gunungan (volumetric), gunungan "membuka" lalu masuk ke prolog (*shared-element*: gunungan menjadi ornamen judul prolog).
- Ketukan "Begin" setelah kode benar berupa **dua tombol: "Begin with gamelan" dan "Begin quietly"** (subjudul ID: "Mulai dengan gamelan" / "Mulai tanpa suara"). Ketukan ini dipakai untuk **meminta izin gyroscope di iOS** sekaligus **membuka audio** (kebijakan autoplay browser). Pilihan diingat di perangkat; tombol speaker mengambang bisa mengubahnya kapan saja.
- **Aset film di-preload** selama animasi gate supaya tidak ada layar loading.
- Kode cukup dimasukkan **sekali per perangkat** (token sesi disimpan di perangkat).
- **Ditulis untuk satu orang.** Sebelum kode benar, nama tamu tidak boleh tampil (bundle publik), jadi nadanya undangan pribadi: *"A private invitation"*, *"Enter the code written for you"*, benang emas turun ke judul, pendar blencong. Setelah kode benar: **"Sugeng rawuh, [nama]."** muncul perlahan, *"This lakon was written for one guest."*, lalu **tiket pribadi** (nama, rute, tanggal, kursi) berayun masuk sebelum tombol Begin. Kunjungan berikutnya: *"Welcome back. Your seat is still saved."* Peran tim tidak disapa dengan nama tamu.

### 7.2 Prolog: *"Kulonuwun, Solo"* (P0)
Isi pengenalan kota, masing-masing satu slide dengan text reveal per baris:
0. **Momen hero gong:** kepingan emas berkumpul menjadi gong ageng di dalam gelap, blencong menyala, kamera mengitari gong, lalu tulisan *"A Three-Day Lakon"* muncul. Pukulan pertama gong membuka cerita.
1. **Kota raja.** Solo berdiri pada 1745 ketika istana Mataram pindah dari Kartasura [V].
2. **Dua istana.** Kasunanan dan Mangkunegaran, hasil Perjanjian Giyanti (1755) dan Salatiga (1757) [V].
3. **Batik.** Diakui UNESCO sebagai Warisan Budaya Takbenda (2009). Laweyan adalah kampung saudagar batik, tempat Sarekat Dagang Islam lahir pada 1905 [V].
4. **Bengawan Solo.** Sungai terpanjang di Jawa dan lagu yang dikenal di banyak negara Asia [V].
5. **"The Spirit of Java"**, slogan kota [V].
6. **Diorama 3D Solo & Benang Emas:** diorama kota bergaya miniatur (dari data peta OpenStreetMap, dengan landmark utama dimodelkan sederhana: keraton, Pasar Gede, Pura Mangkunegaran, aliran Bengawan Solo, dan siluet Gunung Lawu di timur). Benang emas menggambar rute 3 hari di atas diorama dalam beberapa slide, dengan penghitung *stagger*: "3 days · ~20 stops · 1 city".
7. **Kenalan dengan tim:** kartu host dan guide (foto atau inisial). Kartu ini menjadi *shared element* ke bilah kontak di Today.
8. **"Say it in Javanese"** (P1): kartu yang bisa dibalik (*microinteraction*) berisi *matur nuwun* (terima kasih), *sugeng enjing* (selamat pagi), *nyuwun sewu* (permisi), dan kebiasaan sopan seperti menunjuk dengan ibu jari serta memberi dan menerima dengan tangan kanan [V].

### 7.3 Bab Hari (template, P0)
Setiap bab punya struktur yang sama:
1. **Kartu judul bab:** gunungan menyapu layar (*mask reveal*), letterbox masuk, lalu "Day 1 — The Royal City". Nomor bab dalam angka Jawa [V] dan tanggal. Text reveal per baris.
2. **Intro vertikal singkat:** 2–3 kalimat tentang tema hari itu dan dress code harian.
3. **Horizontal gallery (wajib):** **5–8 slide yang bergerak menyamping**, mengikuti urutan jadwal. Setiap scroll/swipe menggeser satu panel. Sepanjang lintasan, **pencahayaan bergeser dari subuh ke malam** (color grading, langit, kabut, partikel), dan inti 3D hari itu tetap terlihat di latar belakang.
   - **Panel foto** (1 per tempat utama): foto dengan **depth parallax** (depth map), **mask reveal** saat masuk, **tilt + cahaya yang mengikuti pointer**, dan **DOF** yang fokus ke panel aktif.
   - **Panel tipografi/3D** untuk tempat kecil atau kuliner: kartu jam + nama + satu kalimat, atau objek 3D kecil.
   - Setiap panel menampilkan **jam (WIB)**, nama tempat, dan satu kalimat "kenapa worth it".
   - Setiap panel berhenti tepat di tengah layar (slide).
4. **Detail tempat:** mengetuk panel memperluasnya menjadi *sheet* detail (*shared-element transition*) berisi cerita, tips, dress code, penanda makanan, tombol Maps, dan Plan B.
5. **Penutup bab: pukulan gong.** Kamera kembali ke gong ageng, gong dipukul, lalu gelombang cahaya menjalar dari pencu dan membawa benang emas ke bab berikutnya.

**Kekhasan per hari:**
| Bab | Tema | Aksen | Inti 3D | Momen sinematik khusus |
|---|---|---|---|---|
| Hari 1, *The Royal City* | Keraton, pasar, sunset, night ride | Emas + merah lampion | **Diorama kota Solo** (siang sampai malam) | Kamera terbang di atas diorama dari keraton ke pasar. Sunset di waduk dengan grading jingga. Malam: jendela dan lampu jalan di diorama menyala dengan **selective bloom**, ditambah partikel percikan arang wedangan sepanjang rute night ride. |
| Hari 2, *Mist of Lawu* | Sunrise, kebun teh, candi | Hijau teh + biru kabut | **Medan lereng Lawu** + barisan teh (instanced) + **Candi Sukuh** berundak | **Fog + volumetric light** saat sunrise di sela barisan teh. Kamera naik dari kebun teh ke candi di dalam kabut. Malam: panggung wayang orang (panel foto). |
| Hari 3, *Threads of Batik* | Batik, Mangkunegaran, perpisahan | Sogan + nila | **Canting** (tembaga + gagang bambu) + **kain mori** (simulasi/shader kain) | Canting menorehkan malam di kain mori, mengungkap bahwa benang emas adalah lilin batik. Motif parang/kawung terbentuk. Malam perpisahan yang hangat, ditutup **gong terakhir**. |

### 7.4 Epilog: *"Sampai jumpa"* (P0)
- Dibuka dengan gong terakhir yang bergaung pelan, lalu gunungan ditancapkan kembali di tengah layar, seperti penutup pertunjukan wayang [V].
- **Boarding pass/luggage tag bertali** dengan physics (bisa ditarik dan diayun), digantung pada **benang emas**. Satu tag untuk satu tamu ("Admit one"). Depan: nama tamu (foil emas), rute **TJQ → CGK → SOC**, tanggal, gate *Kulonuwun*, kursi *With the host*, **"Hosted by [nama host]"**. Belakang: kawung foil + **monogram inisial tamu** + "Matur nuwun".
- Tombol: **Open Today**, **Add to Home Screen** (dengan panduan iOS/Android), **Message your host**.
- **Contact shadow** di bawah tag dan grain yang lembut.

### 7.5 End credits (P0)
- Daftar bergulir ala film: tim trip, lalu **kredit foto** (judul, pemilik, lisensi, tautan) yang dibuat otomatis dari manifest, lalu font dan data peta (© OpenStreetMap contributors bila dipakai).
- Juga tersedia sebagai halaman statis yang bisa dibaca biasa (untuk keperluan atribusi).

### 7.6 Mode Today (P0)
Tampilan **terpisah dan ringan**: tanpa WebGL, tanpa intro, fokus ke informasi.

| Kondisi waktu (WIB) | Tampilan |
|---|---|
| Sebelum trip | Hitung mundur + checklist **"Before you go"** (lihat §10.6) |
| Selama trip | **Langsung tampil saat web dibuka**, dengan tombol "Watch the film" |
| Setelah trip | Ucapan terima kasih (v1.1: galeri kenangan) |

Isi saat trip:
- **Header:** "Day 2 · Fri 9 Apr" [contoh], jam terbit dan terbenam matahari, catatan cuaca (statis, P2: langsung).
- **Kartu Now / Next:** tempat sekarang dan berikutnya, dengan hitung mundur ke jam berikutnya.
- **Timeline hari itu:** jam, tempat, satu baris keterangan, chip dress code, penanda makanan (halal / tingkat manis / **tanpa pisang**).
- Tiap tempat punya tombol **Open in Maps** dan **Copy address**.
- **Bilah kontak sticky (dock):** WhatsApp host sebagai tombol utama, telepon, dan SOS; kontak lain (guide) di sheet bantuan. Pesan WhatsApp sudah terisi otomatis dalam EN. Tombol tekan 3D (depth, tactile press, soft shadow).
- **Plan B:** toggle "Rain plan" untuk melihat alternatif kalau hujan.
- **Darurat:** sheet berisi nomor darurat Indonesia (112, ambulans 118/119, polisi 110) [V] dan alamat penginapan.
- Semua jam memakai **WIB** (sama dengan Belitung). **Web tidak menyebut Singapura sama sekali** (permintaan host 9 Nov 2026: tamu sudah jarang ke Singapura; asal yang ditampilkan Belitung). Penentuan "hari ini" dihitung di zona **Asia/Jakarta**, berapa pun zona waktu HP tamu.
- **Offline:** service worker men-cache shell, data trip, dan gambar Today. Ada indikator "Last updated".

### 7.7 Navigasi global
- **Toggle bahasa EN/ID** di pojok, diingat per perangkat. Saat diganti, teks melakukan morph dan posisi slide tetap.
- **Toggle Cinematic / Calm.** Calm mode memakai slide yang sama, tapi gerak kamera diganti crossfade dan partikel/scrub dimatikan. Otomatis aktif bila OS meminta *reduce motion*.
- **Indikator bab** tipis berupa titik-titik dengan nama bab dan progres slide. Bisa diketuk untuk melompat.
- **Petunjuk navigasi** di slide pertama setelah gate: "Scroll or swipe" (desktop juga menampilkan ikon panah keyboard). Petunjuk menghilang setelah dipakai sekali.
- **Tombol Today** selalu terlihat.

---

## 8. Matriks Efek (semua permintaan host → letak & fungsi)

| Efek yang diminta | Dipakai di | Fungsi naratif | Fallback (tier rendah / Calm) |
|---|---|---|---|
| Cinematic luxury | Seluruh film | Kesan premium untuk tamu penting | Tetap: tipografi, grading, komposisi |
| Camera choreography | **Setiap perpindahan slide** (shot ke shot): orbit gong, terbang di atas diorama, naik lereng Lawu, close-up canting | Mengarahkan mata seperti sutradara | Potongan statis + crossfade |
| Soft / contact shadows | Gong & gayor, gunungan, diorama, canting, boarding pass | Objek terasa nyata dan "berpijak" | Bayangan dipanggang (baked) |
| Scroll-triggered reveal | Semua teks & panel | Ritme baca | Fade sederhana |
| Scroll-scrubbing | Transisi slide mengikuti jari/trackpad saat ditahan. Benang emas, siklus waktu, dan torehan canting ikut maju sesuai progres transisi. | Penonton "memainkan" waktu | Transisi otomatis tanpa scrub |
| Pinned section | Seluruh film adalah satu panggung tetap. Slide berganti di tempat. | Fokus pada satu cerita | Tetap (slide crossfade) |
| Depth parallax | Panel foto (depth map), lapisan diorama | Foto 2D terasa punya ruang | Parallax CSS 2 lapis |
| Scroll-driven camera | Kamera berpindah shot setiap kali di-scroll: diorama, medan Lawu, kain batik | Perjalanan antar lokasi | Gambar shot statis |
| **Horizontal gallery (wajib)** | Setiap bab hari: 5–8 slide menyamping | Satu hari = satu perjalanan menyamping | Slide menyamping dengan crossfade |
| Smooth scrolling | Transisi slide yang halus + scroll halus di sheet detail dan credits | Kelembutan gerak | Scroll native |
| Section snapping | **Setiap slide** (satu gerakan = satu slide) | Pemberhentian yang tegas, terasa seperti presentasi sinematik | Tetap |
| Text reveal (baris/kata/huruf) | **Katalog teks kinetik:** 3D flip per huruf + kilau emas ("Kulonuwun?"), tirai per kata dengan skew (judul), blur-rise per kata (subjudul), scramble/decode (kicker & tanggal), scroll-scrub per kata (paragraf prolog), tracking collapse + kilau (judul bab & "Sampai jumpa."), odometer (angka), marquee kinetik yang ikut kecepatan scroll | Membaca dengan jeda, terasa "dipertunjukkan" | Teks statis langsung tampil |
| Stagger | Penghitung prolog, timeline, kartu tim | Mengarahkan mata | Muncul bersamaan |
| Mask reveal | Gunungan menyapu antar bab, foto panel | Transisi bermakna (kayon = ganti babak) | Crossfade |
| Shared-element transition | Gunungan gate → prolog, panel → detail, kartu bab → header Today, kartu tim → kontak | Kesinambungan | Crossfade (browser tanpa View Transitions) |
| Microinteractions | Input kode, toggle bahasa, tombol Maps/copy, kartu "Say it in Javanese" | Terasa responsif dan dirawat | Tetap (tanpa gerak berlebih) |
| Pointer interaction | Gate (cahaya ikut kursor), panel (tilt + kilau), boarding pass (drag) | Interaktif dan personal | Gyroscope di HP; mati di Calm |
| Selective bloom | Lampu blencong, lampu diorama malam, lampion, kilau benang emas, kilau tepi gong saat dipukul | Pijar hanya pada sumber cahaya | Glow sprite murah |
| Depth of field | Pencu gong saat hero, panel aktif di galeri, ujung canting, landmark di diorama | Memusatkan perhatian | Mati |
| Color grading | Per fase waktu (LUT dicampur sesuai progres) + menyatukan foto dari banyak sumber | Satu "film", satu karakter warna | **Tetap** (LUT murah) |
| Subtle grain / vignette | Global, vignette lebih kuat di malam hari | Tekstur film | Tetap (statis) |
| Fog / volumetric light | Gate (cahaya menembus gunungan), sunrise Kemuning | Kedalaman & suasana | Fog eksponensial + god rays palsu |
| Particles | Kepingan emas yang membentuk gong, gelombang partikel saat gong dipukul, debu di berkas cahaya (subuh), kabut/daun teh (Hari 2), percikan arang wedangan (malam), serbuk emas (Hari 3) | Atmosfer & gerak | Jumlah dikurangi atau mati |

---

## 9. Spesifikasi Motion ("jeda yang terukur")

| Elemen | Durasi | Easing | Jeda / stagger | Catatan |
|---|---|---|---|---|
| Text reveal per baris | 0,9 dtk | `expo.out` | 80 ms antar baris | Baris naik dari 110% di dalam mask |
| Text reveal per kata | 0,6 dtk | `power3.out` | 35–45 ms antar kata | Maks ±40 kata per blok |
| Jeda antar blok teks | — | — | 250–400 ms | Memberi napas |
| Stagger daftar/kartu | 0,6 dtk | `power3.out` | 60–100 ms | Maks 8 item per grup |
| Mask reveal gunungan | 1,2 dtk | `expo.inOut` | — | Transisi antar bab |
| 3D flip per huruf | 1,1 dtk per huruf | `expo.out` | 60 ms antar huruf | rotateX −100° → 0, naik 0,35em, blur 8 px → 0, perspektif 900 px |
| Tirai per kata | 0,9–1,0 dtk | `expo.out` | 55–70 ms antar kata | Kata naik dari 115% di dalam mask + skewY 8° → 0 |
| Scramble/decode | 0,6 dtk per huruf | — | 20–50 ms antar huruf | Glif acak berganti tiap 45 ms sampai huruf asli terkunci |
| Scroll-scrub per kata | mengikuti scroll | linear | — | Opacity 0,14 → 1, blur 4 px → 0, naik 0,18em per kata |
| Tracking collapse | 1,6 dtk | `expo.out` | — | Letter-spacing +0,55em → normal, blur 14 px → 0 |
| Kilau emas | 2,4 dtk, ulang tiap 5,6 dtk | ease-in-out | mulai setelah reveal selesai | Sapuan gradien emas menyilang teks |
| Odometer | 1,8 dtk | `expo.out` | 120–150 ms antar digit | Digit berputar 2 putaran lalu berhenti di angka target |
| Marquee kinetik | terus-menerus | — | — | Kecepatan dasar ±2–3%/dtk, makin cepat & berbalik arah sesuai kecepatan scroll |
| Shared-element | 0,5–0,7 dtk | `power4.inOut` | — | |
| Microinteraction | 120–200 ms | `power2.out` | — | Hover, tekan, toggle |
| **Transisi slide (sesama bab)** | 1,0–1,2 dtk | `power3.inOut` (kamera), `expo.out` (teks masuk) | Teks lama keluar 0–300 ms, kamera 0–1,2 dtk, teks baru masuk mulai 450 ms | Input berikutnya ditahan sampai ±80% transisi |
| **Transisi antar bab** (gong → gunungan) | 1,4–1,8 dtk | `expo.inOut` | Gong 0–600 ms, sapuan gunungan 400–1.600 ms | |
| Ambang gerakan | — | — | Roda mouse: akumulasi ≥ 50 px. Swipe: ≥ 40 px atau kecepatan tinggi. Inersia trackpad diabaikan ±600 ms setelah transisi. | Dikalibrasi di perangkat nyata |
| Scrub dengan jari | Mengikuti jari 1:1 + lerp 0,15 | linear | Lepas di ≥ 35% → lanjut, < 35% → kembali (0,4 dtk) | |
| Pukulan gong | Gelombang 1,6 dtk, gaung 3–4 dtk | `expo.out` | — | Getaran gong berupa deformasi halus di shader |
| Tilt pointer | — | lerp 0,1 per frame | — | Maks 6–8° |
| Kamera | — | — | — | **Tanpa roll**, rotasi ≤ 15°/dtk, perubahan FOV halus, demi kenyamanan (tidak memicu mabuk gerak) |

Semua nilai disimpan sebagai **token** di satu file (`motion.ts`), tidak ditulis langsung di komponen.

---

## 10. Draf Itinerary & Konten

> **Ini draf dari penyusun**, disusun dari preferensi tamu dan keputusan sementara §2.1 (Hari 1 = Kamis, Hari 2 = Jumat, Hari 3 = Sabtu). Host memfinalkan isinya di H-5. Semua jam, jam buka, harga, dan nama vendor bertanda **[V]**. Kalau tanggal berubah, urutan hari bisa ditukar menyesuaikan hari dalam minggu.

### 10.1 Prinsip penyusunan
- **Padat & ramai**: 6–9 titik per hari, dengan jeda istirahat di penginapan pada siang hari (sekalian antisipasi hujan sore di musim hujan).
- **Selang-seling manis dan gurih** setiap hari. Satu menu manis khas Solo per hari boleh, sisanya gurih.
- **Halal & tanpa alkohol**. Guide wajib memastikan warung jelas halal, karena di beberapa area (mis. sekitar Pecinan) ada warung non-halal [V].
- **Tanpa pisang**. Waspadai jajanan pasar seperti nagasari, pisang goreng, dan topping pisang.
- **Sunrise/sunset & night ride** masing-masing muncul minimal sekali.
- **Waktu ibadah:** kalau ada tamu yang menjalankan salat, guide menyisipkan jeda salat. Hari 2 jatuh di **hari Jumat**, jadi ada slot **salat Jumat** (±11.30–12.45) [V]. Slot ini otomatis dilewati kalau tidak diperlukan.
- Perkiraan matahari di awal April: **terbit ±05.35, terbenam ±17.40 WIB** [V].

### 10.2 Hari 1: *The Royal City* (keraton, pasar, sunset, night ride)
| Jam (WIB) | Fase | Kegiatan | Catatan |
|---|---|---|---|
| 07.00 | Pagi | Sarapan soto (kandidat: Soto Gading) | Gurih [V] |
| 08.30 | Pagi | **Keraton Kasunanan Surakarta**: museum & pelataran | Dress code sopan (bahu & lutut tertutup), ikuti aturan area [V]. Cek hari tutup [V]. |
| 10.30 | Siang | **Pasar Klewer**: pusat batik & kain, ramai | Tawar-menawar ditemani host |
| 11.30 | Siang | Makan siang tengkleng (kandidat: dekat Pasar Klewer) | Gurih dan pedas, sering cepat habis [V] |
| 12.45 | Siang | **Pasar Gede Hardjonagoro** (rancangan Thomas Karsten, 1930 [V]): jajanan seperti cabuk rambak (gurih) dan es dawet telasih (manis) + **Klenteng Tien Kok Sie** di sebelahnya | Pastikan dawet tanpa pisang. Spot estetik. |
| 14.00 | Siang | Istirahat & bebersih di penginapan | Plan B hujan |
| 15.30 | Sore | **De Tjolomadoe**: bekas pabrik gula yang direvitalisasi | Estetik dan sebagian besar indoor, aman saat hujan [V jam buka] |
| 17.00 | Senja | **Sunset di Waduk Cengklik** (matahari terbenam ±17.40) | Kadang terlihat pesawat mendarat di bandara Adi Soemarmo di dekatnya [V] |
| 19.00 | Malam | Makan malam nasi liwet (kandidat: kawasan Keprabon) | Gurih dan bersantan [V] |
| 20.00 | Malam | **Night ride** naik motor: Jl. Slamet Riyadi → Gladag → Benteng Vastenburg → kuliner malam Galabo → Ngarsopuro → wedangan (HIK) | Jenis motor TBD (Q5) |

### 10.3 Hari 2: *Mist of Lawu* (sunrise, alam, candi, pertunjukan malam)
| Jam (WIB) | Fase | Kegiatan | Catatan |
|---|---|---|---|
| 04.00 | Subuh | Berangkat ke Karanganyar (±1–1,5 jam) [V] | Jaket, karena dingin di ketinggian [V] |
| 05.15 | Subuh | **Sunrise & kabut pagi di Kebun Teh Kemuning** (matahari terbit ±05.35) | Titik pandang terbaik ditentukan guide lokal [V] |
| 06.45 | Pagi | Sarapan & teh (kandidat: Rumah Teh Ndoro Donker) | [V jam buka] |
| 08.15 | Pagi | **Candi Cetho**: candi berundak di lereng Lawu (abad ke-15 [V]) | Biasanya wajib memakai kain poleng yang disediakan [V] |
| 10.00 | Siang | **Candi Sukuh**: bentuknya mirip piramida terpancung | [V] |
| 11.30 | Siang | *(opsional)* Salat Jumat di masjid sekitar Tawangmangu | Hanya kalau ada tamu yang menjalankan [V] |
| 12.45 | Siang | Makan siang di Tawangmangu (kandidat: sate kelinci / menu gurih lain) | Konfirmasi tamu nyaman dengan menu kelinci [V] |
| 13.45 | Siang | **Grojogan Sewu** (air terjun) | Banyak anak tangga. Dilewati kalau hujan deras. |
| 15.15 | Sore | Kembali ke Solo, istirahat | |
| 18.30 | Malam | Makan malam selat solo (manis-gurih) | [V] |
| 20.00 | Malam | **Malam film di bioskop** (film pilihan tamu) [V bioskop & jadwal] | Pilihan tukar: **Wayang Orang Sriwedari**, teater klasik sejak 1910 [V jadwal]. Lihat Q4. |
| 22.00 | Malam | Wedang jahe di wedangan | Opsional |

### 10.4 Hari 3: *Threads of Batik* (batik, istana kedua, perpisahan)
| Jam (WIB) | Fase | Kegiatan | Catatan |
|---|---|---|---|
| 07.00 | Pagi | Sarapan timlo (gurih) + **serabi Notosuman** (manis; pilih rasa original/cokelat, **bukan pisang**) | [V] |
| 08.30 | Pagi | **Kampung Batik Laweyan**: gang rumah saudagar + **workshop membatik** (±1,5–2 jam) | Hasil batik dibawa pulang. Inilah momen "canting" di film. |
| 11.00 | Siang | **Museum Batik Danar Hadi** (tur berpemandu) | Aturan foto di dalam [V] |
| 12.30 | Siang | Makan siang sate buntel / menu gurih lain | [V] |
| 14.00 | Siang | **Pura Mangkunegaran**: Pendopo Ageng & lukisan langit-langit Kumudawati [V] | Dress code sopan |
| 15.30 | Sore | **Pasar Triwindu** (barang antik) + jalan kaki di Ngarsopuro | Estetik, oleh-oleh |
| 17.00 | Senja | **Keliling santai naik becak** di kawasan Mangkunegaran–Keprabon saat golden hour | |
| 19.00 | Malam | **Makan malam perpisahan** (halal, tempat istimewa, TBD) | "Worth it" boleh mahal |
| 20.30 | Malam | **Ngarsopuro Night Market** (Hari 3 = Sabtu, jadi malam Minggu [V]) / wedangan terakhir | |

### 10.5 Rencana hujan (awal April = peralihan musim, hujan sore masih mungkin [V])
| Rencana utama | Plan B |
|---|---|
| Sunset Waduk Cengklik | Lebih lama di De Tjolomadoe, atau "movies" di bioskop |
| Night ride terbuka | Mobil/becak tertutup + wedangan |
| Grojogan Sewu | Lebih lama di rumah teh, lalu pulang lebih awal |
| Sunrise Kemuning berkabut tebal | Tetap berangkat: kabut justru menjadi pemandangannya. Siapkan cerita "sea of mist". |

Setiap tempat di data punya kolom `planB` yang tampil di Today lewat toggle "Rain plan".

### 10.6 Info praktis: *Before you go* (EN di web)
- **Zona waktu:** Solo memakai WIB, **sama dengan Belitung**.
- **Pakaian:** sopan untuk keraton dan pura (bahu & lutut tertutup), **jaket** untuk subuh di Kemuning, **payung atau jas hujan**, alas kaki yang nyaman.
- **Uang:** siapkan **tunai rupiah** karena banyak pedagang pasar hanya menerima tunai. Ketersediaan pembayaran QR lintas negara tergantung bank/aplikasi tamu [V].
- **Koneksi:** eSIM/roaming. Sinyal bisa lemah di lereng Lawu, tapi Today tetap jalan offline.
- **Etiket:** memberi dan menerima dengan tangan kanan, menunjuk dengan ibu jari, minta izin sebelum memotret orang [V].
- **Kesehatan:** bawa obat pribadi masing-masing.

### 10.7 Catatan tim (ID, hanya tampil dengan kode tim)
- Karakter guide: profesional, antusias, hangat & perhatian. **Ikuti mood tamu.**
- **Kabari tamu kalau terlambat atau berhalangan. Jangan pernah meninggalkan tamu tanpa kabar.**
- Makanan: halal, tanpa alkohol, **tanpa pisang**, manis secukupnya.
- **Catatan medis (perlu dikonfirmasi ke tamu): alergi paracetamol** disebut di formulir. Siapkan kotak P3K yang sesuai. Info ini **tidak** tampil di halaman tamu.
- Penginapan wajib **kamar mandi dalam**.
- Kontak vendor, biaya, dan konfirmasi booking per tempat.

### 10.8 Panduan anggaran (per orang per hari, sesuai A1)
Target ≤ Rp1,5 jt di luar transport. Alokasi kasar: penginapan 15–25%, makan 25–30%, tiket & aktivitas 25–35%, **cadangan "worth it" 15–20%**. Estimasi per tempat disimpan di kolom `estCost` dan **hanya tampil di catatan tim**, tidak di halaman tamu.

### 10.9 Shot list foto (10–15 slot utama)
Kriteria per slot: lisensi yang diizinkan (§12.6), resolusi ≥ 2400 px sisi panjang, **subjek bisa dipotong menjadi vertikal 9:16 dan horizontal 16:9**, dan cahayanya sesuai fase waktu (bisa dibantu grading).

| # | Hari | Slot | Fase ideal |
|---|---|---|---|
| 1 | Prolog | Lanskap kota Solo / Bengawan Solo | Senja |
| 2 | 1 | Keraton Kasunanan | Pagi |
| 3 | 1 | Pasar Klewer: tumpukan batik | Siang |
| 4 | 1 | Pasar Gede (fasad/interior) atau Klenteng Tien Kok Sie | Siang |
| 5 | 1 | De Tjolomadoe | Sore |
| 6 | 1 | Waduk Cengklik saat sunset | Senja |
| 7 | 1 | Jalan atau kuliner malam Solo (lampu) | Malam |
| 8 | 2 | Kebun Teh Kemuning berkabut | Subuh |
| 9 | 2 | Candi Cetho | Pagi berkabut |
| 10 | 2 | Candi Sukuh | Siang |
| 11 | 2 | Panggung wayang orang | Malam |
| 12 | 3 | Laweyan / tangan membatik dengan canting | Pagi |
| 13 | 3 | Pura Mangkunegaran, Pendopo Ageng | Siang |
| 14 | 3 | Pasar Triwindu / Ngarsopuro | Sore |
| 15 | — | *(cadangan)* kuliner Solo | — |

Tempat tanpa foto yang layak diwakili **panel tipografi atau objek 3D**, bukan foto berkualitas rendah.

---

## 11. Requirement Fungsional

### Akses & sesi
| ID | Prioritas | Requirement | Kriteria terima |
|---|---|---|---|
| FR-01 | P0 | **Bundle frontend tidak memuat data trip sama sekali.** Seluruh isi itinerary, nama, dan kontak hanya didapat dari Edge Function Supabase dengan token yang valid. | Membuka `/film` atau `/today` tanpa token → kembali ke gate. Isi bundle JS tidak mengandung nama tempat dari jadwal, nama tamu, atau nomor. |
| FR-02 | P0 | Kode booking dicek **di server** (Edge Function `verify-access`: normalisasi → hash → perbandingan constant-time) | Kode tidak ada di bundle klien maupun di repo |
| FR-03 | P0 | Kode benar → token sesi yang ditandatangani (HMAC, berisi `role` & `exp` = akhir trip + 30 hari), disimpan di perangkat | Setelah kode benar, tamu tidak diminta kode lagi di perangkat yang sama |
| FR-04 | P1 | Kode tim memberi peran `team`, sehingga catatan tim ikut terkirim | Dengan token tamu, field `teamNote`/`estCost` **tidak ada** di respons `trip-data` |
| FR-05 | P0 | Pembatasan percobaan dicatat di tabel `access_attempts` (hash IP + waktu): jeda bertingkat, dan 5 kali salah → 30 dtk | Uji e2e |
| FR-06 | P0 | `noindex` lewat header `X-Robots-Tag`, meta, dan `robots.txt` | Cek header pada semua route |

### Konten & bahasa
| ID | Prioritas | Requirement | Kriteria terima |
|---|---|---|---|
| FR-10 | P0 | Semua teks yang tampil ke pengguna punya versi EN dan ID | `content:check` gagal kalau ada yang kosong |
| FR-11 | P0 | Toggle bahasa tanpa reload, preferensi disimpan, default EN | Uji e2e |
| FR-12 | P0 | **Semua informasi itinerary ada sebagai teks DOM** (bukan hanya di canvas) | Bisa dibaca screen reader dan diterjemahkan, tetap ada saat WebGL mati |
| FR-13 | P0 | Validasi data: jam tidak tumpang tindih, format jam benar, setiap foto ada di manifest, setiap tempat punya `phase` | `content:check` |

### Film
| ID | Prioritas | Requirement | Kriteria terima |
|---|---|---|---|
| FR-20 | P0 | Urutan prolog → 3 bab → epilog → credits, dengan indikator bab yang bisa diketuk dan URL hash per bab | Uji manual + e2e |
| FR-20a | P0 | **Navigasi per slide**: satu gerakan (roda, swipe, trackpad, panah/spasi/PageDown) = satu slide. Inersia diabaikan. Input ditahan selama transisi. Scrub dengan jari lalu lanjut/kembali di ambang 35%. | E2E: 1 event roda/keyboard = tepat 1 slide maju. Uji manual trackpad MacBook dan swipe iPhone/Android: tidak pernah melompat 2 slide. |
| FR-21 | P0 | Horizontal gallery per hari: 5–8 slide menyamping, bisa dimajukan dengan scroll/swipe vertikal maupun swipe horizontal | Di HP: swipe menggeser tepat satu panel dengan mulus |
| FR-22 | P0 | Siklus waktu subuh → malam per bab (LUT, langit, kabut, partikel) mengikuti progres | Visual cocok dengan storyboard |
| FR-23 | P0 | Panel bisa diketuk dan meluas menjadi detail (shared element), lalu kembali ke posisi semula | Uji manual |
| FR-24 | P0 | Gunungan sebagai mask reveal antar bab | — |
| FR-25 | P0 | Benang emas tergambar mengikuti scroll lintas bab | — |
| FR-26 | P0 | Boarding pass/luggage tag ber-physics, 1 per tamu, berisi nama dari data privat | Bisa di-drag di desktop dan disentuh di HP |
| FR-27 | P0 | Diorama 3D Solo (prolog & Hari 1, siang sampai malam) + medan Lawu dengan kebun teh dan Candi Sukuh (Hari 2), dengan kamera berpindah shot | Landmark dapat dikenali. Lolos anggaran §12.1. |
| FR-28 | P0 | Canting + kain mori (Hari 3): torehan malam membentuk motif dan mengungkap benang emas | — |
| FR-28a | P0 | **Gong ageng 3D utuh** (badan lathe + pencu + gayor berornamen, perunggu PBR): momen hero di prolog (terbentuk dari kepingan), pukulan gong di akhir setiap hari (gelombang cahaya + partikel + getaran), gong terakhir di epilog. **Gong bisa diklik/disentuh kapan pun untuk memukul**: tabuh berayun, riak, gelombang kejut layar, percikan emas, kamera bergetar. | Preview disetujui host di M0.5. Close-up tetap tajam di layar retina. Klik/tap/Enter memicu pukulan. |
| FR-28b | P0 | **Gunungan bisa diklik untuk dibalik** ke sisi belakang bergambar api (geni). Cahaya blencong mengikuti kursor (gyroscope di HP). Bayangan tetap jatuh di kelir dari kedua sisi. | Uji klik/tap di desktop & HP |
| FR-29 | P0 | Pointer: cahaya ikut kursor (gate), tilt panel. Di HP: gyroscope setelah izin. | Tetap jalan kalau izin ditolak (fallback sentuh) |

### Today
| ID | Prioritas | Requirement | Kriteria terima |
|---|---|---|---|
| FR-30 | P0 | Menentukan sebelum/selama/setelah trip dan "hari ini" berdasarkan **Asia/Jakarta** | Unit test dengan jam palsu di beberapa zona waktu |
| FR-31 | P0 | Kartu Now/Next + hitung mundur | Unit test |
| FR-32 | P0 | Tombol Maps (URL Google Maps), copy alamat, kontak WhatsApp/telepon | Link membuka tempat yang benar (dicek manual satu per satu) |
| FR-33 | P0 | Offline: shell, data, dan gambar Today di-cache | Uji mode pesawat setelah kunjungan pertama |
| FR-34 | P0 | Toggle Plan B | — |
| FR-35 | P0 | Sheet darurat | — |
| FR-36 | P1 | Panduan Add to Home Screen (iOS & Android) + manifest PWA dengan ikon | Ikon dan nama tampil benar di Home Screen |

### Lain-lain
| ID | Prioritas | Requirement |
|---|---|---|
| FR-40 | P0 | Credits dibuat otomatis dari manifest foto + daftar font/data |
| FR-41 | P1 | Gambar OG + metadata link preview yang netral |
| FR-42 | P1 | Template pesan WhatsApp pengantar (EN) untuk host |
| FR-43 | P1 | Audio gamelan: **satu tombol** di gerbang ("Begin the lakon"), klik langsung disambut gamelan; **mute** lewat toggle speaker yang sudah tampil sejak sambutan (bawaan menyala, pilihan diingat di perangkat) dan selalu terlihat setelahnya (revisi host 10 Nov 2026), berhenti saat tab disembunyikan. Sambutan Kebo Giro sekali → bersambung ke gendhing keraton yang diulang tanpa jeda (crossfade). Efek gong/api naga/gunungan/keris di atas gendhing (gendhing direndahkan sebentar). Bila di-mute sebelum mulai, audio tidak diunduh sama sekali. |

---

## 12. Requirement Non-Fungsional

### 12.1 Performa & anggaran
| Item | Anggaran |
|---|---|
| Gate: JS (gz) | ≤ 80 KB sebelum kode benar. Bundle 3D baru dimuat setelahnya. |
| Today: JS (gz) | ≤ 120 KB, tanpa WebGL. *Terukur 9 Nov 2026: 150 KB gz / 129 KB brotli, tanpa WebGL. Kerangka React 19 + Next 16 sendiri ≈ 119 KB gz / 106 KB br, jadi kode aplikasi Today ≈ 20 KB br. Mesin audio & kamus lengkap sudah dikeluarkan dari chunk layout. Lighthouse mobile (Slow 4G): performa 99, TTI 1,7 dtk.* |
| Aset per bab (setelah kompresi) | ≤ 6 MB. Total film ≤ 25 MB, dimuat bertahap per bab. |
| Tekstur | KTX2 (Basis), maks 2048 px. Model GLB dengan kompresi Meshopt/Draco. |
| Foto DOM | AVIF/WebP, ukuran responsif |
| Memori | Tekstur bab yang sudah lewat jauh dibuang (dispose) |
| Baterai | Render berhenti saat tab tersembunyi. Render sesuai kebutuhan saat diam. |

### 12.2 Tier kualitas adaptif
| Tier | DPR | Bloom | DOF | Fog/volumetric | Partikel (HP/desktop) | Shadow map |
|---|---|---|---|---|---|---|
| **High** | min(perangkat, 2) | Selektif penuh | Bokeh | Raymarch langkah rendah | 2k / 4k | 2048 |
| **Medium** | 1,5 | Selektif | Lebih murah, mati saat bergerak cepat | God rays screen-space | 1k / 2k | 1024 |
| **Low** | 1 | Ringan | Mati | Fog eksponensial | 300 | Baked |
| **Static** (reduced motion / tanpa WebGL) | — | — | — | — | — | Gambar ber-grading + crossfade |

- Tier awal ditebak dari info GPU dan ukuran layar. Setelah itu tier diatur oleh **pemantau FPS**: turun satu tier bila rata-rata < 50 fps selama ±3 dtk, naik kembali bila stabil ≥ 58 fps (dengan hysteresis).
- **Low Power Mode di iOS** membatasi animasi ke 30 fps. Pemantau FPS mendeteksinya secara tidak langsung dan beban dikurangi agar tetap halus di 30 fps.
- **Mobile flagship tidak dibuat ringan.** Targetnya tier High/Medium dengan seluruh efek di §8 tetap aktif.

### 12.3 Kompatibilitas
- iOS Safari 18+, Chrome Android terbaru, Safari & Chrome desktop terbaru.
- **Shared-element** memakai View Transitions API. Browser yang belum mendukungnya mendapat crossfade.

### 12.4 Aksesibilitas
- Kontras teks ≥ 4,5:1, termasuk teks di atas foto (pakai scrim/gradasi).
- Fokus keyboard terlihat. Semua kontrol bisa dioperasikan dengan keyboard di desktop.
- Alt text EN/ID untuk setiap foto.
- `prefers-reduced-motion` dan toggle Calm dihormati.
- Today lolos audit aksesibilitas Lighthouse ≥ 95.

### 12.5 Keamanan & privasi
- **Data privat** (nama tamu, nomor WhatsApp, alamat penginapan, catatan tim, catatan medis) **tidak disimpan di repo**. Data ini disimpan di **tabel Supabase `trip_private`** dan diisi lewat dashboard/SQL, tidak lewat commit.
- **Data itinerary non-privat** ditulis di repo (supaya tervalidasi dan punya riwayat versi), lalu **dipublikasikan ke tabel Supabase `trip_content`** lewat `content:publish`. Bundle frontend tidak memuatnya (FR-01).
- **RLS aktif di semua tabel, tanpa policy untuk `anon`/`authenticated`.** Klien tidak pernah membaca tabel langsung. Hanya Edge Function (memakai service role di server) yang membaca lalu memfilter per peran.
- Hash kode akses dan secret penandatangan token disimpan di **Supabase Vault** (`ACCESS_GUEST_HASH`, `ACCESS_TEAM_HASH`, `TOKEN_SECRET`), dibaca Edge Function lewat RPC khusus service role. `TOKEN_SECRET` dibuat acak di dalam database. Secret Edge Function dengan nama yang sama tetap bisa dipakai sebagai override darurat.
- Header: CSP ketat, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow` (lewat konfigurasi host statis). Kalau host tidak mendukung header khusus, minimal pakai meta robots + `robots.txt`.
- **Supabase free tier bisa mem-pause project yang tidak aktif** (±7 hari) [V kebijakan terbaru]. Ada **ping keep-alive terjadwal** (GitHub Actions, tiap 2–3 hari) ke endpoint health, plus pengecekan status project di checklist H-4 dan H-1.
- **Tanpa pihak ketiga yang melacak**: tanpa analytics, tanpa embed. Peta dibuka lewat link ke Google Maps, bukan iframe.
- Email tamu atau pengisi formulir **tidak dipakai** di mana pun.
- Setelah trip + 30 hari: sesi kedaluwarsa. Data bisa dihapus atau dialihkan ke mode kenangan (v1.1).

### 12.6 Lisensi aset
- Foto, urutan prioritas: **CC0 / Unsplash License / Pexels License / CC BY / CC BY-SA**, lalu **CC BY-NC** sebagai cadangan (diperbolehkan karena penggunaannya non-komersial dan tanpa imbalan). **CC BY-ND dan semua varian ND dilarang**, karena semua foto di-crop dan di-grading.
- Dilarang mengambil langsung dari Google Images, Instagram, Pinterest, atau foto ulasan Google Maps. Pengecualian hanya kalau ada **izin tertulis** dari pemilik (simpan buktinya di luar repo, lalu catat di manifest).
- Font: OFL. Data peta: OpenStreetMap (ODbL, wajib atribusi). Model 3D: dibuat sendiri, atau lisensi CC0/CC BY.

### 12.7 Pakai ulang
- Ada pemisahan tegas antara **engine** (scroll, chapter, efek, gate, Today), **tema** (motif Solo: gunungan, palet, LUT, objek), dan **data trip**.
- Trip baru di kota yang sama cukup dengan data baru. Trip di kota lain butuh data baru + paket tema baru, tanpa mengubah engine.

---

## 13. Arsitektur & Teknis

### 13.1 Stack (rekomendasi)
| Lapisan | Pilihan | Alasan |
|---|---|---|
| Framework | **Next.js** (App Router, **static export**) + TypeScript strict | Routing, `next/font`, optimasi build. Karena semua logika server ada di Supabase, hasil build berupa situs statis yang bisa di-host di mana saja. |
| Backend | **Supabase** (connector terhubung): Edge Functions (`verify-access`, `trip-data`, `health`), Postgres + RLS (`trip_content`, `trip_private`, `access_attempts`), Storage (v1.1 galeri kenangan) | Satu tempat untuk verifikasi kode, data privat, dan rate limit. Region **ap-southeast-1 (Singapura)**, dekat dengan tamu dan Indonesia. Revisi H-5 cukup dengan publish ulang data, tanpa redeploy frontend. |
| 3D | **three.js** + **React Three Fiber** + **drei** | Ekosistem matang. drei menyediakan `PerformanceMonitor`, `ContactShadows`, dan lain-lain. |
| Post-processing | **@react-three/postprocessing** | Selective bloom, DOF, LUT, noise, vignette, tone mapping |
| Physics | **@react-three/rapier** | Tali + tag (rope/spherical joint) |
| Navigasi & motion | **GSAP** (Observer untuk input roda/swipe/keyboard, timeline untuk transisi shot, SplitText untuk text reveal) + **Lenis** (hanya untuk sheet detail & credits yang di-scroll biasa) | Navigasi per slide, scrub dengan jari, text reveal. Seluruh plugin GSAP kini gratis. |
| Pemodelan 3D | **Prosedural di kode** (three.js: lathe untuk gong & canting, extrude SVG untuk gunungan & ornamen gayor, data OSM untuk diorama, heightmap DEM untuk lereng Lawu). Opsional: **Blender headless** (skrip Python) untuk model yang lebih rumit, diekspor ke GLB. | Tidak bergantung pada aset 3D pihak ketiga, lisensi bersih, mudah disesuaikan |
| Transisi halaman | View Transitions API | Shared element |
| Validasi data | **Zod** | Schema konten + `content:check` |
| PWA | Service worker ditulis sendiri (`public/sw.js`, ±150 baris, tanpa dependency) + salinan trip-data per token di perangkat | Today offline |
| Hosting frontend | **Vercel** (default, gratis, cukup menautkan repo GitHub sekali) atau **GitHub Pages** (semuanya lewat connector, tapi butuh repo publik atau paket GitHub berbayar) | Karena frontend statis dan tidak memuat data, pilihan host tidak berisiko dan bisa dipindah kapan saja (Q8) |
| Pipeline aset (offline, di mesin dev) | sharp (AVIF/WebP), toktx / gltf-transform (KTX2, Meshopt), model depth estimation (mis. *Depth Anything V2 Small*) untuk depth map, segmentasi subjek untuk mask | Dijalankan sekali per foto, hasilnya di-commit |

Versi persis dipasang (*pin*) saat scaffolding. Pakai versi stabil terbaru yang sudah rilis minimal dua minggu.

### 13.1b Pemakaian connector yang sudah terhubung
Status di bawah dicek pada 7 Nov 2026.

| Connector | Status | Peran di proyek ini | Fase |
|---|---|---|---|
| **Supabase** | Aktif. 1 organisasi, 1 project lain (`dashboard-kebun`) yang **tidak** akan disentuh. | **Backend**: project baru khusus itinerary (mis. `itinerary-solo`, region Singapura). Isinya Edge Functions, tabel + RLS, secret, dan Storage untuk v1.1. Project dibuat di M1 setelah host setuju (paket gratis). | M1 → seterusnya |
| **Framer** | Aktif. Workspace gratis, bisa membuat project. | **Desain & prototipe motion**: mencoba rasa animasi (text reveal, stagger, mask reveal, microinteraction, shared element, horizontal gallery, timing di §9) dan styleframe per bab **sebelum** dikoding. Hasil yang disetujui menjadi acuan motion. **Bukan** untuk situs produksi, karena Framer tidak cocok untuk WebGL kustom, data yang dijaga server, dan mode offline, dan proteksi password-nya butuh paket berbayar. Project Framer yang sudah ada tidak disentuh. Dibuat project baru (mis. "Lakon Tiga Hari — Motion"). | M0.5 |
| **Figma** | Aktif, tapi paket Starter dengan kursi "View" (jatah MCP sangat terbatas) | **Tidak dipakai** (diputuskan host, 7 Nov 2026). Token & tipografi dikerjakan di kode dan Framer. Vektor gunungan dan ornamen digambar sebagai SVG di kode. | — |
| **Three.js 3D Viewer** | Tersedia | **Preview konsep 3D cepat** langsung di chat (**gong ageng**, gunungan + cahaya blencong, benang emas, siklus waktu) untuk disetujui host sebelum masuk ke engine | M0.5, M4 |
| **Context7** | Tersedia | Memastikan API & versi library (Next.js, R3F, drei, postprocessing, GSAP, Lenis, Rapier, Supabase) sesuai dokumentasi terbaru saat implementasi | M1 → M5 |
| **GitHub** | Aktif (repo ini) | Repo, PR, **GitHub Actions**: CI (lint, typecheck, test, `content:check`) + **keep-alive Supabase** terjadwal | M1 → seterusnya |
| **Playwright** (plugin) | Tersedia | Uji e2e, screenshot visual, emulasi iPhone/Pixel | M1 → M6 |
| **ElevenLabs** | Aktif, paket gratis (tanpa tagihan) | **Hanya SFX.** Gendhing tidak dari ElevenLabs: rekaman asli host. Sudah dipakai: "sret" keris (±50 kredit). SFX api naga & balikan gunungan disintesis di kode (`scripts/audio/synth_sfx.py`) karena antrean gratis sedang penuh; bisa diganti versi ElevenLabs kapan saja. | M1, M5 |
| Claude Docs, Perplexity Computer | Tersedia | Tidak dipakai. PRD tinggal di repo. | — |

### 13.2 Peta kapabilitas & urutan bangun
| Modul | Tanggung jawab | Bergantung pada |
|---|---|---|
| `content` | Schema, data trip, string i18n, `content:check`, `content:publish` (ke Supabase) | — |
| `access` | Gate, project Supabase, Edge Functions (`verify-access`, `trip-data`, `health`), tabel + RLS, token, rate limit, header, keep-alive | `content` |
| `today` | Mode Today, PWA offline, kontak, Plan B | `content`, `access` |
| `film-core` | Mesin slide (input → slide → transisi), bab, horizontal gallery, text/mask reveal, lapisan DOM, sheet detail | `content`, `access` |
| `assets` | Manifest foto, pipeline foto (grading dasar, depth, mask, KTX2), model 3D, LUT, font | `content` (slot foto) |
| `film-3d` | Scene R3F, **gong ageng**, gunungan, benang emas, diorama Solo, lereng Lawu + Candi Sukuh, canting + kain mori, siklus waktu, post-FX, partikel, shot kamera per slide, tier kualitas, pointer/gyro | `film-core`, `assets` |
| `finale` | Boarding pass ber-physics, end credits, OG, template WhatsApp | `film-3d`, `content` |
| `qa-launch` | Matriks perangkat, performa, aksesibilitas, proofread, verifikasi [V], preflight, kirim | semua |

**Urutan:** `content` → `access` → `today` → `film-core` → `film-3d` → `finale` → `qa-launch`. Modul `assets` berjalan **paralel sejak awal** (sourcing foto memakan waktu).
*Alasan Today dibangun lebih dulu:* nilai praktisnya terjamin bahkan kalau bagian 3D molor.

### 13.3 Struktur proyek (rencana)
```
docs/                    → PRD, catatan desain, laporan uji perangkat
content/
  schema.ts              → schema Zod (sumber kebenaran tipe)
  trips/solo/
    trip.ts              → data trip (tanpa data privat)
    photos/manifest.json → sumber, pemilik, lisensi, editan, alt EN/ID
    photos/src/          → foto asli berlisensi
supabase/
  migrations/            → tabel trip_content, trip_private, access_attempts + RLS
  functions/
    verify-access/       → cek kode → token bertanda tangan (role, exp)
    trip-data/           → kirim data trip, difilter per role
    health/              → endpoint untuk keep-alive
src/
  app/
    page.tsx             → gate
    film/                → film (data diambil dari trip-data setelah token valid)
    today/               → mode Today (PWA, cache offline)
    credits/             → credits statis
  engine/
    slides/              → mesin slide: input (GSAP Observer), antrean, transisi, scrub, hash bab
    three/               → canvas, kamera, post-FX, tier kualitas
    motion/              → token motion, util reveal
    i18n/
  themes/solo/           → gunungan, benang emas, objek bab, LUT, palet, motif
  components/            → UI (PascalCase)
scripts/assets/          → pipeline foto & model
public/                  → aset hasil proses (AVIF/WebP/KTX2/GLB), ikon PWA
tests/unit/              → Vitest
e2e/                     → Playwright
```

### 13.4 Model data (contoh gaya kode)
```ts
// content/schema.ts
import { z } from 'zod';

/** Teks dua bahasa. EN untuk tamu, ID untuk tim lokal. Keduanya wajib. */
export const L = z.object({ en: z.string().min(1), id: z.string().min(1) });
const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/); // selalu WIB

export const Stop = z.object({
  id: z.string(),
  start: HHMM,
  end: HHMM.optional(),
  phase: z.enum(['dawn', 'day', 'dusk', 'night']),
  title: L,
  story: L,                  // pengenalan: 1 fakta + 1 rasa
  why: L,                    // kenapa worth it, ≤ 140 karakter
  tips: L.optional(),
  dressCode: L.optional(),
  photo: z.string().optional(),            // id di manifest foto
  panel: z.enum(['photo', 'type', 'object']),
  maps: z.object({ query: z.string(), url: z.string().url() }),
  food: z
    .object({ halal: z.literal(true), sweet: z.enum(['low', 'mid', 'high']), banana: z.literal(false) })
    .optional(),
  planB: L.optional(),
  verifiedAt: z.string().date().optional(), // kapan fakta [V] terakhir dicek
});
export type Stop = z.infer<typeof Stop>;
// Data privat (nama tamu, kontak, alamat jemput, teamNote, estCost) TIDAK ada di sini.
// Data itu ada di tabel Supabase trip_private, digabung oleh Edge Function trip-data sesuai peran.
```

**Konvensi:** TypeScript strict. Komponen `PascalCase`, hook `useX`, file `kebab-case`. Tidak ada angka motion yang ditulis langsung (semua dari `engine/motion/tokens.ts`). Teks yang tampil ke pengguna tidak ditulis di JSX, selalu lewat data/i18n.

### 13.5 Pipeline aset foto
1. Cari foto sesuai shot list (§10.9), lalu catat di `manifest.json`: `sourceUrl`, `author`, `license`, `licenseUrl`, `retrievedAt`, `edits`, `focalPoint`, `alt{en,id}`.
2. `assets:build`: crop ke 16:9 & 9:16 berdasarkan focal point, koreksi dasar, ekspor AVIF/WebP + tekstur KTX2.
3. Untuk foto panel: buat **depth map** dan **mask subjek**, lalu rapikan manual bila perlu.
4. **Color grading akhir** dilakukan di shader (LUT per fase) agar foto dari banyak sumber menjadi satu karakter.
5. Credits dibuat otomatis dari manifest.

**Catatan lingkungan:** sesi pengembangan saat ini tidak bisa mengakses situs foto seperti Wikimedia (diblokir jaringan). Hal yang sama kemungkinan berlaku untuk unduhan bobot model depth/segmentasi. Saat fase `assets`, akses jaringan perlu dibuka untuk host yang spesifik, atau host mengunduh foto lalu menaruhnya di `content/trips/solo/photos/src/`.

### 13.5b Pipeline aset 3D
| Aset | Sumber | Cara | Catatan |
|---|---|---|---|
| Gong ageng + gayor | Dibuat sendiri | Profil badan gong → lathe. Ornamen gayor dari SVG → extrude. Material perunggu PBR + normal map bekas tempa (prosedural). | Ukuran & proporsi dicek ke referensi foto berlisensi [V] |
| Gunungan | Dibuat sendiri | SVG bentuk utama (digambar) + pola tatahan (generator kode). Lubang besar jadi geometri, lubang halus jadi alpha texture. | Review bentuk oleh guide/host |
| Diorama Solo | **OpenStreetMap** (ODbL, wajib atribusi) | Unduh footprint bangunan/jalan/sungai area pusat Solo → extrude bergaya miniatur → gabung & kompres (Meshopt). Landmark diganti model sederhana buatan sendiri. | Butuh akses jaringan ke Overpass API atau unduhan ekstrak OSM |
| Lereng Lawu | DEM publik (mis. Copernicus/SRTM) | Heightmap → terrain + barisan teh (instanced) + Candi Sukuh (geometri berundak buatan sendiri) | Butuh akses jaringan untuk unduhan DEM. Cek lisensi DEM yang dipilih. |
| Canting + kain mori | Dibuat sendiri | Canting: lathe + tube. Kain: shader/simulasi kain sederhana. Motif parang/kawung digambar sebagai SVG/tekstur prosedural. | — |
| Boarding pass + tali | Dibuat sendiri | Kartu + Rapier rope joint | Nama dari data privat, dirender saat runtime |


### 13.6 Alur akses
```
Gate (statis) ── POST verify-access {code} ──► Edge Function: cek access_attempts → normalisasi → hash → bandingkan (constant-time)
   │                                             ├─ salah → 401 + catat percobaan + jeda bertingkat
   │                                             └─ benar → token HMAC {role: guest|team, exp}
   ▼
/film, /today ── GET trip-data (Authorization: token) ──► Edge Function: verifikasi token
                                                          → baca trip_content + trip_private (service role)
                                                          → buang field tim kalau role = guest → JSON
Today menyimpan respons terakhir di cache service worker (offline).
Aset publik (foto berlisensi, GLB, font) tidak memuat data pribadi.

Konten:  content/trips/solo/trip.ts ── content:check ──► content:publish ──► tabel trip_content
Privat:  diisi host/penyusun lewat dashboard atau SQL Supabase ──► tabel trip_private (tidak pernah di repo)
```

### 13.7 Commands (direncanakan, berlaku setelah scaffolding)
```bash
pnpm install
pnpm dev                       # server dev Next.js
pnpm build && pnpm start       # build produksi + jalankan
pnpm lint                      # ESLint
pnpm typecheck                 # tsc --noEmit
pnpm test                      # Vitest: schema, logika Today, kelengkapan i18n
pnpm test:e2e -- --trace off   # Playwright: gate, sesi, toggle bahasa, Today, Calm mode, header
pnpm content:check             # validasi data trip + manifest + lisensi + spellcheck (cspell, kamus istilah Jawa)
pnpm assets:build              # proses foto → AVIF/WebP/KTX2, depth map, mask
pnpm content:publish           # validasi lalu unggah data trip ke tabel trip_content (Supabase)
supabase functions deploy verify-access trip-data health   # deploy Edge Functions
supabase db push               # terapkan migrasi tabel + RLS
```

---

## 14. Strategi Pengujian & QA

| Level | Alat | Cakupan |
|---|---|---|
| Unit | Vitest | Schema & `content:check`, logika Today (jam palsu + zona Asia/Jakarta vs zona perangkat lain: UTC+8, Eropa, Amerika, +14, −11), filter data per role, normalisasi kode |
| E2E | Playwright (Chromium; emulasi iPhone & Pixel) | Kode salah/benar, token, 401 tanpa token, data tim tidak bocor ke peran tamu, `noindex`, toggle bahasa, Today offline, Calm/reduced-motion, credits lengkap |
| Visual | Screenshot Playwright di posisi scroll tetap (seed partikel tetap) | Mencegah regresi tampilan per bab |
| Performa | Lighthouse (gate & Today), overlay FPS di perangkat nyata | Target S1–S4 |
| Perangkat nyata | Lihat matriks di bawah | Wajib sebelum kirim |
| Konten | Proofread EN oleh penutur yang fasih + review istilah Jawa oleh guide/host | S6 |
| Fakta | Verifikasi semua [V] pada **H-14** dan **H-4** (setelah revisi host di H-5) | Kolom `verifiedAt` terisi |
| Dry-run | Host dan guide mencoba sebagai "tamu" dari link WhatsApp sampai Today | S10 |

**Matriks perangkat minimum:**
| Perangkat | Browser | Target tier |
|---|---|---|
| iPhone flagship (seri 15 Pro ke atas) | Safari | High |
| Android flagship (Galaxy S24+ / Pixel 9+) | Chrome | High |
| iPad (chip M) | Safari | High |
| MacBook Air (M-series) | Safari + Chrome | High |
| Laptop Windows dengan GPU terintegrasi | Chrome | Medium (boleh) |

Ketersediaan perangkat nyata: lihat Q10.

---

## 15. Batasan Kerja (untuk siapa pun yang membangun, termasuk agen AI)

**Selalu:**
- Jalankan `content:check`, `typecheck`, `test` sebelum commit
- Setiap string punya EN **dan** ID
- Setiap foto tercatat di manifest dengan lisensi yang diizinkan
- Jam selalu WIB
- Hormati reduced motion
- Cek anggaran performa saat menambah aset atau efek
- Info penting selalu ada di DOM

**Tanya host dulu:**
- Membuat resource baru di connector (project Supabase, project Framer) atau memakai kredit (ElevenLabs)
- Menyentuh project lain milik host di connector (mis. `dashboard-kebun`, project Framer yang sudah ada). Default: **tidak pernah**.
- Menambah layanan berbayar atau dependency di luar §13.1
- Mengubah tempat/jam itinerary yang sudah difinalkan
- Memakai foto berlisensi NC
- Mengubah mekanisme akses
- Menambah analytics
- Membuat audio berbunyi otomatis tanpa pilihan tamu, atau mengganti gendhing rekaman host
- Memakai aksara Jawa yang belum diverifikasi

**Jangan pernah:**
- Commit kode akses, secret, atau data pribadi (nama tamu, nomor HP, email, catatan medis)
- Memakai foto tanpa lisensi yang jelas atau berlisensi ND
- Memakai foto AI untuk tempat yang benar-benar dikunjungi
- Melacak tamu
- Menaruh informasi itinerary hanya di dalam canvas
- Memperlakukan simbol budaya secara tidak hormat

---

## 16. Milestone

**Target: web selesai dan diserahkan ke host Senin 28 Des 2026. Batas akhir Januari 2027** (dipakai sebagai buffer). Pengerjaan dipadatkan menjadi ±7 minggu dengan beberapa fase berjalan paralel. Cek fakta, revisi host, dan pengiriman ke tamu tetap mengikuti tanggal trip (H = Hari 0, sementara Rabu 7 Apr 2027, §2.1).

| # | Periode | Milestone | Isi | Kriteria selesai |
|---|---|---|---|---|
| M0.5 | **Minggu 1:** 9 – 15 Nov 2026 | Desain & prototipe | **Three.js Viewer:** preview **gong ageng** dan **gunungan SVG** + cahaya blencong. **Framer:** prototipe motion (navigasi per slide, text reveal, stagger, mask, shared element, horizontal gallery) + styleframe. Token warna & tipografi. | Host menyetujui gong, gunungan, arah visual, dan rasa motion |
| M0 | 9 – 29 Nov 2026 (paralel) | Konten & foto | Draf teks EN/ID, shot list, sourcing 10–15 foto berlisensi | Konten lengkap. ≥ 10 foto tercatat di manifest. |
| M1 | 12 – 22 Nov 2026 | Kerangka & akses | Scaffold Next.js, schema, `content:check`, **project Supabase baru** + migrasi/RLS + Edge Functions, gate, token, i18n, CI + keep-alive, deploy preview | Gate berfungsi di HP nyata. Data hanya keluar lewat token. `noindex` aktif. |
| M2 | 23 – 29 Nov 2026 | Today | Today lengkap + offline + kontak + Plan B | Diuji di iPhone & Android |
| M3 | 26 Nov – 6 Des 2026 | Film 2D | Mesin slide, bab, horizontal gallery, text/mask reveal, panel foto, Calm mode | Cerita lengkap bisa diikuti slide demi slide. FR-20a lolos. |
| M4 | 30 Nov – 18 Des 2026 | Film 3D & cahaya | **Gong** → gunungan → benang emas → diorama → Lawu + Candi Sukuh → canting + kain mori, siklus waktu/LUT, post-FX, partikel, shot kamera, tier kualitas, depth parallax. *Gong & gunungan sudah dimulai sejak Minggu 2.* | S1–S2 tercapai dengan semua inti 3D aktif |
| M5 | 14 – 20 Des 2026 | Finale & polish | Boarding pass, microinteraction, pointer/gyro, shared element, end credits, letterbox, OG, template WhatsApp, audio per adegan (mesin & gerbang sudah di M1) | Seluruh baris di §8 terpenuhi |
| M6 | 21 – 27 Des 2026 | QA | Matriks perangkat, aksesibilitas, proofread, dry-run | Semua kriteria §4 (kecuali verifikasi fakta) hijau |
| ✅ | **Senin 28 Des 2026** | **Serah terima** | Web siap kirim. Link + kode siap. | Host menyetujui |
| — | Jan 2027 | Buffer | Revisi dari host, uji tambahan, perbaikan. Fitur P2 yang tertunda. | Selesai paling lambat 31 Jan 2027 |
| — | Jan – Mar 2027 | Perawatan | Keep-alive Supabase, cek bulanan, update konten bila rencana berubah | |
| — | H-14 | Verifikasi fakta pertama | Cek semua [V] | `verifiedAt` terisi |
| — | **H-5** | **Revisi host** | Q1–Q6 dan isi itinerary final, lalu `content:publish` | |
| — | H-4 | Verifikasi akhir | Verifikasi [V] kedua, status Supabase, uji gate & Today | |
| M7 | **H-3** (atau lebih awal, terserah host) | Kirim ke tamu | Pesan WhatsApp + link (**kode dikirim di pesan terpisah**). Kalau dikirim lebih awal, revisi konten tetap sampai ke tamu otomatis. | Tamu berhasil masuk |
| — | H-1 | Cek terakhir | Status Supabase, keep-alive, data hari pertama | |

---

## 17. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Foto Solo berlisensi bebas langka atau kualitasnya kurang | Visual turun | Hanya 10–15 slot. Wikimedia/Flickr CC. Minta izin fotografer. Panel tipografi/3D sebagai pengganti. Grading LUT untuk menyatukan. |
| WebGL berat di HP | Patah-patah, panas, boros baterai | Tier adaptif, anggaran aset, uji perangkat nyata sejak M4, dispose per bab |
| Hujan (April masih peralihan musim) | Sunrise/sunset gagal | Plan B per tempat, narasi "sea of mist", toggle Rain plan |
| Project Supabase gratis ter-pause karena tidak aktif | Gate gagal, tamu tidak bisa masuk | Keep-alive terjadwal (GitHub Actions), cek status di H-4 & H-1, project bisa dipulihkan lewat connector. Opsi: upgrade sementara di bulan trip. |
| Kualitas gunungan/gong buatan kode kurang memuaskan | Objek hero terasa murah | Preview dan persetujuan host di awal M0.5, sebelum pekerjaan lain bergantung padanya. Cadangan: beli vektor gunungan berlisensi atau sewa ilustrator, lalu tetap diolah jadi 3D. |
| Navigasi per slide terasa "melawan" trackpad/swipe | Penonton melompat slide atau merasa terjebak | Ambang & pengabaian inersia dikalibrasi di perangkat nyata. Petunjuk navigasi. Titik bab untuk lompat. Calm mode. |
| Persetujuan host atau akses (jaringan, perangkat) terlambat | Jadwal ±7 minggu bergeser | Setiap checkpoint ditargetkan dijawab host ≤ 2 hari. Januari 2027 disiapkan sebagai buffer. |
| Revisi besar di H-5 | Waktu mepet sebelum kirim di H-3 | Semua bisa diubah lewat data (tanpa kode). `content:publish` tanpa redeploy. Engine tidak terikat ke tempat atau tanggal tertentu. |
| Info lapangan berubah (jam buka, harga, jadwal pertunjukan) | Tamu kecewa di lokasi | Tanda [V], verifikasi H-14 & H-4, kolom `verifiedAt`, `content:publish` tanpa redeploy |
| Kesalahan budaya atau bahasa Jawa | Memalukan di depan tamu | Review guide/host. Aksara Jawa hanya yang terverifikasi. Panduan etika §6.6. |
| Link diteruskan ke orang lain | Kebocoran jadwal dan kontak | Kode dicek di server, kode dikirim terpisah dari link, bundle tidak memuat data, data privat di Supabase dengan RLS |
| Jam HP tamu masih di zona lain | Telat jemput | Semua jam berlabel WIB, logika berbasis Asia/Jakarta |
| Animasi menghambat akses info | Frustrasi selama trip | Today terpisah, tanpa WebGL, default selama trip |
| Typo atau Inggris yang kaku | Citra host turun | Proofread penutur yang fasih + spellcheck otomatis |
| Scope 3D membengkak (6 inti 3D) dalam jadwal ±7 minggu | Molor dari 28 Des | Urutan dalam M4: gong → gunungan → benang emas → diorama → Lawu → canting. Masing-masing punya versi "cukup" (mis. diorama tanpa landmark detail). Today dan film 2D jadi lebih dulu (M2–M3). |

---

## 18. Pertanyaan Terbuka (perlu jawaban host)

Q1–Q6 sudah punya **default sementara** di §2.1 dan direvisi host di **H-5**. Pertanyaan di bawah ini masih terbuka, tapi tidak menghalangi pekerjaan, karena masing-masing punya default.

| # | Pertanyaan | Default kalau belum dijawab | Berdampak ke |
|---|---|---|---|
| Q1–Q6 | Tanggal, kedatangan/kepulangan, jumlah tamu, "movies", night ride, penginapan | Lihat §2.1 | Direvisi di H-5 |
| Q7 | Nama host yang ditampilkan ("Hosted by …") + foto/inisial tim? | Inisial | Prolog, epilog, kontak |
| Q8 | Host frontend: Vercel (gratis, sekali tautkan GitHub) atau GitHub Pages? Pakai domain sendiri (mis. ±Rp150–200 rb/tahun)? | Vercel, tanpa domain sendiri | Kesan premium di link preview |
| Q9 | Mau tahu kapan tamu pertama kali membuka web? (Cukup catat waktu kode berhasil dimasukkan di Supabase, tanpa pelacakan lain.) | Tidak dicatat | Privasi vs informasi |
| Q10 | Punya akses ke iPhone & Android flagship untuk uji (milik sendiri atau pinjam)? Kalau tidak, pakai layanan device cloud? | Pinjam perangkat di M4 & M6 | QA (M4, M6) |
| Q11 | ~~Mau audio ambience bernuansa gamelan + SFX halus dari ElevenLabs?~~ **Dijawab 8 Nov 2026:** ya, dengan rekaman gamelan Solo milik host (3 gendhing + 1 pukulan gong, izin aman) + SFX ElevenLabs paket gratis; gerbang dua tombol. | — | FR-43 |
| Q12 | Anggaran Rp1–1,5 jt itu per orang atau per rombongan? Siapa yang membayar biaya di lapangan? | Per orang, belum termasuk transport. Biaya hanya tampil di catatan tim. | Pilihan tempat |
| Q13 | Siapa penutur Inggris yang fasih untuk proofread? | Host (translator tidak ikut) | S6 |
| Q14 | Konfirmasi catatan medis (alergi paracetamol & pisang) langsung ke tamu? | Diperlakukan sebagai benar sampai dikonfirmasi | Catatan tim, P3K |

---

## 19. Rencana ke Depan
- **v1.1 Galeri kenangan:** setelah trip, host mengunggah foto selama perjalanan. Web yang sama berubah menjadi "film kenangan" dengan bab yang sama dan foto asli tamu.
- **v2 Tema kota lain:** paket tema baru (motif, palet, objek) di atas engine yang sama.
- **v2 Editor sederhana:** form untuk mengisi data trip tanpa mengedit file, kalau frekuensi pemakaian meningkat.

---

## Lampiran A: Glosarium
| Istilah | Arti |
|---|---|
| **Lakon** | Cerita yang dipentaskan dalam satu pertunjukan wayang |
| **Gunungan / kayon** | Figur wayang berbentuk gunung/pohon, menandai awal, akhir, dan pergantian babak |
| **Kelir** | Layar kain putih tempat bayangan wayang jatuh |
| **Blencong** | Lampu minyak di atas dalang yang menyinari wayang ke kelir |
| **Prada** | Lapisan emas pada wayang atau kain batik |
| **Sogan** | Warna cokelat dari pewarna soga, khas batik Solo |
| **Mori** | Kain katun putih bahan batik |
| **Canting** | Alat untuk menorehkan malam (lilin) pada kain batik |
| **Malam** | Lilin batik |
| **Wedangan / HIK** | Angkringan versi Solo, tempat minum wedang dan jajan malam |
| **Kulonuwun / Monggo** | "Permisi, boleh masuk?" / "Silakan" |
| **WIB** | Waktu Indonesia Barat (UTC+7), 1 jam di belakang Singapura |
| **Gong ageng** | Gong terbesar dalam gamelan. Pukulannya menandai akhir satu gongan. |
| **Gongan** | Satu siklus frasa terpanjang dalam gending, diakhiri pukulan gong [V] |
| **Pencu** | Tonjolan di tengah gong, bagian yang dipukul [V] |
| **Gayor** | Rangka/gantungan gong [V] |
