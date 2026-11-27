import { expect, type Page, test } from "@playwright/test";
import { filmFixture, json, seedSession, TRIP } from "./helpers";

/**
 * Izin sensor gerak di iPhone. Laporan host 20 Nov (iPhone produksi): "izin akses gerakan sering tidak muncul".
 *
 * Chromium tidak punya `DeviceOrientationEvent.requestPermission`, jadi dipasang tiruan yang mengikuti aturan WebKit
 * (Source/WebCore/dom/DeviceOrientationEvent.cpp dan DeviceOrientationAndMotionAccessController.cpp): tanpa gesture
 * pengguna yang sah, status tetap "prompt" dan janji ditolak dengan NotAllowedError tanpa dialog. Gesture yang sah =
 * event pemicu aktivasi menurut spesifikasi HTML (dikutip juga di WebCore/page/EventHandler.cpp): touchend, pointerup
 * selain mouse, click, keydown; bukan pointerdown/touchstart dari sentuhan. Jenis event dibaca dari `window.event`
 * saat izin diminta (`navigator.userActivation` tidak bisa dipakai: evaluate Playwright ikut memberi aktivasi).
 */
test.skip(({ isMobile }) => !isMobile, "izin sensor gerak hanya diminta di HP (iPhone)");

type Ask = { event: string; result: "granted" | "rejected" };
const asks = (page: Page) => page.evaluate(() => (window as unknown as { __motionAsks: Ask[] }).__motionAsks);

/** `notCountedFirst`: sentuhan pertama tidak dihitung Safari sebagai gesture (akhir geser slide). */
async function stubPermission(page: Page, notCountedFirst = false) {
  await page.addInitScript((notCountedFirst) => {
    const log: { event: string; result: string }[] = [];
    (window as unknown as { __motionAsks: typeof log }).__motionAsks = log;
    const activating = (e: Event | undefined) =>
      !!e && (e.type === "touchend" || e.type === "click" || e.type === "keydown" || (e.type === "pointerup" && (e as PointerEvent).pointerType !== "mouse"));
    Object.defineProperty(window.DeviceOrientationEvent, "requestPermission", {
      configurable: true,
      value: () => {
        const e = (window as unknown as { event?: Event }).event;
        const event = e?.type ?? "none";
        if (!activating(e) || (notCountedFirst && log.length === 0)) {
          log.push({ event, result: "rejected" });
          return Promise.reject(new DOMException("Requesting device orientation access requires a user gesture to prompt", "NotAllowedError"));
        }
        log.push({ event, result: "granted" });
        return Promise.resolve("granted");
      },
    });
  }, notCountedFirst);
}

test("film: sentuhan pertama yang tidak dihitung sebagai gesture (ditolak tanpa dialog) tidak menghabiskan kesempatan; ketukan berikutnya meminta izin", async ({ page }) => {
  await stubPermission(page, true);
  await seedSession(page);
  await page.route(TRIP, (r) => json(r, 200, filmFixture("guest")));
  await page.goto("/film/");
  await expect(page.locator("main.film")).toBeVisible();
  const { width, height } = page.viewportSize()!;
  await page.touchscreen.tap(width / 2, height * 0.3);
  await expect.poll(() => asks(page)).toEqual([{ event: "touchend", result: "rejected" }]);
  await page.touchscreen.tap(width / 2, height * 0.3);
  await expect.poll(async () => (await asks(page)).at(-1)).toEqual({ event: "touchend", result: "granted" });
});

test("maket: ketukan pertama meminta izin di dalam gesture yang sah", async ({ page }) => {
  test.setTimeout(150_000);
  await stubPermission(page);
  await seedSession(page);
  await page.addInitScript(() => localStorage.setItem("lakon.calm", "0"));
  await page.goto("/diorama/?q=high");
  await expect(page.locator(".dio-root")).toHaveAttribute("data-ready", "true", { timeout: 60_000 });
  const box = (await page.locator(".dio-root canvas").first().boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(async () => (await asks(page)).at(-1)?.result).toBe("granted");
});
