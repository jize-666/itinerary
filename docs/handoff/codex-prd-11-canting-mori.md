# PRD Codex · Tugas 11: Canting dan kain mori (Hari 3, "Threads of Batik")

19 November 2026 · dibaca bersama `codex-prd-bersama.md` (aturan bersama) · disusun Claude untuk host

## Prompt siap tempel (English)

> Build the heart of Day 3, "Threads of Batik": a real 3D canting (copper bowl, spout, bamboo handle) drawing hot wax (malam) on mori cotton, and the batik tulis process that follows (wax resist, dye, boiling off the wax) until a finished cloth is revealed. Two outputs share one engine: (1) inside `/film/`, a scroll-driven sequence in the Day 3 chapter that ties the film's visual language (the Bengawan Solo river and lantern line in the gallery) to batik wax, ending in the final gong of the film; (2) a private page `/canting/` where the guest draws their own batik with mouse or finger, dyes it, reveals it and saves it as an image. Design the look, the wax and cloth simulation, the motifs, the camera and the story beats as you see fit; aim for tactile, warm and true to Laweyan, and exceed this PRD where you can. Respect the hard limits in the shared rules (no WebAssembly, no external origins, the host's camera-motion rule, ≥ 55 fps on the host's iPhone at tier High, privacy) and pass the acceptance tests in §8. Deliver as described in the shared rules §4.

---

## 1. Tujuan

Pagi Hari 3, tamu belajar membatik di Kampung Batik Laweyan. Konten trip menulis: "a canting in your hand and hot wax on cloth", "You leave with a batik you drew yourself", "The wax is hot; the teachers are patient". Ini satu-satunya momen di trip ketika tamu **membuat sesuatu dengan tangannya sendiri**.

Tugas ini membawa momen itu ke film dan ke satu halaman tempat tamu bisa membatik sendiri. Hasilnya dua, dengan satu mesin:

1. **Di film (P0):** urutan yang mengikuti gulir di bab Hari 3. Canting menorehkan malam di kain mori, kain diwarnai, lalu malam dilorod. Kain jadi terungkap menjelang gong terakhir film.
2. **Halaman `/canting/` (P0):** tamu menggambar dengan mouse atau jari, mewarnai, melorod, lalu menyimpan batiknya sebagai gambar.

PRD situs (`docs/PRD.md` §7.3) menulis untuk Hari 3: "Canting (tembaga + gagang bambu) + kain mori (simulasi/shader kain)", lalu "Canting menorehkan malam di kain mori, mengungkap bahwa benang emas adalah lilin batik. Motif parang/kawung terbentuk. Malam perpisahan yang hangat, ditutup gong terakhir."

**Catatan penting:** "benang emas" di film sudah diganti. Sejak Tugas 8.1, host memilih **Bengawan Solo dan larung lampion**: sungai berkelok di pita bawah kartu gallery, satu lampion per tempat singgah, dan perahu lampion yang hanyut mengikuti gulir. Payoff lama ("garis emas itu ternyata lilin") perlu ditafsir ulang dengan bahasa visual yang sekarang. Codex yang memutuskan caranya (benih di §5.3).

## 2. Fakta dari repo (`content/trips/solo/trip.ts`, Hari 3, 10 April 2027)

Judul EN/ID: "Threads of Batik" / "Benang Batik". Subjudul: "Wax and cloth in Laweyan, the second palace, and a farewell under Saturday-night lights." Aksen warna PRD: **sogan** (cokelat soga) dan **nila** (indigo). Token situs: `--mori #f2ebdd`, `--nila #0a0c18`, `--prada #c8a25a`.

| Jam | id | Tempat | Fase | Panel |
| --- | --- | --- | --- | --- |
| 07:00–08:00 | `timlo-serabi` | Timlo dan serabi | dawn | teks |
| 08:30–10:45 | `laweyan` | Kampung Batik Laweyan (kelas membatik) | day | foto |
| 11:00–12:15 | `danar-hadi` | Museum Batik Danar Hadi ("After making one, see a thousand.") | day | teks |
| 12:30–13:30 | `sate-buntel` | Sate buntel | day | teks |
| 14:00–15:15 | `mangkunegaran` | Pura Mangkunegaran ("Look up: the ceiling is the show.") | day | foto |
| 15:30–16:45 | `triwindu` | Pasar Triwindu dan Ngarsopuro | dusk | foto |
| 17:00–18:00 | `becak-golden-hour` | Becak saat golden hour | dusk | teks |
| 19:00–20:30 | `farewell-dinner` | Makan malam perpisahan | night | teks |
| 20:30–22:00 | `ngarsopuro-night` | Pasar malam Ngarsopuro (pilihan) | night | foto |

