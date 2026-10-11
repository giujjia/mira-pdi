import { describe, expect, it } from 'vitest';
import { createKernel } from '../src/core/convolution';
import { createImage, getPixel } from '../src/core/matrix';
import { meanFilter, medianFilter, adaptiveContrast, normalizeWindowSize } from '../src/core/spatial';
import { histogramEqualization, histogramExpansion } from '../src/core/histogram';
import { gammaTransform, contrastStretching } from '../src/core/pointwise';

describe('Robustez Numérica e Casos Degenerados (Security & Robustness)', () => {
  describe('createKernel: validação de matrizes de convolução', () => {
    it('lança erro ao receber matriz de pesos vazia', () => {
      expect(() => createKernel([])).toThrowError(/vazia/i);
    });

    it('lança erro ao receber matriz com linha vazia', () => {
      expect(() => createKernel([[]])).toThrowError(/vazias/i);
    });

    it('lança erro ao receber matriz irregular (ragged array)', () => {
      expect(() =>
        createKernel([
          [1, 2, 3],
          [4, 5] // Faltando 1 elemento
        ])
      ).toThrowError(/irregular/i);
    });

    it('lança erro ao receber âncoras fora dos limites', () => {
      expect(() =>
        createKernel(
          [
            [1, 0],
            [0, 1]
          ],
          5,
          5
        )
      ).toThrowError(/limites/i);
    });
  });

  describe('spatial: normalização e proteção de janela', () => {
    it('normaliza tamanho não-positivo para 1', () => {
      expect(normalizeWindowSize(0)).toBe(1);
      expect(normalizeWindowSize(-5)).toBe(1);
    });

    it('normaliza tamanho par para ímpar seguinte', () => {
      expect(normalizeWindowSize(2)).toBe(3);
      expect(normalizeWindowSize(4)).toBe(5);
    });

    it('meanFilter com tamanho 1 preserva a imagem intacta', () => {
      const img = createImage(3, 3, 150);
      const out = meanFilter(img, 1);
      expect(getPixel(out, 1, 1)).toBe(150);
    });

    it('medianFilter com tamanho 1 preserva a imagem intacta', () => {
      const img = createImage(3, 3, 120);
      const out = medianFilter(img, 1);
      expect(getPixel(out, 1, 1)).toBe(120);
    });

    it('adaptiveContrast com tamanho 1 preserva a imagem intacta', () => {
      const img = createImage(3, 3, 90);
      const out = adaptiveContrast(img, 1);
      expect(getPixel(out, 1, 1)).toBe(90);
    });
  });

  describe('histogram: proteção de N=0 e imagem homogênea', () => {
    it('histogramEqualization em imagem 0x0 não gera NaN nem slots vazios na LUT', () => {
      const emptyImg = createImage(0, 0);
      const { result, lut } = histogramEqualization(emptyImg);

      expect(lut.length).toBe(256);
      expect(lut.every((v) => Number.isFinite(v))).toBe(true);
      expect(result.data.length).toBe(0);
    });

    it('histogramExpansion em imagem constante preserva os valores originais', () => {
      const constImg = createImage(4, 4, 100);
      const out = histogramExpansion(constImg);

      expect(getPixel(out, 0, 0)).toBe(100);
      expect(getPixel(out, 3, 3)).toBe(100);
    });
  });

  describe('pointwise: proteção contra divisões e potências degeneradas', () => {
    it('gammaTransform com gamma <= 0 não gera NaN nem Infinity', () => {
      const img = createImage(2, 2, 0);
      const out = gammaTransform(img, 0);

      expect(Number.isFinite(getPixel(out, 0, 0))).toBe(true);
      expect(getPixel(out, 0, 0)).toBe(0);
    });

    it('contrastStretching com smin ou smax inválidos assume defaults finitos', () => {
      const img = createImage(2, 2, 50);
      const out = contrastStretching(img, NaN, NaN);

      expect(Number.isFinite(getPixel(out, 0, 0))).toBe(true);
    });
  });
});
