# Codex prompt · Task 12 (part 1 of 2): "Admit one", a 3D boarding pass with physics

25 November 2026 · written by Claude for the host · paste everything below the line into Codex, together with the reference images `ref-01` to `ref-07`.
This prompt replaces the delivery format in `codex-prd-12-boarding-pass-3d.md` and `codex-prd-bersama.md` §4 (Codex has no repo access, and the task is split in two). Their goals and acceptance tests still apply.

---

## The project, in short

"A Three-Day Lakon" is a private trip film made by one host for one guest: a scroll-driven web film of a three-day trip to Solo (Central Java), 7–11 April 2027. It is built in Javanese shadow-puppet theatre language: a night *pendapa* (open pavilion) with red-lacquer pillars banded in gold, a *blencong* oil lamp, a great bronze gong, a *gunungan*, paper lanterns drifting on the Bengawan Solo river, deep indigo night skies, gold accents. An orange blocky mascot, Clawd, guides the guest through the film.

The ticket is the only object in the film that belongs to the guest. Their name is printed on it. You are building it as a real, physical 3D object: a hanging paper tag on a gold thread that the guest can grab, pull, swing, flick, spin and flip, which also reacts to phone tilt and a light breeze, with gold foil that catches the light.

In the film it appears on the `pass` slide, near the end (after the epilogue, before the credits), inside an existing three.js stage. **You do not have access to the repository.** You build the ticket as a standalone, self-contained module with its own sandbox page. Claude, who works inside the repository, wires it into the film afterwards.

## Who does what

Task 12 is long, so it is split in two halves.

| Your half (part 1) | Claude's half (part 2, after your delivery) |
| --- | --- |
| The physics: thread + card, written by you in TypeScript, with unit tests | Mounting it in the film's stage: one shared WebGL context, its render loop, its HDR post chain and quality tiers |
| The ticket as a 3D object: shape, thickness, gilded edge, brass eyelet, thread and knot, paper, foil, emboss, front and back | The `pass` slide camera shot and the host's camera rules (parallax, perspective shift, scroll-driven depth) |
| Front and back faces painted at runtime from data, with the guest name fitted to one line | Gesture arbitration with the film's swipe, real data from the private backend, accessibility, the DOM fallback |
| The interaction: grab, drag, release, flick, spin, flip, tilt, wind | Clawd's reactions and voice, sound in the film, the epilogue appearance, a CSS 2.5D version |
| A sandbox page that shows all of it in a night-pendapa mock scene | End-to-end tests, preview videos, docs and the pull request |

If you finish your half with time to spare, go further: anything from the right-hand column that can be built standalone (a descent choreography, procedural sound, a bending card, a lantern light) is welcome as an optional extra in the sandbox, as long as the core stays clean.

## You have creative and technical freedom

- **Tools.** Blender, three.js, procedural geometry, hand-written shaders, anything. If you model in Blender, export glTF/GLB and also send the `.blend`.
- **Design.** The reference images show a direction the host likes: a nila (indigo) luggage tag with raised gold foil, a gilded edge, a brass eyelet and a twisted gold cord. They are references for mood, light and pose, not a spec. Improve the card, the material, the thread and the moments around it wherever you can, and explain your choices.
- **Physics.** Choose the method: Verlet, XPBD, a proper rigid body with inertia, a card that bends a little, a thread that winds up and unwinds when spun. A Verlet prototype the host has already tried used: 18 thread segments, g = −9.81, fixed step 1/240 s, damping 0.993 (thread) and 0.9965 (card), 14 constraint iterations, the card as 4 points with 6 distance constraints. Beat it if you can.
- **Feel.** It should feel like heavy card stock on silk cord in your hand: weight, a little drag in the air, a clean settle. Pick the parameters that feel best and document them.
- **Disagree with this prompt** where you see a better way. Use it and say why in the README.

## Hard limits (the only fixed things)

