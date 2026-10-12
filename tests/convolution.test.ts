import { describe, expect, it } from 'vitest';
import { convolve2D, createKernel } from '../src/core/convolution';
import { sobelFilter } from '../src/core/edges';
import { createImage, getPixel, setPixel } from '../src/core/matrix';
import { highBoostFilter } from '../src/core/sharpening';

describe('Convolução Espacial 2D e Rotação de 180° (RF-07, C19 a C20)', () => {
  it('Máscara identidade copia a imagem fielmente', () => {
    const img = createImage(3, 3);
    setPixel(img, 1, 1, 150);

    const identity = createKernel([
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0]
    ]);

    const out = convolve2D(img, identity);
    expect(getPixel(out, 1, 1)).toBe(150);
    expect(getPixel(out, 0, 0)).toBe(0);
  });

  it('Verifica rotação de 180° da máscara assimétrica (Diferença entre Convolução e Correlação - A6 p. 9)', () => {
    // Máscara assimétrica com 1 na posição superior-esquerda (0, 0):
    // [[ 1, 0, 0],
    //  [ 0, 0, 0],
    //  [ 0, 0, 0]]
    // Com rotação de 180° da convolução legítima, o peso 1 se desloca para a posição inferior-direita (+1, +1).
    // Para uma imagem de impulso unitário em (1, 1):
    // Na convolução, a resposta é ativada quando o pixel de saída é (0, 0), pois dx=+1, dy=+1 acessa (1, 1).
    const kernel = createKernel([
      [1, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ]);

    const img = createImage(3, 3, 0);
    setPixel(img, 1, 1, 100);

    const out = convolve2D(img, kernel, 0, 'zeros');

    // Na convolução legítima rotacionada 180°, a resposta aparece em (0, 0):
    expect(getPixel(out, 0, 0)).toBe(100);
    // Se fosse correlação sem rotação, apareceria em (2, 2):
    expect(getPixel(out, 2, 2)).toBe(0);
  });

  it('Adição de offset constante uma única vez ao final', () => {
    const img = createImage(3, 3, 0);
    const kernel = createKernel([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ]);

    const out = convolve2D(img, kernel, 128);
    expect(getPixel(out, 1, 1)).toBe(128);
    expect(getPixel(out, 0, 0)).toBe(128);
  });

  it('Sobel detecta degrau vertical com Gx máximo e Gy nulo', () => {
    // Degrau vertical: colunas 0..1 escuras (10), colunas 2..3 claras (200)
    const img = createImage(4, 4);
    for (let y = 0; y < 4; y++) {
      setPixel(img, 0, y, 10);
      setPixel(img, 1, y, 10);
      setPixel(img, 2, y, 200);
      setPixel(img, 3, y, 200);
    }

    const { magnitude, gx, gy } = sobelFilter(img);
    // Na coluna 1, há transição horizontal abrupta
    expect(getPixel(gx, 1, 1)).not.toBe(0);
    // Não há variação vertical, logo Gy deve ser 0
    expect(getPixel(gy, 1, 1)).toBe(0);
    expect(getPixel(magnitude, 1, 1)).toBe(Math.abs(getPixel(gx, 1, 1)));
  });

  it('High-boost com k=0 preserva original e k=1 gera máscara de nitidez', () => {
    const img = createImage(3, 3, 100);
    const hb0 = highBoostFilter(img, 0.0);
    expect(getPixel(hb0.result, 1, 1)).toBe(100);

    const hb1 = highBoostFilter(img, 1.0);
    expect(getPixel(hb1.result, 1, 1)).toBe(100);
  });
});
