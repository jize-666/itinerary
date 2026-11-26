import { expect, type Page, test } from "@playwright/test";
import { filmFixture, json, seedSession, TRIP } from "./helpers";

/**
 * Tiket 2,5D yang bisa dimainkan (film tanpa WebGL, `?stage=static`): kartu DOM berayun, diseret, dilepas, dibalik.
 * Status ada di `data-pass-flat` pada `main.film`. Data tiruan; backend di-mock.
 */
const CI = !!process.env.CI;
const WAIT = CI ? 30_000 : 15_000;
test.describe.configure({ mode: "default" });
test.beforeEach(() => test.setTimeout(CI ? 180_000 : 90_000));

const film = (page: Page) => page.locator("main.film");
const slide = (page: Page) => film(page).getAttribute("data-slide");
const flat = (page: Page) => film(page).getAttribute("data-pass-flat");
const settled = (page: Page) => expect(film(page)).not.toHaveAttribute("data-moving", "", { timeout: WAIT });
const ticket = (page: Page) => page.getByLabel("Boarding pass: Mira Santoso");

async function open(page: Page, query: string, data: unknown = filmFixture("guest")) {
  await seedSession(page);
  await page.route(TRIP, (r) => json(r, 200, data));
  await page.goto(`/film/${query}#epilogue`);
  await expect(film(page)).toBeVisible({ timeout: WAIT });
  await settled(page);
}

async function goTo(page: Page, id: string) {
  for (let i = 0; i < 12 && (await slide(page)) !== id; i++) {
    const before = Number(await film(page).getAttribute("data-index"));
    await page.keyboard.press("ArrowDown");
    await expect.poll(async () => Number(await film(page).getAttribute("data-index")), { timeout: WAIT }).not.toBe(before);
    await settled(page);
  }
}

/** Pusat kartu di layar; menunggu sampai kartu berhenti bergeser (ayun masuk selesai). */
async function cardPoint(page: Page) {
  const card = page.locator(".fs-ticket .hm-pass");
  let prev = { x: -1e9, y: -1e9 };
  for (let i = 0; i < 40; i++) {
    const b = await card.boundingBox();
    if (b) {
      const p = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
      if (Math.hypot(p.x - prev.x, p.y - prev.y) < 0.5) return p;
      prev = p;
    }
    await page.waitForTimeout(350);
  }
  throw new Error("kartu tidak berhenti");
}

async function openPass(page: Page) {
  await open(page, "?stage=static");
  await goTo(page, "pass");
  await expect.poll(() => flat(page), { timeout: WAIT }).toMatch(/^(ready|resting)$/);
}

test.describe("tiket 2,5D yang hidup", () => {
  test("di slide tiket: data-pass-flat ready/resting dan tiket terlihat", async ({ page }) => {
    await openPass(page);
    await expect(ticket(page)).toBeVisible();
    await expect(film(page)).not.toHaveAttribute("data-pass3d", /.+/);
    // variabel ayun ditulis pengendali
    const roll = await page.locator(".fs-ticket").evaluate((el) => el.style.getPropertyValue("--ps-roll"));
    expect(roll).toMatch(/deg$/);
  });

  test("seret kartu: dragging, lepas: resting", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "seret dengan mouse");
    await openPass(page);
    const p = await cardPoint(page);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await expect.poll(() => flat(page), { timeout: WAIT }).toBe("dragging");
    for (let i = 1; i <= 6; i++) await page.mouse.move(p.x + i * 25, p.y + i * 3);
    expect(await flat(page)).toBe("dragging");
    await page.mouse.up();
    await expect.poll(() => flat(page), { timeout: WAIT }).toBe("swinging");
    await expect.poll(() => flat(page), { timeout: WAIT }).toBe("resting");
    expect(await slide(page)).toBe("pass");
  });

  test("klik membalik kartu (flipped), klik lagi mengembalikan (resting)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "klik mouse di titik kartu");
    await openPass(page);
    const p = await cardPoint(page);
    await page.mouse.click(p.x, p.y);
    await expect.poll(() => flat(page), { timeout: WAIT }).toBe("flipped");
    await page.waitForTimeout(600);
    const q = await cardPoint(page);
    await page.mouse.click(q.x, q.y);
    await expect.poll(() => flat(page), { timeout: WAIT }).toBe("resting");
  });

  test("Enter membalik kartu", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "tombol Enter di keyboard fisik");
    await openPass(page);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("Enter");
    await expect.poll(() => flat(page), { timeout: WAIT }).toBe("flipped");
  });

  test("roda di luar kartu tetap memindah slide, dan data-pass-flat hilang di slide lain", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "roda mouse");
    await openPass(page);
    const box = (await film(page).boundingBox())!;
    const p = await cardPoint(page);
    const x = p.x < box.x + box.width / 2 ? box.x + box.width * 0.93 : box.x + box.width * 0.07;
    await page.mouse.move(x, box.y + box.height * 0.9);
    await page.mouse.wheel(0, 100);
    await expect.poll(() => slide(page), { timeout: WAIT }).toBe("credits");
    await settled(page);
    await expect(film(page)).not.toHaveAttribute("data-pass-flat", /.+/);
  });

  test("geser jari di luar kartu memindah slide", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "sentuhan");
    await openPass(page);
    const box = (await film(page).boundingBox())!;
    const p = await cardPoint(page);
    const x = p.x < box.x + box.width / 2 ? box.x + box.width * 0.93 : box.x + box.width * 0.07;
    const y0 = box.y + box.height * 0.92;
    const cdp = await page.context().newCDPSession(page);
    const pt = (y: number) => [{ x, y }];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pt(y0) });
    for (let i = 1; i <= 10; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pt(y0 - i * 22) });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => slide(page), { timeout: WAIT }).toBe("credits");
  });

  test("Calm mode: tanpa data-pass-flat dan tanpa variabel ayun, tiket DOM terlihat", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("lakon.calm", "1"));
    await open(page, "?stage=static");
    await goTo(page, "pass");
    await page.waitForTimeout(800);
    await expect(film(page)).not.toHaveAttribute("data-pass-flat", /.+/);
    await expect(ticket(page)).toBeVisible();
    const roll = await page.locator(".fs-ticket").evaluate((el) => el.style.getPropertyValue("--ps-roll"));
    expect(roll).toBe("");
  });

  test("data tanpa nama tamu: tanpa tiket dan tanpa galat", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const data = filmFixture("guest") as Record<string, unknown>;
    delete data.private;
    await open(page, "?stage=static", data);
    await goTo(page, "pass");
    await page.waitForTimeout(800);
    await expect(page.locator(".fs-ticket")).toHaveCount(0);
    await expect(film(page)).not.toHaveAttribute("data-pass-flat", /.+/);
    expect(errors).toEqual([]);
  });
});
