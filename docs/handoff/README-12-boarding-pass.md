# README Tugas 12 (Codex): tiket 3D bertali

> Diserahkan Codex 26 Nov 2026 (`pass3d.zip`), disalin apa adanya di bawah. Cara Claude memasangnya di film: `docs/design/decisions.md` bagian "Tiket 3D bertali di slide tiket". Sandbox (`sandbox/`, `dist/`) dan konfigurasi proyek Codex tidak dimasukkan ke repo; `engine/` → `src/engine/pass3d/`, `render/` + `interaction/` → `src/components/film/stage3d/pass3d/`, `tests/physics.test.ts` → `tests/unit/pass3d-physics.test.ts`.

---


Task 12 part 1 for **A Three-Day Lakon**. The ticket is a real-scale three.js object with a deterministic TypeScript rig, input controller, runtime print, and a standalone night pendapa. The front is indigo card stock with cream ink and raised gilt. The reverse carries a kawung field, the guest’s monogram, and a bilingual caption around *Matur nuwun*.

## Run the sandbox

The ZIP includes a built sandbox in `dist/`. Serve that folder over HTTP with any static server. The example uses Python and requires no frontend install.

```sh
cd pass3d
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open `http://127.0.0.1:4173/?name=Jize`. To develop or regenerate the build, use Node 20.19+ or 22.12+ and the supplied lockfile.

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run lint
npm run build
npm run preview
```

| Query option | Behaviour |
| --- | --- |
| `name=Jize` | Runtime host sample printed on the ticket. An empty input uses `Jize`. |
| `lang=en` or `lang=id` | English or Indonesian. The buttons repaint both faces and update the controls without remounting the current ticket. |
| `quality=high`, `medium`, or `low` | Print resolution, cord tessellation, foil relief, device pixel ratio, MSAA cap, and bloom resolution. |
| `debug` | Cord particles, active grab point, gravity vector, physics milliseconds per frame and step, render counts, and the 20-cycle memory audit. |
| `demo` | A fixed-step 15.6-second sequence with descent, settle, pull, release, spin, both faces, tilt, and breeze. |

Drag the card or the cord. A quick tap on the card turns it over. Enter or Space also works when the stage has focus. An off-centre horizontal flick imparts a twist. Use **Enable tilt** to calibrate against the phone’s current pose. Test a phone over HTTPS so the browser can expose motion sensors. The sandbox reads the URL for demonstration only. Give the film’s module guest data through `PassContent` in memory.

Under `?debug`, use **Mount / unmount ×20** for the memory audit. It creates a rig in an isolated 56 × 56 target, renders it to allocate its resources, disposes it, and checks the counts on every cycle. The live ticket stays mounted while the audit runs. Each temporary rig adds five geometries and two textures. Geometry, texture, and program counts return to the starting values when the temporary rig and audit target are disposed.

## Host API

Copy `engine/` and `render/` to `src/engine/pass3d/` and `src/components/film/stage3d/pass3d/` respectively. Put `interaction/` by the host’s gesture code and repoint the relative `../engine` and `../render` imports across those boundaries. Each folder exposes a barrel. The sandbox is a working example of all three.

```ts
import { createPassPhysics } from './engine';
import { createPassVisual } from './render';
import { createPassInput } from './interaction';

const physics = createPassPhysics({ onEvent: event => handlePassEvent(event) });
const pass = await createPassVisual({
  content,
  quality: 'high',
  lighting: stageUniforms,
  canvases: [document.createElement('canvas'), document.createElement('canvas')],
  fonts: document.fonts,
});
const input = createPassInput({ engine: physics, visual: pass });
mount.add(pass.object);

function updatePass(dtSeconds: number, timeSeconds: number) {
  pass.update(physics.step(dtSeconds), timeSeconds);
}

