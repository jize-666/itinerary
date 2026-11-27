import { describe, expect, it } from "vitest";
import { DEPTH } from "@/engine/motion/tokens";
import { portalRing, portalWarp } from "@/engine/motion/view";
import { Trip } from "@content/schema";
import { trip as soloInput } from "@content/trips/solo/trip";
import { buildFilm, type Slide, transitionKind } from "@/engine/slides/build-slides";
import { skyState, STILL } from "@/engine/slides/sky";
import { createCues, SKY_WINDOW, skyAlong } from "@/engine/stage/cue";
import { hex, lightElevation, mixMood, moodOf } from "@/engine/stage/mood";
import { blendShot, fitFov, galleryShot, hfovOf, projectPoint, rayThrough, type Shot, shotFor, skyStretch, STAGE_CENTER, SUN_TRACK, sunDirection, type Vec3 } from "@/engine/stage/shots";
import { fbm, TERRAIN, TERRAIN_DEFAULT, terrainHeight, villageLights } from "@/engine/stage/terrain";
import { type Caps, createGovernor, dprFor, GOVERNOR, guessTier, parseTier, TIER } from "@/engine/stage/tier";
import type { TripView } from "@/lib/trip";

const film = buildFilm({ role: "guest", trip: Trip.parse(soloInput) as unknown as TripView["trip"] });
const WIDE = { aspect: 16 / 9 };
const TALL = { aspect: 393 / 852 };
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const firstOf = (kind: Slide["kind"]) => film.slides.findIndex((s) => s.kind === kind);

describe("tier awal (guessTier)", () => {
  const caps = (over: Partial<Caps>): Caps => ({ webgl2: true, renderer: "", mobile: false, cores: 8, memory: 8, ...over });
  const RTX = "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)";

  it("tanpa WebGL2 atau dengan renderer perangkat lunak: Static (film 2,5D)", () => {
    expect(guessTier(caps({ webgl2: false, renderer: "Apple GPU" }))).toBe("static");
    expect(guessTier(caps({ renderer: "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)" }))).toBe("static");
    expect(guessTier(caps({ renderer: "llvmpipe (LLVM 15.0.7, 256 bits)" }))).toBe("static");
  });

  it("semua HP dan tablet: High, apa pun GPU, inti, atau memorinya (tablet flagship tidak lagi buram)", () => {
    for (const renderer of ["Apple GPU", "Adreno (TM) 750", "Adreno (TM) 506", "Mali-G52 MC2", "Mali-G715", "Xclipse 940", "Sesuatu yang baru", RTX]) {
      for (const [cores, memory] of [[0, 0], [2, 2], [4, 0], [8, 8], [8, 12]] as const) {
        expect(guessTier(caps({ mobile: true, renderer, cores, memory })), `${renderer} ${cores}/${memory}`).toBe("high");
      }
    }
  });

  it("desktop dengan GPU kuat, inti dan memori cukup (atau tidak diketahui): Ultra", () => {
    expect(guessTier(caps({ renderer: RTX }))).toBe("ultra");
    expect(guessTier(caps({ renderer: "ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)" }))).toBe("ultra");
    expect(guessTier(caps({ renderer: RTX, cores: 0, memory: 0 }))).toBe("ultra");
    expect(guessTier(caps({ renderer: RTX, cores: 16, memory: 8 }))).toBe("ultra");
  });

  it("desktop dengan inti atau memori kurang, atau grafis terpadu: High", () => {
    expect(guessTier(caps({ renderer: RTX, memory: 4 }))).toBe("high");
    expect(guessTier(caps({ renderer: RTX, cores: 4 }))).toBe("high");
    expect(guessTier(caps({ renderer: RTX, cores: 2, memory: 2 }))).toBe("high");
    expect(guessTier(caps({ renderer: "ANGLE (Intel, Intel(R) HD Graphics 4000 Direct3D11)" }))).toBe("high");
    expect(guessTier(caps({ renderer: "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics)" }))).toBe("high");
  });
});

