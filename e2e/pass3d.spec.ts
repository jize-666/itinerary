import { expect, type Page, test } from "@playwright/test";
import { filmFixture, json, seedSession, TRIP } from "./helpers";

/**
 * Boarding pass 3D (Tugas 12b): tiket fisik bertali di slide `pass` saat panggung 3D hidup. Chromium e2e menggambar
 * di CPU (SwiftShader) dan waktu fisika berjalan lebih lambat dari waktu dinding (dt dijepit 0,1 dtk per frame),
 * jadi semua penantian memakai WAIT/WAIT_LONG. Data tiruan; backend di-mock.
 */
const CI = !!process.env.CI;
const WAIT = CI ? 45_000 : 15_000;
const WAIT_LONG = CI ? 90_000 : 45_000;
test.describe.configure({ mode: "default" });
test.slow(CI, "panggung 3D digambar CPU di runner CI tanpa GPU");
// fisika berjalan lebih lambat dari waktu dinding di renderer CPU: tiap tes diberi batas waktu panjang
test.beforeEach(() => test.setTimeout(CI ? 480_000 : 240_000));

const film = (page: Page) => page.locator("main.film");
const slide = (page: Page) => film(page).getAttribute("data-slide");
const settled = (page: Page) => expect(film(page)).not.toHaveAttribute("data-moving", "", { timeout: WAIT });
const state = (page: Page) => film(page).getAttribute("data-pass3d");
const ticket = (page: Page) => page.getByLabel("Boarding pass: Mira Santoso");

async function open(page: Page, query: string, data: unknown = filmFixture("guest"), hash = "#epilogue") {
  await seedSession(page);
  await page.route(TRIP, (r) => json(r, 200, data));
  await page.goto(`/film/${query}${hash}`);
  await expect(film(page)).toBeVisible({ timeout: WAIT });
  await settled(page);
}

/** Maju satu slide dengan ArrowDown sampai di slide ber-id tertentu (tidak ada tahap gong di slide epilog). */
async function goTo(page: Page, id: string) {
  for (let i = 0; i < 12 && (await slide(page)) !== id; i++) {
    const before = Number(await film(page).getAttribute("data-index"));
    await page.keyboard.press("ArrowDown");
    await expect.poll(async () => Number(await film(page).getAttribute("data-index")), { timeout: WAIT }).not.toBe(before);
    await settled(page);
  }
  expect(await slide(page)).toBe("pass");
}

/** Buka film 3D (tier Low) dan tunggu tiketnya siap di slide `pass`. */
async function openPass(page: Page) {
  await open(page, "?stage=low");
  await expect(film(page)).toHaveAttribute("data-stage", "on", { timeout: WAIT_LONG });
  await goTo(page, "pass");
  await expect.poll(() => state(page), { timeout: WAIT_LONG }).toMatch(/^(ready|resting)$/);
  await expect(film(page)).toHaveAttribute("data-pass-at", /.+/, { timeout: WAIT });
}

/** Pusat kartu di layar (piksel), dari persen `data-pass-at` terhadap `main.film`. */
async function cardPoint(page: Page) {
  const at = await film(page).getAttribute("data-pass-at");
  expect(at).toMatch(/^-?[\d.]+,-?[\d.]+$/);
  const [px, py] = at!.split(",").map(Number) as [number, number];
  const box = (await film(page).boundingBox())!;
  return { x: box.x + (box.width * px) / 100, y: box.y + (box.height * py) / 100 };
}

test.describe("tiket 3D di slide tiket", () => {

  test("di slide tiket: status bukan loading, posisi kartu terisi, tiket DOM tersembunyi tapi tetap terbaca", async ({ page }) => {
    await openPass(page);
    expect(await state(page)).not.toBe("loading");
    await expect(film(page)).toHaveAttribute("data-pass-at", /^-?[\d.]+,-?[\d.]+$/);
    // tersembunyi secara visual (1×1 px, opacity 0) namun ada di pohon aksesibilitas
    await expect(ticket(page)).toHaveCount(1);
    const fs = page.locator(".fs-ticket");
    const box = await fs.boundingBox();
    expect(box === null || (box.width <= 2 && box.height <= 2)).toBe(true);
    expect(await fs.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
    await expect(page.locator(".fs-ticket-hint")).toHaveCSS("display", "block");
  });

  test("seret kartu ke samping lalu lepas: dragging → swinging → resting", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "seret dengan mouse; jalur sentuh diuji lewat geser slide");
    await openPass(page);
    const p = await cardPoint(page);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await expect.poll(() => state(page), { timeout: WAIT_LONG }).toBe("dragging");
    for (let i = 1; i <= 6; i++) await page.mouse.move(p.x + i * 30, p.y + i * 3);
    expect(await state(page)).toBe("dragging");
    await page.mouse.up();
    await expect.poll(() => state(page), { timeout: WAIT_LONG }).toBe("swinging");
    await expect.poll(() => state(page), { timeout: WAIT_LONG * 2 }).toBe("resting");
    expect(await slide(page)).toBe("pass");
  });

  test("klik kartu membaliknya; klik lagi mengembalikan ke muka depan", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "klik mouse di titik kartu");
    await openPass(page);
    const p = await cardPoint(page);
    await page.mouse.click(p.x, p.y);
    await expect.poll(() => state(page), { timeout: WAIT_LONG * 2 }).toBe("flipped");
    // ketukan kedua sengaja ditahan sebentar: klik sesudah ketukan pertama bisa dibaca sebagai klik ganda
    await page.waitForTimeout(600);
    const q = await cardPoint(page);
    await page.mouse.click(q.x, q.y);
    await expect.poll(() => state(page), { timeout: WAIT_LONG * 2 }).toBe("resting");
  });

  test("Enter membalik kartu", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "tombol Enter di keyboard fisik");
    await openPass(page);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("Enter");
    await expect.poll(() => state(page), { timeout: WAIT_LONG * 2 }).toBe("flipped");
  });

  test("geser/roda di luar kartu tetap pindah ke credits, dan tiket ada lagi saat kembali", async ({ page }, testInfo) => {
    await openPass(page);
    if (testInfo.project.name === "desktop") {
      const box = (await film(page).boundingBox())!;
      const p = await cardPoint(page);
      // area jauh dari kartu: sisi seberang secara horizontal
      const x = p.x < box.x + box.width / 2 ? box.x + box.width * 0.92 : box.x + box.width * 0.08;
      await page.mouse.move(x, box.y + box.height * 0.9);
      await page.mouse.wheel(0, 100);
    } else {
      // sentuh vertikal dari tepi bawah kartu ke atas, jauh dari titik kartu
      const box = (await film(page).boundingBox())!;
      const p = await cardPoint(page);
      const x = p.x < box.x + box.width / 2 ? box.x + box.width * 0.93 : box.x + box.width * 0.07;
      const y0 = box.y + box.height * 0.92;
      const cdp = await page.context().newCDPSession(page);
      const pt = (y: number) => [{ x, y }];
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pt(y0) });
      for (let i = 1; i <= 10; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pt(y0 - i * 22) });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    }
    await expect.poll(() => slide(page), { timeout: WAIT_LONG }).toBe("credits");
    await settled(page);
    await page.waitForTimeout(400);
    await page.keyboard.press("ArrowUp");
    await expect.poll(() => slide(page), { timeout: WAIT_LONG }).toBe("pass");
    await settled(page);
    await expect.poll(() => state(page), { timeout: WAIT_LONG }).toMatch(/^(ready|resting)$/);
    await expect(film(page)).toHaveAttribute("data-pass-at", /.+/, { timeout: WAIT });
  });
});

