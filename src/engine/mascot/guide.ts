/**
 * Clawd sebagai pemandu di film 3D (M3, arahan host 15 Nov: "peranmu sebagai pemandu, memberi tahu fitur fitur 3D
 * sambil mengampiri objek 3D nya, menyapa client, menjelaskan alur"; 16 Nov: teks petunjuk lama dihapus dan diganti
 * ucapan Clawd). Murni (tanpa DOM, tanpa three):
 *  - petunjuk mana yang berlaku di tempat tamu sekarang (`tipAt`);
 *  - di mana Clawd berdiri (`spotAt`): di samping layar, atau menghampiri gong/gunungan yang sedang dijelaskan;
 *  - petunjuk mana yang sudah pernah tuntas diucapkan di perangkat ini (`Guide`, disimpan di localStorage), supaya
 *    tamu yang membuka film lagi tidak diceramahi ulang.
 */
import type { SlideKind } from "@/engine/slides/build-slides";
import type { TipId } from "./lines";

export type GuideContext = Readonly<{
  kind: SlideKind | undefined;
  /** Judul hari/hero: huruf sudah tersedot dan gong sudah ditabuh. */
  beat: boolean;
  /** Fase gunungan pembuka/penutup (`off`, `wait`, `head`, `tail`). */
  gate: string;
  /** Sedang berpindah slide. */
  moving: boolean;
  /** Sheet detail terbuka. */
  sheet: boolean;
}>;

/** Petunjuk yang berlaku di tempat ini, atau null. */
export function tipAt(c: GuideContext): TipId | null {
  if (c.sheet) return null;
  if (c.gate === "head") return "kayon";
  if (c.gate === "tail") return "credits";
  if (c.moving) return null;
  switch (c.kind) {
    case "hero":
    case "title":
      return c.beat ? "zoom" : "beat";
    case "panel":
      return "gallery";
    case "phrases":
      return "phrases";
    case "gong":
      return "gong";
    case "credits":
      return "credits";
    default:
      return null;
  }
}

/** Petunjuk `tip` masih berlaku di sini (selama perpindahan dianggap masih berlaku, kecuali gunungan dicabut). */
export function stillApplies(tip: TipId, c: GuideContext): boolean {
  if (c.sheet) return false;
  if (tip === "kayon") return c.gate === "head";
  if (c.moving) return tip === "gallery" || tip === "credits";
  return tipAt(c) === tip;
}

/** Tempat Clawd di layar: dekat gunungan, dekat gong, atau di samping. */
export type Spot = "side" | "gong" | "kayon";

export function spotAt(c: GuideContext, speaking: TipId | null): Spot {
  if (c.gate === "head" || c.gate === "tail") return "kayon";
  if (c.moving) return "side";
  if (c.kind === "gong") return "gong";
  if ((c.kind === "hero" || c.kind === "title") && (speaking === "beat" || speaking === "zoom")) return "gong";
  return "side";
}

// ---- yang sudah dilihat di perangkat ini ----
export const GUIDE_KEY = "lakon.clawd";
export type Seen = { intro: boolean; tips: TipId[] };
const EMPTY: Seen = { intro: false, tips: [] };
const TIP_IDS: readonly TipId[] = ["kayon", "beat", "zoom", "gallery", "phrases", "gong", "credits"];

export function readSeen(store: Pick<Storage, "getItem"> | undefined): Seen {
  try {
    const raw = store?.getItem(GUIDE_KEY);
    if (!raw) return { ...EMPTY, tips: [] };
    const v = JSON.parse(raw) as Partial<Seen>;
    return { intro: v.intro === true, tips: Array.isArray(v.tips) ? v.tips.filter((t): t is TipId => TIP_IDS.includes(t as TipId)) : [] };
  } catch {
    return { ...EMPTY, tips: [] };
  }
}

export function writeSeen(seen: Seen, store: Pick<Storage, "setItem"> | undefined) {
  try {
    store?.setItem(GUIDE_KEY, JSON.stringify(seen));
  } catch {
    /* tidak diingat, tetap jalan */
  }
}

export class Guide {
  readonly seen: Seen;
  constructor(seen: Seen) {
    this.seen = { intro: seen.intro, tips: [...seen.tips] };
  }

  /** Petunjuk baru yang perlu diucapkan di tempat ini (belum pernah tuntas), atau null. */
  due(c: GuideContext): TipId | null {
    const tip = tipAt(c);
    return tip && !this.seen.tips.includes(tip) ? tip : null;
  }

  /** Petunjuk sudah tuntas diucapkan (kalimat terakhirnya lengkap). Mengembalikan true bila baru. */
  done(tip: TipId): boolean {
    if (this.seen.tips.includes(tip)) return false;
    this.seen.tips.push(tip);
    return true;
  }

  introDone(): boolean {
    if (this.seen.intro) return false;
    this.seen.intro = true;
    return true;
  }
}