Fakta prolog yang terkait: "UNESCO recognised Indonesian batik in 2009. Laweyan, a merchant quarter, is where the Sarekat Dagang Islam was founded in 1905."

Diorama Solo (Tugas 9, sudah terpasang di `/diorama/`) punya lokasi `laweyan`, yaitu halaman pembatik dengan kain di gawangan. Halaman `/canting/` sebaiknya terasa satu keluarga dengannya.

## 3. Bahan budaya (verifikasi, cantumkan sumber di README)

- **Canting**:
  - Bagiannya: *nyamplung* (wadah tembaga kecil berisi malam cair), *cucuk* (pipa kecil tempat malam keluar), dan *gagang* (pegangan bambu atau kayu).
  - Jenisnya menurut jumlah cucuk dan ukurannya. Canting cecek untuk titik, klowong untuk garis tepi, tembok untuk menutup bidang. Canting bercucuk banyak (loron, telon, prapatan, dan seterusnya) untuk pola titik berkelompok.
- **Malam**: campuran parafin, gondorukem, lilin lebah, dan lemak. Dicairkan di wajan kecil di atas anglo atau kompor. Ditiup sebelum ditorehkan supaya cucuk tidak tersumbat dan malam tidak menetes. Saat mendingin, malam berubah dari bening mengilap menjadi krem buram.
- **Proses batik tulis** (urutan umum):
  1. *Nyorek* atau *molani*: pola digambar tipis dengan pensil.
  2. *Nglowong*: garis pola ditorehkan dengan malam.
  3. *Ngisen-iseni*: isian titik dan garis.
  4. *Nembok*: bidang yang ingin tetap putih ditutup malam.
  5. *Medel*: dicelup nila.
  6. *Nyoga*: dicelup soga.
  7. *Nglorod*: direbus supaya malam lepas, dan garis putih mori muncul.
  8. Retak malam yang tertembus warna (remukan) adalah ciri batik tulis yang disukai.
- **Motif**:
  - *Kawung*: empat bentuk lonjong mengelilingi pusat.
  - *Parang*: pita miring berulang berbentuk S. Sebagian varian parang (misalnya parang rusak barong) dahulu termasuk **motif larangan** keraton Surakarta dan Yogyakarta, hanya untuk raja dan kerabatnya.
  - Isen-isen: cecek (titik), sawut (garis halus), dan lain-lain.
  - Codex boleh membuat motif orisinal, misalnya dari Bengawan Solo, lampion, gong, Lawu, atau Clawd. Diorama juga diminta memakai kain rancangan orisinal.
- **Rasa hormat**: motif larangan boleh dijelaskan sebagai sejarah. Jangan disajikan sebagai motif "milik tamu" tanpa konteks. Hindari klaim bahwa batik digital ini batik tulis asli.

## 4. Pengalaman yang diminta: halaman `/canting/` (P0)

- Rute privat `src/app/canting/page.tsx`, hanya klien, memakai `useRequireSession()`, `useI18n()`, dan Calm (`lakon.calm`). Polanya mengikuti `/diorama/` (`src/app/diorama/page.tsx`).
- **Membatik sendiri**:
  - Canting 3D mengikuti kursor atau jari di atas kain mori yang terbentang, misalnya di gawangan atau di pangkuan.
  - Malam keluar dari cucuk. Lebar dan kerapatannya bergantung pada kecepatan tangan, jumlah malam di nyamplung, dan suhu. Bila tangan berhenti, malam menetes atau melebar (mbleber). Bila malam habis, canting dicelup lagi ke wajan.
  - Malam mendingin dari bening mengilap ke krem buram dalam beberapa detik.
  - Pilihan canting: minimal klowong dan cecek. Tembok untuk menutup bidang.
  - Pola tuntunan boleh ditampilkan tipis seperti nyorek: kawung, parang, dan satu motif orisinal. Tamu juga bisa menggambar bebas.
  - **Urungkan** dan **mulai lagi**.
