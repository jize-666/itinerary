/* Lakon Tiga Hari: service worker Today offline (PRD FR-33).
 *
 * - Saat dipasang: unduh halaman shell (/today/, /, /film/) lalu semua JS/CSS/font yang dirujuknya.
 * - Halaman: jaringan dulu (paling lama 3,5 dtk, untuk sinyal lemah di lereng Lawu), lalu salinan.
 * - /_next/static/*: cache dulu (nama file sudah ber-hash, isinya tidak pernah berubah).
 * - Lainnya di domain sendiri (manifest, ikon, foto): salinan dulu, diperbarui diam-diam.
 * - Domain lain (trip-data di Supabase) TIDAK disentuh: datanya disimpan aplikasi sendiri per token,
 *   supaya data peran tim tidak pernah bisa tersaji untuk peran tamu dari cache bersama.
 * - /audio/* dilewati (besar, dan memakai range request).
 * Versi build datang dari ?v= di URL pendaftaran; versi baru → cache shell baru, yang lama dibuang.
 */
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const SHELL = `lakon-shell-${VERSION}`;
const RUNTIME = "lakon-runtime";
const PAGES = ["/today/", "/", "/film/"];
const EXTRA = ["/manifest.webmanifest", "/icons/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png"];
const PAGE_TIMEOUT_MS = 3500;
const RUNTIME_MAX = 80;
// Font: cukup subset Latin (teks EN/ID/Jawa); subset lain diunduh hanya bila memang dipakai.
const SKIP_FONT = /(cyrillic|greek|vietnamese|hebrew|arabic)/i;

const assetsIn = (text, re) => Array.from(text.matchAll(re), (m) => m[1]);
const HTML_ASSET = /(?:src|href)="(\/_next\/static\/[^"?#]+)"/g;
// url(...) di CSS bisa relatif ("../media/x.woff2"): di-resolve terhadap alamat file CSS-nya.
const CSS_ASSET = /url\(\s*["']?([^"')?#]+\.(?:woff2|png|svg|jpg|webp|avif))/g;

async function precache() {
  const cache = await caches.open(SHELL);
  const assets = new Set(EXTRA);
  for (const page of PAGES) {
    const res = await fetch(page, { cache: "reload", credentials: "same-origin" });
    if (!res.ok) throw new Error(`precache ${page}: ${res.status}`);
    const html = await res.clone().text();
    await cache.put(page, res);
    for (const a of assetsIn(html, HTML_ASSET)) assets.add(a);
  }
  for (const css of [...assets].filter((a) => a.endsWith(".css"))) {
    const res = await fetch(css);
    if (!res.ok) continue;
    const text = await res.clone().text();
    await cache.put(css, res);
    for (const a of assetsIn(text, CSS_ASSET)) {
      const path = new URL(a, new URL(css, self.location.origin)).pathname;
      if (path.startsWith("/_next/static/") && !SKIP_FONT.test(path)) assets.add(path);
    }
  }
  await Promise.all(
    [...assets].map(async (a) => {
      if (await cache.match(a)) return;
      try {
        const res = await fetch(a);
        if (res.ok) await cache.put(a, res);
      } catch {
        /* aset opsional: diunduh lagi saat dipakai */
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL, RUNTIME]);
      for (const key of await caches.keys()) if (key.startsWith("lakon-") && !keep.has(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

const pageKey = (url) => (url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`);

async function trim(cache) {
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - RUNTIME_MAX))) await cache.delete(k);
}

/** Halaman: jaringan dulu dengan batas waktu; offline/lambat → salinan; tak ada salinan → Today. */
async function page(request, url) {
  const key = pageKey(url);
  const network = fetch(request).then(async (res) => {
    if (res.ok && PAGES.includes(key)) await (await caches.open(SHELL)).put(key, res.clone());
    return res;
  });
  const cached = () => caches.match(key).then((r) => r || caches.match("/today/"));
  try {
    const res = await Promise.race([network, new Promise((_, reject) => setTimeout(() => reject(new Error("slow")), PAGE_TIMEOUT_MS))]);
    return res;
  } catch {
    const copy = await cached();
    if (copy) {
      network.catch(() => undefined); // tetap memperbarui salinan bila jaringan akhirnya menjawab
      return copy;
    }
    return network.catch(() => Response.error());
  }
}

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) {
    const cache = await caches.open(RUNTIME);
    await cache.put(request, res.clone());
    trim(cache);
  }
  return res;
}

/** Payload RSC navigasi klien: jaringan dulu (harus cocok dengan build yang sedang jalan), salinan bila offline. */
async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(RUNTIME);
      await cache.put(request, res.clone());
      trim(cache);
    }
    return res;
  } catch {
    return (await caches.match(request, { ignoreSearch: true })) || Response.error();
  }
}

async function staleWhileRevalidate(request, event) {
  const hit = await caches.match(request);
  const update = fetch(request)
    .then(async (res) => {
      if (res.ok && res.type === "basic") {
        const cache = await caches.open(RUNTIME);
        await cache.put(request, res.clone());
        trim(cache);
      }
      return res;
    })
    .catch(() => undefined);
  if (hit) {
    event.waitUntil(update);
    return hit;
  }
  return (await update) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/audio/") || url.pathname === "/sw.js") return;
  if (request.mode === "navigate") return event.respondWith(page(request, url));
  if (url.pathname.startsWith("/_next/static/")) return event.respondWith(cacheFirst(request));
  if (url.searchParams.has("_rsc") || request.headers.get("rsc") === "1") return event.respondWith(networkFirst(request));
  event.respondWith(staleWhileRevalidate(request, event));
});
