/**
 * Gelembung ucapan Clawd di DOM (M2). Imperatif, bukan komponen React: letaknya mengikuti kepala maskot tiap frame
 * (proyeksi dari panggung 3D), jadi dipasang langsung lewat `transform` tanpa render ulang React. Gaya: `bubble.css`.
 *
 * - Teks diketik huruf demi huruf (`SpeechFrame.shown`); sisa kalimat ikut ditata tetapi transparan supaya ukuran
 *   gelembung tetap sejak huruf pertama.
 * - Pembaca layar mendapat kalimat utuh sekali per kalimat (wilayah `aria-live` terpisah).
 * - Gelembung tetap di dalam layar; ekornya bergeser supaya tetap menunjuk kepala.
 * - Ketukan pada gelembung memanggil `onTap` (maju/lengkapi kalimat).
 */
import "./bubble.css";
import type { SpeechFrame } from "@/engine/mascot/dialogue";
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

export type BubbleOptions = { onTap?: () => void; reduced?: boolean };

/** Jarak dari tepi layar (px). */
const MARGIN = 12;

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

  const measure = () => {
    width = el.offsetWidth;
    height = el.querySelector<HTMLElement>(".cb-box")!.offsetHeight;
    drop = tail.offsetHeight - 2 * (parseFloat(getComputedStyle(el).getPropertyValue("--px")) || 3);
  };

  return {
    el,
    /**
     * Gambar satu frame. `x`, `y` = titik di atas kepala Clawd di layar (px CSS), tempat ujung ekor menunjuk.
     * `frame` null = gelembung disembunyikan.
     */
    render(frame: SpeechFrame | null, x: number, y: number) {
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
        measure();
        if (fresh && !options.reduced) {
          el.removeAttribute("data-pop");
          void el.offsetWidth;
          el.setAttribute("data-pop", "");
        }
        placed = false;
      }
      const n = options.reduced ? text.length : frame.shown;
      if (n !== shown) {
        shown = n;
        typed.textContent = text.slice(0, n);
        rest.textContent = text.slice(n);
      }
      el.toggleAttribute("data-more", frame.more && !frame.typing);
      el.style.opacity = String(frame.fade);

      // letak: di atas kepala, tetap di dalam layar; diikuti dengan pelan supaya tidak gemetar ikut ayunan badan
      const vw = document.documentElement.clientWidth;
      const goalX = Math.max(MARGIN, Math.min(vw - MARGIN - width, x - width / 2));
      const goalY = Math.max(MARGIN, y - height - drop);
      const k = placed ? 0.25 : 1;
      px += (goalX - px) * k;
      py += (goalY - py) * k;
      placed = true;
      el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)`;
      tail.style.left = `${Math.max(18, Math.min(width - 18, x - px)).toFixed(1)}px`;
    },
    dispose() {
      el.removeEventListener("click", onClick);
      el.remove();
    },
  };
}

export type Bubble = ReturnType<typeof createBubble>;
