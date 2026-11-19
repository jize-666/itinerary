# Diorama Solo 3D

Modul untuk halaman privat `/diorama/` pada **A Three-Day Lakon**. Paket ini dibuat dan diuji pada `main` repositori `jize-666/itinerary`, commit `9065447f44ea2744f882a23f20548bb5347c548a`, mengikuti PRD v1.0 dan adendum v1.1.

## Memasang ZIP

Ekstrak dari direktori utama checkout itinerary. ZIP memakai jalur relatif repo. Instalasi memerlukan Node 22 dan pnpm 10.28.0 sesuai `package.json` situs.

```sh
unzip /lokasi/berkas/Diorama-Solo-Itinerary-v1.1.zip
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

Masuk melalui gerbang yang sudah ada, lalu buka `/diorama/` di tab yang sama. Build menghasilkan `out/diorama/index.html`. Uji Playwright dapat dijalankan pada build statis dengan CSP dari repo.

```sh
pnpm exec playwright install chromium --only-shell
pnpm test:e2e e2e/diorama.spec.ts --workers=1
```

Jika lingkungan pengujian menyediakan Chromium Headless Shell sendiri, variabel opsional `DIORAMA_CHROMIUM` menerima lokasi biner tersebut.

## Tautan masuk dan API

| URL | Perilaku |
| --- | --- |
| `/diorama/` | Membuka seluruh alas dari selatan, pada elevasi 28°. |
| `/diorama/?lokasi=pendhapa` | Memusatkan kamera pada Pendhapa Ageng, Pura Mangkunegaran. |
| `/diorama/?lokasi=pasar` | Memusatkan kamera pada Pasar Gede. |
| `/diorama/?lokasi=laweyan` | Memusatkan kamera pada halaman pembatik. |
| `/diorama/?tur=1` | Menjalankan tur 64 detik. Saat Calm aktif, membuka pilihan enam pose. |
| `/diorama/?q=high&fps` | Mengunci kualitas dan menampilkan p95, jumlah draw call dan segitiga. Tingkat lain yang valid ialah `medium` dan `low`. |

Parameter bisa digabung. Jika `tur=1` dipilih bersama `lokasi`, tur dimulai dari adegan pembuka. Tombol Kembali memakai entri riwayat satu origin yang dapat diketahui browser. Jika asal tidak tersedia atau berasal dari situs lain, tujuannya `/film/`.

```tsx
import { Diorama, type DioramaProps } from "@/components/diorama/Diorama";

const props: DioramaProps = {
  lang: "id",
  calm: false,
  focus: "pasar",
  quality: "medium",
  onLocation: (location) => console.log(location),
  onTour: (state) => console.log(state),
  onSlow: (p95ms) => console.log(p95ms),
};

