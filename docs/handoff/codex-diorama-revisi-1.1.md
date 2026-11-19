# Revisi susulan PRD "Diorama Solo 3D" (v1.1) untuk Codex

19 November 2026 · melengkapi PRD v1.0 (19 Nov 2026, 13 halaman) · disusun Claude atas permintaan host ("berikan file revisi susulan untuk codex")

PRD v1.0 tetap berlaku. Berkas ini hanya menambah dan mengubah yang diperlukan supaya hasil Codex bisa dipasang langsung di repo situs trip (`jize-666/itinerary`, film "A Three-Day Lakon"). Bila ada yang bertentangan, berkas ini yang dipakai.

## Prompt siap tempel (English)

> You already built the "Diorama Solo 3D" from PRD v1.0. Revise it so it can be dropped into the existing Next.js site in the `itinerary` repo. Follow the Indonesian addendum below (v1.1) exactly; where it conflicts with v1.0, v1.1 wins. Hard constraints: Next.js 16 App Router with `output: "export"` (static, no server), React 19.3, three 0.187.0, @react-three/fiber 9.8.2, TypeScript strict, pnpm. The site CSP forbids WebAssembly, `eval`/`new Function`, and any external origin (no CDNs, fonts, analytics, or remote assets). Deliver the diorama as one self-contained module plus a client-only route `/diorama/`, bilingual UI (English/Indonesian), the camera-motion rule in §4, the photo-mode changes in §6, the integration hooks in §8, and the tests in §10. List every new dependency with its license and gzip size. Do not modify files outside the paths listed in §2 and §11.

---

## 1. Lingkungan tujuan (fakta repo `itinerary`)

| Hal | Nilai |
| --- | --- |
| Framework | Next.js 16.4.6, App Router, `output: "export"` (HTML statis; dilayani Vercel dan `scripts/serve-out.mjs`) |
| Pustaka | React 19.3.1, three 0.187.0, @react-three/fiber 9.8.2, zod 4.6.7. **Tidak ada** @react-three/drei. |
| Bahasa & alat | TypeScript strict, pnpm, ESLint, Vitest, Playwright 1.63 |
| CSP | `script-src 'self' 'unsafe-inline'`; `connect-src 'self'` (+ Supabase situs); `img-src 'self' data: blob:`; `worker-src 'self' blob:`. Tanpa `wasm-unsafe-eval`. |
| Akibat CSP | Tidak boleh WASM (dekoder Draco/meshopt WASM, Rapier, transcoder Basis), `eval`, atau aset/fon/skrip dari luar. Semua geometri dan tekstur dibuat di kode (sesuai PRD hlm. 10). |
| Bahasa situs | Inggris dan Indonesia. Hook: `useI18n()` di `src/engine/i18n/useI18n.ts` (`lang`, `tx({ en, id })`). |
| Gerbang privat | Halaman situs hanya terbuka sesudah kode akses: `useRequireSession()` di `src/components/useRequireSession.ts`. |
| Mode tenang | Film punya sakelar Calm (kunci `localStorage` `lakon.calm`) dan menghormati `prefers-reduced-motion`. |
| 3D yang sudah ada | Film memakai kanvas R3F sendiri di `/film/` (`src/components/film/stage3d/`). Diorama **tidak** dipasang di kanvas film. |

Bila kode Codex memakai versi lain atau drei, sesuaikan ke tabel di atas. Bila drei benar-benar dibutuhkan, impor per modul saja dan sebutkan alasan serta ukurannya.

## 2. Bentuk penyerahan

Struktur yang diminta (awalan `dio` supaya tidak tertukar dengan modul film, misalnya `stage3d/pendapa.ts`):

```
src/app/diorama/page.tsx            rute: hanya klien (dynamic import, ssr: false), memakai useRequireSession()
src/components/diorama/             komponen React/R3F: Diorama.tsx (akar), kanvas, UI, mode foto
src/engine/diorama/                 logika murni tanpa DOM/three bila bisa: pose kamera, framing, lintasan tur, batas gerak, teks
src/components/diorama/diorama.css  gaya dengan awalan kelas .dio-* (tanpa gaya global)
tests/unit/diorama-*.test.ts        tes Vitest
e2e/diorama.spec.ts                 tes Playwright
```

