"use client";
import { useEffect, useRef, useState } from "react";
import { CODE_GROUPS, normalizeCode } from "@/lib/code";

type Props = {
  length: number;
  label: string;
  disabled: boolean;
  /** idle · checking (gelombang cahaya) · error (goyang + kilat merah) · success (menyala & menyatu jadi benang) */
  state: "idle" | "checking" | "error" | "success";
  /** Kotak muncul berurutan (hanya kunjungan pertama, bukan setelah salah). */
  enter: boolean;
  onComplete: (code: string) => void;
  onInput?: () => void;
};

/**
 * Kotak per karakter (PRD §7.1). Di baliknya satu <input> asli yang transparan: paste, isi otomatis,
 * keyboard HP, dan pembaca layar tetap bekerja normal. Huruf kecil, spasi, dan tanda hubung dimaafkan.
 */
export function CodeInput({ length, label, disabled, state, enter, onComplete, onInput }: Props) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) ref.current?.focus({ preventScroll: true });
  }, [disabled]);

  const change = (raw: string) => {
    const v = normalizeCode(raw).slice(0, length);
    setValue(v);
    onInput?.();
    if (v.length === length) onComplete(v);
  };

  // Saat kode benar, kotak merapat jadi satu benang di tengah: geser tiap kotak sebesar celah (--sg) & pemisah (--ss)
  // yang ada di antara posisinya dan susunan rapat. Lihat @keyframes box-ok.
  const seps = CODE_GROUPS.length - 1;
  const sepsBefore = (idx: number) => {
    let acc = 0, n = 0;
    for (let g = 0; g < CODE_GROUPS.length - 1; g++) {
      acc += CODE_GROUPS[g]!;
      if (idx >= acc) n++;
    }
    return n;
  };
  const shift = (idx: number) => ({ "--sg": (length + seps - 1) / 2 - idx - sepsBefore(idx), "--ss": seps / 2 - sepsBefore(idx) });
  const boxes: React.ReactNode[] = [];
  let i = 0;
  CODE_GROUPS.forEach((size, g) => {
    if (g > 0) boxes.push(<span key={`sep${g}`} className="code-sep" />);
    for (let k = 0; k < size; k++, i++) {
      const ch = value[i];
      const active = focused && !disabled && i === Math.min(value.length, length - 1) && value.length < length;
      boxes.push(
        <span key={i} className="code-box" style={{ "--i": i, ...shift(i) } as React.CSSProperties} data-filled={ch ? "" : undefined} data-active={active ? "" : undefined}>
          {ch && (
            <span key={`${i}${ch}`} className="code-char">
              {ch}
            </span>
          )}
        </span>,
      );
    }
  });

  return (
    <div className="code" data-state={state} data-enter={enter ? "" : undefined}>
      <input
        ref={ref}
        className="code-input"
        value={value}
        onChange={(e) => change(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label={label}
        disabled={disabled}
        autoComplete="off"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
        enterKeyHint="go"
        maxLength={length * 3}
      />
      <div className="code-boxes" aria-hidden="true">
        {boxes}
      </div>
    </div>
  );
}