- **Mewarnai dan melorod**:
  - Celup nila dan/atau soga, dengan kain sungguh dicelup, basah, dan menetes.
  - Malam menahan warna, dan remukan muncul secara alami.
  - Lorod: malam lepas, dan garis putih muncul. Ini momen puncak, beri waktu dan cahaya.
- **Simpan**:
  - PNG kain jadi, sisi panjang ≥ 2048 px, tanpa antarmuka, dengan nama berkas `batik-laweyan.png`. Lewat Web Share (berkas) bila didukung; selain itu unduh.
  - Tidak ada data yang dikirim ke server. Karya disimpan sementara di perangkat (localStorage atau IndexedDB, dibungkus try/catch) supaya tidak hilang saat tamu bolak-balik halaman.
- **Kontrol**:
  - Seret atau jari = menggambar.
  - Dua jari atau roda = zoom/dolly ke kain. Ini sekaligus kedalaman yang mengikuti gulir.
  - Saat tidak menggambar, kamera parallax mengikuti kursor atau kemiringan HP (aturan host). Parallax berhenti saat menggambar.
  - Papan ketik: Tab ke semua tombol; ada cara menggambar pola tuntunan otomatis untuk yang tidak memakai pointer.
- **Calm dan `prefers-reduced-motion`**: tetap bisa membatik. Parallax mati, perpindahan tahap memakai pudar singkat.
- Tombol **Kembali**: ke halaman asal (`history.back()` bila dari situs ini), selain itu ke `/film/#day-3`.
- Parameter URL: `?q=high|medium|low` mengunci kualitas, `?fps` menampilkan hamparan p95, draw call, dan segitiga. `?demo=1` memutar gambar otomatis, untuk pratinjau dan e2e.

## 5. Pengalaman yang diminta: di film (P0)

### 5.1 Wajib

- Urutan canting ada di bab Hari 3 (`day-3/*`). Letak dan panjangnya bebas, misalnya:
  - di sekitar panel `laweyan`;
  - sebagai dunia Hari 3 di belakang seluruh gallery;
  - sebagai slide tambahan sesudah `dayintro`.

  Bila menambah slide, tambahkan lewat `build-slides.ts` dengan jenis slide baru dan shot di `shots.ts`.
- **Mengikuti gulir** (aturan host): torehan malam maju saat tamu menggulir atau menggeser maju, mundur saat mundur, dan berhenti saat berhenti. Torehan harus deterministik terhadap progres, jadi mundur menghapus torehan dengan bersih, tanpa sisa.
- Gerakan film tetap milik film. Gulir dan geser memindah slide atau memajukan torehan. Film tidak menggambar bebas; menggambar bebas ada di `/canting/`.
- Payoff ditafsir ulang (lihat §1), lalu proses berlanjut sepanjang hari. Kain jadi terungkap menjelang atau tepat di **gong penutup Hari 3, yang menjadi gong terakhir film**. Mekanisme gong (tahap judul, pukulan, zoom, kitar ±90°) tetap bekerja dan semua tesnya lulus.
- Dari film ada jalan ke `/canting/`, misalnya tombol "Batik sendiri / Draw your own" di panel Laweyan. Tautan di Today dan diorama dipasang Claude.
- Dunia Hari 3 memakai sambungan "dunia per bab" yang dibuat Tugas 10 (atau membuatnya bila Tugas 11 masuk lebih dulu, lihat aturan bersama §4).
- Shader menulis HDR linear dengan uniform `COMMON` (`stage3d/shared.ts`). Grading dan partikel per fase tetap berlaku.
- Clawd tetap memandu dan tidak tertutup.

### 5.2 Diharapkan (P1)

- DOF pada ujung cucuk (PRD situs). Uap tipis dari wajan. Serbuk emas (partikel Hari 3 di PRD situs).
- Suara prosedural: desis malam, gemericik celupan, gelembung lorod. Ikut sakelar suara.
- Versi 2,5D (tier Static): garis malam yang tergambar mengikuti gulir di atas kain mori (SVG/CSS), dengan aturan gerak kamera 2,5D.
- Kalimat Clawd baru, dua bahasa. Klip suaranya dibuat Claude.

### 5.3 Benih (bebas dipakai atau dibuang)

