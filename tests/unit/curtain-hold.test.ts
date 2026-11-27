import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { curtain, HOLD_MAX_MS } from "@/engine/motion/curtain";
import { MOTION } from "@/engine/motion/tokens";

const OPEN_MS = MOTION.letterbox.dur + 100;

/** Tirai tertutup, seperti sesudah klik tautan ke halaman berat. */
async function closed() {
  const p = curtain.close();
  await vi.advanceTimersByTimeAsync(MOTION.letterbox.dur);
  await p;
  expect(curtain.get()).toBe("closed");
}

describe("tahanan tirai", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(async () => {
    // bersihkan keadaan modul antar tes
    curtain.release("a");
    curtain.release("b");
    await vi.advanceTimersByTimeAsync(OPEN_MS + 10);
    vi.useRealTimers();
  });

  it("open() ditunda selama ada tahanan dan jalan begitu dilepas", async () => {
    await closed();
    curtain.hold("a");
    void curtain.open();
    await vi.advanceTimersByTimeAsync(1000);
    expect(curtain.get()).toBe("closed");
    curtain.release("a");
    expect(curtain.get()).toBe("opening");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    expect(curtain.get()).toBe("open");
  });

  it("tanpa tahanan open() langsung membuka", async () => {
    await closed();
    void curtain.open();
    expect(curtain.get()).toBe("opening");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    expect(curtain.get()).toBe("open");
  });

  it("dua tahanan: membuka hanya sesudah yang terakhir dilepas", async () => {
    await closed();
    curtain.hold("a");
    curtain.hold("b");
    void curtain.open();
    curtain.release("a");
    expect(curtain.get()).toBe("closed");
    curtain.release("b");
    expect(curtain.get()).toBe("opening");
  });

  it("batas waktu melepas tahanan yang tidak pernah dilepas halamannya", async () => {
    await closed();
    curtain.hold("a");
    void curtain.open();
    await vi.advanceTimersByTimeAsync(HOLD_MAX_MS - 1);
    expect(curtain.get()).toBe("closed");
    expect(curtain.holding()).toBe(true);
    await vi.advanceTimersByTimeAsync(2);
    expect(curtain.holding()).toBe(false);
    expect(curtain.get()).toBe("opening");
  });

  it("melepas tahanan tanpa permintaan membuka tidak mengubah tirai; lepas ganda aman", async () => {
    curtain.hold("a");
    curtain.release("a");
    curtain.release("a");
    expect(curtain.get()).toBe("open");
    expect(curtain.holding()).toBe(false);
  });
});
