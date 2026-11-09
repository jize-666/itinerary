"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type ComponentProps, type MouseEvent, useEffect, useSyncExternalStore } from "react";
import { curtain } from "@/engine/motion/curtain";

/** Bilah letterbox di atas segalanya. Tidak menangkap klik saat terbuka. */
export function Curtain() {
  const st = useSyncExternalStore(curtain.subscribe, curtain.get, curtain.getServer);
  return (
    <div className="curtain" data-state={st} aria-hidden="true">
      <span className="curtain-bar curtain-bar--top" />
      <span className="curtain-bar curtain-bar--bottom" />
      <span className="curtain-seam" />
    </div>
  );
}

/** Pindah halaman lewat tirai. */
export function useCurtainNav() {
  const router = useRouter();
  return async (href: string, delay = 0) => {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    await curtain.close();
    router.push(href);
  };
}

/** Link yang menutup tirai dulu (klik biasa); klik tengah / Cmd+klik tetap perilaku bawaan. */
export function CurtainLink({ href, onClick, ...rest }: ComponentProps<typeof Link> & { href: string }) {
  const go = useCurtainNav();
  return (
    <Link
      href={href}
      {...rest}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        void go(href);
      }}
    />
  );
}

/** Halaman tujuan: buka tirai saat tampil (tidak berbuat apa-apa bila tirai sudah terbuka). */
export function useCurtainOpen() {
  useEffect(() => {
    void curtain.open();
  }, []);
}
