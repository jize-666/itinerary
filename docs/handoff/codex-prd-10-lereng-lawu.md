# PRD Codex · Tugas 10: Lereng Lawu (Hari 2, "Mist of Lawu")

19 November 2026 · dibaca bersama `codex-prd-bersama.md` (aturan bersama) · disusun Claude untuk host

## Prompt siap tempel (English)

> Build Day 2 of the film, "Mist of Lawu", as a real 3D world: the western slopes of Mount Lawu with the Kemuning tea hills, Candi Cetho and Candi Sukuh in the clouds, down to Tawangmangu and the Grojogan Sewu waterfall, from pre-dawn to night. Use real elevation data (public DEM, processed offline into a compact asset in the repo) and the real sun position for 9 April 2027. It replaces the shared pendapa landscape for the Day 2 slides of `/film/` and must feel like a journey up the mountain that the guest scrubs with scroll or finger. Art direction, modelling, shaders, fog and light, camera choreography and extra moments are yours to design: aim for cinematic and true-to-place, and exceed this PRD where you can. Respect the hard limits in the shared rules (no WebAssembly, no external origins, the host's camera-motion rule, ≥ 55 fps on the host's iPhone at tier High, privacy) and pass the acceptance tests in §7. Deliver as described in the shared rules §4.

---

## 1. Tujuan

Hari 2 adalah satu-satunya hari di gunung. Tamu bangun jam 04.00, berangkat dalam gelap, lalu menunggu matahari di kebun teh Kemuning sambil kedinginan. Sesudah itu ia naik ke dua candi di dalam kabut, turun ke air terjun, dan kembali ke Solo saat senja. Film saat ini memakai satu lanskap untuk semua hari, yaitu dataran sawah dengan Lawu di cakrawala timur.

Tugas ini membuat Hari 2 terasa **berada di lereng itu**. Lerengnya nyata (bentuk tanah dari DEM), cahayanya nyata (matahari 9 April 2027), dan perjalanannya mengikuti gulir tamu.

PRD situs (`docs/PRD.md` §7.3) menulis untuk Hari 2: "Medan lereng Lawu + barisan teh (instanced) + Candi Sukuh berundak", lalu "Fog + volumetric light saat sunrise di sela barisan teh. Kamera naik dari kebun teh ke candi di dalam kabut."

## 2. Fakta dari repo (`content/trips/solo/trip.ts`, Hari 2, 9 April 2027)

Judul EN/ID: "Mist of Lawu" / "Kabut Lawu". Subjudul: "Sunrise over the tea hills, temples in the clouds, and a classical stage after dark." Dress code: "Layers for a cold dawn; comfortable shoes for temple steps." Aksen warna PRD: hijau teh `--teh #6E8B5A` dan biru kabut.

| Jam | id | Tempat | Fase | Panel | Catatan dari konten |
| --- | --- | --- | --- | --- | --- |
| 04:00–05:15 | `depart-lawu` | Berangkat ke gunung | dawn | teks | ±1 jam lebih ke timur kota |
| 05:15–06:30 | `kemuning-sunrise` | Matahari terbit di Kemuning | dawn | foto | Rencana B saat kabut tebal: "lautan kabut" |
| 06:45–08:00 | `tea-house` | Sarapan di rumah teh | day | teks | Rumah teh era kolonial |
| 08:15–09:45 | `candi-cetho` | Candi Cetho | day | foto | Candi berundak abad ke-15; kain poleng di pintu |
| 10:00–11:15 | `candi-sukuh` | Candi Sukuh | day | foto | "A truncated stone pyramid unlike any other temple in Java" |
| 11:30–12:30 | `friday-prayer` | Salat Jumat (pilihan) | day | teks | |
| 12:45–13:40 | `tawangmangu-lunch` | Makan siang di Tawangmangu | day | teks | |
| 13:45–15:00 | `grojogan-sewu` | Grojogan Sewu | day | foto | Air terjun; dilewati bila hujan |
| 15:15–18:15 | `rest-2` | Kembali ke Solo, istirahat | dusk | teks | Turun gunung |
| 18:30–19:30 | `selat-solo` | Selat Solo | night | teks | Di kota |
| 20:00–22:00 | `movie-night` | Malam film | night | foto | Alternatif: Wayang Orang Sriwedari (sejak 1910) |

