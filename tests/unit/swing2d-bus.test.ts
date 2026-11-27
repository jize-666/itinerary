import { describe, expect, it, vi } from "vitest";
import { type PassSample, stageBus } from "@/engine/stage/bus";

const sample: PassSample = { id: 1, x: 0, y: 0, time: 0, viewportWidth: 100, viewportHeight: 100 };
const handlers = (accept: boolean) => ({ down: vi.fn(() => accept), move: vi.fn(() => true), up: vi.fn(() => true), key: vi.fn(() => accept) });

describe("stageBus: tiket DOM (slot kedua)", () => {
  it("tiket 3D didahulukan; tiket DOM hanya bila 3D menolak", () => {
    const three = handlers(true);
    const flat = handlers(true);
    const off3 = stageBus.bindPass(three);
    const offFlat = stageBus.bindPassFlat(flat);
    expect(stageBus.passDown(sample)).toBe(true);
    expect(flat.down).not.toHaveBeenCalled();
    stageBus.passMove(sample);
    stageBus.passUp(sample, false);
    expect(three.move).toHaveBeenCalledTimes(1);
    expect(three.up).toHaveBeenCalledTimes(1);
    expect(flat.move).not.toHaveBeenCalled();
    off3();
    offFlat();
  });

  it("3D menolak: tiket DOM memiliki pointer sampai up; gerak sesudah up tidak diteruskan", () => {
    const three = handlers(false);
    const flat = handlers(true);
    const off3 = stageBus.bindPass(three);
    const offFlat = stageBus.bindPassFlat(flat);
    expect(stageBus.passDown(sample)).toBe(true);
    stageBus.passMove(sample);
    expect(flat.move).toHaveBeenCalledTimes(1);
    expect(three.move).not.toHaveBeenCalled();
    stageBus.passUp(sample, false);
    expect(flat.up).toHaveBeenCalledTimes(1);
    expect(stageBus.passMove(sample)).toBe(false);
    expect(stageBus.passKey("Enter", false)).toBe(true);
    expect(flat.key).toHaveBeenCalledTimes(1);
    off3();
    offFlat();
  });

  it("tanpa pegangan apa pun: false", () => {
    expect(stageBus.passDown(sample)).toBe(false);
    expect(stageBus.passKey("Enter", false)).toBe(false);
  });
});
