import { expect, test, type Page } from "@playwright/test";
import { filmFixture, json, seedSession, TRIP } from "./helpers";

/**
 * Suara membatik dan kenang-kenangan kain (Tugas 11.4): `/canting/` berbunyi dan menyimpan JPEG di IndexedDB,
 * epilog film menampilkannya, Hari 3 berbunyi mengikuti gulir. WebGL digambar CPU, jadi waktu dibuat longgar.
 */
test.describe.configure({ mode: "default", timeout: 180_000 });
test.use({
  serviceWorkers: "block",
  launchOptions: {
    ...(process.env.DIORAMA_CHROMIUM ? { executablePath: process.env.DIORAMA_CHROMIUM } : {}),
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required", ...(process.env.DIORAMA_CHROMIUM ? ["--no-zygote", "--in-process-gpu"] : [])],
  },
});
const WAIT = { timeout: 35_000 };
const STOPS = ["timlo", "laweyan", "danar-hadi"];

type Snd = { peak: { wax: number; water: number; boil: number }; shots: { drip: number; splash: number; blub: number; sizzle: number }; live: number };
const snd = (p: Page) => p.evaluate(() => (window as unknown as { __lakonBatikSound?: Snd }).__lakonBatikSound ?? null);
const peak = async (p: Page, k: "wax" | "water" | "boil") => (await snd(p))?.peak[k] ?? 0;

async function soundOn(p: Page) {
  const b = p.getByRole("button", { name: "Gamelan sound" });
  await expect(b).toBeVisible(WAIT);
  if ((await b.getAttribute("aria-pressed")) !== "true") await b.click();
  await expect(b).toHaveAttribute("aria-pressed", "true");
}

async function prepFilm(p: Page, opts: { batik?: boolean } = {}) {
  await seedSession(p);
  await p.addInitScript(() => {
    try {
      localStorage.setItem("lakon.lang", "en");
      localStorage.setItem("lakon.clawd", JSON.stringify({ intro: true, tips: [] }));
    } catch {}
  });
  const fixture = filmFixture();
  if (opts.batik) {
    const base = fixture.trip.days.find((d) => d.theme === "lawu")!;
    const day3 = { ...base, n: 3, slug: "day-3", theme: "batik", stops: STOPS.map((id, i) => ({ ...base.stops[i % base.stops.length]!, id })) };
    const departure = fixture.trip.days.find((d) => d.kind === "departure")!;
    fixture.trip.days.splice(fixture.trip.days.indexOf(departure), 0, day3);
  }
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

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "desktop", "cukup di desktop");
});

test("/canting/ demo berbunyi, menyimpan kain, dan epilog film menampilkannya", async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSession(page);
  await page.addInitScript(() => {
    try {
      localStorage.setItem("lakon.lang", "en");
    } catch {}
  });
  await page.goto("/canting/?q=lite&demo=1");
  await expect(page.locator("main.cnt-root")).toHaveAttribute("data-ready", "true", { timeout: 60_000 });
  await soundOn(page);
  await page.waitForFunction(() => (window as unknown as { __lakonCanting?: { kept?: boolean } }).__lakonCanting?.kept === true, null, { timeout: 200_000, polling: 500 });
  const s = (await snd(page))!;
  expect(s.peak.wax).toBeGreaterThan(0);
  expect(s.peak.water).toBeGreaterThan(0);
  expect(s.peak.boil).toBeGreaterThan(0);
  expect(s.shots.drip).toBeGreaterThan(0);
  expect(s.shots.splash).toBeGreaterThan(0);
  const rec = await page.evaluate(
    () =>
      new Promise<{ v: number; type: string; len: number; width: number; height: number; at: number } | null>((resolve) => {
        const open = indexedDB.open("lakon");
        open.onerror = () => resolve(null);
        open.onsuccess = () => {
          const db = open.result;
          const get = db.transaction("keepsake").objectStore("keepsake").get("batik");
          get.onsuccess = () => {
            const r = get.result;
            db.close();
            resolve(r ? { v: r.v, type: r.type, len: r.bytes.byteLength, width: r.width, height: r.height, at: r.at } : null);
          };
          get.onerror = () => resolve(null);
        };
      }),
  );
  expect(rec).not.toBeNull();
  expect(rec).toMatchObject({ v: 1, type: "image/jpeg", width: 1280, height: 800 });
  expect(rec!.len).toBeGreaterThan(1000);
  expect(rec!.at).toBeGreaterThan(0);

  // konteks sama: IndexedDB bertahan, film membacanya di epilog
  await prepFilm(page);
  await page.goto("/film/?stage=static#epilogue");
  const f = page.locator("main.film");
  await expect(f).toHaveAttribute("data-slide", "epilogue", WAIT);
  const img = page.locator(".fs-cloth img");
  await expect(img).toBeVisible(WAIT);
  await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth), WAIT).toBe(1280);
  await expect(page.locator("figure.fs-cloth")).toContainText("Your own batik");
  expect(errors).toEqual([]);
});

test("epilog tanpa kain tersimpan: judul tampil, tidak ada .fs-cloth", async ({ page }) => {
  const f = await prepFilm(page);
  await page.goto("/film/?stage=static#epilogue");
  await expect(f).toHaveAttribute("data-slide", "epilogue", WAIT);
  await expect(page.getByText("Until next time.")).toBeVisible(WAIT);
  await page.waitForTimeout(1500);
  await expect(page.locator(".fs-cloth")).toHaveCount(0);
});

test("Hari 3 dengan suara: desis, gemericik, dan didih mengikuti gulir; lepas saat keluar", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const f = await prepFilm(page, { batik: true });
  await page.goto("/film/?stage=static#day-3");
  await expect(f).toHaveAttribute("data-slide", "day-3/title", WAIT);
  await soundOn(page);
  await step(page);
  await expect(f).toHaveAttribute("data-slide", "day-3/intro");
  await step(page); // pembuka → panel pertama: sungai tergores
  await expect(f).toHaveAttribute("data-slide", `day-3/${STOPS[0]}`);
  await expect.poll(() => peak(page, "wax"), WAIT).toBeGreaterThan(0);
  for (let i = 1; i < STOPS.length; i++) {
    await step(page);
    await expect(f).toHaveAttribute("data-slide", `day-3/${STOPS[i]}`);
  }
  await expect.poll(() => peak(page, "water"), WAIT).toBeGreaterThan(0);
  await step(page); // gong terakhir: lorod
  await expect(f).toHaveAttribute("data-kind", "gong");
  await expect.poll(() => peak(page, "boil"), WAIT).toBeGreaterThan(0);
  while ((await f.getAttribute("data-slide")) !== "epilogue") await step(page);
  await expect.poll(async () => (await snd(page))?.live ?? 0, { timeout: 15_000 }).toBe(0);
  expect(errors).toEqual([]);
});

test("Hari 3 tanpa suara: tidak ada objek suara membatik", async ({ page }) => {
  const f = await prepFilm(page, { batik: true });
  await page.goto("/film/?stage=static#day-3");
  await expect(f).toHaveAttribute("data-slide", "day-3/title", WAIT);
  const b = page.getByRole("button", { name: "Gamelan sound" });
  await expect(b).toBeVisible(WAIT);
  if ((await b.getAttribute("aria-pressed")) === "true") await b.click();
  await expect(b).toHaveAttribute("aria-pressed", "false");
  await step(page);
  await step(page);
  await step(page);
  await page.waitForTimeout(1000);
  expect(await snd(page)).toBeNull();
});
