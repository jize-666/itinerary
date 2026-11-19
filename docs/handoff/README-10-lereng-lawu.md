# Tugas 10 · Kabut Lawu / Mist of Lawu

Hari 2 di `/film/#day-2` membawa tamu dari keberangkatan subuh ke Kemuning, Candi Cetho, Candi Sukuh, Tawangmangu, Grojogan Sewu, lalu pulang saat senja. Sebelas kartu mengambil isi dan slot waktu dari data trip aktif. Setiap tempat mendapat satu cahaya di panggung. Gulir balik memadamkannya dalam urutan terbalik.

**Basis** `jize-666/itinerary@9065447f44ea2744f882a23f20548bb5347c548a` · `audio (#19)`. Ini adalah `main` yang tersedia saat pekerjaan dimulai atas instruksi host. Kedua PRD dibaca dari berkas susulan. Pada commit dasar, rute yang diekspor ialah `/`, `/film/` dan `/today/`. Paket ini dapat diterapkan secara mandiri terhadap commit tersebut.

## Pemasangan

ZIP memuat `changes.patch` untuk berkas lama dan `files/` untuk berkas baru. Jalankan dari checkout proyek yang bersih. Perintah berikut mengasumsikan ZIP berada di folder Downloads.

```sh
lawu_dir=$(mktemp -d)
unzip -q "$HOME/Downloads/Tugas-10-Lereng-Lawu.zip" -d "$lawu_dir"
git switch -c feat/lereng-lawu 9065447f44ea2744f882a23f20548bb5347c548a
git apply --check "$lawu_dir/changes.patch"
git apply "$lawu_dir/changes.patch"
(cd "$lawu_dir/files" && tar -cf - .) | tar -xf -
pnpm install --frozen-lockfile
pnpm build
pnpm preview
```

Untuk integrasi di `main` yang lebih baru, buat cabang dari commit baru dan jalankan `git apply --check` di sana sebelum menerapkan patch. Setelah masuk melalui gerbang trip, buka `/film/#day-2`. Parameter `?stage=high`, `medium`, `low` dan `static` tersedia sebelum hash. Tambahkan `&fps` untuk membaca tier di layar.

## Dunia dan interaksi

- **Kemuning.** Barisan semak teh mengikuti garis tinggi DEM melalui marching squares. Pada waktu subuh, tiap bagian kebun membaca ketinggian cakrawala setempat dari tekstur kecil yang dipanggang di luar aplikasi. Tanah, semak dan langit memakai arah matahari yang sama. Kamera mencapai Kemuning sekitar empat menit setelah cahaya pertama agar tamu bisa mengikuti perubahannya sejak pendekatan. Jam pada kartu tetap menunjukkan keseluruhan waktu kunjungan.
- **Dua candi.** Di Cetho, kamera mengikuti sumbu tangga menuju gapura belah. Poleng membalut kaki gerbang. Di Sukuh, siluet piramida terpancung, tangga dan massa batu mendominasi gambar. Relief dibuat abstrak. Clawd bergerak di ruang kamera, terpisah dari bangunan yang dipakai beribadah. Semua bentuk, tanaman, material dan efek cuaca dibuat di kode.
- **Air dan kota.** Grojogan Sewu memiliki dinding jurang, pita air bergerak, percikan dan kolam. Jalur pulang menempatkan kamera di bawah lereng menghadap gunung serta atap dan lampu permukiman. Gubahan kota dan rumah teh bersifat interpretatif. Potongan DEM berakhir di kaki Lawu dan pengukuran ilmiahnya berlaku untuk bentang tersebut.
- **Gerak.** Perpindahan antar-kartu Lawu mengikuti jarak roda/trackpad atau jari. Melepas di tengah menyimpan posisi. Kursor atau kemiringan ponsel memindahkan kamera lewat sumber gerak film. Keyboard dapat maju dan mundur per kartu. Kamera mengecek elevasi DEM dan permukaan segitiga yang benar-benar digambar. Yaw dan pitch dibatasi sebagai satu vektor hingga 15°/detik, roll nol.
- **Pembuka dan gong.** Gunungan antar-bab, ritual teks ke gong, gong penutup dan suara Clawd memakai sistem film. Judul dan gong Hari 2 berlangsung di pendapa, sedangkan intro dan sebelas kartu berada di gunung. Kartu pindah ke kiri bawah pada desktop. Pada layar potret kartu berada di bawah agar kedua candi dan air terjun tetap terlihat.
- **Suara dan gerak tenang.** WebAudio menghasilkan angin pegunungan dan gemuruh air dengan bus suara film. Sakelar speaker dan visibilitas halaman mengatur pemutarannya. Dalam Static, Calm, reduced motion atau tanpa WebGL2, latar memakai siluet punggung hasil DEM, lapisan kabut, teh, matahari, serta bentuk khas candi atau air terjun. Gradien, perspektif dan kedalaman mengikuti mode gerak pengunjung. Clawd mempunyai satu petunjuk baru EN/ID, `tip.mountain.0`. Rekaman suara Inggris untuk baris ini menjadi bagian Claude setelah integrasi.

