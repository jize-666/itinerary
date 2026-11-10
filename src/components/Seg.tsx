"use client";
import type { CSSProperties, ReactNode } from "react";

type Opt<T extends string> = { value: T; label: ReactNode; lang?: string };

/**
 * Sakelar segmen 3D (EN/ID, iPhone/Android): lintasan dipahat ke dalam, "kunci" emas timbul yang bergeser
 * ke pilihan aktif dan ikut tertekan saat disentuh. Yang bergerak hanya transform.
 */
export function Seg<T extends string>({ options, value, onChange, label, className }: { options: Opt<T>[]; value: T; onChange: (v: T) => void; label: string; className?: string }) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className={`seg${className ? ` ${className}` : ""}`} role="group" aria-label={label} style={{ "--n": options.length, "--i": i } as CSSProperties}>
      <span className="seg-thumb" aria-hidden="true" />
      {options.map((o) => (
        <button key={o.value} type="button" className="seg-opt" data-press="" lang={o.lang} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
