import { expect, test, type Page } from "@playwright/test";
import { filmFixture, json, seedSession, TRIP } from "./helpers";
test.describe.configure({ mode: "default", timeout: 180000 });
test.use({ serviceWorkers: "block" });
const stateWait = { timeout: 35000 };
const markers = [
  "depart-lawu",
  "kemuning-sunrise",
  "tea-house",
  "candi-cetho",
  "candi-sukuh",
  "friday-prayer",
  "tawangmangu-lunch",
  "grojogan-sewu",
  "rest-2",
  "selat-solo",
  "movie-night",
];
async function prep(p: Page) {
  await seedSession(p);
  const fixture = filmFixture(),
    day = fixture.trip.days.find((d) => d.theme === "lawu")!;
  day.stops = markers.map((id, i) => ({ ...day.stops[i % 2]!, id }));
  const departure = fixture.trip.days.find((d) => d.kind === "departure")!;
  fixture.trip.days.splice(fixture.trip.days.indexOf(departure), 0, { ...day, n: 3, slug: "day-3", theme: "batik" });
  await p.route(TRIP, (r) => json(r, 200, fixture));
  return p.locator("main.film");
}
async function next(p: Page, dir = 1) {
  const f = p.locator(".film");
  await expect(f).toHaveAttribute("data-slide", /.+/);
  const before = await f.getAttribute("data-slide");
  if (dir === 1 && (await f.getAttribute("data-kind")) === "title" && (await f.getAttribute("data-beat")) !== "out") {
    await p.keyboard.press("ArrowDown");
    await expect(f).toHaveAttribute("data-beat", "out");
  }
  await p.keyboard.press(dir === 1 ? "ArrowDown" : "ArrowUp");
  await expect(f).not.toHaveAttribute("data-slide", before!, stateWait);
  await expect(f).not.toHaveAttribute("data-moving", "", stateWait);
}
test("every stop lights in sequence, reverses, and keeps the two neighbouring chapters", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const f = await prep(page);
  await page.goto("/film/?stage=high#day-2");
  await expect(f).toHaveAttribute("data-world-ready", "lawu", { timeout: 35000 });
  await expect(f).toHaveAttribute("data-relief", "dem");
  await next(page);
  await next(page);
  for (let i = 0; i < markers.length; i++) {
    await expect(f).toHaveAttribute("data-stop-lights", String(i + 1));
    await expect(f).toHaveAttribute("data-slide", "day-2/" + markers[i]);
    if (i < 10) await next(page);
  }
  for (let i = 9; i >= 0; i--) {
    await next(page, -1);
    await expect(f).toHaveAttribute("data-stop-lights", String(i + 1));
  }
  // bab tetangga tidak pernah memakai dunia Lawu: Hari 1 di panggung bersama, Hari 3 di dunianya sendiri (batik, 11.3)
  for (const [ch, own] of [
    ["day-1", "shared"],
    ["day-3", "batik"],
  ] as const) {
    await page.goto("/film/?stage=high#" + ch);
    await expect(f).toHaveAttribute("data-world", "shared", { timeout: 25000 });
    await next(page);
    await next(page);
    await expect(f).toHaveAttribute("data-world", own, { timeout: 25000 });
    await expect(f).not.toHaveAttribute("data-world-ready", "lawu");
  }
  expect(errors).toEqual([]);
});
test("pixel wheel holds the actual camera at partial travel and can return to the starting panel", async ({ page }) => {
  const f = await prep(page);
  await page.goto("/film/?stage=high#day-2");
  await expect(f).toHaveAttribute("data-world-ready", "lawu", { timeout: 35000 });
  await next(page);
  await next(page);
  await next(page);
  const camera = () => page.evaluate(() => window.__lakonStage?.camera);
  const before = await camera();
  await f.dispatchEvent("wheel", { deltaY: 75, deltaMode: 0 });
  await expect(f).toHaveAttribute("data-moving", "");
  await expect.poll(camera).not.toEqual(before);
  await page.waitForTimeout(240);
  const held = (await camera())!;
  await page.waitForTimeout(480);
  // held = no visible travel: each axis within 1 µm (exact float equality flaked on a 1e-10 m settle tail)
  const after = (await camera())!;
  expect(after).toHaveLength(held.length);
  after.forEach((v, i) => expect(v).toBeCloseTo(held[i]!, 6));
  await f.dispatchEvent("wheel", { deltaY: -75, deltaMode: 0 });
  await expect(f).not.toHaveAttribute("data-moving", "", stateWait);
  await expect(f).toHaveAttribute("data-slide", "day-2/kemuning-sunrise");
});
test("unavailable DEM keeps mountain, lights and cards accessible", async ({ page }) => {
  await page.route("**/stage/lawu/relief.bin", (r) => r.abort("failed"));
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const f = await prep(page);
  await page.goto("/film/?stage=high#day-2");
  await expect(f).toHaveAttribute("data-relief", "procedural", { timeout: 35000 });
  await next(page);
  await next(page);
  await expect(f).toHaveAttribute("data-world", "lawu");
  expect(errors).toEqual([]);
});
for (const mode of ["static", "calm", "reduced", "no-webgl"])
  test(`layered mountain in ${mode}`, async ({ page }) => {
    if (mode === "calm") await page.addInitScript(() => localStorage.setItem("lakon.calm", "1"));
    if (mode === "reduced") await page.emulateMedia({ reducedMotion: "reduce" });
    if (mode === "no-webgl")
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, name: string, ...args: unknown[]) {
          return name.includes("webgl") ? null : Reflect.apply(original, this, [name, ...args]);
        } as typeof original;
      });
    let requests = 0;
    page.on("request", (r) => {
      if (r.url().includes("/stage/lawu/relief.bin")) requests++;
    });
    await prep(page);
    await page.goto(`/film/?stage=${mode === "static" ? "static" : "high"}#day-2`);
    await next(page);
    await expect(page.locator("[data-lawu-flat]")).toBeVisible();
    await expect(page.locator(".fl-canvas")).toHaveCount(0);
    expect(requests).toBe(0);
  });
