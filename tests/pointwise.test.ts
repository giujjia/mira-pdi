import { describe, expect, it } from 'vitest';
import { createImage, getPixel, setPixel } from '../src/core/matrix';
import {
  contrastStretching,
  gammaTransform,
  logTransform,
  negative,
  threshold
} from '../src/core/pointwise';

describe('Transformações Pontuais (RF-03, C10–C14)', () => {
  it('Negativo: s = 255 - r', () => {
    const img = createImage(3, 1);
    setPixel(img, 0, 0, 0);
    setPixel(img, 1, 0, 100);
    setPixel(img, 2, 0, 255);

    const out = negative(img);
    expect(getPixel(out, 0, 0)).toBe(255);
    expect(getPixel(out, 1, 0)).toBe(155);
    expect(getPixel(out, 2, 0)).toBe(0);
  });

  it('Limiarização: s = 255 se r >= T; 0 caso contrário', () => {
    const img = createImage(4, 1);
    setPixel(img, 0, 0, 50);
    setPixel(img, 1, 0, 127);
    setPixel(img, 2, 0, 128);
    setPixel(img, 3, 0, 200);

    const out = threshold(img, 128);
    expect(getPixel(out, 0, 0)).toBe(0);
    expect(getPixel(out, 1, 0)).toBe(0);
    expect(getPixel(out, 2, 0)).toBe(255);
    expect(getPixel(out, 3, 0)).toBe(255);
  });

  it('Gamma com gamma=1 e c=1 preserva a imagem original', () => {
    const img = createImage(2, 1);
    setPixel(img, 0, 0, 50);
    setPixel(img, 1, 0, 200);

    const out = gammaTransform(img, 1.0, 1.0);
    expect(getPixel(out, 0, 0)).toBeCloseTo(50, 1);
    expect(getPixel(out, 1, 0)).toBeCloseTo(200, 1);
  });

  it('Gamma < 1 clareia níveis escuros e Gamma > 1 escurece', () => {
    const img = createImage(1, 1, 64); // ~0.25 normalizado
    const brighter = gammaTransform(img, 0.5, 1.0);
    const darker = gammaTransform(img, 2.0, 1.0);

    expect(getPixel(brighter, 0, 0)).toBeGreaterThan(64);
    expect(getPixel(darker, 0, 0)).toBeLessThan(64);
  });

  it('Logaritmo mapeia r=0 em s=0 e r=255 em ~255', () => {
    const img = createImage(2, 1);
    setPixel(img, 0, 0, 0);
    setPixel(img, 1, 0, 255);

    const out = logTransform(img);
    expect(getPixel(out, 0, 0)).toBeCloseTo(0, 1);
    expect(getPixel(out, 1, 0)).toBeCloseTo(255, 1);
  });

  it('Alargamento de Contraste preserva imagem homogênea', () => {
    const img = createImage(3, 3, 100);
    const out = contrastStretching(img, 0, 255);
    expect(getPixel(out, 0, 0)).toBe(100);
    expect(getPixel(out, 2, 2)).toBe(100);
  });
});