await pass.setContent(translatedContent);
// On teardown, release any captured pointer and then dispose.
pass.dispose();
```

| Surface | Contract |
| --- | --- |
| `createPassPhysics(config?)` | Pure TypeScript. `step(dt)` returns the live `PassState`. `grab`, `moveGrab`, and `release` take hook-local points and optional release velocity in m/s. A handle is either a card-local point or a segment plus an interpolation fraction. |
| `addImpulse` and `flick` | Apply momentum in N·s per unit card mass. Application points are card-local. `flick` defaults to a lower off-centre point. |
| `flip`, `unflip`, and `setFlip(back)` | Choose the latched face. `state.back` follows the visible orientation. `state.status` is `ready`, `dragging`, `swinging`, `resting`, or `flipped` once the back has settled. `state.twist` is the unwrapped yaw in radians. |
| `setTilt` and `setWind` | Set normalized right and depth inputs or peak gust acceleration in m/s². `input.applyTilt` projects camera-relative inputs into the hook’s local XZ plane. |
| `snapshot`, `restore`, `settle`, and `reset` | Snapshots are copyable and JSON-serializable for the same configuration. `settle` places the card at rest in the current gravity with the requested face. `reset` restores the front pose and clears tilt, wind, and the clock. |
| `state` | Borrowed typed arrays give the cord points, centre of mass, quaternion in XYZW order, velocities, gravity, and grab point. Copy what needs to live beyond the current update. Energy is the card’s kinetic and relative potential energy per unit mass. |
| `onEvent` | Synchronous `grab`, `release`, `flip`, `eyelet-knock`, `swing-speed`, and `rest`. Swing samples are limited to about 13 Hz. `eyelet-knock.strength` ranges from 0 to 1 and follows a rapid gain in tension. |
| `createPassVisual` | Awaits `document.fonts.load` on caller-supplied fonts and paints two dedicated 2D canvases. The caller supplies the stage canvas, renderer, lighting, event listeners, and frame loop. |
| `update` and `pick` | Update from the current hook-local state and then pick with a Three `Ray` in world space. The result contains a card or cord handle, the hook-local contact, and a world distance. Parent translation, rotation, and uniform scale are supported. |
| `setContent` and `dispose` | Repaint both faces after font load. Concurrent repaints use the most recent content. `dispose` detaches the root, frees GPU resources, shrinks the two print canvases to 1 × 1, and prevents pending paints from completing. |
| `createPassInput` | `pointerDown`, `pointerMove`, `pointerUp`, `pointerCancel`, and `keyDown` return whether the ticket took the input. The caller owns capture and should give unclaimed pointer downs to the film. |

`PassPointer` takes a pointer ID, NDC `x` and `y`, monotonic seconds, and viewport dimensions in CSS pixels. The controller pins the selected material point to a camera-facing plane at pickup depth. A tap moves at most 7 CSS px and lasts at most 340 ms. A fast horizontal release at the edge adds a bounded depth impulse to translate a hand twist to a screen gesture.

`PassContent` holds the name, optional initials, three route stops, date, seat, gate, ticket number, and every label printed on the ticket. The supplied sample keeps *Kulonuwun* and *Matur nuwun* in Javanese in both languages. The name is Unicode-normalized, folded to one line, measured in the actual loaded Fraunces face, and sized against both the advance width and the italic ink bounds. The decorative barcode has a fixed pattern independent of the content.

### Scale and stage lighting

The hook is at `(0, 0, 0)`, with Y up and metres throughout. The paperboard measures **74 × 150 × 1.2 mm**. The punched hole is 8.4 mm across and its centre is 11.5 mm below the top. The cord is roughly 1.4 mm across and has 106 mm of simulated length. The bottom of the card rests approximately 247 mm below the hook.

The materials write linear HDR into the host’s render target. They carry `uTime`, `uKeyDir`, `uKeyColor`, `uAmbSky`, `uAmbGround`, `uLampPos`, `uLampColor`, `uFogColor`, `uFogDensity`, `uNight`, `uFlash`, `uSky[5]`, `uSunDir`, and `uSunColor`. The supplied `IUniform` objects are shared by reference. The host owns the value of any shared `uTime`. Light, position and fog inputs use world-space directions or scene units with linear colours. Stage shaders with their own reflections can supply a `skyGLSL` string defining `vec3 skyColor(vec3 dir)` along with `extraUniforms`. `render/lighting.ts` isolates the reflection, lamp, and haze math. The sandbox composites glow and ACES in its final pass. [Three.js ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html) · [Three.js OutputPass](https://threejs.org/docs/pages/OutputPass.html)

### Rig and print construction

A rigid rectangular body uses a centre-of-mass position, quaternion and rectangular inertia tensor. Sixteen equal cord spans use distance projection. The hook is immovable and the final cord point is bound to the rigid eyelet. Angular corrections from the eyelet use inverse inertia. Long-range tension tethers pass the card’s weight through the cord before adjacent spans distribute it. A compliant grab can pin a point on the rigid body or interpolate between adjacent cord particles. The solver applies yaw torsion to the unwrapped heading, so a fast throw can turn more than once and wind back. The torsion equilibrium moves to the requested side on an explicit flip.

| Parameter | Default |
| --- | --- |
| Fixed physics and catch-up | 240 Hz, at most eight steps per frame, with excess wall time dropped. |
| Cord | 16 spans, 0.106 m total, bead mass 0.055 relative to the card. |
| Projection | 10 iterations per step with alternating span order. |
| Gravity | 9.81 m/s², tilt limited to 12° across both axes. |
| Exponential damping | 1.8 s⁻¹ translation, 2.7 s⁻¹ rotation, 4.1 s⁻¹ cord, and 2.9 s⁻¹ additional yaw damping. |
| Twist and grip | 15 s⁻² torsion coefficient, grip compliance `8e-7`, target approach capped at 1.75 m/s. |
| Rest criterion | Linear speed below 9 mm/s, angular speed below 0.13 rad/s, and yaw within 0.09 rad of the latch for 320 ms. |

The front uses a faint kawung underprint and larger route codes for a phone-size shot. The reverse uses the same four-petal geometry in foil and gives the monogram a clear, solid surround. Two runtime canvas textures carry separate cream, foil, and muted-ink channels. Foil relief perturbs the surface normal at the printed edges on High and Medium. The physical gilt edge follows the rounded corners and tear notches. The eyelet is turned brass geometry. Two resampled helical tubes form the cord, tightening into a short wrapped section and splitting around the eyelet. The sandbox sets a bronze gong against lacquer pillars and warm lantern silk, with an angled view that exposes the card’s thickness during pickup and turns.

## Validation and budgets

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

The engine suite checks deterministic state and events, a JSON snapshot round trip, 30/60/120 FPS deltas and a 0.5-second pause, aggressive inputs, card and cord drag, a 60° release, constant-magnitude tilt, the latch on both faces, spin and recovery, eyelet knock, and reset. The tested flick stays within 8.5% span deviation during the transient, which is less than 0.57 mm on a 6.625 mm nominal span. The 60° release reaches the rest criterion within seven seconds with wind disabled.

With `npm run dev`, open `/tests/name-fit.browser.html` to run five real-canvas checks using the bundled font, including one letter, forty letters, forty wide letters, combining diacritics, and whitespace. The test inspects painted ink at 2×. No personal data is used in the fixture.

### Measured sandbox performance

Chromium 158 with SwiftShader software rendering, with at least 70 warmed frames sampled per tier. Physics and frame figures are median / p95 in milliseconds. Draw and triangle counts are the ticket’s own cost, measured by rendering the same stage with and without the rig. Frame times include the standalone set, bloom, and the headless browser’s rendering and scheduling overhead. The desktop viewport was 1440 × 900 at DPR 1 and the mobile viewport was 405 × 720 at the tier’s DPR cap.

| Tier | Face size | Ticket draws | Ticket triangles | Desktop physics ms | Desktop frame ms | 9:16 physics ms | 9:16 frame ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| High | 1152 × 2335 | 5 | 6360 | 0.10 / 0.20 | 200.0 / 366.5 | 0.10 / 0.20 | 183.3 / 249.9 |
| Medium | 864 × 1751 | 5 | 4504 | 0.10 / 0.20 | 83.3 / 200.1 | 0.10 / 0.20 | 50.0 / 216.6 |
| Low | 640 × 1297 | 5 | 2544 | 0.10 / 0.20 | 66.7 / 83.4 | 0.10 / 0.20 | 16.7 / 50.1 |

The 9:16 run used DPR 2 and 4× MSAA on High. SwiftShader offered 4× as its only non-zero sample count for the HDR framebuffer, which put Medium at 0× for that run. The complete set and ticket used 46 draw calls on desktop and 32 in 9:16, followed by four post draws. The 20-cycle desktop audit returned from 35 geometries, 5 textures, and 17 programs to the same counts. Browser checks covered the two faces, EN and ID, pointer and keyboard use, touch tap, determinism of demo seeking, simulated tilt, and the strict same-origin build. The 55+ FPS target on a physical iPhone remains unverified.

The production bundle enforces a same-origin CSP. All runtime assets are local. The film already supplies `three` and the self-hosted font families. The size below separates the portable module from the sandbox’s copy of Three.

| Runtime item | Version and licence | Production size |
| --- | --- | --- |
| Engine, render, interaction | This delivery | About 14.3 kB gzip |
| Three for the standalone sandbox | `0.187.0`, MIT | About 138.0 kB gzip |
| Fraunces italic variable subsets | `5.3.0`, SIL OFL 1.1 | 99.1 kB WOFF2, 99.2 kB with gzip |
| Manrope variable subsets | `5.3.0`, SIL OFL 1.1 | 75.0 kB WOFF2, 75.1 kB with gzip |
| Sandbox scene, UI and post | This delivery | About 14.6 kB gzip including CSS |

The font files total **174,104 bytes**. The geometry, print maps, paper fibres and foil are procedural. Third-party notices live in `assets/licenses/` and are copied into the built preview. Build and test dependencies are development-only and are locked in `package-lock.json`.

### Limits and film handoff

- The delivered sandbox requires WebGL 2. On devices without float render-target support it uses an 8-bit target and the bloom is less pronounced. The renderer selects a supported MSAA sample count at or below the tier limit.
- The card stays rigid. Cord contact is modelled at the eyelet attachment. The physics cost is shared across the tiers. Performance on a physical iPhone and the film’s complete stage should be measured together before choosing the default tier. The sandbox can test touch framing, simulated motion events, and the production CSP independently.
- Place the hook, then frame the settled card about 0.17 m below it. The sandbox uses a 40° vertical field of view and a camera about 0.35–0.40 m from the card. Reserve part of the lower phone frame for the film controls and keep Clawd clear of the swipe and grab area.
- Let the slide animate the hook group through the descent, then hand off to the existing stage update. Consider a quiet brass transient on `eyelet-knock` and a brief Clawd reaction when the guest first grabs the ticket or reaches the back. A resting event can cue the next film beat.