## Data, lisensi dan budaya

DEM berasal dari tile Skadi `S08E111.hgt.gz` Mapzen Terrain Tiles. Di Jawa, sumber elevasi utamanya SRTM NASA/NGA, didistribusikan USGS. Tilezen mencatat SRTM sebagai data domain publik dan menyertakan ketentuan atribusinya. *SRTM data courtesy of the U.S. Geological Survey*. Unduhan mentah dan potongan lokal dikunci dengan SHA-256. [Registry AWS](https://registry.opendata.aws/terrain-tiles/) · [Atribusi penyedia](https://github.com/tilezen/joerd/blob/master/docs/attribution.md) · [Tile sumber](https://s3.amazonaws.com/elevation-tiles-prod/skadi/S08/S08E111.hgt.gz)

Koordinat tempat umum berasal dari OpenStreetMap. Berkas `scripts/stage/lawu-places.geojson` memuat atribut lisensi, jenis/ID objek dan titik yang dipakai. Untuk dua kompleks candi dipakai rata-rata titik yang membentuk way. Ekstrak titik didistribusikan menurut ODbL 1.0, © kontributor OpenStreetMap. Atribusi OSM dan DEM juga tampil di credits film dalam kedua bahasa. [Lisensi OSM](https://www.openstreetmap.org/copyright)

| Titik | Lintang | Bujur | Elevasi grid |
| --- | ---: | ---: | ---: |
| Kemuning Sky Hill | −7,595472 | 111,132899 | 1.101 m |
| Area rumah teh, Ndoro Doker | −7,606125 | 111,117528 | 865 m |
| Candi Cetho | −7,595724 | 111,158122 | 1.497 m |
| Candi Sukuh | −7,627301 | 111,131523 | 1.180 m |
| Tawangmangu | −7,672455 | 111,128871 | 985 m |
| Grojogan Sewu | −7,660697 | 111,131079 | 1.054 m |
| Puncak Gunung Lawu | −7,627382 | 111,194316 | 3.246 m |

Panggung memakai elevasi Sukuh hasil grid, sekitar 270 m di atas perkiraan awal PRD. Angka puncak pada objek OSM adalah 3.265 m. Grid satu detik busur merata-ratakan topografi di sekitar puncak. Unit test membandingkan pembaca biner dengan interpolasi tile sumber pada koordinat identik, dengan toleransi 1,1 m.

Cetho merupakan tempat ibadah Hindu berteras di lereng Lawu. Sukuh dibangun pada abad ke-15, di akhir masa Majapahit. Bentuk piramidal dan bahan andesitnya menjadi acuan pemodelan. Kamera memandang dari jalur pendekatan. [Dinas Pariwisata Jawa Tengah](https://visitjawatengah.jatengprov.go.id/id/regency/kabupaten-karanganyar/destinasi-wisata/candi-cetho) · [Smithsonian National Museum of Asian Art](https://asia.si.edu/explore-art-culture/collections/collections-areas/southeast-asian/sacred-sites-in-southeast-asia/candi-sukuh/)

## Cahaya 9 April 2027

Perhitungan waktu menggunakan WIB (UTC+7), posisi matahari NOAA/Meeus dan refraksi dekat cakrawala. Untuk Kemuning Sky Hill, jejak pandang dari mata setinggi 1,65 m di atas tanah menyapu DEM tiap 30 m. Sudut punggung saat perpotongan sekitar 8,72° pada azimut 81,32°. Tekstur cakrawala di kebun memuat 17 × 17 lokasi, masing-masing pada tiga azimut. [Metode NOAA](https://gml.noaa.gov/grad/solcalc/calcdetails.html)

| Peristiwa di Kemuning | Waktu WIB |
| --- | --- |
| Terbit dengan cakrawala datar | 05.37.51 |
| Tepi atas matahari melewati punggung DEM | **06.15.14** |
| Hitung silang PyEphem dan tile asli, sinar tiap 10 m | 06.15.18 |
| Kulminasi, tinggi 74,92° | 11.37.12 |
| Terbenam dengan cakrawala datar | 17.36.27 |

Selisih sekitar 37 menit adalah efek penghalang topografi pada titik pandang itu. Cuaca, pucuk pohon dan perubahan posisi pengamat dapat mengubah apa yang benar-benar dilihat pengunjung.

```sh
python3 scripts/stage/lawu-dem.py
node --import tsx scripts/stage/lawu-light.ts
# Opsional, untuk pembanding independen pada tile asli
python3 scripts/stage/lawu-reference.py /path/to/S08E111.hgt.gz
```

Skrip DEM menerima `--source /path/to/S08E111.hgt.gz` untuk pengolahan lokal tanpa jaringan. Hasilnya grid signed 16-bit 829 × 613, batas 7,54–7,71° LS dan 111,02–111,25° BT, dengan satuan meter. Skrip pembanding opsional memakai `ephem==4.2.1`, hanya pada komputer penguji. Skrip pembuat aset memakai pustaka standar Python dan `tsx` yang sudah ada.

- SHA-256 tile mentah · `17856880428fe428c3847cc6892de1bbb0dfbb2b956552a0b5588221db697919`
- SHA-256 `relief.bin` · `88ee79c4843a656bb8b56ebbd5314240827479f3a01fcdaf6b6e22064a947d65`

## Sambungan untuk bab berikutnya

`stage3d/chapters.ts` memiliki registry berdasarkan tema dan satu pemilik dunia per kanvas. Tambahkan loader untuk tema bab berikutnya dengan antarmuka `ChapterWorld` yang sama. Loader mengambil modul dinamis dan DEM lokal, mulai tiga slide sebelum bab. Tautan langsung mulai memuat DEM dan modul sejak panggung dipilih. Latar bersama tampil selama persiapan dan kabut menjembatani pertukaran. Dua slide sesudah bab memberi ruang untuk gulir balik, lalu permintaan dibatalkan dan geometri, material, tekstur serta buffer instance dilepas. Bila DEM gagal atau rusak, relief prosedural memakai jalur kamera, kartu dan interaksi yang sama.

Berkas bersama yang disentuh meliputi `runtime.ts`, `build-slides.ts`, `Slides.tsx` dan `Film.tsx`. Tema Lawu mempertahankan satu panel per tempat, termasuk salat dan istirahat. `post.ts` menerapkan selubung kabut saat tukar dunia. Air, langit dan tanah menulis HDR linear dan memakai uniform panggung. High mempertahankan DPR, MSAA, DOF dan bloom yang ditentukan oleh film. Kabut di material memakai 5/3/1 sampel menurut tier. Pada High, kebun teh dan rumpun pohon dibagi ke petak agar renderer hanya mengirim kelompok yang masuk bidang pandang. Geometri, transformasi instance dan warna yang masuk gambar tetap sama. Tugas 11 dapat memakai registry ini tanpa membuat kanvas lain.

Dependensi aplikasi baru **0 B**. Aplikasi memuat semua aset dari origin sendiri. Fitur baru memakai WebGL2, Three.js dan WebAudio yang tersedia. Pemanggilan `content:check` menggunakan `node --import tsx` agar pemeriksa yang sama dapat berjalan di lingkungan yang membatasi soket IPC CLI. Hash dasar dan perubahan lengkap ada di `changes.patch`.

## Ukuran dan kinerja

| Komponen | Gzip |
| --- | ---: |
| Data elevasi Hari 2 | 635.435 B |
| Chunk utama dunia Lawu | 10.369 B |
| Modul audio prosedural Lawu | 630 B |
| Seluruh ekspor, termasuk seluruh rute dan aset | 10.462.524 B |
| JavaScript awal rute gerbang, basis → serahan | 197.035 → 197.094 B |
| JavaScript awal rute Today, basis → serahan | 199.748 → 199.773 B |

Ukuran rute menjumlahkan gzip dari setiap skrip unik di HTML ekspor, termasuk framework. Dengan definisi ini, basis dan serahan sama-sama melewati batas 80/120 KB. Chunk dunia dan DEM hanya ditarik pada film. Batas aset Hari 2 sebesar 6 MB, chunk sebesar 250 KB dan total film sebesar 25 MB terpenuhi. Total ekspor dihitung secara konservatif dengan mengikutkan halaman lain.

Pengukuran menggunakan Chromium 153.0.8010.12 dan ANGLE/SwiftShader di Linux. Layar simulasi sentuh 390 × 844 CSS px, DPR perangkat 2. Setiap baris mencakup 54 interval frame panggung yang benar-benar digambar. Kamera diam di Kemuning lalu menerima gulir kontinu ke bagian candi. Pengukuran mencakup antrean renderer perangkat lunak dan beban mesin pengujian.

| Tier | Buffer | Keadaan | Rata-rata fps | Median ms | p95 ms | Draw call | Segitiga/frame |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Low | 390 × 844 | Diam | 2,05 | 366,7 | 1.183,3 | 21 | 148.486 |
| Low | 390 × 844 | Bergeser | 2,39 | 399,9 | 866,6 | 16–22 | 53.126–148.486 |
| Medium | 585 × 1266 | Diam | 0,75 | 1.200,0 | 3.233,2 | 23 | 233.220–233.732 |
| Medium | 585 × 1266 | Bergeser | 0,83 | 1.166,7 | 2.783,3 | 18–24 | 99.492–233.732 |
| High | 780 × 1688 | Diam | 0,74 | 1.249,9 | 3.016,5 | 48 | 554.437–555.461 |
| High | 780 × 1688 | Bergeser | 0,84 | 1.283,3 | 2.533,2 | 29–57 | 460.573–597.223 |

Dalam lintasan yang diukur, High mencapai maksimum 57 draw call dan 597.223 segitiga per frame. Angka ini mencakup pass post-processing.

**Masuk langsung dari cache kosong.** Batas jaringan 10 Mbit/detik dan latensi 100 ms, service worker diblokir. Waktu dihitung dari navigasi ke `data-world-ready="lawu"` pada server statis repo, yang menyajikan berkas mentah. Hasilnya Low 10,80 detik, Medium 8,83 detik, High 9,19 detik. Target 5 detik belum tercapai pada pengujian ini. Film 2,5D dan pendapa menjembatani waktu persiapan.

Target iPhone High rata-rata ≥55 fps dan p95 ≤20 ms, serta target MacBook Air seri M ≥58 fps, menunggu pengukuran pada perangkat fisik. Rekaman pratinjau menggunakan jam virtual sehingga tetap mulus.

Sebagai uji pembanding pada sambungan 4G yang sama, proxy lokal mengirim HTML, JavaScript dan CSS dengan gzip serta file elevasi dengan byte aslinya. Dunia siap setelah Low 4,74 detik, Medium 5,19 detik, High 5,71 detik. Hasil ini adalah satu buka dingin per tier, dengan cache kosong.

## Pengujian

| Pemeriksaan | Hasil |
| --- | --- |
| `pnpm lint` dan `pnpm typecheck` | Lulus |
| `pnpm test` | 482 tes lulus pada 31 berkas |
| `pnpm content:check` | OK · 35 stop. Validator melaporkan 31 penanda fakta dan 15 panel foto yang sudah ada pada konten dasar |
| `pnpm build` | Ekspor statis berhasil, termasuk `/film/` |
| Playwright untuk Lawu | 18/18 lulus pada build serahan. Sembilan skenario per profil, desktop dan iPhone |
| Regresi antarmuka, privasi, PWA, Today, dan suara | 208 skenario terdaftar. 191 langsung lulus, 1 lulus setelah retry, 16 dilewati oleh ketentuan repo. Chromium dijalankan tanpa GPU untuk jalur ini |
| Regresi panggung 3D bersama | 116 skenario terdaftar. 95 langsung lulus, 3 lulus setelah retry, dan 2 lulus setelah dijalankan terpisah pada build serahan. 16 dilewati oleh ketentuan repo |
| Verifikasi kemasan dan media | Patch diaplikasikan di salinan bersih dari hash dasar, lalu semua berkas dibandingkan byte demi byte. Kedua video lolos pembacaan H.264 dan AAC, dengan frame Kemuning, dua candi dan air terjun diperiksa secara visual |

Playwright diuji pada profil desktop dan iPhone dengan data tiruan repo. Tes 3D memakai WebGL2 melalui SwiftShader. Pada lingkungan CPU, sebagian pemeriksaan memakai batas tunggu 15–20 detik untuk assertion, dengan kondisi lulus dan data uji yang sama. Total 342 skenario terdaftar. Dari 310 yang dijalankan, semuanya mempunyai hasil lulus setelah pengulangan. Sebanyak 32 dilewati menurut aturan profil di tes. Pada proses panggung gabungan, dua tes desktop masih gagal di akhir proses tersebut. Uji orbit gong dengan trackpad dan uji piksel kunang-kunang keduanya lulus ketika dijalankan kembali sendiri memakai assertion asli. Pemeriksaan CSP dan privasi bundel pada build serahan juga diulang, dengan 7 lulus dan 1 dilewati.

Tes Lawu mencakup gerak maju dan mundur pada 11 stop, gulir yang berhenti di antara kartu, bab tetangga, DEM yang diblokir, Static, Calm, reduced motion, WebGL2 yang hilang, pelepasan konteks setelah tiga kali berpindah ke Today, dan mematikan/menyalakan kembali suara air di kartu Grojogan. Unit test melakukan 24.006 pemeriksaan pose lintasan pada dua medan dan tiga konfigurasi layar/grid, serta membandingkan matahari dengan hasil perhitungan independen. Pemeriksaan offline menghasilkan ulang berkas DEM dan kedua tabel cakrawala dengan isi yang sama persis.

Ekspektasi tes lama untuk Hari 2 menyesuaikan satu panel per stop serta waktu subuh dari DEM. Tes suara tetap memeriksa semua klip Inggris yang diserahkan sebelumnya. `tip.mountain.0` otomatis masuk pemeriksaan klip sesudah durasinya didaftarkan di manifest.

Data pratinjau memakai nama Jize dan placeholder privat dari generator repo. Untuk merekam ulang, jalankan `pnpm build && pnpm preview` dalam satu terminal dan perintah berikut dalam terminal kedua. Playwright Chromium dan FFmpeg berada di komputer perekam. `PREVIEW_BROWSER` dapat menunjuk ke executable Chromium setempat.

```sh
node --import tsx scripts/preview/client-data.ts /tmp/lawu-client.json
node scripts/preview/record-film.cjs /tmp/lawu-client.json /tmp/Lereng-Lawu-Desktop.mp4 desktop 1 lawu
node scripts/preview/record-film.cjs /tmp/lawu-client.json /tmp/Lereng-Lawu-iPhone.mp4 hp916 1 lawu
node scripts/preview/measure-lawu.cjs /tmp/lawu-client.json /tmp/lawu-metrik.json 390x844 2
```

Kedua MP4 menampilkan pengguliran pada sebelas kartu aktual selama 16,50 detik, 396 frame pada 24 fps. Desktop 1440 × 900 dan profil iPhone 1080 × 1920. Video memakai tier Medium dan satu langkah waktu tetap per frame. Audio AAC mono 48 kHz dibuat dari modul WebAudio yang sama dengan jam perekaman. Angka 24 fps menunjukkan laju video. Pengukuran frame interaktif ada di tabel kinerja.

## Untuk host

Verifikasi fisik atas target iPhone High dan MacBook Air seri M masih terbuka. Jalankan alur dari subuh ke Sukuh pada perangkat host dan catat rata-rata fps serta frame p95, termasuk saat menggeser. Tinjau Cetho dan Sukuh di layar potret saat melakukan pemeriksaan. Identifier untuk klip pemandu Inggris yang tersisa adalah `tip.mountain.0`.


Pada Safari Web Inspector untuk iPhone atau Mac, buka film di Kemuning dengan `?stage=high&fps`. Fungsi berikut mengukur interval frame yang benar-benar dikirim renderer. Panggil sekali sambil diam, lalu sekali lagi sambil menggeser hingga candi. Fungsi mengembalikan statistik ketika sampel selesai.

```js
async function ukurLawu(jumlah = 180) {
  const interval = [];
  let sebelumnya, frame = -1;
  while (interval.length < jumlah) {
    const t = await new Promise(requestAnimationFrame);
    const stage = window.__lakonStage;
    if (!stage || stage.frames === frame) continue;
    frame = stage.frames;
    if (sebelumnya !== undefined) interval.push(t - sebelumnya);
    sebelumnya = t;
  }
  const urut = [...interval].sort((a, b) => a - b);
  return {
    fps: 1000 * interval.length / interval.reduce((a, b) => a + b, 0),
    medianMs: urut[Math.ceil(jumlah * 0.5) - 1],
    p95Ms: urut[Math.ceil(jumlah * 0.95) - 1],
    tier: window.__lakonStage.tier
  };
}
await ukurLawu();
```