<Diorama {...props} />
```

Rute membaca `useRequireSession()`, bahasa `useI18n()`, kunci `lakon.calm`, preferensi gerak OS dan parameter URL. Komponen 3D dimuat dengan `next/dynamic` dan `ssr: false` sesudah sesi tersedia. Komponen memiliki kanvas R3F sendiri.

`onLocation` menerima `pendhapa`, `pasar`, `laweyan` atau `null` saat kamera kembali bebas. `onTour` mengirim `idle`, `playing`, `paused` dan `done`. Properti `quality` menetapkan tingkat awal. Penurunan adaptif mengutamakan DPR dan peta bayangan. Parameter URL `q` mengunci tingkat untuk pengukuran. `onSlow` melaporkan p95 setelah beberapa jendela pengukuran berurutan melampaui ambang.

## Jelajah dan foto

- Satu jari atau seret kiri memutar kamera. Dua jari sejajar atau Shift + seret menggeser kamera dan target bersamaan. Cubit, roda, serta tombol + dan − menggerakkan kamera secara fisik sepanjang garis bidik. FOV vertikal selalu 38°.
- Saat kanvas fokus, tombol panah memutar kamera, Shift + panah menggeser, dan Home mengembalikan bingkai awal. Menu Sudut menyimpan delapan arah setiap 45° dan tampak atas dengan utara di atas layar. Menu itu juga memuat tampilan material, polos, kerangka, dan penanda lokasi.
- Setelah diam 1,5 detik, kursor atau kemiringan HP dapat menggeser azimut hingga 3° dan elevasi hingga 2°. Pada iOS, permintaan izin sensor berlangsung melalui sentuhan. Pilihan izin diingat pada sesi tab. Calm menonaktifkan parallax dan menyediakan enam pose dengan perpindahan pudar. Pengunjung tetap dapat mengendalikan kamera.
- Potret menahan komposisi aktif dan menghasilkan PNG dengan sisi panjang 1920 px. Semua sisi menghasilkan satu ZIP sembilan arah. Default pada layar sentuh utama ialah JPEG kualitas 0,92 dan pada desktop ialah PNG. Nama gambar mengikuti bahasa sesi foto. Tombol simpan, bagikan jika didukung, dan tautan ukuran penuh tersedia di pratinjau.
- Satu kanvas 2D sementara dipakai per foto. Sesudah enkode, ukuran kanvas dikosongkan sebelum pengambilan berikutnya. Seluruh foto dalam satu seri menggunakan rasio yang dikunci saat pratinjau dibuka. ZIP memakai metode STORE untuk JPEG/PNG yang sudah terkompresi. Worker membuat arsip, dan jalur cadangan tersedia jika browser menolak worker.
- Render foto hanya menggambar ruang 3D. Kontrol, penanda lokasi dan statistik merupakan lapisan DOM. Menutup foto mempertahankan pose dan membiarkan tur dalam keadaan jeda.

## Bentuk dan bahan

| Lokasi | Yang dapat diperiksa dari dekat |
| --- | --- |
| Pendhapa Ageng, Pura Mangkunegaran | Tiga tingkat atap joglo, serambi terbuka, empat saka guru, lantai tengah yang ditinggikan, ornamen portiko, susunan balok bawah atap. |
| Pasar Gede | Dua bangunan di kedua sisi jalan, gerbang dengan kedalaman, kisi bata tembus, kanopi kios, keranjang dan butir buah. |
| Kampung Batik Laweyan | Gang sempit, tembok tinggi, pintu halaman terbuka, gawangan, kain berlipat dan berkelim, serta canting di meja kerja. |

Tata letak dan halaman kerja Laweyan merupakan komposisi pameran. Motif kain indigo dirancang khusus untuk miniatur ini. Geometri, pola, serat bahan dan latar studio dibangun dari kode. Modul menggunakan instancing untuk bentuk berulang dan penggabungan geometri untuk rincian kecil.

Rujukan arsitektur yang dipakai ialah keputusan Wali Kota Surakarta bagian B.1 untuk pendhapa dan dokumentasi Dinas Pariwisata Jawa Tengah untuk pasar serta kampung batik. [Pendhapa Ageng](https://pariwisatasolo.surakarta.go.id/wp-content/uploads/2025/06/BANGUNAN-INTI-PURA-MANGKUNEGARAN-BERUPA-PENDHAPA-AGENG-PRINGGITAN-DAN-DALEM-AGENG-SEBAGAI-CB-TINGKAT-KOTA.pdf) · [Pasar Gedhe](https://visitjawatengah.jatengprov.go.id/id/belanja/pasar-gedhe) · [Kampung Batik Laweyan](https://visitjawatengah.jatengprov.go.id/id/belanja/kampung-batik-laweyan)

## Dependensi dan ukuran

Framework dan pustaka menggunakan versi terkunci milik host, yaitu Next.js 16.4.6, React dan React DOM 19.3.1, Three.js 0.187.0, serta React Three Fiber 9.8.2. Tipografi mewarisi Fraunces dan Manrope yang disajikan situs dari origin sendiri.

| Komponen | Lisensi | Ukuran gzip |
| --- | --- | ---: |
| Paket npm runtime baru yang perlu dipasang | Tidak ada | 0 B |
| fflate 0.8.3 bawaan Three.js, chunk kode ZIP beserta titik masuk worker pada build Next | MIT, Arjun Barrett | 10.418 B |
| Kode modul, rute dan worker bersama CSS, di luar runtime host | Kode proyek | 53.365 B |

Ukuran kode diukur dengan minifikasi dan gzip level 9. Pengukuran mengeluarkan React, Next, Three, R3F serta hook host. Angka total menjumlahkan semua keluaran, termasuk salinan CSS pada dua titik masuk, sebagai batas atas. Pada pengukuran modul terisolasi, worker yang sudah melalui tree-shaking berukuran 4.589 B gzip dan ikut dalam total modul. Pada build produksi Next, seluruh skrip worker termasuk bootstrap Turbopack berjumlah 15.118 B gzip. Impor ZIP berasal dari `three/addons/libs/fflate.module.js`, sehingga manifest dan lockfile host dapat langsung dipakai. [Lisensi fflate](https://github.com/101arrowz/fflate/blob/master/LICENSE)

## Hasil pemeriksaan

Pengujian pada 19 November 2026 memakai Node 22.21.1, pnpm 10.28.0, Playwright 1.63.0 dan Chromium Headless Shell 138.0.7204.0 dengan SwiftShader.

| Pemeriksaan | Hasil |
| --- | --- |
| `pnpm lint` dan `pnpm typecheck` | Lulus pada checkout itinerary. |
| `pnpm test` | 493 tes dalam 33 berkas lulus, mencakup 28 tes unit diorama. |
| `pnpm build` | Ekspor statis menghasilkan halaman diorama beserta rute host. |
| Playwright diorama | 18 skenario lulus, sembilan pada profil desktop dan sembilan pada profil sentuh. Skenario mencakup sesi, tautan Pasar Gede, kualitas framebuffer, keyboard, rotasi layar, tur, Calm, parallax, potret dan ZIP dua bahasa. |
| Sembilan sudut | Tiga seri berisi 27 gambar diperiksa pada mode material, polos dan kerangka, dengan penanda tersembunyi. Setiap seri memiliki sembilan gambar berbeda berukuran 1920 × 1080. |
| Foto dari pose manual | Viewport 360 × 640 menghasilkan PNG 1080 × 1920. Viewport 640 × 360 menghasilkan PNG 1920 × 1080. Setelah potret ditutup, azimut kembali tepat 188° di kedua orientasi. |
| Kecocokan bingkai | Korelasi RGB antara tampilan kanvas dan PNG yang diperkecil adalah 0,9957 pada potret dan 0,9969 pada lanskap. Foto bebas dari kontrol dan hamparan p95. |
| Lintasan kamera | Seluruh 64 detik disampel pada 30 Hz untuk rasio 9:16, 16:9 dan 4:3. Sebanyak 1.920 langkah per rasio diperiksa terhadap ketiga landmark dan lanskap. Semua lintasan bebas tumbukan. |
| Render saat diam dan pergantian rute | Dalam jendela diam 1,8 detik, jumlah draw call tambahan adalah 0 pada kedua orientasi uji. Navigasi ke film melepaskan konteks WebGL lama. Saat kembali, diorama memperoleh konteks baru. |
| CSP | Alur ekspor pada dua profil selesai dengan header produksi dan menghasilkan arsip. Skenario Playwright merekam 0 pelanggaran CSP. |

### Muat awal dan kinerja tur

Tabel ini berasal dari browser headless yang merender melalui CPU SwiftShader. Ukuran viewport, DPR, dan input sentuh membedakan profil. Untuk muat awal, server uji menyajikan aset hasil ekspor dengan gzip dan header produksi. Setiap repetisi memakai konteks serta cache browser baru, service worker dinonaktifkan, unduhan 10 Mbps dan latensi 100 ms. Waktu siap dihitung sampai pengiriman render pertama dan aktivasi kontrol. Kolom unduhan mencakup runtime situs, modul, CSS dan fon yang selesai diterima saat itu.

| Profil uji | Tiga muat awal (dtk) | Median (dtk) | Unduhan awal | p95 gabungan, 3 tur | Maks. draw call | Maks. segitiga | Buffer akhir, tier Low |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Desktop, 1920 × 1080 | 1,80 / 1,27 / 1,31 | 1,31 | 743.185 B | 866,5 ms | 33 | 186.775 | 1152 × 648 |
| Viewport iPhone 13, 390 × 844 | 2,02 / 1,39 / 1,26 | 1,39 | 743.185 B | 402,5 ms | 33 | 186.775 | 350 × 759 |
| Viewport Pixel 6a, 412 × 915 | 1,55 / 1,22 / 1,32 | 1,32 | 743.185 B | 457,8 ms | 33 | 186.775 | 370 × 823 |

Setiap profil menjalankan tiga tur penuh 64 detik secara berurutan dalam layar penuh. p95 memakai interval frame yang bergerak dan menggabungkan ketiga tur. Penghitung geometri mengambil nilai tertinggi selama tiga putaran, termasuk frame yang membuat ulang peta bayangan ketika kualitas berubah. Batas 150 draw call dan 200.000 segitiga terpenuhi pada ketiga profil ini. Angka waktu frame SwiftShader berada di atas ambang kinerja perangkat acuan.

Tier High membatasi DPR di 1,5. Medium menggunakan 82% dan Low menggunakan 60% dari DPR High. Pada layar desktop DPR 1, buffer Low memiliki 36% dari jumlah piksel High. Ekspor foto tetap memakai sisi panjang 1920 px.

### Pengujian fisik dan pengenalan lokasi

Perangkat fisik dan panel pengunjung belum tersedia pada sesi pengujian ini. Empat target waktu frame berikut masih memerlukan pengukuran pada perangkat yang disebutkan.

| Perangkat fisik acuan | Target p95 |
| --- | ---: |
| iPhone 13, Safari | ≤ 33,4 ms |
| Pixel 6a, Chrome | ≤ 33,4 ms |
| Laptop grafis terintegrasi, 1920 × 1080 | ≤ 20 ms |
| iPhone generasi terbaru, kualitas High | ≤ 16,7 ms |

Lembar berbagi berkas dan dialog izin kemiringan iOS juga memerlukan pemeriksaan pada iPhone. Uji pengenalan lokasi 4/5 menunggu peserta.

Untuk mengulangi pengukuran, buka `/diorama/?fps`, pilih Layar penuh, lalu jalankan tur sampai selesai tiga kali dalam tab yang sama. Hamparan menampilkan p95 berjalan serta p95 gabungan hingga tiga tur penuh terakhir. Data pada elemen `.dio-meter` juga menyimpan puncak draw call dan segitiga untuk tur terakhir. Ulangi muat awal tiga kali dengan cache kosong, 10 Mbps, latensi 100 ms dan catat median sampai bingkai pertama siap dikendalikan.

Untuk uji pengenalan, sembunyikan penanda melalui Sudut dan minta setiap peserta mencocokkan tiga lokasi lalu menyimpan satu foto tanpa arahan. Target PRD ialah sedikitnya empat keberhasilan dari lima peserta yang mengenal Solo.

## Berkas integrasi

| Jalur | Isi |
| --- | --- |
| `src/app/diorama/page.tsx` | Gerbang sesi, bahasa, Calm, parameter dan pemuatan khusus klien. |
| `src/components/diorama/` | Titik masuk React, kanvas, model, material, input, antarmuka dan ekspor foto. |
| `src/engine/diorama/` | Pose, framing, tur, batas gerak, ambang kualitas, ukuran foto dan teks EN/ID. |
| `tests/unit/diorama-*.test.ts` | Geometri kamera, lintasan, batas, teks dan opsi. |
| `e2e/diorama.spec.ts` | Skenario browser pada desktop dan emulasi ponsel. |

Titik sambung untuk Claude ialah tautan dari film dan Today, pemantau FPS film, serta callback untuk Clawd. Pratinjau dengan data trip April dan keputusan merge mengikuti alur host dalam adendum.
