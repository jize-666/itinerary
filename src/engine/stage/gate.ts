/**
 * Gunungan pembuka dan penutup film (Tugas 7; keputusan host 13 Nov: "pembuka dan penutupan saja, sapuanya pakai
 * yang lama"). Murni: tanpa DOM, tanpa three. Yang menggambar ada di `components/film/stage3d/gunungan.ts`.
 *
 * Seperti pagelaran wayang: sebelum lakon dimulai gunungan tertancap di tengah kelir; dalang mencabutnya (bedhol
 * kayon) untuk membuka lakon, dan menancapkannya lagi (tancep kayon) saat lakon selesai.
 * - **Pembuka** (`head`): film dibuka di slide pertama dengan gunungan tertancap di depan kelir. Gulir, geser, atau
 *   panah maju mencabutnya ke kanan; kelir ikut tersibak dan kamera maju ke shot prolog. Di HP gerakannya mengikuti
 *   jari (scroll-driven depth). Mundur di slide pertama menancapkannya lagi.
 * - **Penutup** (`tail`): di slide terakhir (credits), gulir maju menancapkan gunungan dari kiri; bila tamu diam,
 *   gunungan ditancapkan sendiri. Mundur mencabutnya lagi.
 * - Klik, tap, atau Enter pada gunungan yang tertancap membaliknya: muka Agung ↔ muka Murka (api geni menyala).
 *
 * Satu angka menggerakkan semuanya: `planted` 0 (tidak ada) … 1 (tertancap). Jamnya detik dari pemanggil
 * (`performance.now() / 1000`), jadi lapisan DOM dan panggung 3D membaca keadaan yang sama.
 */
import { GENI, KAYON, kayonHalfWidth, SWEEP, type SweepPose, VEIL } from "./gunungan";

export type GateEnd = "head" | "tail";
/** Keadaan untuk lapisan DOM: menunggu panggung, tertancap di pembuka, tertancap di penutup, atau tidak ada. */
export type GatePhase = "off" | "wait" | "head" | "tail";

export const GATE = {
  /** Lama mencabut atau menancapkan penuh (detik) saat dipicu roda, keyboard, ketukan, atau geser yang dilepas. */
  dur: 1.9,
  /** Gerakan terpendek (detik), juga saat dibalik di tengah jalan. */
  minDur: 0.45,
  /** Pembuka: teks slide pertama mulai muncul saat gunungan sudah tercabut sebanyak ini. */
  textAt: 0.5,
  /** Penutup: teks credits memudar begitu gunungan tertancap sebanyak ini. */
  coverAt: 0.45,
  /** Menunggu panggung 3D dan tekstur gunungan sebelum pembuka dilepas (ms); sesudahnya film dibuka tanpa gerbang. */
  waitMs: 6000,
  /** Penutup: gunungan ditancapkan sendiri sekian ms sesudah tiba di credits. */
  autoTailMs: 9000,
  /** Geser jari yang dilepas sesudah mencabut sebanyak ini (atau dikibas maju) → dicabut sampai habis. */
  commit: 0.3,
  /** Tinggi gunungan tertancap sebagai bagian dari tinggi layar (layar lebar); di layar tegak dibatasi lebarnya. */
  size: 0.8,
  /** Tinggi gunungan tertancap: pusatnya sedikit di atas tengah, supaya gedebog di kaki kelir tetap terlihat. */
  y: 0.06,
  /** Celah antara kaki lembaran dan garis atas gedebog (NDC). */
  gap: 0.025,
  /** Tebal gedebog di layar (NDC). */
  log: 0.11,
  /** Tinggi palemahan (pita gelap di kaki kelir, di atas gedebog; NDC): petunjuk gulir terbaca di atasnya. */
  ground: 0.16,
} as const;

/**
 * Pegas balik muka (seperti prototipe 8 Nov): ayunan ±0,45 dtk, lewat ±8% lalu mantap. Redaman `zeta`, frekuensi
 * alami `omega` (rad/dtk).
 */
export const FLIP = { zeta: 0.62, omega: 8.9 } as const;

/** Mantul kecil saat ditancapkan: amplitudo (NDC), laju (rad/dtk), dan peluruhan (/dtk). */
const THUD = { amp: 0.018, hz: 19, decay: 7 } as const;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** Kurva gerak tanam/cabut: pelan di awal dan di akhir. */
const easeInOut = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));

/** Tinggi gunungan tertancap (bagian dari tinggi layar) pada bentuk layar `aspect`. */
export function plantSize(aspect: number): number {
  return Math.min(GATE.size, (0.86 * aspect) / KAYON.aspect);
}

/** Garis atas gedebog (NDC y) untuk gunungan tertancap pada ukuran `size`. */
export const logTop = (size: number) => GATE.y - size - GATE.gap;

