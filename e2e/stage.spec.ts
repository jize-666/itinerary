import { expect, type Page, test } from "@playwright/test";
import { filmFixture, json, seedSession, todayFixture, TRIP } from "./helpers";

/**
 * Panggung 3D (PRD §12, F2): kanvas WebGL di belakang teks film. Chromium di e2e tidak punya GPU (SwiftShader),
 * jadi tanpa paksaan film tetap 2,5D; di sini tier dipaksa lewat `?stage=` untuk menguji jalur 3D.
 * Data tiruan; backend di-mock.
 */
/**
 * Runner CI (GitHub, tanpa GPU) menggambar panggung 3D di CPU: ±2–4 frame per detik pada tier Low, lebih lambat lagi
 * bila dua kanvas 3D berjalan bersamaan. Di sana tes 3D diberi waktu tiga kali lipat dan dijalankan satu per satu
 * di berkas ini. Pemeriksaannya sama; yang ditambah hanya waktu menunggu frame.
 */
const CI = !!process.env.CI;
const WAIT = CI ? 45_000 : 15_000;
const WAIT_LONG = CI ? 90_000 : 30_000;
test.describe.configure({ mode: "default" });
test.slow(CI, "panggung 3D digambar CPU di runner CI tanpa GPU");

const film = (page: Page) => page.locator("main.film");
const canvas = (page: Page) => page.locator(".fl-canvas canvas");
const settled = (page: Page) => expect(film(page)).not.toHaveAttribute("data-moving", "");
type Stats = { tier: string; bloom: string; frames: number; calls: number; triangles: number; camera: [number, number, number]; fov: number; index: number; moving: boolean; strikes: number; gate: { end: "head" | "tail" | null; planted: number; face: "agung" | "murka" } };
const stats = (page: Page) => page.evaluate(() => (window as unknown as { __lakonStage?: Stats }).__lakonStage ?? null);
/** Tunggu frame baru tergambar sesudah saat ini (loop 3D berjalan). */
async function nextFrames(page: Page, more = 3) {
  const from = (await stats(page))?.frames ?? 0;
  await expect.poll(async () => (await stats(page))?.frames ?? 0, { timeout: WAIT }).toBeGreaterThanOrEqual(from + more);
}

async function open(page: Page, query = "", hash = "") {
  await seedSession(page);
  await page.route(TRIP, (r) => json(r, 200, filmFixture("guest", { breakfast: true })));
  await page.goto(`/film/${query}${hash}`);
  await expect(film(page)).toBeVisible();
  await settled(page);
}

const gateOf = (page: Page) => film(page).getAttribute("data-gate");

/**
 * Film 3D yang dibuka di slide pertama mulai dengan gunungan pembuka tertancap (gate.ts): cabut dulu dengan satu
 * langkah, supaya tes mulai dari prolog seperti sebelum ada gerbang.
 */
async function openGate(page: Page) {
  await expect.poll(() => gateOf(page), { timeout: WAIT_LONG }).not.toBe("wait");
  if ((await gateOf(page)) === "head") {
    await page.keyboard.press("ArrowDown");
    await expect.poll(async () => (await stats(page))?.gate.planted ?? 0, { timeout: WAIT }).toBe(0);
  }
  await expect(film(page)).not.toHaveAttribute("data-gate", /.+/);
}

/**
 * Slide judul hari dan hero prolog punya tahap gong (Tugas 7b, beat.ts): langkah maju pertama mengeluarkan teks dan
 * menabuh gong tanpa pindah slide. Lewati tahap itu (bila belum) supaya langkah maju berikutnya memindah slide.
 */
async function release(page: Page) {
  const kind = await film(page).getAttribute("data-kind");
  if ((kind !== "title" && kind !== "hero") || (await film(page).getAttribute("data-beat")) === "out") return;
  await page.keyboard.press("ArrowDown");
  await expect(film(page)).toHaveAttribute("data-beat", "out");
}

/**
 * Buka film dengan panggung 3D dipaksa hidup, dan tunggu sampai kanvas tampil penuh. Di slide pertama gunungan
 * pembuka dicabut lebih dulu, kecuali `gate` = "keep" (tes gerbang). Tahap gong hero tidak dilewati di sini:
 * `step` maju melewatinya bila perlu.
 */
async function open3d(page: Page, query = "?stage=low", hash = "", gate: "open" | "keep" = "open") {
  await open(page, query, hash);
  await expect(film(page)).toHaveAttribute("data-stage", "on", { timeout: WAIT_LONG });
  if (gate === "open" && !hash) await openGate(page);
}

