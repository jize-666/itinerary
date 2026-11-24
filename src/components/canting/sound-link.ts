/**
 * Sambungan suara membatik ke sakelar suara situs (Tugas 11.4), dipakai `/canting/` dan film Hari 3. Suara dibuat
 * saat sakelar menyala dan halaman terlihat, dilepas saat dimatikan atau tab ke latar. Kode pembangkitnya
 * (`batik-sound.ts`) baru diunduh saat suara pertama kali dibutuhkan.
 */
import { audioStatus } from "@/engine/audio/status";
import type { BatikVoices } from "./batik-sound";

export type BatikSoundLink = { get(): BatikVoices | null; dispose(): void };

export function linkBatikSound(): BatikSoundLink {
  let voices: BatikVoices | null = null;
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
    void import("./batik-sound")
      .then(({ createBatikVoices }) => {
        const bus = audioStatus.environment();
        if (request === revision && !dead && bus && !document.hidden) voices = createBatikVoices(bus);
      })
      .catch(() => {});
  };
  sync();
  const off = audioStatus.subscribe(sync);
  document.addEventListener("visibilitychange", sync);
  return {
    get: () => voices,
    dispose() {
      dead = true;
      off();
      document.removeEventListener("visibilitychange", sync);
      drop();
    },
  };
}
