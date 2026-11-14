/**
 * Tier kualitas panggung 3D (PRD §12.2) dan pengaturnya. Murni: tanpa DOM, tanpa three.
 *
 * Tier awal ditebak dari perangkat (`guessTier`). Sesudah itu `createGovernor` mengawasi waktu antar frame:
 * rata-rata < 50 fps selama ±3 dtk → turun satu anak tangga; stabil ≥ 58 fps → naik lagi, dengan jeda supaya
 * tidak bolak-balik. Tiap tier punya dua anak tangga: resolusi penuh dan resolusi dikecilkan. Jadi langkah
 * pertama saat berat adalah menurunkan resolusi (nyaris tak terlihat), baru kemudian mematikan efek.
 *
 * Layar yang dibatasi 30 Hz (Low Power Mode iOS) dikenali dari jarak antar frame yang rapat di ±33 ms; di sana
 * ambangnya ikut dibagi dua, jadi 30 fps yang stabil tidak dianggap berat.
 */

export type Tier = "high" | "medium" | "low" | "static";

export type TierSpec = Readonly<{
  /** Batas device pixel ratio kanvas. */
  dpr: number;
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
  /** Depth of field (hanya tier tertinggi). */
  dof: boolean;
}>;

export const TIER: Readonly<Record<Exclude<Tier, "static">, TierSpec>> = {
  high: { dpr: 2, msaa: 4, bloom: 5, shadow: 2048, particles: 1, idleEvery: 1, dof: true },
  medium: { dpr: 1.5, msaa: 2, bloom: 4, shadow: 1024, particles: 0.5, idleEvery: 1, dof: false },
  low: { dpr: 1, msaa: 0, bloom: 3, shadow: 0, particles: 0.15, idleEvery: 2, dof: false },
};

/** Anak tangga dari terberat ke teringan. `scale` = pengali resolusi di dalam tier itu. */
export type Rung = Readonly<{ tier: Tier; scale: number }>;
export const LADDER: readonly Rung[] = [
  { tier: "high", scale: 1 },
  { tier: "high", scale: 0.82 },
  { tier: "medium", scale: 1 },
  { tier: "medium", scale: 0.82 },
  { tier: "low", scale: 1 },
  { tier: "low", scale: 0.75 },
  { tier: "static", scale: 1 },
];

export const rungOf = (tier: Tier): number => LADDER.findIndex((r) => r.tier === tier);

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
/** iPhone dan iPad: Safari menamai GPU-nya "Apple GPU" saja, dan menyamarkan jumlah inti (melapor ≤ 4). */
const APPLE_MOBILE = /^apple gpu$/i;
const HIGH_MOBILE = /apple gpu|apple a1[5-9]|apple a[2-9]\d|adreno \(tm\) (7[3-9]\d|8\d\d)|adreno (7[3-9]\d|8\d\d)|immortalis|mali-g(71[05]|72\d|9\d\d)|xclipse (9[2-9]\d|[1-9]\d{3})/i;
const LOW_MOBILE = /adreno \(tm\) [1-5]\d\d|adreno [1-5]\d\d|mali-(4\d\d|t\d+|g3\d|g5[12])|powervr|videocore|vivante/i;
const HIGH_DESKTOP = /apple m\d|nvidia|geforce|rtx|gtx|radeon rx|radeon pro|arc\(tm\)|intel\(r\) arc/i;
const LOW_DESKTOP = /intel\(r\) hd graphics|intel hd graphics|gma|mesa dri intel\(r\) (hd|ivybridge|sandybridge|haswell)/i;

/**
 * Tier High dipaksa di iPhone/iPad (keputusan host 12 Nov "paksa ke high", ditegaskan 14 Nov: "paksa tier high ke
 * iphone, soalnya cuma dapet medium doang"). Dulu iPhone mulai di Medium karena Safari melaporkan ≤ 4 inti, lalu
 * pengatur FPS sempat mengecilkan resolusinya. Sekarang mulai di High dan pengatur menahannya di sana
 * (`createGovernor`, `pinned`), kecuali film benar-benar tersendat (`GOVERNOR.rescueBelow`).
 */
