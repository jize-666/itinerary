/**
 * Kartu tiket yang tergantung di benang untuk film 2,5D (DOM, tanpa WebGL). Murni: tanpa DOM, tanpa waktu dinding.
 * Langkah tetap 1/120 dtk dengan penjepit dt, jadi hasilnya sama untuk urutan masukan yang sama dan tidak meledak saat
 * satu frame sangat lambat. Kejadiannya berbentuk sama dengan `PassSignal` (stage/bus.ts) supaya suara tiket dan Clawd
 * tidak perlu tahu mana tiket yang sedang tampil.
 *
 * Sumbu: `roll` = ayunan di bidang layar mengelilingi ujung benang (positif = bawah kartu ke kiri, searah `rotate()`
 * CSS), `pitch` = ayunan mendekat/menjauh dari penonton, `yaw` = putaran pada benang (0 = muka depan, π = belakang).
 */
import type { PassSignal } from "@/engine/stage/bus";

export type SwingStatus = "ready" | "dragging" | "swinging" | "resting" | "flipped";

export type SwingState = {
  roll: number;
  pitch: number;
  yaw: number;
  rollVel: number;
  pitchVel: number;
  yawVel: number;
  back: boolean;
  status: SwingStatus;
};

export const SWING = Object.freeze({
  /** Langkah tetap (dtk) dan penjepit dt satu panggilan. */
  step: 1 / 120,
  maxDt: 0.1,
  /** Ayunan alami roll dan pitch (Hz) dan redamannya: ayunan 0,4 rad terlihat bergoyang tiga kali, diam dalam ±3,5 dtk. */
  rollHz: 0.85,
  rollDamp: 0.3,
  pitchHz: 0.95,
  pitchDamp: 0.36,
  /** Putaran pada benang: sedikit melewati sasaran sebelum diam. */
  yawHz: 1.1,
  yawDamp: 0.55,
  /** Miring ke arah pandang (rad) pada pandang penuh (±1). */
  leanRoll: (6 * Math.PI) / 180,
  leanPitch: (4 * Math.PI) / 180,
  /** Sentakan kartu (rad/dtk per satuan pandang) saat pandang bergeser: kartu tertinggal sedikit. */
  lookKick: 0.35,
  lookKickMax: 0.5,
  /** Roll saat kartu ditarik: pegas kaku mengikuti sudut penunjuk. */
  dragHz: 6,
  dragDamp: 0.9,
  maxRoll: 1.3,
  maxVel: 9,
  /** Ketukan: lebih singkat dari ini (dtk) dan geser kurang dari ini (px). */
  tapTime: 0.25,
  tapTravel: 8,
  /** Sentakan roll (rad/dtk) saat kartu dibalik. */
  flipKick: 0.6,
  /** Ambang diam: selisih dari keseimbangan (rad) dan laju (rad/dtk). */
  restPos: 0.0025,
  restVel: 0.015,
  /** Panjang ekuivalen (m) untuk mengubah laju sudut ke laju linear skala tiket 3D (kartu 0,15 m + benang). */
  armLength: 0.25,
  /** Selang terkecil antar kabar swing-speed (dtk): ≤ 10 per dtk. */
  speedEvery: 0.1,
});

const TAU = Math.PI * 2;
const wrap = (a: number) => a - TAU * Math.round(a / TAU);
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const fin = (v: number, fallback = 0) => (Number.isFinite(v) ? v : fallback);

export class Swing2D {
  roll: number;
  pitch = 0;
  yaw = 0;
  rollVel = 0;
  pitchVel = 0;
  yawVel = 0;
  back = false;
  status: SwingStatus = "ready";

  #onEvent: ((e: PassSignal) => void) | undefined;
  #clock = 0;
  /** Waktu nyata (dtk, tanpa penjepit) untuk membedakan ketukan dari tekan lama. */
  #wall = 0;
  #acc = 0;
  /** Keseimbangan roll dan pitch (rad) dari arah pandang. */
  #eqRoll = 0;
  #eqPitch = 0;
  #lookX = 0;
  #lookY = 0;
  #lookSeen = false;
  #touched = false;
  #drag: { offset: number; angle: number; target: number; x0: number; y0: number; t0: number; travel: number; length: number } | null = null;
  #lastSpeed = -1e9;

