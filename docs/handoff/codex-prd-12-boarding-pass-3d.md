# PRD Codex · Tugas 12: Boarding pass 3D dengan fisika

19 November 2026 · dibaca bersama `codex-prd-bersama.md` (aturan bersama) · disusun Claude untuk host

> **Pembaruan 25 Nov 2026:** Codex tidak punya akses repo dan tugas ini dibagi dua. Prompt yang dikirim ke Codex sekarang `codex-prompt-12-boarding-pass.md` (berdiri sendiri, dengan gambar referensi three.js `ref-01`–`ref-07` dari `prototypes/boarding-pass/reference/`). Codex mengerjakan setengah pertama (fisika, tiket 3D, interaksi, sandbox); Claude memasangnya di film dan mengerjakan sisanya. Tujuan dan uji penerimaan di berkas ini tetap berlaku.

## Prompt siap tempel (English)

> Build the guest's ticket, "Admit one", as a physical 3D object in the film: a hanging paper tag on a thread that the guest can grab, pull, swing, flick and flip, reacting to phone tilt and a light breeze, with gold foil that catches the light. Write the rope and card physics yourself in TypeScript (no WebAssembly, so no Rapier) as a deterministic fixed-step solver. The guest's name comes from private runtime data and must never be in the bundle or the repo. It appears on the `pass` slide of `/film/` (and the epilogue if you wish) inside the existing 3D stage, with the current DOM ticket as the fallback. The design of the card, the material, the physics feel, where it hangs, and any extra moments are yours: aim for a tactile object that feels real in the hand, and exceed this PRD where you can. Respect the hard limits in the shared rules and pass the acceptance tests in §7. Deliver as described in the shared rules §4.

---

## 1. Tujuan

Tiket adalah satu-satunya benda di film yang **milik tamu**. Namanya tercetak di sana, dan itu tanda ia diundang ("Admit one", "Hosted by").

Saat ini tiket tampil sebagai kartu DOM yang tergantung di benang: `HangingPass` di `src/components/pass/Pass.tsx`, dipakai di home, Today, dan slide `pass` film. Tugas ini membuatnya menjadi benda 3D sungguhan di panggung film. Tamu bisa memegang, menarik, mengayun, menyentil, dan membaliknya, dan tiket bereaksi pada kemiringan HP dan angin.

PRD situs (`docs/PRD.md` §7.4, FR-26) menulis: boarding pass bertali ber-physics, bisa ditarik dan diayun, drag di desktop dan sentuh di HP, nama dari data privat, contact shadow dan grain.

## 2. Yang sudah ada (pelajari dulu)

- **Desain kartu** (`docs/design/decisions.md`, bagian boarding pass):
  - Satu tag pada benang. Kartu nila 7,4 × 15 cm dengan cetak foil emas (metalness dan timbul), tepi bersepuh, mata ayam kuningan, dan simpul benang yang melewati lubang.
  - Depan: nama (otomatis pas satu baris), rute dengan benang bertitik dan pesawat kecil, info 2 × 2, perforasi, barcode foil, dan "Hosted by".
  - Belakang: kawung foil, monogram inisial, dan "Matur nuwun".
  - Isi depan dari PRD situs: rute TJQ → CGK → SOC, tanggal, gate *Kulonuwun*, kursi *With the host*. Isi sebenarnya dibaca dari data trip dan konten. Lihat `PassFace` di `Pass.tsx` dan `hasPass(data)`.
- **Prototipe fisika** (`prototypes/boarding-pass/scene.js`, untuk Three.js Viewer, bukan kode produksi):
  - tali verlet 18 segmen, gravitasi −9,81, langkah tetap 1/240 dtk, damping 0,993 (tali) dan 0,9965 (kartu);
  - 14 iterasi constraint, kartu kaku 4 titik dengan 6 batas jarak;
  - hembusan angin, seret dan lepas, dan `settle()` di awal.

  Ini titik awal yang sudah diuji host. Codex boleh membuat solver yang lebih baik, misalnya XPBD, badan kaku sungguhan dengan inersia, atau kartu yang sedikit melentur.
- **Komponen DOM** (`src/components/pass/`): `Card`, `PassFace`, `HangingPass`. DOM ini tetap menjadi cadangan.
- **Slide film**: `kind: "pass"` (`build-slides.ts`, sesudah `epilogue` dan `daycard`, sebelum `credits`). Shot Orbit di `shots.ts`, langit `gate`, dan DOM `HangingPass` di `Slides.tsx`.
- **Benang emas sudah diganti.** Sejak Tugas 8.1, garis di gallery adalah Bengawan Solo dan larung lampion. Tiket tidak lagi harus tergantung di "benang emas" (§4.3).

