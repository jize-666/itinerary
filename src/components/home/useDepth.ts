"use client";
import { type RefObject, useEffect } from "react";
import { CENTER, follow, pointerToUnit, settled } from "@/engine/motion/tilt";
import { HOME, prefersReducedMotion } from "@/engine/motion/tokens";

/**
 * Parallax kursor untuk adegan home: menulis --mx / --my (−1…1) di elemen akar, CSS menghitung geser tiap lapisan
 * dan kemiringan kartu dari dua angka itu. rAF hanya berjalan selama kursor masih dikejar, lalu berhenti.
 * Layar sentuh (tanpa kursor) dan reduced motion tidak memakai ini; di layar sentuh lapisan berayun lewat CSS.
 */
export function useDepth(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion() || typeof window.matchMedia !== "function") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let target = CENTER;
    let now = CENTER;
    let raf = 0;
    let last = 0;
    const frame = (t: number) => {
      now = follow(now, target, last ? t - last : 16, HOME.follow);
      last = t;
      const done = settled(now, target, HOME.rest);
      if (done) now = target;
      root.style.setProperty("--mx", now.x.toFixed(4));
      root.style.setProperty("--my", now.y.toFixed(4));
      raf = done ? 0 : requestAnimationFrame(frame);
      if (done) last = 0;
    };
    const chase = (to: typeof CENTER) => {
      target = to;
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || e.pointerType === "pen") chase(pointerToUnit(e.clientX, e.clientY, window.innerWidth, window.innerHeight));
    };
    const onLeave = () => chase(CENTER);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      if (raf) cancelAnimationFrame(raf);
      root.style.removeProperty("--mx");
      root.style.removeProperty("--my");
    };
  }, [ref]);
}
