/**
 * Dunia Hari 3 di panggung film (Tugas 11.3): kain mori di gawangan bambu di halaman tembok saudagar Laweyan.
 *
 * - Kain memakai mesin yang sama dengan /canting/ (`Batik`: target malam dan warna; `BATIK_SURFACE`: mori, malam,
 *   nila, soga, lorod, prada), diterangi cahaya panggung (`COMMON`) yang mengikuti jam tiap panel.
 * - Motif = kawung ukel 11.1 dengan tepi bawah Bengawan Solo: sungai dan lampion tiga hari film (satu lampion per
 *   tempat singgah) digores paling awal, di pita bawah layar di bawah kartu gallery.
 * - Keadaan kain dan letak canting ditentukan penuh oleh letak film (`processAt`, `trace.tipAt`): maju dan mundur
 *   memberi gambar yang sama persis.
 * - Gong penutup Hari 3 (gong terakhir film): kain jadi tergantung di pendapa di belakang gong (`extra`), dilorod saat
 *   gong didekati, dan prada berkilau tiap gong dipukul.
 */
import {
  BoxGeometry,
  type BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  type Material,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  Vector3,
  type WebGLRenderer,
} from "three";
import { kawungUkel } from "@/engine/canting/motif";
import { EMPTY_STATE, type BatikState } from "@/engine/canting/state";
import { traceMotif } from "@/engine/canting/trace";
import type { Film, Slide } from "@/engine/slides/build-slides";
import { batikShot, batikTravel, CLOTH, clothPoint, clothWidth, gongCloth, processAt } from "@/engine/stage/batik";
import type { TierSpec } from "@/engine/stage/tier";
import { Batik, type BatikQuality } from "@/components/canting/batik";
import { BATIK_SURFACE, CLOTH_VS } from "@/components/canting/surface";
import { createCanting, createWaxPan } from "@/components/canting/tool3d";
import type { ChapterWorld } from "../chapters";
import { COMMON, type Shared } from "../shared";

/** Lendut kain (m): sama bentuknya dengan /canting/, diskalakan ke kain 2,4 m. */
const DRAPE = 0.035;
/** Kain jadi di pendapa: di antara saka belakang, di balik gong. */
const HALL = { z: -3.3, bottom: 1.25 } as const;
/** Canting film sedikit lebih besar dari aslinya supaya terbaca di layar HP. */
const TOOL_SCALE = 1.7;
/** Titik genggam di gagang bambu (ruang lokal canting, `tool3d.ts`): 0,16 dari pangkal batang ke arah gagang. */
const GRIP = new Vector3(-0.1226, 0.238, 0.0288);
/**
 * Cahaya kunci dunia batik: dari depan kain, kiri atas (halaman terbuka), supaya mori terbaca krem di jam mana pun.
 * Warna dan kuatnya tetap dari jam slide (runtime), diredam: cahaya lanskap terlalu kuat untuk kain yang menghadapnya.
 */
const KEY_DIR = new Vector3(-0.42, 0.62, 0.66).normalize();
const KEY_GAIN = 0.42;
const SKY_GAIN = 0.75;
/** Clawd pindah sisi gagang bila cucuk melewati tengah bidikan sejauh ini (m): tidak bolak-balik di tengah. */
const SIDE_SWITCH = 0.35;

const CLOTH_FS = /* glsl */ `
${COMMON}
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vBitangent;
uniform float uGlow;
uniform float uFade;
${BATIK_SURFACE}
void main() {
  vec3 albedo = batikAlbedo(vUv);
  vec3 nt = batikNormal(vUv);
  vec3 N = normalize(vTangent * nt.x + vBitangent * nt.y + vNormal * nt.z);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vWorld);
  float gloss = batikGloss(vUv);
  vec3 col = albedo * diffuseLight(N, vWorld) + specLight(N, V, vWorld, mix(24.0, 110.0, gloss)) * gloss * 0.55;
  // malam yang baru jatuh dari cucuk masih panas: berpendar amber tipis
  col += vec3(1.0, 0.5, 0.16) * batikHot(vUv) * 0.06 * uGlow;
  // prada: kilau emas sendiri (mengikuti pukulan gong), di bawah ambang bloom
  col += vec3(0.9, 0.62, 0.24) * uPrada * 0.12 * (1.0 - max(texture2D(tDye, vUv).r, texture2D(tDye, vUv).g)) * (1.0 - batikWax(vUv));
  gl_FragColor = vec4(applyFog(col, vWorld) * uFade, 1.0);
}`;

