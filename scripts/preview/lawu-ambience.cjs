/* eslint-disable @typescript-eslint/no-require-imports -- offline recording tool */
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const { spawnSync } = require("node:child_process"),
  ts = require("typescript");
// LAWU_PACE (bawaan 1) memperpanjang diam dan geser tiap panel, mis. 2 = video ±33 dtk untuk pratinjau host.
const pace = Math.max(0.25, Number(process.env.LAWU_PACE) || 1);
const beats = [
  ["depart-lawu", 7, 30],
  ["kemuning-sunrise", 22, 22],
  ["tea-house", 5, 26],
  ["candi-cetho", 22, 27],
  ["candi-sukuh", 20, 18],
  ["friday-prayer", 4, 19],
  ["tawangmangu-lunch", 6, 32],
  ["grojogan-sewu", 30, 29],
  ["rest-2", 10, 24],
  ["selat-solo", 6, 21],
  ["movie-night", 16, 0],
].map(([id, hold, move]) => [id, Math.round(hold * pace), Math.round(move * pace)]);
// Render the very same procedural sound node offline on the video clock. Capturing a
// wall-clock microphone or tab stream would stretch the bed on a software-rendered machine.
async function mixAmbience(page, output, fps = 24) {
  const src = fs.readFileSync(path.resolve(__dirname, "../../src/components/film/lawu-audio.ts"), "utf8");
  const code = ts.transpileModule(src, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  await page.route("**/__preview_lawu_audio.mjs", (r) => r.fulfill({ contentType: "text/javascript", body: code }));
  const pcm = await page.evaluate(
    async ({ beats, fps }) => {
      const { mountAmbience } = await import("/__preview_lawu_audio.mjs");
      const count = beats.reduce((a, [, hold, move]) => a + hold + move, 0),
        rate = 48000;
      const ctx = new OfflineAudioContext(1, Math.round((rate * count) / fps), rate),
        master = ctx.createGain();
      master.gain.value = 0.82;
      master.connect(ctx.destination);
      let frame = 0;
      for (const [place, hold, move] of beats) {
        const start = frame / fps;
        frame += hold + move;
        mountAmbience({ context: ctx, output: master }, place, start, frame / fps);
      }
      const result = await ctx.startRendering(),
        arr = result.getChannelData(0),
        samples = new Uint8Array(arr.length * 2),
        view = new DataView(samples.buffer);
      for (let i = 0; i < arr.length; i++)
        view.setInt16(i * 2, Math.max(-32767, Math.min(32767, Math.round(arr[i] * 32767))), true);
      let binary = "";
      for (let i = 0; i < samples.length; i += 16384) binary += String.fromCharCode(...samples.subarray(i, i + 16384));
      return btoa(binary);
    },
    { beats, fps },
  );
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lawu-mix-")),
    pcmPath = path.join(tmp, "track.pcm"),
    muxed = path.join(path.dirname(output), "." + path.basename(output) + ".mix.mp4");
  try {
    fs.writeFileSync(pcmPath, Buffer.from(pcm, "base64"));
    const r = spawnSync(
      "ffmpeg",
      [
        "-v",
        "error",
        "-y",
        "-i",
        output,
        "-f",
        "s16le",
        "-ar",
        "48000",
        "-ac",
        "1",
        "-i",
        pcmPath,
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "112k",
        "-movflags",
        "+faststart",
        "-shortest",
        muxed,
      ],
      { stdio: "inherit" },
    );
    if (r.status !== 0) throw Error("Sound mix failed");
    fs.renameSync(muxed, output);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    if (fs.existsSync(muxed)) fs.unlinkSync(muxed);
  }
}
module.exports = { beats, mixAmbience };
