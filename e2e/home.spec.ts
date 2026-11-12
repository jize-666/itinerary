import { expect, type Page, test } from "@playwright/test";
import { FUTURE, json, seedSession, TRIP, tripFixture, VERIFY } from "./helpers";

const home = (page: Page) => page.locator("main.home");
const vars = (page: Page) => home(page).evaluate((el) => [el.style.getPropertyValue("--mx"), el.style.getPropertyValue("--my")].map(Number));
const codeInput = (page: Page) => page.getByLabel("Booking code");

test.beforeEach(async ({ page }) => {
  await page.route(TRIP, (r) => json(r, 200, tripFixture("guest")));
  await page.route(VERIFY, (r) => json(r, 200, { token: "tok.guest-abcdef", role: "guest", exp: FUTURE }));
});

test.describe("home 2,5D", () => {
  test("lapisan dan kartu mengikuti kursor, lalu kembali ke tengah (desktop)", async ({ page, isMobile }) => {
    test.skip(isMobile, "layar sentuh tidak punya kursor");
    await page.goto("/");
    await expect(codeInput(page)).toBeVisible();
    await page.mouse.move(1200, 650, { steps: 8 });
    await expect.poll(async () => (await vars(page))[0]).toBeGreaterThan(0.7);
    expect((await vars(page))[1]).toBeGreaterThan(0.5);
    // kartu benar-benar miring: transform-nya bukan matriks identitas
    const tilted = await page.locator(".hm-card").evaluate((el) => getComputedStyle(el).transform);
    expect(tilted).toMatch(/^matrix3d\(/);
    await page.mouse.move(80, 40, { steps: 8 });
    await expect.poll(async () => (await vars(page))[0]).toBeLessThan(-0.7);
    expect((await vars(page))[1]).toBeLessThan(-0.5);
    // jendela kehilangan fokus → kembali ke tengah dan rAF berhenti di nol tepat
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect.poll(() => vars(page)).toEqual([0, 0]);
  });

  test("layar sentuh: tanpa parallax kursor, lapisan berayun lewat CSS (HP)", async ({ page, isMobile }) => {
    test.skip(!isMobile, "hanya untuk layar sentuh");
    await page.goto("/");
    await expect(codeInput(page)).toBeVisible();
    await page.mouse.move(300, 500, { steps: 4 });
    await page.waitForTimeout(250);
    expect(await home(page).evaluate((el) => el.style.getPropertyValue("--mx"))).toBe("");
    expect(await page.locator(".hm-ridge").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("hm-sway");
  });

  test("reduced motion: tidak ada parallax, ayunan, atau debu bergerak; sambutan langsung tampil", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(codeInput(page)).toBeVisible();
    await page.mouse.move(1000, 600, { steps: 4 });
    await page.waitForTimeout(250);
    expect(await home(page).evaluate((el) => el.style.getPropertyValue("--mx"))).toBe("");
    for (const sel of [".hm-ridge", ".hm-card", ".hm-dust i"]) expect(await page.locator(sel).first().evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    await codeInput(page).fill("ABC123XYZ");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sugeng rawuh, Mira.");
  });

  test("kode benar: kayon menyibak dan panggungnya tetap yang sama (tidak diulang)", async ({ page }) => {
    await page.goto("/");
    await expect(home(page)).toHaveAttribute("data-mode", "gate");
    await expect(home(page)).not.toHaveAttribute("data-open", "");
    await page.locator(".hm-scene").evaluate((el) => ((el as HTMLElement & { __same?: boolean }).__same = true));
    await codeInput(page).fill("ABC123XYZ");
    await expect(home(page)).toHaveAttribute("data-open", ""); // sudah menyibak selagi kartu berbalik
    await expect(home(page)).toHaveAttribute("data-mode", "welcome");
    await expect(home(page)).toHaveAttribute("data-open", "");
    expect(await page.locator(".hm-scene").evaluate((el) => (el as HTMLElement & { __same?: boolean }).__same)).toBe(true);
    await expect(page.getByRole("article", { name: /Boarding pass: Mira Santoso/ })).toBeVisible();
  });

  test("tidak ada geser menyamping di gerbang maupun sambutan", async ({ page }) => {
    const noSideScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    await page.goto("/");
    await expect(codeInput(page)).toBeVisible();
    expect(await noSideScroll()).toBe(true);
    await codeInput(page).fill("ABC123XYZ");
    await expect(page.getByRole("button", { name: "Begin the lakon" })).toBeVisible();
    expect(await noSideScroll()).toBe(true);
  });
});

test.describe("tombol home", () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  test("tombol utama tertekan saat disentuh, lalu kembali", async ({ page }) => {
    await page.goto("/");
    const begin = page.getByRole("button", { name: "Begin the lakon" });
    await expect(begin).toBeVisible();
    const box = (await begin.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(begin).toHaveAttribute("data-pressed", "");
    await page.mouse.move(5, 5); // lepas di luar tombol: tidak jadi mulai
    await page.mouse.up();
    await expect(begin).not.toHaveAttribute("data-pressed", "");
    await expect(page).toHaveURL(/\/$/);
  });

  test("sakelar bahasa dan speaker memakai gaya home; di film kembali ke gaya lama", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("group", { name: "Language" })).toHaveClass(/segl/);
    await expect(page.getByRole("button", { name: "Gamelan sound" })).toHaveClass(/hb--icon/);
    await page.getByRole("button", { name: /Bahasa Indonesia/ }).click();
    await expect(page.getByRole("button", { name: "Mulai lakonnya" })).toBeVisible();
    await page.getByRole("button", { name: "Mulai lakonnya" }).click();
    await expect(page).toHaveURL(/\/film\/$/);
    await expect(page.getByRole("group", { name: "Bahasa" })).toHaveClass(/(^| )seg( |$)/);
  });

  test("pakai kode lain: tautan di bawah tombol utama mengembalikan ke gerbang", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Use a different code" }).click();
    await expect(codeInput(page)).toBeVisible();
    await expect(home(page)).toHaveAttribute("data-mode", "gate");
    await expect(home(page)).not.toHaveAttribute("data-open", "");
  });
});
