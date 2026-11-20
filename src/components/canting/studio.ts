/**
 * Studio membatik /canting/ (Tugas 11.2): adegan three, input pointer, dan loop frame. Imperatif (bukan React):
 * komponen `Canting` hanya memasang, meneruskan tombol, dan menampilkan `StudioView`.
 *
 * - Malam: pointer → model aliran (`engine/canting/flow.ts`) → dab → riwayat (urungkan, simpan lokal) dan
 *   `WaxCanvas` (digambar di frame yang sama, panas lalu mendingin).
 * - Canting 3D mengikuti kursor atau jari di atas kain; diam di wajan saat tidak dipakai; mencelup ke wajan saat malam
 *   habis atau diminta. Ketuk wajan = celup.
 * - Tahap (`process.ts`): kain turun ke bak nila/soga dan naik basah menetes; lorod dengan uap dan cahaya.
 * - Kamera: roda/dua jari = zoom (kedalaman ikut gulir), parallax kursor/kemiringan HP saat tidak menggambar
 *   (aturan host 13 Nov), mati di Calm.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  NoToneMapping,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  Raycaster,
  RGBAFormat,
  Scene,
  UnsignedByteType,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { CLOTH_TILT, fitDistance } from "@/engine/canting/frame";
import { createFlow, dip as dipFlow, hold, move, press, release, type FlowEvent, type FlowState } from "@/engine/canting/flow";
import { guide as guideOf, guideDabs, type GuideKind } from "@/engine/canting/guides";
import type { Tool } from "@/engine/canting/motif";
import { advance, allowed, createProcess, layerFor, start, type Anim, type Process, type Stage } from "@/engine/canting/process";
import { STORE_LIMIT, StrokeHistory } from "@/engine/canting/strokes";
import { startLook, stepLook } from "@/components/film/look";
import type { BatikQuality } from "./batik";
import { surfaceMaterial } from "./surface";
import { createCanting, createWaxPan } from "./tool3d";
import { WaxCanvas } from "./wax";

export const ASPECT = 1.6;
const FOV = 30;
const MARGIN = 0.05;
const STORE_KEY = "lakon.canting.v1";
/** Ukuran PNG simpanan (sisi panjang ≥ 2048 px, PRD §4). */
export const PNG_SIZE = { w: 2048, h: Math.round(2048 / ASPECT) } as const;
/** Normal kain (dunia): kain miring `CLOTH_TILT`, sisi atas menjauh. */
const NORMAL = new Vector3(0, Math.sin(CLOTH_TILT), Math.cos(CLOTH_TILT));
/** Arah gagang saat menggambar: condong ke kanan atas supaya tidak menutupi ujung cucuk. */
const HOLD_DIR = NORMAL.clone().add(new Vector3(0.42, 0.3, 0)).normalize();
/** Letak pusat nyamplung dari ujung cucuk (ruang canting, tool3d.ts): yang dicelup ke wajan adalah nyamplungnya. */
const BOWL = new Vector3(-0.056, 0.085, 0);
const DYE = { nila: new Color(0.03, 0.05, 0.13), soga: new Color(0.24, 0.1, 0.035) } as const;

export type StudioView = Readonly<{
  ready: boolean;
  stage: Stage;
  busy: Anim | null;
  /** Malam di nyamplung 0–1 (dibulatkan 1 %). */
  malam: number;
  hasWax: boolean;
  canUndo: boolean;
  tool: Tool;
  guide: GuideKind | null;
  tracing: boolean;
  dipping: boolean;
  /** PNG kain jadi sudah siap disimpan. */
  png: boolean;
  zoom: number;
  /** Kadar celup (dibulatkan): rel tahap menyala untuk tahap yang sudah dilewati. */
  dyed: { nila: number; soga: number; lorod: number };
}>;

export type StudioEvent = FlowEvent | "hello" | "dip" | "undo" | "restart" | "cool" | "blocked" | "trace" | Anim | "biru" | "coklat" | "jadi" | "png";

export type StudioOptions = {
  quality: BatikQuality;
  calm: boolean;
  demo: boolean;
  /** Ruang yang ditutupi antarmuka (px): kain diletakkan di tengah sisa layar. */
  insets: () => { top: number; bottom: number };
};

export type StudioCallbacks = {
  view(v: StudioView): void;
  event(e: StudioEvent): void;
  stats?(text: string): void;
};

export type Studio = {
  setTool(t: Tool): void;
  setGuide(g: GuideKind | null): void;
  trace(): void;
  dip(): void;
  undo(): void;
  restart(): void;
  act(a: "nila" | "soga" | "lorod"): void;
  zoomBy(factor: number): void;
  setCalm(calm: boolean): void;
  /** PNG kain jadi (dibuat sekali sesudah lorod). */
  png(): Blob | null;
  resize(): void;
  dispose(): void;
};

