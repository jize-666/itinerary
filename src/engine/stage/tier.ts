/**
 * Tier kualitas panggung 3D (PRD §12.2) dan pengaturnya. Murni: tanpa DOM, tanpa three.
 *
 * Hanya dua tingkat kualitas: Ultra dan High. `static` bukan tingkat kualitas, melainkan jalan keluar (tanpa WebGL2
 * atau renderer perangkat lunak → film 2,5D). Keputusan host 27 Nov: tablet flagship terlihat buram karena tangga
 * lama menurunkan resolusi dan efek; "guasa ada medium dan low". Resolusi tidak pernah diperkecil saat berjalan.
 *
 * Tier awal ditebak dari perangkat (`guessTier`): desktop dengan GPU kuat → Ultra, selebihnya (semua HP dan tablet)
 * → High. `createGovernor` hanya boleh satu langkah: Ultra turun ke High bila rata-rata < 45 fps selama ±3 dtk
 * (sesudah pemanasan), dan kembali ke Ultra bila ≥ 58 fps bertahan 8 dtk, dengan jeda supaya tidak bolak-balik.
 * Di bawah High tidak ada apa-apa: 25–50 fps di HP kelas menengah diterima host.
 *
 * Layar yang dibatasi 30 Hz (Low Power Mode iOS) dikenali dari jarak antar frame yang rapat di ±33 ms; di sana
 * ambangnya ikut dibagi dua, jadi 30 fps yang stabil tidak dianggap berat.
 */

/**
 * `lite` = mode uji (e2e, renderer perangkat lunak); tidak pernah dipilih untuk tamu. Hanya bisa dicapai lewat
 * `?stage=lite`: `guessTier` dan pengatur tidak pernah memilihnya. Nilainya biaya Low yang lama.
 */
export type Tier = "ultra" | "high" | "lite" | "static";

export type TierSpec = Readonly<{
  /** Batas atas device pixel ratio kanvas. */
  dpr: number;
  /** Batas bawah: layar 1× digambar lebih rapat (supersampling). 0 = ikut kerapatan layar. */
  dprMin: number;
  /** Sampel MSAA pada target HDR (0 = tanpa). */
  msaa: 0 | 2 | 4;
  /** Jumlah tingkat mip bloom (0 = bloom mati). */
  bloom: number;
  /** Sisi shadow map dalam px (0 = tanpa bayangan dinamis). */
  shadow: number;
  /** Pengali jumlah partikel (1 = jumlah penuh). */
  particles: number;
  /** Saat diam, gambar tiap N frame layar (1 = tiap frame). */
  idleEvery: number;
  /** Depth of field. */
  dof: boolean;
}>;

export const TIER: Readonly<Record<Exclude<Tier, "static">, TierSpec>> = {
  high: { dpr: 2, dprMin: 0, msaa: 4, bloom: 5, shadow: 2048, particles: 1, idleEvery: 1, dof: true },
  ultra: { dpr: 2.5, dprMin: 1.5, msaa: 4, bloom: 6, shadow: 4096, particles: 1, idleEvery: 1, dof: true },
  // mode uji (e2e, renderer perangkat lunak); tidak pernah dipilih untuk tamu
  lite: { dpr: 1, dprMin: 0, msaa: 0, bloom: 3, shadow: 0, particles: 0.15, idleEvery: 2, dof: false },
};

/** Rasio piksel kanvas untuk `spec` di layar berkerapatan `native`. */
export const dprFor = (spec: TierSpec, native: number): number => Math.min(spec.dpr, Math.max(spec.dprMin, native > 0 ? native : 1));

/**
 * Nama tier dari `?stage=`: ultra, high, static; `medium` dan `low` (tautan lama) menjadi high. `lite` hanya untuk
 * uji (mode uji, tidak pernah dipilih untuk tamu).
 */
export function parseTier(raw: string | null | undefined): Tier | undefined {
  if (raw === "ultra" || raw === "high" || raw === "lite" || raw === "static") return raw;
  if (raw === "medium" || raw === "low") return "high";
  return undefined;
}

export type Caps = Readonly<{
  webgl2: boolean;
  /** UNMASKED_RENDERER_WEBGL (atau RENDERER bila ekstensi tidak ada). */
  renderer: string;
  /** Layar sentuh berukuran HP/tablet. */
  mobile: boolean;
  /** navigator.hardwareConcurrency (0 bila tidak diketahui). */
  cores: number;
  /** navigator.deviceMemory dalam GB (0 bila tidak diketahui; Safari tidak memberi). */
  memory: number;
}>;

const SOFTWARE = /swiftshader|llvmpipe|software|basic render|microsoft basic/i;
const HIGH_DESKTOP = /apple m\d|nvidia|geforce|rtx|gtx|radeon rx|radeon pro|arc\(tm\)|intel\(r\) arc/i;

/**
 * Tier awal. Tanpa WebGL2 atau dengan renderer perangkat lunak → Static (film 2,5D): menggambar 3D di CPU selalu
 * patah-patah. Desktop (bukan layar sentuh) dengan GPU kuat, memori ≥ 8 GB dan ≥ 8 inti (atau tidak diketahui) →
 * Ultra. Selebihnya, termasuk semua HP dan tablet dan laptop dengan GPU terpadu → High.
 */
