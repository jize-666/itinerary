export type Lang = "en" | "id";
type Pair = Readonly<Record<Lang, string>>;

export const strings = {
  back: { en: "Back", id: "Kembali" },
  title: { en: "Solo in miniature", id: "Solo dalam miniatur" },
  intro: {
    en: "Explore a palace pavilion, a market and a batik makers’ lane in one scale model of Solo.",
    id: "Susuri serambi istana, pasar, dan gang perajin batik dalam satu maket Solo.",
  },
  tour: { en: "Play tour", id: "Putar tur" },
  pause: { en: "Pause", id: "Jeda" },
  resume: { en: "Resume", id: "Lanjutkan" },
  restart: { en: "Restart tour", id: "Ulangi tur" },
  locations: { en: "Locations", id: "Lokasi" },
  angle: { en: "Angle", id: "Sudut" },
  home: { en: "Home view", id: "Tampilan awal" },
  previous: { en: "Previous", id: "Sebelumnya" },
  next: { en: "Next", id: "Berikutnya" },
  zoomIn: { en: "Zoom in", id: "Perbesar" },
  zoomOut: { en: "Zoom out", id: "Perkecil" },
  expand: { en: "Full screen", id: "Layar penuh" },
  contract: { en: "Exit full screen", id: "Keluar dari layar penuh" },
  guide: { en: "Guide", id: "Panduan" },
  close: { en: "Close", id: "Tutup" },
  free: { en: "Free exploration", id: "Jelajah bebas" },
  cameraTour: { en: "Camera tour", id: "Tur kamera" },
  photo: { en: "Photo", id: "Potret" },
  allPhotos: { en: "Photo all sides", id: "Potret semua sisi" },
  jpeg: { en: "JPEG", id: "JPEG" },
  png: { en: "PNG", id: "PNG" },
  format: { en: "Image format", id: "Format gambar" },
  save: { en: "Save", id: "Simpan" },
  share: { en: "Share", id: "Bagikan" },
  retry: { en: "Try again", id: "Coba lagi" },
  fullSize: { en: "Open full size", id: "Buka ukuran penuh" },
  working: { en: "Preparing photos…", id: "Menyiapkan foto…" },
  canceled: { en: "Canceled", id: "Dibatalkan" },
  photoReady: { en: "Your photo", id: "Hasil potret" },
  archiveReady: { en: "Your nine views", id: "Sembilan sudut maket" },
  progress: { en: "Photos ready", id: "Foto siap" },
  saveOne: { en: "Save this photo", id: "Simpan foto ini" },
  saved: { en: "Saved", id: "Tersimpan" },
  failed: {
    en: "The file couldn’t be saved. Try again or open a photo at full size to save it.",
    id: "Berkas gagal disimpan. Coba lagi atau buka foto ukuran penuh untuk menyimpannya.",
  },
  loading: { en: "Building the miniature…", id: "Menyusun maket…" },
  unavailable: {
    en: "3D graphics are unavailable. Enable hardware acceleration or try another browser.",
    id: "Grafis 3D belum tersedia. Aktifkan akselerasi perangkat keras atau coba peramban lain.",
  },
  angles: { en: "Camera angles", id: "Sudut kamera" },
  mode: { en: "Display mode", id: "Mode tampilan" },
  material: { en: "Original materials", id: "Material asli" },
  clay: { en: "Clay model", id: "Maket polos" },
  wire: { en: "Wireframe", id: "Kerangka" },
  labels: { en: "Location labels", id: "Penanda lokasi" },
  canting: { en: "Draw your own batik", id: "Membatik sendiri" },
  calm: { en: "Calm", id: "Tenang" },
  selectPose: { en: "Choose a tour pose", id: "Pilih pose tur" },
  pose: { en: "Tour pose", id: "Pose tur" },
  canvasLabel: {
    en: "Interactive 3D model of Pendhapa Ageng, Pasar Gede and the Laweyan Batik Quarter. Arrow keys rotate the camera.",
    id: "Maket 3D interaktif Pendhapa Ageng, Pasar Gede, dan Kampung Batik Laweyan. Tombol panah memutar kamera.",
  },
  drag: { en: "Orbit", id: "Putar" },
  slide: { en: "Slide", id: "Geser" },
  zoom: { en: "Zoom", id: "Atur jarak" },
  orbitHint: {
    en: "Drag with one finger or the left mouse button to orbit.",
    id: "Seret dengan satu jari atau tombol kiri tetikus untuk memutar maket.",
  },
  slideHint: {
    en: "Drag with two fingers, or hold Shift while dragging, to slide the camera.",
    id: "Geser dua jari bersamaan, atau tahan Shift sambil menyeret, untuk menggeser kamera.",
  },
  zoomHint: {
    en: "Pinch or scroll to move closer or farther away.",
    id: "Cubit, rentangkan, atau gulir untuk mendekat dan menjauh.",
  },
  keyboardHint: {
    en: "Focus the model and use the arrow keys to orbit. Hold Shift with an arrow to slide.",
    id: "Fokuskan maket lalu tekan tombol panah untuk memutar. Tahan Shift bersama tombol panah untuk menggeser.",
  },
  orientation: { en: "Orientation", id: "Arah pandang" },
  view: { en: "View", id: "Tampilan" },
  selectLocation: { en: "Choose a location", id: "Pilih lokasi" },
  done: { en: "Tour complete", id: "Tur selesai" },
  fps: { en: "Frame time (p95)", id: "Waktu frame (p95)" },
  high: { en: "High", id: "Tinggi" },
  ultra: { en: "Ultra", id: "Ultra" },
  lite: { en: "Lite (test)", id: "Lite (uji)" },
  drawCalls: { en: "Draw calls", id: "Panggilan gambar" },
  triangles: { en: "Triangles", id: "Segitiga" },
  photoHint: {
    en: "The photo uses your current framing.",
    id: "Foto mengikuti bingkai kamera saat ini.",
  },
  model: { en: "3D diorama", id: "Diorama 3D" },
  kicker: { en: "Diorama Solo", id: "Diorama Solo" },
  chooseSide: { en: "Choose an angle", id: "Pilih sudut" },
} as const satisfies Record<string, Pair>;