describe("spesifikasi tier dan resolusi", () => {
  it("hanya Ultra dan High; Ultra lebih rapat dan lebih halus, High memegang spesifikasi High lama", () => {
    expect(Object.keys(TIER).sort()).toEqual(["high", "ultra"]);
    expect(TIER.high).toEqual({ dpr: 2, dprMin: 0, msaa: 4, bloom: 5, shadow: 2048, particles: 1, idleEvery: 1, dof: true });
    expect(TIER.ultra).toMatchObject({ dpr: 2.5, dprMin: 1.5, msaa: 4, bloom: 6, shadow: 4096, particles: 1, idleEvery: 1, dof: true });
  });

  it("dprFor: High mengikuti layar (maks 2), Ultra 1,5–2,5", () => {
    expect(dprFor(TIER.high, 1)).toBe(1);
    expect(dprFor(TIER.high, 2.6)).toBe(2);
    expect(dprFor(TIER.high, 3)).toBe(2);
    expect(dprFor(TIER.ultra, 1)).toBe(1.5);
    expect(dprFor(TIER.ultra, 2)).toBe(2);
    expect(dprFor(TIER.ultra, 3)).toBe(2.5);
  });

  it("?stage=: ultra, high, static; medium dan low lama menjadi high", () => {
    expect(parseTier("ultra")).toBe("ultra");
    expect(parseTier("high")).toBe("high");
    expect(parseTier("static")).toBe("static");
    expect(parseTier("medium")).toBe("high");
    expect(parseTier("low")).toBe("high");
    expect(parseTier("x")).toBeUndefined();
    expect(parseTier(null)).toBeUndefined();
  });
});

