/**
 * Berkas tekstur gunungan (dipanggang `scripts/assets/bake-gunungan.cjs` ke `public/film/gunungan/`). Murni: tanpa
 * three, jadi StageMount yang ringan bisa mulai mengunduhnya bersamaan dengan bundle 3D. Gunungan pembuka harus
 * tampil secepat mungkin, karena teks prolog menunggu gunungannya.
 */
const ASSETS = "/film/gunungan/";

/** Lima berkas untuk satu perangkat: warna + aux tiap muka, dan api geni. Tier tertinggi memakai gambar 2000 px. */
export function kayonFiles(large: boolean): readonly string[] {
  const size = large ? 2000 : 1500;
  return [`agung-${size}.webp`, `agung-aux-${size / 2}.webp`, `murka-${size}.webp`, `murka-aux-${size / 2}.webp`, "geni-1000.webp"];
}

const pending = new Map<string, Promise<Blob>>();

function load(name: string): Promise<Blob> {
  return fetch(ASSETS + name).then((res) => {
    if (!res.ok) throw new Error(`${name}: ${res.status}`);
    return res.blob();
  });
}

/** Mulai mengunduh semua berkas untuk tier ini (tidak menunggu). */
export function prefetchKayon(large: boolean) {
  for (const name of kayonFiles(large)) {
    if (pending.has(name)) continue;
    const p = load(name);
    p.catch(() => pending.delete(name));
    pending.set(name, p);
  }
}

/** Isi satu berkas: dari unduhan yang sudah dimulai bila ada (lalu dilepas dari ingatan), selain itu diunduh sekarang. */
export function takeKayon(name: string): Promise<Blob> {
  const p = pending.get(name);
  if (p) {
    pending.delete(name);
    return p;
  }
  return load(name);
}
