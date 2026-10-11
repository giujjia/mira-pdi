import { createImage } from './matrix';
import { GrayImage } from './types';

/**
 * Operação Negativo (RF-03, C10):
 * s = 255 - r
 */
export function negative(img: GrayImage): GrayImage {
  const out = createImage(img.width, img.height);
  const len = img.data.length;
  for (let i = 0; i < len; i++) {
    out.data[i] = 255 - img.data[i];
  }
  return out;
}

/**
 * Operação Limiarização (RF-03, C11):
 * s = 255 se r ≥ T; 0 caso contrário.
 */
export function threshold(img: GrayImage, T: number): GrayImage {
  const out = createImage(img.width, img.height);
  const len = img.data.length;
  for (let i = 0; i < len; i++) {
    out.data[i] = img.data[i] >= T ? 255 : 0;
  }
  return out;
}

/**
 * Alargamento de Contraste (RF-03, C12):
 * s = (smax - smin) * (r - rmin) / (rmax - rmin) + smin
 * Se rmax == rmin, preserva a imagem conforme contrato numérico.
 */
export function contrastStretching(
  img: GrayImage,
  smin: number,
  smax: number,
  rmin?: number,
  rmax?: number
): GrayImage {
  const out = createImage(img.width, img.height);
  const len = img.data.length;

  let observedRmin = rmin ?? Infinity;
  let observedRmax = rmax ?? -Infinity;

  if (rmin === undefined || rmax === undefined) {
    for (let i = 0; i < len; i++) {
      const v = img.data[i];
      if (v < observedRmin) observedRmin = v;
      if (v > observedRmax) observedRmax = v;
    }
  }

  const safeSmin = Number.isFinite(smin) ? smin : 0;
  const safeSmax = Number.isFinite(smax) ? smax : 255;

  // Caso degenerado: intervalo de entrada nulo
  if (observedRmax <= observedRmin) {
    out.data.set(img.data);
    return out;
  }

  const scale = (safeSmax - safeSmin) / (observedRmax - observedRmin);

  for (let i = 0; i < len; i++) {
    const r = img.data[i];
    const s = scale * (r - observedRmin) + safeSmin;
    out.data[i] = s;
  }

  return out;
}

/**
 * Transformação de Potência / Gamma (RF-03, C14):
 * u = r / 255; s = 255 * c * (u ^ gamma)
 */
export function gammaTransform(img: GrayImage, gamma: number, c = 1.0): GrayImage {
  const out = createImage(img.width, img.height);
  const len = img.data.length;
  const safeGamma = Math.max(1e-4, Number.isFinite(gamma) ? gamma : 1.0);
  const safeC = Number.isFinite(c) ? c : 1.0;

  for (let i = 0; i < len; i++) {
    const r = Math.max(0, Math.min(255, img.data[i]));
    const u = r / 255.0;
    const s = u <= 0 ? 0 : 255.0 * safeC * Math.pow(u, safeGamma);
    out.data[i] = s;
  }

  return out;
}

/**
 * Transformação Logarítmica (RF-03, C13):
 * s = c * ln(1 + r)
 * Padrão c = 255 / ln(256) para mapear [0, 255] no espectro total.
 */
export function logTransform(img: GrayImage, c?: number): GrayImage {
  const out = createImage(img.width, img.height);
  const len = img.data.length;
  const factor = c ?? (255.0 / Math.log(256.0));

  for (let i = 0; i < len; i++) {
    const r = Math.max(0, img.data[i]);
    const s = factor * Math.log(1.0 + r);
    out.data[i] = s;
  }

  return out;
}
