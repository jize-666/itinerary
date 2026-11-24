/**
 * Urutan tahap membatik di /canting/ (Tugas 11.2). Murni: keadaan + aksi + waktu (ms) → keadaan baru.
 *
 * Mengikuti batik sogan Solo yang disederhanakan: malam (nglowong, ngisen-iseni, nembok) → celup nila (medel) →
 * kerok (malam tembok dikerok, otomatis sesudah nila) → biru (malam baru = mbironi, menahan soga) → celup soga
 * (nyoga) → lorod (nglorod) → jadi (simpan). Nila boleh dilewati (langsung soga). Lorod hanya bila sudah ada malam
 * dan kain sudah dicelup; simpan hanya sesudah lorod.
 */
import type { Tool } from "./motif";
import type { WaxLayer } from "./strokes";

/** `malam` = menggambar, `biru` = sesudah nila (menggambar mbironi), `coklat` = sesudah soga, `jadi` = sesudah lorod. */
export type Stage = "malam" | "biru" | "coklat" | "jadi";
export type Anim = "nila" | "kerok" | "soga" | "lorod";
export type Action = "draw" | "nila" | "soga" | "lorod" | "save" | "restart";

export type Amounts = { nila: number; kerok: number; soga: number; lorod: number };

export type Process = Readonly<{
  stage: Stage;
  amounts: Readonly<Amounts>;
  /** Animasi yang sedang berjalan (null = diam, boleh berinteraksi). */
  busy: Anim | null;
  /** Mulai animasi (ms) dan lamanya. */
  since: number;
  dur: number;
  /** Calm: tahap berpindah dengan pudar singkat. */
  calm: boolean;
}>;

/** Lama animasi tiap tahap (ms). Lorod paling lama: puncaknya, diberi waktu dan cahaya. */
export const DURATION = { nila: 4600, kerok: 2200, soga: 4600, lorod: 6500, calm: 900 } as const;

export function createProcess(): Process {
  return { stage: "malam", amounts: { nila: 0, kerok: 0, soga: 0, lorod: 0 }, busy: null, since: 0, dur: 0, calm: false };
}

/** Boleh melakukan `action` sekarang? `hasWax` = sudah ada malam di kain. */
export function allowed(p: Process, action: Action, hasWax: boolean): boolean {
  if (action === "restart") return true;
  if (p.busy) return false;
  switch (action) {
    case "draw":
      return p.stage === "malam" || p.stage === "biru";
    case "nila":
      return p.stage === "malam" && hasWax;
    case "soga":
      return (p.stage === "malam" || p.stage === "biru") && hasWax;
    case "lorod":
      return (p.stage === "biru" || p.stage === "coklat") && hasWax;
    case "save":
      return p.stage === "jadi";
  }
}

const durFor = (anim: Anim, calm: boolean) => (calm ? DURATION.calm : DURATION[anim]);

/** Mulai aksi. Aksi yang tidak boleh mengembalikan keadaan yang sama persis. */
export function start(p: Process, action: Action, now: number, calm = p.calm): Process {
  if (action === "restart") return createProcess();
  if (action === "draw" || action === "save" || !allowed(p, action, true)) return p;
  return { ...p, busy: action, since: now, dur: durFor(action, calm), calm };
}

/** Kemajuan animasi 0–1 (pelan di awal dan akhir). */
const ease = (k: number) => k * k * (3 - 2 * k);

/** Majukan waktu: perbarui kadar dan pindah tahap saat animasi selesai. */
export function advance(p0: Process, now: number): Process {
  let p = p0;
  // satu panggilan bisa melewati lebih dari satu animasi (nila lalu kerok) bila waktunya sudah lewat
  for (let guard = 0; guard < 4 && p.busy; guard++) {
    const k = Math.min(1, Math.max(0, (now - p.since) / Math.max(1, p.dur)));
    const amounts = { ...p.amounts, [p.busy]: ease(k) };
    if (k < 1) return { ...p, amounts };
    const end = p.since + p.dur;
    switch (p.busy) {
      case "nila":
        p = { ...p, amounts, busy: "kerok", since: end, dur: durFor("kerok", p.calm) };
        break;
      case "kerok":
        p = { ...p, amounts, busy: null, stage: "biru" };
        break;
      case "soga":
        p = { ...p, amounts, busy: null, stage: "coklat" };
        break;
      case "lorod":
        p = { ...p, amounts, busy: null, stage: "jadi" };
        break;
    }
  }
  return p;
}

/** Lapisan malam untuk alat pada tahap ini: sesudah nila semua malam baru adalah mbironi (menahan soga). */
export function layerFor(p: Process, tool: Tool): WaxLayer {
  if (p.stage === "biru") return 2;
  return tool === "tembok" ? 1 : 0;
}
