import { createImage, getPixel, setPixel } from './matrix';
import { BorderPolicy, GrayImage, Kernel2D } from './types';

/**
 * Cria uma estrutura Kernel2D com âncora padrão centralizada.
 */
export function createKernel(weights: number[][], anchorX?: number, anchorY?: number): Kernel2D {
  if (!weights || weights.length === 0) {
    throw new Error('Matriz de pesos do kernel não pode ser vazia.');
  }
  const rows = weights.length;
  const cols = weights[0]?.length ?? 0;
  if (cols === 0) {
    throw new Error('Linhas da matriz de pesos não podem ser vazias.');
  }
  for (let r = 0; r < rows; r++) {
    if (!weights[r] || weights[r].length !== cols) {
      throw new Error(`Matriz de pesos irregular (ragged kernel): a linha ${r} tem tamanho diferente de ${cols}.`);
    }
  }

  const defAnchorX = Math.floor((cols - 1) / 2);
  const defAnchorY = Math.floor((rows - 1) / 2);
  const ax = anchorX ?? defAnchorX;
  const ay = anchorY ?? defAnchorY;

  if (ax < 0 || ax >= cols || ay < 0 || ay >= rows) {
    throw new Error(`Âncora fora dos limites do kernel: (${ax}, ${ay}) para kernel ${rows}x${cols}.`);
  }

  return {
    rows,
    cols,
    anchorX: ax,
    anchorY: ay,
    weights
  };
}

/**
 * Rotaciona uma máscara retangular 180° (espelhamento horizontal e vertical),
 * conforme exigido pelo contrato matemático da Convolução Espacial (RF-07, C20).
 */
export function rotateKernel180(kernel: Kernel2D): Kernel2D {
  const { rows, cols, anchorX, anchorY, weights } = kernel;
  const rotWeights: number[][] = [];

  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(weights[rows - 1 - r][cols - 1 - c]);
    }
    rotWeights.push(row);
  }

  // A âncora também é invertida na rotação
  const rotAnchorX = cols - 1 - anchorX;
  const rotAnchorY = rows - 1 - anchorY;

  return {
    rows,
    cols,
    anchorX: rotAnchorX,
    anchorY: rotAnchorY,
    weights: rotWeights
  };
}

/**
 * Convolução Espacial Genérica 2D (RF-07, C19–C20, C30–C32):
 * 1. Rotaciona a máscara 180° para computar a convolução legítima.
 * 2. Percorre cada pixel (x, y) da imagem.
 * 3. Multiplica elemento a elemento a vizinhança da imagem pelos coeficientes rotacionados.
 * 4. Soma todos os produtos e adiciona o offset uma única vez ao final.
 * 5. Preserva os valores brutos com sinal em ponto flutuante (Float32).
 */
export function convolve2D(
  img: GrayImage,
  kernel: Kernel2D,
  offset = 0,
  border: BorderPolicy = 'replication'
): GrayImage {
  const out = createImage(img.width, img.height);
  const rotK = rotateKernel180(kernel);
  const { rows, cols, anchorX, anchorY, weights } = rotK;

  const w = img.width;
  const h = img.height;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;

      for (let r = 0; r < rows; r++) {
        const dy = r - anchorY;
        const imgY = y + dy;

        for (let c = 0; c < cols; c++) {
          const dx = c - anchorX;
          const imgX = x + dx;

          const px = getPixel(img, imgX, imgY, border);
          sum += px * weights[r][c];
        }
      }

      setPixel(out, x, y, sum + offset);
    }
  }

  return out;
}