test("rendering contexts are released after repeated client navigations", async ({ page }) => {
  const f = await prep(page);
  await page.goto("/film/?stage=high#day-2");
  for (let i = 0; i < 3; i++) {
    await expect(f).toHaveAttribute("data-world-ready", "lawu", { timeout: 45000 });
    await page.evaluate(() =>
      Object.assign(window, { previousLawuGL: document.querySelector("canvas")?.getContext("webgl2") }),
    );
    await page.locator('a[href="/today/"],a[href="/today"]').first().click();
    await page.waitForURL("**/today/");
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            (window as unknown as { previousLawuGL: WebGL2RenderingContext }).previousLawuGL?.isContextLost(),
          ),
        { timeout: 15000 },
      )
      .toBe(true);
    if (i < 2) await page.goBack();
  }
});

test("switching on sound at Grojogan starts the live waterfall, and muting stops its source", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("lakon.sound", "off");
    const counts = { play: 0, stop: 0 };
    Object.assign(window, { lawuSoundCounts: counts });
    const type = AudioBufferSourceNode.prototype;
    const start = type.start;
    const stop = type.stop;
    const ambience = (node: AudioBufferSourceNode) =>
      node.loop && node.buffer?.duration === 2 && node.buffer.numberOfChannels === 1;
    type.start = function (...args) {
      if (ambience(this)) counts.play++;
      return start.apply(this, args);
    };
    type.stop = function (...args) {
      if (ambience(this)) counts.stop++;
      return stop.apply(this, args);
    };
  });
  const f = await prep(page);
  const counts = () =>
    page.evaluate(() => (window as unknown as { lawuSoundCounts: { play: number; stop: number } }).lawuSoundCounts);
  await page.goto("/");
  await page.getByRole("button", { name: "Begin the lakon" }).click();
  await page.waitForURL("**/film/");
  await page.locator(".fl-rail-list li:nth-child(3) button").click();
  await expect(f).toHaveAttribute("data-slide", "day-2/title");
  for (let step = 0; step < 9; step++) await next(page);
  await expect(f).toHaveAttribute("data-slide", "day-2/grojogan-sewu");
  expect(await counts()).toEqual({ play: 0, stop: 0 });
  const speaker = page.getByRole("button", { name: "Gamelan sound" });
  await speaker.click();
  await expect.poll(counts).toEqual({ play: 1, stop: 0 });
  await speaker.click();
  await expect.poll(counts).toEqual({ play: 1, stop: 1 });
  await speaker.click();
  await expect.poll(counts).toEqual({ play: 2, stop: 1 });
});