describe("pengatur FPS (createGovernor)", () => {
  /** Jalankan `ms` milidetik frame berjarak `dt`; kembalikan tier yang dilaporkan dan jam akhir. */
  function run(g: ReturnType<typeof createGovernor>, from: number, ms: number, dt: number) {
    const moves: string[] = [];
    let t = from;
    for (; t < from + ms; t += dt) {
      const r = g.sample(dt, t);
      if (r) moves.push(r);
    }
    return { moves, t };
  }
  /** Jalankan sampai pengatur pindah (atau `max` ms habis). */
  const until = (g: ReturnType<typeof createGovernor>, from: number, dt: number, max: number) => {
    for (let t = from; t < from + max; t += dt) {
      const r = g.sample(dt, t);
      if (r) return { move: r as string | null, t };
    }
    return { move: null as string | null, t: from + max };
  };

  it("60 fps yang stabil: tidak pernah pindah, fps terukur", () => {
    const g = createGovernor("ultra", 0);
    const { moves } = run(g, 0, 12_000, 1000 / 60);
    expect(moves).toEqual([]);
    expect(g.fps()).toBeGreaterThan(59);
    expect(g.capped()).toBe(false);
    expect(g.tier()).toBe("ultra");
    expect(g.fell()).toBe(0);
  });

  it("Ultra berat (40 fps): turun ke High sekali, tidak lebih cepat dari pemanasan + jendela, lalu tetap di High", () => {
    const early = run(createGovernor("ultra", 0), 0, GOVERNOR.warmup + GOVERNOR.window * 0.8, 25);
    expect(early.moves).toEqual([]);
    const g = createGovernor("ultra", 0);
    const { moves } = run(g, 0, 120_000, 25);
    expect(moves).toEqual(["high"]);
    expect(g.tier()).toBe("high");
    expect(g.fell()).toBe(40);
  });

  it("Ultra di 47 fps tetap Ultra; di bawah 45 turun", () => {
    expect(run(createGovernor("ultra", 0), 0, 20_000, 1000 / 47).moves).toEqual([]);
    expect(run(createGovernor("ultra", 0), 0, 20_000, 1000 / 43).moves).toEqual(["high"]);
  });

  it("High tidak pernah turun, apa pun fpsnya: tanpa Medium, Low, skala, atau Static", () => {
    for (const fps of [40, 25, 12, 5]) {
      const g = createGovernor("high", 0);
      const { moves } = run(g, 0, 120_000, 1000 / fps);
      expect(moves, `${fps} fps`).toEqual([]);
      expect(g.tier()).toBe("high");
    }
  });

  it("High yang dimulai di High tidak pernah naik ke Ultra, walau 60 fps", () => {
    const g = createGovernor("high", 0);
    expect(run(g, 0, 120_000, 1000 / 60).moves).toEqual([]);
    expect(g.tier()).toBe("high");
  });

  it("Static tidak pernah berubah", () => {
    const g = createGovernor("static", 0);
    expect(run(g, 0, 60_000, 1000 / 60).moves).toEqual([]);
    expect(g.tier()).toBe("static");
  });

  it("kembali ke Ultra hanya sesudah lama lancar, dan Ultra yang terbukti berat tidak dicoba ulang", () => {
    const g = createGovernor("ultra", 0);
    const down = until(g, 0, 25, 10_000);
    expect(down.move).toBe("high");
    // lancar: belum boleh naik sebelum jeda habis
    const early = run(g, down.t, GOVERNOR.upCooldown - 500, 1000 / 60);
    expect(early.moves).toEqual([]);
    expect(g.tier()).toBe("high");
    const up = until(g, early.t, 1000 / 60, 5000);
    expect(up.move).toBe("ultra");
    expect(g.fell()).toBe(0);
    // berat lagi tak lama sesudah naik → turun, lalu tidak pernah naik lagi
    const again = until(g, up.t, 25, 10_000);
    expect(again.move).toBe("high");
    expect(again.t - up.t).toBeLessThan(GOVERNOR.retreat);
    const calm = run(g, again.t, 90_000, 1000 / 60);
    expect(calm.moves).toEqual([]);
    expect(g.tier()).toBe("high");
  });

  it("layar 30 Hz (Low Power Mode): 30 fps stabil tidak dianggap berat, dan tidak pernah naik", () => {
    const g = createGovernor("ultra", 0);
    const { moves } = run(g, 0, 40_000, 33.4);
    expect(moves).toEqual([]);
    expect(g.capped()).toBe(true);
    expect(g.fps()).toBeGreaterThan(29);
  });

  it("tier dipaksa: hanya mengukur", () => {
    const g = createGovernor("ultra", 0, true);
    const { moves } = run(g, 0, 20_000, 40);
    expect(moves).toEqual([]);
    expect(g.fps()).toBeCloseTo(25, 0);
    expect(g.tier()).toBe("ultra");
  });

  it("jeda panjang (tab kembali, GC besar) bukan data kehalusan: jendela dimulai ulang", () => {
    const g = createGovernor("ultra", 0);
    const a = run(g, 0, 4000, 1000 / 60);
    expect(g.sample(900, a.t + 900)).toBeNull();
    expect(g.fps()).toBe(0);
    // satu jeda panjang di tengah frame lancar tidak menurunkan tier
    const b = run(g, a.t + 900, 8000, 1000 / 60);
    expect(b.moves).toEqual([]);
  });
});

