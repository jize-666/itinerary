import { test, expect, type Page, type Download } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { unzipSync } from "three/addons/libs/fflate.module.js";
import { seedSession } from "./helpers";

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
test.setTimeout(150_000);
async function visit(p: Page, params = "", lang: "en" | "id" = "en", calm = false) {
  await seedSession(p);
  await p.addInitScript(
    ({ lang, calm }) => {
      localStorage.setItem("lakon.lang", lang);
      localStorage.setItem("lakon.calm", calm ? "1" : "0");
    },
    { lang, calm },
  );
  await p.goto("/diorama/?q=lite" + params);
  await expect(p.locator(".dio-root")).toHaveAttribute("data-ready", "true", { timeout: 60_000 });
}
const tool = (p: Page, name: string) => p.getByRole("button", { name, exact: true });
async function blobBytes(d: Download) {
  const path = await d.path();
  expect(path).toBeTruthy();
  return readFile(path!);
}

test("requires the existing session before exposing the miniature", async ({ page }) => {
  await page.goto("/diorama/?q=lite");
  await expect(page).toHaveURL(/\/(\?.*)?$/);
  await expect(page.locator(".dio-canvas canvas")).toHaveCount(0);
});
test("lite (test mode) applies pixel ratio 1 on desktop and mobile", async ({ page }) => {
  await visit(page);
  const canvas = page.locator(".dio-canvas canvas");
  await expect
    .poll(async () =>
      canvas.evaluate((el) => {
        const expected = 1;
        return Math.abs((el as HTMLCanvasElement).width / el.getBoundingClientRect().width - expected);
      }),
    )
    .toBeLessThan(0.015);
});
test("deep links, bilingual name, keyboard, two full orbits each way and home", async ({ page }) => {
  await visit(page, "&lokasi=pasar&fps", "id");
  const root = page.locator(".dio-root"),
    stage = page.locator(".dio-stage"),
    canvas = stage.locator("canvas");
  await expect(root).toHaveAttribute("data-location", "pasar");
  await expect(canvas).toHaveAccessibleName(/Maket 3D/);
  await tool(page, "Berikutnya").click();
  await expect(root).toHaveAttribute("data-location", "laweyan");
  await tool(page, "Sebelumnya").click();
  await expect(root).toHaveAttribute("data-location", "pasar");
  await tool(page, "Tampilan awal").click();
  await expect(stage).toHaveAttribute("data-azimuth", "180.00");
  await canvas.focus();
  for (const key of ["ArrowRight", "ArrowLeft"]) {
    await canvas.evaluate((el, key) => {
      for (let i = 0; i < 90; i++) el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    }, key);
  }
  await expect(stage).toHaveAttribute("data-azimuth", "180.00");
  await page.keyboard.press("ArrowRight");
  await expect(stage).toHaveAttribute("data-azimuth", "188.00");
  await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press("+");
  await page.keyboard.press("Home");
  await expect(stage).toHaveAttribute("data-azimuth", "180.00");
  await expect(stage).toHaveAttribute("data-elevation", "28.00");
  await expect(root).toHaveAttribute("data-location", "");
});
test("autoplays, pauses, resumes and hands over the active tour to a drag", async ({ page }) => {
  await visit(page, "&tur=1");
  const root = page.locator(".dio-root");
  await expect(root).toHaveAttribute("data-tour", "playing");
  await tool(page, "Pause").click();
  await expect(root).toHaveAttribute("data-tour", "paused");
  await tool(page, "Resume").click();
  await expect(root).toHaveAttribute("data-tour", "playing");
  const b = await page.locator(".dio-canvas canvas").boundingBox();
  if (!b) throw Error("canvas");
  await page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.62, b.y + b.height * 0.47, { steps: 4 });
  await page.mouse.up();
  await expect(root).toHaveAttribute("data-tour", "idle");
  await tool(page, "Play tour").click();
  await expect(root).toHaveAttribute("data-tour", "playing");
});
test("Calm and reduced motion expose six selectable poses without parallax", async ({ page }) => {
  await visit(page, "&tur=1", "en", true);
  const root = page.locator(".dio-root");
  await expect(root).toHaveAttribute("data-calm", "true");
  const poses = page.locator(".dio-pose-list button");
  await expect(poses).toHaveCount(6);
  await poses.nth(4).click();
  await expect(root).toHaveAttribute("data-location", "laweyan");
  const stage = page.locator(".dio-stage"),
    before = await stage.getAttribute("data-azimuth");
  await stage.hover({ position: { x: 35, y: 130 } });
  await page.waitForTimeout(1950);
  expect(await stage.getAttribute("data-azimuth")).toBe(before);
  await expect(tool(page, "Play tour")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => {
    localStorage.setItem("lakon.calm", "0");
    window.dispatchEvent(new Event("storage"));
  });
  await expect(root).toHaveAttribute("data-calm", "true");
});
test("active photo downloads a 1920px PNG using the canvas aspect", async ({ page }) => {
  await visit(page);
  const canvas = page.locator(".dio-canvas canvas");
  await canvas.focus();
  await page.keyboard.press("ArrowRight");
  const b = await canvas.boundingBox();
  await tool(page, "Photo").click();
  const save = page.getByRole("link", { name: "Save PNG", exact: true });
  await expect(save).toBeVisible();
  const waiting = page.waitForEvent("download");
  await save.click();
  const dl = await waiting,
    buf = await blobBytes(dl);
  expect(dl.suggestedFilename()).toBe("diorama-solo-photo.png");
  expect(buf.subarray(1, 4).toString()).toBe("PNG");
  const w = buf.readUInt32BE(16),
    h = buf.readUInt32BE(20);
  expect(Math.max(w, h)).toBe(1920);
  expect(Math.abs(w / h - b!.width / b!.height)).toBeLessThan(0.003);
  await tool(page, "Close").click();
  await expect(page.locator(".dio-stage")).toHaveAttribute("data-azimuth", "188.00");
});
test("captures all nine named angles to one ZIP and restores the view under the site CSP", async ({
  page,
}, info) => {
  const mobile = info.project.name === "iphone",
    lang = mobile ? "id" : "en";
  const violations: string[] = [];
  await page.exposeFunction("reportDioCsp", (s: string) => violations.push(s));
  await page.addInitScript(() =>
    document.addEventListener("securitypolicyviolation", (e) => {
      void (window as unknown as { reportDioCsp(s: string): void }).reportDioCsp(
        e.violatedDirective + " " + e.blockedURI,
      );
    }),
  );
  await visit(page, "&fps", lang);
  const stage = page.locator(".dio-stage"),
    canvas = stage.locator("canvas");
  await canvas.focus();
  await page.keyboard.press("ArrowRight");
  await tool(page, mobile ? "Sudut" : "Angle").click();
  const all = mobile ? "Potret semua sisi" : "Photo all sides";
  await tool(page, all).click();
  const ext = mobile ? "jpg" : "png";
  await expect(tool(page, mobile ? "JPEG" : "PNG")).toHaveAttribute("aria-pressed", "true");
  await tool(page, all).click();
  const save = page.getByRole("link", { name: mobile ? "Simpan ZIP" : "Save ZIP", exact: true });
  await expect(save).toBeVisible({ timeout: 90_000 });
  const waiting = page.waitForEvent("download");
  await save.click();
  const files = unzipSync(new Uint8Array(await blobBytes(await waiting)));
  const dirs = mobile
    ? ["utara", "timur-laut", "timur", "tenggara", "selatan", "barat-daya", "barat", "barat-laut", "atas"]
    : ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west", "top"];
  expect(Object.keys(files)).toEqual(dirs.map((d) => "diorama-solo-" + d + "." + ext));
  expect(
    new Set(Object.values(files).map((bytes) => createHash("sha256").update(bytes).digest("hex"))).size,
  ).toBe(9);
  await tool(page, mobile ? "Tutup" : "Close").click();
  await expect(stage).toHaveAttribute("data-azimuth", "188.00");
  expect(violations).toEqual([]);
});