  /** `roll0` = sudut awal (rad): kartu mulai miring lalu berayun masuk. */
  constructor(roll0 = 0, onEvent?: (e: PassSignal) => void) {
    this.roll = fin(roll0);
    this.#onEvent = onEvent;
  }

  get state(): SwingState {
    return { roll: this.roll, pitch: this.pitch, yaw: this.yaw, rollVel: this.rollVel, pitchVel: this.pitchVel, yawVel: this.yawVel, back: this.back, status: this.status };
  }

  /** Perlu dimajukan terus (ada masukan atau gerak)? false = boleh berhenti menggambar. */
  get active(): boolean {
    return this.#drag !== null || this.status === "dragging" || this.status === "swinging" || (this.status === "ready" && !this.#atRest());
  }

  #emit(e: PassSignal) {
    this.#onEvent?.(e);
  }

  #atRest(): boolean {
    const p = SWING.restPos;
    const v = SWING.restVel;
    const yawGoal = this.back ? Math.PI : 0;
    return (
      Math.abs(this.roll - this.#eqRoll) < p &&
      Math.abs(this.pitch - this.#eqPitch) < p &&
      Math.abs(this.yaw - yawGoal) < p &&
      Math.abs(this.rollVel) < v &&
      Math.abs(this.pitchVel) < v &&
      Math.abs(this.yawVel) < v
    );
  }

  /** Arah pandang (−1…1): keseimbangan condong sedikit, dan pandang yang bergeser cepat menyentak kartu. */
  setLook(x: number, y: number, dt = 0) {
    const nx = clamp(fin(x), -1, 1);
    const ny = clamp(fin(y), -1, 1);
    const dx = nx - this.#lookX;
    const dy = ny - this.#lookY;
    const first = !this.#lookSeen;
    this.#lookSeen = true;
    this.#lookX = nx;
    this.#lookY = ny;
    this.#eqRoll = nx * SWING.leanRoll;
    this.#eqPitch = ny * SWING.leanPitch;
    if (first || this.#drag || !(dt > 0)) return;
    const k = SWING.lookKick;
    const m = SWING.lookKickMax;
    this.rollVel += clamp(-dx * k, -m, m);
    this.pitchVel += clamp(-dy * k, -m, m);
  }

  /** Penunjuk menekan kartu di (px, py) terhadap ujung benang (y ke bawah); `length` = panjang kartu dalam px. */
  grab(px: number, py: number, length: number) {
    if (this.#drag) return;
    const x = fin(px);
    const y = fin(py);
    const angle = Math.atan2(-x, y);
    this.#touched = true;
    this.#drag = { offset: this.roll - angle, angle, target: this.roll, x0: x, y0: y, t0: this.#wall, travel: 0, length: Math.max(1, fin(length, 1)) };
    this.status = "dragging";
    this.#emit({ type: "grab", kind: "card" });
  }

  drag(px: number, py: number) {
    const d = this.#drag;
    if (!d) return;
    const x = fin(px);
    const y = fin(py);
    d.travel = Math.max(d.travel, Math.hypot(x - d.x0, y - d.y0));
    // terlalu dekat ke ujung benang: sudutnya tidak stabil, pertahankan sasaran
    if (Math.hypot(x, y) < d.length * 0.12) return;
    d.angle += wrap(Math.atan2(-x, y) - d.angle);
    d.target = clamp(d.angle + d.offset, -SWING.maxRoll, SWING.maxRoll);
  }

  release() {
    const d = this.#drag;
    if (!d) return;
    this.#drag = null;
    if (this.#wall - d.t0 < SWING.tapTime && d.travel < SWING.tapTravel) {
      this.status = "swinging";
      this.flip();
      return;
    }
    this.rollVel = clamp(this.rollVel, -SWING.maxVel, SWING.maxVel);
    this.status = "swinging";
    this.#emit({ type: "release", speed: Math.hypot(this.rollVel, this.pitchVel) * SWING.armLength });
  }

  /** Balik kartu pada benangnya: sasaran yaw 0 ↔ π, dengan sedikit sentakan roll. */
  flip() {
    this.#touched = true;
    this.back = !this.back;
    this.rollVel += (this.back ? 1 : -1) * SWING.flipKick;
    if (!this.#drag) this.status = "swinging";
    this.#emit({ type: "flip", back: this.back });
  }

  /** Majukan `dt` detik (dijepit 0…0,1). */
  step(dt: number) {
    this.#wall += Math.max(0, fin(dt));
    this.#acc += clamp(fin(dt), 0, SWING.maxDt);
    const h = SWING.step;
    while (this.#acc >= h) {
      this.#acc -= h;
      this.#sub(h);
    }
    if (!(Number.isFinite(this.roll + this.pitch + this.yaw + this.rollVel + this.pitchVel + this.yawVel))) {
      this.roll = this.pitch = this.yaw = this.rollVel = this.pitchVel = this.yawVel = 0;
      if (this.back) this.yaw = Math.PI;
    }
    this.#settle();
  }

  #sub(h: number) {
    this.#clock += h;
    const w = (hz: number) => TAU * hz;
    // roll: ditarik penunjuk (pegas kaku) atau bandul teredam ke keseimbangan
    const d = this.#drag;
    const wr = w(d ? SWING.dragHz : SWING.rollHz);
    const zr = d ? SWING.dragDamp : SWING.rollDamp;
    const goal = d ? d.target : this.#eqRoll;
    this.rollVel += (-wr * wr * (this.roll - goal) - 2 * zr * wr * this.rollVel) * h;
    this.roll += this.rollVel * h;
    const wp = w(SWING.pitchHz);
    this.pitchVel += (-wp * wp * (this.pitch - this.#eqPitch) - 2 * SWING.pitchDamp * wp * this.pitchVel) * h;
    this.pitch += this.pitchVel * h;
    const wy = w(SWING.yawHz);
    const yawGoal = this.back ? Math.PI : 0;
    this.yawVel += (-wy * wy * (this.yaw - yawGoal) - 2 * SWING.yawDamp * wy * this.yawVel) * h;
    this.yaw += this.yawVel * h;
    this.rollVel = clamp(this.rollVel, -SWING.maxVel * 2, SWING.maxVel * 2);
    this.roll = clamp(this.roll, -SWING.maxRoll - 0.3, SWING.maxRoll + 0.3);
  }

  /** Status dan kabar diam / laju sesudah satu panggilan `step`. */
  #settle() {
    if (this.#drag) {
      this.status = "dragging";
      this.#speed();
      return;
    }
    if (this.#atRest()) {
      // diam: tempel ke keseimbangan supaya gambar tidak bergetar
      this.roll = this.#eqRoll;
      this.pitch = this.#eqPitch;
      this.yaw = this.back ? Math.PI : 0;
      this.rollVel = this.pitchVel = this.yawVel = 0;
      if (!this.#touched) return; // masih "ready"
      const next: SwingStatus = this.back ? "flipped" : "resting";
      if (this.status === "swinging") this.#emit({ type: "rest", back: this.back });
      this.status = next;
      return;
    }
    if (this.#touched) {
      this.status = "swinging";
      this.#speed();
    }
  }

  #speed() {
    if (this.#clock - this.#lastSpeed < SWING.speedEvery) return;
    this.#lastSpeed = this.#clock;
    const angular = Math.hypot(this.rollVel, this.pitchVel, this.yawVel);
    this.#emit({ type: "swing-speed", speed: Math.hypot(this.rollVel, this.pitchVel) * SWING.armLength, angularSpeed: angular });
  }
}

export const createSwing2D = (roll0?: number, onEvent?: (e: PassSignal) => void) => new Swing2D(roll0, onEvent);
