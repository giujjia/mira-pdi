import { describe, expect, it } from 'vitest';
import { createImage, getPixel, quantize } from '../src/core/matrix';
import {
  runTC01Sharpening,
  runTC02Emboss,
  runTC03EdgeDetection
} from '../src/core/mandatoryTests';

describe('Testes Obrigatórios de Convolução da Avaliação AV1 (Seção 7, AV1 p. 2)', () => {
  it('TC-01: Aguçamento com (c,d)=(1,1) tem soma dos coeficientes d=1', () => {
    // Em região homogênea constante de valor r, a resposta teórica longe de bordas é d*r + offset = 1*r + 0 = r.
    const img = createImage(5, 5, 120);
    const tc1 = runTC01Sharpening(img, 1, 1, 0);

    expect(tc1.kernelSum).toBe(1);
    expect(getPixel(tc1.output, 2, 2)).toBe(120);
  });

  it('TC-02: Filtros de relevo h1 e h2 têm soma dos coeficientes zero', () => {
    const img = createImage(5, 5, 150);
    const tc2_h1 = runTC02Emboss(img, 'h1', 0);
    const tc2_h2 = runTC02Emboss(img, 'h2', 0);

    expect(tc2_h1.kernelSum).toBe(0);
    expect(tc2_h2.kernelSum).toBe(0);

    // Em região constante, a resposta é exatamente zero
    expect(getPixel(tc2_h1.output, 2, 2)).toBe(0);
    expect(getPixel(tc2_h2.output, 2, 2)).toBe(0);

    // Com offset 128, a resposta é 128 (cinza médio)
    const tc2_offset = runTC02Emboss(img, 'h1', 128);
    expect(getPixel(tc2_offset.output, 2, 2)).toBe(128);
  });

  it('TC-03: Máscara h3 (soma +2) e máscara h4 (soma -8)', () => {
    const img = createImage(5, 5, 100);
    const tc3_h3 = runTC03EdgeDetection(img, 'h3', 0);
    const tc3_h4 = runTC03EdgeDetection(img, 'h4', 0);

    expect(tc3_h3.kernelSum).toBe(2);
    expect(tc3_h4.kernelSum).toBe(-8);

    // h3 em região constante 100 dá: 2 * 100 = 200
    expect(getPixel(tc3_h3.output, 2, 2)).toBe(200);

    // h4 em região constante 100 dá: -8 * 100 = -800
    // O valor bruto com sinal DEVE ser -800
    const rawVal = getPixel(tc3_h4.output, 2, 2);
    expect(rawVal).toBe(-800);

    // A conversão direta para 8 bits satura em preto (0), comprovando o cuidado conceitual do item 12!
    expect(quantize(rawVal)).toBe(0);
  });
});
