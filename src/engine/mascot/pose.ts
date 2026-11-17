/**
 * Gerak tubuh maskot pemandu, dihitung dari jam (tanpa klip animasi): melayang, menyapa, terbang, menunjuk,
 * melompat senang, menghentak marah, bernapas saat tidur, menggeliat saat bangun, dan meloncat terkejut. Satu pose =
 * beberapa angka yang dipasang `stage3d/mascot.ts` ke pivot kit Claude: badan, dua lengan, dan empat kaki.
 *
 * Arahan host 15 Nov: "gerak nya bisa dibuat lebih fleksibel? ganti aturan tanpa stretch itu. yang ga boleh cuma
 * mengganti bentuk dan ukuran saja". Jadi pose boleh memampat/memanjangkan badan (volume tetap) dan memanjangkan lengan
 * sebentar: ancang-ancang memampat sebelum meloncat, memanjang di udara, menggeliat panjang saat bangun, napas perut
 * saat tidur. Saat melayang tenang regangnya ±1% (napas), jadi bentuk dan ukuran kit tidak berubah. Lentur jeli dan
 * pantulan sendi ditambahkan di atasnya oleh `jelly.ts`.
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
  /** Regang tegak badan (1 = bentuk kit; lebar dan tebal dikali 1/√ supaya volumenya tetap). */
  stretch: number;
  /** Lengan kiri/kanan: [angkat ke samping (rad, + naik), ayun ke depan (rad)]. */
  armL: readonly [number, number];
  armR: readonly [number, number];
  /** Panjang lengan kiri/kanan (1 = kit). */
  reach: readonly [number, number];
  /** Ayunan empat kaki yang berjajar (rad, + ke depan): kiri luar, kiri dalam, kanan dalam, kanan luar. */
  legs: readonly [number, number, number, number];
};

const TAU = Math.PI * 2;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};
/** Naik cepat lalu meluruh: 0 di awal dan di akhir `dur`. */
const pulse = (u: number, dur: number) => {
  const p = clamp01(u / dur);
  return Math.sin(Math.PI * p) * (1 - p * 0.3);
};
/**
 * Loncatan dengan ancang-ancang: memampat selama `crouch` dtk, melayang `air` dtk (memanjang saat naik, kembali di
 * puncak), lalu mendarat memampat dan memantul. Mengembalikan [tinggi 0–1, regang].
 */
function jump(u: number, crouch: number, air: number, squash = 0.12, stretchUp = 0.14): [number, number] {
  if (u < crouch) return [0, 1 - squash * smooth(u / crouch)];
  const a = u - crouch;
  if (a < air) {
    const p = a / air;
    const h = Math.sin(Math.PI * p);
    // memanjang saat melesat naik dan saat jatuh, bulat di puncak
    return [h, 1 + stretchUp * Math.abs(Math.cos(Math.PI * p)) * (1 - 0.4 * p)];
  }
  const l = a - air;
  return [0, 1 - squash * Math.exp(-l * 9) * Math.cos(l * 22)];
}

