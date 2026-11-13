/**
 * Isi panggung 3D di luar React: membangun dunia (langit, lanskap, pendapa, gong, blencong, debu), menjalankan loop,
 * dan menggambar tiap frame. Stage3D.tsx hanya memasang dan membongkarnya.
 *
 * Tiap frame: letak film (`probe`) → cue (shot kamera + keadaan langit) → uniform bersama dan kamera → rantai
 * post. Loop berhenti saat tab tersembunyi, melambat saat diam di tier rendah, dan memberi makan pengatur tier.
 */
import { type PerspectiveCamera, type Scene, Vector2, Vector3, type WebGLRenderer } from "three";
import type { Film } from "@/engine/slides/build-slides";
import type { SkyState } from "@/engine/slides/sky";
import { stageBus } from "@/engine/stage/bus";
import { createCues, type Cursor } from "@/engine/stage/cue";
import { heartbeat, kickSize, strikeLight } from "@/engine/stage/gong";
import { sweepPose } from "@/engine/stage/gunungan";
import { lightElevation, type Mood, moodOf } from "@/engine/stage/mood";
import { type Frame, SUN_TRACK, sunDirection, type SunTrack } from "@/engine/stage/shots";
import { TERRAIN_DEFAULT, type TerrainShape } from "@/engine/stage/terrain";
import type { Governor, Rung, Tier, TierSpec } from "@/engine/stage/tier";
import { createBlencong } from "./blencong";
import { createDust } from "./dust";
import { createGong } from "./gong";
import { createGunungan } from "./gunungan";
import { createPendapa } from "./pendapa";
import { StagePost } from "./post";
import { createShared } from "./shared";
import { createSky, MOON_DIR } from "./sky";
import { createTerrain } from "./terrain";
import { createVillage } from "./village";

/** Angka yang dibaca overlay FPS, tes, dan skrip ukur. */
export type StageStats = {
  tier: Tier;
  scale: number;
  /** fps rata-rata ±3 dtk dari pengatur tier (0 bila belum cukup data, atau saat diam di tier Low). */
  fps: number;
  /** Laju frame layar saat ini (rata-rata pendek dari jarak antar requestAnimationFrame): yang ditampilkan overlay. */
  pace: number;
  /** Waktu CPU untuk satu frame (ms), rata-rata bergerak. */
  work: number;
  frames: number;
  calls: number;
  triangles: number;
  capped: boolean;
  camera: [number, number, number];
  fov: number;
  /** Indeks slide tempat kamera berada (asal transisi). */
  index: number;
  moving: boolean;
  /** Jumlah hantaman tabuh ke gong sejak panggung hidup. */
  strikes: number;
  /** Besar hentakan dan getar kamera pada frame terakhir (0 = kamera diam di shot-nya). */
  kick: number;
  /** Gunungan 3D siap (teksturnya sudah di GPU), dan sedang menyapu di frame terakhir. */
  kayon: boolean;
  /** Jam panggung pada frame terakhir (detik). */
  time: number;
  /** Hanya untuk pratinjau dan uji: kamera dipaksa ke [x, y, z, lihatX, lihatY, lihatZ, fov] (ditulis dari konsol atau skrip). */
  cam?: readonly number[];
  /** Hanya untuk pratinjau dan uji: gunungan ditahan di [kemajuan sapuan 0–1, arah (1 maju, −1 mundur), kadar geni 0–1]. */
  sweepAt?: readonly number[];
};

export type StageHooks = {
  /** Letak film saat ini (slide asal, tujuan, kemajuan transisi). */
  probe(): Cursor;
  /** Frame pertama sudah tergambar. */
  onLive(): void;
  /** Tidak bisa lanjut (konteks WebGL hilang, atau terlalu berat bahkan di tier terendah). */
  onFail(why: "lost" | "slow"): void;
  /** Pengatur FPS pindah anak tangga. */
  onRung(r: Rung): void;
  /** Sesudah tiap frame (overlay FPS). */
  onStats?(): void;
};

export type RuntimeOptions = {
  gl: WebGLRenderer;
  scene: Scene;
  /** `advance` milik R3F: menjalankan satu frame (frameloop "never"). */
  advance: (timestamp: number) => void;
  film: Film;
  /** Akar film: tempat mengukur bentuk layar dan lintasan matahari (`.fl-sunbox`). */
  root: () => HTMLElement | null;
  spec: TierSpec;
  governor: Governor;
  stats: StageStats;
  /** Dibaca tiap dipakai, supaya selalu memakai callback terbaru dari React. */
  hooks: () => StageHooks;
};

