import { useEffect } from "react";
import { linkBatikSound } from "@/components/canting/sound-link";
import { filmLevels } from "@/engine/canting/sound";
import type { BatikState } from "@/engine/canting/state";
import type { Film } from "@/engine/slides/build-slides";
import { batikTravel, gongCloth, processAt } from "@/engine/stage/batik";
import type { Cursor } from "@/engine/stage/cue";

/** Pecahan torehan untuk sungai (sama dengan film 2,5D; 3D ±0,095, tidak terdengar bedanya). */
const RIVER_SHARE = 0.1;

/**
 * Suara Hari 3 di film (Tugas 11.4), untuk panggung 3D dan film 2,5D: mengikuti gulir, jadi hanya berbunyi selama
 * kain berubah. Torehan sungai dan kawung = desis malam, nila dan soga = gemericik celupan, lorod menjelang gong
 * terakhir = gelembung air mendidih. Diam = hening; mundur = suara yang sama sedikit lebih pelan. Ikut sakelar suara.
 */
export function BatikSound({ film, probe }: { film: Film; probe: () => Cursor }) {
  useEffect(() => {
    const link = linkBatikSound();
    let raf = 0;
    let prev: BatikState | null = null;
    let last = performance.now();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      const voices = link.get();
      if (!voices) {
        prev = null;
        return;
      }
      const c = probe();
      const t = batikTravel(film, c);
      const g = gongCloth(film, c);
      // di luar dunia batik (judul hari, gong terakhir) proses torehan dan celup tidak berubah
      const base = t ? processAt(t.q, t.of, RIVER_SHARE) : prev;
      const next: BatikState | null = base ? { ...base, lorod: g.lorod } : null;
      if (prev && next) voices.set(filmLevels(prev, next, Math.min(0.1, dt)));
      prev = next ?? (g.show > 0 ? { draw: 1, nila: 1, kerok: 1, soga: 1, lorod: g.lorod } : null);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      link.dispose();
    };
  }, [film, probe]);
  return null;
}
