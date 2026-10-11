import { laplacianFilter } from './edges';
import { createImage } from './matrix';
import { meanFilter } from './spatial';
import { BorderPolicy, GrayImage } from './types';

/**
 * Aguçamento via Laplaciano (RF-09, C27):
 * - Com centro negativo (-4): g = f - L(f)
 * - Com centro positivo (+4): g = f + L(f)
 */
export function laplacianSharpen(
  img: GrayImage,
  mode: 'centerNegative' | 'centerPositive' = 'centerNegative',
  border: BorderPolicy = 'replication'
): { result: GrayImage; laplacian: GrayImage } {
  const kType = mode === 'centerNegative' ? 'centerNegative4' : 'centerPositive4';
  const laplacian = laplacianFilter(img, kType, border);

  const result = createImage(img.width, img.height);
  const len = img.data.length;

  for (let i = 0; i < len; i++) {
    const f = img.data[i];
    const L = laplacian.data[i];
    // Se centro negativo: g = f - L
    // Se centro positivo: g = f + L
    result.data[i] = mode === 'centerNegative' ? f - L : f + L;
  }

  return { result, laplacian };
}

/**
 * Aguçamento via High-Boost / Máscara de Nitidez (RF-09, C28):
 * 1. Suavizar f para obter b (usando filtro da média).
 * 2. Máscara de detalhes: m = f - b.
 * 3. Imagem aguçada: g = f + k * m.
 * (k = 1 -> unsharp masking; k > 1 -> high-boost).
 */
export function highBoostFilter(
  img: GrayImage,
  k = 1.0,
  blurSize = 3,
  border: BorderPolicy = 'replication'
): { result: GrayImage; blurred: GrayImage; mask: GrayImage } {
  const blurred = meanFilter(img, blurSize, border);
  const mask = createImage(img.width, img.height);
  const result = createImage(img.width, img.height);
  const len = img.data.length;

  for (let i = 0; i < len; i++) {
    const f = img.data[i];
    const b = blurred.data[i];
    const m = f - b;
    mask.data[i] = m;
    result.data[i] = f + k * m;
  }

  return { result, blurred, mask };
}
