// Rebuild the shared sky/camera sunrise anchor after changing the DEM or the viewpoint.
import { readFileSync, writeFileSync } from "node:fs";
import { geo, readGround, SITE, world } from "../../src/engine/stage/lawu/ground";
import { firstLight, horizon, makeHorizon } from "../../src/engine/stage/lawu/sun";
const raw = readFileSync("public/stage/lawu/relief.bin");
const ground = readGround(Uint8Array.from(raw).buffer);
const profile = makeHorizon(ground);
const first = firstLight(profile);
const silhouette = Array.from({ length: 81 }, (_, i) => Math.round(profile(55 + i * 0.65) * 100) / 100);
// Local skyline varies from row to row. Bake three dawn azimuths into RGB, in eighths of a degree.
const size = 17,
  halfWidth = 23,
  center = world(SITE.tea),
  horizons: number[] = [];
for (let j = 0; j < size; j++)
  for (let i = 0; i < size; i++) {
    const place = geo(center.x + ((2 * i) / (size - 1) - 1) * halfWidth, center.z + ((2 * j) / (size - 1) - 1) * halfWidth);
    for (const az of [79, 81.5, 84]) horizons.push(Math.max(0, Math.min(255, Math.round(8 * horizon(ground, az, place)))));
  }
writeFileSync("src/engine/stage/lawu/morning.json", JSON.stringify({ firstMinute: +first.toFixed(3), silhouette }) + "\n");
writeFileSync("src/components/film/stage3d/lawu/tea-skyline.json", JSON.stringify({ size, halfWidth, horizons }) + "\n");
