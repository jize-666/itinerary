import { PCFShadowMap, PerspectiveCamera, Scene, Vector2, Vector3, WebGLRenderer } from "three";
import {
  anglePose,
  CALM_SECONDS,
  clampTarget,
  cycleLocation,
  eyeOf,
  focusPose,
  fromEye,
  homePose,
  upOf,
  sceneIndex,
  tourPose,
  type Pose,
  type Vec,
} from "@/engine/diorama/camera";
import {
  clamp,
  percentile,
  photoSize,
  tierStep,
  type DioLocation,
  type Quality,
  type TourState,
} from "@/engine/diorama/options";
import { defaultQuality } from "@/engine/motion/quality";
import { makeArtwork, type SurfaceMode } from "./artwork";

export type ViewerState = {
  tour: TourState;
  time: number;
  location: DioLocation | null;
  angle: number | null;
  azimuth: number;
  elevation: number;
  tier: Quality;
  p95: number;
  draws: number;
  triangles: number;
  still: boolean;
  scene: number;
  runs: number;
  tourP95: number;
  maxDraws: number;
  maxTriangles: number;
};
type Setters = {
  update: (s: ViewerState) => void;
  slow: (p95: number) => void;
  invalidate: () => void;
};
type Move = { at: number; duration: number; eye: Vec[]; start: Pose; end: Pose };
const mix = (a: number, b: number, u: number) => a + (b - a) * u;
const mix3 = (a: Vec, b: Vec, u: number): Vec => [mix(a[0], b[0], u), mix(a[1], b[1], u), mix(a[2], b[2], u)];
const ease = (u: number) => u * u * (3 - 2 * u);
const v3 = (v: Vec) => new Vector3(...v);
const snapshot = (p: Pose): Pose => ({ ...p, target: [...p.target] });
const tierConfig = {
  ultra: 2048,
  high: 1536,
  // mode uji (?q=lite); tidak pernah dipilih untuk tamu
  lite: 512,
};
const touchPresent = () => matchMedia("(pointer: coarse)").matches;
export const initialState: ViewerState = {
  tour: "idle",
  time: 0,
  location: null,
  angle: 4,
  azimuth: 180,
  elevation: 28,
  tier: "high",
  p95: 0,
  draws: 0,
  triangles: 0,
  still: true,
  scene: 0,
  runs: 0,
  tourP95: 0,
  maxDraws: 0,
  maxTriangles: 0,
};
const tau = (n: number) => ((n % 360) + 360) % 360;

function placeCamera(cam: PerspectiveCamera, p: Pose) {
  const xyz = eyeOf(p);
  cam.position.set(...xyz);
  cam.up.set(...upOf(p));
  cam.lookAt(...p.target);
  cam.updateMatrixWorld(true);
}