test("idle parallax moves the perspective camera within its angular limits", async ({ page }) => {
  await visit(page);
  const canvas = page.locator(".dio-canvas canvas"),
    stage = page.locator(".dio-stage");
  await canvas.evaluate((el) => {
    const r = el.getBoundingClientRect();
    el.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerType: "mouse",
        clientX: r.left + 0.96 * r.width,
        clientY: r.top + 0.07 * r.height,
        bubbles: true,
      }),
    );
  });
  await expect
    .poll(async () => Number(await stage.getAttribute("data-azimuth")), { timeout: 10_000 })
    .toBeGreaterThan(181);
  const az = Number(await stage.getAttribute("data-azimuth")),
    elevation = Number(await stage.getAttribute("data-elevation"));
  expect(az).toBeLessThanOrEqual(183);
  expect(elevation).toBeGreaterThan(28);
  expect(elevation).toBeLessThanOrEqual(30);
});

test("preset and full-screen controls retain the entire canvas after rotating the viewport", async ({
  page,
}) => {
  await visit(page);
  await tool(page, "Full screen").click();
  await tool(page, "Angle").click();
  await tool(page, "Top").click();
  const stage = page.locator(".dio-stage");
  await expect(stage).toHaveAttribute("data-elevation", "90.00");
  await page.setViewportSize({ width: 844, height: 390 });
  await expect
    .poll(
      async () => {
        const rect = await page.locator(".dio-canvas canvas").boundingBox();
        return rect ? Math.abs(rect.width / rect.height - 844 / 390) : Infinity;
      },
      { timeout: 10000 },
    )
    .toBeLessThan(0.03);
  await tool(page, "Home view").click();
  await expect(stage).toHaveAttribute("data-elevation", "28.00");
  await tool(page, "Exit full screen").click();
  await expect(page.locator(".dio-root")).not.toHaveClass(/dio-immersive/);
});
