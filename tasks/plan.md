# Rencana Implementasi: *Lakon Tiga Hari*

Sumber: [`docs/PRD.md`](../docs/PRD.md) v1.2 · Daftar tugas lengkap: [`tasks/todo.md`](todo.md)
Dibuat: 7 Nov 2026 · Target kirim ke tamu: **H-3 = Minggu 4 Apr 2027** (sementara)

## Ringkasan
Rencana ini memecah PRD menjadi **40 tugas** dalam 8 fase. Urutannya mengikuti tiga prinsip:

1. **Yang paling berisiko dikerjakan paling awal.** Kualitas gong dan gunungan buatan kode menentukan seluruh arah visual, jadi keduanya di-preview dan disetujui host lebih dulu (Tugas 1–2).
2. **Nilai praktis dulu, kemewahan menyusul.** Gate, data, dan mode Today (Fase 1–2) sudah berguna sebelum ada efek 3D apa pun. Kalau bagian 3D molor, tamu tetap mendapat itinerary yang rapi dan aman.
3. **Irisan vertikal.** Setiap tugas berakhir dengan sesuatu yang bisa dicoba (preview, halaman, endpoint, atau tes), bukan lapisan setengah jadi.

## Keputusan Arsitektur (ringkas dari PRD)
| Keputusan | Alasan |
|---|---|
| Next.js **static export** + TypeScript strict | Frontend statis, bisa di-host di mana saja, dan tidak memuat data trip |
| **Supabase** (project baru, region Singapura) untuk verifikasi kode, data, dan rate limit | Connector sudah terhubung. Data privat tidak masuk repo. Revisi H-5 tanpa redeploy. |
| Konten ditulis di repo (`content/`) → divalidasi → `content:publish` ke Supabase | Ada riwayat versi + validasi, tapi tetap tidak ikut ke bundle |
| Film = **mesin slide** (GSAP Observer) di atas **satu panggung R3F** | Satu gerakan = satu shot. Kamera, cahaya, dan teks digerakkan oleh indeks slide. |
| Objek 3D dibuat **prosedural di kode** (lathe, extrude SVG, data OSM/DEM) | Lisensi bersih, mudah diubah, tanpa ketergantungan aset pihak ketiga |
| Tier kualitas adaptif berdasarkan FPS terukur | HP flagship tetap mendapat efek lengkap, tanpa menebak dari merek perangkat |
| Mode Today terpisah, **tanpa WebGL**, offline | Info selama trip harus cepat dan tahan sinyal lemah |

## Grafik Dependensi
```
[1 Gong preview] [2 Gunungan preview] [3 Motion Framer] [4 Token & styleframe]      ← Fase 0 (desain)
        │                 │                  │                  │
        │                 │                  └────────┬─────────┘
        │                 │                           ▼
        │                 │      [7 Scaffold] → [8 Schema & konten] → [9 Supabase DB] → [10 verify-access] → [11 trip-data + publish]
        │                 │                                                                     │
        │                 │                                              [12 Gate UI + token] ◄─┘ → [13 Deploy + keep-alive]
        │                 │                                                     │
        │                 │                          ┌──────────────────────────┴───────────────┐
        │                 │                          ▼                                          ▼
        │                 │            [14 Logika Today] → [15 UI Today] → [16 PWA]    [17 Mesin slide] → [18 Slide dari data] → [19 Gallery + detail] → [20 Calm & nav]
        │                 │                                                                     │
        │                 │       [5 Shot list] → [6 Sourcing foto] → [21 Pipeline foto] → [22 Depth & mask]   (paralel sejak Fase 1)
        │                 │                                                                     │
        ▼                 ▼                                                                     ▼
   [24 Gong produksi] [25 Gunungan + gate] ◄── [23 Panggung R3F + shot + tier] ◄────────────────┘
        │                 │                           │
        └────────┬────────┘          [26 Siklus waktu & post-FX] → [27 Benang emas] → [28 Diorama] → [29 Lawu] → [30 Canting] → [31 Partikel]
                 ▼
   [32 Boarding pass] → [33 Credits] → [34 Polish interaksi] → [35 OG & pesan WA] → ([36 Audio, P2])
                 ▼
   [37 Uji perangkat] → [38 A11y & proofread] → [39 Verifikasi fakta H-14] → [40 Runbook H-5 → H-3 kirim]
```