/** Satu langkah yang memindah slide (langkah maju di judul/hero melewati tahap gongnya dulu). */
async function step(page: Page, key = "ArrowDown") {
  if (key === "ArrowDown" || key === "ArrowRight" || key === "PageDown") await release(page);
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
    await expect(film(page)).toHaveAttribute("data-stage", "on", { timeout: WAIT_LONG });
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

  test("CSP produksi tidak memblokir panggung 3D, dan tidak ada galat shader", async ({ page }) => {
    const bad: string[] = [];
    page.on("console", (m) => {
      if (/Content Security Policy|Refused to|THREE\.WebGLProgram|Shader Error/i.test(m.text())) bad.push(m.text().slice(0, 300));
    });
    page.on("pageerror", (e) => bad.push(e.message));
    await open3d(page);
    await nextFrames(page, 4);
    await step(page);
    await nextFrames(page, 2);
    expect(bad).toEqual([]);
  });

  test("satu piksel NaN di adegan tidak disebar bloom menjadi segi delapan hitam (audit host 14 Nov)", async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "cukup satu ukuran layar; dua kali buka panggung 3D");
    test.slow(); // panggung 3D dibuka dua kali berturut-turut
    /**
     * Di iPhone, `pow` dengan dasar negatif di mangkuk blencong memberi NaN; bloom menyebarnya jadi segi delapan hitam.
     * Di sini NaN disuntik dengan sengaja ke shader mangkuk blencong (sqrt(-1)), lalu jumlah piksel hitam dibandingkan
     * dengan adegan yang sama tanpa suntikan. Dengan saringan `finite()` di rantai post, yang hitam hanya mangkuknya
     * (±0,4 % layar); tanpa saringan, bidang hitam melebar ke nyala dan sekitarnya (±2,6 % layar, diukur 14 Nov).
     */
    const blackShare = async (inject: boolean) => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();
      if (inject) {
        await page.addInitScript(() => {
          const orig = WebGL2RenderingContext.prototype.shaderSource;
          WebGL2RenderingContext.prototype.shaderSource = function (sh: WebGLShader, src: string) {
            if (src.includes("vec3 brass = vec3(0.72, 0.5, 0.2);")) {
              const k = src.lastIndexOf("}");
              src = `${src.slice(0, k)} gl_FragColor = vec4(sqrt(gl_FragCoord.x * 0.0 - 1.0)); }`;
            }
            return orig.call(this, sh, src);
          };
        });
      }
      await open3d(page);
      await nextFrames(page, 6);
      await page.addStyleTag({ content: ".fl-stage,.fl-chrome,.fl-grain,.fl-wipe{visibility:hidden!important}" });
      await nextFrames(page, 3);
      const png = await page.screenshot();
      const share = await page.evaluate(async (b64) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const c = document.createElement("canvas");
        [c.width, c.height] = [img.width, img.height];
        const g = c.getContext("2d")!;
        g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let black = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i]! + d[i + 1]! + d[i + 2]! <= 3) black++;
        return black / (c.width * c.height);
      }, png.toString("base64"));
      await context.close();
      return share;
    };
    const clean = await blackShare(false);
    const poisoned = await blackShare(true);
    expect(poisoned - clean).toBeGreaterThan(0.001); // suntikan memang mengenai mangkuk blencong yang terlihat
    expect(poisoned - clean).toBeLessThan(0.012);
  });

  test("hemat bandwidth tanpa beda gambar: rantai bloom R11F_G11F_B10F bila didukung (audit host 14 Nov \"fps down\")", async ({ page }) => {
    await open3d(page);
    await nextFrames(page, 3);
    const s = (await stats(page))!;
    const packed = await page.evaluate(() => {
      const c = document.createElement("canvas").getContext("webgl2");
      return !!c?.getExtension("EXT_color_buffer_float");
    });
    expect(s.bloom).toBe(packed ? "r11g11b10" : "rgba16f");
  });

  test("?fps menampilkan overlay ukur", async ({ page }) => {
    await open3d(page, "?stage=low&fps");
    await nextFrames(page, 20);
    await expect(page.locator(".fl-fps")).toContainText("low");
    await expect(page.locator(".fl-fps")).toContainText(/\d+ fps/); // laju layar selalu berangka, juga saat diam di tier Low
    await expect(page.locator(".fl-fps")).toContainText("draw");
  });

  test("iPhone/iPad (GPU \"Apple GPU\", Safari melapor 4 inti): tier High dipaksa, overlay menandainya", async ({ page }) => {
    // Chromium di e2e memakai SwiftShader; di sini laporan GPU dan jumlah inti dibuat seperti iPhone di Safari
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 4 });
      Object.defineProperty(window, "matchMedia", {
        value: (q: string) => ({ matches: /pointer: coarse/.test(q), media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false }),
      });
      const orig = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function (p: number) {
        return p === 0x9246 || p === 0x1f01 ? "Apple GPU" : orig.call(this, p);
      };
    });
    await open(page, "?fps");
    await expect(page.locator(".fl-canvas")).toHaveAttribute("data-tier", "high", { timeout: WAIT_LONG });
    await expect(page.locator(".fl-canvas")).toHaveAttribute("data-scale", "1");
    await expect(page.locator(".fl-fps")).toContainText("high ×1 (paksa)", { timeout: WAIT });
  });

  test("tanpa ?fps tidak ada overlay", async ({ page }) => {
    await open3d(page);
    await expect(page.locator(".fl-fps")).toHaveCount(0);
  });
});