Panel foto dan teks sudah ada sebagai kartu DOM di gallery. Tugas ini membuat dunia 3D di belakang dan di sekitar kartu-kartu itu, bukan mengganti kartunya.

## 3. Tempat dan data

### 3.1 Koordinat (perkiraan, wajib diverifikasi dari OSM dan DEM)

| Tempat | Perkiraan | Catatan |
| --- | --- | --- |
| Candi Cetho | ≈ 7°35′44″ LS, 111°09′26″ BT, ±1.490 m | Paling tinggi dan paling utara dari keduanya |
| Candi Sukuh | ≈ 7°37′38″ LS, 111°07′52″ BT, ±910 m | |
| Puncak Lawu (Hargo Dumilah) | ≈ 7°37′40″ LS, 111°11′35″ BT, ±3.265 m | |
| Kebun Teh Kemuning, Tawangmangu, Grojogan Sewu | ambil dari OSM | |

Kotak data yang cukup: kira-kira 7,56–7,70° LS × 111,08–111,22° BT, ±15 × 15 km. Codex boleh memperluasnya, misalnya supaya kota Solo atau Bengawan Solo tampak di kejauhan dari atas.

### 3.2 DEM (bentuk tanah)

- Pilihan yang dikenal:
  - SRTM 1″ (USGS, domain publik);
  - Copernicus GLO-30 (lisensi bebas dengan atribusi).
  - Codex boleh memakai sumber lain. Lisensinya wajib dicek dan dicatat.
- Diolah **di luar runtime**. Skripnya masuk repo, misalnya `scripts/stage/lawu-dem.*`, supaya bisa diulang. Hasilnya aset ringkas di `public/stage/lawu/`, misalnya PNG 16-bit atau biner terkuantisasi. Runtime tidak boleh mengunduh dari luar (CSP).
- Resolusi 30 m terlalu kasar untuk jarak dekat. Detail tambahan (punggung bukit, alur air, batu) boleh prosedural, asal bentuk besarnya tetap setia pada DEM.
- **Cadangan wajib**: bila aset DEM gagal dimuat, Hari 2 tetap tampil dengan bentuk prosedural atau lanskap bersama yang sekarang, tanpa galat.
- Data OSM (jalan, sungai, batas kebun teh, bangunan) boleh dipakai dengan atribusi ODbL.

### 3.3 Matahari dan waktu

- Posisi matahari dihitung untuk lokasi dan **tanggal 9 April 2027, WIB**, misalnya dengan algoritma NOAA/SPA.
- Kemuning ada di lereng barat Lawu. Bisa jadi matahari muncul dari balik massif gunung, lebih lambat daripada terbit astronomis. **Hitung dari DEM; jangan ditebak.** Momen ketika cahaya pertama melewati punggung gunung dan menyapu barisan teh adalah inti bab ini.
- Film sudah punya waktu per slide (jam tempat singgah), grading per fase (`engine/stage/grade.ts`), dan partikel per fase (`engine/stage/particles.ts`). Dunia Lawu memakai jam yang sama supaya grading, partikel, langit, dan kartu tetap seirama.

### 3.4 Candi dan rasa hormat

- **Candi Cetho**: kompleks berundak di lereng, abad ke-15, akhir Majapahit. Gapura, teras-teras bertingkat, dan kain poleng hitam-putih yang dililitkan pada arca dan gerbang. Masih menjadi tempat ibadah Hindu.
- **Candi Sukuh**: piramida batu terpancung, berbeda dari candi lain di Jawa, abad ke-15. Teras bertingkat dan relief.
- Sebagian relief Sukuh bersifat eksplisit (lingga-yoni). **Jangan digambarkan secara eksplisit.** Pakai bentuk arsitektur, susunan batu, dan relief yang dibuat abstrak.
- Kedua candi adalah tempat suci yang masih dipakai. Tidak ada efek yang terasa main-main di bangunan candi, misalnya Clawd melompat-lompat di atas arca.
- Sumber fakta dicantumkan di README.

## 4. Pengalaman yang diminta

### 4.1 Wajib (P0)

