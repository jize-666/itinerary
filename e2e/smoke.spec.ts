import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

test("gate tampil dan halaman tidak bisa diindeks", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kulonuwun?");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("bundle statis tidak memuat data trip", async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "cukup sekali");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(html|js|txt|json)$/.test(f)) files.push(p);
    }
  };
  walk("out");
  expect(files.length).toBeGreaterThan(0);
  // Penanda dari content/trips/solo/trip.ts. Data trip hanya boleh datang dari Edge Function setelah kode akses diverifikasi.
  const markers = ["Tengkleng", "Kemuning", "Candi Cetho", "Sriwedari", "Laweyan", "TJQ"];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const m of markers) expect(text.includes(m), `${m} bocor di ${file}`).toBe(false);
  }
});
