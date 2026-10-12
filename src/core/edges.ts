import { convolve2D, createKernel } from './convolution';
import { createImage } from './matrix';
import { BorderPolicy, GrayImage } from './types';

/**
 * Operador Sobel 3×3 (RF-08, C26):
 * Retorna Gx (horizontal), Gy (vertical) e Magnitude Euclidiana √(Gx² + Gy²).
 */
export function sobelFilter(
  img: GrayImage,
  border: BorderPolicy = 'replication'
): { magnitude: GrayImage; gx: GrayImage; gy: GrayImage } {
  const kx = createKernel([
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ]);

  const ky = createKernel([
    [ 1,  2,  1],
    [ 0,  0,  0],
    [-1, -2, -1]
  ]);

  const gx = convolve2D(img, kx, 0, border);
  const gy = convolve2D(img, ky, 0, border);

  const magnitude = createImage(img.width, img.height);
  const len = img.data.length;

  for (let i = 0; i < len; i++) {
    const vx = gx.data[i];
    const vy = gy.data[i];
    magnitude.data[i] = Math.sqrt(vx * vx + vy * vy);
  }

  return { magnitude, gx, gy };
}

/**
 * Operador Roberts 2×2 (RF-08, C25):
 * Duas máscaras 2×2 diagonais com âncora em (0, 0).
 * Retorna magnitude euclidiana e respostas diagonais r1 e r2.
 */
export function robertsFilter(
  img: GrayImage,
  border: BorderPolicy = 'replication'
): { magnitude: GrayImage; r1: GrayImage; r2: GrayImage } {
  // R1: Diferença diagonal 45°
  const k1 = createKernel([
    [ 0, 1],
    [-1, 0]
  ], 0, 0);

  // R2: Diferença diagonal 135°
  const k2 = createKernel([
    [1,  0],
    [0, -1]
  ], 0, 0);

  const r1 = convolve2D(img, k1, 0, border);
  const r2 = convolve2D(img, k2, 0, border);

  const magnitude = createImage(img.width, img.height);
  const len = img.data.length;

  for (let i = 0; i < len; i++) {
    const v1 = r1.data[i];
    const v2 = r2.data[i];
    magnitude.data[i] = Math.sqrt(v1 * v1 + v2 * v2);
  }

  return { magnitude, r1, r2 };
}

/**
 * Operador de Bússola de Kirsch (RF-08, C29):
 * Oito máscaras direcionais 3×3; a resposta final é o máximo das respostas com sinal por pixel.
 * O contrato exige selecionar a maior resposta direcional por pixel.
 */
export function kirschFilter(
  img: GrayImage,
  border: BorderPolicy = 'replication'
): { maxResponse: GrayImage; directionResponses: GrayImage[] } {
  // As 8 máscaras direcionais de Kirsch (N, NW, W, SW, S, SE, E, NE)
  const kirschMasks = [
    // Norte
    createKernel([
      [ 5,  5,  5],
      [-3,  0, -3],
      [-3, -3, -3]
    ]),
    // Noroeste
    createKernel([
      [ 5,  5, -3],
      [ 5,  0, -3],
      [-3, -3, -3]
    ]),
    // Oeste
    createKernel([
      [ 5, -3, -3],
      [ 5,  0, -3],
      [ 5, -3, -3]
    ]),
    // Sudoeste
    createKernel([
      [-3, -3, -3],
      [ 5,  0, -3],
      [ 5,  5, -3]
    ]),
    // Sul
    createKernel([
      [-3, -3, -3],
      [-3,  0, -3],
      [ 5,  5,  5]
    ]),
    // Sudeste
    createKernel([
      [-3, -3, -3],
      [-3,  0,  5],
      [-3,  5,  5]
    ]),
    // Leste
    createKernel([
      [-3, -3,  5],
      [-3,  0,  5],
      [-3, -3,  5]
    ]),
    // Nordeste
    createKernel([
      [-3,  5,  5],
      [-3,  0,  5],
      [-3, -3, -3]
    ])
  ];

  const directionResponses = kirschMasks.map(mask => convolve2D(img, mask, 0, border));
  const maxResponse = createImage(img.width, img.height);
  const len = img.data.length;

  for (let i = 0; i < len; i++) {
    let maxVal = -Infinity;
    for (let k = 0; k < 8; k++) {
      const v = directionResponses[k].data[i];
      if (v > maxVal) {
        maxVal = v;
      }
    }
    maxResponse.data[i] = maxVal;
  }

  return { maxResponse, directionResponses };
}

/**
 * Operador Laplaciano (RF-08, C27):
 * Segunda derivada espacial isotrópica.
 */
export function laplacianFilter(
  img: GrayImage,
  kernelType: 'centerNegative4' | 'centerPositive4' | 'centerNegative8' = 'centerNegative4',
  border: BorderPolicy = 'replication'
): GrayImage {
  let weights: number[][];

  if (kernelType === 'centerNegative4') {
    // 4 vizinhos, centro -4
    weights = [
      [ 0,  1,  0],
      [ 1, -4,  1],
      [ 0,  1,  0]
    ];
  } else if (kernelType === 'centerPositive4') {
    // 4 vizinhos, centro +4 com sinais invertidos
    weights = [
      [ 0, -1,  0],
      [-1,  4, -1],
      [ 0, -1,  0]
    ];
  } else {
    // 8 vizinhos, centro -8
    weights = [
      [ 1,  1,  1],
      [ 1, -8,  1],
      [ 1,  1,  1]
    ];
  }

  const k = createKernel(weights);
  return convolve2D(img, k, 0, border);
}
