/**
 * Memuat secret akses: Secret Edge Function bila lengkap, kalau tidak dari Vault lewat RPC `access_config`
 * (khusus service role). Disimpan 60 dtk per instance, jadi kode yang diganti di Vault berlaku ≤ 1 menit.
 */
import { type AccessConfig, type AccessConfigInput, isComplete, resolveConfig } from "./config.ts";
import { rest } from "./db.ts";

const TTL_MS = 60_000;
let cache: { at: number; value: AccessConfig } | null = null;

type VaultRow = { guest_hash: string | null; team_hash: string | null; token_secret: string | null };

export async function getAccessConfig(): Promise<AccessConfig | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const env: AccessConfigInput = {
    guestHash: Deno.env.get("ACCESS_GUEST_HASH"),
    teamHash: Deno.env.get("ACCESS_TEAM_HASH"),
    tokenSecret: Deno.env.get("TOKEN_SECRET"),
  };
  let vault: AccessConfigInput = {};
  if (!isComplete(env)) {
    try {
      const row = (await rest<VaultRow[]>("rpc/access_config", { method: "POST", body: "{}" }))[0];
      vault = { guestHash: row?.guest_hash, teamHash: row?.team_hash, tokenSecret: row?.token_secret };
    } catch (e) {
      console.error("access_config", e);
    }
  }
  const value = resolveConfig(env, vault);
  if (value) cache = { at: Date.now(), value }; // yang belum lengkap tidak di-cache: begitu diisi, langsung terbaca
  return value;
}
