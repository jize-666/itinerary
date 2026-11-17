/**
 * Clawd untuk film 2,5D (M4): karakter kit dibangun dari kotak-kotak DOM dengan transformasi CSS 3D (arti 2,5D dari
 * host 11 Nov: tetap DOM dengan `transform`, bukan WebGL). Ukuran, pivot, dan warna dari kit yang sama dengan film 3D
 * (`stage3d/claude.ts`, `DIMENSIONS`), wajah SVG dari data wajah kit (`face-svg.ts`).
 *
 * Satuan: 1 satuan kit = 100 px sebelum diskalakan; sumbu CSS (x kanan, y bawah, z ke penonton). Rotasi kit (Y atas)
 * dipetakan ke CSS: putaran Z dan X dibalik tandanya, putaran Y sama.
 * Gerak: pose (`engine/mascot/pose.ts`), lentur jeli dan regang lewat satu `matrix3d` yang bertumpu di dasar badan
 * (sama dengan `stage3d/mascot.ts`), sendi lewat rotasi pivot. Muka badan diberi warna berbeda per arah (cahaya
 * datang dari kiri atas depan) supaya terbaca sebagai balok.
 */
import "./flat.css";
import type { Expression } from "@/engine/mascot/face";
import type { Pose } from "@/engine/mascot/pose";
import { faceMarkup } from "./face-svg";

/** Satuan kit → px sebelum skala. */
const U = 100;
const BODY = { w: 2, h: 1.9, d: 1.4 } as const;
const ARM = { w: 0.52, h: 0.3, d: 0.42, x: 0.98, y: -0.2, z: 0.1 } as const;
const LEG = { w: 0.24, h: 0.52, d: 0.38, y: -0.95, z: 0.1, x: [-0.72, -0.24, 0.24, 0.72] } as const;

/** Warna muka balok: depan = #F26D3D kit; atas paling terang, bawah paling gelap. */
const SHADE = { front: "#F26D3D", back: "#C4512A", left: "#E8653A", right: "#D65A2F", top: "#F7895D", bottom: "#B6461F" } as const;

/** Satu balok CSS 3D (w × h × d px), titik asal di tengahnya. `front` = isi muka depan (wajah). */
function cuboid(cls: string, w: number, h: number, d: number, front = ""): string {
  const face = (name: keyof typeof SHADE, fw: number, fh: number, t: string, inner = "") =>
    `<i class="cf-f cf-${name}" style="width:${fw}px;height:${fh}px;margin:${-fh / 2}px 0 0 ${-fw / 2}px;transform:${t};background:${SHADE[name]}">${inner}</i>`;
  return `<b class="cf-box ${cls}">${[
    face("front", w, h, `translateZ(${d / 2}px)`, front),
    face("back", w, h, `rotateY(180deg) translateZ(${d / 2}px)`),
    face("right", d, h, `rotateY(90deg) translateZ(${w / 2}px)`),
    face("left", d, h, `rotateY(-90deg) translateZ(${w / 2}px)`),
    face("top", w, d, `rotateX(90deg) translateZ(${h / 2}px)`),
    face("bottom", w, d, `rotateX(-90deg) translateZ(${h / 2}px)`),
  ].join("")}</b>`;
}

export type FlatFrame = {
  /** Letak tengah badan di layar (px CSS, relatif terhadap induk) dan tinggi badan (px). */
  x: number;
  y: number;
  size: number;
  pose: Pose;
  /** Naik badan (tinggi badan): pose + loncatan ketukan. */
  lift: number;
  /** Regang total dan lentur (bagian tinggi badan), dari pose × jeli. */
  stretch: number;
  shearX: number;
  shearZ: number;
  /** Sudut sendi yang sudah menyusul (rad): lengan [kiri angkat, kiri ayun, kanan angkat, kanan ayun], empat kaki. */
  arms: readonly number[];
  legs: readonly number[];
  /** Arah hadap (rad, + = menoleh ke kanan layar) dan kemiringan pandang (rad, + = memperlihatkan atas). */
  yaw: number;
  pitch: number;
  expression: Expression;
  /** Bukaan mata 0–1 (kedip). */
  open: number;
};

