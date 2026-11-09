# Backend: Supabase `itinerary-solo`

Project `qanjzavzbisvpmeihqee`, region ap-southeast-1 (Singapura), paket free, org "dashboard".
URL fungsi: `https://qanjzavzbisvpmeihqee.supabase.co/functions/v1/<nama>`.

Tidak ada data privat di file ini. Semua contoh di bawah memakai nilai dummy.

## Tabel

| Tabel | Isi | Diisi oleh |
|---|---|---|
| `trip_content` | Itinerary non-privat (hasil `content:check`), manifest foto, `ends_on`, `checksum` | `pnpm content:publish` |
| `trip_private` | Data privat per trip, kolom `guest` dan `team` | Host, lewat Table Editor / SQL Editor di dashboard |
| `access_attempts` | Log percobaan kode (IP di-HMAC) untuk rate limit | `verify-access`, otomatis dibersihkan setelah 1 hari |

RLS aktif di ketiga tabel **tanpa policy**, dan semua hak `anon` / `authenticated` dicabut.
Klien tidak pernah membaca tabel langsung. Advisor menampilkan `rls_enabled_no_policy` (INFO): itu disengaja.

### Bentuk `trip_private`

`guest` dikirim ke tamu **dan** tim. `team` hanya dikirim ke token tim (untuk token tamu kolom ini bahkan tidak di-SELECT).
Kunci `stops` dipetakan ke `id` stop di `content/trips/solo/trip.ts`.

```jsonc
// guest
{
  "party":   { "name": "…", "short": "…", "size": 1, "greeting": { "en": "Welcome, …", "id": "Selamat datang, …" } },
  "lodging": { "name": "…", "address": "…", "mapsUrl": "https://maps.google.com/…" },
  "contacts": [
    { "label": { "en": "Host", "id": "Host" }, "whatsapp": "+62…" },
    { "label": { "en": "Guide", "id": "Guide" }, "whatsapp": "+62…", "phone": "+62…" },
    { "label": { "en": "Translator", "id": "Penerjemah" }, "phone": "+62…" }
  ],
  "stops": { "check-in": { "pickup": "18:30 · lobby", "address": "…", "mapsUrl": "https://maps.google.com/…" } }
}

// team
{
  "medical": "…",
  "guestContacts": [ "…" ],
  "notes": "…",
  "stops": { "keraton-kasunanan": { "teamNote": "Beli tiket di loket timur", "estCost": 50000 } }
}
```

`party.name` tampil di tiket pribadi, `party.short` di sapaan gerbang ("Sugeng rawuh, …"), `party.greeting` di Today.

Dipakai Today (Fase 2):
- `contacts` → bilah kontak di bawah layar (maks. 3). `whatsapp` membuka wa.me dengan pesan EN yang sudah terisi
  ("Hi! It’s [panggilan], messaging from the Today page."); tanpa `whatsapp`, tombolnya menelepon `phone`.
  Nomor boleh ditulis `08…` atau `+62…`. Semua kontak juga muncul sebagai tombol telepon di sheet darurat.
- `lodging` → sheet darurat ("Where you’re staying") dengan tombol Maps & salin alamat.
- `stops[id].pickup` → tampil langsung di kartu Next ("Pickup 18:30 · lobby"), tanpa ketukan.
  `stops[id].address` / `mapsUrl` menggantikan query Maps publik untuk tombol Maps & salin alamat.
- Kolom yang kosong cukup tidak tampil (mis. tanpa `contacts`, bilah hanya berisi tombol Emergency).

`team` (hanya token tim): `medical`, `partyNote`, `preferences` (string) tampil di kartu "Catatan tim" di Today.
Nama tamu hanya ada di sini (bukan di repo/bundle).

Di respons `trip-data`, isi `guest.stops[id]` muncul sebagai `stop.private`, dan `team.stops[id]` muncul sebagai `stop.teamNote` / `stop.estCost` (khusus tim).
Ubah `updated_at` ke `now()` setiap kali mengedit, supaya ETag berganti dan Today mengambil data baru.

Today menyimpan respons trip-data terakhir di perangkat (`localStorage["lakon.trip"]`, terikat ke token), mengirim
`If-None-Match` saat membuka lagi (304 → salinan dipakai), dan menampilkan salinan itu bila offline ("Offline · saved …").
Salinan dihapus bersama sesi (tombol *Use a different code*) atau bila token ditolak (401). Service worker
(`public/sw.js`) sengaja tidak menyimpan respons trip-data, supaya data peran tim tidak pernah tersaji untuk peran tamu.

## Edge Functions

Ketiganya `verify_jwt = false` karena melakukan autentikasi sendiri.

