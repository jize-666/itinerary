# PRD — *Lakon Tiga Hari*: Web Itinerary Sinematik Privat untuk Trip Solo

| | |
|---|---|
| **Status** | Draf v1, menunggu review host |
| **Tanggal** | 7 November 2026 |
| **Pemilik produk** | Host (pemilik repo) |
| **Penyusun draf** | Claude, berdasarkan sesi tanya-jawab dengan host |
| **Bahasa dokumen** | Indonesia (istilah teknis dibiarkan dalam bahasa Inggris) |

**Legenda**
- **P0**: wajib ada di v1 · **P1**: sangat diinginkan di v1 · **P2**: dikerjakan kalau waktu cukup
- **[V]**: fakta lapangan (jam buka, harga, aturan, jadwal pertunjukan, ejaan istilah Jawa) yang **wajib diverifikasi** sebelum konten dikunci. Draf ini disusun tanpa akses internet ke sumber resmi.

---

## 0. Ringkasan

Kita membuat **satu web privat** untuk 1–5 tamu penting dari Singapura yang akan menjalani trip 3 hari di Solo (Surakarta). Web ini hanya punya **dua fungsi: jadwal trip dan pengenalan kota Solo**. Keduanya dikemas sebagai "film pendek" yang bisa di-scroll: prolog, tiga bab hari yang masing-masing bergerak dari **subuh sampai malam**, lalu epilog. Gunungan wayang menjadi penanda bab dan **benang emas** menjadi garis perjalanan yang menyambung semuanya.

Web ini punya dua momen pakai:
1. **Sebelum berangkat (momen "wow")**: tamu membuka web di laptop, iPad, atau HP flagship dan menonton "film"-nya dengan efek penuh.
2. **Selama trip**: tamu memakai **mode Today** di HP, yaitu tampilan ringan, cepat, dan tetap jalan offline, berisi info hari itu dalam 1–2 ketukan.

Tamu ini **berpengaruh ke karir host**. Karena itu web ini juga menjadi cerminan host sebagai tuan rumah, dan standar kualitasnya adalah **maksimal**: nol typo, nol bug, diuji di perangkat sungguhan. Tenggat longgar, jadi kualitas lebih diutamakan daripada kecepatan.

---

## 1. Latar Belakang & Tujuan

### 1.1 Konteks
- Host menjamu tamu dari Singapura sebagai bentuk **balas budi**. **Tidak ada transaksi** apa pun, baik di web maupun di trip.
- Tamu lancar berbahasa Inggris. Selama trip mereka didampingi **translator** dan **guide** lokal, karena banyak orang lokal di Solo (keraton, pasar, kampung batik) tidak lancar berbahasa Inggris.
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
| A2 | Tamu sudah berada di Solo sebelum Hari 1 pagi. Kedatangan dan kepulangan dibahas terpisah ("Hari 0"/"Hari 4"). | Hari 1 atau Hari 3 perlu dipotong untuk perjalanan. |
| A3 | **Satu kode booking** untuk semua tamu, plus **satu kode tim** untuk host, guide, translator, dan driver. | Kalau perlu kode per orang, mekanisme gate berubah sedikit. |
| A4 | Hosting di **Vercel**. Paket gratis cocok karena penggunaan non-komersial. | Kalau di tempat lain, mekanisme cookie dan header disesuaikan. |
| A5 | **Tanpa audio** di v1 (audio ambience gamelan masuk P2 dan baru dikerjakan kalau host setuju). | — |
| A6 | **Tanpa analytics atau pelacakan** apa pun. | Kalau host ingin tahu kapan tamu membuka web, lihat Q9. |
| A7 | Lokasi penginapan di area tengah kota (sekitar Mangkunegaran/Keprabon) supaya titik malam bisa dijangkau dengan mudah. | Durasi transfer di jadwal berubah. |

---

## 3. Pengguna & Konteks Pakai

| Persona | Bahasa | Perangkat | Kapan | Yang dibutuhkan |
|---|---|---|---|---|
| **Tamu** (1–5, Singapura) | **EN** | Laptop/iPad/HP flagship (pra-trip), HP flagship (selama trip) | H-7 sampai H-1, lalu selama trip | Pengalaman sinematik, cerita kota, info praktis cepat |
| **Host** | ID | HP | Semua fase | Kirim link, cek jadwal yang sama dengan tamu, catatan tim |
| **Guide & translator** | ID | HP | Selama trip | Jadwal yang **identik** dengan yang dilihat tamu, catatan tim |
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
| S9 | Pakai ulang | Trip baru cukup dengan mengganti 1 file data + folder foto + env, **tanpa mengubah kode engine** | Uji dengan data dummy trip kedua |
| S10 | Kesan (kualitatif) | Host, translator, dan guide yang mencoba sebagai "tamu" menilainya terasa premium dan personal | Dry-run sebelum kirim |

---

## 5. Cakupan

