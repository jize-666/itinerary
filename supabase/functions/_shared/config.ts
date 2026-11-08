/**
 * Secret akses: hash kode tamu/tim + kunci token. Sumbernya Secret Edge Function (dashboard) atau Supabase Vault.
 * Bagian ini murni (tanpa Deno) supaya bisa dites di Vitest; pemuatnya ada di secrets.ts.
 */
export type AccessConfig = { guestHash: string; teamHash: string; tokenSecret: string };
export type AccessConfigInput = Partial<Record<keyof AccessConfig, string | null | undefined>>;

/** Per kunci: Secret dashboard menang atas Vault (untuk darurat/override). Null bila belum lengkap. */
export function resolveConfig(env: AccessConfigInput, vault: AccessConfigInput): AccessConfig | null {
  const pick = (k: keyof AccessConfig) => env[k]?.trim() || vault[k]?.trim() || "";
  const cfg = { guestHash: pick("guestHash"), teamHash: pick("teamHash"), tokenSecret: pick("tokenSecret") };
  if (!cfg.guestHash || !cfg.teamHash || cfg.tokenSecret.length < 32) return null;
  return cfg;
}

export const isComplete = (c: AccessConfigInput) => Boolean(c.guestHash && c.teamHash && c.tokenSecret);
