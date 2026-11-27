import { describe, expect, it } from "vitest";
import { parseQuality, pixelRatio, preferUltra } from "@/engine/motion/quality";

describe("preferUltra", () => {
  it("desktop dengan inti banyak atau tidak diketahui", () => {
    expect(preferUltra({ touch: false, cores: 8 })).toBe(true);
    expect(preferUltra({ touch: false, cores: 16 })).toBe(true);
    expect(preferUltra({ touch: false, cores: 0 })).toBe(true);
  });
  it("inti sedikit atau layar sentuh tetap high", () => {
    expect(preferUltra({ touch: false, cores: 4 })).toBe(false);
    expect(preferUltra({ touch: true, cores: 8 })).toBe(false);
    expect(preferUltra({ touch: true, cores: 0 })).toBe(false);
  });
});

describe("parseQuality", () => {
  it("ultra dan high; medium dan low lama menjadi high", () => {
    expect(parseQuality("ultra")).toBe("ultra");
    expect(parseQuality("high")).toBe("high");
    expect(parseQuality("medium")).toBe("high");
    expect(parseQuality("low")).toBe("high");
    expect(parseQuality("x")).toBeUndefined();
    expect(parseQuality(null)).toBeUndefined();
  });
});

describe("pixelRatio", () => {
  it("high: kerapatan layar, paling banyak 2", () => {
    expect(pixelRatio("high", 1)).toBe(1);
    expect(pixelRatio("high", 1.75)).toBe(1.75);
    expect(pixelRatio("high", 3)).toBe(2);
    expect(pixelRatio("high", 0)).toBe(1);
  });
  it("ultra: 1,5 sampai 2,5", () => {
    expect(pixelRatio("ultra", 1)).toBe(1.5);
    expect(pixelRatio("ultra", 2)).toBe(2);
    expect(pixelRatio("ultra", 3)).toBe(2.5);
  });
});
