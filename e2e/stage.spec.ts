import { expect, type Page, test } from "@playwright/test";
import { filmFixture, json, seedSession, todayFixture, TRIP } from "./helpers";

/**
 * Panggung 3D (PRD §12, F2): kanvas WebGL di belakang teks film. Chromium di e2e tidak punya GPU (SwiftShader),
 * jadi tanpa paksaan film tetap 2,5D; di sini tier dipaksa lewat `?stage=` untuk menguji jalur 3D.
 * Data tiruan; backend di-mock.
 */
const film = (page: Page) => page.locator("main.film");
const canvas = (page: Page) => page.locator(".fl-canvas canvas");
const settled = (page: Page) => expect(film(page)).not.toHaveAttribute("data-moving", "");
type Stats = { tier: string; frames: number; calls: number; triangles: number; camera: [number, number, number]; fov: number; index: number; moving: boolean };
const stats = (page: Page) => page.evaluate(() => (window as unknown as { __lakonStage?: Stats }).__lakonStage ?? null);
/** Tunggu frame baru tergambar sesudah saat ini (loop 3D berjalan). */
async function nextFrames(page: Page, more = 3) {
  const from = (await stats(page))?.frames ?? 0;
  await expect.poll(async () => (await stats(page))?.frames ?? 0, { timeout: 15_000 }).toBeGreaterThanOrEqual(from + more);
}

async function open(page: Page, query = "", hash = "") {
  await seedSession(page);
  await page.route(TRIP, (r) => json(r, 200, filmFixture("guest", { breakfast: true })));
  await page.goto(`/film/${query}${hash}`);
  await expect(film(page)).toBeVisible();
  await settled(page);
}

/** Buka film dengan panggung 3D dipaksa hidup, dan tunggu sampai kanvas tampil penuh. */
async function open3d(page: Page, query = "?stage=low", hash = "") {
  await open(page, query, hash);
  await expect(film(page)).toHaveAttribute("data-stage", "on", { timeout: 30_000 });
}

async function step(page: Page, key = "ArrowDown") {
  const before = Number(await film(page).getAttribute("data-index"));
  await page.keyboard.press(key);
  await expect.poll(async () => Number(await film(page).getAttribute("data-index"))).not.toBe(before);
  await settled(page);
}

const far = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

test.describe("tanpa GPU, Calm, reduced motion: film tetap 2,5D (tier Static)", () => {
  test("renderer perangkat lunak: tidak ada kanvas, langit 2,5D tetap digambar", async ({ page }) => {
    await open(page);
    await page.waitForTimeout(1200);
    await expect(page.locator(".fl-canvas")).toHaveCount(0);
    await expect(film(page)).not.toHaveAttribute("data-stage", /.+/);
    await expect(page.locator(".fl-skies")).toBeVisible();
    expect(await stats(page)).toBeNull();
  });

  test("?stage=static memaksa film 2,5D", async ({ page }) => {
    await open(page, "?stage=static");
    await page.waitForTimeout(800);
    await expect(page.locator(".fl-canvas")).toHaveCount(0);
  });

  test("reduced motion: tanpa WebGL walau tier dipaksa", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, "?stage=low");
    await expect(film(page)).toHaveAttribute("data-calm", "");
    await page.waitForTimeout(1200);
    await expect(page.locator(".fl-canvas")).toHaveCount(0);
    await expect(page.locator(".fl-skies")).toBeVisible();
  });

  test("Calm dinyalakan di tengah film: kanvas dilepas; dimatikan: kanvas kembali", async ({ page }) => {
    await open3d(page);
    await page.getByRole("button", { name: "Calm mode" }).click();
    await expect(film(page)).toHaveAttribute("data-calm", "");
    await expect(page.locator(".fl-canvas")).toHaveCount(0);
    await expect(film(page)).not.toHaveAttribute("data-stage", /.+/);
    await expect(page.locator(".fl-skies")).toBeVisible();
    await page.getByRole("button", { name: "Calm mode" }).click();
    await expect(film(page)).toHaveAttribute("data-stage", "on", { timeout: 30_000 });
    await expect(canvas(page)).toBeVisible();
    await nextFrames(page);
  });
});

