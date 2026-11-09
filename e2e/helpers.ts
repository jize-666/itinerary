import type { Page, Route } from "@playwright/test";

export const VERIFY = "**/functions/v1/verify-access";
export const TRIP = "**/functions/v1/trip-data";
export const FUTURE = 4_102_444_800; // 2100-01-01

/** Sesi palsu di perangkat (klien tidak memverifikasi token; server yang memverifikasi, dan di e2e server di-mock). */
export async function seedSession(page: Page, role: "guest" | "team" = "guest") {
  await page.addInitScript(
    ([k, v]) => {
      if (!sessionStorage.getItem("e2e-seeded")) {
        localStorage.setItem(k, v);
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
