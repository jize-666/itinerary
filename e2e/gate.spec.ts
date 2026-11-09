import { expect, test } from "@playwright/test";
import { FUTURE, json, seedSession, TRIP, tripFixture, VERIFY } from "./helpers";

const session = (page: import("@playwright/test").Page) => page.evaluate(() => JSON.parse(localStorage.getItem("lakon.session") ?? "null"));
const codeInput = (page: import("@playwright/test").Page) => page.getByLabel("Booking code");
// Next.js punya route announcer sendiri ber-role alert; pesan gerbang diambil spesifik.
const alert = (page: import("@playwright/test").Page) => page.getByRole("alert").and(page.locator(".gate-msg"));

test("kode salah: pesan EN, sisa percobaan, lalu bisa diketik ulang", async ({ page }) => {
  await page.route(VERIFY, (r) => json(r, 401, { error: "wrong_code", remaining: 3 }));
  await page.goto("/");
  await codeInput(page).pressSequentially("AAA111BBB");
  await expect(alert(page)).toContainText("doesn’t open this door");
  await expect(alert(page)).toContainText("3 tries left");
  await expect(codeInput(page)).toBeEnabled();
  await expect(codeInput(page)).toHaveValue("");
  expect(await session(page)).toBeNull();
});

test("kode benar (ditempel, huruf kecil, tanda hubung): disapa nama, tiket pribadi, tidak diminta lagi, Begin → film", async ({ page }) => {
  let sent = "";
  await page.route(TRIP, (r) => json(r, 200, tripFixture("guest")));
  await page.route(VERIFY, (r) => {
    sent = JSON.parse(r.request().postData() ?? "{}").code;
    return json(r, 200, { token: "tok.guest-abcdef", role: "guest", exp: FUTURE });
  });
  await page.goto("/");
  await expect(page.getByText("A private invitation")).toBeVisible();
  await codeInput(page).fill("abc-123 xyz");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sugeng rawuh, Mira.");
  await expect(page.getByText("This lakon was written for one guest.")).toBeVisible();
  const ticket = page.getByRole("article", { name: /Boarding pass: Mira Santoso/ });
  await expect(ticket).toContainText("Admit one");
  await expect(ticket).toContainText("CCC");
  await expect(ticket).toContainText("With the host");
  expect(sent).toBe("ABC123XYZ");
  expect(await session(page)).toMatchObject({ token: "tok.guest-abcdef", role: "guest" });

  await page.reload();
  await expect(page.getByText("Welcome back. Your seat is still saved.")).toBeVisible();
  await expect(codeInput(page)).toHaveCount(0);

  await page.getByRole("button", { name: /Begin quietly/ }).click();
  await expect(page).toHaveURL(/\/film\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("A Three-Day Lakon");
  await expect(page.getByText("for Mira")).toBeVisible();
});

test("kode tim: masuk ke Today dan melihat catatan tim", async ({ page }) => {
  await page.route(VERIFY, (r) => json(r, 200, { token: "tok.team-abcdef", role: "team", exp: FUTURE }));
  let auth = "";
  await page.route(TRIP, (r) => {
    auth = r.request().headers().authorization ?? "";
    return json(r, 200, tripFixture("team"));
  });
  await page.goto("/");
  await codeInput(page).fill("TIM123456");
  await expect(page.getByText("Team access")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sugeng rawuh."); // tim tidak disapa dengan nama tamu
  await page.getByRole("button", { name: /Begin quietly/ }).click();
  await expect(page).toHaveURL(/\/today\/$/);
  await expect(page.getByText("Team note:")).toBeVisible();
  expect(auth).toBe("Bearer tok.team-abcdef");
});

test("terkunci: hitung mundur, kotak mati, lalu bisa lagi", async ({ page }) => {
  await page.route(VERIFY, (r) => json(r, 429, { error: "locked", retryAfter: 2 }));
  await page.goto("/");
  await codeInput(page).fill("AAA111BBB");
  await expect(alert(page)).toContainText(/Please wait [12] seconds/);
  await expect(codeInput(page)).toBeDisabled();
  await expect(codeInput(page)).toBeEnabled({ timeout: 5_000 });
});

test("tidak ada koneksi: pesan yang jelas", async ({ page }) => {
  await page.route(VERIFY, (r) => r.abort("internetdisconnected"));
  await page.goto("/");
  await codeInput(page).fill("AAA111BBB");
  await expect(alert(page)).toContainText("No connection");
});

test("/film dan /today tanpa token → kembali ke gerbang (FR-01)", async ({ page }) => {
  for (const path of ["/today/", "/film/"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/$/);
    await expect(codeInput(page)).toBeVisible();
  }
});

test("token ditolak server → sesi dihapus → gerbang", async ({ page }) => {
  await seedSession(page);
  await page.route(TRIP, (r) => json(r, 401, { error: "expired" }));
  await page.goto("/today/");
  await expect(codeInput(page)).toBeVisible();
  expect(await session(page)).toBeNull();
});

test("Today tamu: jadwal sebagai teks, tanpa catatan tim, ikut bahasa", async ({ page }) => {
  await seedSession(page);
  await page.route(TRIP, (r) => json(r, 200, tripFixture("guest")));
  await page.goto("/today/");
  await expect(page.getByText("Morning walk")).toBeVisible();
  await expect(page.getByText("Welcome, Mira. This lakon was written for you.")).toBeVisible();
  await expect(page.getByText(/\d+ days until Solo/)).toBeVisible();
  await expect(page.getByRole("article", { name: /Mira Santoso/ })).toBeVisible();
  await expect(page.getByText(/Day 1 ·/)).toBeVisible();
  await expect(page.getByText("Team note")).toHaveCount(0);
  await page.getByRole("button", { name: "Bahasa Indonesia" }).click();
  await expect(page.getByText("Jalan pagi")).toBeVisible();
  await expect(page.getByText(/Hari 1 ·/)).toBeVisible();
});

test("toggle bahasa: tanpa reload, default EN, tersimpan, atribut lang ikut (FR-11)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Enter the code written for you")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const marker = await page.evaluate(() => ((window as unknown as { __m: number }).__m = Math.random()));
  await page.getByRole("button", { name: "Bahasa Indonesia" }).click();
  await expect(page.getByText("Masukkan kode yang ditulis untukmu")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "id");
  expect(await page.evaluate(() => (window as unknown as { __m: number }).__m)).toBe(marker); // tidak reload
  await page.reload();
  await expect(page.getByText("Masukkan kode yang ditulis untukmu")).toBeVisible();
  await expect(page.getByRole("button", { name: "Bahasa Indonesia" })).toHaveAttribute("aria-pressed", "true");
});