test.describe("gong ageng 3D", () => {
  test("gong 3D menggantikan cakram gong CSS; tanpa 3D cakram CSS tetap digambar", async ({ page }) => {
    await open3d(page);
    await expect(page.locator(".fs-hero .fs-gong")).toBeHidden();
    await nextFrames(page);
    const s = (await stats(page))!;
    // prolog: gong, gayor, dan tabuh ada di layar (±25 ribu segitiga, tiga draw call di atas latar)
    expect(s.triangles).toBeGreaterThan(40_000);
    expect(s.triangles).toBeLessThan(60_000);
    expect(s.calls).toBeLessThanOrEqual(26);
  });

  test("film 2,5D: cakram gong CSS tetap ada", async ({ page }) => {
    await open(page, "?stage=static");
    await expect(page.locator(".fs-hero .fs-gong")).toBeVisible();
  });

  test("memandang lanskap: gong di belakang kamera tidak digambar", async ({ page }) => {
    await open3d(page);
    await nextFrames(page);
    const front = (await stats(page))!;
    await page.goto("/film/?stage=low#day-1");
    await expect(film(page)).toHaveAttribute("data-stage", "on", { timeout: WAIT_LONG });
    await settled(page);
    await step(page); // intro hari
    await step(page); // panel pertama: kamera di tepi belakang pendapa, memandang Lawu
    await expect(film(page)).toHaveAttribute("data-kind", "panel");
    await nextFrames(page);
    const vista = (await stats(page))!;
    expect(vista.triangles).toBeLessThan(front.triangles - 20_000);
    expect(vista.calls).toBeLessThan(front.calls);
  });

  /** Ke slide gong penutup Hari 1 (dari judul Hari 2, satu langkah mundur). */
  async function toGong(page: Page, query: string) {
    if (query.includes("static")) await open(page, query, "#day-2");
    else await open3d(page, query, "#day-2");
    await step(page, "ArrowUp");
    await expect(film(page)).toHaveAttribute("data-slide", "day-1/gong");
    return page.locator(".fl-layer[data-pos='cur'] .fs-strike");
  }
  const strikes = async (page: Page) => (await stats(page))?.strikes ?? -1;

  test("slide gong: bidang sentuh tombol pukul tepat di atas gong, teks berada di bawahnya", async ({ page }) => {
    const strike = await toGong(page, "?stage=low");
    await expect(strike).toBeVisible();
    await expect(strike).toHaveAccessibleName(/gong/i);
    await expect(strike.locator(".fs-gong")).toBeHidden();
    const [hit, text, view] = [await strike.boundingBox(), await page.locator(".fl-layer[data-pos='cur'] .fs-gongclose .fs-kicker").boundingBox(), page.viewportSize()!];
    const [cx, cy] = [hit!.x + hit!.width / 2, hit!.y + hit!.height / 2];
    // letaknya dihitung dari shot kamera: dekat tengah layar, di atas teks penutup hari, seluruhnya di dalam layar
    expect(Math.abs(cx - view.width / 2)).toBeLessThan(view.width * 0.1);
    expect(cy).toBeLessThan(view.height * 0.6);
    expect(text!.y).toBeGreaterThan(cy);
    expect(hit!.y).toBeGreaterThanOrEqual(0);
    expect(hit!.width).toBeGreaterThan(Math.min(view.width, view.height) * 0.25);
    expect(hit!.width).toBeLessThan(view.width);
  });

  test("tiba di slide gong: gong dipukul sendiri; klik dan Enter memukul lagi, tetapi tidak selama tabuh masih berayun", async ({ page }) => {
    const strike = await toGong(page, "?stage=low");
    // otomatis: tabuh diayun ±0,26 dtk sesudah tiba dan kena ±0,5 dtk kemudian
    await expect(strike).toHaveAttribute("data-struck", "1");
    await expect.poll(() => strikes(page), { timeout: WAIT }).toBe(1);
    // Pukulan baru ditolak sampai tabuh kembali menggantung (1,5 dtk sejak diayun). Dua klik dalam satu giliran:
    // paling banyak satu yang diterima, berapa pun lambatnya halaman menggambar.
    const twice = () =>
      page.evaluate(() => {
        const b = document.querySelector<HTMLButtonElement>(".fl-layer[data-pos='cur'] .fs-strike")!;
        b.click();
        b.click();
        return b.dataset.struck ?? "";
      });
    await expect.poll(twice, { timeout: 20_000, intervals: [400] }).toBe("2");
    await expect.poll(() => strikes(page), { timeout: WAIT }).toBe(2);
    // keyboard: Enter di tombol yang terfokus
    await strike.focus();
    await expect
      .poll(
        async () => {
          await page.keyboard.press("Enter");
          return strike.getAttribute("data-struck");
        },
        { timeout: 20_000, intervals: [400] },
      )
      .toBe("3");
    await expect.poll(() => strikes(page), { timeout: WAIT }).toBe(3);
  });

  test("hentakan kamera: diam sebelum pukulan, terhentak saat gong kena, lalu tenang lagi", async ({ page }) => {
    const kick = () => page.evaluate(() => (window as unknown as { __lakonStage: { kick: number } }).__lakonStage.kick);
    // pantau tiap frame: hentakan terbesar yang pernah tergambar
    await page.addInitScript(() => {
      const w = window as unknown as { __kickMax: number; __lakonStage?: { kick: number } };
      w.__kickMax = 0;
      const loop = () => {
        w.__kickMax = Math.max(w.__kickMax, w.__lakonStage?.kick ?? 0);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
    await open3d(page, "?stage=low", "#day-2");
    await nextFrames(page);
    expect(await page.evaluate(() => (window as unknown as { __kickMax: number }).__kickMax)).toBe(0);
    await step(page, "ArrowUp"); // ke slide gong penutup Hari 1: dipukul sendiri
    await expect(film(page)).toHaveAttribute("data-slide", "day-1/gong");
    await expect.poll(() => strikes(page), { timeout: WAIT }).toBe(1);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __kickMax: number }).__kickMax), { timeout: WAIT }).toBeGreaterThan(0);
    // getar habis dalam ±1,5 dtk: kamera kembali diam
    await expect.poll(kick, { timeout: WAIT }).toBe(0);
  });

  const gongZoom = (page: Page) => page.evaluate(() => Number(getComputedStyle(document.querySelector("main.film")!).getPropertyValue("--gong-zoom") || "0"));

  test("dua tahap gulir: gulir maju pertama mendekat ke gong, berikutnya pindah slide; mundur saat dekat menjauh dulu", async ({ page }, testInfo) => {
    // tujuh langkah gulir, masing-masing menunggu kamera 3D yang digambar tanpa GPU: lebih dari 30 dtk bawaan
    test.slow();
    test.skip(testInfo.project.name !== "desktop", "roda mouse hanya di desktop");
    await toGong(page, "?stage=low");
    await film(page).hover();
    await page.mouse.wheel(0, 100);
    await expect.poll(() => gongZoom(page), { timeout: WAIT }).toBeGreaterThan(0.6);
    expect(await film(page).getAttribute("data-slide")).toBe("day-1/gong");
    // mundur saat dekat: menjauh dulu, tetap di slide gong
    await page.waitForTimeout(700); // gerakan roda baru = sesudah jeda (di bawah beban suite penuh, jeda pendek terbaca satu gerakan)
    await page.mouse.wheel(0, -100);
    await expect.poll(() => gongZoom(page), { timeout: WAIT }).toBeLessThan(0.05);
    expect(await film(page).getAttribute("data-slide")).toBe("day-1/gong");
    // maju dua kali: dekat, lalu pindah ke Hari 2
    await page.waitForTimeout(700);
    await page.mouse.wheel(0, 100);
    await expect.poll(() => gongZoom(page), { timeout: WAIT }).toBeGreaterThan(0.6);
    await page.waitForTimeout(700);
    await page.mouse.wheel(0, 100);
    await expect(film(page)).not.toHaveAttribute("data-slide", "day-1/gong", { timeout: WAIT });
    // panah keyboard tetap per slide (tanpa tahap dekat)
    await settled(page);
    await step(page, "ArrowUp");
    await expect(film(page)).toHaveAttribute("data-slide", "day-1/gong");
    await step(page, "ArrowDown");
    await expect(film(page)).not.toHaveAttribute("data-slide", "day-1/gong");
  });

  test("zoom gong: tombol + dan −, dan Ctrl+roda; bidang sentuh tombol pukul ikut membesar", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "keyboard dan roda hanya di desktop");
    const strike = await toGong(page, "?stage=low");
    const w0 = (await strike.boundingBox())!.width;
    await page.keyboard.press("+");
    await page.keyboard.press("+");
    await expect.poll(() => gongZoom(page), { timeout: WAIT }).toBeGreaterThan(0.4);
    await expect.poll(async () => (await strike.boundingBox())!.width, { timeout: WAIT }).toBeGreaterThan(w0 * 1.3);
    await page.keyboard.press("-");
    await page.keyboard.press("-");
    await expect.poll(() => gongZoom(page), { timeout: WAIT }).toBeLessThan(0.05);
    await film(page).hover();
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -200);
    await page.keyboard.up("Control");
    await expect.poll(() => gongZoom(page), { timeout: WAIT }).toBeGreaterThan(0.5);
    expect(await film(page).getAttribute("data-slide")).toBe("day-1/gong");
  });

  test("meninggalkan slide gong lalu kembali: dipukul sendiri lagi", async ({ page }) => {
    const strike = await toGong(page, "?stage=low");
    await expect.poll(() => strikes(page), { timeout: WAIT }).toBe(1);
    await step(page, "ArrowDown"); // judul Hari 2
    await page.waitForTimeout(1700);
    expect(await strikes(page)).toBe(1);
    await step(page, "ArrowUp");
    await expect(strike).toHaveAttribute("data-struck", "2");
    await expect.poll(() => strikes(page), { timeout: WAIT }).toBe(2);
  });

  test("film 2,5D: cakram gong CSS dipukul sendiri saat tiba dan beriak lagi tiap diklik", async ({ page }) => {
    const strike = await toGong(page, "?stage=static");
    await expect(strike.locator(".fs-gong")).toBeVisible();
    await expect(strike).toHaveAttribute("data-struck", "1");
    await strike.click();
    await expect(strike).toHaveAttribute("data-struck", "2");
    await strike.focus();
    await page.keyboard.press("Enter");
    await expect(strike).toHaveAttribute("data-struck", "3");
  });
});