| Fungsi | Metode | Respons |
|---|---|---|
| `verify-access` | `POST {"code": "…"}` | 200 `{token, role, exp}` · 401 `{error:"wrong_code", remaining}` · 429 `{error:"locked", retryAfter}` · 503 `not_configured` / `not_published` · 410 `trip_ended` |
| `trip-data` | `GET`, `Authorization: Bearer <token>` | 200 data trip per peran + `ETag` · 304 jika `If-None-Match` cocok · 401 `no_token` / `bad_token` / `expired` |
| `health` | `GET` | 200 `{ok:true}` (menyentuh DB, untuk keep-alive) |

Kode bersama ada di `supabase/functions/_shared/` dan tanpa dependency (Web Crypto saja), jadi juga dites lewat Vitest
(`tests/unit/access.test.ts`, `tests/unit/role-filter.test.ts`).

### Aturan akses
- Kode dinormalisasi (huruf besar, hanya A–Z dan 0–9, karakter lebar penuh disamakan), harus 6–32 karakter.
- Hash: PBKDF2-SHA256, 210.000 iterasi, salt acak per kode. Dibandingkan waktu-konstan. Hash tamu dan tim selalu dihitung keduanya.
- Rate limit per IP (di-HMAC): jeda 250 ms → 2 dtk, lalu 5 kali salah berturut-turut → terkunci 30 dtk. Kode benar mereset.
- Token: HMAC-SHA256 `{v, role, trip, iat, exp}`, berlaku sampai `ends_on` 23:59 WIB + 30 hari.
- CORS: hanya origin di `DEFAULT_ORIGINS` (`_shared/http.ts`) atau secret `ALLOWED_ORIGINS` (dipisah koma).

## Secret akses (Supabase Vault)

Hash kode dan kunci token disimpan di **Supabase Vault** (terenkripsi di database). Edge Function membacanya lewat RPC
`public.access_config()` yang hanya bisa dipanggil service role (anon/authenticated ditolak, sudah dites), lalu menyimpannya
60 dtk per instance. Jadi perubahan di Vault berlaku **≤ 1 menit**, tanpa deploy ulang.

| Nama di Vault | Isi |
|---|---|
| `ACCESS_GUEST_HASH` | hasil `pnpm -s access:hash` untuk kode booking tamu |
| `ACCESS_TEAM_HASH` | hasil `pnpm -s access:hash` untuk kode tim |
| `TOKEN_SECRET` | dibuat acak **di dalam database** (tidak pernah tampil di mana pun). Mengganti nilainya = mencabut semua token |

Secret Edge Function dengan nama yang sama (dashboard → Edge Functions → Secrets) tetap dibaca dan **menang** atas Vault,
untuk keadaan darurat. Saat ini kosong. Secret lain yang opsional: `ALLOWED_ORIGINS` (domain produksi, Tugas 13) dan
`TRIP_ID` (default `solo-2027`).

Mengganti kode (SQL Editor di dashboard, atau lewat connector):

```sql
-- Kode tamu baru: tempel hasil `pnpm -s access:hash` (kode aslinya sendiri tidak pernah disimpan).
select vault.update_secret(id, 'pbkdf2-sha256$210000$…') from vault.secrets where name = 'ACCESS_GUEST_HASH';
-- Kode tim baru:
select vault.update_secret(id, 'pbkdf2-sha256$210000$…') from vault.secrets where name = 'ACCESS_TEAM_HASH';
-- Cabut semua token (semua perangkat harus memasukkan kode lagi):
select vault.update_secret(id, translate(encode(extensions.gen_random_bytes(48), 'base64'), '+/=', '-_'))
  from vault.secrets where name = 'TOKEN_SECRET';
```

**Panjang kode: 9 huruf/angka** (tanda hubung boleh, mis. `SLO-7K2P9Q`), karena gerbang menampilkan 9 kotak. `pnpm -s access:hash`
menolak kode dengan panjang lain. Kalau ingin panjang lain, build dengan `NEXT_PUBLIC_CODE_LENGTH`.

Untuk pengembangan: `pnpm -s access:hash --dev` membuat kode dev acak dan menulis hash-nya ke `.secrets.local.md`
(di-gitignore). Sekarang terpasang kode dev (`DEV-…` / `TIM-…`). **Sebelum serah terima, ganti dengan kode booking asli.**

## Operasional

```bash
pnpm content:check          # validasi
pnpm content:publish        # dengan .env.local berisi SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY → upsert langsung
                            # tanpa env → menulis .publish/trip_content.sql untuk SQL Editor
pnpm -s access:hash         # ketik kode → hash untuk ACCESS_*_HASH di Vault
```

Checklist H-4 dan H-1: status project ACTIVE (`health` 200), kode asli sudah dipasang, `content:check --strict` lolos.