- Satu titik masuk: `export function Diorama(props: DioramaProps)` (lihat §8).
- Tidak mengubah berkas lain di repo kecuali yang disebut di §11.
- Serahkan sebagai branch/PR terhadap `main` repo itinerary, atau zip dengan struktur di atas, plus `README-diorama.md` berisi cara pasang, dependensi baru (lisensi dan ukuran gzip), dan hasil uji.

## 3. Letak di situs dan alur masuk

- Diorama menjadi **halaman sendiri `/diorama/`**, privat seperti `/film/` dan `/today/`. Tidak disisipkan ke film: kontrol jelajah diorama (seret, cubit, roda) bentrok dengan gestur film yang memakai gulir/geser untuk pindah slide.
- Parameter URL:
  - `?lokasi=pendhapa|pasar|laweyan`: dibuka langsung terfokus ke lokasi itu (dipakai tautan dari kartu Hari 1 dan Hari 3);
  - `?tur=1`: tur langsung diputar;
  - `?q=high|medium|low`: memaksa tingkat kualitas (untuk uji dan pratinjau);
  - `?fps`: hamparan pengukur waktu frame (persentil ke-95 berjalan).
- Tombol **Kembali** di pojok kiri atas: ke halaman asal (`history.back()` bila asalnya situs ini, selain itu ke `/film/`).
- Tautan masuk dari film (slide rute, kartu tempat singgah Pasar Gede, Laweyan, dan Mangkunegaran) dan dari Today dipasang Claude, bukan Codex.

## 4. Gerak kamera: aturan host untuk semua objek 3D

Host mewajibkan di setiap objek 3D situs: **kamera parallax** (kursor di desktop, kemiringan HP di HP), **perspective shift** (perspektif sungguh berubah, bukan geser gambar 2D), dan **kedalaman yang mengikuti gulir**. Untuk diorama, ini diterapkan tanpa mengubah kontrol PRD:

- **Parallax saat diam:** bila tidak ada input selama 1,5 dtk dan tur tidak berjalan, kamera bergeser ringan mengikuti kursor (desktop) atau kemiringan HP (`DeviceOrientationEvent`; di iOS izin diminta sekali dari sentuhan pertama). Simpangan maksimal ±3° azimut dan ±2° elevasi di sekitar pose aktif, dengan pegas lembut (±0,4 dtk). Kamera sungguh berpindah, jadi tiang depan bergeser lebih jauh daripada kios di belakang.
- Parallax langsung berhenti saat seret, cubit, roda, tur, atau mode foto, lalu melebur kembali dari pose terbaru.
- **Kedalaman ikut gulir:** roda tetikus/trackpad = dolly sepanjang garis bidik, sesuai PRD hlm. 6. Ini memenuhi aturan.
- **Calm atau `prefers-reduced-motion`:** parallax mati, tur diganti enam pose pilihan (PRD hlm. 8), dan perpindahan pose memakai pudar singkat, bukan terbang.

## 5. Kinerja

- Target PRD hlm. 11 tetap wajib: iPhone 13 / Pixel 6a p95 ≤ 33,4 ms; desktop grafis terintegrasi 1920 × 1080 p95 ≤ 20 ms; ≤ 150 draw call; ≤ 200.000 segitiga terlihat; DPR awal 1,5; siap ≤ 5 dtk di 10 Mbps.
- Sasaran tambahan: p95 ≤ 16,7 ms di iPhone generasi terbaru (tier High). Film situs berjalan ±60 fps di iPhone host, jadi diorama sebaiknya tidak terasa lebih berat.
- Unduhan: kode diorama sendiri ≤ 350 KB gzip, di luar three dan R3F yang sudah dibagi dengan film. Tanpa berkas gambar; tekstur kain, serat kayu, dan kuningan dibuat prosedural saat jalan.
- `frameloop="demand"`: tidak merender saat diam; hanya invalidate saat input, tur, parallax, atau animasi berjalan.
- Penurunan kualitas mengikuti PRD (resolusi dan peta bayangan dulu). Sediakan prop `quality` dan callback `onSlow` (§8), supaya Claude bisa menyambungkannya ke pemantau FPS film.
- Bersihkan semua geometri, material, tekstur, dan render target saat komponen dilepas: tamu bisa bolak-balik `/film/` ⇄ `/diorama/`, dan konteks WebGL tidak boleh bocor.

