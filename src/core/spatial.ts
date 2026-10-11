import { cloneImage, createImage, getPixel, setPixel } from './matrix';
import { BorderPolicy, GrayImage } from './types';

/**
 * Normaliza o tamanho da vizinhança garantindo um inteiro ímpar positivo (>= 1).
 */
export function normalizeWindowSize(size: number): number {
  const intSize = Math.floor(size);
  if (intSize < 1) return 1;
  return intSize % 2 === 0 ? intSize + 1 : intSize;
}

/**
 * Filtro da Média Espacial (RF-06, C22):
 * Soma as intensidades da vizinhança n x n e divide pela quantidade de amostras.
 */
export function meanFilter(img: GrayImage, size = 3, border: BorderPolicy = 'replication'): GrayImage {
  const safeSize = normalizeWindowSize(size);
  if (safeSize === 1) return cloneImage(img);

  const out = createImage(img.width, img.height);
  const w = img.width;
  const h = img.height;
  const total = safeSize * safeSize;
  const half = Math.floor(safeSize / 2);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          sum += getPixel(img, x + dx, y + dy, border);
        }
      }
      setPixel(out, x, y, sum / total);
    }
  }

  return out;
}

/**
 * Filtro da Mediana Espacial (RF-06, C23):
 * Coleta a vizinhança n x n, ordena numericamente e seleciona o elemento central.
 * Operador não-linear de ordem estatística ideal para rejeição de ruído impulsivo.
 * Otimizado com buffer único de scratchpad para eliminar churn de 262k alocações por frame.
 */
export function medianFilter(img: GrayImage, size = 3, border: BorderPolicy = 'replication'): GrayImage {
  const safeSize = normalizeWindowSize(size);
  if (safeSize === 1) return cloneImage(img);

  const out = createImage(img.width, img.height);
  const w = img.width;
  const h = img.height;
  const total = safeSize * safeSize;
  const centerIdx = Math.floor(total / 2);
  const half = Math.floor(safeSize / 2);

  // Scratchpad pré-alocado reutilizado por todos os pixels
  const scratch = new Float32Array(total);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let idx = 0;
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          scratch[idx++] = getPixel(img, x + dx, y + dy, border);
        }
      }
      scratch.sort();
      setPixel(out, x, y, scratch[centerIdx]);
    }
  }

  return out;
}

/**
 * Contraste Adaptativo Local (RF-05, C18):
 * g(i, j) = μ(i, j) + [c / σ(i, j)] * [f(i, j) - μ(i, j)], se σ ≠ 0;
 * caso contrário, g(i, j) = f(i, j).
 * Média local μ = ∑ x / N; desvio padrão populacional σ = sqrt(∑ (x - μ)² / N).
 */
export function adaptiveContrast(
  img: GrayImage,
  size = 3,
  c = 1.0,
  border: BorderPolicy = 'replication'
): GrayImage {
  const safeSize = normalizeWindowSize(size);
  if (safeSize === 1) return cloneImage(img);

  const out = createImage(img.width, img.height);
  const w = img.width;
  const h = img.height;
  const N = safeSize * safeSize;
  const half = Math.floor(safeSize / 2);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          sum += getPixel(img, x + dx, y + dy, border);
        }
      }
      const mean = sum / N;

      let varSum = 0;
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const d = getPixel(img, x + dx, y + dy, border) - mean;
          varSum += d * d;
        }
      }
      const sigma = Math.sqrt(varSum / N);

      const centerVal = getPixel(img, x, y, border);

      if (sigma > 1e-6) {
        const enhanced = mean + (c / sigma) * (centerVal - mean);
        setPixel(out, x, y, enhanced);
      } else {
        // Desvio zero (região perfeitamente uniforme)
        setPixel(out, x, y, centerVal);
      }
    }
  }

  return out;
}
