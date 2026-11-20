/**
 * Motif kawung ukel untuk Tugas 11 (Canting dan kain mori). Pilihan host 19 Nov: "kawung"; Claude memilih arah
 * kawung ukel dari referensi host (gambar stok berlisensi, tidak disalin): satu medalion empat arah di tengah kain,
 * daun soga yang memancar ke empat arah mata angin, pasangan ukel di keempat diagonal, isian cecek, di atas bidang
 * kawung kecil (empat lonjong mengelilingi satu pusat). Semua bentuk dibuat di sini, orisinal.
 *
 * Satuan: tinggi kain = 1, lebar kain = `aspect`; (0, 0) di kiri atas, y ke bawah. Hasilnya daftar guratan malam
 * berurutan (urutan nglowong → ngisen-iseni → nembok), dipakai bersama oleh halaman /canting/ (pola tuntunan) dan
 * film Hari 3 (torehan yang mengikuti gulir). Logika murni, tanpa three atau DOM.
 *
 * Lapisan malam:
 * - `keep`: malam yang bertahan sampai nglorod (garis klowong, cecek, isian krem). Hasil akhir: krem mori.
 * - `temp`: malam tembok yang dikerok sesudah medel (nila). Bidangnya kena soga saja. Hasil akhir: cokelat soga.
 * - Tanpa malam: kena nila lalu soga. Hasil akhir: hitam kecokelatan.
 */

export type Pt = readonly [number, number];
export type Layer = "keep" | "temp";
export type Tool = "klowong" | "cecek" | "tembok";

export type LineStroke = { kind: "line"; tool: "klowong"; layer: "keep"; pts: Pt[]; width: number; closed: boolean };
export type DotStroke = { kind: "dot"; tool: "cecek"; layer: "keep"; at: Pt; r: number };
export type FillStroke = { kind: "fill"; tool: "tembok"; layer: Layer; poly: Pt[] };
export type Stroke = (LineStroke | DotStroke | FillStroke) & { part: Part };

/** Bagian motif, untuk urutan torehan dan uji. */
export type Part = "core" | "leaf" | "ukel" | "ring" | "field" | "border";

export type Motif = {
  aspect: number;
  /** Pusat medalion. */
  center: Pt;
  /** Jari-jari medalion (bidang kawung tidak masuk ke dalam lingkaran ini ditambah `clear`). */
  radius: number;
  strokes: Stroke[];
};

export type MotifOptions = {
  /** Lebar kain ÷ tinggi kain. Bawaan 1,6 (kain di gawangan). */
  aspect?: number;
  /** Jarak kisi kawung (satuan tinggi kain). */
  spacing?: number;
  /** Jari-jari medalion. */
  radius?: number;
};

const TAU = Math.PI * 2;

/** Lebar garis malam (satuan tinggi kain). Klowong dibuat sedikit lebih tebal dari aslinya supaya terbaca di layar HP. */
export const WIDTH = { fine: 0.0026, line: 0.0036, bold: 0.0062, ukel: 0.0105 } as const;

const rot = ([x, y]: Pt, a: number): Pt => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const add = ([x, y]: Pt, [u, v]: Pt): Pt => [x + u, y + v];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Elips tertutup: pusat, setengah sumbu panjang `a` searah sudut `ang`, setengah sumbu pendek `b`. */
export function ellipse(c: Pt, a: number, b: number, ang: number, n = 40): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    out.push(add(c, rot([Math.cos(t) * a, Math.sin(t) * b], ang)));
  }
  return out;
}

/**
 * Kelopak kawung: lonjong yang meruncing di kedua ujung (bentuk buah kolang-kaling terbelah), sumbu panjang searah
 * `ang`. Bentuk ini yang membuat empat kelopak di sekitar satu titik terbaca sebagai kawung, bukan sekadar elips.
 */
export function petal(c: Pt, a: number, b: number, ang: number, n = 44): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    const x = Math.cos(t) * a;
    // ujung sedikit runcing: lebar diperkecil mendekati ujung sumbu panjang
    const y = Math.sin(t) * b * (1 - 0.18 * Math.cos(t) ** 4);
    out.push(add(c, rot([x, y], ang)));
  }
  return out;
}

/**
 * Daun soga bertepi bergelombang dari `base` ke arah `ang` sepanjang `len`. Kembali: garis tepi tertutup, tulang
 * daun, urat samping, dan titik cecek di antara urat.
 */
