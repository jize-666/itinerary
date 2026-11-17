"use client";
/**
 * Tahap gong di slide judul hari dan hero prolog (Tugas 7b, beat.ts). Saat penonton melangkah maju dari judul:
 * huruf judul terurai dan tersedot ke pencu gong bersama debu emas, tabuh berayun, dan gong berbunyi tepat ketika
 * huruf terakhir masuk. Kamera tetap di shot-nya (pukulan tanpa hentakan). Mundur: huruf keluar lagi dari gong ke
 * tempatnya, tanpa pukulan.
 *
 * Hanya transform dan opacity (tanpa reflow): letak huruf dan gong diukur sekali saat tahap berganti, lalu tiap
 * huruf dan butir debu menerima arah terbangnya sebagai variabel CSS. Film 2,5D (tanpa 3D) memakai cakram gong CSS
 * dan riaknya; di 3D gong ageng di panggung yang dipukul.
 */
import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { audioStatus } from "@/engine/audio/status";
import type { Beat } from "@/engine/slides/beat";
import type { Slide } from "@/engine/slides/build-slides";
import { stageBus } from "@/engine/stage/bus";
import { gongSpot, STRIKE } from "@/engine/stage/gong";
import { shotFor } from "@/engine/stage/shots";
import type { LayerPos } from "./Slides";

/**
 * Lama huruf tersedot sampai masuk ke gong (detik). Tabuh mulai berayun `SUCK − STRIKE.impact` detik sesudah
 * langkah, jadi hantamannya jatuh tepat saat huruf terakhir masuk.
 */
export const SUCK = 0.92;
/** Huruf yang paling jauh dari gong berangkat paling akhir, sejauh ini (detik). */
const SPREAD = 0.26;
/** Lama huruf kembali dari gong ke tempatnya (detik). */
export const UNSUCK = 0.74;
/** Butir debu emas paling banyak (dua per huruf untuk judul pendek). */
const DUST_MAX = 48;

/** Butir debu: letak awal dan akhir (px, relatif terhadap badan slide), lengkung, dan jedanya. */
type Mote = { x: number; y: number; dx: number; dy: number; mx: number; my: number; delay: number; size: number };
type Burst = { motes: Mote[]; gx: number; gy: number };

/** Angka semu yang stabil per huruf (tanpa Math.random, supaya pratinjau dan uji bisa diulang). */
const hash = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Pusat gong di layar (px klien). Di 3D: letak yang ditulis panggung tiap frame (`--gong-x/--gong-y`, sudah termasuk
 * zoom, kitar, dan parallax), atau dari shot kamera bila belum ada. Di film 2,5D: dari cakram CSS.
 */
function gongCenter(film: HTMLElement, body: HTMLElement, slide: Slide): { x: number; y: number } | null {
  const fr = film.getBoundingClientRect();
  if (!fr.width || !fr.height) return null;
  const [lx, ly] = [parseFloat(body.style.getPropertyValue("--gong-x")), parseFloat(body.style.getPropertyValue("--gong-y"))];
  if (film.dataset.stage !== undefined && Number.isFinite(lx) && Number.isFinite(ly)) return { x: fr.left + (lx / 100) * fr.width, y: fr.top + (ly / 100) * fr.height };
  if (film.dataset.stage !== undefined) {
    const aspect = fr.width / fr.height;
    const g = gongSpot(shotFor(slide, { aspect }), aspect);
    return { x: fr.left + (g.x / 100) * fr.width, y: fr.top + (g.y / 100) * fr.height };
  }
  const disc = body.querySelector<HTMLElement>(".fs-gong");
  const r = disc?.getBoundingClientRect();
  return r && r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: fr.left + fr.width / 2, y: fr.top + fr.height / 2 };
}

/**
 * Ukur huruf judul dan unit teks lain (kicker, nama tamu), beri tiap elemen arah terbangnya ke gong, dan siapkan
 * butir debu. Satu pembacaan tata letak; sesudahnya hanya variabel CSS yang ditulis.
 */