type Spring = { x0: number; v0: number; t0: number; target: number };

function springAt(s: Spring, t: number): { x: number; v: number } {
  const dt = Math.max(0, t - s.t0);
  const a = FLIP.zeta * FLIP.omega;
  const wd = FLIP.omega * Math.sqrt(1 - FLIP.zeta * FLIP.zeta);
  const x0 = s.x0 - s.target;
  const B = (s.v0 + a * x0) / wd;
  const e = Math.exp(-a * dt);
  const c = Math.cos(wd * dt);
  const sn = Math.sin(wd * dt);
  const x = e * (x0 * c + B * sn);
  const v = e * (-a * (x0 * c + B * sn) + (-x0 * wd * sn + B * wd * c));
  return { x: s.target + x, v };
}

export type GateSnapshot = Readonly<{ phase: GatePhase; end: GateEnd | null; face: "agung" | "murka" }>;

/**
 * Mesin gerbang. `now` = jam dalam detik. Semua perubahan lewat method; `snapshot(t)` memberi keadaan untuk DOM.
 */
export function createGate() {
  let end: GateEnd | null = null;
  /** Pembuka sudah dijanjikan tetapi panggung belum siap: layar menunggu. */
  let armed = false;
  let ready = false;
  let from = 0;
  let to: 0 | 1 = 0;
  let t0 = 0;
  let dur = 1;
  let scrub: number | null = null;
  /** Saat gunungan selesai ditancapkan (untuk mantul), atau −∞. */
  let landed = -Infinity;
  /** Jumlah setengah putaran: genap = muka Agung, ganjil = muka Murka. Selalu berputar ke arah yang sama. */
  let turns = 0;
  let spring: Spring = { x0: 0, v0: 0, t0: 0, target: 0 };
  /** Saat muka terakhir berganti. */
  let faced = -Infinity;
  /** Penutup sudah dicabut tamu di kunjungan credits ini: tidak ditancapkan sendiri lagi. */
  let tailDismissed = false;

  const raw = (t: number): number => {
    if (end === null) return 0;
    if (scrub !== null) return scrub;
    if (dur <= 0) return to;
    const k = easeInOut((t - t0) / dur);
    return from + (to - from) * k;
  };
  const gone = (t: number) => end === null || (to === 0 && raw(t) <= 0);

  const go = (target: 0 | 1, t: number) => {
    const v = raw(t);
    if (target === 1 && gone(t)) {
      // gunungan baru masuk: selalu muka Agung
      turns = 0;
      spring = { x0: 0, v0: 0, t0: t, target: 0 };
      faced = -Infinity;
    }
    from = v;
    to = target;
    t0 = t;
    dur = Math.max(GATE.minDur, GATE.dur * Math.abs(target - v));
    scrub = null;
    if (target === 1) landed = t + dur;
  };

  const api = {
    /** Gunungan tertancap sebanyak ini (0–1) pada jam `t`. */
    planted: raw,
    /** Ujung tempat gunungan berada (juga saat sedang dicabut), atau null. */
    end: () => end,
    /** Pembuka dijanjikan: film dibuka di slide pertama dan panggung 3D akan hidup. */
    arm() {
      end = "head";
      armed = true;
      from = 1;
      to = 1;
      dur = 0;
      scrub = null;
      landed = -Infinity;
      turns = 0;
      spring = { x0: 0, v0: 0, t0: 0, target: 0 };
      faced = -Infinity;
    },
    /** Film ditutup: lupakan semuanya (keadaan modul bertahan antar halaman). */
    reset() {
      end = null;
      armed = false;
      scrub = null;
      to = 0;
      from = 0;
      tailDismissed = false;
    },
    /** Panggung tidak jadi hidup (atau terlalu lama): pembuka dilepas, film dibuka tanpa gerbang. */
    disarm() {
      if (!armed) return;
      armed = false;
      if (!ready) end = null;
    },
    /** Panggung 3D menggambar dan tekstur gunungan siap (true), atau tidak lagi (false: gunungan hilang seketika). */
    setReady(on: boolean) {
      ready = on;
      if (on) armed = false;
      else if (!armed) {
        end = null;
        scrub = null;
      }
    },
    ready: () => ready,
    /**
     * Langkah gulir/geser/panah di slide `index` dari `last + 1` slide. true = dipakai gerbang (slide tidak pindah).
     */
    step(dir: 1 | -1, index: number, last: number, t: number): boolean {
      if (!ready) {
        // gulir maju sebelum gunungan sempat tampil: buka saja tanpa gerbang
        if (armed && dir === 1 && index === 0) {
          api.disarm();
          return true;
        }
        return false;
      }
      if (!gone(t)) {
        if (end === "head" && index === 0) {
          if (dir === 1 && to === 1) return go(0, t), true;
          if (dir === -1 && to === 0) return go(1, t), true;
          return false;
        }
        if (end === "tail" && index === last) {
          if (dir === -1 && to === 1) return (tailDismissed = true), go(0, t), true;
          if (dir === 1 && to === 0) return go(1, t), true;
          return false;
        }
        return false;
      }
      if (index === 0 && dir === -1) {
        end = "head";
        return go(1, t), true;
      }
      if (index === last && dir === 1 && last > 0) {
        end = "tail";
        return go(1, t), true;
      }
      return false;
    },
    /**
     * Letak film berubah (`moving` = sedang berpindah slide). Gunungan yang tertancap di ujung yang ditinggalkan
     * dicabut; pembuka yang masih menunggu dilepas bila film tidak lagi di slide pertama.
     */
    follow(index: number, moving: boolean, last: number, t: number) {
      if (armed && (index !== 0 || moving)) api.disarm();
      if (index !== last) tailDismissed = false;
      if (gone(t) || to === 0) return;
      if ((end === "head" && (index !== 0 || moving)) || (end === "tail" && (index !== last || moving))) go(0, t);
    },
    /** Penutup ditancapkan sendiri (tamu diam di credits). false bila tidak jadi. */
    autoTail(index: number, last: number, t: number): boolean {
      if (!ready || tailDismissed || index !== last || last === 0 || !gone(t)) return false;
      end = "tail";
      go(1, t);
      return true;
    },
    /** Balik muka. Hanya saat gunungan tertancap penuh. true bila dibalik. */
    flip(t: number): boolean {
      if (!ready || end === null || to !== 1 || raw(t) < 0.98) return false;
      const now = springAt(spring, t);
      turns += 1;
      spring = { x0: now.x, v0: now.v, t0: t, target: turns * Math.PI };
      faced = t;
      return true;
    },
    /** Sudut balik (rad, 0 = muka Agung, π = muka Murka, terus bertambah ke arah yang sama). */
    turn: (t: number) => springAt(spring, t).x,
    /** Muka yang dituju sekarang. */
    face: (): "agung" | "murka" => (turns % 2 === 1 ? "murka" : "agung"),
    /**
     * Kadar api geni di muka Murka: menyala besar sesaat sesudah dibalik ke Murka, lalu membara lebih kecil;
     * padam pelan saat dibalik lagi ke Agung.
     */
    rage(t: number): number {
      if (faced === -Infinity) return 0;
      const dt = Math.max(0, t - faced);
      if (turns % 2 === 1) return GENI.peak * smooth(0, 0.35, dt) * (0.42 + 0.58 * Math.exp(-dt / 1.4));
      return GENI.peak * 0.42 * Math.exp(-dt / 0.35) * (dt < 3 ? 1 : 0);
    },
    /** Jari mulai menggeser di slide `index`: true bila gerbang yang digeser (pembuka yang tertancap). */
    scrubStart(index: number, t: number): boolean {
      if (!ready || end !== "head" || index !== 0 || to !== 1 || gone(t)) return false;
      scrub = raw(t);
      return true;
    },
    /** Kemajuan jari (+ = maju, bagian dari bentang geser): 1 bentang = tercabut habis. */
    scrubTo(signed: number) {
      if (scrub === null) return;
      scrub = clamp01(1 - Math.max(0, signed));
    },
    /** Jari dilepas: `flick` +1/−1 = dikibas, 0 = dilepas pelan. */
    scrubEnd(flick: number, t: number) {
      if (scrub === null) return;
      const open = flick > 0 || (flick === 0 && 1 - scrub >= GATE.commit);
      // go() mulai dari letak jari sekarang, lalu melepas scrub
      go(open ? 0 : 1, t);
      if (!open) landed = -Infinity; // kembali ke tempatnya tanpa mantul
    },
    scrubbing: () => scrub !== null,
    /** Detik sampai gunungan selesai ditancapkan, atau null bila tidak sedang ditancapkan. */
    landsIn: (t: number): number | null => (end !== null && to === 1 && scrub === null && landed > t ? landed - t : null),
    /** Sedang bergerak (loop gambar harus jalan penuh). */
    busy(t: number): boolean {
      if (end === null || gone(t)) return false;
      const settling = t - spring.t0 < 2 || t - landed < 1 || (faced !== -Infinity && t - faced < 4);
      return scrub !== null || (dur > 0 && t - t0 < dur) || settling;
    },
    /** Mantul kecil sesudah ditancapkan (NDC y). */
    thud(t: number): number {
      const dt = t - landed;
      if (dt < 0 || dt > 1.2) return 0;
      return -THUD.amp * Math.exp(-THUD.decay * dt) * Math.sin(THUD.hz * dt);
    },
    snapshot(t: number): GateSnapshot {
      const face = api.face();
      if (armed && !ready) return { phase: "wait", end: "head", face };
      if (end === null || gone(t)) return { phase: "off", end: null, face };
      const v = raw(t);
      if (end === "head") return { phase: v > 1 - GATE.textAt ? "head" : "off", end, face };
      return { phase: v >= GATE.coverAt ? "tail" : "off", end, face };
    },
  };
  return api;
}

