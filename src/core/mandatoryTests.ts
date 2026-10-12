import { convolve2D, createKernel } from './convolution';
import { BorderPolicy, GrayImage, Kernel2D } from './types';

export interface TestCaseResult {
  code: 'TC-01' | 'TC-02' | 'TC-03';
  name: string;
  kernel: Kernel2D;
  kernelSum: number;
  offset: number;
  border: BorderPolicy;
  output: GrayImage;
  interpretation: string;
}

/**
 * TC-01: Aguçamento Paramétrico (Caso Normativo 2.1):
 * Máscara 3×3:
 * [-c,   -c,  -c]
 * [-c, 8c+d,  -c]
 * [-c,   -c,  -c]
 * Soma dos coeficientes = d. Em região constante de valor r: resposta = d*r + offset.
 */
export function runTC01Sharpening(
  img: GrayImage,
  c = 1,
  d = 1,
  offset = 0,
  border: BorderPolicy = 'replication'
): TestCaseResult {
  const center = 8 * c + d;
  const weights = [
    [-c, -c,     -c],
    [-c, center, -c],
    [-c, -c,     -c]
  ];
  const kernel = createKernel(weights);
  const output = convolve2D(img, kernel, offset, border);

  return {
    code: 'TC-01',
    name: `Aguçamento Paramétrico (c=${c}, d=${d})`,
    kernel,
    kernelSum: d,
    offset,
    border,
    output,
    interpretation: `Soma dos coeficientes = ${d}. O parâmetro c=${c} amplifica altas frequências/diferenças locais, enquanto d=${d} preserva o ganho base da imagem.`
  };
}

/**
 * TC-02: Efeito de Relevo (Caso Normativo 2.2):
 * h1 = [[0,0,0], [0,1,0], [0,0,-1]]
 * h2 = [[0,0,2], [0,-1,0], [-1,0,0]]
 * Ambas as somas são zero. Em regiões homogêneas a resposta é nula.
 */
export function runTC02Emboss(
  img: GrayImage,
  variant: 'h1' | 'h2' = 'h1',
  offset = 0,
  border: BorderPolicy = 'replication'
): TestCaseResult {
  const weights = variant === 'h1'
    ? [
        [0, 0,  0],
        [0, 1,  0],
        [0, 0, -1]
      ]
    : [
        [ 0,  0, 2],
        [ 0, -1, 0],
        [-1,  0, 0]
      ];

  const kernel = createKernel(weights);
  const output = convolve2D(img, kernel, offset, border);

  return {
    code: 'TC-02',
    name: `Filtro de Relevo (${variant.toUpperCase()})`,
    kernel,
    kernelSum: 0,
    offset,
    border,
    output,
    interpretation: `Soma zero: áreas planas resultam em ${offset}. Transições diagonais produzem relevo tridimensional através de derivadas direcionais assimétricas.`
  };
}

/**
 * TC-03: Máscaras Indicadas como Detecção de Bordas (Caso Normativo 2.3):
 * h3 = [[-1,-1,0], [1,0,1], [0,1,1]] -> Soma = +2
 * h4 = [[0,-1,0], [-1,-4,-1], [0,-1,0]] -> Soma = -8
 * 
 * ATENÇÃO ACADÊMICA:
 * h4 produz valores não-positivos em entradas não-negativas e offset 0.
 * A conversão direta para 8 bits satura em 0 (preto absoluto).
 * O MIRA preserva e exibe os valores com sinal para demonstrar esse efeito na arguição.
 */
export function runTC03EdgeDetection(
  img: GrayImage,
  variant: 'h3' | 'h4' = 'h3',
  offset = 0,
  border: BorderPolicy = 'replication'
): TestCaseResult {
  const weights = variant === 'h3'
    ? [
        [-1, -1, 0],
        [ 1,  0, 1],
        [ 0,  1, 1]
      ]
    : [
        [ 0, -1,  0],
        [-1, -4, -1],
        [ 0, -1,  0]
      ];

  const kernelSum = variant === 'h3' ? 2 : -8;
  const kernel = createKernel(weights);
  const output = convolve2D(img, kernel, offset, border);

  return {
    code: 'TC-03',
    name: `Máscara de Borda (${variant.toUpperCase()})`,
    kernel,
    kernelSum,
    offset,
    border,
    output,
    interpretation: variant === 'h3'
      ? `Soma = +2 (não nula). Detecta transições diagonais com ganho assimétrico de brilho.`
      : `Soma = -8. Com todos os pesos negativos e offset 0, gera valores brutos negativos (saturando em preto no uint8). Para visualizar, use offset 128 ou inspecione o buffer assinado.`
  };
}
