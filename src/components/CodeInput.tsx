"use client";
import { useEffect, useRef, useState } from "react";
import { CODE_GROUPS, normalizeCode } from "@/lib/code";

type Props = {
  length: number;
  label: string;
  disabled: boolean;
  /** idle · checking (huruf bergelombang) · error (goyang + kilat merah) · success (huruf menyala emas berurutan) */
  state: "idle" | "checking" | "error" | "success";
  /** Baki muncul berurutan (hanya kunjungan pertama, bukan setelah salah). */
  enter: boolean;
  onComplete: (code: string) => void;
  onInput?: () => void;
};

/**
 * Kode per karakter (PRD §7.1): satu baki berlekuk per kelompok, satu sel per huruf. Di baliknya satu <input> asli
 * yang transparan: paste, isi otomatis, keyboard HP, dan pembaca layar tetap bekerja normal. Huruf kecil, spasi,
 * dan tanda hubung dimaafkan.
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

  const trays: React.ReactNode[] = [];
  let i = 0;
  CODE_GROUPS.forEach((size, g) => {
    if (g > 0) trays.push(<span key={`sep${g}`} className="hm-code-sep" />);
    const cells: React.ReactNode[] = [];
    for (let k = 0; k < size; k++, i++) {
      const ch = value[i];
      const active = focused && !disabled && i === Math.min(value.length, length - 1) && value.length < length;
      cells.push(
        <span key={i} className="hm-cell" style={{ "--i": i } as React.CSSProperties} data-filled={ch ? "" : undefined} data-active={active ? "" : undefined}>
          {ch && (
            <span key={`${i}${ch}`} className="hm-char">
              {ch}
            </span>
          )}
        </span>,
      );
    }
    trays.push(
      <span key={`tray${g}`} className="hm-tray" style={{ "--t": g } as React.CSSProperties}>
        {cells}
      </span>,
    );
  });

  return (
    <div className="hm-code" data-state={state} data-enter={enter ? "" : undefined} data-focused={focused && !disabled ? "" : undefined}>
      <input
        ref={ref}
        className="hm-code-input"
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
      <div className="hm-trays" aria-hidden="true">
        {trays}
      </div>
    </div>
  );
}