### 5.1 Termasuk di v1
| Prioritas | Item |
|---|---|
| P0 | Gate kode booking (dicek di server), sesi, `noindex` |
| P0 | Dua bahasa **EN (utama) / ID** yang ditulis manual, dengan toggle dan preferensi yang diingat |
| P0 | Film: prolog, 3 bab hari (subuh sampai malam), epilog, end credits |
| P0 | **Horizontal gallery** per hari (wajib) |
| P0 | Mode Today + offline (PWA) + kontak WhatsApp |
| P0 | Sistem kualitas adaptif (tier) + Calm mode / dukungan reduced motion |
| P0 | Model data + validasi konten + manifest lisensi foto |
| P0 | Objek 3D inti: **gunungan**, **benang emas**, **boarding pass/luggage tag ber-physics** |
| P1 | Diorama 3D Solo (dari data peta) + medan lereng Lawu, kamera terbang antar lokasi |
| P1 | Objek per bab (mis. canting + kain mori di Hari 3) |
| P1 | Kode tim + catatan tim |
| P1 | Gambar OG (link preview WhatsApp) + template pesan pengantar |
| P2 | Audio ambience gamelan (default mati) |
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

Tiga perangkat visual menyatukan seluruh web:

1. **Gunungan**: pembuka (gate), transisi antar bab (gunungan menyapu layar sebagai *mask reveal*), dan penutup. Secara fisik, wayang kulit adalah **lembaran kulit pipih yang ditatah berlubang-lubang**, sehingga objek 3D-nya berupa siluet tipis yang berlubang dan diwarnai prada. Saat disinari dari belakang, lubang-lubang itu menghasilkan **volumetric light dan bayangan berpola**.
2. **Benang Emas**: satu garis emas berpendar yang tergambar seiring scroll dan menyambungkan semua tempat. Di Hari 3 (batik), kamera mengungkap bahwa garis itu ternyata **lilin (malam) yang mengalir dari canting**. Ini menjadi *payoff* naratif.
3. **Siklus waktu**: di tiap bab hari, pencahayaan, color grading, kabut, dan partikel bergerak dari **subuh, siang, senja, sampai malam**. Siklus ini sejalan dengan preferensi tamu (sunrise/sunset hunting dan night ride).

**Sentuhan film**, sesuai tamu yang menyukai "movies":
- **Letterbox** (bilah hitam rasio 2.39:1) muncul saat kartu judul bab
- Judul pembuka bergaya *opening titles*
- **Credits** di akhir dibuat sebagai *end credits* yang bergulir: host, guide, translator, fotografer (kredit lisensi CC), dan "Thank you for watching"

### 6.2 Apa yang diambil dari video referensi (gaya saja, **bukan isi**)
| Referensi | Yang diambil | Yang **tidak** diambil |
|---|---|---|
| **A**: gaya "clean transitions" (2.5D berbasis foto) | Satu section = satu visual full-bleed. Section snapping. Gambar baru menutup yang lama seperti tirai. Judul tebal dengan text reveal yang menyisakan jejak gerak (motion trail). Komposisi judul di kiri bawah + paragraf kecil di kanan. | Gambar komposit surreal (astronot, UFO, dan sejenisnya), teks, branding |
| **B**: gaya "3D WebGL" | Objek 3D yang terbentuk dari kepingan, perubahan warna latar seiring scroll (terang ke gelap ke hangat), **satu objek penghubung yang mengalir di semua section**, kartu gambar mengambang di ruang 3D (horizontal gallery), material logam/emas reflektif + bloom, **kartu gantung ber-physics di penutup** | Rantai, bintang berduri, kubus, tipografi raksasa nama studio, palet merah-cyan, isi |

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
- Istilah Jawa dan aksara Jawa ditinjau guide/translator lokal sebelum rilis.

---

## 7. Struktur Pengalaman (Storyboard)

```
[Link preview WA] → [Gate "Kulonuwun?"] → [Prolog] → [Hari 1] → [Hari 2] → [Hari 3] → [Epilog] → [End credits]
                                                  ↘ ─────────── Mode Today (bisa diakses kapan saja) ─────────── ↗
```

### 7.0 Link preview (P1)
- Gambar OG berupa gunungan berpendar di latar nila, dengan judul *"A Three-Day Lakon: Solo"*. **Tanpa nama tamu atau info pribadi.**
- Title dan description netral.

### 7.1 Gate (P0)
- Layar gelap dengan grain tipis. Satu **lampu blencong** menyala pelan di belakang **gunungan** yang tertutup.
- **Pointer:** di desktop, kursor menggeser posisi cahaya sehingga bayangan berpola dari lubang gunungan ikut bergeser. Di HP dipakai gyroscope (setelah izin, lihat di bawah).
- Input kode berupa kotak per karakter. Mendukung paste, tidak peka huruf besar/kecil, dan mengabaikan spasi atau tanda hubung.
  - **Salah:** goyangan halus + pesan EN/ID. Setelah 5 kali salah, ada jeda 30 detik.
  - **Benar:** lampu membesar, cahaya menembus lubang gunungan (volumetric), gunungan "membuka" lalu masuk ke prolog (*shared-element*: gunungan menjadi ornamen judul prolog).
- Ketukan "Begin" setelah kode benar dipakai untuk **meminta izin gyroscope di iOS** (dan audio, kalau P2 dikerjakan).
- **Aset film di-preload** selama animasi gate supaya tidak ada layar loading.
- Kode cukup dimasukkan **sekali per perangkat** (cookie sesi).

