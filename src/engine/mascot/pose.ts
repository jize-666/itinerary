/**
 * Gerak tubuh maskot pemandu, dihitung dari jam (tanpa klip animasi): melayang, menyapa, terbang, menunjuk,
 * melompat senang, menghentak marah, bernapas saat tidur, menggeliat saat bangun, dan meloncat terkejut. Satu pose =
 * beberapa angka (sudut dan geseran) yang dipasang `stage3d/mascot.ts` ke badan, lengan, kaki, dan antena.
 * Murni: tanpa DOM, tanpa three.
 */

export type Motion = "hover" | "greet" | "fly" | "point" | "happy" | "angry" | "sleep" | "wake" | "surprised" | "look" | "talk";

/** Lama gerakan sekali jalan (detik); yang tidak ada di sini berulang terus. */
export const MOTION_DUR: Partial<Record<Motion, number>> = { greet: 2.4, point: 2.6, happy: 2, angry: 1.8, wake: 1.4, surprised: 1.3 };

export type Pose = {
  /** Naik-turun badan (satuan tinggi badan). */
  bob: number;
  /** Condong ke depan (rad). */
  tiltX: number;
  /** Miring ke samping (rad). */
  tiltZ: number;
  /** Putaran tambahan mengelilingi sumbu tegak (rad). */
  spin: number;
  /** Tinggi badan dikali sekian (lebar dikali 1/√ supaya volumenya tetap): squash & stretch. */
  stretch: number;
  /** Lengan kiri/kanan: [angkat ke samping (rad, + naik), ayun ke depan (rad)]. */
  armL: readonly [number, number];
  armR: readonly [number, number];
  /** Ayunan empat kaki yang berjajar (rad, + ke depan): kiri luar, kiri dalam, kanan dalam, kanan luar. */
  legs: readonly [number, number, number, number];
};

const TAU = Math.PI * 2;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** Naik cepat lalu meluruh: 0 di awal dan di akhir `dur`. */
const pulse = (u: number, dur: number) => {
  const p = clamp01(u / dur);
  return Math.sin(Math.PI * p) * (1 - p * 0.3);
};

/** Pose dasar: melayang pelan, lengan sedikit terbuka, kaki menjuntai bergoyang. */
function hover(t: number): Pose {
  const b = Math.sin((t * TAU) / 2.6);
  return {
    bob: 0.05 * b,
    tiltX: 0.03 * Math.sin(t * 1.1),
    tiltZ: 0.045 * Math.sin(t * 1.3 + 0.4),
    spin: 0.06 * Math.sin(t * 0.7),
    stretch: 1 + 0.025 * b,
    armL: [0.1 * Math.sin(t * 2.6), 0.05 * Math.sin(t * 1.7)],
    armR: [0.1 * Math.sin(t * 2.6 + 0.9), 0.05 * Math.sin(t * 1.9 + 1)],
    legs: [0.12 * Math.sin(t * 2.2), 0.12 * Math.sin(t * 2.2 + 1.6), 0.12 * Math.sin(t * 2.2 + 3.1), 0.12 * Math.sin(t * 2.2 + 4.7)],
  };
}

/**
 * Pose gerakan `motion` pada jam `t` (detik), dimulai pada `since`. Gerakan sekali jalan yang sudah lewat kembali
 * ke melayang; peralihannya dihaluskan `stage3d/mascot.ts`.
 */
