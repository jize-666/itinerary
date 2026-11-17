/**
 * Penggerak tubuh Clawd, dipakai bersama film 3D (`stage3d/mascot.ts`) dan film 2,5D (`components/mascot/flat.ts`):
 * wajah (ekspresi kit berganti di tengah kedipan), pose dengan peralihan halus, loncatan kecil saat diketuk, badan
 * jeli (regang dan lentur dari percepatan), dan sendi yang menyusul dengan pantulan. Murni (tanpa DOM, tanpa three).
 *
 * Satuan panjang: tinggi badan. `base` = letak tengah badan di dunia (Y atas) tanpa naik-turun pose; penggerak
 * menambahkan naik-turunnya sendiri supaya jeli ikut merasakan loncatan.
 */
import { EXPRESSION_OF, type Expression, expressionFor, FaceTrack, type Mood } from "./face";
import { Follow, Jelly } from "./jelly";
import { mixPose, type Motion, type Pose, poseAt } from "./pose";

/** Batas regang total (pose × jeli). */
export const STRETCH = { min: 0.7, max: 1.35 } as const;
/** Dorongan inersia ke sendi (rad/dtk² per tinggi badan/dtk²): lengan tertinggal saat badan naik, kaki saat maju. */
const ARM_LAG = 1.6;
const ARM_SWING = 1.0;
const LEG_LAG = 1.4;
/** Loncatan kecil saat diketuk, dalam tinggi badan per satuan pegas. */
const HOP = 0.3 / 1.9;

export const STILL_POSE: Pose = { bob: 0, tiltX: 0, tiltZ: 0, spin: 0, stretch: 1, armL: [0, 0], armR: [0, 0], reach: [1, 1], legs: [0, 0, 0, 0] };

export type MotorInput = {
  t: number;
  dt: number;
  mood: Mood;
  motion: Motion;
  motionSince: number;
  /** Mode gerak dikurangi: pose diam, tanpa jeli, tanpa kedip. */
  still?: boolean;
  /** Tengah badan di dunia (tinggi badan; Y atas). */
  base: readonly [number, number, number];
  /** Arah hadap (rad) untuk memutar lentur dan percepatan ke ruang badan. */
  yaw: number;
};

export type MotorFrame = Readonly<{
  expression: Expression;
  open: number;
  pose: Pose;
  /** Naik badan total (tinggi badan): pose + loncatan ketukan. */
  lift: number;
  stretch: number;
  /** Lentur di ruang badan (bagian tinggi badan): ke kanan, ke depan. */
  shearX: number;
  shearZ: number;
  /** Sudut sendi (rad): lengan [kiri angkat, kiri ayun, kanan angkat, kanan ayun], empat kaki (+ = ke depan). */
  arms: readonly number[];
  legs: readonly number[];
}>;

export class Motor {
  private track: FaceTrack | null = null;
  private lastMotion: Motion = "hover";
  private lastSince = 0;
  private prevPose: Pose | null = null;
  private blendFrom = -10;
  private hop = 0;
  private hopV = 0;
  private lastMood: Mood = "neutral";
  readonly jelly = new Jelly();
  private armJ = new Follow(4);
  private legJ = new Follow(4);
  private armDrive = [0, 0, 0, 0];
  private legDrive = [0, 0, 0, 0];
  private seed = 3;
  private rand = () => (this.seed = (this.seed * 16807) % 2147483647) / 2147483647;

  /** Ketuk/klik: badan meloncat kecil, memampat lalu memantul, dan bergoyang sedikit ke samping. */
  poke(strength = 1) {
    this.hopV += 5 * strength;
    this.jelly.kick((this.rand() - 0.5) * 1.4 * strength, -2.4 * strength, (this.rand() - 0.5) * 0.6 * strength);
  }

  update(i: MotorInput): MotorFrame {
    const { t, dt } = i;
    this.track ??= new FaceTrack(EXPRESSION_OF[i.mood], t);
    // ---- wajah: ekspresi kit, berganti di tengah kedipan; suasana hati baru memberi dorongan jeli ----
    if (i.mood !== this.lastMood) {
      if (i.mood === "surprised") this.jelly.kick(0, 2.2, 0);
      if (i.mood === "happy" || i.mood === "love") this.jelly.kick(0, 1.1, 0);
      if (i.mood === "angry") this.jelly.kick(0, -1.8, 0);
      this.lastMood = i.mood;
    }
    const face = this.track.update(t, expressionFor(i.mood, i.motion, t - i.motionSince), !i.still);

    // ---- pose: gerakan baru dicampur dari pose sebelumnya selama 0,25 dtk ----
    let pose = STILL_POSE;
    if (!i.still) {
      if (i.motion !== this.lastMotion || i.motionSince !== this.lastSince) {
        this.prevPose = poseAt(this.lastMotion, t, this.lastSince);
        this.blendFrom = t;
        this.lastMotion = i.motion;
        this.lastSince = i.motionSince;
      }
      pose = poseAt(i.motion, t, i.motionSince);
      const k = Math.min(1, (t - this.blendFrom) / 0.25);
      if (this.prevPose && k < 1) pose = mixPose(this.prevPose, pose, k * k * (3 - 2 * k));
      const h = Math.min(dt, 1 / 30);
      this.hopV += (-220 * this.hop - 14 * this.hopV) * h;
      this.hop += this.hopV * h;
    }
    const lift = pose.bob + this.hop * HOP;

    // ---- lentur: dasar badan diikuti jeli (dunia), lalu diputar ke ruang badan ----
    let stretch = pose.stretch;
    let shearX = 0;
    let shearZ = 0;
    const armGoal = [pose.armL[0], pose.armL[1], pose.armR[0], pose.armR[1]];
    if (i.still) {
      this.armJ.snap(armGoal);
      this.legJ.snap(pose.legs);
    } else {
      const cos = Math.cos(i.yaw);
      const sin = Math.sin(i.yaw);
      this.jelly.track([i.base[0], i.base[1] + lift, i.base[2]], dt);
      const [ax, ay, az] = this.jelly.accel;
      const fwd = ax * sin + az * cos;
      const [ox, , oz] = this.jelly.o;
      shearX = Math.max(-0.32, Math.min(0.32, ox * cos - oz * sin));
      shearZ = Math.max(-0.32, Math.min(0.32, ox * sin + oz * cos));
      stretch *= this.jelly.stretch;
      this.armDrive[0] = this.armDrive[2] = -ARM_LAG * ay;
      this.armDrive[1] = this.armDrive[3] = -ARM_SWING * fwd;
      this.legDrive.fill(-LEG_LAG * fwd);
      this.armJ.step(armGoal, dt, this.armDrive);
      this.legJ.step(pose.legs, dt, this.legDrive);
    }
    stretch = Math.max(STRETCH.min, Math.min(STRETCH.max, stretch));
    return { expression: face.expression, open: face.open, pose, lift, stretch, shearX, shearZ, arms: this.armJ.x, legs: this.legJ.x };
  }
}