export function leaf(base: Pt, ang: number, len: number, halfWidth: number, lobes = 5) {
  const side = (s: 1 | -1) => {
    const pts: Pt[] = [];
    const n = 64;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      // badan daun: melebar cepat lalu meruncing panjang; tepi bergelombang (lekuk batik), gelombang mereda di ujung
      const body = Math.sin(Math.PI * t ** 0.78) ** 0.85;
      const scallop = 1 - 0.16 * Math.abs(Math.sin(lobes * Math.PI * t)) * (1 - t * 0.6);
      const w = halfWidth * body * scallop;
      // ujung sedikit melengkung ke satu sisi (daun hidup, bukan simetris kaku)
      const bend = 0.06 * len * Math.sin(Math.PI * t) * t;
      pts.push(add(base, rot([t * len, s * w + bend * 0.25], ang)));
    }
    return pts;
  };
  const right = side(1);
  const left = side(-1).reverse();
  const outline = [...right, ...left.slice(1, -1)];
  const vein: Pt[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = 0.04 + (i / 24) * 0.88;
    vein.push(add(base, rot([t * len, 0.06 * len * Math.sin(Math.PI * t) * t * 0.25], ang)));
  }
  const ribs: Pt[][] = [];
  const dots: Pt[] = [];
  const count = 7;
  for (let k = 0; k < count; k++) {
    const t0 = 0.16 + (k / count) * 0.7;
    for (const s of [1, -1] as const) {
      const body = Math.sin(Math.PI * t0 ** 0.78) ** 0.85;
      const reach = halfWidth * body * 0.72;
      const rib: Pt[] = [];
      for (let j = 0; j <= 8; j++) {
        const u = j / 8;
        // urat melengkung ke arah ujung daun
        rib.push(add(base, rot([(t0 + u * 0.09) * len, s * reach * u ** 0.9], ang)));
      }
      ribs.push(rib);
      // cecek di antara dua urat
      const tm = t0 + 0.5 / count;
      const bm = Math.sin(Math.PI * tm ** 0.78) ** 0.85;
      dots.push(add(base, rot([(tm + 0.03) * len, s * halfWidth * bm * 0.36], ang)));
    }
  }
  return { outline, vein, ribs, dots };
}

/**
 * Pita: garis tengah `pts` dengan lebar berubah `width(t)` (t 0–1 sepanjang garis) menjadi poligon tertutup. Dipakai
 * untuk ukel yang tebal di tengah dan meruncing di ujung, seperti torehan canting tembok yang diperlambat.
 */
export function ribbon(pts: readonly Pt[], width: (t: number) => number): Pt[] {
  const n = pts.length;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(n - 1, i + 1)]!;
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    const w = width(i / (n - 1)) / 2;
    const p = pts[i]!;
    left.push([p[0] - ty * w, p[1] + tx * w]);
    right.push([p[0] + ty * w, p[1] - tx * w]);
  }
  return [...left, ...right.reverse()];
}

/**
 * Ukel lira: batang lengkung (Bezier kubik) dari `p0` ke `p3`, lalu spiral yang melanjutkan arah batang dan
 * menggulung `turns` putaran dengan jari-jari awal `curl`. Sisi gulungan ditentukan oleh `away` (titik yang harus
 * dijauhi pusat spiral, biasanya sumbu lira) supaya kedua ukel sepasang menggulung keluar.
 */
export function ukelPath(p0: Pt, p1: Pt, p2: Pt, p3: Pt, curl: number, turns: number, away: Pt): Pt[] {
  const pts: Pt[] = [];
  const bez = (t: number): Pt => {
    const u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ];
  };
  for (let i = 0; i <= 30; i++) pts.push(bez(i / 30));
  // garis singgung di ujung batang
  let tx = p3[0] - p2[0];
  let ty = p3[1] - p2[1];
  const l = Math.hypot(tx, ty) || 1;
  tx /= l;
  ty /= l;
  // dua calon pusat spiral (kiri/kanan garis singgung); pilih yang lebih jauh dari `away`
  const cA: Pt = [p3[0] - ty * curl, p3[1] + tx * curl];
  const cB: Pt = [p3[0] + ty * curl, p3[1] - tx * curl];
  const c = Math.hypot(cA[0] - away[0], cA[1] - away[1]) > Math.hypot(cB[0] - away[0], cB[1] - away[1]) ? cA : cB;
  const rx = p3[0] - c[0];
  const ry = p3[1] - c[1];
  const sense = Math.sign(rx * ty - ry * tx) || 1;
  const start = Math.atan2(ry, rx);
  const n = 90;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const r = curl * (1 - 0.78 * t);
    const a = start + sense * t * turns * TAU;
    pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]);
  }
  return pts;
}

