import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import * as diorama from "../src/engine/diorama/strings";
import { FUTURE, json, TRIP, tripFixture, VERIFY } from "./helpers";

/**
 * Pengecualian keputusan host 19 Nov ("Terima, kecualikan diorama"): diorama `/diorama/` memuat nama landmark publik
 * (Pendhapa Ageng, Pasar Gede, Laweyan) di bundle. Hanya teks diorama yang memuat "Laweyan" yang dikecualikan, diambil
 * langsung dari modul teksnya, dan hanya sebagai literal string utuh berikut tanda kutipnya (`"Laweyan"` milik diorama
 * terhapus, `"Batik class in Laweyan"` tidak). Penanda lain tetap diperiksa di semua berkas.
 */
const DIORAMA_TEXTS = (() => {
  const found = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === "string") {
      if (v.includes("Laweyan")) found.add(v);
    } else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(diorama);
  return [...found].sort((a, b) => b.length - a.length);
})();

test("gate tampil dan halaman tidak bisa diindeks", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kulonuwun?");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("header produksi: noindex, CSP, tanpa framing", async ({ page }) => {
  for (const path of ["/", "/today/", "/audio/sfx/gong-ageng.mp3"]) {
    const h = (await page.request.get(path)).headers();
    expect(h["x-robots-tag"], path).toContain("noindex");
    expect(h["content-security-policy"], path).toContain("connect-src 'self' https://qanjzavzbisvpmeihqee.supabase.co");
    expect(h["x-frame-options"], path).toBe("DENY");
  }
});

test("CSP tidak memblokir apa pun di alur utama", async ({ page }) => {
  const blocked: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) blocked.push(m.text());
  });
  await page.route(VERIFY, (r) => json(r, 200, { token: "tok.guest-abcdef", role: "guest", exp: FUTURE }));
  await page.route(TRIP, (r) => json(r, 200, tripFixture("guest")));
  await page.goto("/");
  await page.getByLabel("Booking code").fill("ABC123XYZ");
  const audio = page.waitForResponse((r) => r.url().endsWith("/kebo-giro.mp3"));
  await page.getByRole("button", { name: "Begin the lakon" }).click();
  await audio;
  await page.getByRole("link", { name: "Open Today" }).click();
  await expect(page.getByRole("heading", { level: 4, name: "Morning walk" })).toBeVisible();
  expect(blocked).toEqual([]);
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
    let text = readFileSync(file, "utf8");
    for (const t of DIORAMA_TEXTS) text = text.split(JSON.stringify(t)).join("");
    for (const m of markers) expect(text.includes(m), `${m} bocor di ${file}`).toBe(false);
  }
});
