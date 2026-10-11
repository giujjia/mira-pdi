import { BorderPolicy, GrayImage } from './types';

/**
 * Cria uma nova imagem monocromática com dimensões width x height preenchida com fillVal.
 */
export function createImage(width: number, height: number, fillVal = 0): GrayImage {
  const data = new Float32Array(width * height);
  if (fillVal !== 0) {
    data.fill(fillVal);
  }
  return { width, height, data };
}

/**
 * Clona profundamente uma GrayImage.
 */
export function cloneImage(img: GrayImage): GrayImage {
  const nextData = new Float32Array(img.data.length);
  nextData.set(img.data);
  return { width: img.width, height: img.height, data: nextData };
}

/**
 * Lê o pixel em (x, y) respeitando a política de borda configurada (replicação ou preenchimento com zero).
 */
export function getPixel(img: GrayImage, x: number, y: number, border: BorderPolicy = 'replication'): number {
  if (x >= 0 && x < img.width && y >= 0 && y < img.height) {
    return img.data[y * img.width + x];
  }

  if (border === 'replication') {
    const clampedX = Math.max(0, Math.min(img.width - 1, x));
    const clampedY = Math.max(0, Math.min(img.height - 1, y));
    return img.data[clampedY * img.width + clampedX];
  }

  // Preenchimento com zero
  return 0;
}

/**
 * Define o valor de intensidade bruta do pixel em (x, y).
 */
export function setPixel(img: GrayImage, x: number, y: number, val: number): void {
  if (x >= 0 && x < img.width && y >= 0 && y < img.height) {
    img.data[y * img.width + x] = val;
  }
}

/**
 * Operador de Quantização e Saturação para 8 bits:
 * Q(v) = min(255, max(0, round(v)))
 */
export function quantize(val: number): number {
  return Math.min(255, Math.max(0, Math.round(val)));
}

/**
 * Coleta os 9 vizinhos 3x3 centrados em (x, y) na ordem:
 * [ (x-1, y-1), (x, y-1), (x+1, y-1),
 *   (x-1, y),   (x, y),   (x+1, y),
 *   (x-1, y+1), (x, y+1), (x+1, y+1) ]
 */
export function getNeighbors3x3(img: GrayImage, x: number, y: number, border: BorderPolicy = 'replication'): number[] {
  return [
    getPixel(img, x - 1, y - 1, border),
    getPixel(img, x,     y - 1, border),
    getPixel(img, x + 1, y - 1, border),
    getPixel(img, x - 1, y,     border),
    getPixel(img, x,     y,     border),
    getPixel(img, x + 1, y,     border),
    getPixel(img, x - 1, y + 1, border),
    getPixel(img, x,     y + 1, border),
    getPixel(img, x + 1, y + 1, border)
  ];
}

/**
 * Coleta uma vizinhança quadrada de tamanho n x n centrada em (x, y).
 */
export function getNeighborhood(img: GrayImage, x: number, y: number, size: number, border: BorderPolicy = 'replication'): number[] {
  const half = Math.floor(size / 2);
  const result: number[] = [];
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      result.push(getPixel(img, x + dx, y + dy, border));
    }
  }
  return result;
}

/**
 * Converte um buffer GrayImage para ImageData RGBA (uint8 clamped) para renderização no Canvas HTML5.
 */
export function toImageData(img: GrayImage, ctx: CanvasRenderingContext2D): ImageData {
  const imageData = ctx.createImageData(img.width, img.height);
  const d = imageData.data;
  const len = img.width * img.height;
  
  for (let i = 0; i < len; i++) {
    const q = quantize(img.data[i]);
    const idx = i * 4;
    d[idx] = q;     // R
    d[idx + 1] = q; // G
    d[idx + 2] = q; // B
    d[idx + 3] = 255; // Alpha
  }
  return imageData;
}

/**
 * Converte um ImageData de entrada colorida para GrayImage 8-bit de acordo com RF-01:
 * round(0.299R + 0.587G + 0.114B) compondo fundo branco para transparência.
 */
export function fromImageData(imageData: ImageData): GrayImage {
  const { width, height, data } = imageData;
  const gray = createImage(width, height);
  const total = width * height;

  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    const a = data[idx + 3] / 255.0; // canal alfa normalizado
    // Composição sobre fundo branco
    const r = data[idx] * a + 255 * (1 - a);
    const g = data[idx + 1] * a + 255 * (1 - a);
    const b = data[idx + 2] * a + 255 * (1 - a);

    const intensity = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    gray.data[i] = quantize(intensity);
  }

  return gray;
}

/**
 * Gera padrões sintéticos didáticos para inspeção e testes controlados.
 */
export function createSyntheticPattern(
  type: 'gradient' | 'step' | 'impulse' | 'noise' | 'constant',
  width = 16,
  height = 16
): GrayImage {
  const img = createImage(width, height);
  const halfW = Math.floor(width / 2);
  const halfH = Math.floor(height / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0;
      if (type === 'gradient') {
        val = Math.round(((x + y) / (width + height - 2)) * 255);
      } else if (type === 'step') {
        val = x < halfW ? 40 : 200;
      } else if (type === 'impulse') {
        val = (x === halfW && y === halfH) ? 255 : 40;
      } else if (type === 'noise') {
        val = 120;
        // Ruído sal e pimenta pseudo-determinístico para reprodutibilidade (RN-06)
        const pseudoRand = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const frac = pseudoRand - Math.floor(pseudoRand);
        if (frac < 0.08) val = 255; // sal
        else if (frac > 0.92) val = 0; // pimenta
      } else {
        // constante
        val = 128;
      }
      setPixel(img, x, y, val);
    }
  }

  return img;
}