type SweepWatch = { wipe: number };
/** Pantau tiap frame mulai sekarang: seberapa tampak bayangan kayon DOM. */
async function watchSweep(page: Page) {
  await page.evaluate(() => {
    const w = { wipe: 0 };
    const win = window as unknown as { __sweepWatch: typeof w };
    win.__sweepWatch = w;
    const el = document.querySelector(".fl-wipe");
    const loop = () => {
      if (win.__sweepWatch !== w) return;
      if (el) w.wipe = Math.max(w.wipe, Number(getComputedStyle(el).opacity));
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}
const sweepSeen = (page: Page) => page.evaluate(() => (window as unknown as { __sweepWatch: SweepWatch }).__sweepWatch);
/** Lompat ke bab ke-`n` (0 = prolog) lewat rail, dan tunggu sampai transisinya selesai. */
async function jump(page: Page, n: number) {
  const before = await film(page).getAttribute("data-index");
  await page.getByRole("navigation", { name: "Chapters" }).getByRole("button").nth(n).click();
  await expect(film(page)).not.toHaveAttribute("data-index", before ?? "");
  await settled(page);
}

test.describe("gunungan 3D: sapuan antar bab tetap bayangan kayon DOM (keputusan host 13 Nov)", () => {
  test("panggung 3D hidup: lompat bab maju dan mundur disapu bayangan kayon DOM, gunungan 3D tidak menyapu", async ({ page }) => {
    await open3d(page);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __lakonStage?: { kayon: boolean } }).__lakonStage?.kayon ?? false), { timeout: WAIT_LONG }).toBe(true);
    for (const n of [1, 0]) {
      await watchSweep(page);
      await jump(page, n);
      const seen = await sweepSeen(page);
      expect(seen.wipe).toBeGreaterThan(0.5);
    }
  });

  test("film 2,5D: bayangan kayon DOM tetap menyapu", async ({ page }) => {
    await open(page);
    await watchSweep(page);
    await jump(page, 1);
    const seen = await sweepSeen(page);
    expect(seen.wipe).toBeGreaterThan(0.5);
  });

  test("tekstur gunungan hanya diunduh saat panggung 3D hidup, seukuran tier-nya", async ({ page }) => {
    const got: string[] = [];
    page.on("request", (r) => {
      const m = /\/film\/gunungan\/([^?]+)/.exec(r.url());
      if (m) got.push(m[1]!);
    });
    await open(page);
    await page.waitForTimeout(1500);
    expect(got).toEqual([]);
    await page.goto("/film/?stage=low");
    await expect(film(page)).toHaveAttribute("data-stage", "on", { timeout: WAIT_LONG });
    await expect.poll(() => got.length, { timeout: WAIT_LONG }).toBe(5);
    expect([...got].sort()).toEqual(["agung-1500.webp", "agung-aux-750.webp", "geni-1000.webp", "murka-1500.webp", "murka-aux-750.webp"]);
  });
});

const opacity = (page: Page, selector: string) => page.locator(selector).first().evaluate((el) => Number(getComputedStyle(el).opacity));
const HERO = ".fl-layer[data-pos='cur'] .fs-hero";
const CREDITS = ".fl-layer[data-pos='cur'] .fs-credits";
const planted = async (page: Page) => (await stats(page))?.gate.planted ?? -1;