export function createFlatClawd(parent: HTMLElement, onTap: () => void) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "clawd-flat";
  el.setAttribute("aria-label", "Clawd");
  const armHtml = [-1, 1]
    .map((s, i) => `<b class="cf-pivot cf-arm" data-i="${i}" style="transform:translate3d(${s * ARM.x * U}px,${-ARM.y * U}px,${ARM.z * U}px)"><b class="cf-off" style="transform:translateX(${(s * ARM.w * U) / 2}px)">${cuboid("", ARM.w * U, ARM.h * U, ARM.d * U)}</b></b>`)
    .join("");
  const legHtml = LEG.x
    .map((x, i) => `<b class="cf-pivot cf-leg" data-i="${i}" style="transform:translate3d(${x * U}px,${-LEG.y * U}px,${LEG.z * U}px)"><b class="cf-off" style="transform:translateY(${(LEG.h * U) / 2}px)">${cuboid("", LEG.w * U, LEG.h * U, LEG.d * U)}</b></b>`)
    .join("");
  const faceHtml = `<svg class="cf-face" viewBox="-1 -0.95 2 1.9" aria-hidden="true"></svg>`;
  el.innerHTML = `<b class="cf-scale"><b class="cf-look"><b class="cf-flex"><b class="cf-rot">${cuboid("cf-body", BODY.w * U, BODY.h * U, BODY.d * U, faceHtml)}${armHtml}${legHtml}</b></b></b></b>`;
  parent.appendChild(el);
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    onTap();
  });
  const scale = el.querySelector<HTMLElement>(".cf-scale")!;
  const look = el.querySelector<HTMLElement>(".cf-look")!;
  const flex = el.querySelector<HTMLElement>(".cf-flex")!;
  const rot = el.querySelector<HTMLElement>(".cf-rot")!;
  const svg = el.querySelector<SVGSVGElement>(".cf-face")!;
  const arms = [...el.querySelectorAll<HTMLElement>(".cf-arm")];
  const legs = [...el.querySelectorAll<HTMLElement>(".cf-leg")];
  const armBase = arms.map((a) => a.style.transform);
  const legBase = legs.map((l) => l.style.transform);
  let shown: Expression | null = null;
  let eyes: SVGGElement | null = null;
  const deg = (r: number) => `${((r * 180) / Math.PI).toFixed(2)}deg`;

  return {
    el,
    render(fr: FlatFrame) {
      if (shown !== fr.expression) {
        shown = fr.expression;
        svg.innerHTML = faceMarkup(fr.expression);
        eyes = svg.querySelector(".cf-eyes");
      }
      eyes?.setAttribute("transform", `translate(0 0.2) scale(1 ${fr.open.toFixed(3)})`);
      // tombol seukuran badan + lengan + kaki, berpusat di tengah badan (bidang klik)
      const k = fr.size / (BODY.h * U);
      const bw = 3 * U * k;
      const bh = 2.5 * U * k;
      el.style.width = `${bw.toFixed(1)}px`;
      el.style.height = `${bh.toFixed(1)}px`;
      el.style.transform = `translate(${(fr.x - bw / 2).toFixed(1)}px, ${(fr.y - BODY.h * U * k * 0.5 - 0.05 * U * k).toFixed(1)}px)`;
      scale.style.transform = `translate(${(bw / 2).toFixed(1)}px, ${(BODY.h * U * k * 0.5 + 0.05 * U * k).toFixed(1)}px) scale(${k.toFixed(4)})`;
      look.style.transform = `rotateX(${deg(-fr.pitch)}) rotateY(${deg(fr.yaw)})`;
      // lentur + regang bervolume tetap, bertumpu di dasar badan (y CSS = +95 px), lalu naik-turun
      const s = fr.stretch;
      const w = 1 / Math.sqrt(s);
      const a = (BODY.h * U) / 2;
      const lift = fr.lift * BODY.h * U;
      flex.style.transform = `matrix3d(${w},0,0,0,${(-fr.shearX * s).toFixed(4)},${s.toFixed(4)},${(-fr.shearZ * s).toFixed(4)},0,0,0,${w},0,${(fr.shearX * s * a).toFixed(2)},${(a - a * s - lift).toFixed(2)},${(fr.shearZ * s * a).toFixed(2)},1)`;
      rot.style.transform = `rotateY(${deg(fr.pose.spin)}) rotateX(${deg(-fr.pose.tiltX)}) rotateZ(${deg(-fr.pose.tiltZ)})`;
      // lengan: + angkat = naik, + ayun = ke depan; panjang lengan (reach) = skala X pivot
      const [lr, lf, rr, rf] = fr.arms;
      arms[0]!.style.transform = `${armBase[0]} rotateY(${deg(lf!)}) rotateZ(${deg(lr!)}) scaleX(${fr.pose.reach[0].toFixed(3)})`;
      arms[1]!.style.transform = `${armBase[1]} rotateY(${deg(-rf!)}) rotateZ(${deg(-rr!)}) scaleX(${fr.pose.reach[1].toFixed(3)})`;
      legs.forEach((l, i) => (l.style.transform = `${legBase[i]} rotateX(${deg(fr.legs[i]!)})`));
    },
    dispose() {
      el.remove();
    },
  };
}

export type FlatClawd = ReturnType<typeof createFlatClawd>;
