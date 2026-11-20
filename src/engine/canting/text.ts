/**
 * Teks dwibahasa halaman /canting/ (batik interaktif): UI, riwayat, langkah membatik, dan suara Clawd.
 * Murni data; ambil lewat ct(key, lang).
 */
export type CantingLang = "en" | "id";

export const CANTING_TEXT = {
  kicker: { en: "Canting", id: "Canting" },
  title: { en: "Kawung, in wax and indigo", id: "Kawung, malam dan nila" },
  back: { en: "Back", id: "Kembali" },

  "tool.klowong": { en: "Klowong", id: "Klowong" },
  "tool.klowong.hint": { en: "Draw the outline lines.", id: "Tarik garis-garis luar pola." },
  "tool.cecek": { en: "Cecek", id: "Cecek" },
  "tool.cecek.hint": { en: "Press for small dots.", id: "Tekan untuk titik-titik kecil." },
  "tool.tembok": { en: "Tembok", id: "Tembok" },
  "tool.tembok.hint": {
    en: "Cover a whole field so it stays light.",
    id: "Tutup satu bidang penuh agar tetap terang.",
  },

  "guide.label": { en: "Pencil guide", id: "Pola pensil" },
  "guide.none": { en: "Blank cloth", id: "Kain kosong" },
  "guide.kawung": { en: "Kawung", id: "Kawung" },
  "guide.parang": { en: "Parang", id: "Parang" },
  "guide.bengawan": { en: "Bengawan Solo", id: "Bengawan Solo" },
  "guide.trace": { en: "Let the canting trace it", id: "Biarkan canting menelusurinya" },

  undo: { en: "Undo", id: "Urungkan" },
  restart: { en: "Start over", id: "Mulai dari awal" },
  "restart.confirm": {
    en: "Clear the cloth and start over?",
    id: "Bersihkan kain dan mulai dari awal?",
  },

  "malam.label": { en: "Wax in the bowl", id: "Malam di nyamplung" },
  "malam.dip": { en: "Dip in the pan", id: "Celup ke wajan" },
  "malam.empty": {
    en: "The bowl is empty. Dip it in the pan again.",
    id: "Nyamplungnya kosong. Celup lagi ke wajan.",
  },

  "stage.malam": { en: "Wax", id: "Malam" },
  "stage.nila": { en: "Indigo", id: "Nila" },
  "stage.soga": { en: "Soga brown", id: "Soga" },
  "stage.lorod": { en: "Boil off", id: "Lorod" },
  "stage.jadi": { en: "Done", id: "Jadi" },

  "action.nila": { en: "Dip in indigo", id: "Celup nila" },
  "action.soga": { en: "Dip in soga", id: "Celup soga" },
  "action.lorod": { en: "Boil off the wax", id: "Lorod malamnya" },
  "action.save": { en: "Save my batik", id: "Simpan batikku" },
  "action.share": { en: "Share", id: "Bagikan" },
  saved: {
    en: "Saved. Your batik is in your downloads.",
    id: "Tersimpan. Batikmu ada di unduhan.",
  },

  "hint.biru": {
    en: "Wax drawn now keeps the blue safe under the brown. This step is called mbironi.",
    id: "Malam yang kamu torehkan sekarang menjaga biru tetap biru di bawah soga. Langkah ini disebut mbironi.",
  },
  "hint.lorod.locked": {
    en: "Wax first, then dye, then boil. The boil-off comes last.",
    id: "Malam dulu, lalu celup, baru dilorod. Lorod selalu terakhir.",
  },

  "zoom.in": { en: "Zoom in", id: "Perbesar" },
  "zoom.out": { en: "Zoom out", id: "Perkecil" },
  "calm.note": {
    en: "Motion is reduced. Everything still works, just with less movement.",
    id: "Gerak dikurangi. Semua tetap berfungsi, hanya dengan gerakan lebih sedikit.",
  },
  nowebgl: {
    en: "This device can't draw the 3D cloth. You can still explore the rest of the trip.",
    id: "Perangkat ini tidak bisa menggambar kain 3D. Bagian lain perjalanan tetap bisa dijelajahi.",
  },
  "keyboard.note": {
    en: "No mouse or touch? Choose a pencil guide and let the canting trace it for you.",
    id: "Tanpa mouse atau layar sentuh? Pilih pola pensil lalu biarkan canting menelusurinya.",
  },

  "about.title": { en: "About batik tulis", id: "Tentang batik tulis" },
  "about.body": {
    en: "Batik tulis is drawn by hand: a canting lays hot wax (malam) on cloth, the cloth is dyed, and the wax is boiled off (nglorod). UNESCO recognised Indonesian batik in 2009. Laweyan, in Solo, was the old batik merchants' quarter; its merchants were behind Sarekat Dagang Islam, founded in 1905. Kawung, four ovals around a centre, is one of the oldest motifs, and was once a larangan pattern reserved for the courts of Yogyakarta and Surakarta. This page is a digital play, not a real batik tulis.",
    id: "Batik tulis digambar dengan tangan: canting menorehkan malam panas di atas kain, kain dicelup warna, lalu malamnya dilorod. UNESCO mengakui batik Indonesia pada 2009. Laweyan di Solo dulu kampung para saudagar batik; merekalah yang mendirikan Sarekat Dagang Islam pada 1905. Kawung, empat bulatan lonjong mengelilingi satu titik pusat, termasuk motif tertua dan dulu pola larangan yang hanya boleh dipakai keraton Yogyakarta dan Surakarta. Halaman ini permainan digital, bukan batik tulis sungguhan.",
  },

  "process.nyorek": {
    en: "Nyorek: pencil the pattern onto the cloth.",
    id: "Nyorek: menjiplak pola dengan pensil di kain.",
  },
  "process.nglowong": {
    en: "Nglowong: outline the pattern in wax.",
    id: "Nglowong: menorehkan garis luar pola dengan malam.",
  },
  "process.ngisen": {
    en: "Ngisen-iseni: fill the shapes with dots and fine lines.",
    id: "Ngisen-iseni: mengisi bidang dengan titik dan garis halus.",
  },
  "process.nembok": {
    en: "Nembok: cover the fields that should stay light.",
    id: "Nembok: menutup bidang yang harus tetap terang.",
  },
  "process.medel": {
    en: "Medel: dip the cloth in indigo.",
    id: "Medel: mencelup kain ke dalam nila.",
  },
  "process.ngerok": {
    en: "Ngerok: scrape off the covering wax.",
    id: "Ngerok: mengerik malam penutup.",
  },
  "process.mbironi": {
    en: "Mbironi: cover what should stay blue.",
    id: "Mbironi: menutup bagian yang harus tetap biru.",
  },
  "process.nyoga": {
    en: "Nyoga: dye the cloth soga brown.",
    id: "Nyoga: mencelup kain dengan warna soga cokelat.",
  },
  "process.nglorod": {
    en: "Nglorod: boil the wax away in hot water.",
    id: "Nglorod: merebus kain agar malamnya luruh.",
  },

  "clawd.hello": {
    en: "Hi, I'm Clawd. Pick up the canting and draw something.",
    id: "Hai, aku Clawd. Ambil canting itu dan mulailah menggambar.",
  },
  "clawd.blow": {
    en: "Batik makers blow on the spout first, so it won't clog. Like this.",
    id: "Pembatik meniup cucuk dulu supaya tidak mampet. Begini.",
  },
  "clawd.fast": {
    en: "A quick hand makes a thin line.",
    id: "Tangan yang cepat membuat garis tipis.",
  },
  "clawd.slow": {
    en: "Hold still and the wax spreads. That's called mbleber.",
    id: "Kalau diam, malamnya melebar. Itu namanya mbleber.",
  },
  "clawd.empty": {
    en: "The bowl is empty. Dip it in the pan again.",
    id: "Nyamplungnya kosong. Celup lagi ke wajan, ya.",
  },
  "clawd.cool": {
    en: "See it go from glossy to creamy? The wax is cooling.",
    id: "Lihat, dari mengilap jadi putih krem? Malamnya mendingin.",
  },
  "clawd.nila": {
    en: "Into the indigo it goes. Let it soak a while.",
    id: "Kainnya masuk ke nila. Biarkan meresap sebentar.",
  },
  "clawd.kerok": {
    en: "Now I scrape off the covering wax. Gently.",
    id: "Sekarang aku kerok malam penutupnya. Pelan-pelan.",
  },
  "clawd.biru": {
    en: "Cover the blue you want to keep, then we dye brown.",
    id: "Tutup biru yang mau dipertahankan, lalu kita celup cokelat.",
  },
  "clawd.soga": {
    en: "Soga brown now. Warm, like old teak.",
    id: "Sekarang soga cokelat. Hangat, seperti jati tua.",
  },
  "clawd.lorod": {
    en: "Into the hot water... and there are your white lines!",
    id: "Masuk ke air panas... dan garis putihmu muncul.",
  },
  "clawd.done": {
    en: "Look at that. I'm proud of your batik.",
    id: "Lihat itu. Aku bangga dengan batikmu.",
  },
  "clawd.saved": {
    en: "Saved. It's yours to keep.",
    id: "Sudah tersimpan. Batik ini milikmu.",
  },
  "clawd.undo": {
    en: "No worries, wax forgives. Try that part again.",
    id: "Tenang saja, bisa diulang. Coba bagian itu lagi.",
  },
} as const satisfies Record<string, { en: string; id: string }>;

export type CantingTextKey = keyof typeof CANTING_TEXT;

export function ct(key: CantingTextKey, lang: CantingLang): string {
  return CANTING_TEXT[key][lang];
}
