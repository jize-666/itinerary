import { useEffect, useMemo, useRef } from "react";
import { kawungUkel, type Motif, riverCenter } from "@/engine/canting/motif";
import type { Film, Slide } from "@/engine/slides/build-slides";
import { batikTravel, CLOTH, processAt } from "@/engine/stage/batik";
import type { Cursor } from "@/engine/stage/cue";

/**
 * Hari 3 di film 2,5D (Calm, atau tanpa panggung 3D; Tugas 11.3): kain mori yang sama dengan dunia batik 3D, digambar
 * SVG. Proses mengikuti letak di hari itu (`processAt`): sungai dan lampion tergores di pita bawah (garis tepi ikut
 * `stroke-dashoffset`), kawung krem terbuka dari medalion, lalu kain menggelap nila dan soga. Lapisan ikut gerak
 * pandang (`--lx`/`--ly`: parallax dan perspective shift) dan mendekat selama geseran (kedalaman ikut gulir).
 */

/** Pecahan torehan untuk sungai di 2,5D (3D memakai `trace.phases.river` ≈ 0,095). */
const RIVER_SHARE = 0.1;
/** Lampion di sungai 2,5D (3D: satu per tempat singgah film). */
const LANTERNS = 29;
/** Koordinat SVG: satu satuan tinggi kain = 1000. */
const U = 1000;
const W = CLOTH.aspect * U;

type Paths = { lines: string[]; widths: number[]; dots: [number, number, number][]; banks: string[]; lanterns: [number, number][] };

function paths(m: Motif): Paths {
  const out: Paths = { lines: [], widths: [], dots: [], banks: [], lanterns: [] };
  const pt = (p: readonly [number, number]) => `${(p[0] * U).toFixed(1)},${(p[1] * U).toFixed(1)}`;
  for (const s of m.strokes) {
    if (s.part === "river") continue;
    if (s.kind === "line") {
      out.lines.push(`M${s.pts.map(pt).join("L")}${s.closed ? "Z" : ""}`);
      out.widths.push(s.width * U);
    } else if (s.kind === "dot") out.dots.push([s.at[0] * U, s.at[1] * U, s.r * U]);
  }
  // sungai: dua tepi (dari garis tengah yang sama dengan motif 3D) dan lampion berjarak sama
  const N = 160;
  const xs = Array.from({ length: N + 1 }, (_, i) => 0.05 + ((CLOTH.aspect - 0.1) * i) / N);
  for (const off of [-0.011, 0.011]) out.banks.push(`M${xs.map((x) => `${(x * U).toFixed(1)},${((riverCenter(x, CLOTH.aspect) + off) * U).toFixed(1)}`).join("L")}`);
  for (let i = 0; i < LANTERNS; i++) {
    const x = 0.05 + ((CLOTH.aspect - 0.1) * (i + 0.5)) / LANTERNS;
    out.lanterns.push([x * U, riverCenter(x, CLOTH.aspect) * U]);
  }
  return out;
}

type Props = { film: Film; slide: Slide; probe: () => Cursor; moving: boolean; calm: boolean };
export function BatikLayers({ film, slide, probe, moving, calm }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reveal = useRef<SVGCircleElement>(null);
  const shore = useRef<SVGRectElement>(null);
  // motif bersungai yang sama dengan 3D (pinggiran bawah = sungai); sungainya digambar terpisah supaya bisa tergores
  const motif = useMemo(() => kawungUkel({ aspect: CLOTH.aspect, river: { lanterns: LANTERNS } }), []);
  const art = useMemo(() => paths(motif), [motif]);
  const medallion = motif.center;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let id = 0;
    const sample = () => {
      const t = batikTravel(film, probe());
      if (t) {
        const s = processAt(t.q, t.of, RIVER_SHARE);
        const river = Math.min(1, s.draw / RIVER_SHARE);
        const motif = Math.max(0, (s.draw - RIVER_SHARE) / (1 - RIVER_SHARE));
        el.style.setProperty("--bt-river", river.toFixed(4));
        el.style.setProperty("--bt-nila", s.nila.toFixed(4));
        el.style.setProperty("--bt-soga", s.soga.toFixed(4));
        el.style.setProperty("--bt-depth", String(calm ? 0 : t.depth));
        // kawung terbuka melingkar dari medalion; lampion menyala dari kiri ke kanan mengikuti torehan sungai
        reveal.current?.setAttribute("r", String(Math.round(motif * 1.05 * W)));
        shore.current?.setAttribute("width", String(Math.round(river * W)));
        el.dataset.draw = s.draw.toFixed(2);
      }
      if (moving && !calm) id = requestAnimationFrame(sample);
    };
    sample();
    return () => cancelAnimationFrame(id);
  }, [film, slide, probe, moving, calm]);
  return (
    <div className="batik-layers" ref={ref} aria-hidden="true">
      <div className="bt-wall" />
      <svg className="bt-cloth" viewBox={`0 0 ${W} ${U}`} preserveAspectRatio="xMidYMax slice">
        <defs>
          <clipPath id="bt-reveal">
            <circle ref={reveal} cx={medallion[0] * U} cy={medallion[1] * U} r="0" />
          </clipPath>
          <clipPath id="bt-shore">
            <rect ref={shore} x="0" y="0" width="0" height={U} />
          </clipPath>
        </defs>
        <rect className="bt-mori" width={W} height={U} />
        <rect className="bt-nila" width={W} height={U} />
        <rect className="bt-soga" width={W} height={U} />
        <g className="bt-wax" clipPath="url(#bt-reveal)">
          {art.lines.map((d, i) => (
            <path key={i} d={d} strokeWidth={art.widths[i]} />
          ))}
          {art.dots.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} />
          ))}
        </g>
        <g className="bt-river">
          {art.banks.map((d) => (
            <path key={d} d={d} pathLength={1} />
          ))}
        </g>
        <g className="bt-lanterns" clipPath="url(#bt-shore)">
          {art.lanterns.map(([x, y]) => (
            <g key={x}>
              <circle cx={x} cy={y} r="6.8" fill="none" strokeWidth="2.6" />
              <circle cx={x} cy={y} r="3.2" />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
