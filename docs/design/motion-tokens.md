# Token Motion (usulan, menunggu persetujuan host)

Nilai di bawah ini sudah dipasang di prototipe Framer **"Lakon Tiga Hari — Motion"** (https://framer.com/projects/JFpFbDKBsfnsgzvi6f8r). Setelah host menyetujui rasa geraknya, nilai ini dikunci ke `src/engine/motion/tokens.ts` saat Fase 3.

| Token | Nilai | Easing (cubic-bezier) | Dipakai di prototipe |
|---|---|---|---|
| `reveal.line` | 0,9 dtk, naik 60–90 px | `expo.out` = (0.16, 1, 0.3, 1) | Judul prolog, judul bab |
| `reveal.char` | 0,9 dtk, naik 40 px + blur 8 px | `expo.out` | "Kulonuwun?", "Sampai jumpa." |
| `reveal.word` | 0,6 dtk, naik 12–24 px | `power3.out` = (0.33, 1, 0.68, 1) | Paragraf, subjudul |
| `stagger.item` | 0,6 dtk, jeda 70–90 ms per item | `power3.out` | Kotak kode booking, angka 3 · 20 · 1 |
| `mask.curtain` | 1,2 dtk, gambar naik dari bawah bidang potong + skala 1,08 → 1 | `expo.inOut` = (0.87, 0, 0.13, 1) | Foto kartu bab |
| `wipe.gunungan` | 1,2 dtk, gunungan menyapu dari kiri ke kanan layar | `expo.inOut` | Kartu bab |
| `letterbox` | 0,8 dtk, tunda 0,9 dtk, bilah masuk dari atas & bawah | `expo.out` | Kartu bab |
| `shared.expand` | spring 0,6 dtk, bounce 0,12 | spring | Stop Card: tertutup ↔ terbuka |
| `micro.hover` | 150–250 ms (angkat 2–8 px / ganti warna) | `power3.out` | Tombol, kartu gallery, kotak kode |
| `micro.tap` | 120 ms, skala 0,96–0,97 | `power3.out` | Tombol |
| `loop.blencong` | 2,4 dtk bolak-balik (opacity 0,55, skala 1,08) | sine in-out = (0.45, 0, 0.55, 1) | Pendar lampu di gate |
| `loop.gongRipple` | 2,4 dtk, 3 riak berjarak 0,8 dtk (skala 1,75, opacity → 0) | (0.22, 1, 0.36, 1) | Bagian gong |
| `scroll.smooth` | spring stiffness 260, damping 50 | spring | Horizontal gallery + perubahan langit pagi → senja → malam |
| `drag.snapBack` | inertia stiffness 300, damping 22 | inertia | Boarding pass |

## Catatan
- **Navigasi per slide** (satu gerakan = satu slide) **tidak bisa dibuat di Framer** tanpa kode. Di prototipe, halaman masih di-scroll biasa. Rasa per-slide baru dibangun di web sungguhan (Tugas 17, GSAP Observer).
- Foto di prototipe adalah **placeholder dari pencarian gambar Framer (Unsplash)**. Beberapa diambil di Yogyakarta, bukan Solo (Taman Sari, abdi dalem). Foto final mengikuti manifest lisensi (Tugas 6).