test.describe("gunungan pembuka dan penutup (Tugas 7)", () => {
  test("film 3D dibuka dengan gunungan tertancap; gulir maju mencabutnya tanpa pindah slide, lalu teks prolog muncul", async ({ page }) => {
    await open3d(page, "?stage=low", "", "keep");
    await expect(film(page)).toHaveAttribute("data-gate", "head", { timeout: WAIT_LONG });
    await expect.poll(() => opacity(page, HERO)).toBe(0);
    await nextFrames(page);
    expect((await stats(page))!.gate).toEqual({ end: "head", planted: 1, face: "agung" });
    await expect(page.locator(".fl-kayon")).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await expect(film(page)).not.toHaveAttribute("data-gate", /.+/);
    await expect.poll(() => opacity(page, HERO)).toBe(1);
    await expect(page.locator(".fl-kayon")).toHaveCount(0);
    expect(await film(page).getAttribute("data-index")).toBe("0");
    await expect.poll(() => planted(page), { timeout: WAIT }).toBe(0);
    // sesudah tercabut, langkah berikutnya memindah slide seperti biasa
    await step(page);
    expect(await film(page).getAttribute("data-index")).toBe("1");
  });

  test("klik dan Enter membalik gunungan ke muka Murka dan kembali ke muka Agung", async ({ page }) => {
    await open3d(page, "?stage=low", "", "keep");
    await expect(film(page)).toHaveAttribute("data-gate", "head", { timeout: WAIT_LONG });
    const flip = page.locator(".fl-kayon");
    await expect(flip).toHaveAttribute("aria-pressed", "false");
    await flip.click();
    await expect(film(page)).toHaveAttribute("data-face", "murka");
    await expect(flip).toHaveAttribute("aria-pressed", "true");
    await expect.poll(async () => (await stats(page))?.gate.face, { timeout: WAIT }).toBe("murka");
    await flip.focus();
    await page.keyboard.press("Enter");
    await expect(film(page)).toHaveAttribute("data-face", "agung");
    await expect.poll(async () => (await stats(page))?.gate.face, { timeout: WAIT }).toBe("agung");
    // membalik tidak mencabut dan tidak memindah slide
    expect(await film(page).getAttribute("data-index")).toBe("0");
    await expect(film(page)).toHaveAttribute("data-gate", "head");
  });

  test("mundur di slide pertama menancapkannya lagi: teks prolog memudar; maju mencabutnya lagi", async ({ page }) => {
    await open3d(page);
    await expect.poll(() => opacity(page, HERO)).toBe(1);
    await page.keyboard.press("ArrowUp");
    await expect(film(page)).toHaveAttribute("data-gate", "head");
    await expect.poll(() => opacity(page, HERO)).toBe(0);
    await expect.poll(() => planted(page), { timeout: WAIT }).toBe(1);
    expect((await stats(page))!.gate.face).toBe("agung");
    await page.keyboard.press("ArrowDown");
    await expect(film(page)).not.toHaveAttribute("data-gate", /.+/);
    await expect.poll(() => opacity(page, HERO)).toBe(1);
  });

  test("penutup: gulir maju di credits menancapkan gunungan dan credits memudar; mundur mencabutnya", async ({ page }) => {
    await open3d(page, "?stage=low", "#credits");
    const last = await film(page).getAttribute("data-index");
    await expect(film(page)).toHaveAttribute("data-kind", "credits");
    await expect.poll(() => page.evaluate(() => (window as unknown as { __lakonStage?: { kayon: boolean } }).__lakonStage?.kayon ?? false), { timeout: WAIT_LONG }).toBe(true);
    await page.keyboard.press("ArrowDown");
    await expect(film(page)).toHaveAttribute("data-gate", "tail");
    await expect.poll(() => opacity(page, CREDITS)).toBe(0);
    await expect.poll(() => planted(page), { timeout: WAIT }).toBe(1);
    expect((await stats(page))!.gate.end).toBe("tail");
    expect(await film(page).getAttribute("data-index")).toBe(last);
    await page.keyboard.press("ArrowUp");
    await expect(film(page)).not.toHaveAttribute("data-gate", /.+/);
    await expect.poll(() => opacity(page, CREDITS)).toBe(1);
    await expect.poll(() => planted(page), { timeout: WAIT }).toBe(0);
    // tercabut: mundur berikutnya memindah slide
    await step(page, "ArrowUp");
    expect(await film(page).getAttribute("data-index")).not.toBe(last);
  });

  test("penutup ditancapkan sendiri bila tamu diam di credits", async ({ page }) => {
    test.slow();
    await open3d(page, "?stage=low", "#credits");
    await expect(film(page)).toHaveAttribute("data-kind", "credits");
    await expect(film(page)).toHaveAttribute("data-gate", "tail", { timeout: WAIT_LONG });
  });

  test("geser jari mencabut gunungan mengikuti jari; dilepas sesudah ambang, tercabut habis", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "geser jari di layar sentuh");
    await open3d(page, "?stage=low", "", "keep");
    await expect(film(page)).toHaveAttribute("data-gate", "head", { timeout: WAIT_LONG });
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", y = 0) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: 200, y }] });
    await touch("touchStart", 560);
    for (let i = 1; i <= 16; i++) {
      await touch("touchMove", 560 - i * 10);
      await page.waitForTimeout(30);
    }
    // ditahan di tengah: gunungan setengah tercabut, slide tidak pindah
    await expect.poll(() => planted(page), { timeout: WAIT }).toBeLessThan(0.95);
    const held = await planted(page);
    expect(held).toBeGreaterThan(0.05);
    await touch("touchEnd");
    await cdp.detach();
    await expect.poll(() => planted(page), { timeout: WAIT }).toBe(0);
    await expect(film(page)).not.toHaveAttribute("data-gate", /.+/);
    expect(await film(page).getAttribute("data-index")).toBe("0");
  });

  test("film 2,5D: tanpa gerbang, teks prolog langsung tampil; langkah pertama menabuh gong hero, kedua memindah slide", async ({ page }) => {
    await open(page);
    await expect(film(page)).not.toHaveAttribute("data-gate", /.+/);
    await expect.poll(() => opacity(page, HERO)).toBe(1);
    await expect(page.locator(".fl-kayon")).toHaveCount(0);
    await page.keyboard.press("ArrowDown");
    await expect(film(page)).toHaveAttribute("data-beat", "out");
    expect(await film(page).getAttribute("data-index")).toBe("0");
    await step(page);
    expect(await film(page).getAttribute("data-index")).toBe("1");
  });
});