### 7.2 Prolog: *"Kulonuwun, Solo"* (P0)
Isi pengenalan kota, masing-masing satu layar yang di-pin dengan text reveal per baris:
1. **Kota raja.** Solo berdiri pada 1745 ketika istana Mataram pindah dari Kartasura [V].
2. **Dua istana.** Kasunanan dan Mangkunegaran, hasil Perjanjian Giyanti (1755) dan Salatiga (1757) [V].
3. **Batik.** Diakui UNESCO sebagai Warisan Budaya Takbenda (2009). Laweyan adalah kampung saudagar batik, tempat Sarekat Dagang Islam lahir pada 1905 [V].
4. **Bengawan Solo.** Sungai terpanjang di Jawa dan lagu yang dikenal di banyak negara Asia [V].
5. **"The Spirit of Java"**, slogan kota [V].
6. **Peta & Benang Emas:** peta/diorama Solo. Benang emas menggambar rute 3 hari seiring scroll (*scroll-scrubbing*, *pinned*), dengan penghitung *stagger*: "3 days · ~20 stops · 1 city".
7. **Kenalan dengan tim:** kartu host, guide, dan translator (foto atau inisial). Kartu ini menjadi *shared element* ke bilah kontak di Today.
8. **"Say it in Javanese"** (P1): kartu yang bisa dibalik (*microinteraction*) berisi *matur nuwun* (terima kasih), *sugeng enjing* (selamat pagi), *nyuwun sewu* (permisi), dan kebiasaan sopan seperti menunjuk dengan ibu jari serta memberi dan menerima dengan tangan kanan [V].

### 7.3 Bab Hari (template, P0)
Setiap bab punya struktur yang sama:
1. **Kartu judul bab:** gunungan menyapu layar (*mask reveal*), letterbox masuk, lalu "Day 1 — The Royal City". Nomor bab dalam angka Jawa [V] dan tanggal. Text reveal per baris.
2. **Intro vertikal singkat:** 2–3 kalimat tentang tema hari itu dan dress code harian.
3. **Horizontal gallery (wajib):** section di-*pin*. Scroll vertikal menggerakkan lintasan **horizontal** berisi **5–8 panel** yang mengikuti urutan jadwal. Sepanjang lintasan, **pencahayaan bergeser dari subuh ke malam** (color grading, langit, kabut, partikel).
   - **Panel foto** (1 per tempat utama): foto dengan **depth parallax** (depth map), **mask reveal** saat masuk, **tilt + cahaya yang mengikuti pointer**, dan **DOF** yang fokus ke panel aktif.
   - **Panel tipografi/3D** untuk tempat kecil atau kuliner: kartu jam + nama + satu kalimat, atau objek 3D kecil.
   - Setiap panel menampilkan **jam (WIB)**, nama tempat, dan satu kalimat "kenapa worth it".
   - **Snap** ke tengah panel.
4. **Detail tempat:** mengetuk panel memperluasnya menjadi *sheet* detail (*shared-element transition*) berisi cerita, tips, dress code, penanda makanan, tombol Maps, dan Plan B.
5. **Penutup bab:** benang emas melanjutkan ke bab berikutnya.

**Kekhasan per hari:**
| Bab | Tema | Aksen | Momen sinematik khusus |
|---|---|---|---|
| Hari 1, *The Royal City* | Keraton, pasar, sunset, night ride | Emas + merah lampion | Kamera terbang di atas diorama dari keraton ke pasar. Sunset di waduk dengan grading jingga. Malam: lampu kota dengan **selective bloom** dan partikel percikan arang wedangan. |
| Hari 2, *Mist of Lawu* | Sunrise, kebun teh, candi | Hijau teh + biru kabut | **Fog + volumetric light** saat sunrise di sela barisan teh. Siluet candi berundak. Malam: panggung wayang orang. |
| Hari 3, *Threads of Batik* | Batik, Mangkunegaran, perpisahan | Sogan + nila | **Canting** menorehkan malam di kain mori, mengungkap bahwa benang emas adalah lilin batik. Motif parang/kawung terbentuk. Malam perpisahan yang hangat. |

### 7.4 Epilog: *"Sampai jumpa"* (P0)
- **Boarding pass/luggage tag bertali** dengan physics (bisa ditarik dan diayun). Satu tag per tamu (swipe antar nama). Isinya nama tamu, "SIN → SOLO", tanggal, dan **"Hosted by [nama host]"**.
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
- **Header:** "Day 2 · Sat 6 Dec" [contoh], jam terbit dan terbenam matahari, catatan cuaca (statis, P2: langsung).
- **Kartu Now / Next:** tempat sekarang dan berikutnya, dengan hitung mundur ke jam berikutnya.
- **Timeline hari itu:** jam, tempat, satu baris keterangan, chip dress code, penanda makanan (halal / tingkat manis / **tanpa pisang**).
- Tiap tempat punya tombol **Open in Maps** dan **Copy address**.
- **Bilah kontak sticky:** WhatsApp host / guide / translator dan tombol telepon. Pesan WhatsApp sudah terisi otomatis dalam EN.
- **Plan B:** toggle "Rain plan" untuk melihat alternatif kalau hujan.
- **Darurat:** sheet berisi nomor darurat Indonesia (112, ambulans 118/119, polisi 110) [V] dan alamat penginapan.
- Semua jam memakai **WIB** dengan label **"(1 hour behind Singapore)"**. Penentuan "hari ini" dihitung di zona **Asia/Jakarta**, berapa pun zona waktu HP tamu.
- **Offline:** service worker men-cache shell, data trip, dan gambar Today. Ada indikator "Last updated".

