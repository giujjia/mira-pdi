export type BorderPolicy = 'replication' | 'zeros';

export interface GrayImage {
  width: number;
  height: number;
  data: Float32Array; // 1D buffer de tamanho width * height
}

export interface Kernel2D {
  rows: number;
  cols: number;
  anchorX: number; // padrão floor((cols - 1) / 2)
  anchorY: number; // padrão floor((rows - 1) / 2)
  weights: number[][]; // [row][col]
}

export interface PixelExplanation {
  x: number;
  y: number;
  valIn: number;
  valRaw: number;
  valQuant: number;
  neighbors: number[]; // 3x3 ou n x n
  kernelWeights?: number[][];
  formulaText: string;
  stepsText: string[];
  didacticNote: string;
  lessonRef: string;
}

export interface HistogramData {
  counts: number[]; // 256 bins
  pdf: number[];    // densidade de probabilidade
  cdf: number[];    // cumulativa acumulada
  totalPixels: number;
  min: number;
  max: number;
  mean: number;
  stdDev: number;
}
