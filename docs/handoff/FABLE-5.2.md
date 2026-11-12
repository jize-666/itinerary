# Serah-terima: Lakon Tiga Hari → Fable 5.2

> Ditulis oleh sesi sebelumnya (Opus 5.5) pada 10 Nov 2026, atas permintaan host.
> Kamu (Fable 5.2) melanjutkan, **meningkatkan**, dan bila perlu **membangun ulang** web ini.
> **Catatan 11 Nov 2026:** status di dokumen ini adalah keadaan 10 Nov. Sejak itu film 2D (F1), gallery 2,5D, home 2,5D dengan desain baru, dan sesi per tab sudah dikerjakan. Status terbaru ada di `HANDOFF.md`; aturan di §1 dan standar di §6 tetap berlaku.
> Baca dokumen ini sampai habis sebelum menyentuh kode. Lalu baca `docs/PRD.md` (v1.6), `docs/design/decisions.md`,
> `docs/design/motion-tokens.md`, `docs/backend.md`, `tasks/todo.md`.

---

## 0. Ringkasan dalam satu menit

- **Apa ini:** web itinerary sinematik dan privat untuk **satu tamu** (asal Belitung) yang berkunjung ke **Solo, 7–11 April 2027** (Hari 0 kedatangan, Hari 1–3 bab, Hari 4 pulang). Tamu masuk dengan kode booking 9 karakter.
- **Bentuk akhir:** (1) gerbang + sambutan, (2) **film** bergulir slide-demi-slide dengan adegan 3D (gong, gunungan, diorama Solo, lereng Lawu, canting), (3) **Today** yang ringan, offline, untuk dipakai di jalan, (4) boarding pass 3D + end credits.
- **Sudah jadi dan dipakai:** gerbang, sambutan, tiket DOM, Today lengkap (offline/PWA), backend Supabase, audio gamelan, sistem tombol 3D + bunyi klik.
- **Belum dibangun sama sekali:** **film** (2D maupun 3D). Halaman `/film/` masih placeholder. Ini pekerjaan terbesar dan terberat, dan sengaja diserahkan kepadamu.
- **Produksi:** https://kulonuwun-solo.vercel.app (Vercel, dibangun dari `main`).
- **Serah terima ke host:** Senin **28 Des 2026**. Buffer revisi sampai 31 Jan 2027.

---

## 1. Aturan yang tidak boleh dilanggar

1. **Privasi tamu.** Nama asli tamu, panggilan, nomor WhatsApp, alamat penginapan, jam jemput, catatan tim, dan catatan medis **hanya** ada di tabel Supabase `trip_private`. Jangan pernah menulisnya di repo, PRD, commit, tes, fixture, bundle, atau nama file. Tes dan contoh memakai **"Mira Santoso" / "Mira"**. Pratinjau yang memuat nama asli hanya boleh ada di scratchpad dan dikirim ke host; yang di-commit memakai "Your Name".
2. **Jangan sebut Singapura** di web dan konten (permintaan host). Asal tamu yang ditampilkan: **Belitung**. Rute tiket TJQ → CGK → SOC.
3. **Tanpa translator.** Rekan tamu batal ikut; host sendiri yang menerjemahkan. Kontak di data: host (utama) dan guide (opsional).
4. **Secret & kode.** Kode akses dan secret tidak pernah di-commit. Hash kode + `TOKEN_SECRET` ada di **Supabase Vault** (dibaca Edge Function lewat RPC `access_config()`). Kode dev diminta langsung ke host. Kode booking asli (9 karakter) belum dibuat.
5. **Lisensi aset.** Foto hanya CC0 / Unsplash / Pexels / CC BY / CC BY-SA (cadangan CC BY-NC); **varian ND dilarang**. Dilarang mengambil dari Google Images / Instagram / Pinterest / ulasan Maps. **Tanpa foto AI untuk tempat nyata.** Font OFL. ElevenLabs **paket gratis saja**, tanpa tagihan. Gendhing adalah rekaman milik host (izin aman). Bunyi klik `ui-pop`/`ui-click` dari paket yang dibawa host (izin kreator lewat DM, bukti disimpan host).
6. **Jangan sentuh project lain milik host** di konektor (Supabase `dashboard-kebun`, project Framer lain).
7. **Git.** Kerja di branch yang ditetapkan sesi. **Jangan membuat PR kecuali diminta.** Host melakukan squash-merge. Force-push diblokir; setelah PR di-merge, buat ulang branch dari `origin/main`. Jangan menulis identitas model di commit, PR, atau artefak. Ikuti baris atribusi commit yang diberikan sistem.
8. **Performa.** Animasi DOM: **hanya `opacity` dan `transform`**. Efek mahal (blur, bayangan, gradien) digambar sekali di lapisan sendiri, lalu lapisannya yang digerakkan. **Today tidak boleh memuat WebGL.**
9. **Bahasa.** UI dua bahasa EN (tamu) / ID (tim), toggle tanpa reload. Semua teks UI ada di `src/engine/i18n/strings.ts` (label global di `chrome.ts`). Isi itinerary datang dari data, bukan bundle.