export function guessTier(caps: Caps): Tier {
  if (!caps.webgl2 || SOFTWARE.test(caps.renderer)) return "static";
  if (caps.mobile || !HIGH_DESKTOP.test(caps.renderer)) return "high";
  const memoryOk = !(caps.memory > 0) || caps.memory >= 8;
  const coresOk = !(caps.cores > 0) || caps.cores >= 8;
  return memoryOk && coresOk ? "ultra" : "high";
}

export const GOVERNOR = {
  /** Jendela rata-rata (ms). */
  window: 3000,
  /** Sesudah mulai atau ganti tier, frame awal diabaikan (kompilasi shader, alokasi target). */
  warmup: 1500,
  /** Ultra turun ke High bila rata-rata fps di bawah ini (pada layar 60 Hz). */
  downBelow: 45,
  /** Naik kembali ke Ultra bila rata-rata fps setidaknya ini… */
  upAtLeast: 58,
  /** …selama ini (ms)… */
  upHold: 8000,
  /** …dan paling cepat sekian ms sesudah perubahan terakhir. */
  upCooldown: 20000,
  /** Naik lalu turun lagi dalam waktu ini = Ultra memang terlalu berat di sini: jangan dicoba lagi. */
  retreat: 12000,
  /** Jeda antar frame di atas ini bukan data kehalusan (tab baru kembali, GC besar): jendela dimulai ulang. */
  hitch: 250,
} as const;

export type Governor = {
  /** Catat satu frame: `dt` = jarak dari frame sebelumnya (ms), `now` = jam (ms). Mengembalikan tier baru bila berubah. */
  sample(dt: number, now: number): Tier | null;
  /** Tier sekarang. */
  tier(): Tier;
  /** fps rata-rata jendela terakhir (0 bila belum cukup data). */
  fps(): number;
  /** Layar terdeteksi dibatasi ±30 Hz. */
  capped(): boolean;
  /** Mulai ulang jendela (tab kembali terlihat, adegan berat baru dimuat). */
  rest(now: number): void;
  /** Ultra sedang turun ke High: fps rata-rata saat diturunkan (0 bila tidak). */
  fell(): number;
};

/**
 * `start` = tier awal; `locked` = tier dipaksa (uji, `?stage=`): pengatur hanya mengukur, tidak pernah pindah.
 * Tier tertinggi yang boleh dipulihkan adalah `start`; di bawah High tidak ada langkah dan Static tidak pernah dipilih.
 */
export function createGovernor(start: Tier, now: number, locked = false): Governor {
  let at: Tier = start;
  let since = now;
  let lastUp = -Infinity;
  /** Sudah naik lalu turun lagi dalam `retreat`: Ultra tidak dicoba lagi. */
  let noUltra = false;
  let fell = 0;
  let goodSince: number | null = null;
  /** Cincin sampel [waktu, dt]. */
  let times: number[] = [];
  let dts: number[] = [];
  let sum = 0;
  let fps = 0;
  let capped = false;

  const reset = (t: number) => {
    times = [];
    dts = [];
    sum = 0;
    fps = 0;
    since = t;
    goodSince = null;
  };
  const move = (to: Tier, t: number): Tier => {
    at = to;
    reset(t);
    return at;
  };

  return {
    tier: () => at,
    fps: () => fps,
    capped: () => capped,
    rest: (t) => reset(t),
    fell: () => (start === "ultra" && at === "high" ? fell : 0),
    sample(dt, t) {
      if (at === "static") return null;
      if (!(dt > 0) || dt > GOVERNOR.hitch) {
        reset(t);
        return null;
      }
      if (t - since < GOVERNOR.warmup) return null;
      times.push(t);
      dts.push(dt);
      sum += dt;
      while (times.length > 1 && t - times[0]! > GOVERNOR.window) {
        times.shift();
        sum -= dts.shift()!;
      }
      const span = t - times[0]! + dts[0]!;
      if (span < GOVERNOR.window * 0.85) return null;
      fps = (1000 * dts.length) / sum;
      // layar ±30 Hz: hampir semua frame berjarak 31–36 ms
      const near30 = dts.reduce((n, d) => n + (d >= 30 && d <= 37 ? 1 : 0), 0);
      capped = near30 >= dts.length * 0.9;
      const k = capped ? 0.5 : 1;
      if (locked) return null;

      if (at === "ultra") {
        if (fps >= GOVERNOR.downBelow * k) return null;
        fell = Math.round(fps);
        if (t - lastUp < GOVERNOR.retreat) noUltra = true;
        return move("high", t);
      }
      // di layar 30 Hz tidak terlihat apakah masih ada ruang, jadi tidak pernah naik di sana
      if (start === "ultra" && !noUltra && !capped && fps >= GOVERNOR.upAtLeast) {
        goodSince ??= t;
        if (t - goodSince >= GOVERNOR.upHold && t - since >= GOVERNOR.upCooldown) {
          lastUp = t;
          return move("ultra", t);
        }
      } else goodSince = null;
      return null;
    },
  };
}