## 3. Batas khusus tugas ini

- **Fisika ditulis sendiri** (TypeScript, tanpa WASM), deterministik, langkah tetap dengan sub-langkah dan batas per frame. Taruh di `src/engine/pass3d/`, murni dan bisa dites tanpa DOM atau WebGL.
- **Nama tamu hanya dari data runtime.**
  - Gambar teks ke tekstur saat runtime (Canvas 2D atau SDF), dengan fon situs yang di-host sendiri (`@fontsource-variable/fraunces`, `manrope`). Tunggu `document.fonts.load` dulu.
  - Nama tidak boleh ada di bundle, repo, tes, nama berkas, atau log.
  - Aturan pas satu baris sama dengan DOM.
  - Di pratinjau, nama = **"Jize"**.
- **Satu konteks WebGL.** Tiket digambar di panggung film yang sudah ada (`stage3d/runtime.ts`), bukan kanvas kedua. Material menulis HDR linear dengan uniform `COMMON` (`stage3d/shared.ts`), supaya bloom, grading, dan cahaya panggung jatuh dengan benar di foil.
- **Cadangan DOM**: tier Static, Calm, tanpa WebGL2, atau nama/data belum ada → `HangingPass` DOM yang sekarang. Saat versi 3D tampil, isi tiket tetap tersedia untuk pembaca layar, misalnya lewat elemen DOM tersembunyi secara visual atau label kanvas.
- **Gestur tidak bentrok dengan film.** Menekan atau menyentuh **kartu atau benang** = fisika (tangkap dengan raycast). Menekan di tempat lain = gestur film seperti biasa (geser untuk pindah slide). Sesudah kartu dilepas, gulir berikutnya kembali milik film.
- Home dan Today **tetap DOM** (anggaran JS Today ≤ 120 KB gzip tanpa WebGL). Versi 3D di home sesudah kode akses masuk boleh diusulkan di README, tapi tidak dikerjakan tanpa izin host.

## 4. Pengalaman yang diminta

### 4.1 Wajib (P0)

1. **Benda yang terasa nyata.**
   - Kertas tebal berwarna nila dengan serat halus dan grain.
   - Foil emas yang berkilau sesuai sudut pandang dan cahaya, dengan timbul pada huruf dan kawung.
   - Tepi bersepuh, mata ayam kuningan, dan benang yang melewati lubang dan bisa melilit sedikit.
   - Contact shadow di permukaan terdekat.
2. **Fisika yang enak dimainkan.**
   - Seret untuk menarik, lepas untuk berayun, sentil untuk memutar pada benang.
   - Energi meredam secara alami, dan kartu kembali diam dalam beberapa detik.
   - Benang tidak melar berlebihan, kartu tidak menembus benang atau benda di dekatnya, dan simulasi tidak "meledak" pada fps rendah, tab yang kembali dari latar, atau seretan sangat cepat.
3. **Membalik.** Ketuk, klik, atau Enter membalik tiket ke belakang (kawung, monogram, "Matur nuwun") dengan gerak fisik, misalnya diputar di benang. Ketuk lagi untuk kembali ke depan.
4. **Kemiringan HP dan angin.**
   - Kemiringan HP (sumber `look.ts`) menggeser arah gravitasi relatif kamera sedikit, jadi tiket terasa tergantung di dunia yang nyata.
   - Angin lembut sesekali.
   - Di desktop, kursor yang bergerak cepat di dekat kartu boleh menimbulkan hembusan kecil.
5. **Aturan gerak kamera host.**
   - Kamera parallax: kursor atau kemiringan, dengan sumber yang sama.
   - Perspective shift: kamera sungguh berpindah, sehingga sisi kartu tampak saat memandang dari samping.
   - Kedalaman yang mengikuti gulir: masuk dan keluar slide `pass` bergerak dalam kedalaman mengikuti gulir, misalnya tiket turun dari atas menuju kamera.
6. **Clawd** tetap ada dan tidak menutupi tiket.

### 4.2 Diharapkan (P1)