---

## 2. Peta proyek

| Bagian | Lokasi | Catatan |
|---|---|---|
| Stack | Next.js 16 (static export, `trailingSlash`), React 19, TS strict, Zod 4, Vitest, Playwright | pnpm, Node 22 |
| Halaman | `src/app/{page,film,today,not-found}` | `/` gerbang + sambutan, `/film/` placeholder, `/today/` |
| Gerbang & sambutan | `src/components/Gate.tsx`, `CodeInput.tsx`, `BeginChoice.tsx`, `Ticket.tsx` | satu tombol "Begin the lakon", speaker untuk mute |
| Today | `src/components/today/*` (Today, NowNext, DayPlan, HelpBar, BeforeYouGo, hooks) | logika: `src/engine/today/schedule.ts`, format: `format.ts` |
| Gerak | `src/engine/motion/tokens.ts`, `src/components/motion/{Kinetic,Curtain,PressFx,useReveal}` | reveal Bayang/Canting/Gamelan/Benang/Gunungan |
| Tombol | kelas `.pb` (+ `pb--gold/glass/tonal/sos`, `--xs/sm/lg/xl`, `--kawung`), `Seg.tsx`, `Icons.tsx` | ditekan → `data-pressed` (PressFx) |
| Audio | `src/engine/audio/*` (AudioEngine, status, catalog, bed, loop, preference) | mesin hanya dimuat halaman yang memulai suara; layout membaca `status.ts` |
| Data & sesi | `src/lib/{session,trip,pwa,code,config}.ts` | snapshot trip per token di `localStorage["lakon.trip"]` |
| PWA | `public/sw.js` (tulis tangan), `public/manifest.webmanifest`, `public/icons/*` | versi build lewat `/sw.js?v=` |
| Gaya | `src/app/globals.css` (**±3.200 baris, satu file**) | lihat §4: perlu dipecah |
| Konten | `content/schema.ts`, `content/trips/solo/trip.ts` | `pnpm content:check`, `pnpm content:publish` (menulis `.publish/trip_content.sql`) |
| Backend | `supabase/functions/{verify-access,trip-data,health}`, `_shared/*`, `supabase/migrations/*` | project `qanjzavzbisvpmeihqee` (ap-southeast-1) |
| Prototipe 3D | `prototypes/{gong,gunungan,keris,boarding-pass}/scene.js` | Three.js vanilla untuk Three.js Viewer; **bukan kode produksi** |
| Pratinjau | `docs/design/previews/*`, `scripts/preview/record-flow.cjs` | perekam gerak lambat |
| Tes | `tests/unit/*` (92), `e2e/*` (75: desktop + iPhone 14 Pro) | `e2e/helpers.ts` punya fixture tiruan |