/** Frame pertama sesudah dunia dibangun yang tidak dihitung dalam rata-rata waktu kerja. */
const WARM_FRAMES = 3;
const LAMP_RGB = [1, 0.56, 0.24] as const;
const LAMP_POWER = 5.2;
/** Warna kilatan pukulan gong (bara jingga). */
const FLASH_RGB = [1, 0.44, 0.15] as const;
const isMobile = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

export type Runtime = {
  update(camera: PerspectiveCamera, t: number, dt: number): void;
  layout(): void;
  resize(): void;
  dispose(): void;
};

export function createRuntime({ gl, scene, advance, film, root, spec, governor, stats, hooks }: RuntimeOptions): Runtime {
  const shared = createShared();
  const sky = createSky(shared);
  const shape0 = TERRAIN_DEFAULT;
  const terrain = createTerrain(shared, shape0);
  const pendapa = createPendapa(shared);
  const blencong = createBlencong(shared, spec.bloom >= 4);
  const gong = createGong(shared, spec.particles);
  /** Jam panggung pada frame terakhir (detik). Pukulan dicatat pada jam ini, bukan jam dinding: satu jam untuk semua gerak 3D. */
  let clock = 0;
  // tombol pukul di lapisan DOM memicu gong lewat bus
  const unbindGong = stageBus.bindGong(() => gong.strike(clock));
  const dust = createDust(shared, Math.round((isMobile() ? 2000 : 3600) * spec.particles));
  const village = createVillage(shared, Math.round(1500 * Math.max(0.4, spec.particles)));
  // gunungan: tekstur dimuat di latar; sampai siap, sapuan antar bab tetap digambar lapisan DOM
  const gunungan = createGunungan({ gl, shared, large: spec.dof, onReady: (ok) => stageBus.setKayon(ok) });
  const nodes = [terrain.mesh, pendapa.group, gong.group, blencong.group, village.points, dust.points, sky.mesh, ...gunungan.nodes];
  scene.add(...nodes);
  const post = new StagePost(gl, spec);
  gl.info.autoReset = false;

  let frame: Frame = { aspect: 16 / 9 };
  let track: SunTrack = SUN_TRACK;
  let shape: TerrainShape = shape0;
  let cues = createCues(film, frame);
  let lastSky: SkyState | null = null;
  let mood: Mood | null = null;
  const sunDir = new Vector3();
  const sunLight = new Vector3();
  const buf = new Vector2();
  const look = new Vector3();
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, at: -1e9 };

  const layout = () => {
    const el = root();
    const w = el?.clientWidth ?? 0;
    const h = el?.clientHeight ?? 0;
    if (!el || !w || !h) return;
    const o = el.getBoundingClientRect();
    const box = el.querySelector(".fl-sunbox")?.getBoundingClientRect();
    track = box && box.width > 0 ? { left: (2 * (box.left - o.left)) / w - 1, right: (2 * (box.right - o.left)) / w - 1, top: 1 - (2 * (box.top - o.top)) / h, bottom: 1 - (2 * (box.bottom - o.top)) / h } : SUN_TRACK;
    frame = { aspect: w / h, horizon: -track.bottom };
    cues = createCues(film, frame);
    lastSky = null;
    // lanskap mengikuti lebar dan tinggi lintasan matahari di layar ini
    const end = sunDirection(1, 1, track, frame.aspect);
    const top = sunDirection(0.5, 0, track, frame.aspect);
    const next: TerrainShape = { trackHalf: Math.abs(Math.atan2(end[0], -end[2])), trackTop: Math.asin(Math.max(0, Math.min(1, top[1]))) };
    if (Math.abs(next.trackHalf - shape.trackHalf) > 0.02 || Math.abs(next.trackTop - shape.trackTop) > 0.01) {
      shape = next;
      terrain.reshape(shape);
    }
  };
  /** Kanvas baru saja berganti ukuran (isinya terhapus): frame berikutnya wajib digambar walau sedang diam. */
  let stale = true;
  const resize = () => {
    stale = true;
    gl.getDrawingBufferSize(buf);
    post.setSize(Math.max(1, buf.x), Math.max(1, buf.y));
  };

  const update = (camera: PerspectiveCamera, t: number, dt: number) => {
    clock = t;
    const cursor = hooks().probe();
    const cue = cues(cursor);
    const shot = cue.shot;
    const s = cue.sky;
    if (s !== lastSky || !mood) {
      lastSky = s;
      mood = moodOf(s);
      const d = sunDirection(s.sun.u, s.sun.v, track, frame.aspect);
      sunDir.set(d[0], d[1], d[2]);
      // arah cahaya: azimut matahari di layar, tetapi tingginya mengikuti jam (lihat lightElevation)
      const el = lightElevation(s.sun.v);
      const flat = Math.hypot(d[0], d[2]) || 1;
      sunLight.set((d[0] / flat) * Math.cos(el), Math.sin(el), (d[2] / flat) * Math.cos(el));
      const u = shared;
      mood.sky.forEach((c, i) => u.uSky.value[i]!.setRGB(c[0], c[1], c[2]));
      u.uSunDir.value.copy(sunDir);
      u.uSunDisc.value = mood.disc;
      u.uWarm.value = mood.warm;
      u.uSunScale.value = mood.sunScale;
      u.uStars.value = mood.stars;
      u.uKeyDir.value.copy(MOON_DIR).lerp(sunLight, mood.sun).normalize();
      u.uKeyColor.value.setRGB(mood.key[0], mood.key[1], mood.key[2]);
      u.uAmbSky.value.setRGB(mood.ambientSky[0], mood.ambientSky[1], mood.ambientSky[2]);
      u.uAmbGround.value.setRGB(mood.ambientGround[0], mood.ambientGround[1], mood.ambientGround[2]);
      // kabut dekat: campuran warna kabut dan warna cakrawala, supaya menyatu dengan langit
      const h0 = mood.sky[0]!;
      u.uFogColor.value.setRGB(mood.fog[0] * 0.5 + h0[0] * 0.5, mood.fog[1] * 0.5 + h0[1] * 0.5, mood.fog[2] * 0.5 + h0[2] * 0.5);
      u.uFogDensity.value = mood.fogDensity;
      u.uNight.value = (1 - s.dawn) * (1 - s.day) * (1 - 0.7 * s.dusk);
    }
    shared.uTime.value = t;
    shared.uSkyStretch.value = shot.sky;
    // nyala blencong: kuatnya dari suasana × shot, bergetar pelan
    const flicker = 0.9 + 0.06 * Math.sin(t * 9.1) + 0.04 * Math.sin(t * 23.7 + 1.3);
    const lamp = mood.lamp * shot.lamp;
    const k = LAMP_POWER * lamp * flicker;
    shared.uLampColor.value.setRGB(LAMP_RGB[0] * k, LAMP_RGB[1] * k, LAMP_RGB[2] * k);
    blencong.setGlow(Math.min(1.6, 0.25 + lamp) * flicker);
    const hit = gong.update(t, dt);
    const flash = strikeLight(hit.st);
    shared.uFlash.value.setRGB(FLASH_RGB[0] * flash, FLASH_RGB[1] * flash, FLASH_RGB[2] * flash);

    // kamera: shot + napas pelan + geseran kecil mengikuti kursor (parallax)
    const ease = 1 - Math.exp(-Math.min(0.1, dt) * 4);
    pointer.x += (pointer.tx - pointer.x) * ease;
    pointer.y += (pointer.ty - pointer.y) * ease;
    if (camera.fov !== shot.fov) {
      camera.fov = shot.fov;
      camera.updateProjectionMatrix();
    }
    camera.position.set(shot.pos[0], shot.pos[1], shot.pos[2]);
    camera.lookAt(look.set(shot.look[0], shot.look[1], shot.look[2]));
    const reach = shot.rig === "orbit" ? 1 : 0.6;
    camera.translateX((Math.sin(t * 0.21) * 0.035 + pointer.x * 0.18) * reach);
    camera.translateY((Math.sin(t * 0.17 + 1.3) * 0.022 - pointer.y * 0.09) * reach);
    // gong kena: kamera terhentak mundur dan bergetar pelan (simpangan getar dalam ukuran layar, jadi sama di lensa mana pun)
    const kick = hit.kick;
    const kicked = kickSize(kick);
    if (kicked > 0) {
      const lens = Math.tan((camera.fov * Math.PI) / 360);
      // shot lanskap berfokus jauh (40 m): hentakannya dibatasi seperti di shot pendapa
      camera.translateZ(kick.back * Math.min(shot.focus, 12));
      camera.rotateX(Math.atan(kick.up * lens));
      camera.rotateY(-Math.atan(kick.side * lens));
      camera.rotateZ(kick.roll);
    }
    const forced = stats.cam;
    if (forced && forced.length >= 7) {
      camera.fov = forced[6]!;
      camera.updateProjectionMatrix();
      camera.position.set(forced[0]!, forced[1]!, forced[2]!);
      camera.lookAt(look.set(forced[3]!, forced[4]!, forced[5]!));
    }
    camera.updateMatrixWorld();

    // gunungan: untuk pembuka dan penutup film (belum tersambung; keputusan host 13 Nov). Sapuan antar bab tetap
    // bayangan kayon DOM. Sementara hanya digambar saat pratinjau menahannya lewat `sweepAt`.
    const pin = stats.sweepAt;
    gunungan.update(pin && pin.length >= 2 ? sweepPose(pin[0]!, pin[1]! < 0 ? -1 : 1, frame.aspect, t) : null, camera, pointer, heartbeat(t), pin?.[2] ?? 0);

    gl.getDrawingBufferSize(buf);
    const pixel = buf.y / Math.tan((camera.fov * Math.PI) / 360);
    dust.setPixel(pixel);
    village.setPixel(pixel);
    gong.setPixel(pixel);
    gl.info.reset();
    post.render(scene, camera, { exposure: mood.exposure, dim: shot.dim, time: t });

    stats.frames++;
    stats.calls = gl.info.render.calls;
    stats.triangles = gl.info.render.triangles;
    stats.camera = [camera.position.x, camera.position.y, camera.position.z];
    stats.fov = camera.fov;
    stats.index = cursor.from;
    stats.moving = cue.moving;
    stats.strikes = hit.count;
    stats.kick = kicked;
    stats.kayon = gunungan.ready();
    stats.time = t;
  };
  layout();
  resize();

  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    pointer.at = performance.now();
  };
  window.addEventListener("pointermove", onPointer, { passive: true });
  const ro = new ResizeObserver(layout);
  const host = root();
  if (host) ro.observe(host);
  const canvas = gl.domElement;
  const onLost = (e: Event) => {
    e.preventDefault();
    hooks().onFail("lost");
  };
  canvas.addEventListener("webglcontextlost", onLost);

  // ---- loop ----
  let raf = 0;
  let live = false;
  let last = 0;
  /** Jam frame layar sebelumnya dan rata-rata jarak antar frame (ms), untuk overlay. */
  let prev = 0;
  let gap = 0;
  let n = 0;
  let work = 0;
  const born = performance.now();
  const tick = (ts: number) => {
    raf = requestAnimationFrame(tick);
    if (document.visibilityState === "hidden") {
      last = 0;
      prev = 0;
      return;
    }
    // laju layar: dihitung di tiap frame layar, juga yang sengaja tidak digambar saat diam
    if (prev && ts - prev > 0 && ts - prev < 250) gap += (ts - prev - gap) * (gap ? 0.06 : 1);
    prev = ts;
    n++;
    const c = hooks().probe();
    const now = performance.now();
    const active = c.to !== c.from || now - pointer.at < 900 || now - born < 1500 || gong.busy();
    if (!active && !stale && spec.idleEvery > 1 && n % spec.idleEvery !== 0) return;
    stale = false;
    const dt = last ? ts - last : 0;
    last = ts;
    const t0 = performance.now();
    advance(ts / 1000);
    // frame-frame awal memuat kompilasi shader: bukan beban tetap, jadi tidak masuk rata-rata
    if (stats.frames > WARM_FRAMES) work += (performance.now() - t0 - work) * (work ? 0.1 : 1);
    if (!live) {
      live = true;
      hooks().onLive();
    }
    // frame yang sengaja dilewati saat diam bukan data kehalusan
    const measured = active || spec.idleEvery === 1;
    const next = measured && dt > 0 ? governor.sample(dt, ts) : null;
    if (!measured) governor.rest(ts);
    stats.work = work;
    stats.fps = governor.fps();
    stats.pace = gap ? 1000 / gap : 0;
    stats.capped = governor.capped();
    hooks().onStats?.();
    if (next) {
      if (next.tier === "static") hooks().onFail("slow");
      else hooks().onRung(next);
    }
  };
  raf = requestAnimationFrame(tick);

  const dispose = () => {
    cancelAnimationFrame(raf);
    unbindGong();
    stageBus.setKayon(false);
    window.removeEventListener("pointermove", onPointer);
    ro.disconnect();
    canvas.removeEventListener("webglcontextlost", onLost);
    scene.remove(...nodes);
    sky.dispose();
    terrain.dispose();
    pendapa.dispose();
    blencong.dispose();
    gong.dispose();
    gunungan.dispose();
    dust.dispose();
    village.dispose();
    post.dispose();
  };
  return { update, layout, resize, dispose };
}
