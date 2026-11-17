/**
 * Partikel emosi Clawd di film 2,5D: ikon SVG kecil (hati, kilau, zzz, tanda marah, keringat, "!", "?", kepulan) yang
 * naik dan memudar di atas kepala lewat animasi CSS (`flat.css`). Jadwalnya sama dengan partikel film 3D
 * (`stage3d/emotes.ts`): sekumpulan saat suasana hati baru dimulai, lalu sesekali selama ia berlangsung.
 */
import type { Mood } from "@/engine/mascot/face";

type Kind = "heart" | "sparkle" | "z" | "anger" | "sweat" | "bang" | "ask" | "puff";

const ICON: Record<Kind, string> = {
  heart: `<path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6C19 16.5 12 21 12 21z" fill="#ff5c8a"/>`,
  sparkle: `<path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" fill="#ffe9a8"/>`,
  z: `<path d="M6 6h12v2.5L9.5 17H18v2.5H6V17l8.5-8.5H6z" fill="#dfe8ff"/>`,
  anger: `<path d="M4 9Q9 9 9 4M15 4q0 5 5 5M20 15q-5 0-5 5M9 20q0-5-5-5" stroke="#ff3b3b" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
  sweat: `<path d="M12 3C9 8 7 11 7 14a5 5 0 0 0 10 0c0-3-2-6-5-11z" fill="#8fd3ff"/>`,
  bang: `<path d="M10.5 3h3l-.5 12h-2zM10.5 17.5h3v3h-3z" fill="#ffd23f"/>`,
  ask: `<path d="M8.5 8.5a3.5 3.5 0 1 1 5 3.2c-1 .5-1.5 1.2-1.5 2.3v.5h-2.4v-.7c0-1.8.9-2.9 2.3-3.6a1.3 1.3 0 1 0-1-1.7z M10.6 17h2.4v2.6h-2.4z" fill="#9fd0ff"/>`,
  puff: `<path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A4 4 0 1 1 17 18z" fill="#e9e9ef" opacity=".9"/>`,
};

export function createFlatEmotes(parent: HTMLElement) {
  let lastMood: Mood | null = null;
  let nextAmbient = 0;
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const live = new Set<HTMLElement>();

  /** Satu ikon di atas kepala (`x`, `y` px), `size` = tinggi badan px. */
  const spawn = (kind: Kind, x: number, y: number, size: number, opts: { life?: number; pop?: boolean; dx?: number; scale?: number } = {}) => {
    if (live.size > 14) return;
    const el = document.createElement("i");
    el.className = "cf-emote";
    el.setAttribute("aria-hidden", "true");
    if (opts.pop) el.dataset.pop = "";
    const side = rand() < 0.5 ? -1 : 1;
    const s = (opts.scale ?? 1) * Math.max(0.6, size / 90);
    el.style.cssText = `--x:${(x + (opts.dx ?? side * (0.25 + 0.3 * rand())) * size).toFixed(1)}px;--y:${y.toFixed(1)}px;--dx:${(side * 18).toFixed(0)}px;--life:${opts.life ?? 1.6}s;width:${(28 * s).toFixed(0)}px;height:${(28 * s).toFixed(0)}px`;
    el.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%">${ICON[kind]}</svg>`;
    parent.appendChild(el);
    live.add(el);
    el.addEventListener("animationend", () => {
      el.remove();
      live.delete(el);
    });
  };

  return {
    /** Perbarui pada jam `t` (dtk); `x`, `y` = puncak kepala di layar (px). */
    update(t: number, mood: Mood, x: number, y: number, size: number, reduced: boolean) {
      if (reduced) {
        lastMood = mood;
        return;
      }
      if (mood !== lastMood) {
        lastMood = mood;
        nextAmbient = t + 0.6;
        if (mood === "happy") for (let i = 0; i < 3; i++) spawn(i % 2 ? "sparkle" : "heart", x, y, size, { scale: 0.8 + 0.15 * i });
        if (mood === "love") for (let i = 0; i < 4; i++) spawn("heart", x, y, size, { life: 2, scale: 0.7 + 0.15 * i });
        if (mood === "angry") {
          spawn("anger", x, y, size, { dx: 0.45, life: 5.5, pop: true, scale: 1.1 });
          spawn("puff", x, y, size, { dx: -0.3, life: 1.1 });
        }
        if (mood === "surprised") {
          spawn("bang", x, y - size * 0.1, size, { dx: 0, life: 1.1, pop: true, scale: 1.2 });
          spawn("sweat", x, y + size * 0.25, size, { dx: 0.5, life: 1.2, scale: 0.7 });
        }
        if (mood === "curious") spawn("ask", x, y, size, { dx: 0.4, life: 1.4, pop: true });
        return;
      }
      if (t < nextAmbient) return;
      if (mood === "sleeping") {
        spawn("z", x, y, size, { dx: 0.3, life: 2.4, scale: 0.6 + 0.4 * rand() });
        nextAmbient = t + 1.1;
      } else if (mood === "sleepy") {
        spawn("z", x, y, size, { dx: 0.35, life: 1.8, scale: 0.5 });
        nextAmbient = t + 2.6;
      } else if (mood === "love" || mood === "happy") {
        spawn(mood === "love" ? "heart" : "sparkle", x, y, size, { scale: 0.6 + 0.3 * rand() });
        nextAmbient = t + (mood === "love" ? 0.55 : 0.9);
      } else if (mood === "angry") {
        spawn("puff", x, y, size, { dx: (rand() - 0.5) * 0.7, life: 1, scale: 0.8 });
        nextAmbient = t + 0.45;
      } else nextAmbient = t + 1;
    },
    dispose() {
      live.forEach((e) => e.remove());
      live.clear();
    },
  };
}
