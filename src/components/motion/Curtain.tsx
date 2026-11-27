"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { type ComponentProps, type MouseEvent, useEffect, useSyncExternalStore } from "react";
import { curtain, heavyRoute, HOLD_NAV_MS } from "@/engine/motion/curtain";
import { prefetchDiorama } from "@/components/diorama/prefetch";

/**
 * Bilah letterbox di atas segalanya. Tidak menangkap klik saat terbuka.
 * Tirai membuka sendiri begitu rute berganti. Sebelumnya hanya halaman yang memanggil `useCurtainOpen` (film, Today)
 * yang membukanya; /diorama/ tidak, jadi tirai tertutup menutupi seluruh layar dan halaman tampak macet sampai dimuat
 * ulang (laporan host 24 Nov).
 */
export function Curtain() {
  const st = useSyncExternalStore(curtain.subscribe, curtain.get, curtain.getServer);
  const path = usePathname();
  useEffect(() => {
    // tunda satu tik: halaman tujuan yang berat memasang `curtain.hold` di commit yang sama (efeknya bisa
    // berjalan sesudah efek ini), dan tirai baru boleh membuka setelah tahanan itu dilepas
    const t = setTimeout(() => void curtain.open(), 0);
    return () => clearTimeout(t);
  }, [path]);
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
    // rute yang sama tidak mengganti pathname, jadi tidak ada yang membuka tirai lagi: tanpa tirai
    const to = new URL(href, window.location.href).pathname;
    if (to !== window.location.pathname) {
      // tahan sebelum menutup: pathname bisa berganti sebelum halaman berat sempat memasang tahanannya sendiri
      if (heavyRoute(to)) curtain.hold("diorama", HOLD_NAV_MS);
      await curtain.close();
    }
    router.push(href);
  };
}

/** Link yang menutup tirai dulu (klik biasa); klik tengah / Cmd+klik tetap perilaku bawaan. */
export function CurtainLink({ href, onClick, ...rest }: ComponentProps<typeof Link> & { href: string }) {
  const go = useCurtainNav();
  const toDiorama = typeof href === "string" && heavyRoute(href);
  // maket: unduh chunk 3D selagi tamu masih membaca, supaya tirai tidak menunggu jaringan
  useEffect(() => {
    if (toDiorama) prefetchDiorama();
  }, [toDiorama]);
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
