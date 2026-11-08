/**
 * Bentuk kode booking di gerbang. Harus sama dengan normalisasi server (supabase/functions/_shared/code.ts, dites).
 * Kode dev berformat XXX-XXXXXX (9 karakter). Kode booking asli juga 9 huruf/angka, atau ubah lewat env saat build.
 */
const envNum = (v: string | undefined, d: number) => (v && /^\d+$/.test(v) ? Number(v) : d);

export const CODE_LENGTH = envNum(process.env.NEXT_PUBLIC_CODE_LENGTH, 9);
/** Pemisah visual antar-kelompok kotak, mis. [3, 6] → "XXX-XXXXXX". */
export const CODE_GROUPS: readonly number[] = CODE_LENGTH === 9 ? [3, 6] : [CODE_LENGTH];

export function normalizeCode(raw: string): string {
  return raw.normalize("NFKC").toUpperCase().replace(/[^A-Z0-9]/g, "");
}