Perintah: `pnpm i` · `pnpm dev` · `pnpm build` · `pnpm preview` (out/ dengan header & CSP produksi, port 4173) · `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm test:e2e -- --trace off` · `pnpm content:check`.

Alat bantu:
- **Pratinjau momen Today:** `/today/?at=2027-04-08T10:45` (jam WIB).
- **Perekam gerak lambat:** `scripts/preview/record-flow.cjs`. Rekaman di server tanpa GPU tampak patah kalau direkam biasa, jadi selalu pakai teknik gerak lambat.
- **Ukur kehalusan tanpa perekam:** Long Animation Frames API + jeda rAF. Target **0 frame > 50 ms** di momen kunci.

---

## 3. Status per fase (`tasks/todo.md`)

| Fase | Status |
|---|---|
| 0 Desain & prototipe | Gong, gunungan, keris, boarding pass (prototipe) ✓, motion Framer ✓. **Belum:** Tugas 4 styleframe per bab, Tugas 5 konten final, **Tugas 6 foto berlisensi (0 foto)** |
| 1 Fondasi & akses | ✓ (checkpoint menunggu uji HP nyata oleh host) |
| 2 Today | ✓ (menunggu uji nyata iPhone/Android + mode pesawat) |
| 3 Film 2D | **belum dimulai** |
| 4 Pipeline aset (foto, depth map) | **belum dimulai** |
| 5 Film 3D | **belum dimulai** (hanya prototipe lepas) |
| 6 Finale & polish | boarding pass masih prototipe; credits, OG, audio per adegan belum |
| 7 QA & serah terima | belum |

---

## 4. Penilaian jujur atas pekerjaan Opus 5.5

Skala: ✅ layak dipertahankan · 🟡 perlu revisi/peningkatan · 🔴 perlu dibangun ulang / belum ada.

### Fondasi
- ✅ **Backend & keamanan:** RLS tanpa policy, Edge Function memfilter per peran, Vault, ETag 304, rate limit, keep-alive. Jangan dibangun ulang.
- ✅ **Sesi & data:** token per perangkat, snapshot offline per token, salinan dihapus saat ganti kode. Teruji.
- ✅ **Logika Today:** zona Asia/Jakarta murni dari instan absolut; 19 skenario tes. Pertahankan.
- 🟡 **Anggaran JS:** Today 150 KB gz / 129 KB br, sementara target PRD 120 KB gz. Kerangka React + Next sendiri ≈ 119 KB gz, jadi target itu tidak realistis untuk stack ini. Kode aplikasi Today ±20 KB br. Gerbang belum diukur terpisah terhadap target 80 KB.
- 🟡 **Tes:** unit + e2e kuat, tapi **tanpa uji visual (screenshot regression)** dan **tanpa uji perangkat nyata**.

### Gaya & arsitektur UI
- 🔴 **`globals.css` satu file ±3.200 baris**, ditambah dari banyak putaran revisi. Ada token warna, tapi tanpa skala spasi/tipografi yang tegas, dan ada aturan yang saling menimpa. Usulan: pecah per area (`@layer` + file per komponen atau CSS Modules), buat skala token (spasi 4/8, tipe, radius, elevasi), lalu hapus sisa aturan yang tidak dipakai. Perilaku dan tampilan harus tetap; jadikan tangkapan layar sebelum/sesudah sebagai jaring pengaman.
- 🟡 **Tipografi & layout:** Fraunces (display italic) + Manrope sudah pas temanya, tapi hierarki ukuran belum sistematis. Belum ada styleframe per bab (Tugas 4).
- 🟡 **Sistem tombol 3D (`.pb`):** konsisten dan disukai host. Masih perlu dirasakan di HP nyata (kedalaman 3–6 px, kecepatan pantul, getar). Tombol gerbang memakai `position: sticky`; cek di iOS dengan toolbar Safari yang muncul-hilang.