const PROP_VS = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
void main() {
  vLocal = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = mat3(modelMatrix) * normal;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

/** Bambu gawangan, lantai ubin, tembok kapur saudagar, pintu kayu: satu shader, pola menurut `uKind`. */
const PROP_FS = /* glsl */ `
${COMMON}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
uniform int uKind;
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 albedo;
  float shine = 0.0;
  if (uKind == 0) {
    // bambu: kuning kehijauan, ruas gelap tiap ±0,32 m, serat memanjang
    float along = vLocal.y;
    float node = 1.0 - smoothstep(0.0, 0.025, abs(fract(along / 0.32) - 0.5) * 0.32 - 0.135);
    vec3 cane = mix(vec3(0.33, 0.25, 0.09), vec3(0.45, 0.36, 0.14), fbm(vec2(atan(vLocal.x, vLocal.z) * 3.0, along * 14.0)));
    albedo = mix(cane, vec3(0.16, 0.11, 0.04), node * 0.8);
    shine = 0.35;
  } else if (uKind == 1) {
    // ubin terakota di halaman: petak 0,4 m, nat gelap, warna tiap petak sedikit berbeda, aus di tengah
    vec2 g = vWorld.xz / 0.4;
    vec2 f = abs(fract(g) - 0.5);
    float w = max(fwidth(g.x), fwidth(g.y)) * 1.5 + 0.002;
    float grout = 1.0 - smoothstep(0.47, 0.47 + w, max(f.x, f.y));
    float tint = hash21(floor(g));
    vec3 tile = mix(vec3(0.21, 0.07, 0.035), vec3(0.3, 0.11, 0.05), tint) * (0.85 + 0.3 * fbm(vWorld.xz * 3.0));
    albedo = mix(vec3(0.05, 0.035, 0.025), tile, grout);
    shine = 0.12 * grout;
  } else if (uKind == 2) {
    // tembok kapur saudagar: krem bernoda, kaki tembok gelap, genteng di puncak
    float stain = fbm(vWorld.xy * vec2(0.8, 1.6)) * 0.6 + fbm(vWorld.xy * 5.0) * 0.4;
    vec3 lime = mix(vec3(0.5, 0.44, 0.33), vec3(0.66, 0.6, 0.47), stain);
    lime *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, 0.9, vWorld.y)) * fbm(vWorld.xy * 2.0);
    float plinth = 1.0 - smoothstep(0.42, 0.46, vWorld.y);
    albedo = mix(lime, vec3(0.12, 0.1, 0.09), plinth);
    float roof = smoothstep(3.36, 3.4, vWorld.y);
    albedo = mix(albedo, vec3(0.16, 0.05, 0.03) * (0.8 + 0.4 * fract(vWorld.x / 0.24)), roof);
  } else {
    // pintu kayu jati tua dengan bilah tegak
    float plank = 0.8 + 0.2 * smoothstep(0.0, 0.04, abs(fract(vWorld.x / 0.18) - 0.5));
    albedo = vec3(0.1, 0.055, 0.025) * plank * (0.8 + 0.4 * fbm(vWorld.xy * vec2(2.0, 18.0)));
    shine = 0.2;
  }
  vec3 col = albedo * diffuseLight(n, vWorld) + specLight(n, v, vWorld, 40.0) * shine * 0.3;
  gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
}`;

/** Lendut kain di titik (u 0–1 ke kanan, w 0–1 ke atas), sama dengan `CLOTH_VS`. */
function drapeAt(u: number, w: number) {
  const sx = Math.sin(Math.PI * u);
  const sy = Math.sin(Math.PI * w);
  const wave = Math.sin(u * Math.PI * 7 + 0.6) * 0.18;
  return DRAPE * (-sx * sy + wave * sy * 0.6);
}

const minutes = (s: Slide | undefined) =>
  s?.clock ?? (s?.kind === "panel" && s.stop.start ? Number(s.stop.start.slice(0, 2)) * 60 + Number(s.stop.start.slice(3, 5)) : 6 * 60);

export function createBatikWorld(shared: Shared, spec: TierSpec, film: Film, gl: WebGLRenderer): ChapterWorld {
  // mode uji (lite) memakai kain dan perkakas kecil; tamu selalu high
  const quality: BatikQuality = spec.msaa === 0 ? "lite" : "high";
  // satu lampion per tempat singgah tiga hari film
  const lanterns = Math.max(3, film.slides.filter((s) => s.kind === "panel").length);
  const trace = traceMotif(kawungUkel({ aspect: CLOTH.aspect, river: { lanterns } }));
  const batik = new Batik(gl, trace, CLOTH.aspect, quality);
  const W = clothWidth();
  const H = CLOTH.height;
  const geos: BufferGeometry[] = [];
  const mats: Material[] = [];
  const keep = <T extends BufferGeometry>(g: T) => (geos.push(g), g);

  const clothMat = (fade: boolean) => {
    const m = new ShaderMaterial({
      vertexShader: CLOTH_VS,
      fragmentShader: CLOTH_FS,
      side: DoubleSide,
      uniforms: {
        ...shared,
        tWax: { value: batik.wax.texture },
        tDye: { value: batik.dye.texture },
        uTexel: { value: new Vector2(1 / batik.wax.width, 1 / batik.wax.height) },
        uAspect: { value: CLOTH.aspect },
        uKerok: { value: 0 },
        uLorod: { value: 0 },
        uPrada: { value: 0 },
        uDrape: { value: DRAPE },
        uSize: { value: new Vector2(W, H) },
        uGlow: { value: 1 },
        uFade: { value: fade ? 0 : 1 },
      },
    });
    mats.push(m);
    return m;
  };
  const clothGeo = keep(new PlaneGeometry(W, H, 64, 40));

  const group = new Group();
  // ---- kain di gawangan ----
  const cloth = new Mesh(clothGeo, clothMat(false));
  cloth.position.set(0, CLOTH.bottom + H / 2, 0);
  group.add(cloth);

  // ---- gawangan bambu: dua tiang dan palang atas ----
  const prop = (kind: number) => {
    const m = new ShaderMaterial({ vertexShader: PROP_VS, fragmentShader: PROP_FS, uniforms: { ...shared, uKind: { value: kind } } });
    mats.push(m);
    return m;
  };
  const bamboo = prop(0);
  const postGeo = keep(new CylinderGeometry(0.038, 0.042, 3.45, 14));
  for (const sx of [-1, 1]) {
    const post = new Mesh(postGeo, bamboo);
    post.position.set(sx * (W / 2 + 0.16), 3.45 / 2, -0.02);
    group.add(post);
  }
  const barGeo = keep(new CylinderGeometry(0.032, 0.032, W + 0.7, 14));
  const bar = new Mesh(barGeo, bamboo);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, CLOTH.bottom + H + 0.08, -0.02);
  group.add(bar);
  // kaki silang tiap tiang supaya gawangan berdiri
  const footGeo = keep(new CylinderGeometry(0.03, 0.03, 0.9, 10));
  for (const sx of [-1, 1]) {
    const foot = new Mesh(footGeo, bamboo);
    foot.rotation.x = Math.PI / 2;
    foot.position.set(sx * (W / 2 + 0.16), 0.05, -0.02);
    group.add(foot);
  }

  // ---- halaman: lantai ubin, tembok saudagar, pintu kayu ----
  const ground = new Mesh(keep(new PlaneGeometry(40, 40)), prop(1));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 4);
  group.add(ground);
  const wall = new Mesh(keep(new BoxGeometry(22, 3.5, 0.45)), prop(2));
  wall.position.set(0, 1.75, -2.6);
  group.add(wall);
  const door = new Mesh(keep(new BoxGeometry(1.5, 2.35, 0.06)), prop(3));
  door.position.set(3.4, 1.175, -2.36);
  group.add(door);

  // ---- wajan malam di atas anglo, dan canting ----
  const toolQ = quality;
  const pan = createWaxPan({ quality: toolQ });
  pan.group.scale.setScalar(1.8);
  pan.group.position.set(-W / 2 - 0.75, 0.108 * 1.8, 0.7);
  group.add(pan.group);
  const canting = createCanting({ quality: toolQ });
  canting.group.scale.setScalar(TOOL_SCALE);
  group.add(canting.group);

  // ---- kain jadi di pendapa (gong terakhir), di luar `group` ----
  const hallMat = clothMat(true);
  const hall = new Mesh(clothGeo, hallMat);
  hall.position.set(0, HALL.bottom + H / 2, HALL.z);
  hall.visible = false;

  const hold: { grip: Vector3; tip: Vector3; side: 1 | -1 } = { grip: new Vector3(), tip: new Vector3(), side: 1 };
  let state: BatikState = { ...EMPTY_STATE };
  let lastStrikes = -1;
  let pradaAt = -1e9;
  const tip = { x: 0, y: 0, z: 0, down: false };

  return {
    group,
    ground,
    extra: hall,
    // halaman batik dan pendapa bertukar lewat redup gelap, bukan kabut gunung Lawu
    veil: "shade",
    source: "procedural",
    update({ camera, cursor, look, t, readyFraction = 1, strikes = 0 }) {
      const travel = batikTravel(film, cursor);
      const g = gongCloth(film, cursor);
      // prada berkilau sekali tiap pukulan gong
      if (lastStrikes >= 0 && strikes > lastStrikes) pradaAt = t;
      lastStrikes = strikes;
      const prada = Math.max(0, 1 - (t - pradaAt) / 2.4);

      // ---- kain jadi di pendapa ----
      hall.visible = g.show > 0.001;
      if (hall.visible) {
        state = { draw: 1, nila: 1, kerok: 1, soga: 1, lorod: g.lorod };
        batik.update(state);
        const u = hallMat.uniforms;
        u.uKerok!.value = 1;
        u.uLorod!.value = g.lorod;
        // emas di bagian krem sesudah lorod: tenang, lalu menyala sesaat tiap gong dipukul
        u.uPrada!.value = g.lorod * (0.3 + 0.7 * prada);
        u.uFade!.value = g.show;
        u.uGlow!.value = 0;
      }
      if (!travel) return null;

      // ---- kain di gawangan: keadaan dari letak hari ----
      state = processAt(travel.q, travel.of, trace.phases.river);
      batik.update(state);
      const cu = (cloth.material as ShaderMaterial).uniforms;
      cu.uKerok!.value = state.kerok;
      cu.uLorod!.value = 0;
      cu.uPrada!.value = 0;
      // malam panas hanya berpendar selama torehan berjalan
      cu.uGlow!.value = state.draw > 0 && state.draw < 1 ? 1 : 0;

      // ---- canting: cucuk di ujung malam, terangkat di antara guratan; diam di bibir wajan sesudah torehan ----
      const working = state.draw > 0.0005 && state.draw < 0.9995;
      if (working) {
        const at = trace.tipAt(state.draw);
        const [x, y] = clothPoint(at.at[0], at.at[1]);
        const u = at.at[0] / CLOTH.aspect;
        const w = 1 - at.at[1];
        tip.x = x;
        tip.y = y;
        tip.z = drapeAt(u, w) + (at.down ? 0.004 : 0.05);
        tip.down = at.down;
        canting.group.position.set(tip.x, tip.y, tip.z);
        // cucuk menunjuk ke kain (−Z), gagang naik ke arah penonton dan condong ke sisi Clawd
        canting.group.rotation.set(1.05, 0.35 * hold.side, -0.2 * hold.side);
      } else {
        const rest = pan.group.position;
        canting.group.position.set(rest.x + 0.08, rest.y + 0.12, rest.z + 0.02);
        canting.group.rotation.set(0.45, 0.6, -0.5);
      }
      canting.setFill(working ? 0.7 : 0.9);
      canting.setHeat(working ? 1 : 0.6);
      pan.update(t);

      const amount = travel.amount * readyFraction;
      if (amount < 0.5) return { amount, passed: travel.q, focus: 4, minute: -1 };
      // Clawd memegang canting selama torehan berjalan
      if (working) {
        canting.group.updateMatrixWorld(true);
        canting.group.localToWorld(hold.grip.copy(GRIP));
        hold.tip.copy(canting.group.position);
      }

      // ---- kamera ----
      const shot = batikShot(travel.q, travel.of, camera.aspect, look, travel.depth);
      // Clawd berdiri di sisi gagang yang lebih dekat ke tengah bidikan (tidak terdorong keluar layar)
      if (tip.x > shot.aim[0] + SIDE_SWITCH) hold.side = -1;
      else if (tip.x < shot.aim[0] - SIDE_SWITCH) hold.side = 1;
      camera.position.set(...shot.pos);
      camera.up.set(0, 1, 0);
      camera.lookAt(...shot.aim);
      if (camera.fov !== shot.fov) {
        camera.fov = shot.fov;
        camera.updateProjectionMatrix();
      }
      // blencong menjadi lampu kerja yang digantung di gawangan, di kiri atas kain
      shared.uLampPos.value.set(-W / 2 + 0.3, CLOTH.bottom + H + 0.35, 1.1);
      shared.uFogDensity.value = 0.012;
      shared.uKeyDir.value.copy(KEY_DIR);
      shared.uKeyColor.value.multiplyScalar(KEY_GAIN);
      shared.uAmbSky.value.multiplyScalar(SKY_GAIN);

      const a = film.slides[cursor.from];
      const b = film.slides[cursor.to];
      const minute = minutes(a) + (minutes(b) - minutes(a)) * Math.min(1, Math.max(0, cursor.p));
      return {
        amount,
        passed: travel.q,
        focus: Math.hypot(shot.pos[0] - shot.aim[0], shot.pos[1] - shot.aim[1], shot.pos[2] - shot.aim[2]),
        minute,
        hold: working ? hold : null,
      };
    },
    dispose() {
      batik.dispose();
      canting.dispose();
      pan.dispose();
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
      group.clear();
    },
  };
}

