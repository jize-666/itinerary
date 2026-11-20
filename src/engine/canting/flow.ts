/**
 * Aliran malam dari cucuk canting (Tugas 11.2, halaman /canting/). Murni: masukan sampel pointer di ruang kain
 * (x 0–aspek, y 0–1, y ke bawah, waktu ms), keluaran dab malam (x, y, jari-jari) dan kejadian untuk antarmuka dan
 * Clawd. Tanpa DOM atau three, jadi bisa diuji dan deterministik.
 *
 * Yang dimodelkan (PRD §4):
 * - lebar garis turun saat tangan cepat (malam keluar dengan laju tetap, tersebar di jarak yang lebih panjang);
 * - malam di nyamplung terpakai sesuai luas yang ditutup; saat hampir habis garis menipis, saat habis berhenti dan
 *   memberi kejadian `empty` (celup ulang ke wajan);
 * - malam di nyamplung mendingin pelan sesudah dicelup: garis sedikit lebih tipis;
 * - tangan diam: malam melebar di titik itu (mbleber), lalu menetes sekali;
 * - canting cecek: ketukan = satu titik, diseret = deret titik.
 */
import type { Tool } from "./motif";

export type FlowTool = Tool;
export type FlowDab = { x: number; y: number; r: number };
/** `fast` = tangan sangat cepat (garis tipis), `spread` = mbleber, `drip` = menetes, `empty` = malam habis. */
export type FlowEvent = "fast" | "spread" | "drip" | "empty";

export const FLOW = {
  klowong: { r: 0.0042, spacing: 0.35 },
  /** `gap` = jarak antar-titik saat diseret (× jari-jari). */
  cecek: { r: 0.0055, gap: 3.4 },
  tembok: { r: 0.02, spacing: 0.3 },
  /** Kecepatan acuan (tinggi kain per detik): di atas ini garis klowong mulai jelas menipis. */
  vRef: 0.35,
  /** Malam satu nyamplung penuh, sebagai luas kain yang bisa ditutup (satuan tinggi kain²). */
  capacity: 0.034,
  /** Di bawah kadar ini garis menipis karena malam tinggal sedikit. */
  low: 0.14,
  /** Tangan dianggap diam bila bergerak kurang dari ini (tinggi kain) di antara dua sampel. */
  stillDist: 0.0015,
  /** Diam lebih lama dari ini: malam mulai melebar. */
  stillMs: 140,
  /** Lama mbleber mencapai lebar terbesar. */
  spreadMs: 1100,
  /** Lebar terbesar mbleber (× jari-jari dasar). */
  spreadMax: 2.3,
  /** Diam selama ini: malam menetes sekali. */
  dripMs: 1300,
  /** Tetesan: jari-jari tambahan (tinggi kain) dan geser ke bawah (× jari-jari dasar). */
  dripR: 0.0065,
  dripDrop: 0.9,
  /** Malam di nyamplung mendingin dengan tetapan waktu ini (detik). */
  coolS: 45,
} as const;

export type FlowState = Readonly<{
  /** Malam di nyamplung 0–1. */
  malam: number;
  /** Suhu malam di nyamplung 0–1 (1 = baru dicelup). */
  heat: number;
  /** Saat terakhir dicelup (ms). */
  dippedAt: number;
  down: boolean;
  tool: FlowTool;
  /** Sampel terakhir. */
  x: number;
  y: number;
  t: number;
  /** Jarak dari dab terakhir di sepanjang lintasan (tinggi kain). */
  carry: number;
  /** Kecepatan yang dihaluskan (tinggi kain per detik). */
  speed: number;
  /** Sejak kapan tangan diam di titik ini (ms). */
  stillSince: number;
  /** Jari-jari mbleber terakhir di titik diam (0 = belum melebar). */
  spread: number;
  dripped: boolean;
  /** Kejadian `empty` sudah dikirim untuk goresan ini. */
  emptied: boolean;
  /** Kejadian `fast` sudah dikirim untuk goresan ini. */
  fasted: boolean;
  /** Malam sudah mulai melebar di titik diam ini (kejadian `spread` sudah dikirim). */
  grew: boolean;
}>;