1. **Masuk ke gunung.**
   - Dari akhir Hari 1 ke Hari 2, tamu merasa berangkat ke timur dan naik.
   - Lawu sudah tampak di cakrawala lanskap bersama, jadi kesinambungannya sudah ada.
   - Sapuan gunungan DOM antar bab tetap ada. Codex boleh menambah perjalanan 3D sesudahnya, misalnya kamera melaju di jalan berkelok dalam gelap dengan lampu kendaraan.
2. **Subuh di Kemuning.**
   - Kebun teh berbaris mengikuti kontur. Barisan teh di lereng nyata memang mengikuti garis tinggi, jadi barisannya bisa diturunkan dari DEM.
   - Lautan kabut di bawah, langit biru tua yang berubah jingga, dan cahaya pertama dari balik punggung gunung (volumetric).
   - Dingin harus terasa, misalnya lewat embun, napas berkabut, atau warna.
3. **Naik ke candi di dalam kabut.**
   - Kamera naik dari kebun teh ke Cetho lalu ke Sukuh.
   - Kabut bergerak di antara teras dan memperlihatkan bangunan sedikit demi sedikit.
4. **Turun ke Tawangmangu dan Grojogan Sewu.**
   - Air terjun dengan tirai air, kabut percikan, dan suara air bila suara situs menyala.
   - Siang menuju sore.
5. **Pulang saat senja dan malam.**
   - Turun ke dataran, lampu kota Solo menyala di kejauhan.
   - Panel malam (Selat Solo, malam film) boleh kembali ke kota atau memandang lereng dari bawah. Codex yang memilih.
6. **Gallery tetap gallery.**
   - Kartu DOM tetap di depan dan terbaca.
   - Kamera bergerak mengikuti gulir antar panel: satu panel = satu langkah perjalanan, berhenti saat gulir berhenti.
   - Gerbang dimensi antar panel (lensa melebar, garis cahaya) boleh dipertahankan atau diganti dengan peralihan yang lebih cocok untuk gunung, misalnya menembus awan.
7. **Bahasa lampion tetap ada.**
   - Di gallery hari lain, satu lampion per tempat singgah menyala saat dilewati perahu di Bengawan Solo (pilihan host, Tugas 8.1).
   - Di Hari 2, arti ini dipertahankan: satu cahaya per tempat singgah, menyala saat dilewati. Bentuknya bebas, misalnya lampion di jalan setapak, obor di anak tangga candi, atau aliran air pegunungan.
8. **Judul hari dan gong penutup Hari 2 tetap bekerja.**
   - Mekanismenya: huruf judul tersedot ke pencu gong, gong ditabuh, gong penutup dipukul. Semua tes gong tetap lulus.
   - Letak gong bebas: tetap di pendapa, atau dipindah ke dunia Lawu dengan alasan yang kuat (misalnya di halaman Cetho). Bila dipindah, tetap hormati §3.4.
9. **Clawd tetap memandu.** Clawd tidak tertutup medan atau kabut dan tetap di ruang kamera seperti sekarang.

### 4.2 Diharapkan (P1)

- Partikel Hari 2 sesuai PRD situs: kabut dan daun teh, ditambah embun pagi. Sambungkan ke kadar partikel per fase yang sudah ada.
- Suara suasana prosedural (WebAudio) atau berkas kecil berlisensi bebas: angin gunung, serangga pagi, air terjun. Ikut sakelar suara situs.
- Versi 2,5D (tier Static) untuk momen subuh Kemuning: lapisan lereng, barisan teh, kabut, dan matahari dalam DOM/CSS 3D, mengikuti aturan gerak kamera di film 2,5D.
- Kalimat Clawd baru untuk Hari 2, dua bahasa, misalnya tentang dingin, kabut, atau anak tangga. Klip suaranya dibuat Claude.

### 4.3 Benih (bebas dipakai atau dibuang)

- Saat kabut tebal (rencana B konten), lautan kabut menjadi pemandangan utama: puncak-puncak muncul seperti pulau.
- Kamera naik ke atas awan di Sukuh, dan puncak Lawu tampak terang di atas lautan awan.
- Barisan teh yang menyala satu per satu oleh cahaya pagi bisa sekaligus menjadi "lampion" Hari 2.
- Clawd memakai syal atau jaket tipis di subuh Kemuning, sesuai dress code "Layers for a cold dawn".