### Gerbang & sambutan
- 🟡 **Gerbang "Kulonuwun?":** reveal Bayang + benang emas + kotak kode yang dipahat. Indah di desktop. **Intro ±2–4 dtk terlalu lama untuk kunjungan ulang**; buat versi singkat bila sesi sudah ada.
- 🟡 **Sambutan:** satu tombol mulai + speaker sudah bersih. Tiket **DOM** sebaiknya diganti **boarding pass 3D** di perangkat yang mampu, dengan fallback DOM yang sekarang.
- 🟡 **Transisi ke film:** stempel "Admitted" → tirai letterbox. Rencana PRD: **gunungan 3D membuka** sebagai gate sinematik (belum ada).

### Today
- ✅ Fungsi lengkap: Now/Next, jam jemput tanpa ketukan, Rain plan, SOS, dock WhatsApp, offline, PWA, a11y 100.
- 🟡 **Visual padat dan panjang:** timeline 9–11 stop per hari tanpa foto. Bisa dibuat lebih "kartu" dengan foto kecil (setelah Tugas 6), meringkas stop yang sudah lewat, dan peta mini statis. Cuaca belum ada (P2).
- 🟡 Data kontak, alamat penginapan, dan jam jemput **masih kosong di produksi**; host belum memberi.

### Gerak & animasi
- 🟡 Reveal teks (Bayang/Canting/Gamelan/Benang/Gunungan) orisinal dan sudah dioptimalkan, tapi hanya diukur di headless tanpa GPU. Perlu disetel di iPhone/Android nyata (durasi, stagger, kurva).
- 🔴 **Belum ada bahasa gerak untuk film:** perpindahan slide, shared element (View Transitions), scrub, horizontal gallery, Calm mode.

### Audio
- ✅ Mesin audio (Kebo Giro → keraton tanpa jeda, ducking, suspend saat tab tersembunyi, mute diingat). Bunyi klik pop/click/tok.
- 🟡 Audio per adegan film belum ada (Tugas 36). Bonang "ting" dari ElevenLabs gagal dibuat karena antrean gratis penuh.

### 3D (prototipe)
- 🟡/🔴 **Gong v3, Gunungan v3 "Murka", Keris Naga Sasra, Boarding pass** dibuat sebagai skrip Three.js vanilla (±2.570 baris total) untuk Three.js Viewer. **Arah seni sudah disetujui host. Kodenya belum layak produksi:** monolitik, tanpa tier kualitas, tanpa pengukuran di HP, tanpa kompresi aset (KTX2/Meshopt), sebagian geometri dibuat prosedural berat. **Bangun ulang sebagai modul R3F** dengan mempertahankan arah seninya. Lihat pratinjaunya di `docs/design/previews/`.

### Konten & aset
- 🔴 **0 foto** (Tugas 6). Panel foto di film dan gambar Today bergantung pada ini.
- 🟡 42 fakta bertanda [V] belum diverifikasi (jadwal H-14 dan H-4). Teks EN perlu proofread penutur fasih.

---

## 5. Tugas untukmu (prioritas, target, kriteria selesai)

> Prinsip: **manfaatkan yang ada, tingkatkan kualitasnya**. Boleh membangun ulang dari nol bila hasilnya jelas lebih detail, lebih indah, dan lebih optimal. Pertahankan semua aturan di §1 dan semua tes hijau; tambah tes untuk yang baru.

