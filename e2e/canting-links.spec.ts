import { expect, type Page, test } from "@playwright/test";
import { filmFixture, json, seedSession, todayFixture, TRIP, wib } from "./helpers";

test.use({
  launchOptions: {
    ...(process.env.DIORAMA_CHROMIUM ? { executablePath: process.env.DIORAMA_CHROMIUM } : {}),
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      ...(process.env.DIORAMA_CHROMIUM ? ["--no-zygote", "--in-process-gpu"] : []),
    ],
  },
});

/**
 * Tautan masuk ke halaman membatik (/canting/) dari film, Today, dan maket. Data tiruan; id tempat "walk"
 * diganti jadi id bengkel batik supaya pemetaan ikut teruji.
 */
type Day = { stops: { id: string }[] };
const rename = (data: { trip: { days: Day[] } }, from: string, to: string) => {
  for (const day of data.trip.days) for (const s of day.stops) if (s.id === from) s.id = to;
  return data;
};

const film = (page: Page) => page.locator("main.film");
const slide = (page: Page) => film(page).getAttribute("data-slide");
const index = async (page: Page) => Number(await film(page).getAttribute("data-index"));

async function openFilm(page: Page, hash: string) {
  await seedSession(page);
  await page.route(TRIP, (r) => json(r, 200, rename(filmFixture("guest") as never, "walk", "laweyan")));
  await page.goto(`/film/${hash}`);
  await expect(film(page)).toBeVisible();
  await expect(film(page)).not.toHaveAttribute("data-moving", "");
}

async function goTo(page: Page, id: string) {
  for (let i = 0; i < 40 && (await slide(page)) !== id; i++) {
    const kind = await film(page).getAttribute("data-kind");
    if ((kind === "title" || kind === "hero") && (await film(page).getAttribute("data-beat")) !== "out") {
      await page.keyboard.press("ArrowDown");
      await expect(film(page)).toHaveAttribute("data-beat", "out");
    }
    const before = await index(page);
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => index(page)).toBe(before + 1);
    await expect(film(page)).not.toHaveAttribute("data-moving", "");
  }
  expect(await slide(page)).toBe(id);
}

test.describe("tautan ke membatik", () => {
  test("gallery: kartu bengkel batik membawa ke /canting/, kartu lain tanpa tautan", async ({ page }) => {
    await openFilm(page, "#day-1");
    await goTo(page, "day-1/laweyan");
    const cur = page.locator(".fl-layer[data-pos='cur'] .gal-card[data-cur]");
    const link = cur.locator("a[data-canting]");
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute("href", "/canting/");
    await expect(link).toContainText("Draw your own batik");
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(page.locator(".fl-layer[data-pos='cur'] .gal-card[data-side='next'] a[data-canting]")).toHaveCount(0);
    await link.click();
    await expect(page).toHaveURL(/\/canting\/$/);
    await expect(page.locator(".curtain")).toHaveAttribute("data-state", "open", { timeout: 5_000 });
  });

  test("gallery: kartu tanpa pemetaan tidak punya tautan", async ({ page }) => {
    await openFilm(page, "#day-1");
    await goTo(page, "day-1/market");
    await expect(page.locator(".fl-layer[data-pos='cur'] .gal-card[data-cur] a[data-canting]")).toHaveCount(0);
  });

  test("Today: stop bengkel batik membawa ke /canting/, stop lain tidak", async ({ page }) => {
    await page.clock.setFixedTime(wib("2027-04-08T10:45:00"));
    await seedSession(page);
    await page.route(TRIP, (r) => json(r, 200, rename(todayFixture("guest") as never, "walk", "laweyan")));
    await page.goto("/today/");
    const links = page.locator(".tl-stop a[data-canting]");
    await expect(links).toHaveCount(1);
    await expect(links).toHaveAttribute("href", "/canting/");
    await expect(page.locator(".tl-stop", { hasText: "Cloth market" }).locator("a[data-canting]")).toHaveCount(0);
    await links.click();
    await expect(page).toHaveURL(/\/canting\/$/);
    await expect(page.locator(".curtain")).toHaveAttribute("data-state", "open", { timeout: 5_000 });
  });
});

test.describe("tautan membatik di maket", () => {
  test.setTimeout(150_000);

  async function visit(p: Page, lokasi?: string) {
    await seedSession(p);
    await p.goto("/diorama/?q=low" + (lokasi ? `&lokasi=${lokasi}` : ""));
    await expect(p.locator(".dio-root")).toHaveAttribute("data-ready", "true", { timeout: 60_000 });
  }

  test("hanya panel bengkel batik yang membawa tautan, dan klik membuka /canting/", async ({ page }) => {
    await visit(page, "pasar");
    await expect(page.locator("a[data-canting]")).toHaveCount(0);
    await page.goto("/diorama/?q=low&lokasi=laweyan");
    await expect(page.locator(".dio-root")).toHaveAttribute("data-ready", "true", { timeout: 60_000 });
    const link = page.locator(".dio-caption a[data-canting]");
    await expect(link).toHaveCount(1, { timeout: 15_000 });
    await expect(link).toHaveAttribute("href", "/canting/");
    await link.click();
    await expect(page).toHaveURL(/\/canting\/$/);
  });
});
