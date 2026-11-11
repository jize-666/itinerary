"use client";
import { useState, useSyncExternalStore } from "react";
import { useI18n } from "@/engine/i18n/useI18n";
import { installPrompt, isStandalone } from "@/lib/pwa";
import { Seg } from "./Seg";

type Os = "ios" | "android";
const KEY = "lakon.install";
const STEPS = {
  ios: ["install.ios1", "install.ios2", "install.ios3"],
  android: ["install.android1", "install.android2", "install.android3"],
} as const;

const dismissed = () => {
  try {
    return localStorage.getItem(KEY) === "later";
  } catch {
    return false;
  }
};
const detectOs = (): Os => (/android/i.test(navigator.userAgent) ? "android" : "ios");

/**
 * Panduan Add to Home Screen (PRD FR-36). Android yang mendukung: satu tombol (prompt asli browser).
 * iPhone & lainnya: tiga langkah bergambar teks. Tidak tampil bila sudah dibuka dari Home Screen.
 */
export function InstallGuide({ onDismiss }: { onDismiss?: () => void } = {}) {
  const { t } = useI18n();
  const prompt = useSyncExternalStore(installPrompt.subscribe, installPrompt.get, installPrompt.getServer);
  const [hidden, setHidden] = useState(() => isStandalone() || dismissed());
  const [os, setOs] = useState<Os>(detectOs);
  if (hidden) return null;
  const later = () => {
    setHidden(true);
    onDismiss?.();
    try {
      localStorage.setItem(KEY, "later");
    } catch {
      /* tidak diingat */
    }
  };

  return (
    <aside className="ig" aria-labelledby="ig-title">
      <svg className="ig-icon" viewBox="0 0 60 100" aria-hidden="true" focusable="false">
        <path d="M30 2C36 14 50 26 54 44C58 62 50 78 40 84V93L47 98H13L20 93V84C10 78 2 62 6 44C10 26 24 14 30 2Z" />
        <path className="ig-tree" d="M30 18V84M30 36C25 42 19 42 14 48M30 36C35 42 41 42 46 48M30 54C25 60 18 60 13 66M30 54C35 60 42 60 47 66" />
      </svg>
      <div className="ig-main">
        <h2 id="ig-title" className="ig-title">
          {t("install.title")}
        </h2>
        <p className="ig-body">{t("install.body")}</p>
        {prompt ? (
          <button type="button" className="pb pb--gold ig-add" onClick={() => installPrompt.prompt().then((ok) => ok && setHidden(true))}>
            <span className="pb-face">{t("install.add")}</span>
          </button>
        ) : (
          <>
            <Seg
              className="ig-tabs"
              label={t("install.add")}
              value={os}
              onChange={setOs}
              options={(["ios", "android"] as const).map((o) => ({ value: o, label: t(o === "ios" ? "install.ios" : "install.android") }))}
            />
            <ol className="ig-steps" key={os}>
              {STEPS[os].map((k) => (
                <li key={k}>{t(k)}</li>
              ))}
            </ol>
          </>
        )}
        <button type="button" className="ig-later" onClick={later}>
          {t("install.dismiss")}
        </button>
      </div>
    </aside>
  );
}
