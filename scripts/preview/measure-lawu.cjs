/* eslint-disable @typescript-eslint/no-require-imports -- offline Playwright utility */
// node scripts/preview/measure-lawu.cjs client.json results.json [390x844] [dpr]
// Run with the production static server already listening (BASE_URL). Samples actual
// displayed stage frame intervals, including long frames which the FPS governor ignores.
const { chromium } = require("@playwright/test"),
  fs = require("node:fs");
(async () => {
  const [input, output, size = "390x844", ratio = "2"] = process.argv.slice(2),
    [width, height] = size.split("x").map(Number);
  const data = fs.readFileSync(input, "utf8"),
    base = process.env.BASE_URL || "http://127.0.0.1:4173";
  const b = await chromium.launch({
    executablePath: process.env.PREVIEW_BROWSER || undefined,
    args: ["--no-zygote", "--in-process-gpu", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const results = { browser: b.version(), width, height, dpr: +ratio, tiers: {} };
  try {
    for (const tier of ["high", "ultra"]) {
      const ctx = await b.newContext({
        viewport: { width, height },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: +ratio,
        serviceWorkers: "block",
      });
      const p = await ctx.newPage();
      await p.addInitScript(() => {
        sessionStorage.setItem(
          "lakon.session",
          JSON.stringify({ token: "preview.guest-session", role: "guest", exp: 4102444800 }),
        );
      });
      await p.route("**/functions/v1/trip-data", (r) => r.fulfill({ contentType: "application/json", body: data }));
      const session = await ctx.newCDPSession(p);
      await session.send("Network.enable");
      await session.send("Network.setCacheDisabled", { cacheDisabled: true });
      await session.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 100,
        downloadThroughput: 1250000,
        uploadThroughput: 1250000,
      });
      await p.addInitScript(() => {
        new MutationObserver((_, ob) => {
          if (document.querySelector(".film")?.dataset.worldReady === "lawu") {
            window.reliefReady = performance.now();
            ob.disconnect();
          }
        }).observe(document, { subtree: true, childList: true, attributes: true });
      });
      await p.goto(base + "/film/?stage=" + tier + "#day-2");
      await p.waitForFunction(() => window.reliefReady, null, { timeout: 120000 });
      const ready = await p.evaluate(() => window.reliefReady);
      await session.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
      });
      await p.keyboard.press("ArrowDown");
      await p.waitForFunction(() => document.querySelector(".film").dataset.beat === "out");
      for (const end of ["/intro", "/depart-lawu", "/kemuning-sunrise"]) {
        await p.keyboard.press("ArrowDown");
        await p.waitForFunction(
          (x) =>
            document.querySelector(".film").dataset.slide?.endsWith(x) &&
            !document.querySelector(".film").hasAttribute("data-moving"),
          end,
          { timeout: 90000 },
        );
      }
      const environment = await p.evaluate(() => {
        const canvas = document.querySelector(".fl-canvas canvas"),
          gl = canvas.getContext("webgl2"),
          ext = gl.getExtension("WEBGL_debug_renderer_info");
        return {
          renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "masked",
          buffer: [canvas.width, canvas.height],
        };
      });
      const sample = async (moving) =>
        p.evaluate(async (move) => {
          const vals = [],
            calls = [],
            tri = [],
            film = document.querySelector(".film"),
            cards = film.querySelectorAll(".gal-card");
          const span = cards[1].offsetLeft - cards[0].offsetLeft;
          let frame = -1,
            prev = 0;
          await new Promise((resolve) => {
            function tick(t) {
              const s = window.__lakonStage;
              if (s && s.frames !== frame) {
                frame = s.frames;
                if (prev) {
                  vals.push(t - prev);
                  calls.push(s.calls);
                  tri.push(s.triangles);
                }
                prev = t;
                if (move)
                  film.dispatchEvent(
                    new WheelEvent("wheel", { deltaMode: 0, deltaY: span * 0.055, bubbles: true, cancelable: true }),
                  );
              }
              if (vals.length >= 54) return resolve();
              requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
          });
          const sorted = vals.slice().sort((a, b) => a - b),
            p = (q) => +sorted[Math.ceil(sorted.length * q) - 1].toFixed(2);
          return {
            frames: vals.length,
            median: p(0.5),
            p95: p(0.95),
            fps: +((1000 * vals.length) / vals.reduce((a, b) => a + b, 0)).toFixed(2),
            calls: [Math.min(...calls), Math.max(...calls)],
            triangles: [Math.min(...tri), Math.max(...tri)],
          };
        }, moving);
      results.tiers[tier] = {
        coldReadyMs: Math.round(ready),
        ...environment,
        idle: await sample(false),
        moving: await sample(true),
      };
      fs.writeFileSync(output, JSON.stringify(results, null, 2));
      console.log(tier, JSON.stringify(results.tiers[tier]));
      await ctx.close();
    }
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