/** Bintang empat sudut kecil (isian pusat kawung dan simpul kisi), tertutup. */
export function star4(c: Pt, r: number, ang = 0, waist = 0.32): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < 16; i++) {
    const a = ang + (i / 16) * TAU;
    const k = i % 4 === 0 ? 1 : i % 2 === 0 ? waist : waist * 1.25;
    out.push(add(c, [Math.cos(a) * r * k, Math.sin(a) * r * k]));
  }
  return out;
}

export function polylineLength(pts: readonly Pt[], closed = false) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
  if (closed && pts.length > 2) s += Math.hypot(pts[0]![0] - pts[pts.length - 1]![0], pts[0]![1] - pts[pts.length - 1]![1]);
  return s;
}

/** Luas poligon (rumus tali sepatu), untuk uji: bidang tembok tidak boleh kosong. */
export function polygonArea(poly: readonly Pt[]) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i]!;
    const [x1, y1] = poly[(i + 1) % poly.length]!;
    s += x0 * y1 - x1 * y0;
  }
  return Math.abs(s) / 2;
}

/** Motif kawung ukel lengkap untuk satu kain. Deterministik: masukan sama = keluaran sama. */
export function kawungUkel(opts: MotifOptions = {}): Motif {
  const aspect = opts.aspect ?? 1.6;
  const radius = opts.radius ?? 0.4;
  const spacing = opts.spacing ?? 0.096;
  const center: Pt = [aspect / 2, 0.5];
  const R = radius;
  const strokes: Stroke[] = [];
  const line = (part: Part, pts: Pt[], width: number, closed = false) =>
    strokes.push({ kind: "line", tool: "klowong", layer: "keep", pts, width, closed, part });
  const dot = (part: Part, at: Pt, r: number) => strokes.push({ kind: "dot", tool: "cecek", layer: "keep", at, r, part });
  const fill = (part: Part, poly: Pt[], layer: Layer) => strokes.push({ kind: "fill", tool: "tembok", layer, poly, part });
  const at = (r: number, a: number): Pt => add(center, [Math.cos(a) * r, Math.sin(a) * r]);

  // ---- 1. inti: kawung kecil (empat kelopak di diagonal) dan bintang pusat ----
  const coreFills: Pt[][] = [];
  const coreSeeds: Pt[][] = [];
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const c = at(R * 0.118, a);
    const shape = petal(c, R * 0.105, R * 0.058, a);
    line("core", shape, WIDTH.line, true);
    coreFills.push(shape);
    coreSeeds.push(petal(at(R * 0.15, a), R * 0.04, R * 0.016, a, 24));
  }
  const coreStar = star4(center, R * 0.05, Math.PI / 4);
  line("core", coreStar, WIDTH.fine, true);

  // ---- 2. empat daun soga di arah mata angin ----
  const leafFills: Pt[][] = [];
  const leafDots: Pt[] = [];
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    const L = leaf(at(R * 0.255, a), a, R * 0.66, R * 0.15);
    line("leaf", L.outline, WIDTH.line, true);
    line("leaf", L.vein, WIDTH.line);
    for (const rib of L.ribs) line("leaf", rib, WIDTH.fine);
    leafFills.push(L.outline);
    leafDots.push(...L.dots);
    // kuncup tiga cecek di ujung daun
    for (let j = -1; j <= 1; j++) dot("leaf", at(R * (0.955 + (j === 0 ? 0.03 : 0)), a + j * 0.045), R * 0.012);
  }

  // ---- 3. lira ukel di keempat diagonal: dua ukel menggulung keluar, kuncup soga di sumbunya ----
  const ukelFills: Pt[][] = [];
  const budFills: Pt[][] = [];
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const axisFar = at(R * 0.2, a);
    for (const hand of [1, -1] as const) {
      const path = ukelPath(
        at(R * 0.205, a + hand * 0.16),
        at(R * 0.36, a + hand * 0.06),
        at(R * 0.5, a + hand * 0.36),
        at(R * 0.66, a + hand * 0.25),
        R * 0.085,
        1.45,
        axisFar,
      );
      const stemEnd = 31 / path.length;
      const shape = ribbon(path, (t) => {
        // tebal di batang, menebal sedikit saat mulai menggulung, meruncing ke pusat spiral
        if (t < stemEnd) return WIDTH.ukel * (0.35 + 0.65 * Math.sin((Math.PI / 2) * (t / stemEnd)));
        const u = (t - stemEnd) / (1 - stemEnd);
        return WIDTH.ukel * (1.15 - 0.95 * u);
      });
      ukelFills.push(shape);
      line("ukel", path, WIDTH.fine);
      // cecek di pusat gulungan
      dot("ukel", path[path.length - 1]!, R * 0.012);
    }
    // kuncup soga di sumbu lira, ujungnya tiga tetes cecek yang mengecil
    const bud = petal(at(R * 0.45, a), R * 0.105, R * 0.042, a, 36);
    line("ukel", bud, WIDTH.fine, true);
    budFills.push(bud);
    for (let j = 0; j < 3; j++) dot("ukel", at(R * (0.6 + j * 0.055), a), R * (0.013 - j * 0.003));
  }

  // ---- 4. renda cecek: cincin dalam dan luar ----
  for (let i = 0; i < 28; i++) dot("ring", at(R * 0.215, (i / 28) * TAU + Math.PI / 28), R * 0.0105);
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * TAU;
    // cincin luar bergelombang mengikuti daun (lebih jauh di arah daun)
    const r = R * (1.06 + 0.035 * Math.cos(4 * a));
    dot("ring", at(r, a), R * (i % 2 ? 0.0085 : 0.011));
  }
  for (const d of leafDots) dot("leaf", d, R * 0.0095);
  // taburan cecek tiga (segitiga kecil) di sela gelap antara lira dan cincin luar
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    for (const [r, da] of [
      [0.84, -0.3],
      [0.84, 0.3],
      [0.95, -0.17],
      [0.95, 0.17],
      [0.8, 0],
      [0.96, -0.42],
      [0.96, 0.42],
    ] as const) {
      const c = at(R * r, a + da);
      for (let j = 0; j < 3; j++) dot("ring", add(c, rot([R * 0.022, 0], a + (j * TAU) / 3)), R * 0.0085);
    }
  }

  // ---- 5. bidang kawung: kisi miring 45°, kelopak di tiap sisi kisi ----
  const s = spacing;
  const clear = R * 1.14;
  const margin = 0.085;
  const inside = (p: Pt, pad: number) => p[0] > margin + pad && p[0] < aspect - margin - pad && p[1] > margin + pad && p[1] < 1 - margin - pad;
  const awayFromMedallion = (p: Pt, pad: number) => Math.hypot(p[0] - center[0], p[1] - center[1]) > clear + pad;
  const toCloth = (u: number, v: number): Pt => add(center, rot([u, v], Math.PI / 4));
  const span = Math.ceil((aspect + 1) / s) + 2;
  const fieldFills: Pt[][] = [];
  const fieldSeeds: Pt[][] = [];
  const fieldStars: Pt[][] = [];
  const fieldDots: Pt[] = [];
  for (let i = -span; i <= span; i++) {
    for (let j = -span; j <= span; j++) {
      // dua kelopak per sel: di sisi u dan di sisi v; sumbu panjangnya sepanjang sisi kisi
      for (const [du, dv, ang] of [
        [0.5, 0, Math.PI / 4],
        [0, 0.5, (3 * Math.PI) / 4],
      ] as const) {
        const c = toCloth((i + du) * s, (j + dv) * s);
        // kelopak hanya dipasang bila kedua simpul ujungnya sah: rantai kawung utuh, tanpa kelopak menggantung
        const n0 = toCloth(i * s, j * s);
        const n1 = toCloth((i + 2 * du) * s, (j + 2 * dv) * s);
        const ok = (p: Pt) => inside(p, s * 0.3) && awayFromMedallion(p, s * 0.3);
        if (!ok(n0) || !ok(n1)) continue;
        const shape = petal(c, s * 0.47, s * 0.205, ang);
        fieldFills.push(shape);
        fieldSeeds.push(petal(c, s * 0.2, s * 0.05, ang, 20));
      }
      const node = toCloth(i * s, j * s);
      if (inside(node, s * 0.3) && awayFromMedallion(node, s * 0.3)) fieldDots.push(node);
      // bintang di pusat sel hanya bila keempat simpul sel sah (dikelilingi kelopak utuh)
      const cell = [toCloth(i * s, j * s), toCloth((i + 1) * s, j * s), toCloth(i * s, (j + 1) * s), toCloth((i + 1) * s, (j + 1) * s)];
      if (cell.every((p) => inside(p, s * 0.3) && awayFromMedallion(p, s * 0.3)))
        fieldStars.push(star4(toCloth((i + 0.5) * s, (j + 0.5) * s), s * 0.17, Math.PI / 4, 0.28));
    }
  }
  // simetri cermin: sisi kanan = cerminan sisi kiri (pembulatan di batas tidak boleh membuat kedua sisi berbeda)
  // simetri empat arah: kuadran kiri atas dibangun, lalu dicerminkan ke kanan dan ke bawah (bentuk yang tepat di
  // sumbu mendatar disimpan sekali)
  const [cx, cy] = center;
  const eps = 1e-6;
  const mid = (poly: readonly Pt[]): Pt => [poly.reduce((a, p) => a + p[0], 0) / poly.length, poly.reduce((a, p) => a + p[1], 0) / poly.length];
  const flipX = (poly: readonly Pt[]): Pt[] => poly.map(([x, y]) => [2 * cx - x, y] as Pt).reverse();
  const flipY = (poly: readonly Pt[]): Pt[] => poly.map(([x, y]) => [x, 2 * cy - y] as Pt).reverse();
  const quad = <T,>(items: T[], at: (t: T) => Pt, fx: (t: T) => T, fy: (t: T) => T): T[] => {
    const left = items.filter((q) => at(q)[0] < cx - eps);
    const top = left.filter((q) => at(q)[1] < cy - eps);
    const axis = left.filter((q) => Math.abs(at(q)[1] - cy) <= eps);
    const half = [...top, ...top.map(fy), ...axis];
    return [...half, ...half.map(fx)];
  };
  const polys = (items: Pt[][]) => quad(items, mid, flipX, flipY);
  const fFills = polys(fieldFills);
  const fSeeds = polys(fieldSeeds);
  const fStars = polys(fieldStars);
  const fDots = quad(
    fieldDots,
    (d) => d,
    ([x, y]) => [2 * cx - x, y] as Pt,
    ([x, y]) => [x, 2 * cy - y] as Pt,
  );
  fieldFills.length = 0;
  fieldFills.push(...fFills);
  fieldSeeds.length = 0;
  fieldSeeds.push(...fSeeds);
  for (const f of fFills) line("field", f, WIDTH.fine, true);
  for (const st of fStars) line("field", st, WIDTH.fine, true);
  for (const d of fDots) dot("field", d, s * 0.045);
  fieldStars.length = 0;
  fieldStars.push(...fStars);

  // ---- 6. pinggiran: dua garis sejajar dan deret cecek di keempat tepi ----
  const edge = (y: number) => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 40; i++) pts.push([lerp(margin * 0.55, aspect - margin * 0.55, i / 40), y]);
    return pts;
  };
  const edgeV = (x: number) => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 26; i++) pts.push([x, lerp(margin * 0.55, 1 - margin * 0.55, i / 26)]);
    return pts;
  };
  for (const y of [margin * 0.55, margin * 0.85, 1 - margin * 0.85, 1 - margin * 0.55]) line("border", edge(y), WIDTH.line);
  for (const x of [margin * 0.55, margin * 0.85, aspect - margin * 0.85, aspect - margin * 0.55]) line("border", edgeV(x), WIDTH.line);
  const step = 0.022;
  for (let x = margin * 0.7 + step; x < aspect - margin * 0.7; x += step) {
    dot("border", [x, margin * 0.7], 0.0042);
    dot("border", [x, 1 - margin * 0.7], 0.0042);
  }
  for (let y = margin * 0.7 + step; y < 1 - margin * 0.7; y += step) {
    dot("border", [margin * 0.7, y], 0.0042);
    dot("border", [aspect - margin * 0.7, y], 0.0042);
  }

  // ---- 7. isian: krem tetap (keep) dulu, lalu tembok sementara (temp) ----
  fill("core", coreStar, "keep");
  for (const sd of coreSeeds) fill("core", sd, "keep");
  for (const sd of fieldSeeds) fill("field", sd, "keep");
  for (const st of fieldStars) fill("field", st, "keep");
  for (const f of ukelFills) fill("ukel", f, "keep");
  for (const f of coreFills) fill("core", f, "temp");
  for (const f of budFills) fill("ukel", f, "temp");
  for (const f of leafFills) fill("leaf", f, "temp");
  for (const f of fieldFills) fill("field", f, "temp");

  return { aspect, center, radius: R, strokes };
}