export class DioramaController {
  private artwork = makeArtwork();
  private pose: Pose;
  private visible: Pose;
  private move: Move | null = null;
  private tour: TourState = "idle";
  private time = 0;
  private startedAt = 0;
  private location: DioLocation | null = null;
  private angle: number | null = 4;
  private atHome = true;
  private tier: Quality;
  private forced: boolean;
  private requestedQuality: Quality | undefined;
  private calm = false;
  private frozen = false;
  private closed = false;
  private lastInput = 0;
  private idleTimer = 0;
  private previousFrame = 0;
  private lastEmit = 0;
  private draws = 0;
  private triangles = 0;
  private lastSlow = 0;
  private slowWindows = 0;
  private samples: number[] = [];
  private measured95 = 0;
  private runFrames: number[] = [];
  private completeRuns: number[][] = [];
  private tourP95 = 0;
  private maxDraws = 0;
  private maxTriangles = 0;
  private spring = new Vector2();
  private wish = new Vector2();
  private orientationOrigin: { x: number; y: number } | null = null;
  private sensorListening = false;
  private aspect = 1;
  private width = 1;
  private height = 1;
  private active = new Map<number, { x: number; y: number }>();
  private gestures: AbortController;
  private pendingSensor = false;
  private zoomNear = 0.42;
  constructor(
    private gl: WebGLRenderer,
    private scene: Scene,
    private camera: PerspectiveCamera,
    private bridge: Setters,
    options: {
      width: number;
      height: number;
      quality?: Quality;
      calm: boolean;
      focus?: DioLocation;
      autoTour: boolean;
      forceQuality: boolean;
    },
  ) {
    this.width = options.width;
    this.height = options.height;
    this.aspect = this.width / Math.max(1, this.height);
    this.pose = options.focus ? focusPose(options.focus, this.aspect) : homePose(this.aspect);
    this.visible = snapshot(this.pose);
    this.location = options.focus ?? null;
    this.atHome = !this.location;
    this.angle = this.location ? null : 4;
    this.calm = options.calm;
    this.tier = options.quality ?? defaultQuality();
    this.forced = options.forceQuality;
    this.requestedQuality = options.quality;
    this.scene.add(this.artwork.group);
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = PCFShadowMap;
    this.gl.shadowMap.autoUpdate = false;
    this.gl.shadowMap.needsUpdate = true;
    this.applyQuality();
    this.gestures = new AbortController();
    this.installInputs();
    placeCamera(this.camera, this.pose);
    this.lastInput = performance.now();
    if (options.autoTour && !this.calm) this.play();
    this.emit();
    this.bridge.invalidate();
  }
  private emit() {
    this.bridge.update({
      tour: this.tour,
      time: this.time,
      location: this.location,
      angle: this.angle,
      azimuth: tau(this.visible.azimuth),
      elevation: this.visible.elevation,
      tier: this.tier,
      p95: this.measured95,
      draws: this.draws,
      triangles: this.triangles,
      runs: this.completeRuns.length,
      tourP95: this.tourP95,
      maxDraws: this.maxDraws,
      maxTriangles: this.maxTriangles,
      still: this.tour !== "playing" && !this.move,
      scene: sceneIndex(this.time),
    });
  }
  rendered() {
    const { calls, triangles } = this.gl.info.render;
    if (this.tour === "playing") {
      this.maxDraws = Math.max(this.maxDraws, calls);
      this.maxTriangles = Math.max(this.maxTriangles, triangles);
    }
    if (calls !== this.draws || triangles !== this.triangles) {
      this.draws = calls;
      this.triangles = triangles;
      this.emit();
    }
  }
  get livePose() {
    return snapshot(this.visible);
  }
  get viewAspect() {
    return this.aspect;
  }
  get tourState() {
    return this.tour;
  }
  private applyQuality() {
    const mapSize = tierConfig[this.tier];
    const shadow = this.artwork.key.shadow;
    shadow.mapSize.set(mapSize, mapSize);
    shadow.map?.dispose();
    shadow.map = null;
    shadow.needsUpdate = true;
    this.gl.shadowMap.needsUpdate = true;
    this.bridge.invalidate();
  }
  settings(calm: boolean, quality: Quality | undefined, forced: boolean) {
    if (calm !== this.calm) {
      this.calm = calm;
      if (calm) {
        this.stopMotion(true);
        this.removeSensor();
      }
      this.bridge.invalidate();
      this.emit();
    }
    const changed = this.requestedQuality !== quality;
    this.requestedQuality = quality;
    this.forced = forced;
    if (quality && quality !== this.tier && (changed || forced)) {
      this.tier = quality;
      this.applyQuality();
      this.emit();
    }
  }
  resize(w: number, h: number) {
    if (w <= 0 || h <= 0) return;
    const a = w / h;
    if (this.width === w && this.height === h) return;
    this.width = w;
    this.height = h;
    this.aspect = a;
    this.move = null;
    if (this.tour === "playing" || this.tour === "paused") this.pose = tourPose(this.time, a);
    else if (this.atHome) this.pose = homePose(a);
    else if (this.angle !== null) this.pose = anglePose(this.angle, a);
    else if (this.location) this.pose = focusPose(this.location, a);
    this.visible = snapshot(this.pose);
    this.camera.aspect = a;
    this.camera.updateProjectionMatrix();
    this.bridge.invalidate();
    this.emit();
  }
  surface(mode: SurfaceMode) {
    this.artwork.setMode(mode);
    this.gl.shadowMap.needsUpdate = true;
    this.bridge.invalidate();
  }
  private stopMotion(commit: boolean) {
    if (commit) this.pose = snapshot(this.visible);
    this.move = null;
    this.wish.set(0, 0);
    this.spring.set(0, 0);
    this.lastInput = performance.now();
    window.clearTimeout(this.idleTimer);
    if (this.tour !== "idle") this.tour = "idle";
  }
  private manual() {
    if (this.frozen) return false;
    this.stopMotion(true);
    this.location = null;
    this.angle = null;
    this.atHome = false;
    return true;
  }
  private safe(from: Pose, to: Pose): Pose {
    const start = eyeOf(from),
      end = eyeOf(to);
    const u = this.artwork.collision.fraction(v3(start), v3(end));
    if (u >= 0.9999) return to;
    if (u <= 0.001) return snapshot(from);
    return fromEye(mix3(start, end, u), mix3(from.target, to.target, u), from.azimuth);
  }
  private commitManual(next: Pose) {
    this.pose = this.safe(this.visible, next);
    this.visible = snapshot(this.pose);
    placeCamera(this.camera, this.visible);
    this.bridge.invalidate();
    this.emit();
  }
  orbit(horizontal: number, vertical: number) {
    if (!this.manual()) return;
    this.commitManual({
      ...this.pose,
      azimuth: this.pose.azimuth + horizontal,
      elevation: clamp(this.pose.elevation + vertical, 8, 85),
    });
  }
  dolly(factor: number) {
    if (!this.manual()) return;
    this.commitManual({
      ...this.pose,
      distance: clamp(
        this.pose.distance * factor,
        this.zoomNear,
        Math.max(70, homePose(this.aspect).distance * 1.65),
      ),
    });
  }
  slide(dx: number, dy: number) {
    if (!this.manual()) return;
    this.camera.updateMatrixWorld();
    const units = (2 * this.pose.distance * Math.tan((19 * Math.PI) / 180)) / Math.max(1, this.height);
    const delta = new Vector3()
      .setFromMatrixColumn(this.camera.matrixWorld, 0)
      .multiplyScalar(-dx * units)
      .addScaledVector(new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1), dy * units);
    const t = this.pose.target;
    this.commitManual({
      ...this.pose,
      target: clampTarget([t[0] + delta.x, t[1] + delta.y, t[2] + delta.z]),
    });
  }
  private path(start: Pose, end: Pose): Vec[] | null {
    const a = eyeOf(start),
      b = eyeOf(end);
    const clear = (p: Vec, q: Vec) => this.artwork.collision.fraction(v3(p), v3(q)) > 0.999;
    if (clear(a, b)) return [a, b];
    const midY = Math.max(7.5, a[1], b[1]);
    const overA: Vec = [a[0], midY, a[2]],
      overB: Vec = [b[0], midY, b[2]];
    const outs: Vec[][] = [
      [overA, overB],
      [
        [a[0], Math.max(a[1], 2.25), 9.4],
        [b[0], Math.max(b[1], 2.25), 9.4],
      ],
      [[-12, Math.max(a[1], 3.4), 9.6], [-12, 6, 0], overB],
    ];
    for (const way of outs) {
      const pts = [a, ...way, b];
      if (pts.slice(1).every((p, i) => clear(pts[i]!, p))) return pts;
    }
    return null;
  }
  private transition(end: Pose) {
    const start = snapshot(this.visible);
    this.stopMotion(false);
    const way = this.calm ? null : this.path(start, end);
    if (!way) {
      this.gl.domElement.animate?.([{ opacity: 0.12 }, { opacity: 1 }], {
        duration: 155,
        easing: "ease-out",
      });
      this.pose = end;
      this.visible = snapshot(end);
      placeCamera(this.camera, end);
    } else
      this.move = {
        at: performance.now(),
        duration: Math.min(1300, 650 + way.length * 95),
        eye: way,
        start,
        end,
      };
    this.bridge.invalidate();
    this.emit();
  }
  direction(index: number) {
    if (this.frozen) return;
    this.atHome = false;
    this.location = null;
    this.angle = index;
    this.transition(anglePose(index, this.aspect));
  }
  home() {
    if (this.frozen) return;
    this.atHome = true;
    this.location = null;
    this.angle = 4;
    this.transition(homePose(this.aspect));
  }
  focus(id: DioLocation) {
    if (this.frozen) return;
    this.atHome = false;
    this.location = id;
    this.angle = null;
    this.transition(focusPose(id, this.aspect));
  }
  cycle(delta: number) {
    this.focus(cycleLocation(this.location, delta));
  }
  calmPose(i: number) {
    if (this.frozen) return;
    this.atHome = false;
    this.time = CALM_SECONDS[i] ?? 0;
    this.angle = i === 5 ? 8 : i === 0 ? 4 : null;
    this.location = i === 2 ? "pendhapa" : i === 3 ? "pasar" : i === 4 ? "laweyan" : null;
    this.transition(tourPose(this.time, this.aspect));
  }
  play() {
    if (this.calm || this.frozen) return;
    if (this.tour !== "paused") {
      this.time = 0;
      this.samples = [];
      this.measured95 = 0;
      this.runFrames = [];
      this.maxDraws = 0;
      this.maxTriangles = 0;
    }
    this.atHome = false;
    this.move = null;
    this.angle = null;
    this.location = null;
    this.spring.set(0, 0);
    this.wish.set(0, 0);
    this.tour = "playing";
    this.startedAt = performance.now() - this.time * 1000;
    this.previousFrame = 0;
    this.bridge.invalidate();
    this.emit();
  }
  pause() {
    if (this.tour !== "playing") return;
    this.pose = snapshot(this.visible);
    placeCamera(this.camera, this.pose);
    this.tour = "paused";
    this.bridge.invalidate();
    this.emit();
  }
  freeze(value: boolean) {
    if (value && !this.frozen) {
      this.pause();
      this.pose = snapshot(this.visible);
      this.move = null;
      this.spring.set(0, 0);
      this.wish.set(0, 0);
      window.clearTimeout(this.idleTimer);
      this.active.clear();
    }
    this.frozen = value;
    this.lastInput = performance.now();
    this.bridge.invalidate();
  }
  private wishSet(x: number, y: number) {
    if (
      this.calm ||
      this.frozen ||
      this.active.size ||
      this.move ||
      this.tour === "playing" ||
      this.tour === "paused" ||
      this.angle === 8
    )
      return;
    this.wish.set(clamp(x, -1, 1), clamp(y, -1, 1));
    const delay = 1500 + this.lastInput - performance.now();
    if (delay <= 0) this.bridge.invalidate();
    else {
      window.clearTimeout(this.idleTimer);
      this.idleTimer = window.setTimeout(() => {
        if (!this.closed) this.bridge.invalidate();
      }, delay + 2);
    }
  }
  private sensor = (e: DeviceOrientationEvent) => {
    if (e.beta === null || e.gamma === null || this.calm) return;
    const rot = ((screen.orientation?.angle ?? 0) * Math.PI) / 180;
    const x = e.gamma * Math.cos(rot) + e.beta * Math.sin(rot),
      y = e.beta * Math.cos(rot) - e.gamma * Math.sin(rot);
    if (!this.orientationOrigin) this.orientationOrigin = { x, y };
    this.wishSet((x - this.orientationOrigin.x) / 22, -(y - this.orientationOrigin.y) / 20);
  };
  private removeSensor() {
    window.removeEventListener("deviceorientation", this.sensor);
    this.sensorListening = false;
    this.orientationOrigin = null;
  }
  private async enableSensor() {
    if (this.pendingSensor || this.sensorListening || this.calm || !("DeviceOrientationEvent" in window))
      return;
    const api = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<PermissionState>;
    };
    this.pendingSensor = true;
    try {
      let known: string | null = null;
      try {
        known = sessionStorage.getItem("dio.orientation");
      } catch {}
      if (known === "denied") return;
      const status =
        known === "granted" || !api.requestPermission ? "granted" : await api.requestPermission();
      try {
        sessionStorage.setItem("dio.orientation", status);
      } catch {}
      if (status === "granted" && !this.closed && !this.calm) {
        window.addEventListener("deviceorientation", this.sensor);
        this.sensorListening = true;
      }
    } catch {
      /* Orientation is optional; orbit and dolly remain available. */
    } finally {
      this.pendingSensor = false;
    }
  }
  private installInputs() {
    const el = this.gl.domElement,
      opts = { signal: this.gestures.signal };
    el.tabIndex = 0;
    el.style.touchAction = "none";
    // izin sensor gerak (iPhone) hanya boleh diminta di dalam gesture yang sah: untuk sentuhan itu touchend, bukan
    // pointerdown (spesifikasi HTML; WebKit menolak tanpa dialog). Laporan host 20 Nov: izin sering tidak muncul.
    window.addEventListener("touchend", () => void this.enableSensor(), { ...opts, capture: true, passive: true });
    const points = () => [...this.active.values()];
    el.addEventListener(
      "pointerdown",
      (e) => {
        if (this.frozen || e.button !== 0) return;
        el.focus({ preventScroll: true });
        el.setPointerCapture(e.pointerId);
        this.active.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.tour === "playing") this.pause();
        this.lastInput = performance.now();
        this.wish.set(0, 0);
        this.spring.set(0, 0);
        this.pose = snapshot(this.visible);
      },
      opts,
    );
    el.addEventListener(
      "pointermove",
      (e) => {
        const prev = this.active.get(e.pointerId);
        if (!prev) {
          if (e.pointerType === "mouse") {
            const rect = el.getBoundingClientRect();
            this.wishSet(
              (2 * (e.clientX - rect.left)) / rect.width - 1,
              1 - (2 * (e.clientY - rect.top)) / rect.height,
            );
          }
          return;
        }
        const old = points();
        this.active.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (old.length === 1) {
          const dx = e.clientX - prev.x,
            dy = e.clientY - prev.y;
          if (dx === 0 && dy === 0) return;
          if (e.shiftKey) this.slide(dx, dy);
          else this.orbit(-dx * 0.34, dy * 0.25);
        } else if (old.length === 2) {
          const [a, b] = old as [{ x: number; y: number }, { x: number; y: number }],
            [c, d] = points() as typeof old & [typeof a, typeof b];
          const oldDist = Math.hypot(a.x - b.x, a.y - b.y),
            dist = Math.hypot(c.x - d.x, c.y - d.y);
          this.slide((c.x + d.x - a.x - b.x) * 0.5, (c.y + d.y - a.y - b.y) * 0.5);
          if (dist > 3 && oldDist > 3) this.dolly(clamp(oldDist / dist, 0.7, 1.42));
        }
      },
      opts,
    );
    const release = (e: PointerEvent) => {
      this.active.delete(e.pointerId);
      this.lastInput = performance.now();
    };
    el.addEventListener("pointerup", release, opts);
    el.addEventListener("pointercancel", release, opts);
    el.addEventListener("lostpointercapture", release, opts);
    el.addEventListener("pointerleave", () => this.wishSet(0, 0), opts);
    el.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.dolly(
          Math.exp(
            clamp(e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.height : 1), -160, 160) *
              0.00165,
          ),
        );
      },
      { ...opts, passive: false },
    );
    el.addEventListener(
      "keydown",
      (e) => {
        const arrow: Record<string, [number, number]> = {
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          ArrowUp: [0, 1],
          ArrowDown: [0, -1],
        };
        const delta = arrow[e.key];
        if (delta) {
          e.preventDefault();
          if (e.shiftKey) this.slide(delta[0] * -28, delta[1] * 25);
          else this.orbit(delta[0] * 8, delta[1] * 5);
        }
        if (["+", "=", "-", "_", "Home"].includes(e.key)) {
          e.preventDefault();
          if (e.key === "Home") this.home();
          else this.dolly(e.key === "-" || e.key === "_" ? 1.17 : 1 / 1.17);
        }
      },
      opts,
    );
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) this.pause();
      },
      opts,
    );
  }
  private measure(now: number, dt: number) {
    if (dt <= 0) return;
    this.samples.push(dt);
    if (this.samples.length > 180) this.samples.shift();
    if (now - this.lastSlow < 1000 || this.samples.length < 25) return;
    this.lastSlow = now;
    this.measured95 = percentile(this.samples);
    const target = touchPresent() ? 33.4 : 20;
    this.slowWindows = this.measured95 > target ? this.slowWindows + 1 : 0;
    if (this.slowWindows >= 3) {
      this.slowWindows = 0;
      this.bridge.slow(this.measured95);
      if (!this.forced && this.tier === "ultra") {
        this.tier = tierStep(this.tier);
        this.samples = [];
        this.applyQuality();
        this.emit();
      }
    }
  }
  frame(now: number) {
    if (this.closed) return;
    const dt = this.previousFrame ? now - this.previousFrame : 0;
    let running = false;
    if (!this.frozen) {
      if (this.tour === "playing") {
        if (dt > 0) this.runFrames.push(dt);
        this.time = clamp((now - this.startedAt) / 1000, 0, 64);
        this.pose = tourPose(this.time, this.aspect);
        const section = sceneIndex(this.time);
        this.location =
          section === 2 ? "pendhapa" : section === 3 ? "pasar" : section === 4 ? "laweyan" : null;
        if (this.time === 64) {
          this.tour = "done";
          this.angle = 8;
          if (this.runFrames.length) {
            this.completeRuns.push(this.runFrames);
            if (this.completeRuns.length > 3) this.completeRuns.shift();
            this.tourP95 = percentile(this.completeRuns.flat());
            this.runFrames = [];
          }
        } else running = true;
        this.visible = snapshot(this.pose);
      } else if (this.move) {
        const m = this.move,
          frac = clamp((now - m.at) / m.duration, 0, 1),
          u = ease(frac);
        const steps = m.eye.length - 1,
          segment = Math.min(steps - 1, Math.floor(u * steps)),
          point = mix3(m.eye[segment]!, m.eye[segment + 1]!, u * steps - segment);
        this.pose =
          frac === 1 ? m.end : fromEye(point, mix3(m.start.target, m.end.target, u), m.start.azimuth);
        this.visible = snapshot(this.pose);
        if (frac === 1) this.move = null;
        else running = true;
      } else if (
        !this.calm &&
        this.tour !== "paused" &&
        this.angle !== 8 &&
        !this.active.size &&
        now - this.lastInput >= 1500
      ) {
        const alpha = 1 - Math.exp(-Math.min(dt || 17, 50) / 95);
        this.spring.lerp(this.wish, alpha);
        if (this.spring.distanceToSquared(this.wish) < 0.000001) this.spring.copy(this.wish);
        else running = true;
        this.visible = this.safe(this.pose, {
          ...this.pose,
          azimuth: this.pose.azimuth + this.spring.x * 3,
          elevation: clamp(this.pose.elevation + this.spring.y * 2, 8, 85),
        });
      } else this.visible = snapshot(this.pose);
    }
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
    placeCamera(this.camera, this.visible);
    if (running) {
      this.measure(now, dt);
      this.previousFrame = now;
      this.bridge.invalidate();
    } else this.previousFrame = 0;
    if (!running || now - this.lastEmit > 170) {
      this.lastEmit = now;
      this.emit();
    }
  }
  async capture(pose: Pose, format: "png" | "jpeg", captureAspect = this.aspect): Promise<Blob> {
    if (this.closed) throw Error("closed");
    const surface = this.gl.domElement,
      [width, height] = photoSize(captureAspect, 1);
    const old = this.gl.getSize(new Vector2()),
      ratio = this.gl.getPixelRatio();
    const photoCam = this.camera.clone();
    photoCam.aspect = captureAspect;
    photoCam.updateProjectionMatrix();
    placeCamera(photoCam, pose);
    const buffer = document.createElement("canvas");
    buffer.width = width;
    buffer.height = height;
    try {
      const ctx = buffer.getContext("2d", { alpha: false });
      if (!ctx) throw Error("canvas");
      try {
        this.gl.setDrawingBufferSize(width, height, 1);
        this.gl.render(this.scene, photoCam);
        ctx.drawImage(surface, 0, 0, width, height);
      } finally {
        this.gl.setDrawingBufferSize(old.x, old.y, ratio);
        this.gl.render(this.scene, this.camera);
      }
      return await new Promise<Blob>((resolve, reject) =>
        buffer.toBlob(
          (blob) => (blob ? resolve(blob) : reject(Error("encode"))),
          "image/" + format,
          format === "jpeg" ? 0.92 : undefined,
        ),
      );
    } finally {
      buffer.width = 0;
      buffer.height = 0;
    }
  }
  dispose() {
    this.closed = true;
    window.clearTimeout(this.idleTimer);
    this.gestures.abort();
    this.removeSensor();
    this.scene.remove(this.artwork.group);
    this.artwork.dispose();
    this.gl.renderLists.dispose();
    this.active.clear();
    this.samples = [];
  }
}
