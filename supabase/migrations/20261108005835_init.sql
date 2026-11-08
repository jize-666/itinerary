-- Lakon Tiga Hari: skema awal (PRD §12.5, §13.6).
-- Klien (anon / authenticated) TIDAK PERNAH membaca tabel ini. RLS aktif tanpa policy + hak akses dicabut.
-- Hanya Edge Function (service role, di server) yang membaca lalu memfilter per peran.

create table public.trip_content (
  trip_id      text primary key check (trip_id ~ '^[a-z0-9-]+$'),
  content      jsonb not null,
  manifest     jsonb not null default '[]'::jsonb,
  ends_on      date not null,
  checksum     text not null,
  published_at timestamptz not null default now()
);
comment on table public.trip_content is
  'Konten itinerary non-privat. Diunggah oleh `pnpm content:publish` setelah content:check lolos. Jangan diedit manual.';

create table public.trip_private (
  trip_id    text primary key references public.trip_content (trip_id) on delete cascade,
  guest      jsonb not null default '{}'::jsonb,
  team       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
comment on table public.trip_private is
  'Data privat, diisi host lewat dashboard/SQL, tidak pernah lewat repo. Bentuk kolom: docs/backend.md.';
comment on column public.trip_private.guest is
  'Terkirim ke tamu DAN tim: nama sapaan, penginapan, kontak host/driver, info jemput per stop.';
comment on column public.trip_private.team is
  'HANYA untuk peran team: teamNote & estCost per stop, catatan medis, kontak tamu. Tidak pernah dikirim ke token tamu.';

create table public.access_attempts (
  id      bigint generated always as identity primary key,
  ip_hash text not null,
  ok      boolean not null,
  role    text check (role in ('guest', 'team')),
  at      timestamptz not null default now()
);
comment on table public.access_attempts is
  'Log percobaan kode untuk rate limit. IP disimpan sebagai HMAC, bukan alamat asli. Baris > 1 hari dihapus otomatis oleh verify-access.';
create index access_attempts_ip_at on public.access_attempts (ip_hash, at desc);
create index access_attempts_at on public.access_attempts (at);

alter table public.trip_content    enable row level security;
alter table public.trip_private    enable row level security;
alter table public.access_attempts enable row level security;

revoke all on table public.trip_content, public.trip_private, public.access_attempts from anon, authenticated;
revoke all on sequence public.access_attempts_id_seq from anon, authenticated;
