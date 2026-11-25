/**
 * Kain batik buatan tamu, disimpan di perangkat (IndexedDB) supaya epilog film
 * bisa menampilkannya. Tanpa server. Bila penyimpanan tidak ada atau diblokir
 * (mode privat Safari, SSR), semua fungsi diam-diam mengembalikan null/false.
 */

/** Kain yang dibatik tamu (sudah dibaca dari perangkat). */
export type ClothKeepsake = { blob: Blob; width: number; height: number; at: number };
/** Bentuk yang disimpan di IndexedDB (ArrayBuffer, bukan Blob: Safari lama gagal menyimpan Blob). */
export type ClothRecord = {
  v: 1;
  type: "image/jpeg" | "image/webp" | "image/png";
  bytes: ArrayBuffer;
  width: number;
  height: number;
  at: number;
};

export const KEEPSAKE_LIMIT = 4_000_000; // byte

const DB_NAME = "lakon";
const STORE = "keepsake";
const KEY = "batik";
const OPEN_TIMEOUT = 3000;
const TYPES = ["image/jpeg", "image/webp", "image/png"];

function dimOk(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 16 && n <= 4096;
}

/** Validasi murni. */
export function isClothRecord(x: unknown): x is ClothRecord {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return false;
  const r = x as Record<string, unknown>;
  if (r.v !== 1) return false;
  if (typeof r.type !== "string" || !TYPES.includes(r.type)) return false;
  if (!(r.bytes instanceof ArrayBuffer)) return false;
  if (r.bytes.byteLength < 1 || r.bytes.byteLength > KEEPSAKE_LIMIT) return false;
  if (!dimOk(r.width) || !dimOk(r.height)) return false;
  return typeof r.at === "number" && Number.isFinite(r.at) && r.at > 0;
}

/** Buka basis data; null bila tidak bisa atau macet lebih dari 3 dtk. */
function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    let done = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (db: IDBDatabase | null) => {
      if (done) {
        // sudah menyerah (timeout): tutup sambungan yang telat jadi
        db?.close();
        return;
      }
      done = true;
      if (timer) clearTimeout(timer);
      resolve(db);
    };
    try {
      if (typeof indexedDB === "undefined" || !indexedDB) return resolve(null);
      timer = setTimeout(() => finish(null), OPEN_TIMEOUT);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        try {
          if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
        } catch {
          /* dibiarkan, onerror/onsuccess menyusul */
        }
      };
      req.onsuccess = () => finish(req.result);
      req.onerror = () => finish(null);
      req.onblocked = () => finish(null);
    } catch {
      finish(null);
    }
  });
}

/** Jalankan satu operasi pada object store, lalu tutup sambungan. */
async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<{ ok: boolean; value: T | undefined }> {
  const db = await openDb();
  if (!db) return { ok: false, value: undefined };
  try {
    return await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, mode);
        const req = run(tx.objectStore(STORE));
        let value: T | undefined;
        req.onsuccess = () => {
          value = req.result;
          if (mode === "readonly") resolve({ ok: true, value });
        };
        req.onerror = () => resolve({ ok: false, value: undefined });
        tx.oncomplete = () => resolve({ ok: true, value });
        tx.onerror = () => resolve({ ok: false, value: undefined });
        tx.onabort = () => resolve({ ok: false, value: undefined });
      } catch {
        resolve({ ok: false, value: undefined });
      }
    });
  } finally {
    try {
      db.close();
    } catch {
      /* abaikan */
    }
  }
}

// Cache baca per halaman.
let cached: Promise<ClothKeepsake | null> | null = null;
let urlCache: { cloth: ClothKeepsake; url: string } | null = null;
let urlPromise: Promise<string | null> | null = null;

function resetCache() {
  cached = null;
  urlPromise = null;
  if (urlCache) {
    try {
      URL.revokeObjectURL(urlCache.url);
    } catch {
      /* abaikan */
    }
    urlCache = null;
  }
}

/** Simpan (menimpa yang lama). true bila tersimpan. Mengosongkan cache baca. */
export async function saveCloth(
  blob: Blob,
  width: number,
  height: number,
  at: number = Date.now(),
): Promise<boolean> {
  try {
    if (typeof indexedDB === "undefined" || !indexedDB) return false;
    if (!blob || !TYPES.includes(blob.type)) return false;
    if (blob.size < 1 || blob.size > KEEPSAKE_LIMIT) return false;
    if (!dimOk(width) || !dimOk(height)) return false;
    const rec: ClothRecord = {
      v: 1,
      type: blob.type as ClothRecord["type"],
      bytes: await blob.arrayBuffer(),
      width,
      height,
      at,
    };
    if (!isClothRecord(rec)) return false;
    const res = await withStore("readwrite", (s) => s.put(rec, KEY));
    resetCache();
    return res.ok;
  } catch {
    return false;
  }
}

async function load(): Promise<ClothKeepsake | null> {
  try {
    const res = await withStore<unknown>("readonly", (s) => s.get(KEY));
    if (!res.ok || !isClothRecord(res.value)) return null;
    const rec = res.value;
    return {
      blob: new Blob([rec.bytes], { type: rec.type }),
      width: rec.width,
      height: rec.height,
      at: rec.at,
    };
  } catch {
    return null;
  }
}

/** Baca kain tersimpan; null bila tidak ada, tidak valid, atau penyimpanan tidak bisa dibuka. */
export function readCloth(): Promise<ClothKeepsake | null> {
  if (!cached) cached = load();
  return cached;
}

/** URL objek untuk <img>; dibuat sekali per kain. */
export function clothUrl(): Promise<string | null> {
  if (urlPromise) return urlPromise;
  const p: Promise<string | null> = readCloth().then((cloth) => {
    if (!cloth) return null;
    if (urlCache && urlCache.cloth === cloth) return urlCache.url;
    try {
      const url = URL.createObjectURL(cloth.blob);
      if (urlPromise !== p) {
        URL.revokeObjectURL(url); // kain diganti selagi menunggu
        return null;
      }
      urlCache = { cloth, url };
      return url;
    } catch {
      return null;
    }
  });
  urlPromise = p;
  return p;
}

/** Hapus kain tersimpan (dipakai tes). */
export async function clearCloth(): Promise<void> {
  try {
    await withStore("readwrite", (s) => s.delete(KEY));
  } catch {
    /* abaikan */
  }
  resetCache();
}
