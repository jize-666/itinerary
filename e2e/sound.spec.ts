import { expect, type Page, test } from "@playwright/test";
import { json, seedSession, TRIP, tripFixture } from "./helpers";

type Debug = { started: boolean; enabled: boolean; ctx: string; bed: string | null; lastSfx: string | null };
const audioDebug = (page: Page) =>
  page.evaluate(() => (window as unknown as { __lakonAudio?: { debug: () => Debug } }).__lakonAudio?.debug() ?? null);
const pref = (page: Page) => page.evaluate(() => localStorage.getItem("lakon.sound"));

// Tombol Begin muncul setelah kode benar; di sini sesi sudah ada di perangkat.
test.beforeEach(async ({ page }) => {
  await seedSession(page);
  await page.route(TRIP, (r) => json(r, 200, tripFixture("guest")));
});

test("gerbang: satu tombol Begin, toggle speaker sudah ada (bawaan menyala)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Begin the lakon" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Begin quietly|Begin with gamelan/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Gamelan sound" })).toHaveAttribute("aria-pressed", "true");
});

test("mute sebelum mulai: hening, tidak mengunduh audio, pilihan diingat", async ({ page }) => {
  const audioRequests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/audio/")) audioRequests.push(r.url());
  });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Gamelan sound" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(await pref(page)).toBe("off");
  await page.getByRole("button", { name: "Begin the lakon" }).click();
  await expect(page).toHaveURL(/\/film\/$/);
  expect(await pref(page)).toBe("off");
  await expect(page.getByRole("button", { name: "Gamelan sound" })).toHaveAttribute("aria-pressed", "false");
  await page.waitForTimeout(600);
  expect(audioRequests).toEqual([]);
  expect((await audioDebug(page))?.ctx).toBe("none");
});

test("pilihan mute diingat di kunjungan berikutnya", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("lakon.sound", "off"));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Gamelan sound" })).toHaveAttribute("aria-pressed", "false");
});

test("Begin: gamelan langsung berbunyi (Kebo Giro), toggle bisa mematikan", async ({ page }) => {
  await page.goto("/");
  const keboGiro = page.waitForResponse((r) => r.url().endsWith("/audio/gamelan/kebo-giro.mp3"));
  await page.getByRole("button", { name: "Begin the lakon" }).click();
  const res = await keboGiro;
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("audio/mpeg");
  expect(await pref(page)).toBe("on");

  await expect.poll(async () => (await audioDebug(page))?.bed, { timeout: 15_000 }).toBe("kebo-giro");
  expect((await audioDebug(page))?.ctx).toBe("running");

  const toggle = page.getByRole("button", { name: "Gamelan sound" });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(await pref(page)).toBe("off");
  await expect.poll(async () => (await audioDebug(page))?.ctx).toBe("suspended");

  // Nyalakan lagi: konteks berjalan, gendhing yang sama berlanjut.
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await audioDebug(page))?.ctx).toBe("running");
  expect((await audioDebug(page))?.bed).toBe("kebo-giro");
});

test("klik tombol berbunyi saat gamelan menyala (pop/tok), hening setelah di-mute", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Begin the lakon" }).click();
  await expect(page).toHaveURL(/\/film\/$/);
  await expect.poll(async () => (await audioDebug(page))?.bed, { timeout: 15_000 }).toBe("kebo-giro");
  // tombol emas → pop
  await page.getByRole("link", { name: "Open Today" }).click();
  await expect(page).toHaveURL(/\/today\/$/);
  await expect.poll(async () => (await audioDebug(page))?.lastSfx, { timeout: 5_000 }).toBe("ui-pop");
  // sakelar bahasa → tok keprak
  await page.getByRole("button", { name: /Bahasa Indonesia/ }).click();
  await expect.poll(async () => (await audioDebug(page))?.lastSfx, { timeout: 5_000 }).toBe("ui-tok");
  // mute: klik berikutnya tidak berbunyi
  await page.getByRole("button", { name: "Suara gamelan" }).click();
  await expect(page.getByRole("button", { name: "Suara gamelan" })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("link", { name: "Tonton filmnya" }).click(); // tombol kaca → "ui-click" kalau tidak di-mute
  await expect(page).toHaveURL(/\/film\/$/);
  await page.waitForTimeout(300);
  expect((await audioDebug(page))?.lastSfx).toBe("ui-tok");
});
