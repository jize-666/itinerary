import { expect, type Page, test } from "@playwright/test";
import { filmFixture, json, seedSession, TRIP } from "./helpers";

/**
 * Film (PRD §7, FR-20 s.d. FR-23): satu gerakan = tepat satu slide, gallery menyamping, sheet detail,
 * hash per bab, Calm mode. Data tiruan; backend di-mock.
 */
const film = (page: Page) => page.locator("main.film");
const index = async (page: Page) => Number(await film(page).getAttribute("data-index"));
const slide = (page: Page) => film(page).getAttribute("data-slide");
/** Tunggu sampai tidak ada transisi yang berjalan. */
const settled = (page: Page) => expect(film(page)).not.toHaveAttribute("data-moving", "");

async function open(page: Page, hash = "", role: "guest" | "team" = "guest", data: unknown = filmFixture(role)) {
  await seedSession(page, role);
  await page.route(TRIP, (r) => json(r, 200, data));
  await page.goto(`/film/${hash}`);
  await expect(film(page)).toBeVisible();
  await settled(page);
}

/** Maju ke slide ber-id tertentu dengan keyboard, satu per satu. */
async function goTo(page: Page, id: string) {
  for (let i = 0; i < 40 && (await slide(page)) !== id; i++) {
    const before = await index(page);
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => index(page)).toBe(before + 1);
    await settled(page);
  }
  expect(await slide(page)).toBe(id);
}

test.describe("navigasi per slide (FR-20a)", () => {
  test("satu event roda = tepat satu slide, dua arah", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "roda mouse hanya di desktop");
    await open(page);
    await film(page).hover();
    await page.mouse.wheel(0, 100);
    await expect.poll(() => index(page)).toBe(1);
    await settled(page);
    await page.waitForTimeout(250); // gerakan baru = setelah jeda
    await page.mouse.wheel(0, 100);
    await expect.poll(() => index(page)).toBe(2);
    await settled(page);
    await page.waitForTimeout(250);
    await page.mouse.wheel(0, -100);
    await expect.poll(() => index(page)).toBe(1);
    await settled(page);
    expect(await index(page)).toBe(1);
  });

  test("beberapa takik dalam satu putaran roda tetap satu slide", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "roda mouse hanya di desktop");
    await open(page);
    await film(page).hover();
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(40);
    }
    await expect.poll(() => index(page)).toBe(1);
    await settled(page);
    await page.waitForTimeout(600);
    expect(await index(page)).toBe(1);
  });

  test("gesekan trackpad dengan ekor inersia > 1 detik = tepat satu slide; gesekan kedua = slide kedua", async ({ page }) => {
    await open(page);
    /** Aliran WheelEvent tiruan: dorongan jari ±110 ms, lalu inersia meluruh (delta bulat, seperti trackpad). */
    const swipe = () =>
      page.evaluate(
        () =>
          new Promise<number>((done) => {
            const el = document.querySelector("main.film")!;
            const t0 = performance.now();
            let carry = 0;
            let sent = 0;
            const tick = () => {
              const t = performance.now() - t0;
              const speed = t < 110 ? 34 * Math.sin((Math.PI / 2) * (t / 110)) ** 2 : 34 * Math.exp(-(t - 110) / 330);
              if (t > 110 && speed < 0.05) return done(sent);
              carry += speed;
              const px = Math.floor(carry);
              carry -= px;
              if (px > 0) {
                // trackpad: wheelDelta = −3 × delta (bukan kelipatan 120 seperti takik mouse)
                const e = new WheelEvent("wheel", { deltaY: px, deltaMode: 0, bubbles: true, cancelable: true });
                Object.defineProperty(e, "wheelDeltaY", { value: -3 * px });
                el.dispatchEvent(e);
                sent++;
              }
              setTimeout(tick, 16);
            };
            tick();
          }),
      );
    const events = await swipe();
    expect(events).toBeGreaterThan(40); // benar-benar aliran panjang, bukan satu event
    await settled(page);
    expect(await index(page)).toBe(1);
    await swipe();
    await settled(page);
    expect(await index(page)).toBe(2);
  });

  test("keyboard: panah, spasi, PageDown maju; panah atas mundur; tombol ditahan = satu slide", async ({ page }) => {
    await open(page);
    for (const [key, want] of [
      ["ArrowDown", 1],
      ["Space", 2],
      ["PageDown", 3],
      ["ArrowUp", 2],
    ] as const) {
      await page.keyboard.press(key);
      await expect.poll(() => index(page)).toBe(want);
      await settled(page);
    }
    await page.keyboard.down("ArrowDown");
    for (let i = 0; i < 6; i++) await page.keyboard.down("ArrowDown"); // auto-repeat
    await page.keyboard.up("ArrowDown");
    await expect.poll(() => index(page)).toBe(3);
    await settled(page);
    await page.waitForTimeout(400);
    expect(await index(page)).toBe(3);
  });

  test("selama transisi paling banyak satu langkah diantrekan", async ({ page }) => {
    await open(page);
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowDown");
    await expect.poll(() => index(page)).toBe(2);
    await settled(page);
    await page.waitForTimeout(500);
    expect(await index(page)).toBe(2);
  });

  test("roda di slide tiket (penuh tombol) tetap memindah slide", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "roda mouse hanya di desktop");
    await open(page, "#epilogue");
    await goTo(page, "pass");
    await page.getByLabel("Boarding pass: Mira Santoso").hover();
    await page.mouse.wheel(0, 100);
    await expect.poll(() => slide(page)).toBe("credits");
    await settled(page);
    await page.waitForTimeout(250);
    await page.getByText("Thank you for watching.").hover();
    await page.mouse.wheel(0, -100);
    await expect.poll(() => slide(page)).toBe("pass");
  });

  test("mundur dari slide pertama dan maju dari slide terakhir tidak berpindah", async ({ page }) => {
    await open(page);
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(300);
    expect(await index(page)).toBe(0);
    await page.keyboard.press("End");
    await expect.poll(() => slide(page)).toBe("credits");
    await settled(page);
    const last = await index(page);
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(300);
    expect(await index(page)).toBe(last);
    await page.keyboard.press("Home");
    await expect.poll(() => index(page)).toBe(0);
  });
});

