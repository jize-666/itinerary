"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { useRequireSession } from "@/components/useRequireSession";
import { useI18n } from "@/engine/i18n/useI18n";
import { readCantingOptions } from "@/engine/canting/options";

const Canting = dynamic(() => import("@/components/canting/Canting").then((m) => m.Canting), { ssr: false });

function subscribe(listener: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", listener);
  window.addEventListener("storage", listener);
  window.addEventListener("pageshow", listener);
  window.addEventListener("popstate", listener);
  return () => {
    query.removeEventListener("change", listener);
    window.removeEventListener("storage", listener);
    window.removeEventListener("pageshow", listener);
    window.removeEventListener("popstate", listener);
  };
}
function isCalm() {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  try {
    return reduced || localStorage.getItem("lakon.calm") === "1";
  } catch {
    return reduced;
  }
}
export default function CantingPage() {
  const session = useRequireSession();
  const { lang } = useI18n();
  const calm = useSyncExternalStore(subscribe, isCalm, () => false);
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  const { quality, tahap, draw, showFps } = readCantingOptions(search);
  if (!session) return null;
  return <Canting lang={lang} calm={calm} quality={quality} tahap={tahap} draw={draw} showFps={showFps} />;
}
