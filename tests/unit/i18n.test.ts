import { describe, expect, it } from "vitest";
import { format, LANG_KEY, pick, readLang, translate, writeLang } from "@/engine/i18n/lang";
import { STRINGS } from "@/engine/i18n/strings";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("teks UI dua bahasa (FR-10)", () => {
  it("setiap kunci punya EN dan ID yang tidak kosong", () => {
    for (const [key, v] of Object.entries(STRINGS)) {
      expect(v.en.trim(), `${key}.en`).not.toBe("");
      expect(v.id.trim(), `${key}.id`).not.toBe("");
    }
  });

  it("placeholder sama di kedua bahasa", () => {
    for (const [key, v] of Object.entries(STRINGS)) expect(placeholders(v.id), key).toEqual(placeholders(v.en));
  });

  it("format & translate mengisi placeholder", () => {
    expect(format("Sisa {n} dari {m}", { n: 2 })).toBe("Sisa 2 dari {m}");
    expect(translate("en", "gate.locked", { s: 12 })).toBe("Too many tries. Please wait 12 seconds.");
    expect(translate("id", "today.day", { n: 3 })).toBe("Hari 3");
  });

  it("pick memilih bahasa, jatuh ke EN bila kosong", () => {
    expect(pick("id", { en: "Palace", id: "Keraton" })).toBe("Keraton");
    expect(pick("id", { en: "Palace", id: "" })).toBe("Palace");
    expect(pick("en", undefined)).toBe("");
  });
});

describe("preferensi bahasa (FR-11)", () => {
  const mem = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };
  it("default EN, tersimpan, nilai asing diabaikan", () => {
    const s = mem();
    expect(readLang(s)).toBe("en");
    writeLang("id", s);
    expect(readLang(s)).toBe("id");
    s.setItem(LANG_KEY, "fr");
    expect(readLang(s)).toBe("en");
    expect(readLang(undefined)).toBe("en");
  });
});
