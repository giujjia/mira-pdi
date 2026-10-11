import { createImage, quantize } from './matrix';
import { GrayImage, HistogramData } from './types';

/**
 * Calcula o Histograma, PDF, CDF e estatísticas globais (RF-04, C15).
 */
export function computeHistogram(img: GrayImage): HistogramData {
  const counts = new Array<number>(256).fill(0);
  const totalPixels = img.data.length;

  let min = Infinity;
  let max = -Infinity;
  let sum = 0;

  for (let i = 0; i < totalPixels; i++) {
    const q = quantize(img.data[i]);
    counts[q]++;
    if (q < min) min = q;
    if (q > max) max = q;
    sum += q;
  }

  if (min === Infinity) {
    min = 0;
    max = 0;
  }

  const mean = totalPixels > 0 ? sum / totalPixels : 0;

  let varSum = 0;
  for (let i = 0; i < totalPixels; i++) {
    const q = quantize(img.data[i]);
    const diff = q - mean;
    varSum += diff * diff;
  }
  const stdDev = totalPixels > 0 ? Math.sqrt(varSum / totalPixels) : 0;

  const pdf = new Array<number>(256).fill(0);
  const cdf = new Array<number>(256).fill(0);
  let cum = 0;

  for (let k = 0; k < 256; k++) {
    const p = totalPixels > 0 ? counts[k] / totalPixels : 0;
    pdf[k] = p;
    cum += counts[k];
    cdf[k] = cum;
  }

  return {
    counts,
    pdf,
    cdf,
    totalPixels,
    min,
    max,
    mean,
    stdDev
  };
}

/**
 * Expansão de Histograma Linear (RF-04, C16):
 * s = round( 255 * (r - rmin) / (rmax - rmin) )
 * Preserva imagem constante por convenção documentada.
 */
export function histogramExpansion(img: GrayImage): GrayImage {
  const out = createImage(img.width, img.height);
  const hist = computeHistogram(img);

  if (hist.max <= hist.min) {
    out.data.set(img.data);
    return out;
  }

  const scale = 255.0 / (hist.max - hist.min);
  const len = img.data.length;

  for (let i = 0; i < len; i++) {
    const r = quantize(img.data[i]);
    out.data[i] = Math.round(scale * (r - hist.min));
  }

  return out;
}

/**
 * Equalização Global de Histograma (RF-04, C17):
 * s = round( (255 / N) * ∑ H[l] ), para l = 0..r
 * Retorna a imagem equalizada e a Look-Up Table (LUT) de 256 entradas.
 * Em imagem constante homogênea, converge para s = 255 (pois ∑ H[l] = N).
 */
export function histogramEqualization(img: GrayImage): { result: GrayImage; lut: number[] } {
  const out = createImage(img.width, img.height);
  const hist = computeHistogram(img);
  const N = hist.totalPixels;
  const lut = new Array<number>(256).fill(0);

  if (N === 0) {
    return { result: out, lut };
  }

  const factor = 255.0 / N;
  let cum = 0;

  for (let r = 0; r < 256; r++) {
    cum += hist.counts[r];
    lut[r] = quantize(Math.round(factor * cum));
  }

  const len = img.data.length;
  for (let i = 0; i < len; i++) {
    const r = quantize(img.data[i]);
    out.data[i] = lut[r];
  }

  return { result: out, lut };
}
