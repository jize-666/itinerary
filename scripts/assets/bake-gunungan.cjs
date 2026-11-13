/* eslint-disable @typescript-eslint/no-require-imports -- skrip dev CommonJS mandiri (bukan kode aplikasi); dijalankan langsung dengan node */
// Memanggang gambar gunungan menjadi tekstur untuk panggung 3D.
//   node scripts/assets/bake-gunungan.cjs
// Gambarnya dilukis kode kanvas di scripts/assets/gunungan-paint.js (dua rupa: "agung" dan "murka", ditambah
// sisi geni). Skrip ini menjalankan pelukis itu di Chromium (ribuan path ber-clip, ±1,5 dtk per rupa di CPU)
// lalu menyimpan hasilnya ke public/film/gunungan/. Di perangkat tamu gambarnya tinggal diunduh: tidak ada
// kode menggambar di bundle dan tidak ada jeda saat film berjalan.
//
// Keluaran per rupa:
//   <rupa>-<tinggi>.webp      warna sungging dan prada; kanal alpha = kulit utuh (0 = lubang tatahan atau di
//                             luar siluet). Lossy, alpha tetap tajam.
//   <rupa>-aux-<tinggi>.webp  setengah ukuran, lossless (kanal tidak boleh saling bocor): R = prada (logam),
//                             G = bagian yang menyala, B = tinggi relief (tepi lubang melandai, prada timbul,
//                             garis tinta beralur) untuk pencahayaan timbul di shader.
//   geni-1000.webp            kobaran api dengan wajah iblis (setengah ukuran: gambarnya lembut), tanpa alpha.
// Butuh: playwright (Chromium). Ubah gambar di pelukis → jalankan ulang skrip ini → commit hasilnya.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const OUT = path.join(ROOT, "public", "film", "gunungan");
const PAINTER = path.join(__dirname, "gunungan-paint.js");
const THREE_DIR = path.join(ROOT, "node_modules", "three", "build");
/** Tinggi tekstur warna: 2000 untuk tier High, 1500 untuk Medium dan Low. Aux separuhnya. */
const HEIGHTS = [2000, 1500];
const GENI_HEIGHT = 1000;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // three hanya dipakai pelukis untuk Shape (titik siluet berjarak sama) dan kurva
  await page.route("https://bake.local/**", (r) => {
    const name = new URL(r.request().url()).pathname.slice(1);
    if (name === "") return r.fulfill({ contentType: "text/html", body: '<script type="module">import * as THREE from "/three.module.js"; window.THREE = THREE;</script>' });
    return r.fulfill({ contentType: "text/javascript", body: fs.readFileSync(path.join(THREE_DIR, name)) });
  });
  await page.goto("https://bake.local/");
  await page.waitForFunction(() => "THREE" in window);
  await page.addScriptTag({ content: fs.readFileSync(PAINTER, "utf8") });

  const result = await page.evaluate(
    ({ heights, geniHeight }) => {
      const files = {};
      const notes = {};
      const canvas = (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h });
      for (const variant of ["agung", "murka"]) {
        const { W, H, cA, cC, cM, cE, cB, SIL, KALA_EYES } = window.paintGunungan(window.THREE, variant);
        const N = W * H;
        const read = (c) => c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, W, H).data;
        /** Kanvas abu-abu dari satu larik 0–255. */
        const gray = (arr) => {
          const c = canvas(W, H);
          const g = c.getContext("2d", { willReadFrequently: true });
          const img = g.createImageData(W, H);
          for (let i = 0; i < N; i++) {
            img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = arr[i];
            img.data[i * 4 + 3] = 255;
          }
          g.putImageData(img, 0, 0);
          return c;
        };
        const blurred = (c, px) => {
          const b = canvas(W, H);
          const g = b.getContext("2d", { willReadFrequently: true });
          g.fillStyle = "#000";
          g.fillRect(0, 0, W, H);
          g.filter = `blur(${px}px)`;
          g.drawImage(c, 0, 0);
          return read(b);
        };
        const scaled = (c, h) => {
          if (h === H) return c;
          const s = canvas(Math.round((W * h) / H), h);
          const g = s.getContext("2d");
          g.imageSmoothingQuality = "high";
          g.drawImage(c, 0, 0, s.width, s.height);
          return s;
        };

        // siluet: di luar garis luar gunungan dianggap lubang
        const sil = canvas(W, H);
        const sg = sil.getContext("2d", { willReadFrequently: true });
        sg.fillStyle = "#fff";
        sg.fill(SIL);
        const [dS, dA, dC, dM, dE] = [read(sil), read(cA), read(cC), read(cM), read(cE)];
        const [solid, metal, glow, ink] = [new Uint8ClampedArray(N), new Uint8ClampedArray(N), new Uint8ClampedArray(N), new Uint8ClampedArray(N)];
        let area = 0;
        for (let i = 0; i < N; i++) {
          const j = i * 4;
          const inside = dS[j + 3] / 255;
          const skin = (dA[j] / 255) * (dA[j + 3] / 255) * inside;
          solid[i] = skin * 255;
          metal[i] = (dM[j + 2] / 255) * (dM[j + 3] / 255) * skin * 255;
          glow[i] = Math.min(1, (0.45 * dE[j] + 0.45 * dE[j + 1] + 0.3 * dE[j + 2]) / 255) * (dE[j + 3] / 255) * inside * 255;
          // garis tatah tinta: warna tinta (#140804) di atas kulit utuh
          const near = Math.abs(dC[j] - 20) < 16 && Math.abs(dC[j + 1] - 8) < 13 && Math.abs(dC[j + 2] - 4) < 13;
          ink[i] = near ? skin * 255 : 0;
          area += skin;
        }

        // relief: tepi lubang melandai (pahatan), prada timbul, garis tinta beralur
        const [bS, bM, bI] = [blurred(gray(solid), 5), blurred(gray(metal), 2.5), blurred(gray(ink), 1.6)];
        const aux = canvas(W, H);
        const ag = aux.getContext("2d", { willReadFrequently: true });
        const auxImg = ag.createImageData(W, H);
        for (let i = 0; i < N; i++) {
          const j = i * 4;
          const edge = Math.min(1, Math.max(0, (bS[j] / 255 - 0.5) / 0.46));
          const bevel = edge * edge * (3 - 2 * edge);
          const height = 0.3 + 0.38 * bevel + 0.3 * (bM[j] / 255) - 0.3 * (bI[j] / 255);
          auxImg.data[j] = metal[i];
          auxImg.data[j + 1] = glow[i];
          auxImg.data[j + 2] = Math.min(1, Math.max(0, height)) * 255;
          auxImg.data[j + 3] = 255;
        }
        ag.putImageData(auxImg, 0, 0);

        // warna + alpha: kanvas pelukis di atas warna kulit gelap (tepi lubang tidak berpinggiran terang), lalu dilubangi
        const alpha = canvas(W, H);
        const alg = alpha.getContext("2d", { willReadFrequently: true });
        const alImg = alg.createImageData(W, H);
        for (let i = 0; i < N; i++) alImg.data[i * 4 + 3] = solid[i];
        alg.putImageData(alImg, 0, 0);
        const color = canvas(W, H);
        const cg = color.getContext("2d");
        cg.fillStyle = "#0c0503";
        cg.fillRect(0, 0, W, H);
        cg.drawImage(cC, 0, 0);
        cg.globalCompositeOperation = "destination-in";
        cg.drawImage(alpha, 0, 0);

        for (const h of heights) {
          files[`${variant}-${h}.webp`] = scaled(color, h).toDataURL("image/webp", 0.9);
          files[`${variant}-aux-${h / 2}.webp`] = scaled(aux, h / 2).toDataURL("image/webp", 1);
        }
        if (variant === "murka") {
          const geni = canvas(W, H);
          const gg = geni.getContext("2d");
          gg.fillStyle = "#0c0503";
          gg.fillRect(0, 0, W, H);
          gg.drawImage(cB, 0, 0);
          files[`geni-${geniHeight}.webp`] = scaled(geni, geniHeight).toDataURL("image/webp", 0.86);
          notes.eyes = KALA_EYES.map(([x, y]) => [x / W, 1 - y / H]);
        }
        notes[variant] = `${W}×${H}, kulit utuh ${((area / N) * 100).toFixed(1)}% bidang`;
      }
      return { files, notes };
    },
    { heights: HEIGHTS, geniHeight: GENI_HEIGHT },
  );
  await browser.close();

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  let total = 0;
  for (const [name, url] of Object.entries(result.files)) {
    const buf = Buffer.from(url.split(",")[1], "base64");
    fs.writeFileSync(path.join(OUT, name), buf);
    total += buf.length;
    console.log(`${name.padEnd(22)} ${(buf.length / 1024).toFixed(0).padStart(5)} KB`);
  }
  console.log(`total ${(total / 1024).toFixed(0)} KB`, JSON.stringify(result.notes));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
