// Server statis kecil untuk folder `out/` (preview & e2e). Tanpa dependency.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = new URL("../out/", import.meta.url).pathname;
const PORT = Number(process.env.PORT || 4173);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".woff2": "font/woff2", ".txt": "text/plain", ".webmanifest": "application/manifest+json", ".ico": "image/x-icon", ".mp3": "audio/mpeg" };

createServer(async (req, res) => {
  try {
    let path = normalize(decodeURIComponent((req.url || "/").split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    let file = join(ROOT, path);
    const s = await stat(file).catch(() => null);
    if (s?.isDirectory()) file = join(file, "index.html");
    else if (!s) file = join(ROOT, "404.html");
    const body = await readFile(file);
    res.writeHead(file.endsWith("404.html") && !s ? 404 : 200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "x-robots-tag": "noindex, nofollow" });
    res.end(body);
  } catch {
    res.writeHead(500).end("error");
  }
}).listen(PORT, () => console.log(`serving out/ on http://localhost:${PORT}`));
