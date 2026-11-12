import type { Page, Route } from "@playwright/test";

export const VERIFY = "**/functions/v1/verify-access";
export const TRIP = "**/functions/v1/trip-data";
export const FUTURE = 4_102_444_800; // 2100-01-01

/**
 * Sesi palsu di tab ini (klien tidak memverifikasi token; server yang memverifikasi, dan di e2e server di-mock).
 * Sesi tab browser hidup di sessionStorage, jadi tiap halaman baru perlu di-seed sendiri.
 */
export async function seedSession(page: Page, role: "guest" | "team" = "guest") {
  await page.addInitScript(
    ([k, v]) => {
      if (!sessionStorage.getItem("e2e-seeded")) {
        sessionStorage.setItem(k, v);
        sessionStorage.setItem("e2e-seeded", "1");
      }
    },
    ["lakon.session", JSON.stringify({ token: `e2e.${role}-token-123`, role, exp: FUTURE })] as const,
  );
}

export const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

const L = (en: string, id: string) => ({ en, id });
/** Data trip tiruan (sengaja bukan data asli). */
export function tripFixture(role: "guest" | "team") {
  const stop = {
    id: "walk",
    start: "08:00",
    end: "09:30",
    title: L("Morning walk", "Jalan pagi"),
    why: L("Cool air before the heat.", "Udara sejuk sebelum panas."),
    ...(role === "team" ? { teamNote: "Bring umbrellas", estCost: 50000 } : {}),
  };
  return {
    role,
    trip: {
      title: L("A Three-Day Lakon", "Lakon Tiga Hari"),
      route: { label: L("Isle → Capital → City", "Pulau → Ibu kota → Kota"), legs: ["AAA", "BBB", "CCC"] },
      days: [{ n: 1, date: "2027-04-08", title: L("The royal day", "Hari keraton"), subtitle: L("Slow and grand", "Pelan dan agung"), stops: [stop] }],
    },
    private: { party: { name: "Mira Santoso", short: "Mira", size: 1, greeting: L("Welcome, Mira. This lakon was written for you.", "Selamat datang, Mira.") } },
    ...(role === "team" ? { team: {} } : {}),
  };
}