export function pinnedHigh(caps: Caps): boolean {
  return caps.webgl2 && caps.mobile && APPLE_MOBILE.test(caps.renderer.trim());
}

/**
 * Tier awal. Tanpa WebGL2 atau dengan renderer perangkat lunak → Static (film 2,5D): menggambar 3D di CPU
 * selalu patah-patah. HP flagship sengaja dimulai di High (PRD: "mobile flagship tidak dibuat ringan");
 * pengatur FPS yang menurunkannya bila ternyata berat. iPhone/iPad selalu High (`pinnedHigh`).
 */
export function guessTier(caps: Caps): Tier {
  if (!caps.webgl2 || SOFTWARE.test(caps.renderer)) return "static";
  if (pinnedHigh(caps)) return "high";
  const r = caps.renderer;
  let tier: Tier;
  if (caps.mobile) tier = HIGH_MOBILE.test(r) ? "high" : LOW_MOBILE.test(r) ? "low" : "medium";
  else tier = HIGH_DESKTOP.test(r) ? "high" : LOW_DESKTOP.test(r) ? "low" : "medium";
  // memori atau inti sedikit: jangan mulai dari atas
  if ((caps.memory > 0 && caps.memory <= 2) || (caps.cores > 0 && caps.cores <= 2)) return "low";
  if (tier === "high" && ((caps.memory > 0 && caps.memory <= 4) || (caps.cores > 0 && caps.cores <= 4))) return "medium";
  return tier;
}

export const GOVERNOR = {
  /** Jendela rata-rata (ms). */
  window: 3000,
  /** Sesudah mulai atau ganti anak tangga, frame awal diabaikan (kompilasi shader, alokasi target). */
  warmup: 1500,
  /** Turun bila rata-rata fps di bawah ini (pada layar 60 Hz). */
  downBelow: 50,
  /** Naik bila rata-rata fps setidaknya ini… */
  upAtLeast: 58,
  /** …selama ini (ms)… */
  upHold: 8000,
  /** …dan paling cepat sekian ms sesudah perubahan terakhir. */
  upCooldown: 20000,
  /** Naik lalu turun lagi dalam waktu ini = anak tangga di atas memang terlalu berat: jangan dicoba lagi. */
  retreat: 12000,
  /** Di Low pun di bawah ini → Static. */
  staticBelow: 20,
  /**
   * Tier High yang dipaksa (iPhone/iPad) hanya diturunkan bila fps median di bawah ini terus-menerus selama
   * `rescueHold`: film benar-benar tersendat, misalnya di iPhone lama. Median, bukan rata-rata: frame lambat sesaat
   * (tekstur diunggah, shader dikompilasi saat film dibuka) tidak menggesernya. Di atasnya pengatur hanya mengukur.
   */
  rescueBelow: 35,
  /** Lama tersendat (ms) sebelum perangkat yang dipaksa turun satu anak tangga. */
  rescueHold: 10000,
  /** Jeda antar frame di atas ini bukan data kehalusan (tab baru kembali, GC besar): jendela dimulai ulang. */
  hitch: 250,
} as const;

export type Governor = {
  /** Catat satu frame: `dt` = jarak dari frame sebelumnya (ms), `now` = jam (ms). Mengembalikan anak tangga baru bila berubah. */
  sample(dt: number, now: number): Rung | null;
  /** Anak tangga sekarang. */
  rung(): Rung;
  /** fps rata-rata jendela terakhir (0 bila belum cukup data). */
  fps(): number;
  /** Layar terdeteksi dibatasi ±30 Hz. */
  capped(): boolean;
  /** Mulai ulang jendela (tab kembali terlihat, adegan berat baru dimuat). */
  rest(now: number): void;
  /** Tier High sedang dipaksa dan dipakai (iPhone/iPad, anak tangga teratas). */
  pinned(): boolean;
  /** Perangkat yang dipaksa High sedang di bawah High: fps median saat terakhir diturunkan (0 bila tidak). */
  rescued(): number;
};

