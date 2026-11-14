import { afterEach, describe, expect, it, vi } from "vitest";
import { type AudioControl, audioStatus } from "@/engine/audio/status";
import { stageBus } from "@/engine/stage/bus";

describe("bus panggung (DOM → panggung 3D)", () => {
  it("tanpa panggung 3D: \"flat\", pemanggil mengurus sendiri bunyi dan riaknya", () => {
    expect(stageBus.strikeGong()).toBe("flat");
  });

  it("gong terdaftar: meneruskan detik sampai hantaman, atau \"busy\" bila pukulan sebelumnya belum selesai", () => {
    const answers: (number | null)[] = [0.52, null];
    const off = stageBus.bindGong(() => answers.shift() ?? null);
    expect(stageBus.strikeGong()).toBe(0.52);
    expect(stageBus.strikeGong()).toBe("busy");
    off();
    expect(stageBus.strikeGong()).toBe("flat");
  });

  it("pilihan hentakan kamera diteruskan ke panggung: bawaan ikut terhentak, slide judul tidak (Tugas 7b)", () => {
    const seen: boolean[] = [];
    const off = stageBus.bindGong((kick) => {
      seen.push(kick);
      return 0.52;
    });
    stageBus.strikeGong();
    stageBus.strikeGong({ kick: false });
    stageBus.strikeGong({ kick: true });
    expect(seen).toEqual([true, false, true]);
    off();
  });

  it("panggung dibangun ulang (ganti tier): pembatal yang lama tidak melepas gong yang baru", () => {
    const offOld = stageBus.bindGong(() => 1);
    const offNew = stageBus.bindGong(() => 2);
    offOld();
    expect(stageBus.strikeGong()).toBe(2);
    offNew();
    expect(stageBus.strikeGong()).toBe("flat");
  });

  it("tanda siap dipukul disimpan untuk panggung", () => {
    expect(stageBus.ready()).toBe(false);
    stageBus.setReady(true);
    expect(stageBus.ready()).toBe(true);
    stageBus.setReady(false);
    expect(stageBus.ready()).toBe(false);
  });
});

describe("bunyi adegan (audioStatus.scene)", () => {
  const control = { setEnabled: vi.fn(), playSfx: vi.fn(), preload: vi.fn() } satisfies AudioControl;
  afterEach(() => {
    vi.clearAllMocks();
    audioStatus.publish({ started: false, enabled: false }, control);
  });

  it("lakon belum dimulai atau suara dimatikan: hening, tidak mengunduh apa pun", () => {
    audioStatus.publish({ started: false, enabled: true }, control);
    audioStatus.scene("gong", 0.5);
    audioStatus.prepare("gong", "api-naga");
    audioStatus.publish({ started: true, enabled: false }, control);
    audioStatus.scene("gong", 0.5);
    audioStatus.prepare("gong", "api-naga");
    expect(control.playSfx).not.toHaveBeenCalled();
    expect(control.preload).not.toHaveBeenCalled();
  });

  it("suara menyala: gong dijadwalkan pada saat tabuh kena dan merendahkan gendhing; napas api tidak", () => {
    audioStatus.publish({ started: true, enabled: true }, control);
    audioStatus.prepare("gong", "api-naga");
    expect(control.preload.mock.calls).toEqual([["gong"], ["api-naga"]]);
    audioStatus.scene("gong", 0.52);
    audioStatus.scene("api-naga", 0.6, 0.5);
    expect(control.playSfx).toHaveBeenNthCalledWith(1, "gong", { gain: 0.9, delay: 0.52, duck: true });
    expect(control.playSfx).toHaveBeenNthCalledWith(2, "api-naga", { gain: 0.45, delay: 0.6, duck: false });
  });
});