export type StringKey = keyof typeof strings;
export const tr = (lang: Lang, key: StringKey): string => strings[key][lang];

export const locationContent = {
  pendhapa: {
    name: {
      en: "Pendhapa Ageng, Pura Mangkunegaran",
      id: "Pendhapa Ageng, Pura Mangkunegaran",
    },
    short: { en: "Pendhapa Ageng", id: "Pendhapa Ageng" },
    kind: { en: "Pura Mangkunegaran", id: "Pura Mangkunegaran" },
    description: {
      en: "Look between the pale blue columns. The raised central floor opens out beneath three tiers of joglo roof.",
      id: "Lihat dari sela tiang biru muda. Di bawah tiga tingkat atap joglo, lantai tengah pendhapa tampak lebih tinggi dari serambi.",
    },
  },
  pasar: {
    name: { en: "Pasar Gede", id: "Pasar Gede" },
    short: { en: "Pasar Gede", id: "Pasar Gede" },
    kind: { en: "Traditional market", id: "Pasar tradisional" },
    description: {
      en: "Follow the street between the two market halls. Beside the broad entrance, fruit baskets line a trader’s table.",
      id: "Ikuti jalan di antara dua bangunan pasar. Di sisi pintu masuk yang lebar, keranjang buah berjejer di meja pedagang.",
    },
  },
  laweyan: {
    name: { en: "Laweyan Batik Quarter", id: "Kampung Batik Laweyan" },
    short: { en: "Laweyan", id: "Laweyan" },
    kind: { en: "Batik quarter", id: "Kampung batik" },
    description: {
      en: "Look through the open gate into an imagined workshop courtyard. The indigo cloth on its wooden frame carries a pattern designed for this miniature.",
      id: "Intip halaman kerja rekaan di balik gerbang terbuka. Kain indigo pada gawangan kayu bermotif orisinal yang dirancang untuk maket ini.",
    },
  },
} as const satisfies Record<
  string,
  Record<"name" | "short" | "kind" | "description", Pair>
>;

export const scenes = [
  { en: "View from the south", id: "Pandangan dari selatan" },
  { en: "Around the miniature", id: "Mengitari maket" },
  { en: "Pavilion colonnade", id: "Serambi pendhapa" },
  { en: "Market stalls", id: "Kios Pasar Gede" },
  { en: "The batik courtyard", id: "Halaman batik Laweyan" },
  { en: "Overhead view", id: "Tampak atas" },
] as const satisfies readonly Pair[];

export const directions = [
  { en: "North", id: "Utara" },
  { en: "North-east", id: "Timur Laut" },
  { en: "East", id: "Timur" },
  { en: "South-east", id: "Tenggara" },
  { en: "South", id: "Selatan" },
  { en: "South-west", id: "Barat Daya" },
  { en: "West", id: "Barat" },
  { en: "North-west", id: "Barat Laut" },
  { en: "Top", id: "Atas" },
] as const satisfies readonly Pair[];
