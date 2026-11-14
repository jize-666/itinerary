import { expect, type Page, test } from "@playwright/test";
import { json, seedSession, TRIP, todayFixture, wib } from "./helpers";

async function openToday(page: Page, at: string, role: "guest" | "team" = "guest") {
  await page.clock.setFixedTime(wib(at));
  await seedSession(page, role);
  await page.route(TRIP, (r) => json(r, 200, todayFixture(role)));
  await page.goto("/today/");
}
const nowCard = (page: Page) => page.locator(".nn-now");
const nextCard = (page: Page) => page.locator(".nn-next");

test.describe("Today selama trip", () => {
  test("Hari 1 pukul 10.45: kepala hari, Now/Next, dan hitung mundur", async ({ page }) => {
    await openToday(page, "2027-04-08T10:45:00");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("The royal day");
    await expect(page.getByText("Day 1 · Thu 8 Apr").first()).toBeVisible();
    await expect(page.getByText("Sunrise 05:35")).toBeVisible();
    await expect(nowCard(page)).toContainText("Cloth market");
    await expect(nowCard(page)).toContainText("until 11:30 · 45 min left");
    await expect(nextCard(page)).toContainText("Spicy lunch");
    await expect(nextCard(page)).toContainText("in 45 min");
    // timeline: stop yang lewat ditandai, yang berlangsung & berikutnya diberi label
    await expect(page.locator('.tl-stop[data-state="past"]')).toContainText("Morning walk");
    await expect(page.locator('.tl-stop[data-state="now"]')).toContainText("Cloth market");
    await expect(page.getByRole("button", { name: /Day 1/ })).toHaveAttribute("aria-pressed", "true");
  });

  test("jam jemput tampil tanpa ketukan (S5)", async ({ page }) => {
    await openToday(page, "2027-04-08T07:00:00");
    await expect(nextCard(page)).toContainText("Morning walk");
    await expect(nextCard(page)).toContainText("Pickup 07:45 · lobby");
    await expect(nextCard(page).getByText("Pickup 07:45 · lobby")).toBeInViewport();
  });

  test("malam hari: berikutnya besok subuh, jadwal besok yang disorot", async ({ page }) => {
    await openToday(page, "2027-04-08T23:00:00");
    await expect(nowCard(page)).toContainText("Free time");
    await expect(nextCard(page)).toContainText("Tomorrow, 04:00");
    await expect(nextCard(page)).toContainText("Pickup 03:50 · gate");
    await expect(page.getByRole("button", { name: /Day 2/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: /Day 1/ })).toHaveAttribute("aria-current", "date");
  });

  test.describe("HP ber-zona lain", () => {
    test.use({ timezoneId: "America/Los_Angeles" });
    test("hasil sama: hari & jam dihitung di WIB", async ({ page }) => {
      await openToday(page, "2027-04-08T10:45:00");
      expect(await page.evaluate(() => new Date().getHours())).not.toBe(10); // jam lokal perangkat memang berbeda
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("The royal day");
      await expect(nowCard(page)).toContainText("Cloth market");
      await expect(nextCard(page)).toContainText("in 45 min");
    });
  });

  test("Maps membuka tempat yang benar, salin alamat memberi tanda", async ({ page, context }, info) => {
    await openToday(page, "2027-04-08T10:45:00");
    const maps = page.getByRole("link", { name: "Open in Maps: Cloth market" }).last();
    await expect(maps).toHaveAttribute("href", "https://www.google.com/maps/search/?api=1&query=Test%20Market");
    await expect(maps).toHaveAttribute("target", "_blank");
    await expect(maps).toHaveAttribute("rel", /noopener/);
    if (info.project.name === "desktop") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy address: Cloth market" }).click();
    await expect(page.locator(".toast")).toHaveText(/Address copied|Couldn’t copy/);
    if (info.project.name === "desktop") expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Test Market");
  });

  test("Rain plan menampilkan rencana hujan", async ({ page }) => {
    await openToday(page, "2027-04-08T10:45:00");
    await expect(page.getByText("If it rains: the covered hall.")).toHaveCount(0);
    const rain = page.getByRole("button", { name: "Rain plan" });
    await rain.click();
    await expect(rain).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("If it rains: the covered hall.")).toBeVisible();
    await expect(page.getByText("Showing what changes if it rains.")).toBeVisible();
  });

  test("penanda makanan: halal, tingkat manis, tanpa pisang", async ({ page }) => {
    await openToday(page, "2027-04-08T10:45:00");
    const market = page.locator(".tl-stop", { hasText: "Cloth market" });
    await expect(market.locator(".chip")).toHaveText(["Halal", "Sweet", "No banana"]);
  });

  test("bilah kontak: WhatsApp dengan pesan EN terisi, telepon, dan sheet darurat", async ({ page }) => {
    await openToday(page, "2027-04-08T10:45:00");
    const wa = page.getByRole("link", { name: "WhatsApp Host" });
    const href = (await wa.getAttribute("href")) ?? "";
    expect(href.startsWith("https://wa.me/6280000000001?text=")).toBe(true);
    expect(decodeURIComponent(href.split("text=")[1] ?? "")).toBe("Hi! It’s Mira, messaging from the Today page.");
    // dock: host utama di kiri, telepon host, SOS di kanan
    await expect(page.getByRole("link", { name: "Call Host" })).toHaveAttribute("href", "tel:+6280000000001");

    const sos = page.getByRole("button", { name: /SOS/ });
    await expect(sos).toHaveAccessibleName("SOS Emergency");
    await sos.click();
    const sheet = page.getByRole("dialog", { name: "If you need help" });
    await expect(sheet).toBeVisible();
    // fokus di judul sheet (dibacakan), bukan di tombol tutup yang lalu tampak bercincin (audit host 14 Nov)
    await expect(sheet.getByRole("heading", { name: "If you need help" })).toBeFocused();
    await expect(sheet.getByRole("button", { name: "Close" })).not.toBeFocused();
    await expect(sheet.getByRole("link", { name: /112/ })).toHaveAttribute("href", "tel:112");
    await expect(sheet.getByRole("link", { name: "Call Guide" })).toHaveAttribute("href", "tel:+6280000000002");
    await expect(sheet.getByText("Jl. Uji No. 1")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(sos).toBeFocused();
    // pola modal: tombol tutup di kanan atas
    await sos.click();
    await sheet.getByRole("button", { name: "Close" }).click();
    await expect(sheet).toBeHidden();
  });

  test("tombol tekan (bahasa kapsul, tanpa tebal 3D): wajah tombol mengecil saat ditekan, lalu kembali", async ({ page }) => {
    await openToday(page, "2027-04-08T10:45:00");
    const sos = page.getByRole("button", { name: /SOS/ });
    await expect(sos).toBeVisible();
    await page.waitForTimeout(1300); // dock selesai masuk
    const face = () => sos.locator(".pb-face").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
    // tebal di bawah wajah tombol (ciri versi lama) tidak digambar lagi di Today
    expect(await sos.evaluate((el) => getComputedStyle(el, "::before").display)).toBe("none");
    const box = (await sos.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(sos).toHaveAttribute("data-pressed", "");
    await expect.poll(face).toBeLessThan(0.97);
    await page.mouse.up();
    await expect(sos).not.toHaveAttribute("data-pressed", "");
    await expect.poll(face).toBeGreaterThan(0.995);
  });

  test("tim: catatan tim & biaya; tamu tidak pernah melihatnya", async ({ page }) => {
    await openToday(page, "2027-04-08T10:45:00", "team");
    await expect(page.getByRole("heading", { name: "Team notes" })).toBeVisible();
    await expect(page.getByText("Catatan medis uji.")).toBeVisible();
    await expect(page.getByText("Pesan meja")).toBeVisible();
  });

  test("tamu: tanpa catatan tim", async ({ page }) => {
    await openToday(page, "2027-04-08T10:45:00");
    await expect(page.getByRole("heading", { name: "Team notes" })).toHaveCount(0);
    await expect(page.getByText("Team note")).toHaveCount(0);
  });

  test("ganti bahasa: Today ikut ID", async ({ page }) => {
    await openToday(page, "2027-04-08T10:45:00");
    await page.getByRole("button", { name: "Bahasa Indonesia" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hari keraton");
    await expect(nowCard(page)).toContainText("sisa 45 menit");
    await expect(page.getByRole("button", { name: "Rencana hujan" })).toBeVisible();
  });

  test("gerbang mengarahkan ke Today selama trip (kunjungan ulang)", async ({ page }) => {
    await page.clock.setFixedTime(wib("2027-04-08T10:45:00"));
    await seedSession(page);
    await page.route(TRIP, (r) => json(r, 200, todayFixture()));
    await page.goto("/");
    await expect(page).toHaveURL(/\/today\/$/);
    await expect(nowCard(page)).toContainText("Cloth market");
  });
});

test.describe("Today di luar trip", () => {
  test("sebelum trip: hitung mundur & checklist Before you go yang diingat", async ({ page }) => {
    await openToday(page, "2027-03-28T09:00:00");
    await expect(page.getByText("10 days until Solo")).toBeVisible();
    await expect(nextCard(page)).toContainText("The first scene");
    await expect(nextCard(page)).toContainText("Check in");
    await expect(page.getByText("0 of 2 ready")).toBeVisible();
    await page.getByText("Cash", { exact: true }).click();
    await expect(page.getByText("1 of 2 ready")).toBeVisible();
    await page.reload();
    await expect(page.getByText("1 of 2 ready")).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /Cash/ })).toBeChecked();
  });

  test("setelah trip: ucapan terima kasih, tanpa kartu Now/Next", async ({ page }) => {
    await openToday(page, "2027-04-12T09:00:00");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Until next time.");
    await expect(page.getByText("Thank you for coming.")).toBeVisible();
    await expect(page.locator(".nn")).toHaveCount(0);
  });

  test("tidak ada geser menyamping di HP", async ({ page }) => {
    await openToday(page, "2027-04-08T10:45:00");
    await page.waitForTimeout(1500); // kayon judul sudah lewat
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});

test.describe("Today 2,5D (permintaan host 14 Nov): latar berlapis, gerak pandang, tombol kapsul", () => {
  type M = { is3d: boolean; a: number; m13: number; m31: number; m43: number; identity: boolean; opacity: number };
  /** Matriks transform terhitung satu elemen (dibaca di browser). */
  const matrixOf = (page: Page, selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el): M => {
        const cs = getComputedStyle(el);
        const m = new DOMMatrix(cs.transform === "none" ? undefined : cs.transform);
        return { is3d: !m.is2D, a: m.a, m13: m.m13, m31: m.m31, m43: m.m43, identity: m.isIdentity, opacity: Number(cs.opacity) };
      });
  const translateOf = (page: Page, selector: string) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).translate);

  test("latar berlapis di belakang isi: langit, dua punggung bukit, debu emas; tidak terbaca screen reader", async ({ page }) => {
    await openToday(page, "2027-04-08T10:45:00");
    const scene = page.locator(".tds");
    await expect(scene).toHaveAttribute("aria-hidden", "true");
    await expect(scene.locator(".tds-ridge")).toHaveCount(2);
    expect(await scene.evaluate((el) => getComputedStyle(el).position)).toBe("fixed");
    expect(await scene.evaluate((el) => Number(getComputedStyle(el).zIndex))).toBeLessThan(0);
    // langit mengikuti jam: 10.45 = siang
    await expect(scene).toHaveAttribute("data-sky", "day");
  });

  test("kamera parallax dan perspective shift: kursor di tepi menggeser latar dan memutar kartu", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "kursor hanya di desktop");
    await openToday(page, "2027-04-08T10:45:00");
    await page.mouse.move(640, 400);
    await page.waitForTimeout(1200);
    const ridge0 = await translateOf(page, ".tds-ridge[data-depth='near']");
    await page.mouse.move(1270, 400);
    await expect.poll(() => page.locator(".td").evaluate((el) => Number(el.style.getPropertyValue("--lx") || "0")), { timeout: 10_000 }).toBeGreaterThan(0.6);
    expect(await translateOf(page, ".tds-ridge[data-depth='near']")).not.toBe(ridge0);
    // kartu Now/Next memutar mengitari sumbu tegak: matriks 3D dengan perspektif
    const card = await matrixOf(page, ".nn");
    expect(card.is3d).toBe(true);
    expect(Math.abs(card.m13) + Math.abs(card.m31)).toBeGreaterThan(0.02);
  });

  test("kedalaman ikut gulir: bukit dekat membesar saat digulir, kartu di bawah lipatan datang dari kedalaman", async ({ page }) => {
    await openToday(page, "2027-04-08T10:45:00");
    await page.waitForTimeout(800);
    const before = (await matrixOf(page, ".tds-ridge[data-depth='near']")).a;
    // kartu di bawah layar (belum masuk): mundur ke belakang
    const last = await matrixOf(page, ".tl-stop:last-child");
    expect(last.m43 !== 0 || last.opacity < 1).toBe(true);
    await page.evaluate(() => window.scrollTo(0, innerHeight * 1.2));
    await expect.poll(async () => (await matrixOf(page, ".tds-ridge[data-depth='near']")).a).toBeGreaterThan(before + 0.05);
  });

  test("tombol kapsul: SOS bermedali, sakelar bahasa bergaris seperti home", async ({ page }) => {
    await openToday(page, "2027-04-08T10:45:00");
    await expect(page.getByRole("button", { name: /SOS/ }).locator(".dock-orb")).toHaveCount(1);
    await expect(page.locator(".lang-toggle")).toHaveClass(/segl/);
    expect(await page.locator(".dock-sos").evaluate((el) => getComputedStyle(el).getPropertyValue("--r").trim())).toBe("999px");
  });

  test("gerak dikurangi: latar dan kartu diam, tanpa kemiringan", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openToday(page, "2027-04-08T10:45:00");
    await page.waitForTimeout(800);
    expect((await matrixOf(page, ".nn")).identity).toBe(true);
    await page.evaluate(() => window.scrollTo(0, innerHeight));
    await page.waitForTimeout(300);
    expect((await matrixOf(page, ".tds-ridge[data-depth='near']")).identity).toBe(true);
  });
});
