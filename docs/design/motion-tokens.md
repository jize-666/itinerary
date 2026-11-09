# Token Motion (disetujui host lewat prototipe Framer, 8 Nov 2026)

**Sudah dipakai di web (9 Nov 2026):** `src/engine/motion/tokens.ts` + variabel `--ease-*` di `src/app/globals.css`; komponen `src/components/motion/` (FlipText, Words, Scramble, CountUp, Curtain, useReveal).

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

## v2 (8 Nov 2026): katalog teks kinetik (komponen kode Framer `KineticText`, `RollingNumber`, `VelocityMarquee`)
| Token | Nilai | Dipakai di |
|---|---|---|
| `text.flip3d` | 1,1 dtk/huruf, jeda 60 ms, rotateX −100° → 0, blur 8 → 0, perspektif 900 px, `expo.out` | "Kulonuwun?" (+ kilau emas) |
| `text.curtain` | 0,9–1,0 dtk/kata, jeda 55–70 ms, naik 115% di dalam mask + skewY 8° → 0 | Judul prolog, gallery, detail, gong |
| `text.blurRise` | 0,7–0,8 dtk/kata, jeda 40–70 ms, naik 0,6em, blur 10 → 0 | Subjudul gate, kartu bab, gong |
| `text.scramble` | glif acak tiap 45 ms, huruf terkunci tiap 20–50 ms | Kicker gate, "PROLOGUE", tanggal bab |
| `text.scrub` | per kata mengikuti scroll: opacity 0,14 → 1, blur 4 → 0 | Paragraf prolog (Fraunces 30) |
| `text.track` | 1,6 dtk, letter-spacing +0,55em → normal, blur 14 → 0 | "The Royal City", "Sampai jumpa." (+ kilau emas) |
| `text.shine` | sapuan emas 2,4 dtk, ulang tiap 5,6 dtk, setelah reveal selesai | Judul utama |
| `num.odometer` | 1,8 dtk, jeda 120–150 ms/digit, 2 putaran | 3 · 20 · 1 |
| `marquee.velocity` | dasar −2 / +3 %/dtk, dikali kecepatan scroll (spring 400/50) | Pita "Solo · Surakarta · The Spirit of Java" |
| `gong.strike` | tabuh 1 dtk (ancang 0,16 → hantam 0,24), gong bergoyang 1,8 dtk, 3 riak + gelombang kejut + 22 percikan | Komponen `GongStrike` (klik/tap/Enter) |

## v3 (9 Nov 2026): reveal teks lakon (menggantikan blur-naik, flip, dan scramble yang terasa template)
| Token | Nilai | Dipakai di |
|---|---|---|
| `text.bayang` | 1,6 dtk/huruf, jeda 70 ms dari tengah ke luar; 0–52%: bayangan `#020107` skala 1,8 → 1, blur 14 → 0, berkedip; 52–66%: siluet tajam; → warna asli + pendar blencong | Judul gerbang, sambutan, judul hari |
| `text.canting` | per kata 260 ms + 55 ms/huruf (kata berikutnya mulai di 85%), garis emas 1 px digambar linear, lalu pewarna naik 0,9 dtk `power3.out` | Nama tamu |
| `text.gamelan` | ketukan 150 ms/kata, +70 ms sebelum aksen tiap empat ketuk, kata terakhir +140 ms lalu riak gong 1,7 dtk | Kalimat pendek |
| `text.benang` | 38 ms/huruf, benang 1 px tumbuh `power3.out`, huruf naik 0,6em dengan pantulan, benang meredup ke 30% | Kicker, label hari |
| `wipe.gunungan` | 1,25 dtk `expo.inOut`, kayon (tinggi 1,9em) menyapu, teks dibuka `clip-path` sejalan | Judul halaman |

## Catatan
- **Navigasi per slide** (satu gerakan = satu slide) **tidak bisa dibuat di Framer** tanpa kode. Di prototipe, halaman masih di-scroll biasa. Rasa per-slide baru dibangun di web sungguhan (Tugas 17, GSAP Observer).
- Foto di prototipe adalah **placeholder dari pencarian gambar Framer (Unsplash)**. Beberapa diambil di Yogyakarta, bukan Solo (Taman Sari, abdi dalem). Foto final mengikuti manifest lisensi (Tugas 6).
