"use client";
import { type CSSProperties, useState } from "react";
import { useI18n } from "@/engine/i18n/useI18n";
import type { L } from "@/lib/trip";

type Var = CSSProperties & Record<`--${string}`, string | number>;
const KEY = "lakon.checklist";

const readDone = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

/** Checklist "Before you go" (PRD §10.6), dicentang di perangkat ini saja. */
export function BeforeYouGo({ items }: { items: { id: string; title: L; body: L }[] }) {
  const { t, tx } = useI18n();
  const [done, setDone] = useState<string[]>(readDone);
  if (!items.length) return null;
  const toggle = (id: string) =>
    setDone((d) => {
      const next = d.includes(id) ? d.filter((x) => x !== id) : [...d, id];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* tidak diingat */
      }
      return next;
    });
  const n = items.filter((it) => done.includes(it.id)).length;

  return (
    <section className="byg" aria-labelledby="byg-title">
      <div className="byg-head">
        <h2 id="byg-title" className="dp-title">
          {t("today.before")}
        </h2>
        <p className="byg-count" aria-live="polite">
          {t("today.ready", { n, total: items.length })}
        </p>
      </div>
      <span className="byg-bar" aria-hidden="true">
        <span style={{ "--p": n / items.length } as Var} />
      </span>
      <ul className="byg-list">
        {items.map((it, i) => (
          <li key={it.id} style={{ "--i": i } as Var}>
            <label className="byg-item" data-press="">
              <input type="checkbox" checked={done.includes(it.id)} onChange={() => toggle(it.id)} />
              {/* tombol kecil 3D: tertekan & menyala emas saat dicentang */}
              <span className="byg-box" aria-hidden="true">
                <span className="byg-key">
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.5 8.5l3 3 6-7" />
                  </svg>
                </span>
              </span>
              <span className="byg-text">
                <strong>{tx(it.title)}</strong>
                <span>{tx(it.body)}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