describe("shot kamera (shots.ts)", () => {
  const finite = (s: Shot) => [...s.pos, ...s.look, s.fov, s.lamp, s.dim, s.focus, s.sky].every(Number.isFinite);

  it("tiap slide film punya shot yang wajar, di layar lebar maupun tegak", () => {
    for (const frame of [WIDE, TALL]) {
      for (const slide of film.slides) {
        const s = shotFor(slide, frame);
        expect(finite(s), slide.id).toBe(true);
        expect(s.fov, slide.id).toBeGreaterThanOrEqual(28);
        expect(s.fov, slide.id).toBeLessThanOrEqual(56);
        expect(s.pos[1], slide.id).toBeGreaterThanOrEqual(0.35); // tidak pernah di bawah lantai
        expect(s.dim, slide.id).toBeGreaterThanOrEqual(0);
        expect(s.dim, slide.id).toBeLessThan(0.5);
        expect(s.sky, slide.id).toBeGreaterThanOrEqual(1);
        expect(s.sky, slide.id).toBeLessThanOrEqual(5);
      }
    }
  });

  it("shot orbit tidak berdiri di dalam saka guru", () => {
    for (const slide of film.slides) {
      const s = shotFor(slide, WIDE);
      for (const sx of [-3.5, 3.5]) for (const sz of [-3.5, 3.5]) expect(Math.hypot(s.pos[0] - sx, s.pos[2] - sz), slide.id).toBeGreaterThan(0.6);
    }
  });

  it("layar tegak: lensa melebar terbatas, sisanya kamera mundur sampai gong tetap utuh", () => {
    expect(fitFov(34, 16 / 9)).toBe(34);
    expect(fitFov(34, TALL.aspect)).toBeGreaterThan(34);
    expect(fitFov(50, 0.3)).toBeLessThanOrEqual(56);
    const hero = film.slides[firstOf("hero")]!;
    const [wide, tall] = [shotFor(hero, WIDE), shotFor(hero, TALL)];
    expect(tall.fov).toBeGreaterThan(wide.fov);
    // lebar yang tampak di jarak gong ≥ lebar gayor (3,5 m), juga di layar yang sangat sempit
    for (const aspect of [TALL.aspect, 0.3]) {
      const s = shotFor(hero, { aspect });
      const visible = 2 * dist(s.pos, [0, s.pos[1], 0]) * Math.tan(hfovOf(s.fov, aspect) / 2);
      expect(visible).toBeGreaterThanOrEqual(3.5 * 0.995); // jarak mendatar sedikit lebih pendek dari jarak sebenarnya (kamera agak menunduk)
    }
    const narrow = shotFor(hero, { aspect: 0.3 });
    expect(dist(narrow.pos, [0, narrow.pos[1], 0])).toBeGreaterThan(dist(wide.pos, [0, wide.pos[1], 0]) + 1);
  });

  it("gallery: kamera bergeser menyamping mengikuti letak panel, memandang lanskap (−z)", () => {
    const [a, b] = [galleryShot(0, WIDE), galleryShot(1, WIDE)];
    expect(b.pos[0]).toBeGreaterThan(a.pos[0]);
    expect(a.pos[1]).toBe(b.pos[1]);
    expect(a.look[2]).toBeLessThan(a.pos[2] - 10);
    expect(a.rig).toBe("vista");
  });

  it("gallery, letak Z (Tugas 7b): ±1 m per panel; tanah dekat, dataran, dan Lawu bergeser berbeda di layar", () => {
    const day1 = film.slides.filter((s) => s.kind === "panel" && s.chapter === film.slides[firstOf("panel")]!.chapter);
    const [p0, p1] = [shotFor(day1[0]!, WIDE), shotFor(day1[1]!, WIDE)];
    const per = Math.abs(p1.pos[0] - p0.pos[0]);
    expect(per).toBeGreaterThan(0.6);
    expect(per).toBeLessThan(1.6);
    // titik di tanah dekat (±15 m) dan di kaki Lawu (±600 m) yang sama-sama di tengah layar pada panel pertama
    const near: Vec3 = [p0.pos[0], -9, p0.pos[2] - 15];
    const lawu: Vec3 = [p0.pos[0], 40, p0.pos[2] - 600];
    const shift = (q: Vec3) => projectPoint(p1, WIDE.aspect, q).x - projectPoint(p0, WIDE.aspect, q).x;
    // kamera bergeser ke kanan sambil sedikit memandang ulang ke tengah (perspective shift): tanah dekat bergeser ke
    // kiri searah rel kartu, Lawu sedikit ke kanan; seperti mengorbit titik di dataran ±90 m
    expect(shift(near)).toBeLessThan(-0.05);
    expect(shift(lawu)).toBeGreaterThan(0);
    expect(Math.abs(shift(near))).toBeGreaterThan(Math.abs(shift(lawu)) * 4);
    const plain: Vec3 = [p0.pos[0], -9, p0.pos[2] - 90];
    expect(Math.abs(shift(plain))).toBeLessThan(Math.abs(shift(near)) * 0.25);
  });

  it("depth of field hanya di gallery: kadar 1 di panel, 0 di shot lain, dan berpindah bersama kamera", () => {
    for (const kind of ["hero", "headline", "title", "dayintro", "gong", "credits"] as const) expect(shotFor(film.slides[firstOf(kind)]!, WIDE).dof, kind).toBe(0);
    const [intro, panel] = [shotFor(film.slides[firstOf("dayintro")]!, WIDE), shotFor(film.slides[firstOf("panel")]!, WIDE)];
    expect(panel.dof).toBe(1);
    expect(blendShot(intro, panel, 0.5, "slide").dof).toBeGreaterThan(0.3);
    expect(blendShot(intro, panel, 0.5, "slide").dof).toBeLessThan(0.7);
  });

  it("gradien langit: tepi atas layar jatuh di ketinggian yang sama pada shot apa pun", () => {
    for (const kind of ["hero", "panel", "dayintro"] as const) {
      const s = shotFor(film.slides[firstOf(kind)]!, WIDE);
      const pitch = Math.asin((s.look[1] - s.pos[1]) / dist(s.pos, s.look)) * (180 / Math.PI);
      expect((pitch + s.fov / 2) * s.sky, kind).toBeCloseTo(38, 0);
    }
    // menunduk tajam (cakrawala di luar layar): pengali dibatasi
    expect(skyStretch([0, 10, 0], [0, 0, -1], 30)).toBe(5);
    expect(skyStretch([0, 1, 0], [0, 30, -10], 40)).toBe(1);
  });

  it("perpindahan: ujung-ujungnya tepat, sapuan gunungan memotong di tengah", () => {
    const [a, b] = [shotFor(film.slides[firstOf("hero")]!, WIDE), shotFor(film.slides[firstOf("panel")]!, WIDE)];
    expect(blendShot(a, b, 0, "slide")).toBe(a);
    expect(blendShot(a, b, 1, "slide")).toBe(b);
    expect(blendShot(a, b, 0.49, "wipe")).toBe(a);
    expect(blendShot(a, b, 0.5, "wipe")).toBe(b);
  });

  it("orbit → orbit: kamera mengitari panggung, tidak menembus pusatnya", () => {
    const left = shotFor({ ...film.slides[firstOf("fact")]!, n: 1, of: 2 } as Slide, WIDE);
    const right = shotFor({ ...film.slides[firstOf("fact")]!, n: 2, of: 2 } as Slide, WIDE);
    const least = Math.min(dist(left.pos, left.look), dist(right.pos, right.look));
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const s = blendShot(left, right, Math.min(1, p), "slide");
      expect(dist(s.pos, s.look)).toBeGreaterThan(least - 0.05);
    }
    // garis lurus di antara keduanya akan lewat jauh lebih dekat
    const mid: Vec3 = [(left.pos[0] + right.pos[0]) / 2, (left.pos[1] + right.pos[1]) / 2, (left.pos[2] + right.pos[2]) / 2];
    expect(dist(mid, STAGE_CENTER)).toBeLessThan(least - 1);
  });

  it("orbit ↔ vista: lintasan melengkung ke atas, dan tidak ada lompatan di sepanjang jalan", () => {
    const [a, b] = [shotFor(film.slides[firstOf("gong")]!, WIDE), shotFor(film.slides[firstOf("panel")]!, WIDE)];
    const mid = blendShot(a, b, 0.5, "slide");
    expect(mid.pos[1]).toBeGreaterThan(Math.max(a.pos[1], b.pos[1]));
    let prev = blendShot(a, b, 0, "slide");
    for (let i = 1; i <= 200; i++) {
      const s = blendShot(a, b, i / 200, "slide");
      expect(dist(s.pos, prev.pos)).toBeLessThan(0.35);
      expect(Math.abs(s.fov - prev.fov)).toBeLessThan(0.5);
      prev = s;
    }
  });

  it("matahari 3D jatuh di titik layar yang sama dengan matahari 2,5D", () => {
    const frame = { aspect: 16 / 9, horizon: -SUN_TRACK.bottom };
    const cam = galleryShot(0.5, frame);
    for (const [u, v] of [[0, 1], [0.5, 0], [1, 1], [0.3, 0.4]] as const) {
      const d = sunDirection(u, v, SUN_TRACK, frame.aspect);
      expect(Math.hypot(...d)).toBeCloseTo(1, 6);
      // proyeksikan kembali ke layar kamera gallery
      const want: [number, number] = [SUN_TRACK.left + (SUN_TRACK.right - SUN_TRACK.left) * u, SUN_TRACK.top + (SUN_TRACK.bottom - SUN_TRACK.top) * v];
      const back = rayThrough(cam, frame.aspect, want[0], want[1]);
      expect(dist(d, back)).toBeLessThan(1e-9);
    }
    const [rise, noon, set] = [sunDirection(0, 1, SUN_TRACK, 16 / 9), sunDirection(0.5, 0, SUN_TRACK, 16 / 9), sunDirection(1, 1, SUN_TRACK, 16 / 9)];
    expect(rise[0]).toBeLessThan(0); // terbit di kiri (timur), terbenam di kanan
    expect(set[0]).toBeGreaterThan(0);
    expect(Math.abs(rise[1])).toBeLessThan(0.01); // tepi bawah lintasan = cakrawala
    expect(noon[1]).toBeGreaterThan(rise[1] + 0.05);
    expect(noon[2]).toBeLessThan(0); // di arah lanskap
  });
});