test.describe("panggung 3D hidup (tier dipaksa)", () => {
  test("kanvas tergambar di belakang teks; langit 2,5D tidak digambar lagi", async ({ page }) => {
    await open3d(page);
    await expect(canvas(page)).toBeVisible();
    await expect(page.locator(".fl-canvas")).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(".fl-canvas")).toHaveAttribute("data-tier", "low");
    await expect(page.locator(".fl-skies")).toBeHidden();
    // teks itinerary tetap DOM di atas kanvas (FR-12)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await nextFrames(page);
    const s = (await stats(page))!;
    expect(s.tier).toBe("low");
    expect(s.calls).toBeGreaterThan(3);
    expect(s.triangles).toBeGreaterThan(10_000);
    // kanvas tidak menghalangi klik ke tombol di atasnya
    expect(await page.evaluate(() => getComputedStyle(document.querySelector(".fl-canvas")!).pointerEvents)).toBe("none");
  });

  test("gambarnya bukan bidang kosong: ada terang dan gelap", async ({ page }) => {
    await open3d(page);
    await nextFrames(page, 5);
    // baca kanvas lewat tangkapan layar halaman dengan teks disembunyikan
    await page.addStyleTag({ content: ".fl-stage,.fl-chrome,.fl-grain,.fl-wipe{visibility:hidden!important}" });
    await nextFrames(page, 2);
    const png = await page.screenshot();
    const range = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement("canvas");
      [c.width, c.height] = [64, 64];
      const g = c.getContext("2d")!;
      g.drawImage(img, 0, 0, 64, 64);
      const d = g.getImageData(0, 0, 64, 64).data;
      let [lo, hi] = [255, 0];
      for (let i = 0; i < d.length; i += 4) {
        const l = (d[i]! + d[i + 1]! + d[i + 2]!) / 3;
        lo = Math.min(lo, l);
        hi = Math.max(hi, l);
      }
      return hi - lo;
    }, png.toString("base64"));
    expect(range).toBeGreaterThan(40);
  });

  test("kamera berpindah bersama slide, dan diam saat slide diam", async ({ page }) => {
    await open3d(page);
    await nextFrames(page);
    const hero = (await stats(page))!;
    expect(hero.index).toBe(0);
    await step(page);
    await nextFrames(page);
    const headline = (await stats(page))!;
    expect(headline.index).toBe(1);
    expect(headline.moving).toBe(false);
    expect(far(hero.camera, headline.camera)).toBeGreaterThan(1);
    // diam: kamera hanya bernapas pelan
    await page.waitForTimeout(400);
    await nextFrames(page);
    expect(far((await stats(page))!.camera, headline.camera)).toBeLessThan(0.4);
    // mundur: kembali ke shot semula
    await step(page, "ArrowUp");
    await nextFrames(page);
    expect(far((await stats(page))!.camera, hero.camera)).toBeLessThan(0.4);
  });

  test("gallery: kamera memandang lanskap dan bergeser menyamping per panel", async ({ page }) => {
    await open3d(page, "?stage=low", "#day-1");
    await step(page); // intro hari
    await step(page); // panel pertama
    await expect(film(page)).toHaveAttribute("data-kind", "panel");
    await nextFrames(page);
    const first = (await stats(page))!;
    expect(first.camera[2]).toBeLessThan(-4); // di tepi belakang pendapa, menghadap lanskap
    await step(page);
    await nextFrames(page);
    const second = (await stats(page))!;
    expect(second.camera[0]).toBeGreaterThan(first.camera[0] + 0.3);
    expect(Math.abs(second.camera[1] - first.camera[1])).toBeLessThan(0.3);
  });

  test("?fps menampilkan overlay ukur", async ({ page }) => {
    await open3d(page, "?stage=low&fps");
    await nextFrames(page, 20);
    await expect(page.locator(".fl-fps")).toContainText("low");
    await expect(page.locator(".fl-fps")).toContainText("draw");
  });

  test("tanpa ?fps tidak ada overlay", async ({ page }) => {
    await open3d(page);
    await expect(page.locator(".fl-fps")).toHaveCount(0);
  });
});

test.describe("bundle 3D hanya dimuat saat dipakai", () => {
  /** Kumpulkan isi semua JS yang dimuat halaman; three dikenali dari nama kelas penggambarnya. */
  async function loadsThree(page: Page, go: () => Promise<void>) {
    const bodies: Promise<string>[] = [];
    page.on("response", (r) => {
      if (r.url().includes("/_next/") && r.url().split("?")[0]!.endsWith(".js")) bodies.push(r.text().catch(() => ""));
    });
    await go();
    await page.waitForLoadState("networkidle");
    return (await Promise.all(bodies)).some((t) => t.includes("WebGLRenderer"));
  }

  test("gerbang (/) tidak memuat three", async ({ page }) => {
    expect(await loadsThree(page, async () => void (await page.goto("/")))).toBe(false);
  });

  test("Today tidak memuat three", async ({ page }) => {
    await seedSession(page);
    await page.route(TRIP, (r) => json(r, 200, todayFixture()));
    expect(await loadsThree(page, async () => void (await page.goto("/today/")))).toBe(false);
  });

  test("film 2,5D (tanpa GPU) tidak memuat three; dengan panggung 3D baru dimuat", async ({ page, context }) => {
    expect(await loadsThree(page, () => open(page))).toBe(false);
    const second = await context.newPage();
    expect(await loadsThree(second, () => open3d(second))).toBe(true);
  });
});
