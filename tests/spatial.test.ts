import { describe, expect, it } from 'vitest';
import { createImage, getPixel, setPixel } from '../src/core/matrix';
import { adaptiveContrast, meanFilter, medianFilter } from '../src/core/spatial';

describe('Filtros Espaciais: Média, Mediana e Contraste Adaptativo (RF-05, RF-06, C06, C18, C21–C23)', () => {
  it('Verificação fiel do exemplo de referência da especificação (Soma 450 vs Mediana 30)', () => {
    // Matriz 3x3 do exemplo do documento de requisitos:
    // [[ 10,  20, 30],
    //  [ 20, 200, 40],
    //  [ 30,  40, 60]]
    const img = createImage(3, 3);
    const data = [
      [10,  20, 30],
      [20, 200, 40],
      [30,  40, 60]
    ];
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        setPixel(img, x, y, data[y][x]);
      }
    }

    // Média no pixel central (1, 1):
    // Soma = 10+20+30+20+200+40+30+40+60 = 450. Quantidade = 9. Resultado = 50.
    const outMean = meanFilter(img, 3);
    expect(getPixel(outMean, 1, 1)).toBe(50);

    // Mediana no pixel central (1, 1):
    // Ordenação: [10, 20, 20, 30, 30, 40, 40, 60, 200]. 5º elemento = 30.
    const outMedian = medianFilter(img, 3);
    expect(getPixel(outMedian, 1, 1)).toBe(30);
  });

  it('Mediana elimina ruído sal e pimenta pontual sem borrar o entorno', () => {
    // Fundo constante 40 com um único pixel de ruído sal (255) no centro
    const img = createImage(3, 3, 40);
    setPixel(img, 1, 1, 255);

    const outMedian = medianFilter(img, 3);
    expect(getPixel(outMedian, 1, 1)).toBe(40); // 255 descartado no topo da ordenação

    const outMean = meanFilter(img, 3);
    // Média: (8*40 + 255) / 9 = 575 / 9 ≈ 63.88
    expect(getPixel(outMean, 1, 1)).toBeCloseTo(63.88, 1);
  });

  it('Contraste Adaptativo preserva região constante com desvio padrão zero', () => {
    const img = createImage(5, 5, 120);
    const out = adaptiveContrast(img, 3, 2.0);
    expect(getPixel(out, 2, 2)).toBe(120);
  });
});
