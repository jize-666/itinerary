/**
 * Perjalanan maskot di dunia 3D (dari paket coral-assistant): lintasan halus berlengkung ke tujuan, dimulai dari
 * letak terkini; tujuan terbaru selalu menggantikan yang lama. Murni; waktu dalam milidetik.
 */
export type Vec3 = readonly [number, number, number];
export type JourneyRequest = { to: Vec3; duration?: number; arcHeight?: number; id?: string };
export type Journey = { from: Vec3; to: Vec3; started: number; duration: number; arcHeight: number; id: string; token: number };

/** Letak pada perjalanan `j` di jam `now`: smoothstep sepanjang garis + lengkung parabola ke atas. */
export function sampleJourney(j: Journey, now: number): { position: [number, number, number]; done: boolean } {
  const t = Math.min(1, Math.max(0, (now - j.started) / Math.max(1, j.duration)));
  if (t >= 1) return { position: [...j.to], done: true };
  const p = t * t * (3 - 2 * t);
  return {
    position: [j.from[0] + (j.to[0] - j.from[0]) * p, j.from[1] + (j.to[1] - j.from[1]) * p + 4 * j.arcHeight * p * (1 - p), j.from[2] + (j.to[2] - j.from[2]) * p],
    done: false,
  };
}

export class JourneyController {
  current: Journey | null = null;
  position: [number, number, number];
  private token = 0;

  constructor(position: Vec3 = [0, 0, 0]) {
    this.position = [...position];
  }

  /** Mulai perjalanan baru dari letak terkini. Gerak dikurangi: singkat dan lurus. */
  move(request: JourneyRequest, now: number, reducedMotion = false): number {
    this.update(now);
    const token = ++this.token;
    this.current = {
      from: [...this.position],
      to: [...request.to],
      started: now,
      duration: reducedMotion ? 180 : Math.max(1, request.duration ?? 2000),
      arcHeight: reducedMotion ? 0 : (request.arcHeight ?? 0.4),
      id: request.id ?? `journey-${token}`,
      token,
    };
    return token;
  }

  /** Perbarui letak; mengembalikan perjalanan yang baru saja selesai, bila ada. */
  update(now: number): Journey | null {
    if (!this.current) return null;
    const route = this.current;
    const result = sampleJourney(route, now);
    this.position = result.position;
    if (result.done) {
      this.current = null;
      return route;
    }
    return null;
  }

  /** Langsung di tempat (tanpa terbang), misalnya saat pertama muncul. */
  place(at: Vec3) {
    this.current = null;
    this.position = [...at];
  }

  cancel(now: number) {
    this.update(now);
    this.current = null;
    ++this.token;
  }

  isCurrent(token: number) {
    return token === this.token;
  }
}