function aim(body: HTMLElement, slide: Slide): Burst | null {
  const film = body.closest<HTMLElement>(".film");
  if (!film) return null;
  const g = gongCenter(film, body, slide);
  if (!g) return null;
  const br = body.getBoundingClientRect();
  const chars = [...body.querySelectorAll<HTMLElement>(".fs-display .k-char")];
  const units = [...body.querySelectorAll<HTMLElement>(".fs-kicker, .fs-for")];
  const all = [...chars, ...units];
  const at = all.map((el) => {
    const r = el.getBoundingClientRect();
    return { el, x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height };
  });
  const far = Math.max(1, ...at.map((p) => Math.hypot(g.x - p.x, g.y - p.y)));
  at.forEach((p, i) => {
    const dx = g.x - p.x;
    const dy = g.y - p.y;
    const d = Math.hypot(dx, dy) / far;
    // yang dekat gong tersedot lebih dulu; semuanya tiba bersamaan di akhir SUCK
    const delay = SPREAD * d * (0.75 + 0.25 * hash(i, 1));
    const s = p.el.style;
    s.setProperty("--tx", `${dx.toFixed(1)}px`);
    s.setProperty("--ty", `${dy.toFixed(1)}px`);
    // ancang-ancang: menjauh sedikit dari gong dan naik, sebelum tersedot
    s.setProperty("--ax", `${(-dx * 0.05).toFixed(1)}px`);
    s.setProperty("--ay", `${(-dy * 0.05 - 0.12 * p.h).toFixed(1)}px`);
    s.setProperty("--tr", `${((hash(i, 2) - 0.5) * 140).toFixed(0)}deg`);
    s.setProperty("--sd", `${delay.toFixed(3)}s`);
    s.setProperty("--sl", `${(SUCK - delay).toFixed(3)}s`);
    s.setProperty("--ud", `${((1 - d) * 0.16).toFixed(3)}s`);
  });
  const motes: Mote[] = [];
  const pick = chars.length ? at.slice(0, chars.length) : at;
  const per = Math.max(1, Math.min(2, Math.floor(DUST_MAX / Math.max(1, pick.length))));
  pick.forEach((p, i) => {
    for (let k = 0; k < per && motes.length < DUST_MAX; k++) {
      const n = i * 2 + k;
      const x = p.x - br.left + (hash(n, 3) - 0.5) * p.h * 0.5;
      const y = p.y - br.top + (hash(n, 4) - 0.5) * p.h * 0.6;
      const dx = g.x - br.left - x;
      const dy = g.y - br.top - y;
      // lengkung: titik tengah digeser tegak lurus arah terbang (pusaran ke arah yang sama untuk semua butir)
      const bend = 0.22 + 0.18 * hash(n, 5);
      motes.push({
        x,
        y,
        dx,
        dy,
        mx: dx * 0.45 - dy * bend,
        my: dy * 0.45 + dx * bend - p.h * 0.3,
        delay: SPREAD * (Math.hypot(dx, dy) / far) * 0.8 + 0.05 * hash(n, 6),
        size: 2.5 + 3 * hash(n, 7),
      });
    }
  });
  return { motes, gx: g.x - br.left, gy: g.y - br.top };
}

/**
 * Debu emas dan pendar di pencu, dibuat langsung di DOM (hiasan murni, tanpa render React): satu wadah berisi
 * paling banyak `DUST_MAX` butir. Mengembalikan pelepasnya.
 */
function scatter(body: HTMLElement, b: Burst): () => void {
  const box = document.createElement("span");
  box.className = "fs-dust";
  box.setAttribute("aria-hidden", "true");
  const px = (v: number) => `${v.toFixed(1)}px`;
  const pull = document.createElement("i");
  pull.className = "fs-pull";
  pull.style.cssText = `--gx:${px(b.gx)};--gy:${px(b.gy)};--suck:${SUCK}s`;
  box.append(pull);
  for (const m of b.motes) {
    const i = document.createElement("i");
    i.className = "fs-mote";
    i.style.cssText =
      `--x:${px(m.x)};--y:${px(m.y)};--dx:${px(m.dx)};--dy:${px(m.dy)};--mx:${px(m.mx)};--my:${px(m.my)};` +
      `--md:${m.delay.toFixed(3)}s;--ml:${(SUCK - m.delay).toFixed(3)}s;--ms:${px(m.size)}`;
    box.append(i);
  }
  body.append(box);
  return () => box.remove();
}

/**
 * Tahap gong pada satu slide judul. Mengembalikan ref untuk badan slide dan nomor pukulan (untuk memulai ulang riak
 * cakram CSS).
 */
export function useTitleStrike(slide: Slide, pos: LayerPos | undefined, beat: Beat): { body: RefObject<HTMLDivElement | null>; strikes: number } {
  const body = useRef<HTMLDivElement>(null);
  const [strikes, setStrikes] = useState(0);
  const was = useRef<Beat>(0);

  // menuju slide ini: bunyi gong dan api naga disiapkan
  useEffect(() => {
    if (pos === "in" || pos === "cur") audioStatus.prepare("gong", "api-naga");
  }, [pos]);

  useLayoutEffect(() => {
    const el = body.current;
    const from = was.current;
    was.current = beat;
    if (!el) return;
    if (beat === 0) {
      // mundur di slide ini: huruf keluar lagi dari gong; tiba dari slide lain: langsung di tempatnya
      if (from === 1 && pos === "cur") el.dataset.out = "back";
      else delete el.dataset.out;
      return;
    }
    if (from === 1 || pos !== "cur") return;
    const b = aim(el, slide);
    el.dataset.out = "go";
    const unscatter = b ? scatter(el, b) : undefined;
    // tabuh mulai berayun supaya hantamannya jatuh saat huruf terakhir masuk ke gong; kamera tidak terhentak
    const swing = setTimeout(
      () => {
        const due = stageBus.strikeGong({ kick: false });
        if (due === "busy") return;
        if (due === "flat") audioStatus.scene("gong", STRIKE.impact);
        else {
          audioStatus.scene("gong", due);
          audioStatus.scene("api-naga", due + 0.08, 0.55);
        }
        setStrikes((n) => n + 1);
      },
      Math.max(0, (SUCK - STRIKE.impact) * 1000),
    );
    // debu dilepas sesudah semuanya masuk ke gong (atau begitu tahap berganti lagi)
    const clear = setTimeout(() => unscatter?.(), (SUCK + 1.2) * 1000);
    return () => {
      clearTimeout(swing);
      clearTimeout(clear);
      unscatter?.();
    };
  }, [beat, pos, slide]);

  return { body, strikes };
}