- Dari atas, alur Bengawan Solo yang dilalui perahu lampion tiga hari ternyata garis malam di kain. Lampion tiap tempat singgah menjadi cecek emas. Kain jadi memuat peta perjalanan tamu dalam bentuk motif.
- Di gallery Hari 3, sungai di pita bawah kartu tergambar oleh cucuk canting yang berjalan di depan perahu.
- Canting dipegang Clawd, lengkap dengan ekspresi saat meniup cucuk.
- Gong terakhir menggetarkan kain jadi seperti kelir, dan motifnya berpendar sekali sebelum epilog.
- Kain yang dibatik tamu di `/canting/` muncul di epilog film. Ini hanya dari penyimpanan lokal perangkat, tanpa server, dan bila tidak ada, film tetap utuh.

## 6. Arah teknis (saran, bukan kewajiban)

- Canting: lathe untuk nyamplung, tube untuk cucuk, dan gagang bambu dengan ruas. Tembaga dengan patina, malam cair di dalam nyamplung yang memantulkan cahaya.
- Malam dan warna: medan tinggi dan masker di render target (ping-pong, half float aman untuk Safari iOS). Normal dari tinggi untuk kilap. Difusi warna yang ditahan masker malam. Remukan dari pola retak prosedural.
- Kain: tenunan mori prosedural (detail mikro), dan simulasi kain (verlet/PBD di CPU atau GPU) untuk menggantung, dicelup, dan diangkat. Tanpa WASM.
- Satu mesin untuk film dan `/canting/`, dengan logika murni di `src/engine/canting/` dan rendering di `src/components/canting/` (awalan kelas `.cnt-*`).

## 7. Anggaran

| Hal | Batas |
| --- | --- |
| Fps | iPhone host di High: rata-rata ≥ 55 fps, p95 ≤ 20 ms (film dan `/canting/`, termasuk saat menggambar). MacBook Air M: ≥ 58 fps. |
| Latensi goresan | Malam muncul di bawah cucuk ≤ 1 frame sesudah gerak pointer, tanpa jeda yang terasa. |
| Aset Hari 3 | ≤ 6 MB sesudah kompresi. |
| Kode | Chunk lazy, sebaiknya ≤ 250 KB gzip, dibagi antara film dan `/canting/`. |
| Siap tampil | `/canting/` siap ≤ 4 dtk di 10 Mbps. |
| Memori | Render target dilepas saat keluar. Ekspor PNG 2048 px tidak membuat Safari iPhone kehabisan memori. |

## 8. Uji penerimaan

Selain uji bersama (aturan bersama §5):

- **Unit (Vitest), logika murni:**
  - torehan film deterministik terhadap progres: maju 0 → 1 lalu mundur ke 0 menghasilkan masker kosong (atau checksum yang sama dengan awal);
  - model aliran malam: lebar garis turun saat tangan cepat, tetesan muncul saat berhenti, malam habis memicu celup ulang;
  - pola tuntunan (kawung, parang, orisinal) tertutup dan berada di dalam batas kain;
  - urutan tahap: gambar → celup → lorod → simpan; tidak bisa melorod sebelum ada malam;
  - teks dua bahasa lengkap.
- **E2E (Playwright):**
  - `/canting/?q=low&demo=1`: siap (atribut data), demo menggambar, celup, lorod, dan menyimpan satu PNG dengan ukuran yang benar;
  - menggambar dengan mouse di `/canting/?q=low` mengubah kain (atribut data atau piksel kanvas), lalu urungkan memulihkannya;
  - `/film/#day-3?stage=low`: urutan canting maju dan mundur mengikuti slide, tanpa galat; gong terakhir tetap dipukul;
  - Calm: `/canting/` tetap bisa dipakai tanpa parallax; film Hari 3 tampil 2,5D;
  - bolak-balik `/film/` ⇄ `/canting/` beberapa kali: konteks WebGL tidak bertambah.
- **Bukti kinerja**: angka per tier, dan video desktop dan HP yang memperlihatkan urutan film (torehan mengikuti gulir, celup, lorod, gong terakhir) dan `/canting/` (menggambar dengan jari di HP, celup, lorod, simpan).
- **Sumber budaya**: istilah dan proses di §3 diverifikasi dan bersumber di README.
