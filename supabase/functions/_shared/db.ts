/**
 * Klien PostgREST minimal dengan service role (hanya di server). Tanpa dependency supaya deploy cepat dan versinya pasti.
 * RLS tetap aktif; service role melewatinya by design, anon/authenticated tidak punya hak apa pun.
 */
const URL_ = Deno.env.get("SUPABASE_URL");
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

export async function rest<T = unknown>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T> {
  if (!URL_ || !KEY) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tidak tersedia");
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      ...(init.prefer ? { Prefer: init.prefer } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`PostgREST ${res.status} ${path.split("?")[0]}: ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}
