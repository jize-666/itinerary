/**
 * Izin sensor gerak di iPhone (look.ts). Laporan host 20 Nov (iPhone produksi): "izin akses gerakan sering tidak
 * muncul". Safari hanya menampilkan permintaan izin bila `requestPermission()` dipanggil di dalam gesture yang sah;
 * bila tidak (mis. sentuhan pertama berupa geser), janji ditolak dengan NotAllowedError tanpa dialog.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Listener = (e: unknown) => void;

function fakeWindow() {
  const listeners = new Map<string, Set<Listener>>();
  return {
    listeners,
    count: (type: string) => listeners.get(type)?.size ?? 0,
    fire: (type: string, e: unknown = {}) => [...(listeners.get(type) ?? [])].forEach((fn) => fn(e)),
    win: {
      addEventListener: (type: string, fn: Listener) => void (listeners.get(type) ?? listeners.set(type, new Set()).get(type)!).add(fn),
      removeEventListener: (type: string, fn: Listener) => void listeners.get(type)?.delete(fn),
      matchMedia: () => ({ matches: false }),
      innerWidth: 390,
      innerHeight: 844,
    },
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));
const notAllowed = () => Object.assign(new Error("Requesting device orientation access requires a user gesture to prompt"), { name: "NotAllowedError" });

describe("izin sensor gerak di iPhone (look.ts)", () => {
  let w: ReturnType<typeof fakeWindow>;
  let requestPermission: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules(); // status izin hidup di modul: tiap tes = halaman baru
    w = fakeWindow();
    requestPermission = vi.fn();
    vi.stubGlobal("window", w.win);
    vi.stubGlobal("DeviceOrientationEvent", { requestPermission });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sentuhan yang bukan gesture sah (geser) tidak menghabiskan kesempatan: sentuhan berikutnya meminta lagi", async () => {
    requestPermission.mockRejectedValueOnce(notAllowed()).mockResolvedValueOnce("granted");
    const { startLook } = await import("@/components/film/look");
    startLook();
    w.fire("touchend"); // geser slide: Safari menolak tanpa dialog
    await flush();
    expect(w.count("deviceorientation")).toBe(0);
    w.fire("touchend"); // ketukan: dialog izin muncul, tamu mengizinkan
    await flush();
    expect(requestPermission).toHaveBeenCalledTimes(2);
    expect(w.count("deviceorientation")).toBe(1);
  });

  it("izin yang sudah diberikan tetap berlaku sesudah pindah halaman (film → Today): kemiringan didengarkan lagi tanpa meminta ulang", async () => {
    requestPermission.mockResolvedValue("granted");
    const { startLook } = await import("@/components/film/look");
    const stopFilm = startLook();
    w.fire("touchend");
    await flush();
    expect(w.count("deviceorientation")).toBe(1);
    stopFilm(); // film dilepas (pemakai terakhir)
    expect(w.count("deviceorientation")).toBe(0);
    startLook(); // Today dipasang
    expect(w.count("deviceorientation")).toBe(1);
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it("tamu menolak: tidak ditanya lagi di setiap sentuhan", async () => {
    requestPermission.mockResolvedValue("denied");
    const { startLook } = await import("@/components/film/look");
    startLook();
    w.fire("touchend");
    await flush();
    w.fire("touchend");
    await flush();
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(w.count("deviceorientation")).toBe(0);
  });

  it("dua sentuhan cepat sebelum jawaban datang: satu permintaan saja", async () => {
    let answer: (s: string) => void = () => {};
    requestPermission.mockReturnValue(new Promise((r) => (answer = r)));
    const { startLook } = await import("@/components/film/look");
    startLook();
    w.fire("touchend");
    w.fire("touchend");
    answer("granted");
    await flush();
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(w.count("deviceorientation")).toBe(1);
  });

  it("pindah halaman saat permintaan masih menunggu: halaman baru mendengarkan begitu tamu mengizinkan", async () => {
    let answer: (s: string) => void = () => {};
    requestPermission.mockReturnValue(new Promise((r) => (answer = r)));
    const { startLook } = await import("@/components/film/look");
    const stopFilm = startLook();
    w.fire("touchend");
    stopFilm();
    startLook(); // Today dipasang sebelum jawaban datang
    answer("granted");
    await flush();
    expect(w.count("deviceorientation")).toBe(1);
    expect(w.count("touchend")).toBe(0);
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it("halaman dilepas sebelum jawaban datang: tidak ada pendengar yang tertinggal", async () => {
    let answer: (s: string) => void = () => {};
    requestPermission.mockReturnValue(new Promise((r) => (answer = r)));
    const { startLook } = await import("@/components/film/look");
    const stop = startLook();
    w.fire("touchend");
    stop();
    answer("granted");
    await flush();
    expect(w.count("deviceorientation")).toBe(0);
  });
});