- Suara prosedural (WebAudio): kertas berdesir saat berayun, denting mata ayam, dan "tap" saat dibalik. Ikut sakelar suara.
- Reaksi Clawd saat tiket dimainkan, dengan kalimat baru dua bahasa. Klip suaranya dibuat Claude.
- Tiket juga muncul di epilog, misalnya tergantung saat gong terakhir dan gunungan ditancapkan kembali, sesuai PRD situs §7.4.
- Versi 2,5D (tier Static) yang lebih hidup dari sekarang: ayunan pegas CSS yang mengikuti kemiringan dan kursor, tanpa WebGL.

### 4.3 Benih (bebas dipakai atau dibuang)

- Tiket tergantung pada blandar pendapa, atau pada gayor gong, dengan benang emas pendek. Itu sisa "benang emas" yang kini menjadi tali tiket.
- Tiket turun perlahan dari kegelapan atap pendapa seperti diulurkan, lalu berhenti berayun tepat di depan kamera.
- Lampion terakhir dari Bengawan Solo menggantung di sebelah tiket dan menjadi sumber cahaya hangat untuk foil.
- Clawd memegang ujung benang dan menyerahkannya ke tamu.
- Saat dibalik, kawung foil berpendar sekali mengikuti gong.

## 5. Letak di film (sambungan teknis)

- Slide `pass`: shot Orbit sekarang boleh diganti dengan shot baru di `shots.ts` yang dirancang untuk tiket.
- Modul render di `src/components/film/stage3d/pass3d.ts` (atau folder `pass3d/`), dipasang di `runtime.ts` seperti objek panggung lain (gong, gunungan):
  - dibuat saat mendekati slide `pass`;
  - dilepas saat jauh;
  - update per frame dengan input yang sudah dihaluskan.
- Data nama dan isi tiket dialirkan dari film ke panggung tanpa menyimpannya di modul global yang bertahan. Ikuti pola data `Slides.tsx` → `Stage3D`.
- `data-pass3d="ready|dragging|resting|flipped"` di akar film (atau elemen lain) untuk tes.

## 6. Anggaran

| Hal | Batas |
| --- | --- |
| Fps | iPhone host di High: rata-rata ≥ 55 fps, p95 ≤ 20 ms, termasuk saat diseret. MacBook Air M: ≥ 58 fps. |
| Fisika | ≤ 1 ms CPU per frame di iPhone (sub-langkah termasuk). |
| Draw call | Tambahan ±≤ 8. |
| Aset | ≤ 1 MB. Tekstur kertas dan foil sebaiknya prosedural. |
| Kode | Masuk chunk panggung film, sebaiknya +≤ 60 KB gzip. |
| Teks | Tekstur nama tajam di DPR 2: huruf tidak kabur saat kartu mendekat ke kamera. |

## 7. Uji penerimaan

Selain uji bersama (aturan bersama §5):

- **Unit (Vitest), `src/engine/pass3d/`:**
  - deterministik: urutan input yang sama → posisi akhir sama, persis atau dalam ε;
  - stabil pada dt 1/30, 1/60, 1/120, dan lonjakan dt 0,5 dtk (dibatasi): tanpa NaN, panjang benang dalam toleransi;
  - energi meredam: dari simpangan 60°, kartu diam (kecepatan < ε) dalam waktu yang ditentukan;
  - seret dan lepas: kartu mengikuti titik tangkap selama diseret dan berayun sesudah dilepas;
  - kemiringan mengubah arah gravitasi relatif dalam batas yang ditentukan;
  - aturan pas satu baris nama: panjang nama ekstrem (1 huruf, 40 huruf, nama dengan diakritik) tetap pas.
- **E2E (Playwright, `/film/#epilogue?stage=low`):**
  - tiket 3D siap (`data-pass3d="ready"`), DOM `HangingPass` tersembunyi dari layar dan tetap terbaca;
  - seret kartu: status `dragging`, lalu `resting` sesudah dilepas dan tunggu;
  - klik kartu: `flipped`, klik lagi: kembali;
  - geser di luar kartu memindah slide seperti biasa;
  - `?stage=static` dan Calm: DOM `HangingPass` tampil, tanpa WebGL;
  - data tanpa nama tamu: tidak ada tiket 3D maupun DOM (aturan `hasPass`), tanpa galat;
  - `e2e/smoke.spec.ts` (bundle tanpa data trip) tetap lulus.
- **Bukti kinerja**: ms fisika dan ms frame per tier, dan video desktop dan HP: tiket turun, diseret, berayun, dibalik, dan miring mengikuti HP (dengan nama "Jize").
