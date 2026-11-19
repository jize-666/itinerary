import { describe, expect, it } from "vitest";
import { dioramaFor, dioramaHref } from "@/engine/slides/diorama-link";

describe("tautan ke maket", () => {
  it("memetakan tempat singgah ke lokasi maket", () => {
    expect(dioramaFor("mangkunegaran")).toBe("pendhapa");
    expect(dioramaFor("pasar-gede")).toBe("pasar");
    expect(dioramaFor("laweyan")).toBe("laweyan");
  });

  it("tempat lain dan nama bawaan objek tidak punya lokasi", () => {
    expect(dioramaFor("walk")).toBeNull();
    expect(dioramaFor("")).toBeNull();
    expect(dioramaFor("constructor")).toBeNull();
    expect(dioramaFor("toString")).toBeNull();
  });

  it("href memakai garis miring penutup (trailingSlash)", () => {
    expect(dioramaHref()).toBe("/diorama/");
    expect(dioramaHref("pasar")).toBe("/diorama/?lokasi=pasar");
    expect(dioramaHref("pendhapa")).toBe("/diorama/?lokasi=pendhapa");
  });
});
