"use client";
import { type CSSProperties, type ElementType, useEffect, useState } from "react";
import { expoOut, MOTION, prefersReducedMotion } from "@/engine/motion/tokens";

/**
 * Reveal teks yang lahir dari dunia lakon (bukan blur-naik/flip pasaran):
 * Bayang (wayang kulit), Canting (batik), Gamelan (irama tabuhan + riak gong), Benang (benang emas), Gunungan (sapuan kayon).
 * Semua menjaga textContent sama persis dengan teks aslinya (pembaca layar, terjemahan, tes).
 * Semua hanya menganimasikan opacity & transform: efek mahal (blur, garis canting, bayangan) digambar sekali
 * di lapisan sendiri, lalu lapisannya yang digerakkan, sehingga mulus di HP.
 */
type Var = CSSProperties & Record<`--${string}`, string | number>;
const ms = (n: number) => `${Math.round(n)}ms`;
const chars = (text: string) => Array.from(text);
const charClass = (c: string) => (c === " " ? "k-char k-space" : "k-char");
const isGap = (w: string) => !w || /^\s+$/.test(w);

/** Jadwal canting per kata: kata berikutnya mulai saat kata sebelumnya 85% tergambar. */
function cantingTimeline(text: string, delay: number) {
  let t = delay;
  return text.split(/(\s+)/).map((w) => {
    if (isGap(w)) return { w, t: 0, dur: 0 };
    const dur = MOTION.canting.base + Array.from(w).length * MOTION.canting.perChar;
    const item = { w, t, dur };
    t += dur * 0.85;
    return item;
  });
}

/** Jadwal tabuhan per kata: ketukan rata, jeda sebelum aksen tiap empat ketuk, kata terakhir menunggu gong. */
function gamelanTimeline(text: string) {
  const parts = text.split(/(\s+)/);
  const words = parts.filter((w) => !isGap(w)).length;
  let k = 0;
  return parts.map((w) => {
    if (isGap(w)) return { w, t: 0, accent: false, last: false };
    const last = k === words - 1;
    const t = k * MOTION.gamelan.beat + Math.floor((k + 1) / 4) * MOTION.gamelan.hold + (last ? MOTION.gamelan.gongWait : 0);
    const item = { w, t, accent: k % 4 === 3 || last, last };
    k++;
    return item;
  });
}

/**
 * Bayang: huruf lahir sebagai bayangan wayang di kelir (hitam, besar, kabur, berkedip oleh blencong),
 * menajam saat "didekatkan dalang", lalu dibalik ke sisi bercatnya. Urutan dari tengah ke luar.
 * Ringan: bayangan jauh (kabur) & dekat (tajam) adalah pseudo-elemen yang digambar sekali; yang dianimasikan
 * hanya opacity & transform (dikerjakan GPU, tanpa menggambar ulang per frame).
 */
export function Bayang({ text, delay = 0, className }: { text: string; delay?: number; className?: string }) {
  const cs = chars(text);
  const mid = (cs.length - 1) / 2;
  return (
    <span className={`k-bayang${className ? ` ${className}` : ""}`} style={{ "--d": ms(delay) } as Var}>
      {cs.map((ch, i) => (
        <span key={i} className={charClass(ch)} data-ch={ch} style={{ "--o": Math.round(Math.abs(i - mid)), "--i": i } as Var}>
          <span className="k-lit">{ch}</span>
        </span>
      ))}
    </span>
  );
}

/**
 * Canting: kata demi kata digambar garis emas oleh ujung canting yang menyala, lalu warnanya meresap naik
 * seperti pewarna di kain mori. `tone="gold"` untuk nama tamu.
 */
export function Canting({ text, delay = 0, tone = "mori", className }: { text: string; delay?: number; tone?: "mori" | "gold"; className?: string }) {
  return (
    <span className={`k-canting k-canting--${tone}${className ? ` ${className}` : ""}`}>
      {cantingTimeline(text, delay).map(({ w, t, dur }, i) =>
        isGap(w) ? (
          w
        ) : (
          <span key={i} className="k-cword" style={{ "--t": ms(t), "--cd": ms(dur) } as Var}>
            <span className="k-fw">
              <span className="k-fill">{w}</span>
            </span>
            <span className="k-ow" data-w={w} aria-hidden="true" />
          </span>
        ),
      )}
    </span>
  );
}

/**
 * Gamelan: kata "dipukul" masuk mengikuti irama tabuhan (ketukan tidak rata, aksen tiap empat ketuk),
 * dan kata terakhir ditutup riak gong, seperti gong yang menutup satu gongan.
 */
export function Gamelan({ text, delay = 0, as: Tag = "span", className }: { text: string; delay?: number; as?: ElementType; className?: string }) {
  return (
    <Tag className={`k-gamelan${className ? ` ${className}` : ""}`} style={{ "--d": ms(delay) } as Var}>
      {gamelanTimeline(text).map(({ w, t, accent, last }, i) =>
        isGap(w) ? (
          w
        ) : (
          <span key={i} className="k-gw" data-accent={accent ? "" : undefined} data-gong={last ? "" : undefined} style={{ "--t": ms(t) } as Var}>
            {w}
          </span>
        ),
      )}
    </Tag>
  );
}

/** Benang emas: benang terjahit di bawah teks, tiap huruf ditarik naik saat benang melewatinya. */
export function Benang({ text, delay = 0, className }: { text: string; delay?: number; className?: string }) {
  const cs = chars(text);
  return (
    <span
      className={`k-benang${className ? ` ${className}` : ""}`}
      style={{ "--d": ms(delay), "--sp": ms(MOTION.benang.perChar), "--sd": ms(cs.length * MOTION.benang.perChar + 220) } as Var}
    >
      {cs.map((ch, i) => (
        <span key={i} className={charClass(ch)} style={{ "--i": i } as Var}>
          {ch}
        </span>
      ))}
    </span>
  );
}

/** Gunungan: siluet kayon menyapu dari kiri ke kanan dan membuka judul di belakangnya (token wipe.gunungan). */
export function Gunungan({ text, delay = 0, as: Tag = "span", className }: { text: string; delay?: number; as?: ElementType; className?: string }) {
  return (
    <Tag className={`k-gunungan${className ? ` ${className}` : ""}`} style={{ "--d": ms(delay) } as Var}>
      <span className="k-gwin">
        <span className="k-gtext">{text}</span>
      </span>
      <span className="k-ktrack" aria-hidden="true">
        <svg className="k-kayon" viewBox="0 0 60 100" focusable="false">
          <path d="M30 2C36 14 50 26 54 44C58 62 50 78 40 84V93L47 98H13L20 93V84C10 78 2 62 6 44C10 26 24 14 30 2Z" />
          <path className="k-kayon-tree" d="M30 18V84M30 36C25 42 19 42 14 48M30 36C35 42 41 42 46 48M30 54C25 60 18 60 13 66M30 54C35 60 42 60 47 66M24 84H36V93H24Z" />
        </svg>
      </span>
    </Tag>
  );
}

/** Angka bergulir naik ke nilainya (num.odometer, versi hitung naik). */
export function CountUp({ value, delay = 0 }: { value: number; delay?: number }) {
  const [n, setN] = useState(() => (prefersReducedMotion() ? value : 0));
  useEffect(() => {
    if (prefersReducedMotion() || value <= 0) return;
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (t: number) => {
      const k = Math.max(0, Math.min(1, (t - t0) / MOTION.count.dur));
      setN(Math.round(expoOut(k) * value));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, delay]);
  return <span className="k-num">{n}</span>;
}