/** Pose dasar (kit `hover`): melayang pelan, lengan sedikit terangkat, kaki menjuntai bergoyang, napas pelan. */
function hover(t: number): Pose {
  return {
    bob: 0.029 * Math.sin((t * TAU) / 2.4),
    tiltX: 0.015 * Math.sin(t * 1.1),
    tiltZ: 0.04 * Math.sin((t * TAU) / 3.2),
    spin: 0.04 * Math.sin(t * 0.7),
    stretch: 1 + 0.01 * Math.sin((t * TAU) / 2.4 + 0.6),
    armL: [0.15 + 0.04 * Math.sin(t * 2.6), 0.03 * Math.sin(t * 1.7)],
    armR: [0.15 + 0.04 * Math.sin(t * 2.6 + 0.9), 0.03 * Math.sin(t * 1.9 + 1)],
    reach: [1, 1],
    legs: [0.07 * Math.sin(t * 2.3), 0.07 * Math.sin(t * 2.3 + 0.7), 0.07 * Math.sin(t * 2.3 + 1.4), 0.07 * Math.sin(t * 2.3 + 2.1)],
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
      // penasaran: kepala dimiringkan bergantian, satu lengan di "dagu", badan sedikit memanjang ingin tahu
      return { ...base, tiltZ: 0.2 * Math.sin(t * 1.4), spin: 0.25 * Math.sin(t * 0.9), stretch: 1.04 + 0.02 * Math.sin(t * 2.8), armR: [-0.35, 1.0] };
    }
    case "talk": {
      // bicara: lengan bergerak kecil seperti menjelaskan, badan mengangguk memampat ringan
      return { ...base, stretch: 1 - 0.025 * Math.max(0, Math.sin(t * 7.5)), armL: [0.05 + 0.32 * Math.max(0, Math.sin(t * 5.2)), 0.3], armR: [0.25 * Math.max(0, Math.sin(t * 4.3 + 1)), 0.25] };
    }
    case "greet": {
      // ancang-ancang, meloncat kecil, lalu melambai dengan lengan kanan yang terulur
      const [h, s] = jump(u, 0.16, 0.42, 0.1, 0.1);
      const wave = Math.sin(u * TAU * 2.6);
      const reach = 1 + 0.08 * smooth((u - 0.4) / 0.3) * (1 - smooth((u - 2.0) / 0.4));
      return { ...base, bob: base.bob + 0.13 * h, stretch: s, tiltZ: -0.12 * pulse(u, dur!), armR: [1.1 + 0.4 * wave, 0.15], armL: [-0.2, 0], reach: [1, reach] };
    }
    case "fly": {
      // terbang: condong ke depan, badan memanjang ke arah terbang, kedua lengan mengepak, kaki tertinggal ke belakang
      const flap = Math.sin(t * 15);
      return {
        ...base,
        bob: 0.04 * Math.sin(t * 7.5),
        tiltX: 0.32,
        tiltZ: 0.06 * Math.sin(t * 3.1),
        stretch: 1.07 + 0.03 * flap,
        armL: [0.6 * flap, -0.15],
        armR: [0.6 * flap, -0.15],
        reach: [1.05, 1.05],
        legs: [-0.55 + 0.15 * Math.sin(t * 9), -0.55 + 0.15 * Math.sin(t * 9 + 1.5), -0.65 + 0.15 * Math.sin(t * 9 + 3), -0.65 + 0.15 * Math.sin(t * 9 + 4.5)],
      };
    }
    case "point": {
      // menunjuk ke objek: lengan kanan terulur memanjang, badan condong
      const k = smooth(u / 0.35);
      const back = 1 - smooth((u - 2.2) / 0.4);
      return { ...base, tiltX: 0.1 * k, tiltZ: -0.08 * k, stretch: 1 + 0.03 * k * back, armR: [0.15 * k + base.armR[0] * (1 - k), 1.25 * k], armL: [-0.3, -0.1], reach: [1, 1 + 0.2 * k * back] };
    }
    case "happy": {
      // dua loncatan girang dengan ancang-ancang dan pendaratan memantul; berputar sekali di loncatan pertama
      const half = dur! / 2;
      const first = u < half;
      const [h, s] = jump(first ? u : u - half, 0.14, 0.62, 0.14, 0.16);
      return {
        ...base,
        bob: 0.22 * h,
        stretch: s,
        spin: u > 0.14 && u < 0.76 ? TAU * smooth((u - 0.14) / 0.62) : 0,
        tiltZ: 0.1 * Math.sin(u * 9),
        armL: [1.2 + 0.35 * Math.sin(u * 19), 0.1],
        armR: [1.2 + 0.35 * Math.sin(u * 19 + 1.2), 0.1],
        reach: [1.06, 1.06],
        legs: [0.4 * h, -0.3 * h, 0.3 * h, -0.4 * h],
      };
    }
    case "angry": {
      // menghentak: badan bergetar kiri-kanan dan memampat tiap hentakan, kepalan diangkat dan diguncang
      const shake = Math.sin(u * 34) * pulse(u, dur!);
      const stomp = Math.abs(Math.sin(u * 9)) * pulse(u, dur!);
      return {
        ...base,
        bob: 0.06 * stomp,
        tiltX: -0.08,
        tiltZ: 0.14 * shake,
        stretch: 1 - 0.1 * stomp,
        armL: [0.55 + 0.3 * Math.sin(u * 26), 0.5],
        armR: [0.55 + 0.3 * Math.sin(u * 26 + Math.PI), 0.5],
        reach: [0.92, 0.92],
        legs: [0.3 * Math.sin(u * 18), -0.3 * Math.sin(u * 18), -0.3 * Math.sin(u * 18), 0.3 * Math.sin(u * 18)],
      };
    }
    case "sleep": {
      // tidur melayang: napas perut dalam (memampat-memanjang pelan), condong ke samping, lengan dan kaki terkulai
      const breath = Math.sin((t * TAU) / 3.6);
      return { bob: -0.06 + 0.02 * breath, tiltX: 0.12, tiltZ: 0.16, spin: 0, stretch: 1 + 0.035 * breath, armL: [-0.55, 0.15], armR: [-0.55, 0.15], reach: [1, 1], legs: [0.18, 0.12, 0.05, 0.1] };
    }
    case "wake": {
      // menggeliat: badan memanjang lebar-lebar, kedua lengan terulur tinggi, lalu menggeleng
      const p = pulse(u, dur!);
      return { ...base, bob: base.bob + 0.06 * p, tiltX: -0.06 * p, stretch: 1 + 0.16 * p, armL: [1.45 * p, 0], armR: [1.45 * p, 0], reach: [1 + 0.12 * p, 1 + 0.12 * p], tiltZ: u > 0.8 ? 0.12 * Math.sin(u * 20) * (dur! - u) : 0 };
    }
    case "surprised": {
      // terlonjak: tanpa ancang-ancang, melesat memanjang, lengan terangkat, kaki mengangkang, mendarat memantul
      const [h, s] = jump(u, 0.02, 0.55, 0.13, 0.2);
      return { ...base, bob: 0.24 * h, stretch: s, tiltX: -0.12 * h, armL: [1.1, 0.3], armR: [1.1, 0.3], reach: [1.08, 1.08], legs: [0.5 * h, -0.4 * h, 0.4 * h, -0.5 * h] };
    }
  }
}

/** Campuran dua pose (peralihan antar gerakan). */
export function mixPose(a: Pose, b: Pose, k: number): Pose {
  const m = (x: number, y: number) => x + (y - x) * k;
  const two = (x: readonly [number, number], y: readonly [number, number]) => [m(x[0], y[0]), m(x[1], y[1])] as const;
  return {
    bob: m(a.bob, b.bob),
    tiltX: m(a.tiltX, b.tiltX),
    tiltZ: m(a.tiltZ, b.tiltZ),
    spin: m(a.spin, b.spin),
    stretch: m(a.stretch, b.stretch),
    armL: two(a.armL, b.armL),
    armR: two(a.armR, b.armR),
    reach: two(a.reach, b.reach),
    legs: [m(a.legs[0], b.legs[0]), m(a.legs[1], b.legs[1]), m(a.legs[2], b.legs[2]), m(a.legs[3], b.legs[3])],
  };
}