### 7.7 Navigasi global
- **Toggle bahasa EN/ID** di pojok, diingat per perangkat. Saat diganti, teks melakukan morph dan posisi scroll tetap.
- **Toggle Cinematic / Calm** (Calm mode menonaktifkan scroll-scrubbing kamera dan menggantinya dengan crossfade). Otomatis aktif bila OS meminta *reduce motion*.
- **Indikator bab** tipis berupa titik-titik dengan nama bab. Bisa diketuk untuk melompat.
- **Tombol Today** selalu terlihat.

---

## 8. Matriks Efek (semua permintaan host → letak & fungsi)

| Efek yang diminta | Dipakai di | Fungsi naratif | Fallback (tier rendah / Calm) |
|---|---|---|---|
| Cinematic luxury | Seluruh film | Kesan premium untuk tamu penting | Tetap: tipografi, grading, komposisi |
| Camera choreography | Prolog (diorama), kartu bab, Hari 2 (lereng Lawu) | Mengarahkan mata seperti sutradara | Potongan statis + crossfade |
| Soft / contact shadows | Gunungan, objek bab, boarding pass | Objek terasa nyata dan "berpijak" | Bayangan dipanggang (baked) |
| Scroll-triggered reveal | Semua teks & panel | Ritme baca | Fade sederhana |
| Scroll-scrubbing | Benang emas, siklus waktu, canting | Penonton "memainkan" waktu | Langsung ke keadaan akhir |
| Pinned section | Prolog (peta), horizontal gallery tiap hari | Fokus pada satu cerita | Section biasa |
| Depth parallax | Panel foto (depth map), lapisan diorama | Foto 2D terasa punya ruang | Parallax CSS 2 lapis |
| Scroll-driven camera | Diorama & medan Lawu | Perjalanan antar lokasi | Gambar peta statis |
| **Horizontal gallery (wajib)** | Setiap bab hari | Satu hari = satu perjalanan menyamping | Daftar geser horizontal biasa |
| Smooth scrolling | Global (desktop); di HP mengikuti momentum native | Kelembutan gerak | Scroll native |
| Section snapping | Awal bab & tengah panel galeri | Pemberhentian yang tegas | Tetap (snap CSS) |
| Text reveal (baris/kata) | Judul bab, prolog, cerita tempat | Membaca dengan jeda | Fade per paragraf |
| Stagger | Penghitung prolog, timeline, kartu tim | Mengarahkan mata | Muncul bersamaan |
| Mask reveal | Gunungan menyapu antar bab, foto panel | Transisi bermakna (kayon = ganti babak) | Crossfade |
| Shared-element transition | Gunungan gate → prolog, panel → detail, kartu bab → header Today, kartu tim → kontak | Kesinambungan | Crossfade (browser tanpa View Transitions) |
| Microinteractions | Input kode, toggle bahasa, tombol Maps/copy, kartu "Say it in Javanese" | Terasa responsif dan dirawat | Tetap (tanpa gerak berlebih) |
| Pointer interaction | Gate (cahaya ikut kursor), panel (tilt + kilau), boarding pass (drag) | Interaktif dan personal | Gyroscope di HP; mati di Calm |
| Selective bloom | Lampu blencong, lampu kota, lampion, kilau benang emas | Pijar hanya pada sumber cahaya | Glow sprite murah |
| Depth of field | Panel aktif di galeri, canting, detail objek | Memusatkan perhatian | Mati |
| Color grading | Per fase waktu (LUT dicampur sesuai progres) + menyatukan foto dari banyak sumber | Satu "film", satu karakter warna | **Tetap** (LUT murah) |
| Subtle grain / vignette | Global, vignette lebih kuat di malam hari | Tekstur film | Tetap (statis) |
| Fog / volumetric light | Gate (cahaya menembus gunungan), sunrise Kemuning | Kedalaman & suasana | Fog eksponensial + god rays palsu |
| Particles | Debu di berkas cahaya (subuh), kabut/daun teh (Hari 2), percikan arang wedangan (malam), serbuk emas (Hari 3) | Atmosfer & gerak | Jumlah dikurangi atau mati |

---

## 9. Spesifikasi Motion ("jeda yang terukur")

| Elemen | Durasi | Easing | Jeda / stagger | Catatan |
|---|---|---|---|---|
| Text reveal per baris | 0,9 dtk | `expo.out` | 80 ms antar baris | Baris naik dari 110% di dalam mask |
| Text reveal per kata | 0,6 dtk | `power3.out` | 35–45 ms antar kata | Maks ±40 kata per blok |
| Jeda antar blok teks | — | — | 250–400 ms | Memberi napas |
| Stagger daftar/kartu | 0,6 dtk | `power3.out` | 60–100 ms | Maks 8 item per grup |
| Mask reveal gunungan | 1,2 dtk | `expo.inOut` | — | Transisi antar bab |
| Shared-element | 0,5–0,7 dtk | `power4.inOut` | — | |
| Microinteraction | 120–200 ms | `power2.out` | — | Hover, tekan, toggle |
| Snap | 0,6–1,0 dtk | `power3.inOut` | Tunggu 150 ms setelah scroll berhenti | |
| Scrub | Smoothing 0,8–1 dtk | linear + lerp | — | |
| Tilt pointer | — | lerp 0,1 per frame | — | Maks 6–8° |
| Kamera | — | — | — | **Tanpa roll**, rotasi ≤ 15°/dtk, perubahan FOV halus, demi kenyamanan (tidak memicu mabuk gerak) |

