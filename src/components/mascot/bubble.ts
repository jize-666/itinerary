/**
 * Gelembung ucapan Clawd di DOM (M2). Imperatif, bukan komponen React: letaknya mengikuti kepala maskot tiap frame
 * (proyeksi dari panggung 3D), jadi dipasang langsung lewat `transform` tanpa render ulang React. Gaya: `bubble.css`.
 *
 * - Teks diketik huruf demi huruf (`SpeechFrame.shown`); sisa kalimat ikut ditata tetapi transparan supaya ukuran
 *   gelembung tetap sejak huruf pertama.
 * - Pembaca layar mendapat kalimat utuh sekali per kalimat (wilayah `aria-live` terpisah).
 * - Gelembung tetap di dalam layar dan tidak pernah menutupi badan Clawd (`bubble-place.ts`, host 17 Nov): lebarnya
 *   menyesuaikan ruang di sisi yang dipilih, pindah sisi bila tidak muat, huruf diperkecil bila perlu. Ekornya
 *   bergeser supaya tetap menunjuk Clawd.
 * - Ketukan pada gelembung memanggil `onTap` (maju/lengkapi kalimat).
 */
import "./bubble.css";
import type { SpeechFrame } from "@/engine/mascot/dialogue";
import { type Box, placeBubble } from "@/engine/mascot/bubble-place";
import type { BubbleSide } from "@/engine/mascot/guide";
import { MASCOT_NAME } from "@/engine/mascot/lines";

/** Ekor bertangga 9 × 5 piksel: ungu di tepi miring, gelap di dalam; baris pertama menutup garis bawah kotak. */
const TAIL = ["P.......P", ".PDDDDDP.", "..PDDDP..", "...PDP...", "....P...."];
const NEXT = ["WWWWW", ".WWW.", "..W.."];

