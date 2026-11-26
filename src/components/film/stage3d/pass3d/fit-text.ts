export const NAME_FONT = '"Fraunces Variable", Georgia, serif';
export const LABEL_FONT = '"Manrope Variable", sans-serif';

export interface FittedLine {
  text: string;
  font: string;
  size: number;
  width: number;
  left: number;
  right: number;
}

export function oneLine(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

/** Fits the advance and the actual ink. Includes the overhang of italic and accented glyphs. */
export function fitOneLine(
  canvas: Pick<CanvasRenderingContext2D, 'font' | 'measureText'>,
  value: string,
  maxWidth: number,
  maxSize: number,
  font = (size: number) => `italic 620 ${size}px ${NAME_FONT}`,
): FittedLine {
  const text = oneLine(value);
  const measure = (size: number): FittedLine => {
    const fontValue = font(size);
    canvas.font = fontValue;
    const metrics = canvas.measureText(text);
    const left = Math.max(0, metrics.actualBoundingBoxLeft || 0);
    const right = Math.max(metrics.width, metrics.actualBoundingBoxRight || 0);
    return { text, font: fontValue, size, width: left + right, left, right };
  };
  const ideal = measure(maxSize);
  if (ideal.width <= maxWidth) return ideal;
  let low = 0.25;
  let high = maxSize;
  let fit = measure(low);
  for (let sample = 0; sample < 14; sample++) {
    const mid = (low + high) / 2;
    const candidate = measure(mid);
    if (candidate.width > maxWidth) high = mid;
    else {
      low = mid;
      fit = candidate;
    }
  }
  canvas.font = fit.font;
  return fit;
}