Semua nilai disimpan sebagai **token** di satu file (`motion.ts`), tidak ditulis langsung di komponen.

---

## 10. Draf Itinerary & Konten

> **Ini draf dari penyusun**, disusun dari preferensi tamu. Host memfinalkan isinya. Semua jam, jam buka, harga, dan nama vendor bertanda **[V]**. Urutan hari bisa ditukar menyesuaikan hari dalam minggu (lihat Q1).

### 10.1 Prinsip penyusunan
- **Padat & ramai**: 6–9 titik per hari, dengan jeda istirahat di penginapan pada siang hari (sekalian antisipasi hujan sore di musim hujan).
- **Selang-seling manis dan gurih** setiap hari. Satu menu manis khas Solo per hari boleh, sisanya gurih.
- **Halal & tanpa alkohol**. Guide wajib memastikan warung jelas halal, karena di beberapa area (mis. sekitar Pecinan) ada warung non-halal [V].
- **Tanpa pisang**. Waspadai jajanan pasar seperti nagasari, pisang goreng, dan topping pisang.
- **Sunrise/sunset & night ride** masing-masing muncul minimal sekali.

### 10.2 Hari 1: *The Royal City* (keraton, pasar, sunset, night ride)
| Jam (WIB) | Fase | Kegiatan | Catatan |
|---|---|---|---|
| 07.00 | Pagi | Sarapan soto (kandidat: Soto Gading) | Gurih [V] |
| 08.30 | Pagi | **Keraton Kasunanan Surakarta**: museum & pelataran | Dress code sopan (bahu & lutut tertutup), ikuti aturan area [V]. Cek hari tutup [V]. |
| 10.30 | Siang | **Pasar Klewer**: pusat batik & kain, ramai | Tawar-menawar ditemani translator |
| 11.30 | Siang | Makan siang tengkleng (kandidat: dekat Pasar Klewer) | Gurih dan pedas, sering cepat habis [V] |
| 12.45 | Siang | **Pasar Gede Hardjonagoro** (rancangan Thomas Karsten, 1930 [V]): jajanan seperti cabuk rambak (gurih) dan es dawet telasih (manis) + **Klenteng Tien Kok Sie** di sebelahnya | Pastikan dawet tanpa pisang. Spot estetik. |
| 14.00 | Siang | Istirahat & bebersih di penginapan | Plan B hujan |
| 15.30 | Sore | **De Tjolomadoe**: bekas pabrik gula yang direvitalisasi | Estetik dan sebagian besar indoor, aman saat hujan [V jam buka] |
| 17.00 | Senja | **Sunset di Waduk Cengklik** | Kadang terlihat pesawat mendarat di bandara Adi Soemarmo di dekatnya [V] |
| 19.00 | Malam | Makan malam nasi liwet (kandidat: kawasan Keprabon) | Gurih dan bersantan [V] |
| 20.00 | Malam | **Night ride**: Jl. Slamet Riyadi → Gladag → Benteng Vastenburg → kuliner malam Galabo → Ngarsopuro → wedangan (HIK) | Kendaraan TBD (Q5) |

### 10.3 Hari 2: *Mist of Lawu* (sunrise, alam, candi, pertunjukan malam)
| Jam (WIB) | Fase | Kegiatan | Catatan |
|---|---|---|---|
| 03.45 | Subuh | Berangkat ke Karanganyar (±1–1,5 jam) [V] | Jaket, karena dingin di ketinggian [V] |
| 05.00 | Subuh | **Sunrise & kabut pagi di Kebun Teh Kemuning** | Titik pandang terbaik ditentukan guide lokal [V] |
| 06.30 | Pagi | Sarapan & teh (kandidat: Rumah Teh Ndoro Donker) | [V jam buka] |
| 08.15 | Pagi | **Candi Cetho**: candi berundak di lereng Lawu (abad ke-15 [V]) | Biasanya wajib memakai kain poleng yang disediakan [V] |
| 10.15 | Siang | **Candi Sukuh**: bentuknya mirip piramida terpancung | [V] |
| 12.00 | Siang | Makan siang di Tawangmangu (kandidat: sate kelinci / menu gurih lain) | Konfirmasi tamu nyaman dengan menu kelinci [V] |
| 13.30 | Siang | **Grojogan Sewu** (air terjun) | Banyak anak tangga. Dilewati kalau hujan deras. |
| 15.00 | Sore | Kembali ke Solo, istirahat | |
| 18.30 | Malam | Makan malam selat solo (manis-gurih) | [V] |
| 20.00 | Malam | **"Movies" versi Solo: Wayang Orang Sriwedari**, teater klasik yang berjalan sejak 1910 [V jadwal] | Alternatif: bioskop. Lihat Q4. |
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
| 20.30 | Malam | Ngarsopuro Night Market (kalau jatuh di malam Minggu [V]) / wedangan terakhir | |

