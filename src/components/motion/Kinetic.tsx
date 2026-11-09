"use client";
import { type CSSProperties, type ElementType, useEffect, useState } from "react";
import { expoOut, MOTION, prefersReducedMotion, randomGlyph } from "@/engine/motion/tokens";

type Var = CSSProperties & Record<`--${string}`, string | number>;

/**
 * Huruf membalik 3D satu per satu + kilau emas (text.flip3d + text.shine).
 * Pembaca layar dan tes membaca teks utuh (textContent sama persis dengan `text`).
 */
export function FlipText({ text, delay = 0, shine = false, className }: { text: string; delay?: number; shine?: boolean; className?: string }) {
  return (
    <span className={`k-flip${shine ? " k-shine" : ""}${className ? ` ${className}` : ""}`} style={{ "--d": `${delay}ms` } as Var}>
      {Array.from(text).map((ch, i) => (
        <span key={i} className="k-char" style={{ "--i": i } as Var}>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

/** Kata demi kata: "rise" = naik dari blur (text.blurRise), "curtain" = naik dari balik tirai (text.curtain). */
export function Words({ text, mode = "rise", delay = 0, as: Tag = "span", className }: { text: string; mode?: "rise" | "curtain"; delay?: number; as?: ElementType; className?: string }) {
  const words = text.split(/(\s+)/);
  let n = 0;
  return (
    <Tag className={`k-words k-words--${mode}${className ? ` ${className}` : ""}`} style={{ "--d": `${delay}ms` } as Var}>
      {words.map((w, i) =>
        /^\s+$/.test(w) ? (
          w
        ) : (
          <span key={i} className="k-word">
            <span className="k-word-in" style={{ "--i": n++ } as Var}>
              {w}
            </span>
          </span>
        ),
      )}
    </Tag>
  );
}

/** Huruf diacak lalu terkunci satu per satu (text.scramble). Teks akhir selalu sama dengan `text`. */
export function Scramble({ text, delay = 0, className }: { text: string; delay?: number; className?: string }) {
  const [shown, setShown] = useState(text);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const chars = Array.from(text);
    let locked = 0, timer: ReturnType<typeof setInterval> | undefined, nextLock = 0;
    const start = setTimeout(() => {
      timer = setInterval(() => {
        const t = performance.now();
        if (t >= nextLock) {
          locked++;
          nextLock = t + MOTION.scramble.lockMin + Math.random() * (MOTION.scramble.lockMax - MOTION.scramble.lockMin);
        }
        if (locked >= chars.length) {
          clearInterval(timer);
          setShown(text);
          return;
        }
        setShown(chars.map((c, i) => (i < locked || c === " " ? c : randomGlyph())).join(""));
      }, MOTION.scramble.tick);
    }, delay);
    return () => {
      clearTimeout(start);
      if (timer) clearInterval(timer);
    };
  }, [text, delay]);
  return (
    <span className={className} aria-label={text}>
      <span aria-hidden="true">{shown}</span>
    </span>
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
