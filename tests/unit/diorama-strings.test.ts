import { describe, expect, it } from "vitest";
import { directions, locationContent, scenes, strings, tr } from "@/engine/diorama/strings";

describe("diorama interface copy", () => {
  it("gives every control, landmark, scene, and compass view a nonempty English and Indonesian label", () => {
    const entries = [
      ...Object.entries(strings),
      ...Object.entries(locationContent).flatMap(([id, record]) =>
        Object.entries(record).map(([field, value]) => [`${id}.${field}`, value] as const),
      ),
      ...scenes.map((value, index) => [`scene ${index}`, value] as const),
      ...directions.map((value, index) => [`direction ${index}`, value] as const),
    ];
    for (const [name, pair] of entries) {
      expect(pair.en.trim().length, `${name}.en`).toBeGreaterThan(0);
      expect(pair.id.trim().length, `${name}.id`).toBeGreaterThan(0);
    }
  });

  it("selects the language the page passes to the module", () => {
    expect(tr("id", "allPhotos")).toBe("Potret semua sisi");
    expect(tr("en", "allPhotos")).toBe("Photo all sides");
  });

  it("uses the requested cultural names and identifies the invented Laweyan textile", () => {
    expect(locationContent.pendhapa.name.id).toBe("Pendhapa Ageng, Pura Mangkunegaran");
    expect(locationContent.pendhapa.name.en).toBe(locationContent.pendhapa.name.id);
    expect(locationContent.pasar.name.en).toBe("Pasar Gede");
    expect(locationContent.laweyan.name).toEqual({
      en: "Laweyan Batik Quarter",
      id: "Kampung Batik Laweyan",
    });
    expect(locationContent.laweyan.description.en).toContain("designed for this miniature");
    expect(locationContent.laweyan.description.id).toContain("orisinal");
  });

  it("lists all still poses and names each compass view in export order", () => {
    expect(scenes).toHaveLength(6);
    expect(directions.map((value) => value.en)).toEqual([
      "North",
      "North-east",
      "East",
      "South-east",
      "South",
      "South-west",
      "West",
      "North-west",
      "Top",
    ]);
    expect(directions.map((value) => value.id)).toEqual([
      "Utara",
      "Timur Laut",
      "Timur",
      "Tenggara",
      "Selatan",
      "Barat Daya",
      "Barat",
      "Barat Laut",
      "Atas",
    ]);
  });
});