export type FlowOut = { state: FlowState; dabs: FlowDab[]; events: FlowEvent[] };

/** Canting baru: nyamplung penuh dan panas (dicelup pada `now`). */
export function createFlow(now: number): FlowState {
  return {
    malam: 1,
    heat: 1,
    dippedAt: now,
    down: false,
    tool: "klowong",
    x: 0,
    y: 0,
    t: now,
    carry: 0,
    speed: 0,
    stillSince: -1,
    spread: 0,
    dripped: false,
    emptied: false,
    fasted: false,
    grew: false,
  };
}

/** Celup ke wajan: nyamplung penuh dan panas lagi. */
export function dip(s: FlowState, now: number): FlowState {
  return { ...s, malam: 1, heat: 1, dippedAt: now, emptied: false };
}

const heatAt = (s: FlowState, t: number) => Math.exp(-Math.max(0, t - s.dippedAt) / 1000 / FLOW.coolS);

/** Faktor aliran dari suhu dan sisa malam (0 bila habis). */
function flowFactor(malam: number, heat: number) {
  if (malam <= 0) return 0;
  return (0.62 + 0.38 * heat) * Math.min(1, Math.max(0.4, malam / FLOW.low));
}

/** Getar kecil deterministik dari posisi (titik cecek tidak seragam seperti cap). */
function jitter(x: number, y: number) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

/** Jari-jari dab untuk alat, kecepatan, dan aliran. */
function radiusFor(tool: FlowTool, speed: number, factor: number, x: number, y: number) {
  if (tool === "cecek") return FLOW.cecek.r * factor * (0.9 + 0.2 * jitter(x, y));
  const v = speed / FLOW.vRef;
  if (tool === "tembok") return FLOW.tembok.r * factor * Math.min(1.1, Math.max(0.7, 1.1 - 0.25 * v));
  return FLOW.klowong.r * factor * Math.min(1.18, Math.max(0.5, 1.18 - 0.5 * v));
}

const baseR = (tool: FlowTool) => FLOW[tool].r;

/** Kurangi malam di nyamplung sebanyak luas `area`. */
const spend = (malam: number, area: number) => Math.max(0, malam - area / FLOW.capacity);

/** Cucuk menempel di kain. */
export function press(s0: FlowState, x: number, y: number, t: number, tool: FlowTool): FlowOut {
  const heat = heatAt(s0, t);
  // tiap goresan baru: kejadian dikirim ulang (ketukan dengan nyamplung kosong mengingatkan lagi untuk mencelup)
  let s: FlowState = { ...s0, down: true, tool, x, y, t, carry: 0, speed: 0, stillSince: t, spread: 0, dripped: false, fasted: false, emptied: false, grew: false, heat };
  const events: FlowEvent[] = [];
  const factor = flowFactor(s.malam, heat);
  if (factor <= 0) {
    if (!s.emptied) events.push("empty");
    s = { ...s, emptied: true };
    return { state: s, dabs: [], events };
  }
  const r = radiusFor(tool, 0, factor, x, y);
  const malam = spend(s.malam, Math.PI * r * r);
  s = { ...s, malam, spread: r };
  return { state: s, dabs: [{ x, y, r }], events: malam <= 0 ? markEmpty(s, events) : events };
}

function markEmpty(s: FlowState, events: FlowEvent[]) {
  if (!s.emptied) events.push("empty");
  return events;
}