## Fase & Indeks Tugas
| Fase | Periode | Tugas | Checkpoint |
|---|---|---|---|
| **0. Desain & prototipe** | 9 Nov – 13 Des 2026 | 1 Gong preview · 2 Gunungan preview · 3 Prototipe motion (Framer) · 4 Token & styleframe · 5 Draf konten & shot list · 6 Sourcing foto (berlanjut) | **CP0:** host menyetujui gong, gunungan, rasa motion, dan token |
| **1. Fondasi & akses** | 30 Nov – 20 Des 2026 | 7 Scaffold & CI · 8 Schema & konten · 9 Supabase DB · 10 `verify-access` · 11 `trip-data` & publish · 12 Gate UI & token · 13 Deploy & keep-alive | **CP1:** gate jalan di HP nyata, data hanya keluar lewat token, CI hijau |
| *Buffer* | 21 Des 2026 – 3 Jan 2027 | — | — |
| **2. Today** | 4 – 17 Jan 2027 | 14 Logika Today · 15 UI Today · 16 PWA offline | **CP2:** Today teruji di iPhone & Android, termasuk mode pesawat |
| **3. Film 2D** | 18 – 31 Jan 2027 | 17 Mesin slide · 18 Slide dari data · 19 Gallery & detail · 20 Calm & navigasi | **CP3:** film bisa diikuti dari awal sampai akhir, 1 gerakan = 1 slide |
| **4. Aset** (paralel) | Des 2026 – Feb 2027 | 21 Pipeline foto & credits · 22 Depth map & mask | Masuk ke CP3/CP5 |
| **5. Film 3D** | 1 Feb – 14 Mar 2027 | 23 Panggung R3F & tier · 24 Gong produksi · 25 Gunungan & gate · 26 Siklus waktu & post-FX · 27 Benang emas · 28 Diorama · 29 Lawu · 30 Canting · 31 Partikel | **CP5:** S1–S2 tercapai dengan semua inti 3D aktif |
| **6. Finale & polish** | 15 – 21 Mar 2027 | 32 Boarding pass · 33 End credits · 34 Polish interaksi · 35 OG & pesan WA · 36 Audio (P2) | **CP6:** semua baris matriks efek PRD §8 terpenuhi |
| **7. QA & kirim** | 22 Mar – 7 Apr 2027 | 37 Uji perangkat · 38 A11y & proofread · 39 Verifikasi fakta · 40 Runbook H-5 → H-3 | **CP7:** semua ukuran keberhasilan PRD §4 hijau, tamu berhasil masuk |

## Peluang Paralel
- **Aman diparalelkan:** sourcing foto (6, 21, 22) berjalan sepanjang Fase 1–3. Pemodelan gong dan gunungan untuk produksi (24, 25) bisa dimulai setelah CP0, paralel dengan Fase 1–3. Today (Fase 2) dan mesin slide (17) hanya bergantung pada Tugas 12.
- **Harus berurutan:** 9 → 10 → 11 (skema DB lalu fungsi), 17 → 18 → 19 (mesin slide lalu isinya), 23 → 26 (panggung lalu cahaya).
- **Kontrak dulu, baru paralel:** bentuk JSON `trip-data` (Tugas 11) dikunci sebelum Today (14) dan film (18) mengonsumsinya.

## Tugas yang Butuh Izin atau Tindakan Host
| Tugas | Yang dibutuhkan |
|---|---|
| 3 | Izin membuat **project Framer baru** |
| 6, 22, 28, 29 | **Akses jaringan** ke situs foto/data (Wikimedia, Openverse, Overpass/OSM, DEM, bobot model), atau host yang mengunduh |
| 9 | Izin membuat **project Supabase baru** (paket gratis) |
| 13 | Host menautkan repo ke **Vercel** sekali (atau memilih GitHub Pages) |
| 36 | Persetujuan Q11 + pemakaian **kredit ElevenLabs** |
| 37 | Akses ke **iPhone & Android flagship** (Q10) |
| 40 | Revisi isi di **H-5** |

## Definition of Done (berlaku untuk setiap tugas)
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, dan `pnpm content:check` lolos (setelah Tugas 7–8 ada)
- Setiap teks yang tampil punya EN **dan** ID
- Tidak ada secret, kode akses, atau data pribadi di repo
- Info itinerary tetap ada di DOM (tidak hanya di canvas)
- Reduced motion dihormati
- Anggaran performa PRD §12.1 tidak dilanggar
- Commit dengan pesan yang jelas, di-push ke branch kerja

## Risiko Utama (detail di PRD §17)
| Risiko | Dampak | Mitigasi di rencana ini |
|---|---|---|
| Gong/gunungan buatan kode kurang memuaskan | Tinggi | Tugas 1–2 paling awal + CP0. Cadangan: vektor berlisensi atau ilustrator. |
| Jaringan sesi memblokir sumber foto/data | Sedang | Diangkat di Tugas 6 sejak awal, ada jalur "host mengunduh" |
| Navigasi slide melawan trackpad/swipe | Sedang | Tugas 17 punya tes 1-gerakan-1-slide + kalibrasi di perangkat nyata (CP3) |
| Performa 6 inti 3D di HP | Tinggi | Tugas 23 (tier) dibangun sebelum objek. FPS dicek di setiap tugas Fase 5. |
| Supabase gratis ter-pause | Tinggi saat trip | Tugas 13 (keep-alive) + cek di runbook Tugas 40 |

## Pertanyaan Terbuka
Q7–Q14 di PRD §18 tetap terbuka, masing-masing dengan default. Tidak ada yang menghalangi Fase 0–1.