test.describe("tahap gong di slide judul, panggung 3D (Tugas 7b)", () => {
  type Live = { kick: number; strikes: number; camera: [number, number, number] };
  const live = () => (window as unknown as { __lakonStage: Live }).__lakonStage;

  test("judul hari: gong 3D ditabuh tanpa hentakan kamera, kamera tetap di shot judul; langkah berikutnya baru pindah", async ({ page }) => {
    // pantau tiap frame: hentakan terbesar dan simpangan kamera terjauh selama tahap gong
    await page.addInitScript(() => {
      const w = window as unknown as { __kickMax: number; __camFar: number; __cam0: number[] | null; __lakonStage?: { kick: number; camera: number[] } };
      w.__kickMax = 0;
      w.__camFar = 0;
      w.__cam0 = null;
      const loop = () => {
        const s = w.__lakonStage;
        if (s && w.__cam0) {
          w.__kickMax = Math.max(w.__kickMax, s.kick);
          w.__camFar = Math.max(w.__camFar, Math.hypot(s.camera[0]! - w.__cam0[0]!, s.camera[1]! - w.__cam0[1]!, s.camera[2]! - w.__cam0[2]!));
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
    await open3d(page, "?stage=low", "#day-1");
    await nextFrames(page);
    await page.evaluate(() => {
      const w = window as unknown as { __cam0: number[]; __lakonStage: { camera: number[] } };
      w.__cam0 = [...w.__lakonStage.camera];
    });
    const struck = (await page.evaluate(live)).strikes;
    await page.keyboard.press("ArrowDown");
    await expect(film(page)).toHaveAttribute("data-beat", "out");
    await expect.poll(async () => (await page.evaluate(live)).strikes, { timeout: WAIT }).toBe(struck + 1);
    await nextFrames(page, 4);
    expect(await film(page).getAttribute("data-slide")).toBe("day-1/title");
    const watch = await page.evaluate(() => {
      const w = window as unknown as { __kickMax: number; __camFar: number };
      return { kick: w.__kickMax, far: w.__camFar };
    });
    expect(watch.kick).toBe(0);
    // kamera hanya bergoyang pelan (napas kamera, < 4 cm), tidak berpindah shot
    expect(watch.far).toBeLessThan(0.1);
    // huruf judul tersedot habis
    await expect
      .poll(() => page.locator(".fl-layer[data-pos='cur'] .fs-beat").evaluate((el) => Math.max(...[...el.querySelectorAll(".fs-display .k-char")].map((c) => Number(getComputedStyle(c).opacity)))), { timeout: WAIT })
      .toBe(0);
    const cam = (await page.evaluate(live)).camera;
    await step(page);
    expect(await film(page).getAttribute("data-slide")).toBe("day-1/intro");
    await nextFrames(page);
    expect(far((await page.evaluate(live)).camera, cam)).toBeGreaterThan(1);
  });
});

test.describe("zoom dan kamera mengitari gong ±90° (permintaan host 14 Nov: \"dua dua nya, 90derajat\")", () => {
  const orbitOf = (page: Page) => page.evaluate(() => (window as unknown as { __lakonStage: { orbit: number } }).__lakonStage.orbit);
  const zoomOf = (page: Page) => page.evaluate(() => Number(getComputedStyle(document.querySelector("main.film")!).getPropertyValue("--gong-zoom") || "0"));

  test("judul hari: seret mouse ke kanan = kamera ke kiri sampai −90°, ke kiri sampai +90°; dilepas kembali ke depan; slide tidak pindah", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "mouse hanya di desktop");
    test.slow(); // tiap gerak mouse menunggu frame 3D yang digambar CPU
    await open3d(page, "?stage=low", "#day-1");
    await nextFrames(page);
    const view = page.viewportSize()!;
    const y = view.height * 0.55;
    await page.mouse.move(view.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(view.width * 0.8, y, { steps: 4 });
    await expect.poll(() => orbitOf(page), { timeout: WAIT }).toBeLessThan(-40);
    await page.mouse.move(view.width * 0.1, y, { steps: 4 }); // seret balik melewati tengah: sisi kanan gong
    await expect.poll(() => orbitOf(page), { timeout: WAIT }).toBeGreaterThan(40);
    await page.mouse.move(-view.width, y, { steps: 2 }); // jauh melewati tepi: tetap dibatasi
    await nextFrames(page, 4);
    expect(await orbitOf(page)).toBeLessThanOrEqual(90);
    await page.mouse.up();
    await expect.poll(() => orbitOf(page), { timeout: WAIT }).toBe(0);
    expect(await film(page).getAttribute("data-slide")).toBe("day-1/title");
    await expect(film(page)).not.toHaveAttribute("data-beat", /.+/); // seret bukan langkah: gong tidak ditabuh
  });

  test("judul hari: zoom dengan + / − dan Ctrl+roda, teks memudar saat gong didekati", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "keyboard dan roda hanya di desktop");
    await open3d(page, "?stage=low", "#day-1");
    await nextFrames(page);
    await page.keyboard.press("+");
    await page.keyboard.press("+");
    await expect.poll(() => zoomOf(page), { timeout: WAIT }).toBeGreaterThan(0.4);
    await expect.poll(() => page.locator(".fl-layer[data-pos='cur'] .fs-beat").evaluate((el) => Number(getComputedStyle(el).opacity)), { timeout: WAIT }).toBeLessThan(0.7);
    await page.keyboard.press("-");
    await page.keyboard.press("-");
    await expect.poll(() => zoomOf(page), { timeout: WAIT }).toBeLessThan(0.05);
    await film(page).hover();
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -200);
    await page.keyboard.up("Control");
    await expect.poll(() => zoomOf(page), { timeout: WAIT }).toBeGreaterThan(0.5);
    // langkah maju tetap menabuh gong (tahap judul), bukan dua tahap gulir seperti di gong penutup
    await page.keyboard.press("ArrowDown");
    await expect(film(page)).toHaveAttribute("data-beat", "out");
  });

  test("trackpad: geser dua jari mendatar di hero mengitari gong, lalu kembali", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "trackpad hanya di desktop");
    test.slow();
    await open3d(page);
    await nextFrames(page);
    // jari ke kanan (deltaX negatif) = seret ke kanan = kamera ke kiri (sudut negatif). Event dikirim dalam satu
    // giliran, seperti trackpad sungguhan (±16 ms per event); di sini tiap frame 3D digambar CPU dan lebih lama dari
    // jeda pelepasan, jadi event satu per satu akan terbaca sebagai beberapa geseran pendek.
    await page.evaluate(() => {
      const el = document.querySelector("main.film")!;
      for (let i = 0; i < 8; i++) el.dispatchEvent(new WheelEvent("wheel", { deltaX: -40, deltaY: 0, deltaMode: 0, bubbles: true, cancelable: true }));
    });
    await expect.poll(() => orbitOf(page), { timeout: WAIT }).toBeLessThan(-20);
    await expect.poll(() => orbitOf(page), { timeout: WAIT }).toBe(0);
    expect(await film(page).getAttribute("data-slide")).toBe("hero");
  });

  test("gong penutup: seret mouse mengitari gong; seret yang dilepas di atas tombol pukul bukan pukulan", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "mouse hanya di desktop");
    test.slow(); // tiap gerak mouse menunggu frame 3D yang digambar CPU
    await open3d(page, "?stage=low", "#day-2");
    await step(page, "ArrowUp");
    await expect(film(page)).toHaveAttribute("data-slide", "day-1/gong");
    const strike = page.locator(".fl-layer[data-pos='cur'] .fs-strike");
    await expect(strike).toHaveAttribute("data-struck", "1"); // dipukul sendiri saat tiba
    const box = (await strike.boundingBox())!;
    const [cx, cy] = [box.x + box.width / 2, box.y + box.height / 2];
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 300, cy, { steps: 3 });
    await expect.poll(() => orbitOf(page), { timeout: WAIT }).toBeGreaterThan(20);
    await page.mouse.move(cx, cy, { steps: 3 }); // kembali ke atas tombol, lalu dilepas
    await page.mouse.up();
    await page.waitForTimeout(500);
    await expect(strike).toHaveAttribute("data-struck", "1");
    await expect.poll(() => orbitOf(page), { timeout: WAIT }).toBe(0);
  });

  test("HP: geser jari mendatar di judul mengitari gong (slide tidak pindah), langkah maju sesudahnya tetap menabuh gong", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "sentuhan hanya di HP");
    test.slow();
    await open3d(page, "?stage=low", "#day-1");
    await nextFrames(page);
    const view = page.viewportSize()!;
    const cdp = await page.context().newCDPSession(page);
    const pt = (x: number, y: number) => [{ x: Math.round(x), y: Math.round(y) }];
    const y = view.height * 0.6;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pt(view.width * 0.2, y) });
    for (let i = 1; i <= 12; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pt(view.width * (0.2 + 0.05 * i), y) });
    await expect.poll(() => orbitOf(page), { timeout: WAIT }).toBeLessThan(-40);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => orbitOf(page), { timeout: WAIT }).toBe(0);
    expect(await film(page).getAttribute("data-slide")).toBe("day-1/title");
    await expect(film(page)).not.toHaveAttribute("data-beat", /.+/);
    // sentakan tegak di judul sudah diuji di film.spec (film 2,5D); di sini tiap event jari menunggu frame 3D yang
    // digambar CPU (±150 ms), jadi tidak pernah secepat sentakan. Langkah maju lewat keyboard.
    await page.keyboard.press("ArrowDown");
    await expect(film(page)).toHaveAttribute("data-beat", "out");
    await cdp.detach();
  });
});