## 5. Letak di film (sambungan teknis)

- Dunia Lawu dipakai pada slide Hari 2: `day-2/title`, `day-2/intro`, `day-2/<stop>` × 11 panel, dan `day-2/gong`. Codex boleh memutuskan slide mana yang tetap di pendapa.
- Dunia per bab dibuat sebagai sambungan yang bisa dipakai ulang Tugas 11 (lihat aturan bersama §4). Ia menentukan:
  - cara memuat (prefetch saat tamu masih di Hari 1);
  - cara bertukar dunia saat bab berganti, dengan kamera bergerak mengikuti gulir dan tanpa layar kosong;
  - cara melepas memori bila bab sudah jauh.
- Film bisa dibuka langsung di `#day-2`, atau lompat dari menu bab. Selama aset Lawu belum siap, tampilkan lanskap bersama, lalu beralih begitu siap tanpa kedipan.
- Shader dunia Lawu menulis HDR linear dan memakai uniform `COMMON` (`stage3d/shared.ts`), supaya bloom, grading, DOF, dan kilatan gong berlaku sama. Bila Codex membutuhkan uniform atau tahap post baru, tambahkan dengan rapi dan jelaskan.
- Tier:
  - High: kabut volumetrik (raymarch langkah rendah) dan DOF.
  - Medium: god rays di ruang layar.
  - Low: kabut eksponensial dan god rays palsu.

  Codex bebas memakai teknik lain, asal **High tidak dikurangi kualitasnya demi hemat** dan fps di §6 tercapai.

## 6. Anggaran

| Hal | Batas |
| --- | --- |
| Fps | iPhone host di High: rata-rata ≥ 55 fps, p95 ≤ 20 ms, termasuk saat geser panel. MacBook Air M: ≥ 58 fps. |
| Aset Hari 2 | ≤ 6 MB sesudah kompresi: DEM, tekstur, dan suara. |
| Kode Hari 2 | Satu chunk lazy, sebaiknya ≤ 250 KB gzip. |
| Panduan (bukan batas) | ±≤ 80 draw call dan ±≤ 600 ribu segitiga terlihat per frame di High. Pakai instancing, LOD, dan culling. Yang mengikat adalah fps. |
| Siap tampil | Bila Hari 2 di-prefetch saat Hari 1, perpindahan tanpa tunggu. Bila dibuka langsung `#day-2` di 4G, lanskap bersama tampil dulu, dan dunia Lawu ≤ 5 dtk. |

## 7. Uji penerimaan

Selain uji bersama (aturan bersama §5):

- **Unit (Vitest), logika murni di `src/engine/…`:**
  - posisi matahari untuk lokasi dan jam: terbit, siang, terbenam 9 April 2027, dibandingkan dengan nilai acuan bersumber;
  - saat cahaya pertama melewati punggung gunung di Kemuning menurut DEM;
  - pemetaan panel → pose kamera tanpa lompatan (kontinu terhadap progres gulir, maju dan mundur);
  - kamera tidak menembus medan pada seluruh lintasan (sampel progres 0–1);
  - pembaca DEM: tinggi di koordinat Cetho, Sukuh, dan puncak Lawu cocok dengan data dalam toleransi yang dijelaskan;
  - cadangan prosedural dipakai bila aset tidak ada.
- **E2E (Playwright, `?stage=low`):**
  - membuka `/film/#day-2`: dunia Lawu siap (atribut data), tanpa galat konsol;
  - maju lewat semua panel Hari 2 lalu mundur: tanpa galat, dan lampion/cahaya tempat singgah menyala sesuai panel (lewat atribut data);
  - Hari 1 dan Hari 3 masih memakai dunianya sendiri;
  - `?stage=static` dan Calm: Hari 2 tampil 2,5D tanpa WebGL;
  - aset DEM diblokir (`page.route`): cadangan tampil, film tetap jalan;
  - bolak-balik `/film/#day-2` ⇄ `/today/` beberapa kali: jumlah konteks WebGL tidak bertambah.
- **Bukti kinerja**: angka per tier (§6), video desktop dan HP (aturan bersama §6) yang memperlihatkan subuh Kemuning, naik ke candi, dan air terjun.
- **Atribusi**: DEM dan OSM tercantum di credits film dan README.