export type Gate = ReturnType<typeof createGate>;

/** Pose gunungan pembuka/penutup: pose sapuan + muka (putaran penuh), kelir, lampu, dan gedebog. */
export type KayonPose = SweepPose &
  Readonly<{
    /** Putaran penuh mengitari sumbu tegak (rad), termasuk balik muka: muka Murka tampak saat cos < 0. */
    turn: number;
    /** Kelir di belakang gunungan (0 = tabir gelap biasa, 1 = kelir berlampu dengan bayangan). */
    kelir: number;
    /** Lampu blencong di layar (NDC): menyinari lembaran, kolam cahaya di kelir, dan arah bayangan. */
    lampX: number;
    lampY: number;
    /** Garis atas gedebog (NDC y): tangkai di bawahnya tertancap, tidak digambar. */
    cut: number;
    /** Geseran kelir mengikuti pandang (NDC): bidang jauh bergeser lebih sedikit dari gunungan (parallax). */
    kelirX: number;
    kelirY: number;
  }>;

/** Batas parallax gunungan tertancap (NDC dan rad). */
export const GATE_LOOK = {
  /** Gunungan (dekat) bergeser berlawanan arah pandang sejauh ini di layar. */
  near: 0.05,
  /** Kelir (jauh) bergeser sejauh ini. */
  far: 0.018,
  /** Perspective shift: lembaran tampak berpaling sebesar ini (rad) saat kursor di tepi layar. */
  yaw: 0.2,
  /** Lampu blencong mengikuti kursor sejauh ini (NDC). */
  lamp: 0.55,
} as const;

