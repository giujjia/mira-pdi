import { describe, expect, it } from 'vitest';
import {
  createImage,
  getNeighborhood,
  getPixel,
  quantize,
  setPixel
} from '../src/core/matrix';

describe('Matriz e Representação de Pixels (RF-01, C02)', () => {
  it('cria imagem com dimensões corretas preenchida com valor padrão', () => {
    const img = createImage(4, 3, 128);
    expect(img.width).toBe(4);
    expect(img.height).toBe(3);
    expect(img.data.length).toBe(12);
    expect(img.data[0]).toBe(128);
    expect(img.data[11]).toBe(128);
  });

  it('lê e escreve pixels corretamente', () => {
    const img = createImage(3, 3);
    setPixel(img, 1, 1, 200);
    expect(getPixel(img, 1, 1)).toBe(200);
    expect(getPixel(img, 0, 0)).toBe(0);
  });

  it('aplica política de borda por replicação (padrão)', () => {
    const img = createImage(2, 2);
    setPixel(img, 0, 0, 10);
    setPixel(img, 1, 0, 20);
    setPixel(img, 0, 1, 30);
    setPixel(img, 1, 1, 40);

    // Canto fora da borda (-1, -1) deve replicar (0, 0)
    expect(getPixel(img, -1, -1, 'replication')).toBe(10);
    // (2, 2) deve replicar (1, 1)
    expect(getPixel(img, 2, 2, 'replication')).toBe(40);
    // (2, 0) deve replicar (1, 0)
    expect(getPixel(img, 2, 0, 'replication')).toBe(20);
  });

  it('aplica política de borda com zeros (padding)', () => {
    const img = createImage(2, 2, 100);
    expect(getPixel(img, -1, 0, 'zeros')).toBe(0);
    expect(getPixel(img, 2, 1, 'zeros')).toBe(0);
    expect(getPixel(img, 0, 0, 'zeros')).toBe(100);
  });

  it('quantização e saturação uint8: min(255, max(0, round(v)))', () => {
    expect(quantize(-15.4)).toBe(0);
    expect(quantize(0)).toBe(0);
    expect(quantize(127.4)).toBe(127);
    expect(quantize(127.6)).toBe(128);
    expect(quantize(255)).toBe(255);
    expect(quantize(310.8)).toBe(255);
  });

  it('coleta vizinhança 3x3 ordenada', () => {
    const img = createImage(3, 3);
    let val = 1;
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        setPixel(img, x, y, val++);
      }
    }
    const neigh = getNeighborhood(img, 1, 1, 3);
    expect(neigh).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