### F1 — Mesin film 2D (fondasi untuk semua 3D) · **berat · P0**
Tugas 17–20 di `tasks/todo.md`, FR-20 sampai FR-25.
- **Navigasi per slide (FR-20a):** satu gerakan (roda, swipe, trackpad, panah, spasi, PageDown) = tepat satu slide. Inersia trackpad MacBook diabaikan. Input ditahan selama transisi. Scrub jari dengan ambang 35%.
- Prolog → Bab 1–3 → epilog → credits; titik bab yang bisa diketuk; URL hash per bab; horizontal gallery per hari (5–8 panel).
- Panel → sheet detail via **View Transitions** (fallback crossfade). Calm mode (crossfade, tanpa partikel/scrub, otomatis bila reduced motion).
- Konten dari `trip-data` (tidak ada di bundle). Overlay teks memakai reveal yang sudah ada atau versi yang lebih baik.
- **Target:** e2e "1 event roda/keyboard = 1 slide" lulus; tidak pernah melompat 2 slide di trackpad dan swipe; 0 frame > 50 ms saat transisi.

### F2 — Panggung 3D produksi (R3F) + tier kualitas · **sangat berat · P0**
Tugas 23 dan PRD §12.1–12.2.
- `@react-three/fiber`, `drei`, `postprocessing`, nanti `@react-three/rapier`. **Bundle 3D dimuat lazy hanya di `/film/`**; gerbang dan Today tetap tanpa WebGL. Gerbang ≤ 80 KB gz sebelum kode benar.
- Kamera berpindah shot per slide (koreografi, bukan orbit bebas). Render berhenti saat tab tersembunyi, dan render sesuai kebutuhan saat diam.
- Tier High/Medium/Low/Static; tier awal dari GPU + layar; pemantau FPS turun tier bila rata-rata < 50 fps selama ±3 dtk, naik bila ≥ 58 fps stabil. Low Power Mode iOS (30 fps) tetap halus.
- Aset: GLB + Meshopt/Draco, tekstur KTX2 ≤ 2048 px, ≤ 6 MB per bab, ≤ 25 MB total, dimuat bertahap; dispose bab yang sudah jauh.
- **Target S1/S2:** HP flagship ≥ 55 fps rata-rata, frame time p95 ≤ 20 ms (High/Medium); MacBook Air ≥ 58 fps. Sediakan overlay FPS khusus dev.

### F3 — Gong ageng produksi · **berat · P0** (Tugas 24, FR-28a)
- Port arah seni **Gong v3 "Murka"** (kepingan bara yang berkumpul, pencu berdenyut, gayor berornamen, Batara Kala memegang keris) ke R3F: perunggu PBR, close-up tajam di retina.
- Pukulan gong kapan pun (klik/tap/Enter): tabuh berayun, riak, gelombang kejut layar, percikan emas, kamera bergetar, **sinkron dengan SFX `gong`** (lewat `AudioEngine.playSfx`).
- Momen hero di prolog; pukulan di akhir tiap hari; gong terakhir di epilog.

### F4 — Gunungan produksi + gate sinematik · **berat · P0** (Tugas 25, FR-24, FR-28b)
- Gunungan v3 "Murka" (kala dengan pupil mengikuti kursor, macan vs banteng, naga, raksasa) sebagai **mask reveal antar bab** dan **gerbang yang membuka** setelah kode benar (menggantikan sebagian tirai letterbox).
- Klik untuk dibalik ke sisi geni; cahaya blencong mengikuti kursor (gyroscope di HP setelah izin, fallback sentuh); bayangan jatuh di kelir dari kedua sisi.

### F5 — Benang emas + siklus waktu + post-FX + partikel · **berat · P1** (Tugas 26, 27, 31, FR-22, FR-25)
- Benang emas tergambar mengikuti scroll lintas bab (kurva + shader, bukan SVG statis).
- Siklus subuh → siang → senja → malam per bab: LUT, langit, kabut, partikel. Bloom selektif, DOF hanya tier High.

### F6 — Adegan bab · **sangat berat · P1** (Tugas 28–30, FR-27, FR-28)
- **Diorama Solo** (prolog & Hari 1): landmark dikenali (Keraton, Pasar Gede, Klewer), data OSM (atribusi © OpenStreetMap contributors).
- **Lereng Lawu** (Hari 2): DEM, kebun teh, Candi Sukuh, lautan kabut.
- **Canting + kain mori** (Hari 3): torehan malam (wax) yang membentuk motif dan mengungkap benang emas.
- Butuh akses jaringan ke OSM/Overpass dan sumber DEM; minta host menambah host jaringan bila diblokir.