## 6. Mode foto (perubahan dari PRD hlm. 9)

- **Potret** (bingkai aktif): tetap PNG, sisi panjang 1920 px.
- **Potret semua sisi:** sembilan sudut dirender **satu per satu**. Kanvas sementara dilepas sesudah tiap gambar dikodekan, supaya memori Safari iPhone tidak meledak. Sembilan PNG 1920 px bisa mencapai 30–50 MB.
  - Format: pilihan PNG atau JPEG (kualitas 0,92). Bawaan JPEG di HP, PNG di desktop.
  - ZIP dibuat dengan `fflate` (MIT, ±8 KB gzip), sebaiknya di Web Worker (`worker-src blob:` diizinkan). Tanpa pustaka WASM.
  - Nama berkas: `diorama-solo-utara.jpg`, `…-timur-laut`, `…-timur`, `…-tenggara`, `…-selatan`, `…-barat-daya`, `…-barat`, `…-barat-laut`, `…-atas`. Dalam bahasa Inggris saat situs berbahasa Inggris: `north`, `north-east`, `east`, `south-east`, `south`, `south-west`, `west`, `north-west`, `top`.
  - Bagikan lewat Web Share (berkas) bila didukung; selain itu unduh. Bila gagal: Coba lagi, dan pratinjau tiap foto untuk disimpan satu per satu (sesuai PRD).
- Hasil foto tidak memuat antarmuka, penanda lokasi, atau hamparan `?fps` (sesuai PRD).

## 7. Bahasa dan penamaan

- Semua teks antarmuka dua bahasa, dibaca dari `useI18n()`. Simpan teks di `src/engine/diorama/strings.ts` dalam bentuk `{ en, id }`. Contoh: Putar tur / Play tour, Jeda / Pause, Lanjutkan / Resume, Potret / Photo, Potret semua sisi / Photo all sides, Tampilan awal / Home view, Sebelumnya / Previous, Berikutnya / Next, Sudut / Angle, Atas / Top.
- Nama lokasi:
  - "Pendhapa Ageng, Pura Mangkunegaran" (EN dan ID sama);
  - "Pasar Gede" (sama);
  - "Kampung Batik Laweyan" (ID) / "Laweyan Batik Quarter" (EN).
- Di film, kata "pendapa" dipakai untuk panggung wayang. Modul diorama memakai `pendhapa`/`dio` supaya tidak tertukar.
- Kain di halaman Laweyan tetap rancangan orisinal (PRD hlm. 4). Bila memakai nama motif tradisional, sertakan sumbernya di README.

## 8. Antarmuka untuk dipasang (DioramaProps)

```ts
export type DioramaProps = {
  /** Bahasa aktif; teks antarmuka mengikuti. */
  lang: "en" | "id";
  /** Mode tenang situs (Calm) atau prefers-reduced-motion: tanpa parallax, tur diganti enam pose. */
  calm: boolean;
  /** Lokasi awal yang difokuskan; bawaan: tampilan awal dari selatan. */
  focus?: "pendhapa" | "pasar" | "laweyan";
  /** Tingkat kualitas awal; bawaan: ditebak dari perangkat. */
  quality?: "high" | "medium" | "low";
  /** Dipanggil bila waktu frame melewati target terus-menerus (pemasang bisa menurunkan kualitas). */
  onSlow?: (p95ms: number) => void;
  /** Lokasi yang sedang difokuskan berganti (dipakai nanti untuk maskot pemandu situs, Clawd). */
  onLocation?: (id: "pendhapa" | "pasar" | "laweyan" | null) => void;
  /** Keadaan tur berganti. */
  onTour?: (state: "idle" | "playing" | "paused" | "done") => void;
};
```

