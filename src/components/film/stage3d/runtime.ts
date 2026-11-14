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
import { type GongPlace, stageBus } from "@/engine/stage/bus";
import { createCues, type Cursor } from "@/engine/stage/cue";
import { GONG, GONG_SCALE, heartbeat, kickSize, strikeLight } from "@/engine/stage/gong";
import { approach, DOF, dofFocus, GONG_ZOOM, ORBIT, scrollDepth, VIEW } from "@/engine/motion/view";
import { lookMoving, startLook, stepLook } from "../look";
import { gateCamera, gatePose, type KayonPose } from "@/engine/stage/gate";
import { type SweepPose, sweepPose } from "@/engine/stage/gunungan";
import { lightElevation, type Mood, moodOf } from "@/engine/stage/mood";
import { blendShot, type Frame, kayonShot, SUN_TRACK, sunDirection, type SunTrack } from "@/engine/stage/shots";
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
  /** Sudut kitar kamera mengelilingi gong pada frame terakhir (derajat; 0 = dari depan). */
  orbit: number;
  /** Gunungan 3D siap (teksturnya sudah di GPU). */
  kayon: boolean;
  /** Format rantai bloom ("r11g11b10" = hemat bandwidth aktif, "rgba16f", "rgba8"); depth MSAA tidak pernah di-resolve. */
  bloom: string;
  /** Gunungan pembuka/penutup pada frame terakhir: ujungnya, kadar tertancap (0–1), dan muka yang tampak. */
  gate: { end: "head" | "tail" | null; planted: number; face: "agung" | "murka" };
  /** Jam panggung pada frame terakhir (detik). */
  time: number;
  /** Depth of field pada frame terakhir (tier High, gallery): kadar 0–1, jarak fokus (m), dan apakah digambar. */
  dof: { amount: number; focus: number; drawn: boolean };
  /** Hanya untuk pratinjau dan uji: kamera dipaksa ke [x, y, z, lihatX, lihatY, lihatZ, fov] (ditulis dari konsol atau skrip). */
  cam?: readonly number[];
  /** Hanya untuk pratinjau dan uji: gunungan ditahan di [kemajuan sapuan 0–1, arah (1 maju, −1 mundur), kadar geni 0–1]. */
  sweepAt?: readonly number[];
  /**
   * Hanya untuk pratinjau dan uji: gunungan pembuka/penutup ditahan di [tertancap 0–1, ujung (1 pembuka, −1 penutup),
   * sudut balik (rad), kadar geni 0–1]. Kamera ikut, seperti saat dicabut sungguhan.
   */
  gateAt?: readonly number[];
  /** Hanya untuk pratinjau dan uji: depth of field ditahan di [kadar 0–1, jarak fokus m] (tier tanpa DOF tetap mati). */
  dofAt?: readonly number[];
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
  const unbindGong = stageBus.bindGong((kick) => gong.strike(clock, kick));
  const dust = createDust(shared, Math.round((isMobile() ? 2000 : 3600) * spec.particles));
  const village = createVillage(shared, Math.round(1500 * Math.max(0.4, spec.particles)));
  // gunungan pembuka dan penutup: tekstur dimuat di latar (sudah diunduh lebih dulu oleh StageMount); begitu siap,
  // gerbang boleh tampil dan memudar masuk
  let kayonFade = 0;
  const gunungan = createGunungan({
    gl,
    shared,
    large: spec.dof,
    onReady: (ok) => {
      stageBus.setKayon(ok);
      stageBus.gateReady(ok);
      // tekstur gagal dimuat: gunungan tidak akan tampil, film dibuka tanpa gerbang
      if (!ok) stageBus.gateDisarm();
    },
  });
  /** Isi panggung di belakang gunungan: tidak digambar selama kelir menutup seluruh layar. */
  const world = [terrain.mesh, pendapa.group, gong.group, blencong.group, village.points, dust.points, sky.mesh];
  let worldHidden = false;
  const nodes = [...world, ...gunungan.nodes];
  scene.add(...nodes);
  const post = new StagePost(gl, spec);
  // depth of field: kedalaman diambil dari tanah lanskap saja (satu draw call di target kecil)
  post.setDepthSource(terrain.mesh);
  gl.info.autoReset = false;

  let frame: Frame = { aspect: 16 / 9 };
  let track: SunTrack = SUN_TRACK;
  let shape: TerrainShape = shape0;
  let cues = createCues(film, frame);
  let kayonAt = kayonShot(frame);
  let lastSky: SkyState | null = null;
  let mood: Mood | null = null;
  const sunDir = new Vector3();
  const sunLight = new Vector3();
  const buf = new Vector2();
  const look = new Vector3();
  const aim = new Vector3();
  const GONG_CENTER = new Vector3(0, GONG.y * GONG_SCALE, 0.04 * GONG_SCALE);
  const gongAt = new Vector3();
  const gongEdge = new Vector3();
  /** Zoom gong yang sedang digambar (dihaluskan menuju target di bus). */
  let zoomNow = 0;
  /** Sudut kitar kamera mengelilingi gong yang sedang digambar (derajat). */
  let orbitNow = 0;
  /** Slide yang gongnya bisa di-zoom dan dikitari: gong penutup hari, judul hari, dan hero prolog. */
  const placeOf = (kind: string | undefined): GongPlace => (kind === "gong" ? "gong" : kind === "title" || kind === "hero" ? "title" : null);
  /** Letak gong di layar yang terakhir ditulis ke lapisan DOM (bidang sentuh tombol pukul). */
  let spotEl: HTMLElement | null = null;
  let spotKey = "";
  const stopLook = startLook();

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
    kayonAt = kayonShot(frame);
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
    // gunungan pembuka/penutup tertancap: kamera ditarik ke shot kayon sebanyak tertancapnya (scroll-driven depth:
    // mencabutnya, juga dengan jari, memajukan kamera ke shot prolog)
    const gt = stageBus.clock();
    const gate = stageBus.gate;
    const held = stats.gateAt && stats.gateAt.length >= 2 ? stats.gateAt : null;
    const gateEnd = held ? (held[1]! < 0 ? "tail" : "head") : gate.end();
    const planted = held ? Math.max(0, Math.min(1, held[0]!)) : gateEnd ? gate.planted(gt) : 0;
    const shot = planted > 0 ? blendShot(cue.shot, kayonAt, gateCamera(planted), "slide") : cue.shot;
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

    // Gerak pandang (aturan host 13 Nov, berlaku di semua slide): kamera parallax mengikuti kursor atau kemiringan
    // HP, perspective shift (kamera berpindah lalu memandang ulang objeknya), dan kedalaman yang mengikuti gulir
    // (maju di tengah perpindahan slide, mengikuti kemajuan gulir). Di slide gong penutup, judul hari, dan hero
    // ditambah zoom dan kamera yang mengitari gong (seret ke kiri/kanan, ±90°). Gunungan pembuka yang tertancap
    // menutup gong, jadi selama itu keduanya tidak berlaku.
    const lk = stepLook();
    const spot = placeOf(film.slides[cursor.from]?.kind);
    const here = !cue.moving && planted === 0 ? spot : null;
    stageBus.setGongHere(here);
    zoomNow = approach(zoomNow, here ? stageBus.gongZoom() : 0, dt, GONG_ZOOM.ease);
    orbitNow = approach(orbitNow, here ? stageBus.orbitGoal() : 0, dt, stageBus.orbiting() ? ORBIT.follow : ORBIT.back);
    if (Math.abs(orbitNow) < 0.01 && !stageBus.orbiting()) orbitNow = 0;
    stageBus.setOrbitShown(orbitNow);
    // saat meninggalkan slide ini, zoom dan kitar surut bersama kemajuan perpindahan (tanpa lompatan)
    const leaving = cue.moving ? 1 - cursor.p : 1;
    const zoomed = spot ? zoomNow * leaving : 0;
    const orbited = spot ? orbitNow * leaving : 0;
    if (camera.fov !== shot.fov) {
      camera.fov = shot.fov;
      camera.updateProjectionMatrix();
    }
    // kitar: letak kamera dan titik pandangnya diputar mengelilingi sumbu tegak yang melewati pusat gong
    const th = (orbited * Math.PI) / 180;
    const [cs, sn] = [Math.cos(th), Math.sin(th)];
    const turn = (x: number, z: number): [number, number] => {
      const [dx, dz] = [x - GONG_CENTER.x, z - GONG_CENTER.z];
      return [GONG_CENTER.x + dx * cs + dz * sn, GONG_CENTER.z - dx * sn + dz * cs];
    };
    const [px, pz] = turn(shot.pos[0], shot.pos[2]);
    const [lx, lz] = turn(shot.look[0], shot.look[2]);
    camera.position.set(px, shot.pos[1], pz);
    // makin dekat ke gong, titik bidik berpindah dari bingkai slide (yang memberi ruang teks) ke pusat gong
    camera.lookAt(look.set(lx, shot.look[1], lz).lerp(GONG_CENTER, Math.min(1, zoomed * 1.4)));
    const reach = shot.rig === "orbit" ? 1 : 0.6;
    // jarak ke objek: bidikan lanskap berfokus jauh (40 m), jadi dorongannya dibatasi seperti di bidikan pendapa
    const dist = Math.min(shot.focus, 12);
    camera.translateX((Math.sin(t * 0.21) * 0.035 + lk.x * VIEW.shiftX) * reach);
    camera.translateY((Math.sin(t * 0.17 + 1.3) * 0.022 - lk.y * VIEW.shiftY) * reach);
    camera.translateZ(-Math.min(0.9, (cue.moving ? scrollDepth(cursor.p) : 0) + zoomed * GONG_ZOOM.close) * dist);
    aim.set(lk.x * VIEW.shiftX * reach * VIEW.aim, -lk.y * VIEW.shiftY * reach * VIEW.aim, 0).applyQuaternion(camera.quaternion).add(look);
    camera.lookAt(aim);
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

    // slide gong, judul hari, hero: letak gong di layar ditulis ke lapisan DOM tiap frame (bidang sentuh tombol pukul
    // di slide gong, arah huruf yang tersedot di judul), teks memudar saat gong didekati atau dikitari, dan cubit di
    // layar menjadi zoom gong (bukan zoom halaman)
    const host = root();
    if (host && here) {
      if (!spotEl?.isConnected) spotEl = host.querySelector<HTMLElement>(`.fl-layer[data-pos='cur'] ${here === "gong" ? ".fs-gongclose" : ".fs-beat"}`);
      if (spotEl) {
        gongAt.copy(GONG_CENTER).project(camera);
        gongEdge.set(GONG.radius * GONG_SCALE, 0, 0).applyQuaternion(camera.quaternion).add(GONG_CENTER).project(camera);
        const x = (gongAt.x * 0.5 + 0.5) * 100;
        const y = (0.5 - gongAt.y * 0.5) * 100;
        const d = Math.abs(gongEdge.x - gongAt.x) * 100 * 1.06;
        const key = `${x.toFixed(1)}|${y.toFixed(1)}|${d.toFixed(1)}|${zoomed.toFixed(2)}|${orbited.toFixed(1)}`;
        if (key !== spotKey) {
          spotKey = key;
          spotEl.style.setProperty("--gong-x", `${x.toFixed(2)}%`);
          spotEl.style.setProperty("--gong-y", `${y.toFixed(2)}%`);
          spotEl.style.setProperty("--gong-d", `${d.toFixed(2)}%`);
          host.style.setProperty("--gong-zoom", zoomed.toFixed(3));
          host.style.setProperty("--gong-orbit", (Math.abs(orbited) / ORBIT.max).toFixed(3));
        }
      }
      if (!("gongzoom" in host.dataset)) host.dataset.gongzoom = "";
    } else if (host && "gongzoom" in host.dataset) {
      delete host.dataset.gongzoom;
      host.style.removeProperty("--gong-zoom");
      host.style.removeProperty("--gong-orbit");
      spotEl = null;
      spotKey = "";
    }

    // gunungan: pembuka dan penutup film (gate.ts). Sapuan antar bab tetap bayangan kayon DOM; `sweepAt` hanya
    // untuk pratinjau sapuan lama.
    gl.getDrawingBufferSize(buf);
    const pin = stats.sweepAt;
    let pose: SweepPose | KayonPose | null = null;
    let rage = 0;
    if (pin && pin.length >= 2) {
      pose = sweepPose(pin[0]!, pin[1]! < 0 ? -1 : 1, frame.aspect, t);
      rage = pin[2] ?? 0;
    } else if (gateEnd && planted > 0.0005) {
      pose = gatePose(planted, gateEnd, frame.aspect, t, lk, held ? (held[2] ?? 0) : gate.turn(gt), held ? 0 : gate.thud(gt));
      rage = held ? (held[3] ?? 0) : gate.rage(gt);
    }
    if (gunungan.ready()) kayonFade = Math.min(1, kayonFade + dt / 0.6);
    gunungan.update(pose, camera, lk, heartbeat(t), rage, pin ? 1 : kayonFade, buf.y);
    // gunungan tertancap penuh: kelir pekat menutup seluruh layar, jadi pendapa, lanskap, dan langit di baliknya
    // tidak digambar sama sekali (hemat lewat cara menggambar, bukan lewat resolusi)
    const hide = !pin && pose !== null && "turn" in pose && planted >= 0.999 && kayonFade >= 1 && gunungan.ready();
    if (hide !== worldHidden) {
      worldHidden = hide;
      for (const n of world) n.visible = !hide;
    }
    stageBus.gateTick();

    const pixel = buf.y / Math.tan((camera.fov * Math.PI) / 360);
    dust.setPixel(pixel);
    village.setPixel(pixel);
    gong.setPixel(pixel);
    gl.info.reset();
    // depth of field (tier High, gallery): fokus dekat (bidang kartu) saat diam, ditarik jauh ke lanskap selama
    // geseran di dalam gallery mengikuti kemajuan gulir, lalu kembali saat kartu tiba
    const inner = cue.moving && film.slides[cursor.from]?.scene === film.slides[cursor.to]?.scene;
    const dofHeld = stats.dofAt && stats.dofAt.length >= 2 ? stats.dofAt : null;
    const dofAmount = spec.dof ? (dofHeld ? dofHeld[0]! : shot.dof) : 0;
    const dofAt = dofHeld ? dofHeld[1]! : dofFocus(cursor.p, inner);
    post.render(scene, camera, { exposure: mood.exposure, dim: shot.dim, time: t, dof: { amount: dofAmount, focus: dofAt, aperture: DOF.aperture } });

    stats.frames++;
    stats.bloom = post.format;
    stats.calls = gl.info.render.calls;
    stats.triangles = gl.info.render.triangles;
    stats.camera = [camera.position.x, camera.position.y, camera.position.z];
    stats.fov = camera.fov;
    stats.index = cursor.from;
    stats.moving = cue.moving;
    stats.strikes = hit.count;
    stats.kick = kicked;
    stats.orbit = orbited;
    stats.kayon = gunungan.ready();
    stats.gate = { end: planted > 0 ? gateEnd : null, planted, face: pose && "turn" in pose ? pose.face : "agung" };
    stats.time = t;
    stats.dof = { amount: dofAmount, focus: dofAt, drawn: post.dofDrawn };
  };
  layout();
  resize();

  const ro = new ResizeObserver(layout);
  const host = root();
  if (host) ro.observe(host);
  // Safari iOS: cubit di slide gong adalah zoom gong, bukan zoom halaman
  const noPageZoom = (e: Event) => {
    if (stageBus.gongHere()) e.preventDefault();
  };
  host?.addEventListener("gesturestart", noPageZoom);
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
    const zoomGoal = stageBus.zoomHere() ? stageBus.gongZoom() : 0;
    const orbitGoal = stageBus.zoomHere() ? stageBus.orbitGoal() : 0;
    const active = c.to !== c.from || lookMoving(now) || Math.abs(zoomNow - zoomGoal) > 0.001 || Math.abs(orbitNow - orbitGoal) > 0.01 || now - born < 1500 || gong.busy() || stageBus.gate.busy(stageBus.clock()) || (kayonFade > 0 && kayonFade < 1);
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
    stageBus.gateReady(false);
    stopLook();
    stageBus.setGongHere(null);
    host?.removeEventListener("gesturestart", noPageZoom);
    const el = root();
    if (el) {
      delete el.dataset.gongzoom;
      el.style.removeProperty("--gong-zoom");
    }
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
