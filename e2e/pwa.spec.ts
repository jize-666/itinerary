import { expect, test } from "@playwright/test";
import { json, seedSession, TRIP, todayFixture, wib } from "./helpers";

test("Today terbuka dalam mode pesawat setelah kunjungan pertama (FR-33)", async ({ page, context }) => {
  await page.clock.setFixedTime(wib("2027-04-08T10:45:00"));
  await seedSession(page);
  await page.route(TRIP, (r) => json(r, 200, todayFixture()));
  await page.goto("/today/");
  await expect(page.locator(".nn-now")).toContainText("Cloth market");
  await expect(page.locator(".td-status")).toContainText("Updated just now");

  // service worker sudah memasang shell & mengendalikan halaman
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 15_000 }).toBe(true);

  const cached = await page.evaluate(async () => {
    const name = (await caches.keys()).find((k) => k.startsWith("lakon-shell-"));
    return name ? (await (await caches.open(name)).keys()).map((r) => new URL(r.url).pathname) : [];
  });
  expect(cached).toEqual(expect.arrayContaining(["/today/", "/", "/film/", "/manifest.webmanifest"]));
  expect(cached.some((p) => /fraunces-latin-full-normal.*\.woff2$/.test(p))).toBe(true);
  expect(cached.some((p) => /cyrillic/.test(p))).toBe(false);

  await context.setOffline(true);
  await page.unroute(TRIP);
  await page.route(TRIP, (r) => r.abort("internetdisconnected"));
  await page.reload();
  await expect(page.locator(".nn-now")).toContainText("Cloth market");
  await expect(page.locator(".nn-next")).toContainText("Spicy lunch");
  await expect(page.locator(".td-status")).toContainText("Offline · saved");
  await expect(page.locator(".td-status")).toHaveAttribute("data-offline", "");

  // halaman lain di shell juga tersedia
  await page.goto("/film/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("A Three-Day Lakon");
  await context.setOffline(false);
});

test("ganti kode: sesi & salinan data di perangkat ikut dihapus", async ({ page }) => {
  await seedSession(page, "team");
  await page.route(TRIP, (r) => json(r, 200, todayFixture("team")));
  await page.goto("/today/");
  await expect(page.getByRole("heading", { name: "Team notes" })).toBeVisible();
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem("lakon.trip"))) ?? "{}").token).toBe("e2e.team-token-123");
  await page.goto("/");
  await page.getByRole("button", { name: "Use a different code" }).click();
  await expect(page.getByLabel("Booking code")).toBeVisible();
  expect(await page.evaluate(() => [localStorage.getItem("lakon.session"), localStorage.getItem("lakon.trip")])).toEqual([null, null]);
});

test("manifest & ikon Home Screen", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/icons/apple-touch-icon.png");
  const res = await request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);
  const m = await res.json();
  expect(m).toMatchObject({ name: "A Three-Day Lakon", short_name: "Lakon", start_url: "/today/", display: "standalone" });
  expect(JSON.stringify(m)).not.toMatch(/Mira|Herlin|Aprianti|April/);
  for (const icon of m.icons as { src: string; sizes: string; type: string }[]) {
    const r = await request.get(icon.src);
    expect(r.status(), icon.src).toBe(200);
    expect(r.headers()["content-type"]).toContain(icon.type);
  }
  expect((m.icons as { purpose: string }[]).some((i) => i.purpose === "maskable")).toBe(true);
  const sw = await request.get("/sw.js");
  expect(sw.status()).toBe(200);
  expect(sw.headers()["cache-control"]).toBe("no-cache");
});

test("panduan Add to Home Screen: langkah per platform, bisa ditutup & diingat", async ({ page }) => {
  await page.clock.setFixedTime(wib("2027-03-28T09:00:00"));
  await seedSession(page);
  await page.route(TRIP, (r) => json(r, 200, todayFixture()));
  await page.goto("/today/");
  const guide = page.getByRole("complementary", { name: "Keep Today on your Home Screen" });
  await expect(guide).toBeVisible();
  await expect(guide).toContainText("In Safari, tap Share");
  await guide.getByRole("button", { name: "Android" }).click();
  await expect(guide).toContainText("open the ⋮ menu");
  await guide.getByRole("button", { name: "Not now" }).click();
  await expect(guide).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("0 of 2 ready")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Keep Today on your Home Screen" })).toHaveCount(0);
});