test.describe("geser dengan jari", () => {
  test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name !== "iphone", "sentuhan hanya di HP"));

  /** Seret satu jari dari (x0,y0) ke (x1,y1) selama `ms`, lalu angkat (setelah `hold` ms diam). */
  async function drag(page: Page, from: [number, number], to: [number, number], ms: number, hold = 0) {
    const cdp = await page.context().newCDPSession(page);
    const point = (x: number, y: number) => [{ x: Math.round(x), y: Math.round(y) }];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(...from) });
    const steps = Math.max(4, Math.round(ms / 16));
    for (let i = 1; i <= steps; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: point(from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps) });
      await page.waitForTimeout(ms / steps);
    }
    if (hold) await page.waitForTimeout(hold);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await cdp.detach();
  }

  test("sentakan ke atas = satu slide maju; ke bawah = mundur", async ({ page }) => {
    await open(page);
    await drag(page, [200, 600], [200, 380], 140);
    await expect.poll(() => index(page)).toBe(1);
    await settled(page);
    await drag(page, [200, 300], [200, 520], 140);
    await expect.poll(() => index(page)).toBe(0);
    await settled(page);
  });

  test("scrub: ditarik pelan melewati 35% lalu dilepas → lanjut; di bawah 35% → kembali", async ({ page }) => {
    await open(page);
    const h = page.viewportSize()!.height;
    const span = h * 0.6; // satu slide penuh = 60% tinggi layar (token INPUT.scrubSpan)
    // 20% lalu diam: kembali
    await drag(page, [200, 640], [200, 640 - span * 0.2], 500, 250);
    await settled(page);
    expect(await index(page)).toBe(0);
    // 50% lalu diam: lanjut
    await drag(page, [200, 640], [200, 640 - span * 0.5], 600, 250);
    await expect.poll(() => index(page)).toBe(1);
    await settled(page);
    expect(await index(page)).toBe(1);
  });

  test("satu geseran, sepanjang apa pun, tidak pernah melompati dua slide", async ({ page }) => {
    await open(page);
    const h = page.viewportSize()!.height;
    await drag(page, [200, h - 30], [200, 20], 220); // hampir setinggi layar: lebih dari satu rentang slide
    await expect.poll(() => index(page)).toBe(1);
    await settled(page);
    await page.waitForTimeout(400);
    expect(await index(page)).toBe(1);
  });

  test("gallery: geser ke kiri = panel berikutnya, geser vertikal juga memajukan", async ({ page }) => {
    await open(page, "#day-1");
    await goTo(page, "day-1/walk");
    await drag(page, [320, 420], [90, 430], 140);
    await expect.poll(() => slide(page)).toBe("day-1/market");
    await settled(page);
    await drag(page, [200, 600], [200, 380], 140);
    await expect.poll(() => slide(page)).toBe("day-1/lake");
    await settled(page);
    await drag(page, [90, 420], [320, 430], 140);
    await expect.poll(() => slide(page)).toBe("day-1/market");
  });

  test("geser di slide tiket dan credits tetap memindah slide (tidak terjebak)", async ({ page }) => {
    await open(page, "#epilogue");
    await goTo(page, "pass");
    await drag(page, [200, 430], [200, 210], 140);
    await expect.poll(() => slide(page)).toBe("credits");
    await settled(page);
    await drag(page, [200, 240], [200, 460], 140);
    await expect.poll(() => slide(page)).toBe("pass");
  });

  test("geser menyamping di luar gallery tidak memindah slide; ketukan tetap klik", async ({ page }) => {
    await open(page);
    await drag(page, [320, 420], [60, 425], 140);
    await page.waitForTimeout(400);
    expect(await index(page)).toBe(0);
    await page.getByRole("button", { name: "Calm mode" }).tap();
    await expect(page.getByRole("button", { name: "Calm mode" })).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("isi film", () => {
  test("prolog: judul, nama tamu, lalu fakta kota satu per slide", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("A Three-Day Lakon");
    await expect(page.getByText("for Mira")).toBeVisible();
    await goTo(page, "fact-old");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText("An old city");
    await expect(page.getByText("It began long ago.")).toBeVisible();
    // slide lain tidak terbaca pembaca layar
    expect(await page.locator(".fl-layer[data-pos='cur']").count()).toBe(1);
  });

  test("gallery menampilkan semua stop: transfer & istirahat dilebur sebagai catatan", async ({ page }) => {
    await open(page, "#day-1");
    await expect.poll(() => slide(page)).toBe("day-1/title");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText("The royal day");
    await goTo(page, "day-1/walk");
    const card = page.locator(".gal-card[data-cur]");
    await expect(card.getByRole("heading", { level: 2 })).toHaveText("Morning walk");
    await expect(card.getByText("08:00")).toBeVisible();
    await expect(card.getByText("1 / 4")).toBeVisible();
    await expect(card.locator(".gal-notes")).toContainText("Morning drive"); // transfer sebelum panel pertama
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => slide(page)).toBe("day-1/market");
    await settled(page);
    await expect(page.locator(".gal-card[data-cur] .gal-notes")).toContainText("Afternoon rest");
    expect(await page.locator(".gal-card").count()).toBe(4);
  });

  test("panel → sheet detail: cerita, tips, Maps; Escape menutup dan slide tidak berpindah", async ({ page }) => {
    await open(page, "#day-1");
    await goTo(page, "day-1/walk");
    const opener = page.getByRole("button", { name: "The story: Morning walk" });
    await opener.click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("heading", { level: 2 })).toHaveText("Morning walk");
    await expect(sheet).toContainText("The story of Morning walk.");
    await expect(sheet).toContainText("Go early.");
    await expect(sheet.getByRole("link", { name: "Open in Maps: Morning walk" })).toHaveAttribute("href", /Test%20Palace/);
    expect(await sheet.getByText("Bawa payung").count()).toBe(0); // catatan tim tidak untuk tamu
    await page.keyboard.press("ArrowDown"); // input film mati selama sheet terbuka
    await page.waitForTimeout(300);
    expect(await slide(page)).toBe("day-1/walk");
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(opener).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => slide(page)).toBe("day-1/market");
  });

  test("sheet detail untuk tim memuat catatan tim & perkiraan biaya", async ({ page }) => {
    await open(page, "#day-1", "team");
    await goTo(page, "day-1/walk");
    await page.getByRole("button", { name: "The story: Morning walk" }).click();
    await expect(page.getByRole("dialog")).toContainText("Bawa payung");
    await expect(page.getByRole("dialog")).toContainText("50.000");
  });

  test("epilog: tiket, Open Today, pesan ke host; credits menutup film", async ({ page }) => {
    await open(page, "#epilogue");
    await expect.poll(() => slide(page)).toBe("epilogue");
    await goTo(page, "pass");
    await expect(page.getByLabel("Boarding pass: Mira Santoso")).toBeVisible();
    await expect(page.locator(".fs-actions").getByRole("link", { name: "Open Today" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Message your host" })).toHaveAttribute("href", /wa\.me\/6280000000001\?/);
    // panduan Home Screen terbuka sebagai sheet dan menutup lagi
    await page.getByRole("button", { name: "Add to Home Screen" }).click();
    await expect(page.getByRole("dialog", { name: "Add to Home Screen" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Keep Today on your Home Screen" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Add to Home Screen" })).toBeHidden();
    await goTo(page, "credits");
    await expect(page.getByText("Thank you for watching.")).toBeVisible();
  });
});

test.describe("siklus waktu di gallery: matahari mengikuti jam dan slide", () => {
  /** Pusat cakram matahari di layar + kadar tampaknya. */
  const sun = (page: Page) =>
    page.evaluate(() => {
      const disc = document.querySelector(".fl-sun-disc")!.getBoundingClientRect();
      return { x: disc.x + disc.width / 2, y: disc.y + disc.height / 2, opacity: Number(getComputedStyle(document.querySelector(".fl-sun")!).opacity) };
    });
  const layer = (page: Page, name: string) => page.evaluate((n) => Number(getComputedStyle(document.querySelector(`.fl-sky[data-sky="${n}"]`)!).opacity), name);
  const openDay = (page: Page) => open(page, "#day-1", "guest", filmFixture("guest", { breakfast: true }));

  test("matahari belum tampak saat sarapan, muncul di jadwal berikutnya, lalu letaknya mengikuti jam tiap stop", async ({ page }) => {
    await openDay(page);
    await goTo(page, "day-1/breakfast");
    expect((await sun(page)).opacity).toBe(0);
    await goTo(page, "day-1/walk"); // 08:00, jadwal pertama setelah sarapan
    const morning = await sun(page);
    await goTo(page, "day-1/market"); // 10:30
    const midday = await sun(page);
    await goTo(page, "day-1/lake"); // 17:00, terbenam 17:40
    const evening = await sun(page);
    for (const s of [morning, midday, evening]) expect(s.opacity).toBe(1);
    // timur → barat, tertinggi menjelang tengah hari, rendah menjelang terbenam
    expect(morning.x).toBeLessThan(midday.x);
    expect(midday.x).toBeLessThan(evening.x);
    expect(midday.y).toBeLessThan(morning.y);
    expect(morning.y).toBeLessThan(evening.y);
    // di pita langit di atas kartu, tidak menimpa judul hari
    const head = (await page.locator(".fl-layer[data-pos='cur'] .gal-head").boundingBox())!;
    const disc = (await page.locator(".fl-sun-disc").evaluate((el) => parseFloat(getComputedStyle(el).width))) * (1.5 / 24); // jari-jari cakram = 1,5vmax dari kotak 24vmax
    expect(midday.y - disc).toBeGreaterThanOrEqual(head.y + head.height - 1);
    await goTo(page, "day-1/supper"); // 19:00: sudah terbenam
    expect((await sun(page)).opacity).toBe(0);
    expect(await layer(page, "day")).toBe(0);
  });

  test("warna langit bergradasi menurut jam, bukan sekali ganti per fase", async ({ page }) => {
    await openDay(page);
    await goTo(page, "day-1/breakfast"); // 06:30: subuh, siang baru mulai masuk
    const dawnDay = await layer(page, "day");
    expect(await layer(page, "dawn")).toBe(1);
    expect(dawnDay).toBeGreaterThan(0);
    expect(dawnDay).toBeLessThan(0.3);
    await goTo(page, "day-1/walk"); // 08:00: hampir siang penuh
    const morningDay = await layer(page, "day");
    expect(morningDay).toBeGreaterThan(dawnDay + 0.5);
    expect(morningDay).toBeLessThan(1);
    await goTo(page, "day-1/market"); // 10:30: siang
    expect(await layer(page, "day")).toBe(1);
    expect(await layer(page, "dusk")).toBe(0);
    await goTo(page, "day-1/lake"); // 17:00: senja hampir penuh
    expect(await layer(page, "dusk")).toBeGreaterThan(0.8);
  });

  test("selama transisi matahari bergerak bersama slide tanpa lompatan, lalu diam begitu slide berhenti", async ({ page }) => {
    await openDay(page);
    await goTo(page, "day-1/walk");
    const start = await sun(page);
    await page.evaluate(() => {
      const w = window as unknown as { __sun: number[]; __stop: boolean };
      w.__sun = [];
      w.__stop = false;
      const read = () => {
        const disc = document.querySelector(".fl-sun-disc")!.getBoundingClientRect();
        w.__sun.push(disc.x + disc.width / 2);
        if (!w.__stop) requestAnimationFrame(read);
      };
      requestAnimationFrame(read);
    });
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => slide(page)).toBe("day-1/market");
    await settled(page);
    await page.waitForTimeout(250);
    const xs = await page.evaluate(() => {
      const w = window as unknown as { __sun: number[]; __stop: boolean };
      w.__stop = true;
      return w.__sun;
    });
    const end = await sun(page);
    const total = end.x - start.x;
    expect(total).toBeGreaterThan(20);
    expect(xs.length).toBeGreaterThan(12);
    for (let i = 1; i < xs.length; i++) {
      const step = xs[i]! - xs[i - 1]!;
      expect(step, `frame ${i}: tidak mundur`).toBeGreaterThanOrEqual(-0.5);
      expect(step, `frame ${i}: tidak melompat`).toBeLessThan(total * 0.4);
    }
    // sesudah slide berhenti: matahari diam di letak jam stop tujuan
    expect(new Set(xs.slice(-6).map((x) => Math.round(x))).size).toBe(1);
    expect(Math.abs(xs[xs.length - 1]! - end.x)).toBeLessThan(0.5);
  });

  test("scrub jari: matahari ikut bergeser, diam saat jari diam, dan kembali bila dilepas sebelum ambang", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "sentuhan hanya di HP");
    await openDay(page);
    await goTo(page, "day-1/walk");
    const start = await sun(page);
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", x = 0) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y: 420 }] });
    await touch("touchStart", 320);
    for (let i = 1; i <= 10; i++) {
      await touch("touchMove", 320 - i * 9); // 90 px ≈ seperempat jarak antar kartu: di bawah ambang 35%
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(120);
    const held = await sun(page);
    expect(held.x).toBeGreaterThan(start.x + 2); // sudah ikut bergeser
    await page.waitForTimeout(300);
    const still = await sun(page);
    expect(still.x).toBe(held.x); // jari diam → matahari diam
    expect(still.y).toBe(held.y);
    expect(await slide(page)).toBe("day-1/walk");
    await touch("touchEnd");
    await cdp.detach();
    await settled(page);
    expect(await slide(page)).toBe("day-1/walk");
    expect(Math.abs((await sun(page)).x - start.x)).toBeLessThan(0.5); // kembali ke letak jam stop asal
  });

  test("Calm: tanpa gerak, matahari tetap tiba di letak jam stop tujuan", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openDay(page);
    await goTo(page, "day-1/walk");
    const morning = await sun(page);
    await goTo(page, "day-1/market");
    const midday = await sun(page);
    expect(midday.opacity).toBe(1);
    expect(midday.x).toBeGreaterThan(morning.x);
  });

  test("hari tanpa jam terbit/terbenam: langit tetap memakai fase stop", async ({ page }) => {
    await open(page, "#day-2");
    await goTo(page, "day-2/tea");
    expect([await layer(page, "dawn"), await layer(page, "day")]).toEqual([1, 0]);
    expect((await sun(page)).opacity).toBe(0);
    await goTo(page, "day-2/temple");
    expect(await layer(page, "day")).toBe(1);
    expect((await sun(page)).opacity).toBe(1);
  });
});

