# Catatan Keputusan Desain

Catatan ini merekam keputusan visual yang sudah diambil, beserta yang masih menunggu persetujuan host.

## Status checkpoint 0 (Fase 0)
| Item | Status | Preview |
|---|---|---|
| Tugas 1: Gong ageng 3D | ⏳ menunggu persetujuan host | `prototypes/gong/scene.js` · `docs/design/previews/gong_1100.png` (kepingan berkumpul), `gong_4600.png` (pukulan gong) |
| Tugas 2: Gunungan + blencong + kelir | ⏳ menunggu persetujuan host | `prototypes/gunungan/scene.js` · `docs/design/previews/gunungan.png` |
| Tugas 3: Prototipe motion (Framer) | ⏳ sedang dikerjakan | — |

## Keputusan yang sudah diambil (7 Nov 2026)
- **Gong ageng** menjadi objek hero 3D utuh. Badan gong dibuat dengan *lathe*. Material perunggu memakai tekstur prosedural: bekas tempa, garis bubut, dan patina. **Pencu** sengaja dibuat lebih licin karena bagian itu yang sering dipukul.
- Tekstur gong memakai **UV planar dari depan**. Dengan UV *lathe* bawaan, bekas tempa meregang jadi garis radial seperti "mata".
- **Gayor memakai palang lurus**. Palang yang melengkung ke atas sempat dicoba, tapi siluetnya mirip **torii Jepang**, jadi diganti. Ornamennya: kuncup + ukel emas di tengah dan kuncup di ujung tiang.
- **Gunungan digambar di kode** (kanvas 1400×2000) dengan tiga lapisan: alpha (lubang tatahan), warna (sungging + prada), dan metal/rough (prada mengilap). Bentuknya diberi ketebalan 8 mm.
- Bayangan berpola dibuat dengan `customDepthMaterial` yang memakai `alphaMap`, sehingga **cahaya benar-benar menembus lubang tatahan**.
- **Kelir** (layar kain) memakai pencahayaan dua sisi, jadi bayangan dari blencong di belakang terlihat dari depan seperti pertunjukan wayang sungguhan.
- Gunungan ditancapkan di **gedebog**.
- **Cahaya blencong mengikuti kursor** (di HP nanti mengikuti gyroscope). Kalau tidak ada gerakan selama 3 dtk, cahaya kembali bergoyang sendiri.

## Belum masuk preview v1 (direncanakan setelah arah disetujui)
- **Dua raksasa penjaga gapura** serta **satwa** (banteng, macan, kera, burung) pada gunungan. Bentuk figuratif butuh iterasi gambar tersendiri.
- **Sisi belakang gunungan bergambar api.** Detailnya perlu dicek oleh guide/translator [V].
- Model blencong yang terlihat (saat ini nyala api hanya berupa titik cahaya).

## Cara menjalankan preview secara lokal
Skrip prototipe memakai global yang sama dengan Three.js Viewer: `THREE`, `OrbitControls`, `EffectComposer`, `RenderPass`, `UnrealBloomPass`, `canvas`, `width`, `height`. Untuk uji tangkapan layar, `window.__fixedT` bisa diisi untuk mengunci waktu animasi.