function pixels(map: readonly string[], colors: Record<string, string>) {
  const w = map[0]!.length;
  const h = map.length;
  let rects = "";
  map.forEach((row, y) => {
    [...row].forEach((c, x) => {
      const fill = colors[c];
      if (fill) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`;
    });
  });
  return `<svg viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

/** `reduced`: gerak dikurangi (kalimat langsung utuh, tanpa animasi); boleh fungsi bila bisa berubah (Calm). */
export type BubbleOptions = { onTap?: () => void; reduced?: boolean | (() => boolean) };

/** Jarak dari tepi layar dan dari badan Clawd (px). */
const MARGIN = 12;
const GAP = 4;
/** Gelembung samping yang lebih sempit dari ini dianggap tidak muat (pindah sisi). */
const MIN_W = 150;
/** Lebar maksimum dibulatkan ke kelipatan ini: ukuran gelembung hanya diukur ulang saat melewati satu anak tangga. */
const W_STEP = 16;
/** Lebar paling besar gelembung, dalam em (sama dengan max-width di bubble.css). */
const CAP_EM = 19.5;
/** Ukuran huruf saat gelembung harus diperkecil (`data-tight`), terhadap ukuran biasa. */
const TIGHT = 0.82;
/** Gelembung tidak ikut bergerak bila kepala Clawd hanya bergeser sejauh ini (px): ayunan melayang. */
const DEADZONE = 10;

export function createBubble(parent: HTMLElement, options: BubbleOptions = {}) {
  const el = document.createElement("div");
  el.className = "clawd-bubble";
  el.innerHTML = `<div class="cb-box"><span class="cb-name">${MASCOT_NAME}</span><p class="cb-text" aria-hidden="true"><span class="cb-typed"></span><span class="cb-rest"></span></p><span class="cb-next">${pixels(NEXT, { W: "#fff" })}</span></div><span class="cb-tail">${pixels(TAIL, { P: "#28007f", D: "rgb(16 0 16 / 0.94)" })}</span><span class="cb-live" role="status" aria-live="polite"></span>`;
  // baris pertama ekor menutup garis bawah kotak di bagian tengah (gelap), kecuali ujung-ujungnya yang ungu
  el.querySelector(".cb-tail svg")!.insertAdjacentHTML("afterbegin", `<rect x="1" y="0" width="7" height="2" fill="rgb(16 0 16)"/>`);
  parent.appendChild(el);
  const typed = el.querySelector<HTMLElement>(".cb-typed")!;
  const rest = el.querySelector<HTMLElement>(".cb-rest")!;
  const tail = el.querySelector<HTMLElement>(".cb-tail")!;
  const live = el.querySelector<HTMLElement>(".cb-live")!;
  const reducedNow = () => (typeof options.reduced === "function" ? options.reduced() : !!options.reduced);
  const onClick = (e: Event) => {
    e.stopPropagation();
    options.onTap?.();
  };
  el.addEventListener("click", onClick);

  let id = "";
  let text = "";
  let shown = -1;
  let width = 0;
  let height = 0;
  /** Ekor menjulur di bawah kotak (px): tingginya dikurangi dua baris yang menumpang kotak. */
  let drop = 0;
  let px = 0;
  let py = 0;
  let placed = false;
  let lastAt = 0;
  /** Ukuran yang sudah diukur untuk kalimat ini: [lebar maksimum, huruf kecil] → [lebar, tinggi]. */
  const sizes = new Map<string, readonly [number, number]>();
  let appliedMax = -1;
  let appliedTight = false;
  let fontPx = 17;

  const measure = () => {
    width = el.offsetWidth;
    height = el.querySelector<HTMLElement>(".cb-box")!.offsetHeight;
    drop = tail.offsetHeight - 2 * (parseFloat(getComputedStyle(el).getPropertyValue("--px")) || 3);
  };
  const apply = (maxW: number, tight: boolean) => {
    if (maxW === appliedMax && tight === appliedTight) return;
    el.style.maxWidth = `${maxW}px`;
    el.toggleAttribute("data-tight", tight);
    appliedMax = maxW;
    appliedTight = tight;
    measure();
  };
  /** Ukuran gelembung bila lebar maksimumnya `w` (dibulatkan ke bawah per `W_STEP`); diukur sekali, lalu disimpan. */
  const sizeAt = (w: number, tight: boolean) => {
    const maxW = Math.max(W_STEP * 4, Math.floor(w / W_STEP) * W_STEP);
    const key = `${maxW}|${tight ? 1 : 0}`;
    let size = sizes.get(key);
    if (!size) {
      apply(maxW, tight);
      size = [width, height];
      sizes.set(key, size);
    }
    return { maxW, w: size[0], h: size[1] };
  };

  return {
    el,
    /**
     * Gambar satu frame. `body` = kotak badan Clawd di layar (px CSS, beserta lengan, kaki, dan ruang di atas kepala);
     * `prefer` = sisi yang diminta (atas kepala, kanan, atau kiri), dipakai bila muat. `frame` null = disembunyikan.
     */
    render(frame: SpeechFrame | null, body: Box, prefer: BubbleSide = "above") {
      if (!frame) {
        if (el.hasAttribute("data-on")) {
          el.removeAttribute("data-on");
          el.removeAttribute("data-pop");
          el.style.opacity = "0";
          id = "";
        }
        return;
      }
      if (frame.id !== id || frame.text !== text) {
        const fresh = frame.id !== id;
        id = frame.id;
        text = frame.text;
        shown = -1;
        live.textContent = `${MASCOT_NAME}: ${text}`;
        typed.textContent = "";
        rest.textContent = text;
        el.setAttribute("data-on", "");
        sizes.clear();
        appliedMax = -1;
        el.style.maxWidth = "";
        el.removeAttribute("data-tight");
        fontPx = parseFloat(getComputedStyle(el).fontSize) || 17;
        measure();
        if (fresh && !reducedNow()) {
          el.removeAttribute("data-pop");
          void el.offsetWidth;
          el.setAttribute("data-pop", "");
        }
        placed = false;
      }
      const n = reducedNow() ? text.length : frame.shown;
      if (n !== shown) {
        shown = n;
        typed.textContent = text.slice(0, n);
        rest.textContent = text.slice(n);
      }
      el.toggleAttribute("data-more", frame.more && !frame.typing);
      el.style.opacity = String(frame.fade);

      // letak: sisi yang diminta bila muat, lalu sisi lain; tidak pernah menutupi badan Clawd, tetap di dalam layar
      // (ukuran jendela dibaca tanpa tata letak; ukuran gelembung dari simpanan, diukur hanya saat lebarnya berganti)
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cap = Math.min(CAP_EM * fontPx, vw - 2 * MARGIN);
      const plan = placeBubble({
        prefer,
        body,
        view: { w: vw, h: vh },
        cap,
        capTight: Math.min(CAP_EM * fontPx * TIGHT, vw - 2 * MARGIN),
        heightAt: (w, tight) => sizeAt(w, tight).h,
        widthAt: (w, tight) => sizeAt(w, tight).w,
        drop,
        gap: GAP,
        margin: MARGIN,
        minW: MIN_W,
      });
      const chosen = sizeAt(plan.maxW, plan.tight);
      apply(chosen.maxW, plan.tight);
      const side = plan.side;
      if (el.dataset.side !== side) {
        el.dataset.side = side;
        placed = false;
      }
      const above = side === "above";
      const goalX = plan.x;
      const goalY = plan.y;
      const x = (body.left + body.right) / 2;
      const y = (body.top + body.bottom) / 2;
      // diam selama Clawd hanya melayang (ayunan kecil): teks lebih mudah dibaca dan diketuk; menyusul bila ia pindah
      // menyusul bebas laju frame (tetapan 90 ms), juga di HP lambat
      const now = performance.now();
      const step = Math.min(500, now - lastAt);
      lastAt = now;
      const far = Math.hypot(goalX - px, goalY - py);
      const k = !placed ? 1 : far > DEADZONE ? 1 - Math.exp(-step / 90) : 0;
      px += (goalX - px) * k;
      py += (goalY - py) * k;
      placed = true;
      el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)`;
      if (above) el.style.setProperty("--tail-x", `${Math.max(18, Math.min(width - 18, x - px)).toFixed(1)}px`);
      else el.style.setProperty("--tail-y", `${Math.max(14, Math.min(height - 14, y - py)).toFixed(1)}px`);
    },
    dispose() {
      el.removeEventListener("click", onClick);
      el.remove();
    },
  };
}

export type Bubble = ReturnType<typeof createBubble>;
