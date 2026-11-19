import { expect, type Page, test } from "@playwright/test";
import { filmFixture, json, seedSession, todayFixture, TRIP, wib } from "./helpers";

/**
 * Tautan masuk ke maket (/diorama/) dari film dan Today. Data tiruan; id tempat "walk" diganti jadi id asli
 * supaya pemetaan tempat singgah → lokasi maket ikut teruji ("market" tetap tanpa maket).
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
  await page.route(TRIP, (r) => json(r, 200, rename(filmFixture("guest") as never, "walk", "mangkunegaran")));
  await page.goto(`/film/${hash}`);
  await expect(film(page)).toBeVisible();
  await expect(film(page)).not.toHaveAttribute("data-moving", "");
}

/** Maju satu per satu dengan keyboard sampai slide ber-id tertentu (tahap gong judul/hero dilewati). */
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

test.describe("tautan ke maket", () => {
  test("slide rute: tautan membuka /diorama/", async ({ page }) => {
    await openFilm(page, "");
    await goTo(page, "route");
    const link = page.locator(".fl-layer[data-pos='cur'] a[data-diorama='umum']");
    await expect(link).toHaveAttribute("href", "/diorama/");
    await expect(link).toContainText("Explore Solo in miniature");
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await link.click();
    await expect(page).toHaveURL(/\/diorama\/$/);
  });

  test("gallery: kartu yang punya lokasi membawa ke /diorama/?lokasi=…, kartu lain tanpa tautan", async ({ page }) => {
    await openFilm(page, "#day-1");
    await goTo(page, "day-1/mangkunegaran");
    const cur = page.locator(".fl-layer[data-pos='cur'] .gal-card[data-cur]");
    const link = cur.locator("a[data-diorama]");
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute("href", "/diorama/?lokasi=pendhapa");
    await expect(link).toContainText("See it in the miniature");
    // kartu tetangga (pasar kain, tanpa maket) tidak membawa tautan
    await expect(page.locator(".fl-layer[data-pos='cur'] .gal-card[data-side='next'] a[data-diorama]")).toHaveCount(0);
    await link.click();
    await expect(page).toHaveURL(/\/diorama\/\?lokasi=pendhapa$/);
  });

  test("gallery: kartu tanpa lokasi tidak punya tautan (tombol lain tetap ada)", async ({ page }) => {
    await openFilm(page, "#day-1");
    await goTo(page, "day-1/market");
    await expect(page.locator(".fl-layer[data-pos='cur'] .gal-card[data-cur] a[data-diorama]")).toHaveCount(0);
    await expect(page.locator(".fl-layer[data-pos='cur'] .gal-card[data-cur] .gal-acts")).toBeVisible();
  });

  test("Today: stop yang punya lokasi membawa ke maket, stop lain tidak", async ({ page }) => {
    await page.clock.setFixedTime(wib("2027-04-08T10:45:00"));
    await seedSession(page);
    await page.route(TRIP, (r) => json(r, 200, rename(todayFixture("guest") as never, "walk", "laweyan")));
    await page.goto("/today/");
    const links = page.locator(".tl-stop a[data-diorama]");
    await expect(links).toHaveCount(1);
    await expect(links).toHaveAttribute("href", "/diorama/?lokasi=laweyan");
    await expect(page.locator(".tl-stop", { hasText: "Cloth market" }).locator("a[data-diorama]")).toHaveCount(0);
    await links.click();
    await expect(page).toHaveURL(/\/diorama\/\?lokasi=laweyan$/);
  });
});
