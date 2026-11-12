"use client";
import type { CSSProperties, ReactNode } from "react";

type Opt<T extends string> = { value: T; label: ReactNode; lang?: string };

/**
 * Sakelar segmen 3D (EN/ID, iPhone/Android): lintasan dipahat ke dalam, "kunci" emas timbul yang bergeser
 * ke pilihan aktif dan ikut tertekan saat disentuh. Yang bergerak hanya transform.
 */
export function Seg<T extends string>({ options, value, onChange, label, className, variant = "carved" }: { options: Opt<T>[]; value: T; onChange: (v: T) => void; label: string; className?: string; variant?: "carved" | "line" }) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  // "line" = gaya home: kapsul bergaris tipis dengan kunci gading yang bergeser (src/components/home/home.css)
  const base = variant === "line" ? "segl" : "seg";
  return (
    <div className={`${base}${className ? ` ${className}` : ""}`} role="group" aria-label={label} style={{ "--n": options.length, "--i": i } as CSSProperties}>
      <span className={`${base}-thumb`} aria-hidden="true" />
      {options.map((o) => (
        <button key={o.value} type="button" className={`${base}-opt`} data-press="" data-sfx="ui-tok" lang={o.lang} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
