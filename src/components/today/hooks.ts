"use client";
import { useSyncExternalStore } from "react";
import { msToNextMinute } from "@/engine/today/schedule";

/**
 * Jam Today: berdetak tepat di pergantian menit, dan langsung menyusul saat aplikasi dibuka lagi dari latar.
 * `?at=2027-04-08T10:45` (jam WIB) memutar Today ke momen itu untuk pratinjau; jamnya tetap berjalan dari sana.
 */
const AT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
let offset: number | null = null;
function previewOffset(): number {
  if (offset !== null) return offset;
  offset = 0;
  try {
    const at = new URLSearchParams(window.location.search).get("at");
    const t = at && AT_RE.test(at) ? Date.parse(`${at}:00+07:00`) : NaN;
    if (!Number.isNaN(t)) offset = t - Date.now();
  } catch {
    /* tanpa pratinjau */
  }
  return offset;
}
export const isPreview = () => typeof window !== "undefined" && previewOffset() !== 0;

let snapshot = 0;
const read = () => Date.now() + previewOffset();
const clock = {
  subscribe(fn: () => void) {
    snapshot = read(); // kembali ke Today setelah lama: React membaca ulang setelah berlangganan
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      snapshot = read();
      fn();
      timer = setTimeout(tick, msToNextMinute(snapshot) + 20);
    };
    timer = setTimeout(tick, msToNextMinute(read()) + 20);
    const wake = () => {
      if (document.visibilityState !== "visible") return;
      clearTimeout(timer);
      tick();
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("pageshow", wake);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("pageshow", wake);
    };
  },
  get: () => (snapshot ||= read()),
  server: () => 0,
};
export const useNow = () => useSyncExternalStore(clock.subscribe, clock.get, clock.server);

const net = {
  subscribe(fn: () => void) {
    window.addEventListener("online", fn);
    window.addEventListener("offline", fn);
    return () => {
      window.removeEventListener("online", fn);
      window.removeEventListener("offline", fn);
    };
  },
  get: () => navigator.onLine,
  server: () => true,
};
export const useOnline = () => useSyncExternalStore(net.subscribe, net.get, net.server);

/** Salin teks; jatuh ke cara lama bila Clipboard API ditolak (mis. WebView tertentu). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* coba cara lama */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