export function poseAt(motion: Motion, t: number, since: number): Pose {
  const u = Math.max(0, t - since);
  const base = hover(t);
  const dur = MOTION_DUR[motion];
  if (dur !== undefined && u > dur) return base;
  switch (motion) {
    case "hover":
      return base;
    case "look": {
      // penasaran: kepala dimiringkan bergantian, satu lengan di "dagu"
      return { ...base, tiltZ: 0.2 * Math.sin(t * 1.4), spin: 0.25 * Math.sin(t * 0.9), armR: [-0.35, 1.0] };
    }
    case "talk": {
      // bicara: lengan bergerak kecil seperti menjelaskan
      return { ...base, armL: [0.05 + 0.32 * Math.max(0, Math.sin(t * 5.2)), 0.3], armR: [0.25 * Math.max(0, Math.sin(t * 4.3 + 1)), 0.25] };
    }
    case "greet": {
      // melambai dengan lengan kanan; badan memantul sekali di awal
      const hop = u < 0.5 ? Math.sin((Math.PI * u) / 0.5) : 0;
      const wave = Math.sin(u * TAU * 2.6);
      return { ...base, bob: base.bob + 0.12 * hop, stretch: 1 + 0.08 * hop, tiltZ: -0.12 * pulse(u, dur!), armR: [1.1 + 0.4 * wave, 0.15], armL: [-0.2, 0] };
    }
    case "fly": {
      // terbang: condong ke depan, kedua lengan mengepak, kaki tertinggal ke belakang
      const flap = Math.sin(t * 15);
      return {
        ...base,
        bob: 0.04 * Math.sin(t * 7.5),
        tiltX: 0.32,
        tiltZ: 0.06 * Math.sin(t * 3.1),
        stretch: 1 + 0.04 * flap,
        armL: [0.6 * flap, -0.15],
        armR: [0.6 * flap, -0.15],
        legs: [-0.55 + 0.15 * Math.sin(t * 9), -0.55 + 0.15 * Math.sin(t * 9 + 1.5), -0.65 + 0.15 * Math.sin(t * 9 + 3), -0.65 + 0.15 * Math.sin(t * 9 + 4.5)],
      };
    }
    case "point": {
      // menunjuk ke objek dengan lengan kanan, badan sedikit condong
      const k = clamp01(u / 0.35);
      return { ...base, tiltX: 0.1 * k, tiltZ: -0.08 * k, armR: [0.15 * k + base.armR[0] * (1 - k), 1.25 * k], armL: [-0.3, -0.1] };
    }
    case "happy": {
      // dua loncatan girang, berputar sekali di loncatan pertama, kedua lengan diangkat bergoyang
      const hops = Math.abs(Math.sin((u / dur!) * Math.PI * 2));
      const land = 1 - hops;
      return {
        ...base,
        bob: 0.32 * hops,
        stretch: 1 + 0.16 * hops - 0.12 * land * land * (u < dur! - 0.1 ? 1 : 0),
        spin: u < 0.9 ? TAU * (1 - Math.cos((Math.PI * u) / 0.9)) * 0.5 : 0,
        tiltZ: 0.1 * Math.sin(u * 9),
        armL: [1.2 + 0.35 * Math.sin(u * 19), 0.1],
        armR: [1.2 + 0.35 * Math.sin(u * 19 + 1.2), 0.1],
        legs: [0.4 * hops, -0.3 * hops, 0.3 * hops, -0.4 * hops],
      };
    }
    case "angry": {
      // menghentak: badan bergetar kiri-kanan, kedua kepalan diangkat dan diguncang, loncatan kecil
      const shake = Math.sin(u * 34) * pulse(u, dur!);
      const stomp = Math.abs(Math.sin(u * 9)) * pulse(u, dur!);
      return {
        ...base,
        bob: 0.06 * stomp,
        tiltX: -0.08,
        tiltZ: 0.14 * shake,
        stretch: 1 - 0.07 * stomp,
        armL: [0.55 + 0.3 * Math.sin(u * 26), 0.5],
        armR: [0.55 + 0.3 * Math.sin(u * 26 + Math.PI), 0.5],
        legs: [0.3 * Math.sin(u * 18), -0.3 * Math.sin(u * 18), -0.3 * Math.sin(u * 18), 0.3 * Math.sin(u * 18)],
      };
    }
    case "sleep": {
      // tidur melayang: napas pelan, condong ke samping, lengan dan kaki terkulai
      const breath = Math.sin((t * TAU) / 3.6);
      return { bob: -0.06 + 0.02 * breath, tiltX: 0.12, tiltZ: 0.16, spin: 0, stretch: 1 + 0.045 * breath, armL: [-0.55, 0.15], armR: [-0.55, 0.15], legs: [0.18, 0.12, 0.05, 0.1] };
    }
    case "wake": {
      // menggeliat: kedua lengan diangkat tinggi, badan memanjang, lalu menggeleng
      const p = pulse(u, dur!);
      return { ...base, stretch: 1 + 0.16 * p, armL: [1.45 * p, 0], armR: [1.45 * p, 0], tiltZ: u > 0.8 ? 0.12 * Math.sin(u * 20) * (dur! - u) : 0 };
    }
    case "surprised": {
      // terlonjak: loncat cepat, lengan terangkat, kaki mengangkang
      const jump = u < 0.55 ? Math.sin((Math.PI * u) / 0.55) : 0;
      return { ...base, bob: 0.36 * jump, stretch: 1 + 0.18 * jump - (u > 0.5 && u < 0.75 ? 0.12 : 0), tiltX: -0.12 * jump, armL: [1.1, 0.3], armR: [1.1, 0.3], legs: [0.5 * jump, -0.4 * jump, 0.4 * jump, -0.5 * jump] };
    }
  }
}

/** Campuran dua pose (peralihan antar gerakan). */
export function mixPose(a: Pose, b: Pose, k: number): Pose {
  const m = (x: number, y: number) => x + (y - x) * k;
  const arm = (x: readonly [number, number], y: readonly [number, number]) => [m(x[0], y[0]), m(x[1], y[1])] as const;
  return {
    bob: m(a.bob, b.bob),
    tiltX: m(a.tiltX, b.tiltX),
    tiltZ: m(a.tiltZ, b.tiltZ),
    spin: m(a.spin, b.spin),
    stretch: m(a.stretch, b.stretch),
    armL: arm(a.armL, b.armL),
    armR: arm(a.armR, b.armR),
    legs: [m(a.legs[0], b.legs[0]), m(a.legs[1], b.legs[1]), m(a.legs[2], b.legs[2]), m(a.legs[3], b.legs[3])],
  };
}