### 10.5 Rencana hujan (November–Desember = musim hujan)
| Rencana utama | Plan B |
|---|---|
| Sunset Waduk Cengklik | Lebih lama di De Tjolomadoe, atau "movies" di bioskop |
| Night ride terbuka | Mobil/becak tertutup + wedangan |
| Grojogan Sewu | Lebih lama di rumah teh, lalu pulang lebih awal |
| Sunrise Kemuning berkabut tebal | Tetap berangkat: kabut justru menjadi pemandangannya. Siapkan cerita "sea of mist". |

Setiap tempat di data punya kolom `planB` yang tampil di Today lewat toggle "Rain plan".

### 10.6 Info praktis: *Before you go* (EN di web)
- **Zona waktu:** Solo memakai WIB, **1 jam lebih lambat dari Singapura**.
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
| FR-01 | P0 | Semua halaman selain gate dan aset publik hanya bisa diakses dengan sesi yang valid | Request tanpa cookie ke `/film`, `/today`, `/api/trip` → redirect ke gate atau 401 |
| FR-02 | P0 | Kode booking dicek **di server** (hash, perbandingan constant-time) | Kode tidak ada di bundle klien maupun di repo |
| FR-03 | P0 | Sesi berupa cookie `HttpOnly; Secure; SameSite=Lax` yang ditandatangani, berlaku sampai akhir trip + 30 hari | Setelah kode benar, tamu tidak diminta kode lagi di perangkat yang sama |
| FR-04 | P1 | Kode tim memberi peran `team`, sehingga catatan tim ikut terkirim | Dengan kode tamu, field `teamNote`/`estCost` **tidak ada** di respons API |
| FR-05 | P0 | Pembatasan percobaan: jeda yang makin panjang setelah salah, dan 5 kali salah → 30 dtk | Uji e2e |
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
| FR-20 | P0 | Urutan prolog → 3 bab → epilog → credits, dengan indikator bab yang bisa diketuk | Uji manual + e2e |
| FR-21 | P0 | Horizontal gallery per hari, di-pin, dikendalikan scroll vertikal, snap per panel, 5–8 panel | Di HP: swipe/scroll vertikal menggerakkan galeri dengan mulus |
| FR-22 | P0 | Siklus waktu subuh → malam per bab (LUT, langit, kabut, partikel) mengikuti progres | Visual cocok dengan storyboard |
| FR-23 | P0 | Panel bisa diketuk dan meluas menjadi detail (shared element), lalu kembali ke posisi semula | Uji manual |
| FR-24 | P0 | Gunungan sebagai mask reveal antar bab | — |
| FR-25 | P0 | Benang emas tergambar mengikuti scroll lintas bab | — |
| FR-26 | P0 | Boarding pass/luggage tag ber-physics, 1 per tamu, berisi nama dari data privat | Bisa di-drag di desktop dan disentuh di HP |
| FR-27 | P1 | Diorama Solo + medan Lawu dengan kamera terbang | — |
| FR-28 | P1 | Canting + kain mori (Hari 3) | — |
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
| FR-43 | P2 | Audio ambience (default mati, toggle jelas) |

---

## 12. Requirement Non-Fungsional

### 12.1 Performa & anggaran
| Item | Anggaran |
|---|---|
| Gate: JS (gz) | ≤ 80 KB sebelum kode benar. Bundle 3D baru dimuat setelahnya. |
| Today: JS (gz) | ≤ 120 KB, tanpa WebGL |
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
- **Data privat** (nama tamu, nomor WhatsApp, alamat penginapan, catatan tim, catatan medis) **tidak disimpan di repo**. Data ini disimpan di environment variable hosting (`TRIP_PRIVATE_JSON`) lalu digabung di server.
- Kode akses disimpan sebagai **hash** di env (`ACCESS_GUEST_HASH`, `ACCESS_TEAM_HASH`), dan cookie ditandatangani dengan `SESSION_SECRET`.
- Header: CSP ketat, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`.
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
| Framework | **Next.js** (App Router) + TypeScript strict | Server rendering untuk gate dan proteksi data, route handler, `next/font`, cocok dengan Vercel |
| 3D | **three.js** + **React Three Fiber** + **drei** | Ekosistem matang. drei menyediakan `PerformanceMonitor`, `ContactShadows`, dan lain-lain. |
| Post-processing | **@react-three/postprocessing** | Selective bloom, DOF, LUT, noise, vignette, tone mapping |
| Physics | **@react-three/rapier** | Tali + tag (rope/spherical joint) |
| Scroll & motion | **GSAP** (ScrollTrigger, SplitText) + **Lenis** | Pin, scrub, snap, text reveal. Seluruh plugin GSAP kini gratis. |
| Transisi halaman | View Transitions API | Shared element |
| Validasi data | **Zod** | Schema konten + `content:check` |
| PWA | Service worker (mis. Serwist) | Today offline |
| Hosting | **Vercel** | Lihat A4 |
| Pipeline aset (offline, di mesin dev) | sharp (AVIF/WebP), toktx / gltf-transform (KTX2, Meshopt), model depth estimation (mis. *Depth Anything V2 Small*) untuk depth map, segmentasi subjek untuk mask | Dijalankan sekali per foto, hasilnya di-commit |

Versi persis dipasang (*pin*) saat scaffolding. Pakai versi stabil terbaru yang sudah rilis minimal dua minggu.

### 13.2 Peta kapabilitas & urutan bangun
| Modul | Tanggung jawab | Bergantung pada |
|---|---|---|
| `content` | Schema, data trip, string i18n, `content:check` | — |
| `access` | Gate, kode, sesi, API data terproteksi, header | `content` |
| `today` | Mode Today, PWA offline, kontak, Plan B | `content`, `access` |
| `film-core` | Scroll (Lenis + GSAP), bab, pin, snap, horizontal gallery, text/mask reveal, lapisan DOM | `content`, `access` |
| `assets` | Manifest foto, pipeline foto (grading dasar, depth, mask, KTX2), model 3D, LUT, font | `content` (slot foto) |
| `film-3d` | Scene R3F, gunungan, benang emas, siklus waktu, post-FX, partikel, kamera, tier kualitas, pointer/gyro | `film-core`, `assets` |
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
src/
  app/
    page.tsx             → gate
    film/                → film (server-gated)
    today/               → mode Today (server-gated, PWA)
    credits/             → credits statis
    api/session/         → verifikasi kode, set cookie
    api/trip/            → data trip + gabungan data privat sesuai peran
  engine/
    scroll/              → Lenis, ScrollTrigger, snap, pin
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
// Data itu dimuat dari env di server lalu digabung sesuai peran sesi.
```

