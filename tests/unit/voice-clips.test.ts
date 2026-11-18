import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import clips from "@/engine/mascot/voice-clips.json";
import { clipMs, voiceLines } from "@/engine/mascot/voice";

/**
 * Klip suara Clawd yang asli (tanpa mock): manifest `voice-clips.json` dan folder `public/audio/clawd`. Suaranya
 * bahasa Inggris saja (pilihan host 18 Nov); film berbahasa Indonesia tampil tanpa suara.
 */
const DIR = join(process.cwd(), "public/audio/clawd");
const manifest = clips as Record<string, Record<string, number> | undefined>;
const names = voiceLines().map((l) => l.name);

describe("klip suara Clawd (berkas asli)", () => {
  it("tiap kalimat punya lama EN antara 0,5 dan 12 dtk", () => {
    for (const name of names) {
      const ms = manifest.en?.[name];
      expect(ms, name).toBeTypeOf("number");
      expect(ms, name).toBeGreaterThanOrEqual(500);
      expect(ms, name).toBeLessThanOrEqual(12000);
    }
  });

  it("tidak ada klip bahasa Indonesia", () => {
    expect(Object.keys(manifest.id ?? {})).toHaveLength(0);
    expect(existsSync(join(DIR, "id"))).toBe(false);
  });

  it("berkas EN tepat satu per kalimat, tanpa kelebihan", () => {
    const files = readdirSync(join(DIR, "en")).sort();
    expect(files).toEqual(names.map((n) => `${n}.mp3`).sort());
  });

  it("clipMs: angka untuk semua kalimat EN, null untuk ID", () => {
    for (const name of names) {
      expect(clipMs("en", name), name).toBeTypeOf("number");
      expect(clipMs("id", name), name).toBeNull();
    }
  });
});
