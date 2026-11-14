"use client";
/**
 * Latar Today 2,5D (permintaan host 14 Nov: "buat 2,5D sekalian, sekaligus fitur yang gw mau seperti di handoff.md").
 * Tetap ringan dan tanpa WebGL (Today dipakai di jalan dan harus bisa offline): beberapa bidang DOM di kedalaman
 * masing-masing, yang digeser hanya lewat transform.
 *
 * Dari belakang ke depan: langit malam berbintang dengan pendar cakrawala yang warnanya mengikuti jam (subuh, siang,
 * senja, malam), punggung Lawu, perbukitan, debu emas. Aturan gerak pandang (13 Nov) dipenuhi di `today.css`:
 * - kamera parallax: --lx/--ly dari kursor atau kemiringan HP (`look.ts`) menggeser tiap bidang sejauh kedalamannya;
 * - perspective shift: kartu di atas latar memutar sedikit mengikuti arah pandang;
 * - kedalaman ikut gulir: bidang latar turun dan mendekat saat halaman digulir, kartu datang dari kedalaman saat masuk
 *   layar (scroll-driven animation, tanpa JavaScript per gulir).
 */
import type { CSSProperties } from "react";

type Var = CSSProperties & Record<`--${string}`, string | number>;

/** Punggung Lawu (puncak sedikit ke kanan) dan perbukitan di depannya; viewBox 0 0 1600 300, alas di bawah. */
const RIDGE_FAR = "M0 300V214C140 206 262 186 392 160C512 136 610 98 706 62C770 38 828 24 888 22C946 26 1002 44 1060 70C1160 112 1258 150 1370 172C1462 190 1540 200 1600 206V300Z";
const RIDGE_NEAR = "M0 300V238C130 212 268 250 430 230C600 210 712 178 880 202C1060 228 1190 186 1370 200C1470 208 1540 226 1600 220V300Z";
/** Garis punggung saja (tanpa alas): disinari tipis dari belakang supaya siluetnya terbaca di langit malam. */
const crest = (d: string) => d.replace(/^M0 300V/, "M0 ").replace(/V300Z$/, "");

/** Debu emas: [kiri %, atas %, ukuran px, lama dtk, tunda dtk]. Tetap, supaya server dan klien sama. */
const DUST: readonly [number, number, number, number, number][] = [
  [9, 30, 3, 14, 0],
  [21, 62, 2, 18, 5],
  [33, 18, 2, 16, 9],
  [46, 74, 3, 19, 3],
  [57, 40, 2, 15, 7],
  [69, 66, 2, 17, 11],
  [81, 24, 3, 18, 4],
  [92, 54, 2, 16, 1],
];

export type SkyPhase = "dawn" | "day" | "dusk" | "night";

/** Fase langit dari jam WIB "HH:MM": subuh 04.00–06.30, siang sampai 15.00, senja sampai 18.30, lalu malam. */
export function skyPhase(clock: string): SkyPhase {
  const [h = 0, m = 0] = clock.split(":").map(Number);
  const t = h + m / 60;
  if (t >= 4 && t < 6.5) return "dawn";
  if (t >= 6.5 && t < 15) return "day";
  if (t >= 15 && t < 18.5) return "dusk";
  return "night";
}

export function TodayScene({ sky }: { sky: SkyPhase }) {
  return (
    <div className="tds" data-sky={sky} aria-hidden="true">
      {/* langit, pendar cakrawala, bintang: diam, digambar sekali di satu lapisan */}
      <div className="tds-sky" />
      <div className="tds-l tds-ridge" data-depth="far">
        <svg viewBox="0 0 1600 300" preserveAspectRatio="none" focusable="false">
          <defs>
            <linearGradient id="tds-ridge-far" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0a0d28" />
              <stop offset="0.55" stopColor="#0f1436" />
              <stop offset="1" stopColor="#1c2150" />
            </linearGradient>
          </defs>
          <path d={RIDGE_FAR} />
          <path className="tds-crest" d={crest(RIDGE_FAR)} />
        </svg>
      </div>
      <div className="tds-l tds-ridge" data-depth="near">
        <svg viewBox="0 0 1600 300" preserveAspectRatio="none" focusable="false">
          <path d={RIDGE_NEAR} />
          <path className="tds-crest" d={crest(RIDGE_NEAR)} />
        </svg>
      </div>
      <div className="tds-l tds-dust">
        {DUST.map(([x, y, size, dur, delay]) => (
          <i key={`${x}-${y}`} style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, "--dur": `${dur}s`, "--delay": `${-delay}s` } as Var} />
        ))}
      </div>
    </div>
  );
}
