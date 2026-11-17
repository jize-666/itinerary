/**
 * Lentur maskot pemandu (arahan host 15 Nov: "gerak nya bisa dibuat lebih fleksibel? ganti aturan tanpa stretch itu.
 * yang ga boleh cuma mengganti bentuk dan ukuran saja"). Dua pegas, murni (tanpa DOM, tanpa three):
 *
 *  - `Jelly`: badan sebagai jeli. Puncak badan = massa yang digantung pegas di dasar badan. Saat dasar dipercepat,
 *    puncak tertinggal: naik cepat = memampat, berhenti di puncak loncatan = memanjang, mendarat = memampat lagi, maju
 *    ke samping = puncak condong ke belakang. Hasilnya geser (lentur) dan regang badan yang lalu bergoyang dan mereda ke
 *    nol, jadi saat diam bentuk dan ukuran kit kembali persis.
 *  - `Follow`: sudut sendi (lengan, kaki) menyusul pose dengan pegas yang sedikit memantul (follow-through), ditambah
 *    dorongan inersia dari percepatan badan (lengan tertinggal saat badan naik, kaki tertinggal saat badan maju).
 *
 * Satuan panjang: tinggi badan. Waktu: detik.
 */

export const JELLY = {
  /** Kekakuan dan redaman pegas puncak badan (±2,1 Hz, rasio redaman ±0,34: memantul beberapa kali lalu diam). */
  k: 180,
  c: 9,
  /** Batas regang dan lentur (bagian tinggi badan). */
  maxStretch: 0.28,
  maxShear: 0.32,
  /** Batas percepatan dasar yang dibaca (tinggi badan/dtk²): lonjakan satu frame tidak membuat badan meledak. */
  maxAccel: 70,
  /** Lompatan letak sebesar ini dalam satu frame dianggap pindah tempat (bukan gerak): tanpa dorongan. */
  teleport: 2,
} as const;

type V3 = [number, number, number];
const clamp = (x: number, a: number) => Math.max(-a, Math.min(a, x));
const STEP = 1 / 120;

export class Jelly {
  /** Simpangan puncak badan (x lentur ke samping, y regang, z lentur ke depan) dan kecepatannya. */
  readonly o: V3 = [0, 0, 0];
  readonly w: V3 = [0, 0, 0];
  /** Percepatan dasar terakhir yang dibaca (dipakai juga untuk dorongan sendi). */
  readonly accel: V3 = [0, 0, 0];
  private prevP: V3 | null = null;
  private prevV: V3 | null = null;

  /** Dorongan langsung ke puncak badan (kecepatan, tinggi badan/dtk): − y = memampat. */
  kick(x: number, y: number, z: number) {
    this.w[0] += x;
    this.w[1] += y;
    this.w[2] += z;
  }

  /** Ikuti letak dasar badan `p` (tinggi badan, ruang lokal maskot) sesudah `dt` detik. */
  track(p: Readonly<V3>, dt: number) {
    const a = this.accel;
    a[0] = a[1] = a[2] = 0;
    if (dt <= 0) return;
    if (this.prevP && Math.hypot(p[0] - this.prevP[0], p[1] - this.prevP[1], p[2] - this.prevP[2]) > JELLY.teleport) this.prevP = this.prevV = null;
    if (this.prevP) {
      const v: V3 = [(p[0] - this.prevP[0]) / dt, (p[1] - this.prevP[1]) / dt, (p[2] - this.prevP[2]) / dt];
      if (this.prevV) for (let i = 0; i < 3; i++) a[i] = clamp((v[i]! - this.prevV[i]!) / dt, JELLY.maxAccel);
      this.prevV = v;
    }
    this.prevP = [p[0], p[1], p[2]];
    this.step(dt);
  }

  /** Jalankan pegas `dt` detik (langkah tetap 1/120 dtk supaya stabil di frame lambat). */
  step(dt: number) {
    let left = Math.min(dt, 0.1);
    while (left > 1e-6) {
      const h = Math.min(STEP, left);
      for (let i = 0; i < 3; i++) {
        // puncak tertinggal terhadap percepatan dasar (gaya semu −a)
        this.w[i]! += (-JELLY.k * this.o[i]! - JELLY.c * this.w[i]! - this.accel[i]!) * h;
        this.o[i]! += this.w[i]! * h;
      }
      left -= h;
    }
  }

  /** Regang tegak (1 = bentuk kit). Volume dijaga pemanggil: lebar dan tebal dikali 1/√regang. */
  get stretch() {
    return 1 + clamp(this.o[1], JELLY.maxStretch);
  }
  get shearX() {
    return clamp(this.o[0], JELLY.maxShear);
  }
  get shearZ() {
    return clamp(this.o[2], JELLY.maxShear);
  }
  /** Simpangan total; ±0 berarti badan kembali ke bentuk kit. */
  get rest() {
    return Math.hypot(this.o[0], this.o[1], this.o[2]) + Math.hypot(this.w[0], this.w[1], this.w[2]) * 0.1;
  }
}

/** Sendi yang menyusul pose dengan pegas (rad). */
export const FOLLOW = { k: 150, c: 10 } as const;

export class Follow {
  readonly x: number[];
  private v: number[];
  private ready = false;

  constructor(n: number) {
    this.x = new Array<number>(n).fill(0);
    this.v = new Array<number>(n).fill(0);
  }

  /** Dekati `target` selama `dt` detik; `drive` = percepatan sudut tambahan (inersia), boleh kosong. */
  step(target: readonly number[], dt: number, drive?: readonly number[]) {
    if (!this.ready) {
      target.forEach((t, i) => (this.x[i] = t));
      this.ready = true;
      return this.x;
    }
    let left = Math.min(dt, 0.1);
    while (left > 1e-6) {
      const h = Math.min(STEP, left);
      for (let i = 0; i < this.x.length; i++) {
        this.v[i]! += (FOLLOW.k * (target[i]! - this.x[i]!) - FOLLOW.c * this.v[i]! + (drive?.[i] ?? 0)) * h;
        this.x[i]! += this.v[i]! * h;
      }
      left -= h;
    }
    return this.x;
  }

  /** Langsung ke `target` tanpa pegas (mode gerak dikurangi). */
  snap(target: readonly number[]) {
    target.forEach((t, i) => {
      this.x[i] = t;
      this.v[i] = 0;
    });
    this.ready = true;
    return this.x;
  }
}
