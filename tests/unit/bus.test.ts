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

  it("zoom dan kitar: berlaku di gong penutup dan di judul/hero; dua tahap gulir hanya di gong penutup", () => {
    stageBus.setGongHere(null);
    expect(stageBus.gongZoomBy("key", 1)).toBe(false);
    expect(stageBus.orbitStart()).toBe(false);
    stageBus.setGongHere("title");
    expect(stageBus.zoomHere()).toBe(true);
    expect(stageBus.gongHere()).toBe(false);
    expect(stageBus.gongStep(1)).toBe(false); // langkah pertama di judul dipakai tahap gong, bukan zoom
    expect(stageBus.gongZoomBy("key", 1)).toBe(true);
    expect(stageBus.gongZoom()).toBeGreaterThan(0);
    stageBus.setGongHere("gong");
    expect(stageBus.gongHere()).toBe(true);
    expect(stageBus.gongPinchStart()).toBe(true);
    stageBus.setGongHere(null);
    expect(stageBus.gongZoom()).toBe(0);
  });

  it("kitar: seret dari sudut yang tampil, dibatasi ±90°, kembali ke depan saat dilepas atau meninggalkan slide", () => {
    stageBus.setGongHere("title");
    stageBus.setOrbitShown(0);
    expect(stageBus.orbitStart()).toBe(true);
    expect(stageBus.orbiting()).toBe(true);
    stageBus.orbitDrag(-300, 1000);
    expect(stageBus.orbitGoal()).toBeCloseTo(45, 9);
    stageBus.orbitDrag(-3000, 1000);
    expect(stageBus.orbitGoal()).toBe(90);
    stageBus.orbitEnd();
    expect(stageBus.orbiting()).toBe(false);
    expect(stageBus.orbitGoal()).toBe(0);
    // kamera masih kembali (tampil 30°): seret baru mulai dari 30°, bukan dari 0
    stageBus.setOrbitShown(30);
    stageBus.orbitStart();
    stageBus.orbitDrag(0, 1000);
    expect(stageBus.orbitGoal()).toBe(30);
    stageBus.setGongHere(null);
    expect(stageBus.orbiting()).toBe(false);
    expect(stageBus.orbitGoal()).toBe(0);
    stageBus.setOrbitShown(0);
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