/** fps dari median jarak antar frame. */
const medianFps = (dts: readonly number[]): number => {
  const s = [...dts].sort((a, b) => a - b);
  const m = s.length % 2 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2;
  return m > 0 ? 1000 / m : 0;
};

/**
 * `start` = tier awal; `locked` = tier dipaksa (uji, `?stage=`): pengatur hanya mengukur, tidak pernah pindah.
 * `pinned` = tier High dipaksa untuk perangkat ini (iPhone/iPad), keputusan host "paksa tier high ke iphone". Aturannya
 * sendiri, bukan aturan biasa (turun di bawah 50 fps): 40–48 fps di High dianggap cukup; turun satu anak tangga
 * hanya bila fps median di bawah `GOVERNOR.rescueBelow` terus-menerus selama `GOVERNOR.rescueHold`, dan kembali naik
 * sampai High begitu lancar lagi. Keluhan host 14 Nov ("masih medium"): dulu paksaan dilepas oleh beberapa frame
 * lambat saat film dibuka, lalu aturan biasa menurunkannya sampai `medium ×0.82` dan tidak pernah kembali.
 */
export function createGovernor(start: Tier, now: number, locked = false, pinned = false): Governor {
  const forced = pinned && start === "high";
  /** Sejak kapan fps median terus di bawah ambang (perangkat yang dipaksa). */
  let slowSince: number | null = null;
  let rescued = 0;
  let at = Math.max(0, rungOf(start));
  /** Anak tangga terberat yang masih boleh dicoba. */
  let ceiling = 0;
  let since = now;
  let lastUp = -Infinity;
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
  const move = (to: number, t: number): Rung => {
    at = to;
    reset(t);
    return LADDER[at]!;
  };

  return {
    rung: () => LADDER[at]!,
    fps: () => fps,
    capped: () => capped,
    rest: (t) => {
      reset(t);
      slowSince = null;
    },
    pinned: () => forced && at === 0,
    rescued: () => (forced && at > 0 ? rescued : 0),
    sample(dt, t) {
      if (LADDER[at]!.tier === "static") return null;
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
      const tier = LADDER[at]!.tier;
      if (forced) {
        const med = medianFps(dts);
        if (med < GOVERNOR.rescueBelow * k) {
          slowSince ??= t;
          goodSince = null;
          const last = at >= LADDER.length - 2;
          if (last || t - slowSince < GOVERNOR.rescueHold) return null;
          slowSince = null;
          rescued = Math.round(med);
          if (t - lastUp < GOVERNOR.retreat) ceiling = at + 1;
          return move(at + 1, t);
        }
        slowSince = null;
        // lancar lagi: naik kembali sampai High (dengan jeda dan batas yang sama dengan aturan biasa)
        if (at > 0 && !capped && med >= GOVERNOR.upAtLeast && at > ceiling) {
          goodSince ??= t;
          if (t - goodSince >= GOVERNOR.upHold && t - since >= GOVERNOR.upCooldown) {
            lastUp = t;
            return move(at - 1, t);
          }
        } else goodSince = null;
        return null;
      }

      if (fps < GOVERNOR.downBelow * k) {
        const last = at >= LADDER.length - 2; // sudah di anak tangga WebGL teringan
        if (last && fps >= GOVERNOR.staticBelow * k) return null;
        if (t - lastUp < GOVERNOR.retreat) ceiling = at + 1; // baru saja naik lalu berat: jangan naik ke sini lagi
        return move(at + 1, t);
      }
      // di layar 30 Hz tidak terlihat apakah masih ada ruang, jadi tidak pernah naik di sana
      if (!capped && fps >= GOVERNOR.upAtLeast && at > ceiling && tier !== "static") {
        goodSince ??= t;
        if (t - goodSince >= GOVERNOR.upHold && t - since >= GOVERNOR.upCooldown) {
          lastUp = t;
          return move(at - 1, t);
        }
      } else goodSince = null;
      return null;
    },
  };
}