1. **Stack.** TypeScript strict. `three` **0.187.0** (no drei, no post-processing libraries, no physics libraries inside the module). The film uses React Three Fiber only to mount a canvas and runs its own loop, so your module must be **plain three.js**, not React components.
2. **Content Security Policy.** No WebAssembly, no `eval`, no `new Function`, no external origins. So: no Rapier/Ammo, no Draco or meshopt WASM decoders, no KTX2/Basis. Every font, texture and model is either in your delivery or generated in code. Web Workers from your own files or `blob:` are fine.
3. **One WebGL context.** The module must **not** create its own renderer, canvas, `requestAnimationFrame` loop or global event listeners. The host app owns those and calls you. The sandbox may create them, of course.
4. **Pure, deterministic physics.** The physics core imports nothing from three.js or the DOM (plain numbers or typed arrays). Fixed time step with sub-steps and a per-frame cap. Same inputs in the same order produce the same state. No NaN or explosion at low fps, when a tab comes back from the background (huge `dt`), or with very fast drags.
5. **Privacy.** The guest's name only ever arrives at runtime as data. It must never appear in code, assets, file names, tests or logs. Previews use the host's own name, **"Jize"** (for example `?name=Jize`); tests use made-up names.
6. **Bilingual.** Every visible string (labels, "Admit one", "Matur nuwun" caption, etc.) is passed in as data, so the film can supply English or Indonesian. "Kulonuwun" stays Javanese in both.
7. **Budgets** (the film must hold 55+ fps on the host's recent iPhone at the High tier: DPR 2, MSAA 4×):

   | Item | Budget |
   | --- | --- |
   | Physics CPU | ≤ 1 ms per frame on an iPhone, sub-steps included |
   | Extra draw calls | about ≤ 8 |
   | Assets | ≤ 1 MB total (prefer procedural paper and foil) |
   | Code | about ≤ 60 KB gzip for engine + render + interaction |
   | Text | the name stays crisp at DPR 2 when the card is close to the camera |
   | Memory | `dispose()` frees every geometry, material, texture and render target |

## What Claude needs to plug it in (you design the exact API)

Keep these seams; the names and shapes are yours.

1. **Engine (pure TS).** Create from a config; `step(dt)` with internal fixed sub-steps. Inputs: grab at a point on the card or thread, move the grab target, release (with velocity), flick or impulse, flip and unflip, gravity tilt (a small camera-relative tilt from the phone), wind. Outputs: thread points, card position and orientation, velocities or energy, and a status (`ready`, `dragging`, `swinging`, `resting`, `flipped`). Snapshot and restore for tests, and a settle/reset.
2. **Events.** Emit events or callbacks (grab, release, flip, eyelet knock, swing speed, came to rest) so sound and the mascot can react later.
3. **Render (three.js).** A factory that takes the content and a quality level (`high`, `medium`, `low`) and returns an `Object3D` plus `update(state, time)`, a raycast or pick helper that tells the caller whether a ray hit the card or the thread, and `dispose()`.
4. **Lighting seam.** The film's stage renders in **linear HDR**; tone mapping (ACES), bloom, colour grading and sRGB happen at the end of its own post chain. So: no tone mapping or sRGB conversion inside your materials, and foil highlights may go above 1.0 so bloom catches them. Every stage material shares these uniforms: `uTime`, `uKeyDir`, `uKeyColor`, `uAmbSky`, `uAmbGround`, `uLampPos`, `uLampColor` (a warm point lamp), `uFogColor`, `uFogDensity`, `uNight`, `uFlash` (gong flash), a few more for the sky and sun (`uSky[5]`, `uSunDir`, ...), and a function `vec3 skyColor(vec3 dir)` for reflections. The easiest port is a `ShaderMaterial` (or `onBeforeCompile`) that reads those names, with the lighting in one isolated chunk. If you prefer `MeshPhysicalMaterial`, that is fine; say so and Claude will port it.
5. **Interaction controller.** Takes pointer input from the caller (normalised coordinates plus the camera) and keyboard (Enter/Space to flip). It returns whether it took the input. A press on the card or thread is physics; a press anywhere else must be left for the film's own swipe. Decide the tap-versus-drag threshold.
6. **Content.** Something like `{ name, initials?, route: [{ code, city, detail }], dateLabel, seat, gate, ticketNo, labels: { kicker, admit, passenger, date, seat, gate, ticket, hostedBy, host, thanks, ... }, lang }`. Change it as you see fit, but every string comes from outside. Wait for the fonts (`document.fonts.load`) before painting, and repaint when the language changes.
7. **Name on one line.** Shrink to fit: 1 letter, 40 letters and names with diacritics all fit and stay legible.
8. **Units.** Metres, Y up, a fixed pivot (the hook) at a known origin. The reference card is 74 × 150 mm (real size); the film's pavilion is metres across, so Claude will place and frame it. Document the scale you chose.
9. **Fonts.** The site uses self-hosted variable fonts from npm: `@fontsource-variable/fraunces` (italic for the title, the name, the gate and "Matur nuwun") and `@fontsource-variable/manrope` (600–800 for labels and codes).

Card content in the references: "Boarding pass", "Admit one", the title "A Three-Day Lakon", "Passenger" + the name, the route TJQ (Tanjung Pandan, Belitung) → CGK (Jakarta, transit) → SOC (Solo), date 7 April 2027, seat "With the host", gate "Kulonuwun", ticket 1 of 1, a foil barcode, "Hosted by". Back: kawung (a classic Javanese four-petal batik motif) in foil, the guest's initial as a monogram, "Matur nuwun" (Javanese for "thank you"). Treat these as sample data.

## Reference images (three.js renders by Claude, not production)

| File | What it shows |
| --- | --- |
| `ref-01-hero.jpg` | Front, at rest in front of the camera; out-of-focus pendapa pillar, gong and paper lantern behind |
| `ref-02-macro.jpg` | Close-up: brass eyelet, cord loop through the hole with a short whipping, raised foil, gilded edge |
| `ref-03-back.jpg` | Back after a flip: kawung foil field, monogram medallion, "Matur nuwun" |
| `ref-04-motion.jpg` | Motion study: grab and drag, release and swing, flick and spin, tilted gravity, breeze |
| `ref-05-phone.jpg` | Phone (9:16) framing, with the zones for the film UI and for Clawd, who must never cover the ticket |
| `ref-06-storyboard.jpg` | Six beats: descend (scroll-driven), settle, grab and pull, flick and spin, back, parallax |
| `ref-07-spec.jpg` | Flat front and back faces, dimensions, palette, type and the content rules |

## What to deliver

A ZIP (or a link to a git repository) with this shape. The folder names map to where Claude will put them, but the inner structure is yours.

```
pass3d/
  engine/        pure TS physics + types            → src/engine/pass3d/
  render/        three.js object, materials, faces  → src/components/film/stage3d/pass3d/
  interaction/   input controller
  assets/        optional GLB / textures (≤ 1 MB, no Draco, no KTX2) and the .blend if any
  sandbox/       standalone page (Vite is fine)
  tests/         Vitest
  README.md
```

The sandbox should have:

- a night-pendapa mock scene close to the references (indigo sky, warm lantern, pillars), with a simple stand-in for the film's post (bloom + ACES);
- URL options: `?name=`, `?lang=en|id`, `?quality=high|medium|low`, `?debug` (physics overlay: thread points, grab point, gravity vector, ms per step), `?demo` (a deterministic scripted timeline: descend, settle, drag, release, flick, flip, flip back, tilt, so a smooth video can be recorded);
- a mount/unmount ×20 button (or an automated check) showing that `renderer.info.memory` returns to its baseline.

The README covers: how to run, the API, the physics method and parameters, design decisions (especially where you departed from the references), performance per quality level (physics ms, frame ms, draw calls, triangles; on a phone if you can), new dependencies with licence and gzip size, known limits, and ideas for Claude's half (camera shot, Clawd moments, sound).

Videos of the sandbox (desktop and phone) are welcome but optional. Use the name "Jize".

## Acceptance tests for your half

- **Unit tests (Vitest, engine only, no DOM, no WebGL):**
  - determinism: the same input sequence gives the same final state (exactly or within ε);
  - stability at dt 1/30, 1/60, 1/120 and a 0.5 s spike (clamped): no NaN, thread length within tolerance;
  - damping: released from 60°, the card comes to rest (speed < ε) within a stated time;
  - drag and release: the card follows the grab point while dragged and swings after release;
  - tilt changes the gravity direction within stated limits;
  - flip reaches the back face and returns;
  - name fitting: 1 letter, 40 letters and diacritics fit on one line (this one may need a canvas; a small DOM-based test is fine).
- `tsc --noEmit` clean in strict mode, no lint errors.
- The sandbox runs with no console errors and stays smooth on a laptop and a recent phone.

## Not your job (Claude does these after your delivery)

Wiring into the film's stage and loop, porting materials to the stage uniforms and post chain, the `pass` slide shot and camera rules, film gesture arbitration, the real data and privacy plumbing, the accessible DOM fallback (Static tier, Calm mode, no WebGL2), Clawd's reactions and voice lines, sound in the film, the epilogue appearance, the CSS 2.5D version, end-to-end tests, preview videos and the pull request. Do not spend your time on these.