test.describe("gallery 3D: letak Z dan depth of field (Tugas 7b)", () => {
  type Dof = { amount: number; focus: number; drawn: boolean };
  const dofOf = async (page: Page) => (await page.evaluate(() => (window as unknown as { __lakonStage: { dof: Dof } }).__lakonStage.dof));
  /** Bagian pita tanah lanskap yang berupa tepi tajam (kartu dan teks disembunyikan). */
  async function detail(page: Page) {
    await page.addStyleTag({ content: ".fl-stage,.fl-chrome,.fl-grain,.fl-wipe{visibility:hidden!important}" });
    await nextFrames(page, 3);
    const png = await page.screenshot();
    return page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement("canvas");
      [c.width, c.height] = [img.width, img.height];
      const g = c.getContext("2d")!;
      g.drawImage(img, 0, 0);
      // pita tanah di bawah cakrawala; dihitung tepi tajam (beda terang > 6/255 antar piksel bertetangga), yang
      // paling peka terhadap kabur: garis pematang sawah
      const y0 = Math.round(c.height * 0.4);
      const d = g.getImageData(0, y0, c.width, c.height - y0).data;
      const lum = (i: number) => d[i]! * 0.3 + d[i + 1]! * 0.59 + d[i + 2]! * 0.11;
      let e = 0;
      for (let y = 0; y < c.height - y0 - 1; y++)
        for (let x = 0; x < c.width - 1; x++) {
          const i = (y * c.width + x) * 4;
          if (Math.max(Math.abs(lum(i) - lum(i + 4)), Math.abs(lum(i) - lum(i + c.width * 4))) > 6) e++;
        }
      return e / (c.width * (c.height - y0));
    }, png.toString("base64"));
  }
  const hold = (page: Page, at: number[] | null) =>
    page.evaluate((v) => {
      const s = (window as unknown as { __lakonStage: { dofAt?: number[] } }).__lakonStage;
      if (v) s.dofAt = v;
      else delete s.dofAt;
    }, at);

  test("tier High di gallery: depth of field digambar (fokus dekat saat diam) dan mengaburkan lanskap; di luar gallery tidak", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "cukup satu ukuran layar; tier High digambar CPU");
    test.slow();
    await open3d(page, "?stage=high", "#day-1");
    await nextFrames(page);
    expect((await dofOf(page)).drawn).toBe(false); // judul hari: tanpa depth of field
    await step(page); // intro hari
    await step(page); // panel pertama
    await nextFrames(page, 3);
    const rest = await dofOf(page);
    expect(rest.drawn).toBe(true);
    expect(rest.amount).toBe(1);
    expect(rest.focus).toBe(12);
    // gambar yang sama dengan depth of field dimatikan dan dinyalakan: rincian tanah lanskap berkurang nyata
    await hold(page, [0, 12]);
    const sharp = await detail(page);
    await hold(page, [1, 12]);
    const soft = await detail(page);
    expect(sharp).toBeGreaterThan(0.005); // pita itu memang berisi garis pematang
    expect(soft).toBeLessThan(sharp * 0.6);
  });

  test("selama geseran di gallery fokus ditarik jauh ke lanskap, lalu kembali dekat saat kartu tiba", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "cukup satu ukuran layar; tier High digambar CPU");
    test.slow();
    await page.addInitScript(() => {
      const w = window as unknown as { __focusMax: number; __lakonStage?: { dof: { focus: number; drawn: boolean }; moving: boolean } };
      w.__focusMax = 0;
      const loop = () => {
        const s = w.__lakonStage;
        if (s?.moving && s.dof.drawn) w.__focusMax = Math.max(w.__focusMax, s.dof.focus);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
    await open3d(page, "?stage=high", "#day-1");
    await step(page);
    await step(page);
    await nextFrames(page);
    await page.evaluate(() => ((window as unknown as { __focusMax: number }).__focusMax = 0));
    // Tanpa GPU satu frame tier High bisa lebih lama dari seluruh geseran (±0,6 dtk), jadi geseran diperlambat 20×
    // lewat laju animasi (transisi film memakai Web Animations; cara yang sama dengan perekam pratinjau): frame di
    // tengah geseran pasti tergambar. Yang diperiksa tetap sama.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Animation.enable");
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.05 });
    await page.keyboard.press("ArrowRight"); // panel berikutnya
    await expect.poll(() => page.evaluate(() => (window as unknown as { __focusMax: number }).__focusMax), { timeout: WAIT_LONG }).toBeGreaterThan(20);
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 });
    await cdp.detach();
    await settled(page);
    await nextFrames(page, 3);
    expect((await dofOf(page)).focus).toBe(12);
  });

  test("tier Medium dan Low: tanpa depth of field (TIER.dof)", async ({ page }) => {
    await open3d(page, "?stage=medium", "#day-1");
    await step(page);
    await step(page);
    await nextFrames(page, 3);
    const d = await dofOf(page);
    expect(d.amount).toBe(0);
    expect(d.drawn).toBe(false);
  });
});