### F7 — Boarding pass 3D + epilog + credits · **berat · P1** (Tugas 32–33, FR-26)
- Port `prototypes/boarding-pass` ke R3F + **Rapier** (tali + kartu): diseret, berayun, berputar. Nama dari data privat saat runtime. Depan foil emas; belakang kawung + monogram.
- Juga pakai di sambutan sebagai pengganti tiket DOM pada perangkat High/Medium.
- End credits bergulir, dibuat otomatis dari manifest foto.

### F8 — Peningkatan UI/UX menyeluruh · **sedang · P1**
- Pecah `globals.css` (lihat §4) tanpa mengubah tampilan; buat skala token; tambah **uji visual** (Playwright screenshot per halaman EN/ID, tolerance kecil).
- Gerbang: intro singkat untuk kunjungan ulang; setel gerak di HP nyata.
- Today: kartu stop dengan foto kecil, stop yang lewat diringkas, transisi antar hari yang lebih halus. Pertahankan semua fungsi dan a11y 100.

### F9 — Aset & audio · **sedang · P2**
- Pipeline foto (Tugas 21: AVIF/WebP responsif + manifest + credits) setelah host/kamu mendapatkan foto berlisensi. Depth map untuk parallax (Tugas 22).
- Audio per adegan (Tugas 36): gendhing keraton/gendhing per bab, SFX api naga, gunungan balik, keris bangkit (file sudah ada di `public/audio/sfx`).

---

## 6. Standar kualitas (berlaku untuk semua tugas)

- **Kehalusan:** 0 frame > 50 ms di momen kunci (LoAF); S1/S2 untuk 3D.
- **Kecepatan:** gerbang LCP ≤ 1,5 dtk di 4G; Today interaktif ≤ 1,5 dtk dan berfungsi offline.
- **Aksesibilitas:** Lighthouse a11y 100 di gerbang/sambutan/Today (sekarang 100), ≥ 95 di film; kontras ≥ 4,5:1 termasuk teks di atas foto/3D; reduced motion dihormati (tier Static).
- **Dua bahasa:** setiap layar dicek EN dan ID; label ID lebih panjang, jadi jangan sampai terpotong.
- **Bukti:** tiap perubahan visual disertai pratinjau gerak lambat atau tangkapan layar (EN + ID) untuk host.
- **Tes:** `pnpm typecheck && pnpm lint && pnpm test && pnpm content:check && pnpm build && pnpm test:e2e -- --trace off` hijau sebelum push.

---

## 7. Pertanyaan terbuka untuk host

1. Nama host untuk "Hosted by" di boarding pass (Q7).
2. Nomor WhatsApp host & guide, alamat penginapan, jam jemput per kegiatan (masuk `trip_private.guest`).
3. Jenis motor untuk night ride; momen spesial atau ulang tahun.
4. Film di Hari 2 malam: bioskop (sekarang) atau Wayang Orang Sriwedari.
5. Siapa yang mencari foto berlisensi (host atau kamu dengan akses jaringan), dan kapan.
6. Perangkat uji nyata: tipe iPhone dan Android yang tersedia.
7. Kode booking asli (9 karakter) dibuat kapan.

## 8. Asumsi yang dipakai di dokumen ini

- Kamu bekerja di repo yang sama, dimulai dari `main` setelah PR terakhir di-merge host.
- Target tanggal di PRD masih berlaku (serah terima 28 Des 2026).
- Stack 3D mengikuti PRD (R3F + drei + postprocessing + Rapier). Boleh diganti bila ada alasan teknis kuat (catat di `docs/design/decisions.md`).
