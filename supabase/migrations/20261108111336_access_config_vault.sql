-- Secret akses (hash kode tamu/tim + kunci token) disimpan di Supabase Vault, bukan hanya di Secret Edge Function.
-- Nilainya TIDAK ada di migrasi ini; diisi lewat vault.create_secret / vault.update_secret (lihat docs/backend.md).
-- Edge Function membacanya lewat RPC ini memakai service role. anon/authenticated tidak bisa memanggilnya.
create or replace function public.access_config()
returns table (guest_hash text, team_hash text, token_secret text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'ACCESS_GUEST_HASH'),
    (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'ACCESS_TEAM_HASH'),
    (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'TOKEN_SECRET');
$$;

revoke all on function public.access_config() from public, anon, authenticated;
grant execute on function public.access_config() to service_role;
