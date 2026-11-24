import { expect, test, type Page } from "@playwright/test";
import { filmFixture, json, seedSession, TRIP } from "./helpers";

/**
 * Hari 3 di panggung 3D (Tugas 11.3): kain mori di gawangan Laweyan. Dunia batik hidup di pembuka hari dan gallery
 * Hari 3, mengikuti gulir maju dan mundur; gong penutup Hari 3 (gong terakhir film) tetap di pendapa dan tetap dipukul.
 * Panggung digambar CPU di e2e, jadi satu tes berjalan satu per satu dengan waktu longgar.
 */
test.describe.configure({ mode: "default", timeout: 180_000 });
test.use({ serviceWorkers: "block" });
const WAIT = { timeout: 35_000 };
const STOPS = ["timlo", "laweyan", "danar-hadi"];

async function prep(p: Page) {
  await seedSession(p);
  await p.addInitScript(() => localStorage.setItem("lakon.clawd", JSON.stringify({ intro: true, tips: [] })));
  const fixture = filmFixture();
  const base = fixture.trip.days.find((d) => d.theme === "lawu")!;
  const day3 = { ...base, n: 3, slug: "day-3", theme: "batik", stops: STOPS.map((id, i) => ({ ...base.stops[i % base.stops.length]!, id })) };
  const departure = fixture.trip.days.find((d) => d.kind === "departure")!;
  fixture.trip.days.splice(fixture.trip.days.indexOf(departure), 0, day3);
  await p.route(TRIP, (r) => json(r, 200, fixture));
  return p.locator("main.film");
}

async function step(p: Page, dir: 1 | -1 = 1) {
  const f = p.locator("main.film");
  const before = await f.getAttribute("data-slide");
  if (dir === 1 && ["title", "hero"].includes((await f.getAttribute("data-kind")) ?? "") && (await f.getAttribute("data-beat")) !== "out") {
    await p.keyboard.press("ArrowDown");
    await expect(f).toHaveAttribute("data-beat", "out", WAIT);
  }
  await p.keyboard.press(dir === 1 ? "ArrowDown" : "ArrowUp");
  await expect(f).not.toHaveAttribute("data-slide", before!, WAIT);
  await expect(f).not.toHaveAttribute("data-moving", "", WAIT);
}

test("dunia batik hidup di pembuka dan gallery Hari 3, maju dan mundur; gong terakhir tetap di pendapa dan dipukul", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const f = await prep(page);
  await page.goto("/film/?stage=low#day-3");
  await expect(f).toHaveAttribute("data-slide", "day-3/title");
  // dunia dimuat sejak judul hari (bab yang memuat slide didahulukan), tetapi judul tetap di pendapa
  await expect(f).toHaveAttribute("data-world-ready", "batik", WAIT);
  await expect(f).toHaveAttribute("data-world", "shared");
  await step(page);
  await expect(f).toHaveAttribute("data-slide", "day-3/intro");
  await expect(f).toHaveAttribute("data-world", "batik", WAIT);
  await expect(f).toHaveAttribute("data-stop-lights", "0");
  for (let i = 0; i < STOPS.length; i++) {
    await step(page);
    await expect(f).toHaveAttribute("data-slide", `day-3/${STOPS[i]}`);
    await expect(f).toHaveAttribute("data-world", "batik");
    await expect(f).toHaveAttribute("data-stop-lights", String(i + 1));
  }
  // gong penutup Hari 3: pendapa bersama, gong dipukul sendiri saat tiba
  const strikes = () => page.evaluate(() => (window as unknown as { __lakonStage?: { strikes: number } }).__lakonStage?.strikes ?? 0);
  const before = await strikes();
  await step(page);
  await expect(f).toHaveAttribute("data-kind", "gong");
  await expect(f).toHaveAttribute("data-world", "shared", WAIT);
  await expect.poll(strikes, WAIT).toBeGreaterThan(before);
  // mundur: kembali ke kain, berurutan
  for (let i = STOPS.length - 1; i >= 0; i--) {
    await step(page, -1);
    await expect(f).toHaveAttribute("data-slide", `day-3/${STOPS[i]}`);
    await expect(f).toHaveAttribute("data-world", "batik", WAIT);
    await expect(f).toHaveAttribute("data-stop-lights", String(i + 1));
  }
  expect(errors).toEqual([]);
});

test("Calm: Hari 3 tetap utuh tanpa panggung 3D", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("lakon.calm", "1"));
  const f = await prep(page);
  await page.goto("/film/?stage=low#day-3");
  await expect(f).toHaveAttribute("data-slide", "day-3/title");
  await step(page);
  await step(page);
  await expect(f).toHaveAttribute("data-slide", "day-3/timlo");
  await expect(page.locator(".fl-canvas canvas")).toHaveCount(0);
  await expect(f).not.toHaveAttribute("data-world", /.+/);
});
