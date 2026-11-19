/* eslint-disable @typescript-eslint/no-require-imports -- offline Node preview utility */
const { chromium, devices } = require("@playwright/test");
const { once } = require("node:events");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const { beats, mixAmbience } = require("./lawu-ambience.cjs");

// Step the live film by physical wheel distance and advance its single rAF clock exactly
// once per encoded frame. Waiting on the renderer only changes recording time, never video timing.
module.exports = async function recordLawu(dataFile, output, device) {
  const payload = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  if (payload.private?.party?.short !== "Jize")
    throw Error("Generate neutral preview data with scripts/preview/client-data.ts");
  const fps = 24,
    phone = device !== "desktop",
    stage = process.env.STAGE || "medium";
  const viewport = phone ? { width: 360, height: 640 } : { width: 1440, height: 900 };
  const browser = await chromium.launch({
    executablePath: process.env.PREVIEW_BROWSER || undefined,
    args: [
      `--force-device-scale-factor=${phone ? 3 : 1}`,
      "--no-zygote",
      "--in-process-gpu",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const ctx = await browser.newContext({
    ...(phone ? devices["iPhone 14 Pro"] : {}),
    viewport,
    screen: viewport,
    deviceScaleFactor: phone ? 3 : 1,
    serviceWorkers: "block",
  });
  let encoder;
  try {
    await ctx.addInitScript(() => {
      sessionStorage.setItem(
        "lakon.session",
        JSON.stringify({ token: "preview.guest-session", role: "guest", exp: 4102444800 }),
      );
      localStorage.setItem("lakon.lang", "id");
      localStorage.setItem("lakon.clawd", JSON.stringify({ intro: true, tips: ["beat", "zoom", "gallery", "mountain"] }));
      const raf = window.requestAnimationFrame.bind(window),
        cancel = window.cancelAnimationFrame.bind(window);
      const real = performance.now.bind(performance),
        jobs = new Map();
      let frozen = false,
        ts = 0,
        next = 20000000;
      performance.now = () => (frozen ? ts : real());
      window.requestAnimationFrame = (callback) => {
        if (!frozen) return raf((t) => callback(frozen ? ts : t));
        const id = ++next;
        jobs.set(id, callback);
        return id;
      };
      window.cancelAnimationFrame = (id) => {
        if (!jobs.delete(id)) cancel(id);
      };
      window.freezeMountain = () => {
        ts = real();
        frozen = true;
      };
      window.renderMountainFrame = (delta, ms) => {
        ts += ms;
        const film = document.querySelector("main.film");
        if (delta)
          film.dispatchEvent(new WheelEvent("wheel", { deltaMode: 0, deltaY: delta, bubbles: true, cancelable: true }));
        const todo = [...jobs.values()];
        jobs.clear();
        for (const cb of todo) cb(ts);
        return { slide: film.dataset.slide, lights: film.dataset.stopLights };
      };
    });
    await ctx.route("**/functions/v1/trip-data", (r) =>
      r.fulfill({ contentType: "application/json", body: JSON.stringify(payload) }),
    );
    const p = await ctx.newPage(),
      cdp = await ctx.newCDPSession(p);
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    const base = process.env.BASE_URL || "http://127.0.0.1:4173";
    await p.goto(base + "/film/?stage=" + stage + "#day-2");
    await p.waitForFunction(() => document.querySelector(".film")?.dataset.worldReady === "lawu", null, { timeout: 120000 });
    await p.keyboard.press("ArrowDown");
    await p.waitForFunction(() => document.querySelector(".film").dataset.beat === "out");
    for (const target of ["/intro", "/depart-lawu"]) {
      await p.keyboard.press("ArrowDown");
      await p.waitForFunction(
        (v) =>
          document.querySelector(".film").dataset.slide?.endsWith(v) &&
          !document.querySelector(".film").hasAttribute("data-moving"),
        target,
        { timeout: 45000 },
      );
    }
    const span = await p.evaluate(() => {
      const track = document.querySelector(".gal-track"),
        cards = track.querySelectorAll(".gal-card");
      return cards[1].offsetLeft - cards[0].offsetLeft;
    });
    await p.evaluate(() => window.freezeMountain());
    await p.waitForTimeout(160);
    encoder = spawn(
      "ffmpeg",
      [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "image2pipe",
        "-framerate",
        String(fps),
        "-c:v",
        "mjpeg",
        "-i",
        "-",
        "-an",
        "-c:v",
        "libx264",
        "-threads",
        "2",
        "-crf",
        "19",
        "-preset",
        "veryfast",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        output,
      ],
      { stdio: ["pipe", "ignore", "inherit"] },
    );
    const finished = once(encoder, "close");
    let frames = 0,
      last = {};
    const frame = async (delta = 0) => {
      last = await p.evaluate(([d, m]) => window.renderMountainFrame(d, m), [delta, 1000 / fps]);
      const shot = await cdp.send("Page.captureScreenshot", {
        format: "jpeg",
        quality: 89,
        fromSurface: true,
        captureBeyondViewport: false,
      });
      if (!encoder.stdin.write(Buffer.from(shot.data, "base64"))) await once(encoder.stdin, "drain");
      frames++;
    };
    const holds = beats.map((b) => b[1]),
      moves = beats.map((b) => b[2]);
    for (let i = 0; i < holds.length; i++) {
      for (let f = 0; f < holds[i]; f++) await frame();
      console.log(`Panel ${i + 1}, ${last.slide}, ${frames} frames`);
      if (i === holds.length - 1) break;
      let prev = 0;
      for (let k = 1; k <= moves[i]; k++) {
        const t = k / moves[i],
          s = t * t * (3 - 2 * t);
        await frame((s - prev) * span + (k === moves[i] ? 0.02 : 0));
        prev = s;
      }
    }
    if (!last.slide?.endsWith("/movie-night") || Number(last.lights) !== 11 || errors.length)
      throw Error("Incomplete film capture " + JSON.stringify({ last, errors }));
    encoder.stdin.end();
    const [code] = await finished;
    if (code) throw Error("ffmpeg exit " + code);
    await mixAmbience(p, output, fps);
    console.log(`${frames} frames · ${fps} fps · ${output}`);
  } finally {
    if (encoder && encoder.exitCode === null) encoder.kill();
    await browser.close();
  }
};
