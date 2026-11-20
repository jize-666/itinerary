import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { seedSession } from "./helpers";

/**
 * Halaman /canting/ (Tugas 11.2): batik interaktif. WebGL digambar CPU (SwiftShader) di e2e, jadi frame lambat
 * dan penantian dibuat longgar; `?q=low` dipakai di mana-mana.
 */
const CI = !!process.env.CI;
const K = CI ? 3 : 1;
const READY = 60_000 * K;
const STAGE = 60_000 * K;
const LONG = 150_000 * K;

test.use({
  launchOptions: {
    ...(process.env.DIORAMA_CHROMIUM ? { executablePath: process.env.DIORAMA_CHROMIUM } : {}),
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", ...(process.env.DIORAMA_CHROMIUM ? ["--no-zygote", "--in-process-gpu"] : [])],
  },
});

type Dbg = { frames: number; dabs: number; stage: string; busy: string | null; malam: number; tool: string; ready: boolean; png: number };
const dbg = (p: Page) => p.evaluate(() => (window as unknown as { __lakonCanting?: Dbg }).__lakonCanting ?? null);
const dabs = async (p: Page) => (await dbg(p))?.dabs ?? 0;
const root = (p: Page) => p.locator("main.cnt-root");
const btn = (p: Page, name: string | RegExp, exact = true) => p.getByRole("button", { name, exact: typeof name === "string" ? exact : undefined });

async function visit(p: Page, params = "?q=low", opts: { calm?: boolean } = {}) {
  await seedSession(p);
  await p.addInitScript(
    ({ calm }) => {
      try {
        localStorage.setItem("lakon.lang", "en");
        localStorage.setItem("lakon.calm", calm ? "1" : "0");
        if (calm) localStorage.setItem("lakon.calm", "1");
      } catch {}
    },
    { calm: !!opts.calm },
  );
  await p.goto(`/canting/${params}`);
  await expect(root(p)).toHaveAttribute("data-ready", "true", { timeout: READY });
}

/** Kotak kain yang bebas dari header dan dock. */
async function clothBox(p: Page) {
  const b = await p.evaluate(() => {
    const top = document.querySelector(".cnt-top")!.getBoundingClientRect().bottom;
    const dock = document.querySelector(".cnt-dock")!.getBoundingClientRect().top;
    return { top, dock, w: innerWidth };
  });
  const cy = (b.top + b.dock) / 2;
  const half = Math.min(b.w * 0.3, 160);
  return { cx: b.w / 2, cy, half, vh: Math.min(60, (b.dock - b.top) * 0.2) };
}

/** Seret mouse bolak-balik dengan langkah kecil. */
async function drag(p: Page, passes = 1) {
  const { cx, cy, half } = await clothBox(p);
  await p.mouse.move(cx - half, cy);
  await p.mouse.down();
  for (let k = 0; k < passes; k++) {
    for (let i = 0; i <= 30; i++) await p.mouse.move(cx - half + (2 * half * i) / 30, cy + Math.sin((i + k) / 3) * 12);
    for (let i = 30; i >= 0; i--) await p.mouse.move(cx - half + (2 * half * i) / 30, cy + 20 + Math.sin(i / 3) * 12);
  }
  await p.mouse.up();
}
async function drawUntilWax(p: Page) {
  const base = await dabs(p);
  for (let n = 0; n < 6 && (await dabs(p)) <= base; n++) {
    await drag(p);
    await p.waitForTimeout(500);
  }
  await expect.poll(() => dabs(p), { timeout: 30_000 }).toBeGreaterThan(base);
}
const pngPage = (buf: Buffer) => ({ sig: buf.subarray(0, 8).toString("hex"), w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });

test("private page: without a session /canting/ goes home", async ({ page }) => {
  await page.goto("/canting/?q=low");
  await expect(page).toHaveURL(/\/(\?.*)?$/);
  await expect(page.locator("main.cnt-root")).toHaveCount(0);
});

test("demo traces kawung, dyes through the stages and downloads a 2048x1280 PNG", async ({ page }) => {
  test.setTimeout(LONG);
  const seen = new Set<string>();
  await visit(page, "?q=low&demo=1");
  const dl = page.waitForEvent("download", { timeout: LONG - 20_000 });
  const t0 = Date.now();
  while (Date.now() - t0 < LONG - 25_000) {
    const s = await root(page).getAttribute("data-stage");
    if (s) seen.add(s);
    if (seen.has("jadi")) break;
    await page.waitForTimeout(250);
  }
  const download = await dl;
  expect(download.suggestedFilename()).toBe("batik-laweyan.png");
  const path = await download.path();
  const buf = await readFile(path!);
  const info = pngPage(buf);
  expect(info.sig).toBe("89504e470d0a1a0a");
  expect(info.w).toBe(2048);
  expect(info.h).toBe(1280);
  for (const s of ["biru", "coklat", "jadi"]) expect(seen, `stage ${s} seen`).toContain(s);
});