test.describe("tiket di samping gunungan penutup", () => {
  /** Dari slide tiket ke credits, lalu maju sekali lagi: gunungan penutup tertancap dan mendarat. */
  async function plantTail(page: Page) {
    await openPass(page);
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => slide(page), { timeout: WAIT_LONG }).toBe("credits");
    await settled(page);
    await page.waitForTimeout(400);
    await page.keyboard.press("ArrowDown");
    await expect(film(page)).toHaveAttribute("data-gate", "tail", { timeout: WAIT_LONG });
  }

  test("gunungan mendarat: tiket ada di layar dan berbalik ke belakang; klik membaliknya, muka gunungan tetap", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "klik mouse di titik kartu");
    await plantTail(page);
    await expect(film(page)).toHaveAttribute("data-pass-at", /^-?[\d.]+,-?[\d.]+$/, { timeout: WAIT_LONG });
    // sesudah mendarat tiket disentak dan memperlihatkan "Matur nuwun"
    await expect.poll(() => state(page), { timeout: WAIT_LONG * 2 }).toBe("flipped");
    const face = await film(page).getAttribute("data-face");
    const p = await cardPoint(page);
    await page.mouse.click(p.x, p.y);
    await expect.poll(() => state(page), { timeout: WAIT_LONG * 2 }).toBe("resting");
    // klik di tiket tidak boleh membalik gunungan di bawahnya
    expect(await film(page).getAttribute("data-face")).toBe(face);
    await expect(film(page)).toHaveAttribute("data-gate", "tail");
  });

  test("gunungan dicabut lagi: tiket naik dan hilang (tanpa data-pass-at)", async ({ page }) => {
    await plantTail(page);
    await expect(film(page)).toHaveAttribute("data-pass-at", /.+/, { timeout: WAIT_LONG });
    await page.keyboard.press("ArrowUp");
    await expect(film(page)).not.toHaveAttribute("data-pass-at", /.+/, { timeout: WAIT_LONG });
  });
});

test.describe("tanpa tiket 3D", () => {
  test("?stage=static: tidak ada data-pass3d dan tiket DOM terlihat", async ({ page }) => {
    await open(page, "?stage=static");
    await goTo(page, "pass");
    await page.waitForTimeout(800);
    await expect(film(page)).not.toHaveAttribute("data-pass3d", /.+/);
    await expect(ticket(page)).toBeVisible();
  });

  test("Calm mode: tiket DOM tetap terlihat tanpa tiket 3D", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("lakon.calm", "1"));
    await open(page, "?stage=low");
    await goTo(page, "pass");
    await page.waitForTimeout(800);
    await expect(film(page)).not.toHaveAttribute("data-pass3d", /.+/);
    await expect(ticket(page)).toBeVisible();
  });

  test("data tanpa nama tamu: tidak ada tiket 3D maupun tiket DOM, tanpa galat halaman", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const data = filmFixture("guest") as Record<string, unknown>;
    delete data.private;
    await open(page, "?stage=low", data);
    await expect(film(page)).toHaveAttribute("data-stage", "on", { timeout: WAIT_LONG });
    for (let i = 0; i < 12 && (await slide(page)) !== "pass"; i++) {
      const before = Number(await film(page).getAttribute("data-index"));
      await page.keyboard.press("ArrowDown");
      await expect.poll(async () => Number(await film(page).getAttribute("data-index")), { timeout: WAIT }).not.toBe(before);
      await settled(page);
    }
    await page.waitForTimeout(1000);
    await expect(film(page)).not.toHaveAttribute("data-pass3d", /.+/);
    await expect(page.getByLabel(/^Boarding pass/)).toHaveCount(0);
    await expect(page.locator(".fs-ticket")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
