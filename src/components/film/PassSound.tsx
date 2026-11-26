import { useEffect } from "react";
import { audioStatus } from "@/engine/audio/status";
import { stageBus } from "@/engine/stage/bus";
import type { PassVoices } from "@/components/pass/pass-sound";

/**
 * Suara tiket 3D di film (Tugas 12b): gemerisik kertas, dering mata ayam, tepukan balik, sentuhan, dan desir lepas,
 * dari kejadian fisika di `stageBus.onPass`. Pasang satu kali di film tanpa props: `<PassSound />`. Tidak menggambar apa pun.
 * Mengikuti sakelar suara dan tab latar seperti `BatikSound` (suara dibuat saat sakelar menyala dan halaman terlihat,
 * dilepas saat dimatikan); kode pembangkitnya baru diunduh saat pertama dibutuhkan.
 */
export function PassSound() {
  useEffect(() => {
    let voices: PassVoices | null = null;
    let revision = 0;
    let dead = false;
    const drop = () => {
      revision++;
      voices?.dispose();
      voices = null;
    };
    const sync = () => {
      if (dead || !audioStatus.voiceOn() || document.hidden) return drop();
      // sakelar baru menyimpan pilihannya sesaat sebelum AudioContext dibuka: konteks dibaca sesudah impor selesai
      const env = audioStatus.environment();
      if (voices && env && voices.context === env.context) return;
      drop();
      const request = revision;
      void import("@/components/pass/pass-sound")
        .then(({ createPassVoices }) => {
          const bus = audioStatus.environment();
          if (request === revision && !dead && bus && !document.hidden) voices = createPassVoices(bus);
        })
        .catch(() => {});
    };
    sync();
    const offStatus = audioStatus.subscribe(sync);
    document.addEventListener("visibilitychange", sync);
    const offPass = stageBus.onPass((e) => voices?.signal(e));
    return () => {
      dead = true;
      offPass();
      offStatus();
      document.removeEventListener("visibilitychange", sync);
      drop();
    };
  }, []);
  return null;
}