/**
 * Pose gunungan tertancap sebanyak `v` (0–1, sudah melewati kurva waktu) di ujung `end`. `look` = arah pandang
 * (−1…1, y ke bawah), `turn` = sudut balik muka, `thud` = mantul, `t` = jam (detik, untuk kibasan).
 * Pembuka masuk dan keluar di kanan, penutup di kiri (arah film maju = kiri → kanan).
 */
export function gatePose(v: number, end: GateEnd, aspect: number, t: number, look: { x: number; y: number }, turn: number, thud: number): KayonPose {
  const out = 1 - clamp01(v);
  const side = end === "head" ? 1 : -1;
  const base = plantSize(aspect);
  // sedikit membesar saat dicabut: dalang menariknya mendekat ke penonton
  const size = base * (1 + 0.16 * smooth(0.08, 1, out));
  const half = kayonHalfWidth(size, aspect);
  const reach = 1 + half + 0.25;
  const across = side * easeInOut(smooth(0.1, 1, out));
  const speed = Math.sin(Math.PI * out);
  // dicabut dulu dari gedebog (naik), baru disapukan
  const lift = 0.09 * smooth(0, 0.28, out);
  const flutter = SWEEP.flutter * smooth(0.2, 0.4, out) * (1 - smooth(0.7, 0.9, out)) * Math.sin(t * Math.PI * 2 * SWEEP.flutterHz);
  // tertancap pun tidak mati: ayun napas kecil
  const sway = 0.01 * Math.sin(t * 0.63) * (1 - out);
  const yaw = -side * SWEEP.yaw * Math.abs(across) + flutter + GATE_LOOK.yaw * look.x * (1 - out * 0.5);
  const lx = look.x * (1 - out);
  const ly = look.y * (1 - out);
  const x = across * reach - GATE_LOOK.near * lx;
  const y = GATE.y + lift + thud - GATE_LOOK.near * 0.5 * ly;
  const veilX = across * VEIL.travel;
  return {
    x,
    y,
    size,
    yaw,
    roll: side * SWEEP.roll * speed + sway,
    bend: side * SWEEP.bend * speed * 0.8,
    face: Math.cos(turn + yaw) < 0 ? "murka" : "agung",
    veilX,
    veil: 1,
    glow: 0.4,
    turn: turn + yaw,
    kelir: 1,
    lampX: veilX + GATE_LOOK.lamp * look.x - 0.12,
    lampY: 0.82 - 0.12 * look.y,
    cut: logTop(base) - GATE_LOOK.near * 0.5 * ly,
    kelirX: veilX - GATE_LOOK.far * look.x,
    kelirY: GATE_LOOK.far * 0.5 * look.y,
  };
}

/** Bobot shot kayon pada kamera (0 = shot slide, 1 = shot kayon) untuk tertancap sebanyak `v`. */
export const gateCamera = (v: number) => smooth(0, 1, v);
