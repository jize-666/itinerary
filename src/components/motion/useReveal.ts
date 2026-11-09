"use client";
import { useEffect, useRef, useState } from "react";

/** true begitu elemen masuk layar (sekali saja). Tanpa IntersectionObserver: langsung true. */
export function useReveal<T extends Element>(margin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const t = setTimeout(() => setShown(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, shown] as const;
}