describe("suasana (mood.ts)", () => {
  it("hex → warna linear", () => {
    expect(hex("#000000")).toEqual([0, 0, 0]);
    expect(hex("#ffffff")[0]).toBeCloseTo(1, 6);
    expect(hex("#808080")[1]).toBeCloseTo(0.2158, 3);
  });

  it("malam: bintang penuh, blencong menyala, cahaya kunci dari bulan", () => {
    const m = moodOf(STILL.night);
    expect(m.stars).toBe(1);
    expect(m.lamp).toBe(1);
    expect(m.sun).toBe(0);
    expect(m.disc).toBe(0);
    expect(m.key[2]).toBeGreaterThan(m.key[0]); // kebiruan
  });

  it("siang: tanpa bintang, blencong nyaris padam, matahari menjadi cahaya kunci", () => {
    const m = moodOf(STILL.day);
    expect(m.stars).toBe(0);
    expect(m.lamp).toBeLessThan(0.2);
    expect(m.sun).toBeCloseTo(STILL.day.sun.opacity, 6);
    const night = moodOf(STILL.night);
    expect(m.key[0] + m.key[1] + m.key[2]).toBeGreaterThan(4 * (night.key[0] + night.key[1] + night.key[2]));
    expect(m.sky[0]![0]).toBeGreaterThan(m.sky[4]![0]); // cakrawala lebih terang dari zenit
  });

  it("gerbang menutup matahari; langit di antara dua fase bercampur", () => {
    expect(moodOf(STILL.gate).sun).toBe(0);
    const half = moodOf({ ...STILL.night, day: 0.5 });
    const [n, d] = [moodOf(STILL.night), moodOf({ ...STILL.night, day: 1 })];
    expect(half.stars).toBeCloseTo((n.stars + d.stars) / 2, 6);
    expect(half.fogDensity).toBeCloseTo((n.fogDensity + d.fogDensity) / 2, 6);
    expect(mixMood(n, d, 0)).toBe(n);
    expect(mixMood(n, d, 1)).toBe(d);
    expect(mixMood(n, d, 0.5).exposure).toBeCloseTo((n.exposure + d.exposure) / 2, 6);
  });

  it("arah cahaya: rendah saat terbit dan terbenam, tinggi di tengah hari", () => {
    expect(lightElevation(1)).toBeLessThan(lightElevation(0.5));
    expect(lightElevation(0.5)).toBeLessThan(lightElevation(0));
    expect(lightElevation(0)).toBeGreaterThan(1); // > 57°
    expect(lightElevation(5)).toBe(lightElevation(1));
  });
});