type Saved = { v: 1; strokes: string; stage: Stage; amounts: Process["amounts"]; guide: GuideKind | null; tool: Tool };

function readSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<Saved>;
    const stages: Stage[] = ["malam", "biru", "coklat", "jadi"];
    if (s.v !== 1 || typeof s.strokes !== "string" || !stages.includes(s.stage as Stage)) return null;
    const a = s.amounts;
    const ok = (n: unknown) => typeof n === "number" && n >= 0 && n <= 1;
    if (!a || !ok(a.nila) || !ok(a.kerok) || !ok(a.soga) || !ok(a.lorod)) return null;
    return s as Saved;
  } catch {
    return null;
  }
}

const bump = (k: number) => {
  // kain turun ke bak (0–30 %), terendam, lalu naik (70–100 %)
  if (k < 0.3) return Math.sin((k / 0.3) * Math.PI * 0.5);
  if (k < 0.7) return 1;
  return Math.cos(((k - 0.7) / 0.3) * Math.PI * 0.5);
};

export function createStudio(canvas: HTMLCanvasElement, root: HTMLElement, opts: StudioOptions, cb: StudioCallbacks): Studio {
  let calm = opts.calm;
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.quality === "low" ? 1 : opts.quality === "medium" ? 1.5 : 2));
  renderer.toneMapping = NoToneMapping;
  const scene = new Scene();
  scene.background = new Color("#0b0a12");
  // cahaya untuk canting dan wajan (kain memakai cahayanya sendiri, arahnya sama; × π: satuan cahaya three modern)
  const key = new DirectionalLight(new Color(1.0, 0.93, 0.82), 1.15 * Math.PI);
  key.position.set(-0.45, 0.55, 0.7);
  scene.add(key, new HemisphereLight(new Color(0.34, 0.31, 0.36), new Color(0.12, 0.1, 0.1), Math.PI));

  // ---- kain ----
  const wax = new WaxCanvas(renderer, ASPECT, opts.quality);
  const clothMat = surfaceMaterial({ wax: wax.wax.texture, dye: wax.dye.texture, width: wax.wax.width, height: wax.wax.height, aspect: ASPECT, guide: wax.guide.texture });
  const clothGeo = new PlaneGeometry(ASPECT, 1, 96, 60);
  const cloth = new Mesh(clothGeo, clothMat);
  const clothRig = new Group(); // turun-naik saat dicelup
  clothRig.add(cloth);
  scene.add(clothRig);

  // ---- jambangan celup (dinding depan + permukaan cairan selebar kain), tetes, uap ----
  // Dinding depan menghadap kamera dan naik bersama cairan: bagian bawah kain tertutup, terbaca sebagai kain dicelup.
  const bathMat = new MeshStandardMaterial({ color: DYE.nila, roughness: 0.16, metalness: 0, transparent: true, opacity: 0, depthWrite: false });
  const wallMat = new MeshStandardMaterial({ color: new Color(0.13, 0.075, 0.05), roughness: 0.55, metalness: 0, transparent: true, opacity: 0 });
  const plane = new PlaneGeometry(1, 1);
  const liquid = new Mesh(plane, bathMat);
  liquid.rotation.x = -Math.PI / 2;
  const wall = new Mesh(plane, wallMat);
  const vat = new Group();
  vat.add(liquid, wall);
  vat.renderOrder = 2;
  scene.add(vat);
  const DRIPS = 70;
  const drip = { pos: new Float32Array(DRIPS * 3), vel: new Float32Array(DRIPS), life: new Float32Array(DRIPS) };
  const dripGeo = new BufferGeometry();
  dripGeo.setAttribute("position", new BufferAttribute(drip.pos, 3));
  const dripMat = new PointsMaterial({ color: DYE.nila, size: 0.012, transparent: true, opacity: 0.85, depthWrite: false });
  const drips = new Points(dripGeo, dripMat);
  drips.frustumCulled = false;
  scene.add(drips);
  const STEAM = 90;
  const steam = { pos: new Float32Array(STEAM * 3), life: new Float32Array(STEAM) };
  const steamGeo = new BufferGeometry();
  steamGeo.setAttribute("position", new BufferAttribute(steam.pos, 3));
  const steamMat = new PointsMaterial({ color: new Color(1, 0.96, 0.9), size: 0.05, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending });
  const steamPts = new Points(steamGeo, steamMat);
  steamPts.frustumCulled = false;
  scene.add(steamPts);

  // ---- canting dan wajan ----
  const tool = createCanting({ quality: opts.quality });
  scene.add(tool.group);
  const pan = createWaxPan({ quality: opts.quality });
  scene.add(pan.group);
  const camera = new PerspectiveCamera(FOV, 1, 0.02, 40);

  // ---- keadaan ----
  const history = new StrokeHistory(ASPECT);
  let proc = createProcess();
  let flow: FlowState = createFlow(performance.now());
  let tool_: Tool = "klowong";
  let guideKind: GuideKind | null = null;
  let distance = 2;
  let zoom = 1;
  const focus = new Vector3();
  let portrait = false;
  let clothBottom = -0.45;
  let vatFront = 0.25;
  let vatWidth = ASPECT * 1.1;
  const saved = opts.demo ? null : readSaved();
  if (saved) {
    const h = StrokeHistory.decode(saved.strokes, ASPECT);
    if (h) for (const s of h.strokes) history.push(s);
    proc = { ...createProcess(), stage: saved.stage, amounts: { ...saved.amounts } };
    guideKind = saved.guide ?? null;
    tool_ = saved.tool ?? "klowong";
  }
  wax.rebuild(history.flat());
  const applyGuide = () => {
    if (!guideKind) return wax.setGuide(null);
    const g = guideDabs(guideOf(guideKind, ASPECT), { lineR: 0.0011, dotR: 0.0016, spacing: 0.6 });
    wax.setGuide([...g.line, ...g.dots]);
  };
  applyGuide();

  // ---- simpan lokal ----
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  const persist = () => {
    if (opts.demo) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      try {
        const strokes = history.encode();
        if (strokes.length > STORE_LIMIT) return;
        // di tengah animasi: simpan keadaan sesudah animasi selesai (tidak ada kain setengah dicelup sesudah dibuka lagi)
        const done = proc.busy ? advance(proc, proc.since + 1e9) : proc;
        const s: Saved = { v: 1, strokes, stage: done.stage, amounts: done.amounts, guide: guideKind, tool: tool_ };
        localStorage.setItem(STORE_KEY, JSON.stringify(s));
      } catch {
        /* penyimpanan penuh atau diblokir: karya tetap ada selama halaman terbuka */
      }
    }, 400);
  };

  // ---- penempatan kain, wajan, kamera ----
  const resize = () => {
    const w = Math.max(1, root.clientWidth);
    const h = Math.max(1, root.clientHeight);
    renderer.setSize(w, h, false);
    const ins = opts.insets();
    const freeH = Math.max(120, h - ins.top - ins.bottom);
    camera.aspect = w / h;
    camera.setViewOffset(w, h, 0, (ins.bottom - ins.top) / 2, w, h);
    camera.updateProjectionMatrix();
    portrait = w / freeH < 0.9;
    cloth.rotation.set(-CLOTH_TILT, 0, portrait ? Math.PI / 2 : 0);
    const effFov = (2 * Math.atan(Math.tan((FOV * Math.PI) / 360) * (freeH / h)) * 180) / Math.PI;
    distance = portrait ? fitDistance(effFov, w / freeH, 1, ASPECT, MARGIN) : fitDistance(effFov, w / freeH, ASPECT, 1, MARGIN);
    // wajan di sisi kanan kain, di atas panel alat: diletakkan dari posisi layar (NDC di ruang bebas) ke bidang z
    camera.position.set(0, 0, distance);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const topNdc = 1 - (2 * ins.top) / h;
    const botNdc = -1 + (2 * ins.bottom) / h;
    const at = new Vector3(portrait ? 0.7 : 0.86, botNdc + (topNdc - botNdc) * (portrait ? 0.14 : 0.2), 0.5).unproject(camera);
    const dir = at.sub(camera.position).normalize();
    const zPlane = portrait ? 0.32 : 0.22;
    pan.group.position.copy(camera.position).addScaledVector(dir, (zPlane - camera.position.z) / dir.z);
    const halfH = (portrait ? ASPECT : 1) / 2;
    clothBottom = -halfH * Math.cos(CLOTH_TILT);
    vatFront = halfH * Math.sin(CLOTH_TILT) + 0.05;
    vatWidth = (portrait ? 1 : ASPECT) * 1.1;
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(root);

  // ---- input ----
  const ray = new Raycaster();
  const ndc = new Vector2();
  const hit = { on: false, x: 0, y: 0, world: new Vector3() };
  const pointers = new Map<number, { x: number; y: number }>();
  let pinch: { d: number; zoom: number } | null = null;
  let drawing: number | null = null;
  let movedFrame = false;
  let stillFrames = 0;
  let lastPointerAt = -1e9;
  let touchMode = false;
  const castAt = (cx: number, cy: number) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  };
  const clothHit = (cx: number, cy: number) => {
    castAt(cx, cy);
    const i = ray.intersectObject(cloth, false)[0];
    if (!i || !i.uv) return false;
    hit.on = true;
    hit.x = i.uv.x * ASPECT;
    hit.y = 1 - i.uv.y;
    hit.world.copy(i.point);
    return true;
  };
  const panHit = (cx: number, cy: number) => {
    castAt(cx, cy);
    return ray.intersectObject(pan.group, true).length > 0;
  };

  const emitFlow = (events: FlowEvent[]) => {
    for (const e of events) cb.event(e);
  };
  const deposit = (dabs: { x: number; y: number; r: number }[], layer: number) => {
    if (!dabs.length) return;
    const flat: number[] = [];
    for (const d of dabs) {
      history.add(d.x, d.y, d.r);
      flat.push(d.x, d.y, d.r, layer);
    }
    wax.add(flat);
  };
  const canDraw = () => allowed(proc, "draw", history.hasWax) && !trace && !dipAnim;

  const onDown = (e: PointerEvent) => {
    touchMode = e.pointerType !== "mouse";
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lastPointerAt = performance.now();
    if (pointers.size === 2) {
      // dua jari: zoom, goresan yang sedang berjalan diakhiri
      endStroke();
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a!.x - b!.x, a!.y - b!.y), zoom };
      return;
    }
    if (pointers.size > 1 || (e.pointerType === "mouse" && e.button !== 0)) return;
    if (panHit(e.clientX, e.clientY)) {
      studio.dip();
      return;
    }
    if (!clothHit(e.clientX, e.clientY)) return;
    if (!canDraw()) {
      cb.event("blocked");
      return;
    }
    canvas.setPointerCapture?.(e.pointerId);
    drawing = e.pointerId;
    const layer = layerFor(proc, tool_);
    history.begin(tool_, layer);
    const out = press(flow, hit.x, hit.y, performance.now(), tool_);
    flow = out.state;
    deposit(out.dabs, layer);
    emitFlow(out.events);
  };
  const onMove = (e: PointerEvent) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lastPointerAt = performance.now();
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      setZoom(pinch.zoom * (d / Math.max(1, pinch.d)));
      return;
    }
    if (drawing === e.pointerId) {
      const layer = layerFor(proc, tool_);
      // semua sampel di antara dua frame (garis mulus walau pointer cepat)
      const samples = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
      for (const s of samples.length ? samples : [e]) {
        if (!clothHit(s.clientX, s.clientY)) continue;
        const out = move(flow, hit.x, hit.y, s.timeStamp || performance.now(), performance.now());
        if (out.dabs.length) movedFrame = true;
        flow = out.state;
        deposit(out.dabs, layer);
        emitFlow(out.events);
      }
      return;
    }
    if (e.pointerType === "mouse") {
      if (!clothHit(e.clientX, e.clientY)) hit.on = false;
    }
  };
  let coolTimer: ReturnType<typeof setTimeout> | null = null;
  let cooledOnce = false;
  const endStroke = () => {
    if (drawing === null) return;
    drawing = null;
    flow = release(flow);
    history.end();
    persist();
    if (!cooledOnce && !calm) {
      cooledOnce = true;
      // hanya selagi masih menggambar (bukan saat kain sudah dicelup)
      coolTimer = setTimeout(() => proc.stage === "malam" && !proc.busy && cb.event("cool"), 2600);
    }
    pushView(true);
  };
  const onUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (drawing === e.pointerId) endStroke();
  };
  const onLeave = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && drawing === null) hit.on = false;
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.clientX || e.clientY) clothHit(e.clientX, e.clientY);
    setZoom(zoom * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  const setZoom = (z: number) => {
    const next = Math.min(3.2, Math.max(1, z));
    if (next > zoom && hit.on) focus.copy(hit.world);
    zoom = next;
  };

  // ---- celup canting ke wajan ----
  let dipAnim: { t0: number; dipped: boolean } | null = null;
  const DIP_MS = 1100;

  // ---- auto-trace: canting menorehkan pola tuntunan sendiri ----
  let trace: { items: { tool: Tool; dabs: number[] }[]; item: number; pos: number; rate: number } | null = null;
  const startTrace = () => {
    if (!guideKind || !canDraw()) {
      cb.event("blocked");
      return;
    }
    const g = guideDabs(guideOf(guideKind, ASPECT));
    trace = { items: [ { tool: "klowong", dabs: g.line }, { tool: "cecek", dabs: g.dots } ], item: 0, pos: 0, rate: opts.demo ? 14000 : 5200 };
    history.begin("klowong", layerFor(proc, "klowong"));
    cb.event("trace");
  };
  const stepTrace = (dt: number) => {
    if (!trace) return;
    let budget = Math.max(1, Math.round(trace.rate * dt));
    const flat: number[] = [];
    while (budget > 0 && trace) {
      const it = trace.items[trace.item]!;
      const layer = layerFor(proc, it.tool);
      const n = it.dabs.length / 3;
      const take = Math.min(budget, n - trace.pos);
      for (let i = trace.pos; i < trace.pos + take; i++) {
        const x = it.dabs[i * 3]!;
        const y = it.dabs[i * 3 + 1]!;
        const r = it.dabs[i * 3 + 2]!;
        history.add(x, y, r);
        flat.push(x, y, r, layer);
        hit.x = x;
        hit.y = y;
      }
      trace.pos += take;
      budget -= take;
      if (trace.pos >= n) {
        history.end();
        trace.item++;
        trace.pos = 0;
        if (trace.item >= trace.items.length) {
          trace = null;
          persist();
          pushView(true);
        } else history.begin(trace.items[trace.item]!.tool, layerFor(proc, trace.items[trace.item]!.tool));
      }
    }
    wax.add(flat);
  };
  const clothPoint = (x: number, y: number, out: Vector3) => {
    // titik kain (ruang kain) → dunia, mengikuti putaran dan turun-naik kain
    out.set(x / ASPECT - 0.5, 0.5 - y, 0).multiply(new Vector3(ASPECT, 1, 1));
    return cloth.localToWorld(out);
  };

  // ---- PNG ----
  let pngBlob: Blob | null = null;
  let pngJob = false;
  const makePng = () => {
    if (pngJob || pngBlob) return;
    pngJob = true;
    const { w, h } = PNG_SIZE;
    const target = new WebGLRenderTarget(w, h, { format: RGBAFormat, type: UnsignedByteType, depthBuffer: true });
    const cam = new OrthographicCamera(-ASPECT / 2, ASPECT / 2, 0.5, -0.5, 0.1, 10);
    cam.position.set(0, 0, 2);
    cam.lookAt(0, 0, 0);
    const shot = new Scene();
    const u = clothMat.uniforms;
    const keep = { rot: cloth.rotation.clone(), drape: u.uDrape!.value as number, pool: (u.uPool!.value as Vector3).clone(), guide: u.uGuide!.value as number, wet: u.uWet!.value as number };
    clothRig.remove(cloth);
    shot.add(cloth);
    cloth.rotation.set(0, 0, 0);
    u.uDrape!.value = 0;
    (u.uPool!.value as Vector3).set(0, 0, 12);
    u.uGuide!.value = 0;
    u.uWet!.value = 0;
    u.uEncode!.value = 1;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(shot, cam);
    const px = new Uint8Array(w * h * 4);
    renderer.readRenderTargetPixels(target, 0, 0, w, h, px);
    renderer.setRenderTarget(prev);
    shot.remove(cloth);
    clothRig.add(cloth);
    cloth.rotation.copy(keep.rot);
    u.uDrape!.value = keep.drape;
    (u.uPool!.value as Vector3).copy(keep.pool);
    u.uGuide!.value = keep.guide;
    u.uWet!.value = keep.wet;
    u.uEncode!.value = 0;
    target.dispose();
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    const img = ctx.createImageData(w, h);
    // baris dibalik: piksel target mulai dari bawah
    for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    ctx.putImageData(img, 0, 0);
    c.toBlob((b) => {
      pngJob = false;
      if (!b) return;
      pngBlob = b;
      cb.event("png");
      pushView(true);
    }, "image/png");
  };

  // ---- tampilan untuk React (dibatasi) ----
  let lastView = "";
  let lastViewAt = 0;
  let ready = false;
  const pushView = (force = false) => {
    const now = performance.now();
    if (!force && now - lastViewAt < 120) return;
    const lastStroke = history.strokes.at(-1);
    const v: StudioView = {
      ready,
      stage: proc.stage,
      busy: proc.busy,
      malam: Math.round(flow.malam * 100) / 100,
      hasWax: history.hasWax,
      canUndo: !!lastStroke && allowed(proc, "draw", true) && !trace && (proc.stage !== "biru" || lastStroke.layer === 2),
      tool: tool_,
      guide: guideKind,
      tracing: !!trace,
      dipping: !!dipAnim,
      png: !!pngBlob,
      zoom: Math.round(zoom * 100) / 100,
      dyed: { nila: Math.round(proc.amounts.nila * 20) / 20, soga: Math.round(proc.amounts.soga * 20) / 20, lorod: Math.round(proc.amounts.lorod * 20) / 20 },
    };
    const k = JSON.stringify(v);
    if (k === lastView) return;
    lastView = k;
    lastViewAt = now;
    cb.view(v);
  };

  // ---- loop ----
  const releaseLook = calm ? null : startLook();
  let stopLook = releaseLook;
  let raf = 0;
  let last = performance.now();
  let frames = 0;
  const frameMs: number[] = [];
  let statsAt = last;
  const debug = { frames: 0, dabs: 0, stage: proc.stage as Stage, busy: null as Anim | null, malam: 1, tool: tool_, ready: false, png: 0, sample: (from: number, n: number) => Array.from(history.flat().subarray(from * 4, (from + n) * 4)) };
  (window as Window & { __lakonCanting?: typeof debug }).__lakonCanting = debug;
  const toolPos = new Vector3();
  const toolGoal = new Vector3();
  const restQuat = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(0.25, 1, 0.2).normalize());
  const holdQuat = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), HOLD_DIR);
  const tmp = new Vector3();
  const bowlOffset = new Vector3();
  const UP = new Vector3(0, 1, 0);
  let wetness = 0;
  let pradaPulse = 0;
  let prevBusy: Anim | null = proc.busy;
  let prevStage: Stage = proc.stage;
  const lookNow = { x: 0, y: 0 };

  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (document.hidden) {
      last = performance.now();
      return;
    }
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    // tahap
    proc = advance(proc, now);
    if (proc.busy !== prevBusy) {
      if (proc.busy) cb.event(proc.busy);
      prevBusy = proc.busy;
      pushView(true);
    }
    if (proc.stage !== prevStage) {
      prevStage = proc.stage;
      if (proc.stage !== "malam") cb.event(proc.stage as "biru" | "coklat" | "jadi");
      if (proc.stage === "jadi") {
        pradaPulse = 1;
        makePng();
      }
      persist();
      pushView(true);
    }

    // malam: tangan diam (tanpa gerak dua frame berturut-turut) melebar/menetes; auto-trace.
    // Dihitung per frame, bukan hanya waktu: frame yang lambat (HP tersendat) tidak membuat malam mbleber.
    if (drawing !== null) stillFrames = movedFrame ? 0 : stillFrames + 1;
    movedFrame = false;
    if (drawing !== null && stillFrames >= 2) {
      const out = hold(flow, now);
      flow = out.state;
      deposit(out.dabs, layerFor(proc, tool_));
      emitFlow(out.events);
    }
    stepTrace(dt);

    // celup canting
    if (dipAnim) {
      const k = (now - dipAnim.t0) / DIP_MS;
      if (!dipAnim.dipped && k > 0.45) {
        dipAnim.dipped = true;
        flow = dipFlow(flow, now);
        pushView(true);
      }
      if (k >= 1) {
        dipAnim = null;
        pushView(true);
      }
    }

    // kain dan bak
    const a = proc.amounts;
    const dipping = proc.busy === "nila" || proc.busy === "soga";
    const dipK = dipping ? Math.min(1, Math.max(0, (now - proc.since) / proc.dur)) : 0;
    const sink = dipping ? bump(dipK) : 0;
    // cairan naik menutupi bagian bawah kain lalu surut (kain hanya sedikit turun)
    clothRig.position.y = -0.05 * sink;
    const level = clothBottom - 0.04 + sink * (portrait ? 0.62 : 0.4);
    const floor = clothBottom - 0.45;
    liquid.scale.set(vatWidth, 0.7, 1);
    liquid.position.set(0, level, vatFront - 0.35);
    wall.scale.set(vatWidth, level - floor, 1);
    wall.position.set(0, (level + floor) / 2, vatFront);
    if (dipping) {
      bathMat.color.copy(proc.busy === "nila" ? DYE.nila : DYE.soga);
      dripMat.color.copy(bathMat.color);
      wetness = Math.max(wetness, Math.min(1, dipK * 3));
    } else wetness = Math.max(0, wetness - dt / 6);
    const vatAlpha = calm ? 0 : Math.min(1, dipping ? Math.min(dipK, 1 - dipK) * 8 : 0);
    bathMat.opacity = vatAlpha * 0.92;
    wallMat.opacity = vatAlpha;
    wallMat.depthWrite = vatAlpha > 0.98;
    vat.visible = vatAlpha > 0.01;
    // tetes dari tepi bawah kain saat naik dari bak
    const spawn = !calm && dipping && dipK > 0.72;
    for (let i = 0; i < DRIPS; i++) {
      if (drip.life[i]! <= 0 && spawn && Math.random() < dt * 6) {
        const x = (Math.random() - 0.5) * (portrait ? 1 : ASPECT) * 0.95;
        const pt = clothPoint((x / (portrait ? 1 : ASPECT) + 0.5) * ASPECT, 0.995, tmp);
        if (portrait) clothPoint(0.005 * ASPECT, (x + 0.5), tmp);
        drip.pos.set([pt.x, pt.y, pt.z], i * 3);
        drip.vel[i] = 0;
        drip.life[i] = 1;
      }
      if (drip.life[i]! > 0) {
        drip.vel[i] = drip.vel[i]! + dt * 2.2;
        drip.pos[i * 3 + 1] = drip.pos[i * 3 + 1]! - drip.vel[i]! * dt;
        drip.life[i] = drip.life[i]! - dt * 0.9;
        if (drip.life[i]! <= 0) drip.pos[i * 3 + 1] = -99;
      }
    }
    dripGeo.attributes.position!.needsUpdate = true;
    drips.visible = !calm && wetness > 0.01;
    // lorod: uap naik dan cahaya menghangat
    const lorodding = proc.busy === "lorod";
    const lk = lorodding ? (now - proc.since) / proc.dur : 0;
    steamMat.opacity = calm ? 0 : lorodding ? 0.16 * Math.sin(Math.min(1, lk) * Math.PI) : Math.max(0, steamMat.opacity - dt * 0.2);
    steamPts.visible = steamMat.opacity > 0.005;
    if (steamPts.visible) {
      for (let i = 0; i < STEAM; i++) {
        if (steam.life[i]! <= 0) {
          const pt = clothPoint(Math.random() * ASPECT, 0.15 + Math.random() * 0.8, tmp);
          steam.pos.set([pt.x, pt.y, pt.z + 0.02], i * 3);
          steam.life[i] = 0.6 + Math.random() * 0.8;
        }
        steam.pos[i * 3 + 1] = steam.pos[i * 3 + 1]! + dt * 0.12;
        steam.pos[i * 3 + 2] = steam.pos[i * 3 + 2]! + dt * 0.05;
        steam.life[i] = steam.life[i]! - dt;
      }
      steamGeo.attributes.position!.needsUpdate = true;
    }
    pradaPulse = Math.max(0, pradaPulse - dt / 3.5);
    const u = clothMat.uniforms;
    u.uKerok!.value = a.kerok;
    u.uLorod!.value = a.lorod;
    u.uWet!.value = wetness;
    // pensil hilang tertutup warna sesudah celupan pertama
    u.uGuide!.value = proc.stage === "malam" ? (dipping ? 1 - dipK : 1) : 0;
    // kilau prada sekali sesudah lorod
    u.uPrada!.value = calm || pradaPulse <= 0 ? 0 : 0.3 * Math.sin((1 - pradaPulse) * Math.PI);
    (u.uPool!.value as Vector3).z = 1.15 + (lorodding ? 0.5 * Math.sin(Math.min(1, lk) * Math.PI) : 0);
    wax.frame(dt, { nila: a.nila, kerok: a.kerok, soga: a.soga });

    // canting: ujung di bawah kursor/jari; diam di wajan bila tidak dipakai; mencelup ke wajan
    // di HP canting tetap di tempat jari terakhir sebentar, lalu kembali ke wajan
    const idle = !hit.on || (touchMode && drawing === null && now - lastPointerAt > 1200);
    const active = (!idle || drawing !== null || !!trace) && !dipAnim;
    if (trace) clothPoint(hit.x, hit.y, toolGoal);
    else if (active) toolGoal.copy(hit.world);
    const panPoint = pan.group.localToWorld(tmp.copy(pan.dipPoint));
    let lift = drawing !== null || trace ? 0 : 0.012;
    let quat = holdQuat;
    if (dipAnim) {
      // nyamplung masuk ke malam di wajan, lalu kembali
      const k = Math.min(1, (now - dipAnim.t0) / DIP_MS);
      const inPan = Math.sin(k * Math.PI);
      toolGoal.copy(panPoint).sub(bowlOffset.copy(BOWL).applyQuaternion(restQuat)).addScaledVector(UP, 0.05 * (1 - inPan));
      lift = 0;
      quat = restQuat;
    } else if (!active) {
      // bersandar di bibir wajan
      toolGoal.copy(panPoint).sub(bowlOffset.copy(BOWL).applyQuaternion(restQuat)).addScaledVector(UP, 0.035);
      lift = 0;
      quat = restQuat;
    }
    const follow = drawing !== null || trace ? 1 : 1 - Math.exp(-dt / 0.06);
    toolPos.lerp(toolGoal, follow);
    tool.group.position.copy(toolPos).addScaledVector(NORMAL, lift);
    tool.group.quaternion.slerp(quat, 1 - Math.exp(-dt / 0.12));
    tool.setFill(flow.malam);
    tool.setHeat(Math.exp(-Math.max(0, now - flow.dippedAt) / 1000 / 45));
    pan.update(now / 1000);

    // kamera: parallax saat tidak menggambar, zoom ke titik yang ditunjuk
    if (!calm && drawing === null && !trace) {
      const l = stepLook(now);
      lookNow.x = l.x;
      lookNow.y = l.y;
    }
    const d = distance / zoom;
    const z = (zoom - 1) / (3.2 - 1);
    tmp.copy(focus).multiplyScalar(z * 0.9);
    camera.position.set(tmp.x + lookNow.x * 0.06 * d, tmp.y + lookNow.y * 0.04 * d, tmp.z + d);
    camera.lookAt(tmp);
    renderer.render(scene, camera);

    // pantauan
    frames++;
    debug.frames = frames;
    debug.dabs = history.dabCount;
    debug.stage = proc.stage;
    debug.busy = proc.busy;
    debug.malam = flow.malam;
    debug.tool = tool_;
    debug.png = pngBlob ? pngBlob.size : 0;
    if (!ready) {
      ready = true;
      debug.ready = true;
      cb.event("hello");
      pushView(true);
    }
    frameMs.push(dt * 1000);
    if (frameMs.length > 240) frameMs.shift();
    if (cb.stats && now - statsAt > 500) {
      statsAt = now;
      const sorted = [...frameMs].sort((x, y) => x - y);
      const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
      const fps = 1000 / (sorted.reduce((s, x) => s + x, 0) / Math.max(1, sorted.length));
      const info = renderer.info.render;
      cb.stats(`${opts.quality} · ${fps.toFixed(0)} fps · p95 ${p95.toFixed(1)} ms · ${info.calls} draw · ${info.triangles} tri`);
    }
    pushView();
  };
  raf = requestAnimationFrame(loop);

  const studio: Studio = {
    setTool(t) {
      tool_ = t;
      tool.setSpouts(1);
      persist();
      pushView(true);
    },
    setGuide(g) {
      guideKind = g;
      applyGuide();
      persist();
      pushView(true);
    },
    trace() {
      startTrace();
      pushView(true);
    },
    dip() {
      if (dipAnim || drawing !== null) return;
      dipAnim = { t0: performance.now(), dipped: false };
      cb.event("dip");
      pushView(true);
    },
    undo() {
      const lastStroke = history.strokes.at(-1);
      if (!lastStroke || !allowed(proc, "draw", true) || trace) return;
      if (proc.stage === "biru" && lastStroke.layer !== 2) return;
      history.undo();
      wax.rebuild(history.flat());
      persist();
      cb.event("undo");
      pushView(true);
    },
    restart() {
      endStroke();
      trace = null;
      history.clear();
      proc = createProcess();
      prevBusy = null;
      prevStage = "malam";
      flow = createFlow(performance.now());
      pngBlob = null;
      wetness = 0;
      wax.rebuild(history.flat());
      zoom = 1;
      persist();
      cb.event("restart");
      pushView(true);
    },
    act(action) {
      if (!allowed(proc, action, history.hasWax) || trace || drawing !== null) {
        cb.event("blocked");
        return;
      }
      proc = start(proc, action, performance.now(), calm);
      pushView(true);
    },
    zoomBy(f) {
      setZoom(zoom * f);
      pushView(true);
    },
    setCalm(c) {
      calm = c;
      if (calm) {
        stopLook?.();
        stopLook = null;
        lookNow.x = 0;
        lookNow.y = 0;
      } else if (!stopLook) stopLook = startLook();
    },
    png: () => pngBlob,
    resize,
    dispose() {
      cancelAnimationFrame(raf);
      if (saveTimer) clearTimeout(saveTimer);
      if (coolTimer) clearTimeout(coolTimer);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("wheel", onWheel);
      stopLook?.();
      wax.dispose();
      clothGeo.dispose();
      clothMat.dispose();
      plane.dispose();
      bathMat.dispose();
      wallMat.dispose();
      dripGeo.dispose();
      dripMat.dispose();
      steamGeo.dispose();
      steamMat.dispose();
      tool.dispose();
      pan.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      const w = window as Window & { __lakonCanting?: typeof debug };
      if (w.__lakonCanting === debug) delete w.__lakonCanting;
    },
  };
  pushView(true);
  return studio;
}
