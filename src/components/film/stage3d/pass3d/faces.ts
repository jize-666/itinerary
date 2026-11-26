import type { PassContent } from './content';
import { fitOneLine, LABEL_FONT, NAME_FONT, oneLine } from './fit-text';

export const FACE_WIDTH = 740;
export const FACE_HEIGHT = 1500;

// Linear mask channels: warm ink, reflective foil, and muted ink.
const INK = '#ff0000';
const FOIL = '#00ff00';
const PATTERN = '#007500';
const DIM = '#0000ff';
const DEEP = '#00000D';
const BLACK = '#000000';

const serif = (weight: number) => (size: number) => `italic ${weight} ${size}px ${NAME_FONT}`;
const sans = (weight: number) => (size: number) => `${weight} ${size}px ${LABEL_FONT}`;

type Context = CanvasRenderingContext2D;
export type FaceCanvases = readonly [front: HTMLCanvasElement, back: HTMLCanvasElement];
export type PassFonts = Pick<FontFaceSet, 'load'>;

export function loadFaceFonts(fonts: PassFonts, content: PassContent): Promise<unknown> {
  const l = content.labels;
  const italic = [l.title, content.name, content.initials, content.gate, l.host, l.thanks].filter(Boolean).join(' ');
  const regular = [l.kicker, l.admit, l.passenger, l.passengerNote, l.date, l.seat, l.gate, l.ticket,
    l.hostedBy, l.thanksCaption, l.occasion, content.date, content.seat, content.ticketNo,
    ...content.route.flatMap(({ code, city, detail }) => [code, city, detail])].join(' ');
  return Promise.all([fonts.load(serif(620)(80), italic), fonts.load(sans(760)(28), regular)]);
}

function faceContext(canvas: HTMLCanvasElement, resolution: number): Context {
  const width = resolution;
  const height = Math.round(resolution * FACE_HEIGHT / FACE_WIDTH);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('A 2D context is required for the boarding pass print.');
  ctx.setTransform(width / FACE_WIDTH, 0, 0, height / FACE_HEIGHT, 0, 0);
  ctx.globalAlpha = 1;
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, FACE_WIDTH, FACE_HEIGHT);
  return ctx;
}

function rule(ctx: Context, x0: number, x1: number, y: number, color = FOIL, width = 1.8): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
}

