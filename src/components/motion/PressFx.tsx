"use client";
import { useEffect } from "react";

/** Tekanan terlihat minimal selama ini, supaya ketukan cepat pun terasa "masuk". */
const MIN_PRESS_MS = 110;

/**
 * Tombol tekan 3D (`.pb`): satu pendengar untuk seluruh halaman. Saat ditekan (jari, mouse, Spasi/Enter)
 * tombol mendapat `data-pressed`; CSS menurunkan wajah tombol ke tebalnya dan meredupkan bayangan.
 * Lebih andal dari `:active` di iOS, dan tombol SOS/utama memberi getar halus di Android.
 */
export function PressFx() {
  useEffect(() => {
    let current: HTMLElement | null = null;
    let since = 0;
    const press = (el: HTMLElement) => {
      current = el;
      since = performance.now();
      el.dataset.pressed = "";
      if (el.dataset.haptic !== undefined) navigator.vibrate?.(8);
    };
    const release = () => {
      const el = current;
      if (!el) return;
      current = null;
      const left = MIN_PRESS_MS - (performance.now() - since);
      if (left > 0) setTimeout(() => delete el.dataset.pressed, left);
      else delete el.dataset.pressed;
    };
    const target = (e: Event) => (e.target instanceof Element ? (e.target.closest(".pb, [data-press]") as HTMLElement | null) : null);
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const el = target(e);
      if (el && !el.matches(":disabled")) press(el);
    };
    const keyDown = (e: KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) {
        const el = target(e);
        if (el) press(el);
      }
    };
    document.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", release, { passive: true });
    window.addEventListener("pointercancel", release, { passive: true });
    window.addEventListener("blur", release);
    document.addEventListener("keydown", keyDown);
    document.addEventListener("keyup", release);
    return () => {
      document.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
      document.removeEventListener("keydown", keyDown);
      document.removeEventListener("keyup", release);
    };
  }, []);
  return null;
}
