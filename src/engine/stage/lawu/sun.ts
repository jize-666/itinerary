import { clamp, EAST, type Ground, mix, NORTH, SITE, type Site } from "./ground";
const RAD = Math.PI / 180;
const dayStart = Date.UTC(2027, 3, 8, 17); // April 9, 00:00 WIB
const sin = (a: number) => Math.sin(a * RAD);
const cos = (a: number) => Math.cos(a * RAD);
const tan = (a: number) => Math.tan(a * RAD);
// NOAA / Meeus solar coordinates. Azimuth clockwise from true north, geometric altitude.
export function solar(minutes: number, [lat, lon]: Site = SITE.tea) {
  const jd = (dayStart + minutes * 60000) / 86400000 + 2440587.5;
  const t = (jd - 2451545) / 36525;
  const l = (280.46646 + t * (36000.76983 + 0.0003032 * t)) % 360;
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const c =
    sin(m) * (1.914602 - t * (0.004817 + 0.000014 * t)) + sin(2 * m) * (0.019993 - 0.000101 * t) + sin(3 * m) * 0.000289;
  const omega = 125.04 - 1934.136 * t;
  const lambda = l + c - 0.00569 - 0.00478 * sin(omega);
  const eps = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60 + 0.00256 * cos(omega);
  const dec = Math.asin(sin(eps) * sin(lambda)) / RAD;
  const y = tan(eps / 2) ** 2;
  const eq =
    (4 / RAD) *
    (y * sin(2 * l) -
      2 * e * sin(m) +
      4 * e * y * sin(m) * cos(2 * l) -
      0.5 * y * y * sin(4 * l) -
      1.25 * e * e * sin(2 * m));
  const h = ((minutes + eq + 4 * lon - 420 + 1440) % 1440) / 4 - 180;
  const altitude = Math.asin(clamp(sin(lat) * sin(dec) + cos(lat) * cos(dec) * cos(h), -1, 1)) / RAD;
  const azimuth = (Math.atan2(sin(h), cos(h) * sin(lat) - tan(dec) * cos(lat)) / RAD + 540) % 360;
  return { altitude, azimuth };
}
// NOAA's piecewise mean atmospheric correction, in degrees; sunrise uses the upper solar limb.
export function refraction(h: number) {
  if (h > 85) return 0;
  if (h > 5) return (58.1 / tan(h) - 0.07 / tan(h) ** 3 + 0.000086 / tan(h) ** 5) / 3600;
  if (h > -0.575) return (1735 + h * (-518.2 + h * (103.4 + h * (-12.79 + h * 0.711)))) / 3600;
  return -0.576 / tan(h) / 3600;
}
export function horizon(g: Ground, azimuth: number, site: Site = SITE.tea) {
  const [lat, lon] = site,
    base = g.metres(lat, lon) + 1.65;
  const [n, w, s, e] = g.bounds;
  let angle = -3;
  for (let distance = 30; distance <= 27000; distance += 30) {
    const a = lat + (distance * cos(azimuth)) / NORTH,
      b = lon + (distance * sin(azimuth)) / EAST;
    if (a > n || a < s || b < w || b > e) break;
    // Effective Earth radius 7/6 R for terrestrial refraction.
    const dz = g.metres(a, b) - base - (distance * distance) / ((2 * 6371000 * 7) / 6);
    angle = Math.max(angle, Math.atan2(dz, distance) / RAD);
  }
  return angle;
}
export function makeHorizon(g: Ground) {
  const h = Array.from({ length: 121 }, (_, i) => horizon(g, 50 + i * 0.5));
  return (az: number) => {
    const u = clamp((az - 50) * 2, 0, h.length - 1),
      i = Math.min(h.length - 2, Math.floor(u));
    return mix(h[i]!, h[i + 1]!, u - i);
  };
}
export function firstLight(profile: (az: number) => number) {
  let a = 310,
    b = 480;
  for (let i = 0; i < 24; i++) {
    const mid = (a + b) / 2,
      s = solar(mid);
    if (s.altitude + refraction(s.altitude) + 0.2666 < profile(s.azimuth)) a = mid;
    else b = mid;
  }
  return (a + b) / 2;
}
