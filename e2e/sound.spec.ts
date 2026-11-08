import { expect, type Page, test } from "@playwright/test";

type Debug = { started: boolean; enabled: boolean; ctx: string; bed: string | null };
const audioDebug = (page: Page) =>
  page.evaluate(() => (window as unknown as { __lakonAudio?: { debug: () => Debug } }).__lakonAudio?.debug() ?? null);
const pref = (page: Page) => page.evaluate(() => localStorage.getItem("lakon.sound"));

test("gerbang menawarkan dua pilihan suara", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Begin with gamelan/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Begin quietly/ })).toBeVisible();
  // Toggle baru muncul setelah memilih.
  await expect(page.getByRole("button", { name: "Gamelan sound" })).toHaveCount(0);
});

test("Begin quietly: hening, tidak mengunduh audio, pilihan diingat", async ({ page }) => {
  const audioRequests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/audio/")) audioRequests.push(r.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Begin quietly/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sugeng rawuh.");
  expect(await pref(page)).toBe("off");
  const toggle = page.getByRole("button", { name: "Gamelan sound" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await page.waitForTimeout(600);
  expect(audioRequests).toEqual([]);
  expect((await audioDebug(page))?.ctx).toBe("none");
});

test("Begin with gamelan: Kebo Giro diputar, toggle bisa mematikan", async ({ page }) => {
  await page.goto("/");
  const keboGiro = page.waitForResponse((r) => r.url().endsWith("/audio/gamelan/kebo-giro.mp3"));
  await page.getByRole("button", { name: /Begin with gamelan/ }).click();
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