describe("cue: letak film → shot + langit (cue.ts)", () => {
  it("skyAlong: linear di antara titik kunci, ditahan di luar", () => {
    const keys = [[0.2, STILL.night], [0.6, STILL.day]] as const;
    expect(skyAlong(keys, 0)).toBe(STILL.night);
    expect(skyAlong(keys, 0.9)).toBe(STILL.day);
    const mid = skyAlong(keys, 0.4);
    expect(mid.day).toBeCloseTo((STILL.night.day + STILL.day.day) / 2, 6);
    expect(mid.sun.opacity).toBeCloseTo((STILL.night.sun.opacity + STILL.day.sun.opacity) / 2, 6);
    expect(skyAlong([], 0.5)).toBe(STILL.night);
  });

  it("diam: shot dan langit slide itu sendiri", () => {
    const cues = createCues(film, WIDE);
    for (const i of [0, firstOf("panel"), film.slides.length - 1]) {
      const c = cues({ from: i, to: i, p: 0 });
      expect(c.moving).toBe(false);
      expect(c.shot).toEqual(shotFor(film.slides[i]!, WIDE));
      expect(c.sky).toEqual(skyState(film.slides[i]!));
    }
    // indeks di luar film tidak melempar galat
    expect(cues({ from: 999, to: 999, p: 0 }).sky).toBe(STILL.gate);
  });

  it("transisi: kamera berangkat dari shot asal dan tiba di shot tujuan", () => {
    const cues = createCues(film, WIDE);
    const i = firstOf("headline");
    const [a, b] = [shotFor(film.slides[i]!, WIDE), shotFor(film.slides[i + 1]!, WIDE)];
    const start = cues({ from: i, to: i + 1, p: 0.001 });
    const end = cues({ from: i, to: i + 1, p: 1 });
    expect(start.moving).toBe(true);
    expect(dist(start.shot.pos, a.pos)).toBeLessThan(0.01);
    expect(end.shot).toEqual(b);
    expect(end.moving).toBe(false);
    const mid = cues({ from: i, to: i + 1, p: 0.5 }).shot;
    expect(dist(mid.pos, a.pos)).toBeGreaterThan(0.2);
    expect(dist(mid.pos, b.pos)).toBeGreaterThan(0.2);
  });

  it("langit berganti di jendela yang sama dengan lapisan DOM", () => {
    const cues = createCues(film, WIDE);
    // intro hari → panel pertama: rupa "slide", langit baru bergerak sesudah awal jendela
    const i = firstOf("dayintro");
    expect(transitionKind(film, i, i + 1)).toBe("slide");
    const before = cues({ from: i, to: i + 1, p: SKY_WINDOW.slide[0] * 0.5 });
    expect(before.sky).toEqual(skyState(film.slides[i]!));
    const after = cues({ from: i, to: i + 1, p: (SKY_WINDOW.slide[1] + 1) / 2 });
    expect(after.sky).toEqual(skyState(film.slides[i + 1]!));
    // di dalam gallery: selama menembus gerbang dimensi (tengah geseran), mulus tanpa lompatan
    const p = firstOf("panel");
    expect(transitionKind(film, p, p + 1)).toBe("inner");
    expect(SKY_WINDOW.inner).toEqual([0.25, 0.75]);
    expect(cues({ from: p, to: p + 1, p: 0.2 }).sky).toEqual(skyState(film.slides[p]!));
    expect(cues({ from: p, to: p + 1, p: 0.8 }).sky).toEqual(skyState(film.slides[p + 1]!));
    const sunAt = (q: number) => cues({ from: p, to: p + 1, p: q }).sky.sun.u;
    const [a0, a1] = [sunAt(0.25), sunAt(0.75)];
    expect(Math.abs(sunAt(0.5) - (a0 + a1) / 2)).toBeLessThan(Math.abs(a1 - a0) * 0.05 + 1e-9);
  });
});