test.describe("gerak pandang (aturan host 13 Nov): parallax kamera dan perspective shift", () => {
  test("panggung 3D: kursor di tepi layar menggeser kamera", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "kursor hanya di desktop");
    await open3d(page);
    await page.mouse.move(640, 360);
    await nextFrames(page, 6);
    await page.waitForTimeout(1500);
    const a = (await stats(page))!.camera;
    await page.mouse.move(1270, 360);
    await page.waitForTimeout(2000);
    await nextFrames(page, 4);
    const b = (await stats(page))!.camera;
    expect(far(a, b)).toBeGreaterThan(0.15);
  });

  test("film 2,5D: kursor menggeser lapisan (--lx) dan memutar bidang teks", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "kursor hanya di desktop");
    await open(page, "?stage=static");
    await page.mouse.move(1270, 360);
    await expect.poll(() => film(page).evaluate((el) => Number(el.style.getPropertyValue("--lx") || "0")), { timeout: 10_000 }).toBeGreaterThan(0.6);
    const body = page.locator(".fl-layer[data-pos='cur'] > .fl-body");
    expect(await body.evaluate((el) => getComputedStyle(el).rotate)).toMatch(/^y [1-9]/);
    await page.mouse.move(10, 360);
    await expect.poll(() => film(page).evaluate((el) => Number(el.style.getPropertyValue("--lx") || "0")), { timeout: 10_000 }).toBeLessThan(-0.6);
  });

  test("bidang gelap di belakang teks melewati tepi layar sejauh geser parallax terbesar, jadi tepinya tidak terbuka (audit host 14 Nov \"tembus\")", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "kursor hanya di desktop");
    await open(page, "?stage=static");
    await step(page); // prolog headline: teks di atas langit dengan bidang gelap
    const body = page.locator(".fl-layer[data-pos='cur'] > .fl-body--low");
    await expect(body).toHaveCount(1);
    await page.mouse.move(1270, 360);
    await expect.poll(() => film(page).evaluate((el) => Number(el.style.getPropertyValue("--lx") || "0")), { timeout: 10_000 }).toBeGreaterThan(0.6);
    const g = await body.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el, "::before");
      // geser teks saat ini (px) dari properti translate, dan letak bidang gelap terhadap teks
      const shift = Math.abs(parseFloat(getComputedStyle(el).translate.split(" ")[0] || "0"));
      return { shift, left: r.left + parseFloat(cs.left), right: r.right - parseFloat(cs.right), bottom: r.bottom - parseFloat(cs.bottom), w: innerWidth, h: innerHeight };
    });
    expect(g.shift).toBeGreaterThan(8); // gerak pandang memang menggeser bidang teks
    // bidang gelap tetap menutup layar dari tepi ke tepi (dengan sisa untuk putaran 2,4°)
    expect(g.left).toBeLessThan(-8);
    expect(g.right).toBeGreaterThan(g.w + 8);
    expect(g.bottom).toBeGreaterThan(g.h);
  });

  test("film 2,5D: kedalaman ikut gulir, lapisan yang ditinggalkan membesar dan yang datang tumbuh dari kedalaman", async ({ page }) => {
    await open(page, "?stage=static");
    await release(page);
    await page.keyboard.press("ArrowDown");
    const scales = await page.evaluate(async () => {
      await new Promise((r) => setTimeout(r, 120));
      const out: number[] = [];
      for (const a of document.getAnimations()) {
        const el = (a.effect as KeyframeEffect | null)?.target as Element | null;
        if (!el?.classList.contains("fl-layer")) continue;
        a.pause();
        a.currentTime = Number(a.effect!.getComputedTiming().duration) * 0.45;
        out.push(new DOMMatrix(getComputedStyle(el).transform).a);
      }
      return out;
    });
    expect(Math.max(...scales)).toBeGreaterThan(1.01);
    expect(Math.min(...scales)).toBeLessThan(0.99);
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
