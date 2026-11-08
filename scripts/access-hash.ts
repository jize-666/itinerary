/**
 * `pnpm access:hash`: ubah kode booking menjadi nilai secret ACCESS_GUEST_HASH / ACCESS_TEAM_HASH.
 * Kode dibaca dari stdin (bukan argumen) supaya tidak tersimpan di riwayat shell. Kode asli jangan di-commit.
 *
 *   pnpm -s access:hash            → ketik kode, Enter
 *   pnpm -s access:hash --dev      → buat kode dev acak + hash, tulis ke .secrets.local.md (di-gitignore)
 *
 * Hash disimpan di Supabase Vault (docs/backend.md → "Secret akses"). TOKEN_SECRET dibuat acak di database.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { hashCode, isPlausibleCode, normalizeCode } from "../supabase/functions/_shared/code.ts";
import { CODE_LENGTH } from "../src/lib/code.ts";

if (process.argv.includes("--dev")) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa I, O, 0, 1 supaya tidak tertukar
  const code = (prefix: string) => prefix + "-" + Array.from(randomBytes(6), (b) => alphabet[b % alphabet.length]).join("");
  const guest = code("DEV");
  const team = code("TIM");
  const md = `# Secret dev Lakon (JANGAN di-commit, file ini di-gitignore)

Dibuat ${new Date().toISOString()}. Hanya untuk pengembangan. Ganti dengan kode booking asli sebelum serah terima.

| Untuk | Nilai |
|---|---|
| Kode tamu (diketik di gate) | \`${guest}\` |
| Kode tim (diketik di gate) | \`${team}\` |

Simpan kedua hash berikut di Supabase Vault (lihat docs/backend.md → "Secret akses"). TOKEN_SECRET dibuat acak di database.

**ACCESS_GUEST_HASH**
\`\`\`
${await hashCode(guest)}
\`\`\`

**ACCESS_TEAM_HASH**
\`\`\`
${await hashCode(team)}
\`\`\`
`;
  writeFileSync(".secrets.local.md", md, { mode: 0o600 });
  writeFileSync(".env.local", `LAKON_DEV_GUEST_CODE=${guest}\nLAKON_DEV_TEAM_CODE=${team}\n`, { mode: 0o600, flag: "a" });
  console.log("Ditulis: .secrets.local.md (nilai secret) dan .env.local (kode dev untuk tes).");
} else {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const raw = await rl.question("Kode booking: ");
  rl.close();
  const n = normalizeCode(raw);
  if (!isPlausibleCode(n)) {
    console.error("Kode harus 6–32 huruf/angka setelah spasi dan tanda hubung dibuang.");
    process.exit(1);
  }
  if (n.length !== CODE_LENGTH) {
    console.error(`Gerbang punya ${CODE_LENGTH} kotak, kode ini ${n.length} karakter. Pakai ${CODE_LENGTH} huruf/angka (mis. SLO-7K2P9Q), atau build dengan NEXT_PUBLIC_CODE_LENGTH=${n.length}.`);
    process.exit(1);
  }
  console.log(await hashCode(raw));
}