/** Pointer bergerak selagi menempel: dab di sepanjang lintasan, rapat tanpa celah. */
export function move(s0: FlowState, x: number, y: number, t: number): FlowOut {
  if (!s0.down) return { state: s0, dabs: [], events: [] };
  const dx = x - s0.x;
  const dy = y - s0.y;
  const dist = Math.hypot(dx, dy);
  const dt = Math.max(1, t - s0.t) / 1000;
  const heat = heatAt(s0, t);
  if (dist < FLOW.stillDist) {
    // diam: hanya waktu yang maju (mbleber diurus `hold`)
    return { state: { ...s0, t, heat, speed: s0.speed * 0.7 }, dabs: [], events: [] };
  }
  const speed = s0.speed + (dist / dt - s0.speed) * 0.35;
  const events: FlowEvent[] = [];
  let fasted = s0.fasted;
  if (!fasted && speed > FLOW.vRef * 2) {
    events.push("fast");
    fasted = true;
  }
  const dabs: FlowDab[] = [];
  let malam = s0.malam;
  let emptied = s0.emptied;
  let carry = s0.carry;
  let walked = 0;
  // dab di sepanjang segmen: jarak antar-dab mengikuti jari-jari saat itu (cecek: deret titik)
  for (let guard = 0; guard < 20000; guard++) {
    const factor = flowFactor(malam, heat);
    if (factor <= 0) {
      if (!emptied) events.push("empty");
      emptied = true;
      break;
    }
    const probeR = radiusFor(s0.tool, speed, factor, s0.x, s0.y);
    const step = s0.tool === "cecek" ? FLOW.cecek.gap * probeR : FLOW[s0.tool].spacing * probeR;
    const need = step - carry;
    if (walked + need > dist) break;
    walked += need;
    carry = 0;
    const k = walked / dist;
    const px = s0.x + dx * k;
    const py = s0.y + dy * k;
    const r = radiusFor(s0.tool, speed, factor, px, py);
    dabs.push({ x: px, y: py, r });
    // luas baru: garis = lebar × langkah; cecek = satu titik penuh
    malam = spend(malam, s0.tool === "cecek" ? Math.PI * r * r : 2 * r * step);
  }
  carry += dist - walked;
  return {
    state: { ...s0, x, y, t, heat, speed, carry, malam, emptied, fasted, stillSince: t, spread: 0, dripped: false, grew: false },
    dabs,
    events,
  };
}

/** Dipanggil tiap frame selagi menempel: tangan yang diam membuat malam melebar lalu menetes. */
export function hold(s0: FlowState, t: number): FlowOut {
  if (!s0.down || s0.stillSince < 0) return { state: s0, dabs: [], events: [] };
  const still = t - s0.stillSince;
  if (still <= FLOW.stillMs) return { state: s0, dabs: [], events: [] };
  const heat = heatAt(s0, t);
  const factor = flowFactor(s0.malam, heat);
  const events: FlowEvent[] = [];
  if (factor <= 0) return { state: s0, dabs: [], events: markEmpty(s0, events) };
  const dabs: FlowDab[] = [];
  const r0 = baseR(s0.tool) * factor;
  const e = Math.min(1, (still - FLOW.stillMs) / FLOW.spreadMs);
  const ease = 1 - (1 - e) * (1 - e);
  const target = r0 * (1 + (FLOW.spreadMax - 1) * ease);
  let malam = s0.malam;
  let spread = s0.spread;
  let grew = s0.grew;
  if (target > spread * 1.02) {
    if (!grew) events.push("spread");
    grew = true;
    dabs.push({ x: s0.x, y: s0.y, r: target });
    malam = spend(malam, Math.PI * (target * target - spread * spread));
    spread = target;
  }
  let dripped = s0.dripped;
  if (!dripped && still >= FLOW.dripMs) {
    dripped = true;
    events.push("drip");
    const r = Math.min(spread, r0 * FLOW.spreadMax) * 0.55 + FLOW.dripR;
    const d = { x: s0.x + r0 * 0.3, y: s0.y + r0 * FLOW.dripDrop, r };
    dabs.push(d);
    malam = spend(malam, Math.PI * r * r * 0.6);
  }
  if (malam <= 0 && !s0.emptied) events.push("empty");
  return { state: { ...s0, t, heat, malam, spread, dripped, grew, emptied: s0.emptied || malam <= 0 }, dabs, events };
}

/** Cucuk diangkat. */
export function release(s: FlowState): FlowState {
  return { ...s, down: false, stillSince: -1, spread: 0, carry: 0, grew: false };
}