**Konvensi:** TypeScript strict. Komponen `PascalCase`, hook `useX`, file `kebab-case`. Tidak ada angka motion yang ditulis langsung (semua dari `engine/motion/tokens.ts`). Teks yang tampil ke pengguna tidak ditulis di JSX, selalu lewat data/i18n.

### 13.5 Pipeline aset foto
1. Cari foto sesuai shot list (§10.9), lalu catat di `manifest.json`: `sourceUrl`, `author`, `license`, `licenseUrl`, `retrievedAt`, `edits`, `focalPoint`, `alt{en,id}`.
2. `assets:build`: crop ke 16:9 & 9:16 berdasarkan focal point, koreksi dasar, ekspor AVIF/WebP + tekstur KTX2.
3. Untuk foto panel: buat **depth map** dan **mask subjek**, lalu rapikan manual bila perlu.
4. **Color grading akhir** dilakukan di shader (LUT per fase) agar foto dari banyak sumber menjadi satu karakter.
5. Credits dibuat otomatis dari manifest.

**Catatan lingkungan:** sesi pengembangan saat ini tidak bisa mengakses situs foto seperti Wikimedia (diblokir jaringan). Saat fase `assets`, akses jaringan perlu dibuka, atau host mengunduh foto lalu menaruhnya di `content/trips/solo/photos/src/`.

### 13.6 Alur akses
```
Gate (publik) ── POST /api/session {code} ──► server: normalisasi → hash → bandingkan (constant-time)
   │                                             ├─ salah → 401 + jeda bertingkat
   │                                             └─ benar → Set-Cookie sesi (role: guest|team)
   ▼
/film, /today (server cek cookie) ──► render. Data diambil dari /api/trip (difilter per role)
Aset publik (foto berlisensi, GLB, font) tidak memuat data pribadi.
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
```

---

## 14. Strategi Pengujian & QA

| Level | Alat | Cakupan |
|---|---|---|
| Unit | Vitest | Schema & `content:check`, logika Today (jam palsu + zona Asia/Jakarta vs Asia/Singapore), filter data per role, normalisasi kode |
| E2E | Playwright (Chromium; emulasi iPhone & Pixel) | Kode salah/benar, cookie, 401 tanpa sesi, `noindex`, toggle bahasa, Today offline, Calm/reduced-motion, credits lengkap |
| Visual | Screenshot Playwright di posisi scroll tetap (seed partikel tetap) | Mencegah regresi tampilan per bab |
| Performa | Lighthouse (gate & Today), overlay FPS di perangkat nyata | Target S1–S4 |
| Perangkat nyata | Lihat matriks di bawah | Wajib sebelum kirim |
| Konten | Proofread EN oleh penutur yang fasih + review istilah Jawa oleh guide/translator | S6 |
| Fakta | Verifikasi semua [V] pada **H-14** dan **H-3** | Kolom `verifiedAt` terisi |
| Dry-run | Host, translator, dan guide mencoba sebagai "tamu" dari link WhatsApp sampai Today | S10 |

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
- Menambah layanan berbayar atau dependency di luar §13.1
- Mengubah tempat/jam itinerary yang sudah difinalkan
- Memakai foto berlisensi NC
- Mengubah mekanisme akses
- Menambah analytics
- Mengaktifkan audio
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

Tanggal pasti disusun setelah tanggal trip diketahui (Q1). **Target kirim: H-7.**