function circle(ctx: Context, x: number, y: number, radius: number, color: string, width = 0): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  if (width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  } else {
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function diamond(ctx: Context, x: number, y: number, r: number, color: string, stroke?: string): void {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function trimPath(ctx: Context, inset: number): void {
  const right = FACE_WIDTH - inset, bottom = FACE_HEIGHT - inset;
  const shoulder = 130 + inset * 0.42, radius = Math.max(14, 56 - inset);
  const notch = 1355, dip = 26, side = inset;
  ctx.beginPath();
  ctx.moveTo(shoulder, inset);
  ctx.lineTo(FACE_WIDTH - shoulder, inset);
  ctx.lineTo(right, shoulder);
  ctx.lineTo(right, notch - 35);
  ctx.bezierCurveTo(right, notch - 17, right - dip, notch - 20, right - dip, notch);
  ctx.bezierCurveTo(right - dip, notch + 20, right, notch + 17, right, notch + 35);
  ctx.lineTo(right, bottom - radius);
  ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
  ctx.lineTo(side + radius, bottom);
  ctx.quadraticCurveTo(side, bottom, side, bottom - radius);
  ctx.lineTo(side, notch + 35);
  ctx.bezierCurveTo(side, notch + 17, side + dip, notch + 20, side + dip, notch);
  ctx.bezierCurveTo(side + dip, notch - 20, side, notch - 17, side, notch - 35);
  ctx.lineTo(side, shoulder);
  ctx.closePath();
}

function doubleTrim(ctx: Context): void {
  ctx.strokeStyle = FOIL;
  ctx.lineWidth = 3.9;
  trimPath(ctx, 29);
  ctx.stroke();
  ctx.strokeStyle = PATTERN;
  ctx.lineWidth = 2.6;
  trimPath(ctx, 40);
  ctx.stroke();
}

function lineText(ctx: Context, text: string, x: number, baseline: number, maxWidth: number, size: number,
  font: (size: number) => string, color: string, align: 'left' | 'right' | 'center' = 'left'): void {
  ctx.textAlign = 'left';
  const line = fitOneLine(ctx, text, maxWidth, size, font);
  const start = align === 'right' ? x - line.right : align === 'center' ? x + (line.left - line.right) / 2 : x + line.left;
  ctx.fillStyle = color;
  ctx.fillText(line.text, start, baseline);
}

function tracked(ctx: Context, text: string, x: number, y: number, maxWidth: number, size: number, spacing: number,
  color: string, align: 'left' | 'right' | 'center' = 'left'): void {
  const line = Array.from(oneLine(text));
  ctx.textAlign = 'left';
  ctx.font = sans(770)(size);
  let widths = line.map((char) => ctx.measureText(char).width);
  const gaps = Math.max(0, line.length - 1);
  let width = widths.reduce((sum, w) => sum + w, gaps * spacing);
  if (width > maxWidth) {
    const scale = maxWidth / width;
    spacing *= scale;
    size *= scale;
    ctx.font = sans(770)(size);
    widths = line.map((char) => ctx.measureText(char).width);
    width = widths.reduce((sum, w) => sum + w, gaps * spacing);
  }
  let pen = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
  ctx.fillStyle = color;
  for (let i = 0; i < line.length; i++) {
    ctx.fillText(line[i]!, pen, y);
    pen += widths[i]! + spacing;
  }
}

function kawung(ctx: Context, color: string, tile: number): void {
  ctx.save();
  trimPath(ctx, 43);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.3;
  const petals = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
  for (let y = 32; y < FACE_HEIGHT + tile; y += tile) {
    for (let x = 28; x < FACE_WIDTH + tile; x += tile) {
      ctx.beginPath();
      for (const angle of petals) {
        const theta = angle + Math.PI / 4;
        const cx = x + Math.cos(theta) * tile * 0.255;
        const cy = y + Math.sin(theta) * tile * 0.255;
        ctx.moveTo(cx + Math.cos(theta) * tile * 0.24, cy + Math.sin(theta) * tile * 0.24);
        ctx.ellipse(cx, cy, tile * 0.24, tile * 0.104, theta, 0, 2 * Math.PI);
        ctx.moveTo(cx + tile * 0.027, cy);
        ctx.ellipse(cx, cy, tile * 0.027, tile * 0.017, theta, 0, 2 * Math.PI);
      }
      ctx.stroke();
      diamond(ctx, x, y, tile * 0.036, color);
    }
  }
  ctx.restore();
}

function drawBarcode(ctx: Context): void {
  // Decorative foil, independent of the name and of all private data.
  const marks = [3, 1, 2, 4, 2, 1, 3, 2, 2, 1, 4, 1, 2, 3, 1, 3, 1, 2, 4, 1, 2, 3, 1, 1, 2, 4, 1, 2, 3, 2, 1, 4, 2, 1, 3, 2, 4];
  let x = 88;
  ctx.fillStyle = FOIL;
  for (let i = 0; i < marks.length; i++) {
    const width = marks[i]! * 2.85;
    if (i % 2 === 0 || i % 5 === 0) ctx.fillRect(x, 1392, width, i % 10 === 0 ? 59 : 53);
    x += width + 2.55;
  }
}

function drawFront(ctx: Context, c: PassContent): void {
  const l = c.labels;
  const left = 88, right = 652;
  kawung(ctx, DEEP, 107);
  doubleTrim(ctx);
  tracked(ctx, l.kicker, left, 230, 275, 22, 4.2, FOIL);
  tracked(ctx, l.admit, right, 230, 260, 22, 3.7, FOIL, 'right');
  lineText(ctx, l.title, left, 325, right - left, 65, serif(630), FOIL);
  rule(ctx, left, right, 360, PATTERN, 2.5);
  diamond(ctx, 370, 360, 7, FOIL);

  tracked(ctx, l.passenger, left, 424, right - left, 22, 5, DIM);
  lineText(ctx, c.name, left - 4, 524, right - left + 4, 116, serif(640), INK);
  lineText(ctx, l.passengerNote, left, 575, right - left, 25, sans(620), DIM);

  for (let y = 685; y < 1005; y += 12) circle(ctx, 109, y, 1.6, PATTERN);
  c.route.forEach((stop, index) => {
    const y = 710 + index * 141;
    circle(ctx, 109, y - 25, 13, BLACK);
    if (index === 1) diamond(ctx, 109, y - 25, 10, BLACK, FOIL);
    else circle(ctx, 109, y - 25, 10, FOIL, 2.9);
    if (index === 2) circle(ctx, 109, y - 25, 4, FOIL);
    if (index < 2) {
      const wingY = y + 49;
      diamond(ctx, 109, wingY, 7, FOIL);
      rule(ctx, 98, 120, wingY, FOIL, 2.2);
    }
    lineText(ctx, stop.code, 154, y, 204, 78, sans(800), INK);
    lineText(ctx, stop.city, right, y - 14, 300, 31, sans(780), index === 2 ? FOIL : INK, 'right');
    lineText(ctx, stop.detail, right, y + 20, 296, 19.5, sans(650), DIM, 'right');
  });

  rule(ctx, left, right, 1057, PATTERN, 2.2);
  const detail = (label: string, value: string, x: number, y: number, italic = false) => {
    tracked(ctx, label, x, y, 255, 20, 4.1, DIM);
    lineText(ctx, value, x, y + 51, 266, italic ? 38 : 33, italic ? serif(640) : sans(710), italic ? FOIL : INK);
  };
  detail(l.date, c.date, left, 1119);
  detail(l.seat, c.seat, 414, 1119);
  detail(l.gate, c.gate, left, 1245, true);
  detail(l.ticket, c.ticketNo, 414, 1245);
  for (let x = 69; x < 675; x += 13) circle(ctx, x, 1355, 2.7, '#004000');
  drawBarcode(ctx);
  tracked(ctx, l.hostedBy, right, 1403, 180, 17.5, 3.3, DIM, 'right');
  lineText(ctx, l.host, right, 1450, 181, 32, serif(620), FOIL, 'right');
}

function drawBack(ctx: Context, c: PassContent): void {
  const l = c.labels;
  kawung(ctx, PATTERN, 89);
  doubleTrim(ctx);
  const mx = 370, my = 668;
  circle(ctx, mx, my, 201, BLACK);
  circle(ctx, mx, my, 193, FOIL, 4.7);
  circle(ctx, mx, my, 175, PATTERN, 2.9);
  for (const side of [-1, 1]) {
    diamond(ctx, mx + side * 193, my, 15, BLACK, FOIL);
    diamond(ctx, mx, my + side * 193, 15, BLACK, FOIL);
  }
  const name = oneLine(c.name);
  const first = typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(c.lang, { granularity: 'grapheme' }).segment(name)[Symbol.iterator]().next().value?.segment
    : Array.from(name)[0];
  const initial = c.initials ?? first?.toLocaleUpperCase(c.lang) ?? '';
  const fitted = fitOneLine(ctx, initial, 253, 290, serif(640));
  const bounds = ctx.measureText(fitted.text);
  const offset = (bounds.actualBoundingBoxAscent - bounds.actualBoundingBoxDescent) / 2;
  lineText(ctx, initial, mx, my + offset - 3, 253, 290, serif(640), FOIL, 'center');

  ctx.fillStyle = BLACK;
  ctx.beginPath();
  ctx.moveTo(148, 966);
  ctx.lineTo(592, 966);
  ctx.lineTo(641, 1015);
  ctx.lineTo(641, 1137);
  ctx.lineTo(592, 1185);
  ctx.lineTo(148, 1185);
  ctx.lineTo(99, 1137);
  ctx.lineTo(99, 1015);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = PATTERN;
  ctx.stroke();
  lineText(ctx, l.thanks, mx, 1047, 490, 75, serif(630), FOIL, 'center');
  tracked(ctx, l.thanksCaption, mx, 1101, 471, 22, 3.7, DIM, 'center');
  lineText(ctx, l.occasion, mx, 1147, 475, 24, sans(650), INK, 'center');
  for (let x = 69; x < 675; x += 13) circle(ctx, x, 1355, 2.7, '#004000');
}

export function paintPassFaces(canvases: FaceCanvases, resolution: number, content: PassContent): void {
  drawFront(faceContext(canvases[0], resolution), content);
  drawBack(faceContext(canvases[1], resolution), content);
}
