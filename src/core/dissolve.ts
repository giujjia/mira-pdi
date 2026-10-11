import { createImage, getPixel, setPixel } from './matrix';
import { GrayImage } from './types';

/**
 * Dissolve Uniforme (RF-02, C07):
 * h(i, j) = (1 - t) * f(i, j) + t * g(i, j), com 0 ≤ t ≤ 1.
 */
export function dissolveUniform(f: GrayImage, g: GrayImage, t: number): GrayImage {
  if (f.width !== g.width || f.height !== g.height) {
    throw new Error(`Dimensões incompatíveis para dissolve: f(${f.width}x${f.height}) vs g(${g.width}x${g.height}).`);
  }

  const clampedT = Math.max(0, Math.min(1, t));
  const out = createImage(f.width, f.height);
  const len = f.data.length;

  for (let i = 0; i < len; i++) {
    out.data[i] = (1.0 - clampedT) * f.data[i] + clampedT * g.data[i];
  }

  return out;
}

/**
 * Dissolve Não Uniforme com Mapa de Pesos Espaciais (RF-02, C08):
 * h(i, j) = (1 - t(i, j)) * f(i, j) + t(i, j) * g(i, j)
 */
export function dissolveNonUniform(
  f: GrayImage,
  g: GrayImage,
  mapType: 'horizontal' | 'vertical' | 'diagonal'
): GrayImage {
  if (f.width !== g.width || f.height !== g.height) {
    throw new Error(`Dimensões incompatíveis para dissolve: f(${f.width}x${f.height}) vs g(${g.width}x${g.height}).`);
  }

  const out = createImage(f.width, f.height);
  const w = f.width;
  const h = f.height;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let weight = 0.5;
      if (mapType === 'horizontal') {
        weight = w > 1 ? x / (w - 1) : 0.5;
      } else if (mapType === 'vertical') {
        weight = h > 1 ? y / (h - 1) : 0.5;
      } else if (mapType === 'diagonal') {
        const denom = (w - 1) + (h - 1);
        weight = denom > 0 ? (x + y) / denom : 0.5;
      }

      const pF = getPixel(f, x, y);
      const pG = getPixel(g, x, y);
      const res = (1.0 - weight) * pF + weight * pG;
      setPixel(out, x, y, res);
    }
  }

  return out;
}