test.describe("bab, bahasa, Calm", () => {
  test("hash membuka bab yang benar dan ikut berganti saat pindah bab", async ({ page }) => {
    await open(page, "#day-2");
    expect(await slide(page)).toBe("day-2/title");
    await page.keyboard.press("ArrowUp"); // kembali ke gong penutup Hari 1
    await expect.poll(() => slide(page)).toBe("day-1/gong");
    await expect(page).toHaveURL(/\/film\/#day-1$/);
    await page.keyboard.press("Home");
    await expect.poll(() => index(page)).toBe(0);
    await expect(page).toHaveURL(/\/film\/$/); // prolog: tanpa hash
  });

  test("indikator bab: ketuk untuk melompat, bab aktif ditandai", async ({ page }) => {
    await open(page);
    const rail = page.getByRole("navigation", { name: "Chapters" });
    await expect(rail.getByRole("button")).toHaveCount(5); // prolog, 2 hari, epilog, credits
    await rail.getByRole("button", { name: "Day 2 · The mist day" }).click();
    await expect.poll(() => slide(page)).toBe("day-2/title");
    await settled(page);
    await expect(rail.getByRole("button", { name: "Day 2 · The mist day" })).toHaveAttribute("aria-current", "step");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText("The mist day");
    await page.keyboard.press("ArrowDown"); // fokus di tombol bab tidak menghalangi panah
    await expect.poll(() => slide(page)).toBe("day-2/intro");
  });

  test("ganti bahasa tanpa pindah slide", async ({ page }) => {
    await open(page);
    await goTo(page, "fact-river");
    await page.getByRole("button", { name: /Bahasa Indonesia/ }).click();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText("Sungai panjang");
    expect(await slide(page)).toBe("fact-river");
    await expect(page.getByRole("navigation", { name: "Bab" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "id");
  });

  test("petunjuk navigasi hilang setelah dipakai sekali dan tidak muncul lagi", async ({ page }) => {
    await open(page);
    await expect(page.locator(".fl-hint")).toHaveAttribute("data-shown", "");
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => index(page)).toBe(1);
    await page.keyboard.press("ArrowUp");
    await expect.poll(() => index(page)).toBe(0);
    await settled(page);
    await expect(page.locator(".fl-hint")).not.toHaveAttribute("data-shown", "");
    await page.reload();
    await expect(film(page)).toBeVisible();
    await expect(page.locator(".fl-hint")).not.toHaveAttribute("data-shown", "");
  });

  test("Calm mode: sakelar diingat, navigasi tetap satu slide per gerakan", async ({ page }) => {
    await open(page);
    const calm = page.getByRole("button", { name: "Calm mode" });
    await expect(calm).toHaveAttribute("aria-pressed", "false");
    await calm.click();
    await expect(film(page)).toHaveAttribute("data-calm", "");
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => index(page)).toBe(1);
    await settled(page);
    await page.reload();
    await expect(page.getByRole("button", { name: "Calm mode" })).toHaveAttribute("aria-pressed", "true");
  });

  test("reduced motion → Calm otomatis, teks langsung tampil", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    await expect(film(page)).toHaveAttribute("data-calm", "");
    await expect(page.getByRole("button", { name: "Calm mode" })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => index(page)).toBe(1);
    await settled(page);
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  });

  test("tidak ada geser menyamping atau scroll halaman di film", async ({ page }) => {
    await open(page, "#day-1");
    await goTo(page, "day-1/walk");
    const overflow = await page.evaluate(() => ({ x: document.documentElement.scrollWidth - window.innerWidth, y: document.documentElement.scrollHeight - window.innerHeight }));
    expect(overflow).toEqual({ x: 0, y: 0 });
  });
});