/** Data Today tiruan yang lebih lengkap (sengaja fiktif: tempat, nomor, dan alamat bukan data asli). */
export function todayFixture(role: "guest" | "team" = "guest") {
  const maps = (q: string) => ({ query: q, url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` });
  const food = (sweet: "low" | "mid" | "high") => ({ halal: true, alcohol: false, sweet, banana: false });
  return {
    role,
    trip: {
      title: L("A Three-Day Lakon", "Lakon Tiga Hari"),
      route: { label: L("Isle → Capital → City", "Pulau → Ibu kota → Kota"), legs: ["AAA", "BBB", "CCC"] },
      beforeYouGo: [
        { id: "time", title: L("Time zone", "Zona waktu"), body: L("Same time as home.", "Sama dengan rumah.") },
        { id: "cash", title: L("Cash", "Tunai"), body: L("Bring some cash.", "Bawa uang tunai.") },
      ],
      emergency: [
        { label: L("General emergency", "Darurat umum"), number: "112" },
        { label: L("Ambulance", "Ambulans"), number: "119" },
      ],
      epilogue: { title: L("Until next time.", "Sampai jumpa."), body: L("Thank you for coming.", "Terima kasih sudah datang.") },
      days: [
        { n: 0, date: "2027-04-07", title: L("Arrival", "Kedatangan"), subtitle: L("Hello, city.", "Halo, kota."), stops: [{ id: "arrive", start: "18:00", end: "19:00", phase: "dusk", title: L("Check in", "Check-in"), why: L("Rest first.", "Istirahat dulu.") }] },
        {
          n: 1,
          date: "2027-04-08",
          title: L("The royal day", "Hari keraton"),
          subtitle: L("Slow and grand", "Pelan dan agung"),
          dressCode: L("Covered shoulders today.", "Bahu tertutup hari ini."),
          sunrise: "05:35",
          sunset: "17:40",
          stops: [
            { id: "walk", start: "08:00", end: "09:30", phase: "day", title: L("Morning walk", "Jalan pagi"), why: L("Cool air before the heat.", "Udara sejuk sebelum panas."), maps: maps("Test Palace"), private: { pickup: "07:45 · lobby" } },
            { id: "market", start: "10:30", end: "11:30", phase: "day", title: L("Cloth market", "Pasar kain"), why: L("Bargain with a smile.", "Tawar dengan senyum."), maps: maps("Test Market"), food: food("high"), planB: L("If it rains: the covered hall.", "Kalau hujan: aula beratap.") },
            { id: "lunch", start: "11:30", end: "12:30", phase: "day", title: L("Spicy lunch", "Makan siang pedas"), why: L("Savoury and fiery.", "Gurih dan pedas."), food: food("low"), ...(role === "team" ? { teamNote: "Pesan meja", estCost: 75000 } : {}) },
          ],
        },
        { n: 2, date: "2027-04-09", title: L("Mist day", "Hari kabut"), subtitle: L("Up early.", "Bangun pagi."), stops: [{ id: "dawn-ride", start: "04:00", end: "05:00", phase: "dawn", title: L("Dawn ride", "Berangkat subuh"), why: L("Meet the sunrise.", "Menyambut matahari."), private: { pickup: "03:50 · gate" } }] },
      ],
    },
    private: {
      party: { name: "Mira Santoso", short: "Mira", size: 1, greeting: L("Welcome, Mira. This lakon was written for you.", "Selamat datang, Mira.") },
      lodging: { name: "Test House", address: "Jl. Uji No. 1", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Test%20House" },
      contacts: [
        { label: L("Host", "Host"), whatsapp: "0800 0000 0001" },
        { label: L("Guide", "Guide"), phone: "+62 800 0000 0002" },
      ],
    },
    ...(role === "team" ? { team: { medical: "Catatan medis uji.", preferences: "Pedas sedang." } } : {}),
  };
}

/** Instan dari jam dinding WIB. */
export const wib = (iso: string) => new Date(`${iso}+07:00`);

/**
 * Data film tiruan (sengaja fiktif): prolog, kedatangan, dua bab hari, kepulangan.
 * Hari 1 punya stop yang dilebur (transfer & istirahat) supaya aturan gallery ikut teruji, dan jam terbit/terbenam
 * supaya langitnya mengikuti jam; Hari 2 tanpa jam terbit/terbenam (langit memakai fase stop).
 */
export function filmFixture(role: "guest" | "team" = "guest", opts: { breakfast?: boolean } = {}) {
  const maps = (q: string) => ({ query: q, url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` });
  const stop = (id: string, start: string, end: string, phase: string, kind: string, en: string, idn: string, extra: Record<string, unknown> = {}) => ({
    id,
    start,
    end,
    phase,
    kind,
    panel: "type",
    title: L(en, idn),
    story: L(`The story of ${en}.`, `Cerita tentang ${idn}.`),
    why: L(`Why ${en} is worth it.`, `Kenapa ${idn} layak.`),
    ...extra,
  });
  return {
    role,
    trip: {
      title: L("A Three-Day Lakon", "Lakon Tiga Hari"),
      city: "Test City",
      route: { label: L("Isle → Capital → City", "Pulau → Ibu kota → Kota"), legs: ["AAA", "BBB", "CCC"] },
      prologue: {
        kicker: L("Prologue", "Prolog"),
        headline: L("A city of tests and fixtures.", "Kota penuh uji dan contoh."),
        intro: L("For two days the city is yours.", "Selama dua hari kota ini milikmu."),
        facts: [
          { id: "old", title: L("An old city", "Kota tua"), body: L("It began long ago.", "Berdiri sejak lama.") },
          { id: "river", title: L("A long river", "Sungai panjang"), body: L("It runs to the sea.", "Mengalir ke laut.") },
        ],
        phrases: [
          { jv: "Matur nuwun", en: "Thank you", id: "Terima kasih" },
          { jv: "Nyuwun sewu", en: "Excuse me", id: "Permisi" },
        ],
      },
      epilogue: { title: L("Until next time.", "Sampai jumpa."), body: L("Thank you for coming.", "Terima kasih sudah datang.") },
      days: [
        { n: 0, date: "2027-04-07", kind: "arrival", slug: "arrival", theme: "travel", title: L("Arrival", "Kedatangan"), subtitle: L("Hello, city.", "Halo, kota."), stops: [stop("land", "17:00", "18:00", "dusk", "transfer", "Landing", "Mendarat")] },
        {
          n: 1,
          date: "2027-04-08",
          kind: "chapter",
          slug: "day-1",
          theme: "royal",
          title: L("The royal day", "Hari keraton"),
          subtitle: L("Slow and grand.", "Pelan dan agung."),
          dressCode: L("Covered shoulders today.", "Bahu tertutup hari ini."),
          sunrise: "05:35",
          sunset: "17:40",
          stops: [
            // sarapan (opsional): dengan ini matahari di gallery baru muncul di jadwal sesudahnya
            ...(opts.breakfast ? [stop("breakfast", "06:30", "06:55", "dawn", "food", "Breakfast", "Sarapan")] : []),
            stop("drive", "07:00", "07:30", "dawn", "transfer", "Morning drive", "Berangkat pagi"),
            stop("walk", "08:00", "09:30", "day", "sight", "Morning walk", "Jalan pagi", { maps: maps("Test Palace"), dressCode: L("Covered knees.", "Lutut tertutup."), tips: L("Go early.", "Datang pagi."), ...(role === "team" ? { teamNote: "Bawa payung", estCost: 50000 } : {}) }),
            stop("market", "10:30", "11:30", "day", "market", "Cloth market", "Pasar kain", { maps: maps("Test Market"), planB: L("If it rains: the covered hall.", "Kalau hujan: aula beratap.") }),
            stop("nap", "13:00", "14:00", "day", "rest", "Afternoon rest", "Istirahat siang"),
            stop("lake", "17:00", "18:00", "dusk", "nature", "Lake at sunset", "Danau saat senja"),
            stop("supper", "19:00", "20:00", "night", "food", "Late supper", "Makan malam", { food: { halal: true, alcohol: false, sweet: "low", banana: false } }),
          ],
        },
        {
          n: 2,
          date: "2027-04-09",
          kind: "chapter",
          slug: "day-2",
          theme: "lawu",
          title: L("The mist day", "Hari kabut"),
          subtitle: L("Up early.", "Bangun pagi."),
          stops: [stop("tea", "05:00", "06:30", "dawn", "nature", "Tea hills", "Kebun teh"), stop("temple", "08:00", "09:30", "day", "sight", "Hill temple", "Candi bukit")],
        },
        { n: 3, date: "2027-04-10", kind: "departure", slug: "departure", theme: "travel", title: L("Departure", "Kepulangan"), subtitle: L("Goodbye, city.", "Sampai jumpa, kota."), stops: [stop("fly", "09:00", "10:00", "day", "transfer", "To the airport", "Ke bandara")] },
      ],
    },
    manifest: [],
    private: {
      party: { name: "Mira Santoso", short: "Mira", size: 1, greeting: L("Welcome, Mira. This lakon was written for you.", "Selamat datang, Mira.") },
      contacts: [{ label: L("Host", "Host"), whatsapp: "0800 0000 0001" }],
    },
    ...(role === "team" ? { team: {} } : {}),
  };
}
