import { describe, expect, it } from "vitest";
import { cantingFor, CANTING_HREF } from "@/engine/slides/canting-link";

describe("tautan ke halaman membatik", () => {
  it("hanya bengkel batik yang punya tautan", () => {
    expect(cantingFor("laweyan")).toBe(true);
    expect(cantingFor("mangkunegaran")).toBe(false);
    expect(cantingFor("walk")).toBe(false);
    expect(cantingFor("")).toBe(false);
  });

  it("nama bawaan objek bukan tempat singgah", () => {
    expect(cantingFor("constructor")).toBe(false);
    expect(cantingFor("toString")).toBe(false);
  });

  it("href memakai garis miring penutup (trailingSlash)", () => {
    expect(CANTING_HREF).toBe("/canting/");
  });
});
