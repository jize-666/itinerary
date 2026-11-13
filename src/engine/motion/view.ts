/**
 * Gerak pandang film: parallax kamera, perspective shift, kedalaman yang mengikuti gulir, dan zoom gong. Murni:
 * tanpa DOM, tanpa three. Dipakai panggung 3D (`components/film/stage3d/runtime.ts`) dan film 2,5D (lapisan DOM).
 *
 * Aturan host 13 Nov 2026: "pastikan di setiap objek 3D (semua), harus ada semuanya itu. bahkan di film 2,5D juga
 * harus ada; perspective shift, scroll driven depth, kamera parallax". Untuk slide gong ditambah zoom (cubit,
 * Ctrl+roda, tombol +/−) dan dua tahap gulir: gulir maju pertama mendekat ke gong, berikutnya baru pindah slide.
 */

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

export const VIEW = {
  /**
   * Parallax 3D: kamera bergeser sekian meter (di bidikan orbit; bidikan lanskap 0,6×) saat kursor di tepi layar
   * atau HP dimiringkan penuh, lalu diarahkan lagi ke objeknya. Karena kameranya yang berpindah lalu memandang
   * ulang, perspektifnya sungguh berubah: yang dekat bergeser lebih jauh daripada yang jauh (perspective shift).
   */
  shiftX: 0.42,
  shiftY: 0.2,
  /** Lirikan: titik pandang ikut bergeser sedikit ke arah kursor (bagian dari geseran kamera). */
  aim: 0.18,
  /** Kemiringan HP (derajat) yang setara dengan kursor di tepi layar. */
  tilt: 16,
  /** Posisi memegang HP yang baru menjadi netral pelan-pelan: tetapan waktu (detik). */
  recenter: 5,
  /** Penghalus geseran pandang: tetapan waktu (detik). */
  ease: 0.22,
  /** Perubahan target di bawah ini tidak dianggap gerak (getar tangan): panggung boleh beristirahat. */
  still: 0.004,
  /**
   * Kedalaman ikut gulir: di tengah perpindahan slide kamera maju sekian bagian dari jarak ke objeknya, mengikuti
   * kemajuan gulir (di HP mengikuti jari), lalu mundur lagi saat tiba. Nol di kedua ujung, jadi tidak ada lompatan.
   */
  push: 0.14,
  /** 2,5D: geseran lapisan (px) per satuan kedalaman saat kursor di tepi layar. */
  layer: 14,
  /** 2,5D: bidang teks miring sekian derajat mengikuti kursor (perspective shift). */
  layerTilt: 2.4,
  /** 2,5D: lapisan yang ditinggalkan membesar sekian (kamera menembus ke depan), yang datang tumbuh dari kedalaman. */
  layerPush: 0.06,
} as const;

/** Dorongan kedalaman pada kemajuan perpindahan `p` (0–1): 0 di kedua ujung, `VIEW.push` di tengah. */
export const scrollDepth = (p: number) => VIEW.push * Math.sin(Math.PI * clamp(p, 0, 1));

/** Mendekati `target` dari `cur` dengan tetapan waktu `tau` detik selama `dt` detik (bebas laju frame). */
export const approach = (cur: number, target: number, dt: number, tau: number) => (tau <= 0 ? target : target + (cur - target) * Math.exp(-Math.max(0, dt) / tau));

export type Look = Readonly<{ x: number; y: number }>;

/** Kursor di layar (px) → arah pandang −1…1 (x ke kanan, y ke bawah). */
export const pointerLook = (cx: number, cy: number, w: number, h: number): Look => ({
  x: clamp((cx / Math.max(1, w)) * 2 - 1, -1, 1),
  y: clamp((cy / Math.max(1, h)) * 2 - 1, -1, 1),
});

/**
 * Kemiringan HP → arah pandang −1…1, relatif terhadap posisi memegang `base` (beta, gamma dalam derajat dari
 * `DeviceOrientationEvent`). `angle` = sudut layar (0 tegak, 90 atau −90/270 mendatar, 180 terbalik): sumbu
 * kemiringan diputar mengikuti layar, jadi memiringkan ke kanan selalu menggeser pandangan ke kanan.
 */
export function tiltLook(beta: number, gamma: number, base: Readonly<{ beta: number; gamma: number }>, angle = 0): Look {
  let db = beta - base.beta;
  const dg = gamma - base.gamma;
  // beta melompat ±180 saat HP melewati posisi tegak terbalik: ambil selisih terpendek
  if (db > 180) db -= 360;
  if (db < -180) db += 360;
  const a = ((((angle % 360) + 360) % 360) * Math.PI) / 180;
  const c = Math.round(Math.cos(a));
  const s = Math.round(Math.sin(a));
  const x = dg * c + db * s;
  const y = db * c - dg * s;
  return { x: clamp(x / VIEW.tilt, -1, 1), y: clamp(y / VIEW.tilt, -1, 1) };
}

/** Posisi memegang HP bergeser pelan ke pembacaan sekarang, supaya cara memegang yang baru menjadi netral. */
export function recenterBase(base: Readonly<{ beta: number; gamma: number }>, beta: number, gamma: number, dt: number) {
  let db = beta - base.beta;
  if (db > 180) db -= 360;
  if (db < -180) db += 360;
  const k = 1 - Math.exp(-Math.max(0, dt) / VIEW.recenter);
  return { beta: base.beta + db * k, gamma: base.gamma + (gamma - base.gamma) * k };
}

/**
 * Zoom slide gong: 0 = bidikan biasa, 1 = dekat (kamera maju `close` bagian dari jaraknya ke gong). Zoom cubit,
 * Ctrl+roda, dan tombol +/− bebas di antaranya; dua tahap gulir hanya memakai kedua ujungnya.
 */
export const GONG_ZOOM = {
  close: 0.62,
  /** Ctrl+roda / cubit trackpad: perubahan zoom per px deltaY. */
  wheel: 0.006,
  /** Cubit: perubahan zoom per kelipatan e jarak jari. */
  pinch: 1.1,
  /** Tombol + / −. */
  key: 0.25,
  /** Penghalus zoom: tetapan waktu (detik). */
  ease: 0.28,
  /** Di atas ini dianggap sudah dekat: gulir maju berikutnya pindah slide, gulir mundur menjauh dulu. */
  near: 0.5,
} as const;

export const clampZoom = (z: number) => clamp(z, 0, 1);

/** Ctrl+roda atau cubit trackpad (deltaY negatif = jari merenggang = mendekat). */
export const zoomByWheel = (z: number, deltaY: number) => clampZoom(z - deltaY * GONG_ZOOM.wheel);

/** Cubit dua jari: zoom saat jari mulai menempel `start`, jarak jari sekarang ÷ jarak awal `ratio`. */
export const zoomByPinch = (start: number, ratio: number) => clampZoom(start + Math.log(Math.max(ratio, 1e-3)) * GONG_ZOOM.pinch);

/**
 * Dua tahap gulir di slide gong: `dir` 1 = maju, −1 = mundur. Mengembalikan zoom baru bila langkah ini dipakai
 * untuk mendekat atau menjauh (slide tidak berpindah), atau null bila langkah diteruskan menjadi pindah slide.
 */
export function gongStep(zoom: number, dir: 1 | -1): number | null {
  if (dir > 0 && zoom < GONG_ZOOM.near) return 1;
  if (dir < 0 && zoom >= GONG_ZOOM.near) return 0;
  return null;
}
