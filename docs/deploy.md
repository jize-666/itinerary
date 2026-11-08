# Deploy (Tugas 13)

Hosting: **Vercel Hobby** (gratis, sesuai PRD Q8). Produksi: **https://kulonuwun-solo.vercel.app** (project `kulonuwun-solo`, tim `jixx`). Situsnya statis (`next build` → `out/`); semua logika server ada di
Supabase Edge Functions, jadi Vercel hanya menyajikan file.

## Sekali saja (host)
1. Gabungkan branch kerja ke `main` lewat PR dengan **Squash and merge** (satu commit atas nama host).
2. Buka https://vercel.com/new → **Continue with GitHub** → izinkan akses ke repo `jize-666/itinerary` → **Import**.
   Pengaturan bawaan sudah benar (Next.js & pnpm terdeteksi otomatis) → **Deploy**.
3. Kirim URL produksinya (mis. `https://itinerary-xxxx.vercel.app`) ke Claude. Domain itu ditambahkan ke daftar origin
   CORS di `supabase/functions/_shared/http.ts`, lalu fungsi di-deploy ulang. Sebelum itu gerbang akan menjawab
   "Something went wrong" karena browser memblokir panggilan ke Supabase.

Setiap push ke `main` → produksi diperbarui otomatis. Push ke branch lain → URL preview (secara bawaan butuh login Vercel).

## Header (vercel.json)
`X-Robots-Tag: noindex` (FR-06), CSP yang hanya mengizinkan koneksi ke Supabase project ini, tanpa framing,
`Referrer-Policy: no-referrer`, izin gyroscope hanya untuk situs sendiri. `scripts/serve-out.mjs` memakai header yang sama,
jadi seluruh e2e berjalan di bawah CSP produksi.

## Keep-alive Supabase
`.github/workflows/keep-alive.yml` mem-ping fungsi `health` tiap 2 hari (project gratis di-pause setelah ±7 hari diam).
Jadwal GitHub hanya berjalan dari branch default, jadi aktif setelah langkah 1. Bisa dijalankan manual:
Actions → **Keep-alive Supabase** → **Run workflow**.