test("mouse drawing adds wax and Undo removes it", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "mouse only");
  test.setTimeout(LONG);
  await visit(page);
  expect(await dabs(page)).toBe(0);
  const undo = btn(page, "Undo");
  await expect(undo).toBeDisabled();
  await drawUntilWax(page);
  await expect(undo).toBeEnabled({ timeout: 30_000 });
  await undo.click();
  await expect.poll(() => dabs(page), { timeout: 30_000 }).toBe(0);
  await expect(undo).toBeDisabled({ timeout: 30_000 });
});

test("stage rules: dyes need wax, boil-off after indigo, save only when done", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "mouse drawing");
  test.setTimeout(LONG);
  await visit(page);
  await expect(btn(page, "Dip in indigo")).toBeDisabled();
  await expect(btn(page, "Dip in soga")).toBeDisabled();
  await expect(btn(page, "Save my batik")).toHaveCount(0);
  await drawUntilWax(page);
  await expect(btn(page, "Dip in indigo")).toBeEnabled({ timeout: 30_000 });
  await btn(page, "Dip in indigo").click();
  await expect(root(page)).toHaveAttribute("data-stage", "biru", { timeout: STAGE * 2 });
  await expect(btn(page, "Boil off the wax")).toBeEnabled({ timeout: STAGE });
  await expect(btn(page, "Save my batik")).toHaveCount(0);
});

test("empty bowl: Tembok strokes drain the wax, the hint shows, dipping refills", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "mouse drawing");
  test.setTimeout(LONG);
  await visit(page);
  await page.getByRole("radio", { name: "Tembok" }).click();
  await expect(root(page)).toHaveAttribute("data-tool", "tembok");
  for (let n = 0; n < 40 && ((await dbg(page))?.malam ?? 1) > 0.001; n++) await drag(page, 2);
  await expect.poll(async () => (await dbg(page))?.malam ?? 1, { timeout: 20_000 }).toBeLessThanOrEqual(0.02);
  await expect(page.getByRole("status").filter({ hasText: "The bowl is empty" })).toBeVisible({ timeout: 20_000 });
  await btn(page, /^Dip in the pan/, false).click();
  await expect.poll(async () => (await dbg(page))?.malam ?? 0, { timeout: 10_000 }).toBeGreaterThan(0.9);
});

test("persistence: wax survives a reload", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "mouse drawing");
  test.setTimeout(LONG);
  await visit(page);
  await drawUntilWax(page);
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(root(page)).toHaveAttribute("data-ready", "true", { timeout: READY });
  await expect.poll(() => dabs(page), { timeout: 30_000 }).toBeGreaterThan(0);
});

test("calm: usable and marked with data-calm", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "mouse drawing");
  test.setTimeout(LONG);
  await visit(page, "?q=low", { calm: true });
  await expect(root(page)).toHaveAttribute("data-calm", "");
  await drawUntilWax(page);
});

test("iPhone: a finger drag adds wax", async ({ page }, info) => {
  test.skip(info.project.name !== "iphone", "touch only");
  test.setTimeout(LONG);
  await visit(page);
  const { cx, cy, half } = await clothBox(page);
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", x = 0, y = 0) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  const base = await dabs(page);
  for (let n = 0; n < 4 && (await dabs(page)) <= base; n++) {
    await touch("touchStart", cx - half, cy);
    for (let i = 0; i <= 40; i++) await touch("touchMove", cx - half + (2 * half * i) / 40, cy + Math.sin(i / 3) * 12);
    await touch("touchEnd");
    await page.waitForTimeout(600);
  }
  await cdp.detach();
  await expect.poll(() => dabs(page), { timeout: 30_000 }).toBeGreaterThan(base);
});

test("leaving and returning three times does not error", async ({ page }) => {
  test.setTimeout(LONG);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSession(page);
  for (let i = 0; i < 3; i++) {
    await page.goto("/canting/?q=low");
    await expect(root(page)).toHaveAttribute("data-ready", "true", { timeout: READY });
    await page.goto("/today/");
    await page.waitForLoadState("domcontentloaded");
  }
  expect(errors).toEqual([]);
});