| # | Milestone | Isi | Kriteria selesai |
|---|---|---|---|
| M0 | Fondasi konten | Host menjawab pertanyaan terbuka P0, itinerary v1 dikunci, sourcing foto dimulai | Q1–Q6 terjawab. ≥ 10 foto utama berlisensi tercatat. |
| M1 | Kerangka & akses | Scaffold Next.js, schema, `content:check`, gate, sesi, i18n, deploy preview | Gate berfungsi di HP nyata. Data terproteksi. `noindex` aktif. |
| M2 | Today | Today lengkap + offline + kontak + Plan B | Diuji di iPhone & Android. Sudah berguna walau film belum jadi. |
| M3 | Film 2D | Struktur scroll, bab, snap, pin, horizontal gallery, text/mask reveal, panel foto dasar, Calm mode | Cerita lengkap bisa dibaca dari awal sampai akhir |
| M4 | Film 3D & cahaya | Gunungan, benang emas, siklus waktu/LUT, post-FX, partikel, fog, kamera, tier kualitas, depth parallax | S1–S2 tercapai di perangkat uji |
| M5 | Finale & polish | Boarding pass physics, microinteraction, pointer/gyro, shared element, end credits, letterbox, OG, template WhatsApp | Seluruh baris di §8 terpenuhi |
| M6 | QA & preflight | Matriks perangkat, aksesibilitas, proofread, verifikasi [V] (H-14 & H-3), dry-run | Semua kriteria di §4 hijau |
| M7 | Kirim | Pesan WhatsApp + link (kode dikirim terpisah), standby perbaikan konten | Tamu berhasil masuk |

---

## 17. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Foto Solo berlisensi bebas langka atau kualitasnya kurang | Visual turun | Hanya 10–15 slot. Wikimedia/Flickr CC. Minta izin fotografer. Panel tipografi/3D sebagai pengganti. Grading LUT untuk menyatukan. |
| WebGL berat di HP | Patah-patah, panas, boros baterai | Tier adaptif, anggaran aset, uji perangkat nyata sejak M4, dispose per bab |
| Musim hujan | Sunrise/sunset gagal | Plan B per tempat, narasi "sea of mist", toggle Rain plan |
| Info lapangan berubah (jam buka, harga, jadwal pertunjukan) | Tamu kecewa di lokasi | Tanda [V], verifikasi H-14 & H-3, kolom `verifiedAt`, redeploy cepat |
| Kesalahan budaya atau bahasa Jawa | Memalukan di depan tamu | Review guide/translator. Aksara Jawa hanya yang terverifikasi. Panduan etika §6.6. |
| Link diteruskan ke orang lain | Kebocoran jadwal dan kontak | Kode di server, kode dikirim terpisah dari link, data privat di env |
| Tamu bingung WIB vs SGT | Telat jemput | Label "(1 hour behind Singapore)", logika berbasis Asia/Jakarta |
| Animasi menghambat akses info | Frustrasi selama trip | Today terpisah, tanpa WebGL, default selama trip |
| Typo atau Inggris yang kaku | Citra host turun | Proofread penutur yang fasih + spellcheck otomatis |
| Scope 3D membengkak | Molor | Prioritas P0/P1/P2. Today dan film 2D jadi lebih dulu (M2–M3). |

---

## 18. Pertanyaan Terbuka (perlu jawaban host)

| # | Pertanyaan | Berdampak ke |
|---|---|---|
| Q1 | **Tanggal trip pastinya** (hari dalam minggu)? | Urutan hari (hari tutup keraton, malam Minggu Ngarsopuro, jadwal wayang orang), milestone |
| Q2 | Kedatangan & kepulangan tamu: jam, bandara/stasiun, moda? | Hari 1 & Hari 3, kemungkinan "Hari 0" |
| Q3 | Jumlah tamu pasti & penulisan nama untuk boarding pass? | Epilog, data privat |
| Q4 | "Movies" maksudnya apa: bioskop sungguhan, atau pertunjukan seperti wayang orang? | Malam Hari 2 |
| Q5 | Night ride pakai apa: dibonceng motor/vespa oleh rider lokal, jip/mobil terbuka, atau becak? | Malam Hari 1, keamanan |
| Q6 | Penginapan yang dipilih (kamar mandi dalam)? | Alamat jemput, rute |
| Q7 | Nama host yang ditampilkan ("Hosted by …") + foto/inisial tim? | Prolog, epilog, kontak |
| Q8 | Pakai domain sendiri (mis. ±Rp150–200 rb/tahun) atau subdomain gratis Vercel? | Kesan premium di link preview |
| Q9 | Mau tahu kapan tamu pertama kali membuka web (log anonim tanpa pelacakan)? | Privasi vs informasi |
| Q10 | Punya akses ke iPhone & Android flagship untuk uji (milik sendiri atau pinjam)? Kalau tidak, pakai layanan device cloud? | QA (M4, M6) |
| Q11 | Mau audio ambience gamelan (default mati)? | P2 |
| Q12 | Anggaran Rp1–1,5 jt itu per orang atau per rombongan? Siapa yang membayar biaya di lapangan? | Pilihan tempat, tampil-tidaknya estimasi biaya |
| Q13 | Siapa penutur Inggris yang fasih untuk proofread? (Translator?) | S6 |
| Q14 | Konfirmasi catatan medis (alergi paracetamol & pisang) langsung ke tamu? | Catatan tim, P3K |

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