`src/app/diorama/page.tsx` membaca sesi, bahasa, Calm, dan parameter URL, lalu meneruskannya ke `<Diorama />`.

## 9. Aksesibilitas

Tetap seperti PRD hlm. 8 (Tab/Enter, panah memutar, Shift+panah menggeser, target sentuh ≥ 44 × 44 px). Tambahan:

- Hormati Calm situs, bukan hanya media query (§4).
- `aria-live` singkat saat lokasi berganti ("Pasar Gede").
- Kanvas punya label yang menjelaskan isi maket dalam dua bahasa.

## 10. Tes yang diserahkan

Harus lulus `pnpm lint`, `pnpm typecheck`, dan `pnpm test` di repo itinerary.

- **Unit (Vitest), logika murni di `src/engine/diorama/`:**
  - jarak framing dari rasio kanvas dan ukuran alas dengan margin ≥ 8% per sisi (9:16, 16:9, 4:3);
  - delapan pose 45° + Atas;
  - interpolasi tur 180° → 540° tanpa lompatan;
  - pembagian waktu enam adegan = 64 dtk;
  - titik bidik selalu di dalam alas;
  - kamera berhenti sebelum menyentuh atap, dinding, kain, atau lantai;
  - urutan Sebelumnya/Berikutnya: Pendhapa → Pasar → Laweyan;
  - teks dua bahasa lengkap.
- **E2E (Playwright), Chromium tanpa GPU (SwiftShader):**
  - `/diorama/` terbuka sesudah sesi;
  - Putar tur → Jeda → Lanjutkan;
  - Tampilan awal memulihkan pose awal;
  - Potret menghasilkan satu unduhan;
  - Potret semua sisi menghasilkan ZIP berisi 9 berkas dengan nama yang benar;
  - navigasi keyboard;
  - Calm menampilkan enam pose tanpa parallax;
  - `?lokasi=pasar` terfokus ke pasar.
  - Jangan bergantung pada fps; pakai `?q=low`.
- **Bukti kinerja:** angka p95 per perangkat acuan (cara ukur PRD hlm. 11), jumlah draw call dan segitiga saat tur, ukuran unduhan.

## 11. Yang dipasang Claude sesudah penyerahan (bukan tugas Codex)

- Tautan masuk dari film dan Today; teks tombolnya di `src/engine/i18n/strings.ts`.
- Penyambungan `quality`/`onSlow` ke pemantau FPS situs, dan Clawd bila host menginginkannya.
- Atribusi di credits film bila ada sumber yang wajib disebut.
- Pratinjau untuk host: foto sembilan sudut dan video tur 64 dtk, desktop dan HP, dengan data trip April.
- PR siap Squash and merge; host yang menekan merge.

## 12. Ringkasan perubahan terhadap PRD v1.0

| Bagian PRD v1.0 | Perubahan di v1.1 |
| --- | --- |
| Bentuk produk (hlm. 2) | Halaman `/diorama/` di situs trip, privat, dua bahasa; masuk dari film dan Today. |
| Gerak kamera (hlm. 6) | Ditambah parallax ringan saat diam (aturan host); mati di Calm. |
| Kontrol jelajah (hlm. 8) | Calm situs memakai enam pose seperti gerak minim. |
| Mode foto (hlm. 9) | Render satu per satu; pilihan JPEG; ZIP dengan fflate di worker; nama berkas dua bahasa. |
| Membangun dari nol (hlm. 10) | Tanpa WASM dan tanpa aset luar (CSP situs); versi pustaka mengikuti repo. |
| Kinerja (hlm. 11) | Sasaran tambahan ≤ 16,7 ms di iPhone terbaru; `frameloop="demand"`; anggaran kode ≤ 350 KB gzip; bersih saat dilepas. |
| Serah terima (hlm. 13) | Struktur berkas, antarmuka `DioramaProps`, dan tes di repo itinerary. |
