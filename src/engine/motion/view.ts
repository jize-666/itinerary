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

/**
 * Depth of field di gallery (Tugas 7b, permintaan host 14 Nov: "ketika di slide ke kiri/kanan kamera berpindah
 * seperti fitur 3D … Depth of field …"). Kabur menurut jarak dari bidang fokus, dihitung dari kedalaman lanskap
 * (rantai post, hanya tier High). Saat diam fokus berada dekat, di bidang kartu: lanskap di belakangnya lembut dan
 * kartunya menonjol. Saat digeser, fokus ditarik jauh ke lanskap mengikuti kemajuan gulir (di HP mengikuti jari),
 * jadi lapisan tanah dekat, desa, dan Lawu tampak jelas bergerak dengan kecepatan berbeda; begitu kartu tiba fokus
 * kembali. Nol di kedua ujung perpindahan, jadi tidak ada lompatan.
 */
export const DOF = {
  /** Jarak fokus saat diam (m): sedikit di depan tanah terdekat yang tampak, jadi seluruh lanskap lembut. */
  rest: 12,
  /** Jarak fokus di tengah geseran (m): dataran dan desa tajam, tanah dekat dan Lawu sedikit lembut. */
  pull: 90,
  /** Besar lingkar kabur: kabur = aperture × |1 − fokus / jarak|, dibatasi 0–1 (1 = kabur penuh). */
  aperture: 0.62,
} as const;

/** Jarak fokus pada kemajuan perpindahan `p` (0–1) di dalam gallery; di luar perpindahan `DOF.rest`. */
export const dofFocus = (p: number, moving: boolean): number => {
  if (!moving) return DOF.rest;
  const k = Math.sin(Math.PI * clamp(p, 0, 1));
  // jarak ditempuh dalam skala log: tarikan fokus terasa merata dari dekat ke jauh
  return DOF.rest * Math.pow(DOF.pull / DOF.rest, k);
};

/** Kadar kabur (0–1) titik sejauh `d` m pada fokus `focus` m. */
export const dofBlur = (d: number, focus: number): number => clamp(DOF.aperture * Math.abs(1 - focus / Math.max(d, 0.01)), 0, 1);

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
 * Kamera mengitari gong (permintaan host 14 Nov, "dua dua nya, 90derajat"): di slide judul hari, hero prolog, dan
 * gong penutup, seret mouse, geser jari, atau geser dua jari trackpad ke kiri/kanan memutar kamera mengelilingi gong
 * sampai ±90° (sampai ke samping gong). Seperti meja putar: seret ke kanan = gong berpaling ke kanan (kamera ke kiri).
 * Saat dilepas kamera kembali pelan ke depan.
 */
export const ORBIT = {
  /** Batas putaran (derajat) ke kiri dan ke kanan. */
  max: 90,
  /** Seret selebar layar = sekian derajat (jadi ±90° tercapai dengan seret 60% layar). */
  perScreen: 150,
  /** Penghalus selama diseret: tetapan waktu (detik). */
  follow: 0.08,
  /** Kembali ke depan sesudah dilepas: tetapan waktu (detik). */
  back: 0.7,
} as const;

/** Sudut kitar (derajat) sesudah diseret `dx` px pada layar selebar `width` px, mulai dari sudut `from`. */
export const orbitFromDrag = (from: number, dx: number, width: number): number => clamp(from - (dx / Math.max(1, width)) * ORBIT.perScreen, -ORBIT.max, ORBIT.max);

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
