"use client";
import { type RefObject, useLayoutEffect } from "react";
import { Swing2D } from "@/engine/pass3d/swing2d";
import { type PassSample, stageBus } from "@/engine/stage/bus";
import { lookMoving, startLook, stepLook } from "./look";
import type { LayerPos } from "./Slides";

/**
 * Pengendali tiket DOM film 2,5D (tanpa WebGL): kartu tergantung yang berayun, bisa dipegang, disentil, dan dibalik.
 * Modelnya `engine/pass3d/swing2d.ts`; di sini hanya jembatan ke DOM:
 *  - hidup hanya selama slide tiket sedang ditonton, tiket DOM yang terlihat (film tanpa `data-pass3d`, atau
 *    "loading"), Calm mati, gerak tidak dikurangi, dan tab terlihat;
 *  - menulis --ps-roll / --ps-pitch / --ps-yaw (deg) di elemen tiket dan `data-pass-flat="<status>"` di akar film;
 *  - rAF berhenti saat kartu diam dan pandang tidak bergerak (hemat baterai), bangun lagi oleh masukan atau pandang;
 *  - kejadian model diteruskan ke `stageBus.passEvent` (suara tiket dan Clawd).
 * Calm / reduced motion: tanpa rAF, tanpa variabel, tanpa masukan, kartu diam seperti sebelumnya.
 */

/** Sudut awal (rad): kartu mulai miring dan berayun masuk. */
const ENTRY_ROLL = 0.2;
/** Letak ujung benang dari tepi atas kartu (px): benang berakhir di mata ayam (pass.css .pass-thread). */
const EYELET = 17;
const DEG = 180 / Math.PI;

export function usePassToy(hold: RefObject<HTMLElement | null>, pos: LayerPos | undefined) {
  useLayoutEffect(() => {
    const el = hold.current;
    const film = el?.closest<HTMLElement>(".film") ?? null;
    if (!el || !film || (pos !== "cur" && pos !== "in")) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const write = (s: Swing2D) => {
      el.style.setProperty("--ps-roll", (s.roll * DEG).toFixed(2) + "deg");
      el.style.setProperty("--ps-pitch", (s.pitch * DEG).toFixed(2) + "deg");
      el.style.setProperty("--ps-yaw", (s.yaw * DEG).toFixed(2) + "deg");
    };
    const clearVars = () => {
      for (const k of ["--ps-roll", "--ps-pitch", "--ps-yaw"]) el.style.removeProperty(k);
    };
    const still = () => "calm" in film.dataset || reduced.matches;
    // tiket DOM terlihat: tanpa panggung 3D, atau panggung masih memuat / gagal
    const visible = () => !film.dataset.pass3d || film.dataset.pass3d === "loading";
    const live = () => pos === "cur" && !still() && visible();

    let swing: Swing2D | null = null;
    let raf = 0;
    let last = 0;
    let stopLook: (() => void) | null = null;
    let unbind: (() => void) | null = null;
    let geo: { px: number; py: number } | null = null;

    // pose awal sebelum layar terlihat (slide masuk), supaya ayunan masuk tidak melompat saat mulai
    if (!still()) write(new Swing2D(ENTRY_ROLL));

    const flag = () => {
      if (swing && film.dataset.passFlat !== swing.status) film.dataset.passFlat = swing.status;
    };
    const tick = () => {
      raf = 0;
      if (!swing) return;
      const now = performance.now();
      const dt = last ? Math.min(0.1, Math.max(0, (now - last) / 1000)) : 1 / 60;
      last = now;
      const l = stepLook(now);
      swing.setLook(l.x, l.y, dt);
      swing.step(dt);
      write(swing);
      flag();
      if (swing.active || lookMoving(now)) raf = requestAnimationFrame(tick);
      else last = 0;
    };
    const wake = () => {
      if (swing && !raf) raf = requestAnimationFrame(tick);
    };
    const wakeLook = () => {
      if (lookMoving()) wake();
    };

    /** Titik putar (ujung benang) dan kotak tata letak kartu dalam piksel layar. */
    const measure = () => {
      const r = el.getBoundingClientRect();
      const thread = parseFloat(getComputedStyle(el).getPropertyValue("--thread")) || 44;
      return { px: r.left + r.width / 2, py: r.top + EYELET - thread, length: r.height, w: r.width, thread };
    };
    /** Titik layar (px klien) di dalam kartu yang sedang miring? (dibalik ke bingkai kartu, abaikan yaw kecil) */
    const inside = (x: number, y: number, m: ReturnType<typeof measure>) => {
      const dx = x - m.px;
      const dy = y - m.py;
      const c = Math.cos(swing!.roll);
      const s = Math.sin(swing!.roll);
      const lx = dx * c + dy * s;
      const ly = -dx * s + dy * c;
      const top = m.thread - EYELET;
      return Math.abs(lx) <= m.w / 2 + 6 && ly >= top - 6 && ly <= top + m.length + 6;
    };
    const client = (p: PassSample) => {
      const r = film.getBoundingClientRect();
      return { x: r.left + ((p.x + 1) / 2) * p.viewportWidth, y: r.top + ((1 - p.y) / 2) * p.viewportHeight };
    };
    const ok = () => !!swing && live() && !document.hidden && !("moving" in film.dataset);

    const start = () => {
      swing = new Swing2D(ENTRY_ROLL, (e) => stageBus.passEvent(e));
      swing.setLook(0, 0, 0);
      write(swing);
      flag();
      stopLook = startLook();
      unbind = stageBus.bindPassFlat({
        down(p) {
          if (!ok()) return false;
          const c = client(p);
          const m = measure();
          if (!inside(c.x, c.y, m)) return false;
          geo = { px: m.px, py: m.py };
          swing!.grab(c.x - m.px, c.y - m.py, m.length);
          wake();
          return true;
        },
        move(p) {
          if (!swing || !geo) return false;
          const c = client(p);
          swing.drag(c.x - geo.px, c.y - geo.py);
          wake();
          return true;
        },
        up() {
          if (!swing || !geo) return false;
          geo = null;
          swing.release();
          wake();
          return true;
        },
        key(key) {
          if (key !== "Enter" || !ok()) return false;
          swing!.flip();
          wake();
          return true;
        },
      });
      window.addEventListener("pointermove", wakeLook, { passive: true });
      window.addEventListener("deviceorientation", wakeLook, { passive: true });
      wake();
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
      window.removeEventListener("pointermove", wakeLook);
      window.removeEventListener("deviceorientation", wakeLook);
      unbind?.();
      unbind = null;
      stopLook?.();
      stopLook = null;
      if (swing?.state.status === "dragging") swing.release();
      swing = null;
      geo = null;
      delete film.dataset.passFlat;
    };
    const sync = () => {
      if (still()) clearVars();
      if (live()) {
        if (!swing) start();
        // tab latar: rAF dijeda, kartu dan ayunannya dipertahankan
        else if (document.hidden) {
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
          last = 0;
        } else wake();
      } else if (swing) stop();
    };

    sync();
    const mo = new MutationObserver(sync);
    mo.observe(film, { attributes: true, attributeFilter: ["data-pass3d", "data-calm"] });
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    return () => {
      mo.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
      stop();
    };
  }, [hold, pos]);
}