describe("lanskap (terrain.ts)", () => {
  it("pendapa di puncak bukit datar, dataran ±9 m di bawahnya", () => {
    expect(Math.abs(terrainHeight(0, 0))).toBeLessThan(1e-3);
    expect(Math.abs(terrainHeight(3, -4))).toBeLessThan(1e-3); // ekor lereng Lawu: di bawah satu milimeter
    for (const [x, z] of [[80, 0], [0, 90], [-70, -60], [100, 100]] as const) {
      const y = terrainHeight(x, z);
      expect(y).toBeGreaterThan(TERRAIN.plain - 2);
      expect(y).toBeLessThan(TERRAIN.plain + 2);
    }
  });

  it("Lawu menjulang di kiri tengah lintasan matahari; kedua ujung lintasan rendah", () => {
    const { trackHalf: half } = TERRAIN_DEFAULT;
    const at = (az: number) => terrainHeight(TERRAIN.lawuAt * Math.sin(az), -TERRAIN.lawuAt * Math.cos(az));
    const peak = at(-0.3 * half);
    expect(peak).toBeGreaterThan(20);
    expect(at(-0.95 * half)).toBeLessThan(peak * 0.35);
    expect(at(0.95 * half)).toBeLessThan(peak * 0.35);
    // di belakang pendapa (arah +z) tidak ada gunung
    expect(terrainHeight(0, TERRAIN.lawuAt)).toBeLessThan(peak * 0.4);
    // lintasan yang lebih tinggi di layar → gunung boleh lebih tinggi
    const tall = terrainHeight(TERRAIN.lawuAt * Math.sin(-0.3 * half), -TERRAIN.lawuAt * Math.cos(-0.3 * half), { trackHalf: half, trackTop: 0.17 });
    expect(tall).toBeGreaterThan(peak);
  });

  it("deterministik, dan derau fraktal tetap di 0–1", () => {
    expect(terrainHeight(123.4, -567.8)).toBe(terrainHeight(123.4, -567.8));
    for (let i = 0; i < 200; i++) {
      const v = fbm(i * 0.37, i * -0.91);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("lampu desa: jumlah tepat, di atas tanah, di luar bukit pendapa, selalu sama", () => {
    const a = villageLights(600);
    expect(a.position.length).toBe(1800);
    expect(Array.from(villageLights(600).position)).toEqual(Array.from(a.position));
    let near = 0;
    for (let i = 0; i < 600; i++) {
      const [x, y, z] = [a.position[i * 3]!, a.position[i * 3 + 1]!, a.position[i * 3 + 2]!];
      expect(y).toBeCloseTo(terrainHeight(x, z) + 2.2, 3);
      if (Math.hypot(x, z) < 20) near++;
    }
    expect(near).toBe(0);
    expect(villageLights(0).position.length).toBe(0);
  });
});

describe("gerbang dimensi di gallery (PORTAL)", () => {
  it("nol di kedua ujung geseran, puncak di tengah, simetris", () => {
    expect(portalWarp(0)).toBe(0);
    expect(portalWarp(1)).toBeCloseTo(0, 9);
    expect(portalWarp(0.5)).toBeCloseTo(1, 9);
    expect(portalWarp(0.3)).toBeCloseTo(portalWarp(0.7), 9);
    expect(portalWarp(0.1)).toBeLessThan(portalWarp(0.3));
    expect(portalWarp(-1)).toBe(0);
  });

  it("kartu yang menukik tetap di depan mata (di bawah jarak pandang gallery), yang muncul datang dari jauh", () => {
    expect(DEPTH.portalNear).toBeLessThan(DEPTH.perspective * 0.6);
    expect(DEPTH.portalFar).toBeLessThan(DEPTH.cardZ * 5);
  });

  it("cincin riak: maju menyebar dari tengah, mundur menyusut ke tengah", () => {
    expect(portalRing(0.2, 1)).toBeCloseTo(0.2, 9);
    expect(portalRing(0.2, -1)).toBeCloseTo(0.8, 9);
    expect(portalRing(1, 1)).toBe(1);
    expect(portalRing(1, -1)).toBe(0);
  });
});
