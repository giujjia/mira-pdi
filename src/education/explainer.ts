import { getNeighborhood, getNeighbors3x3, getPixel, quantize } from '../core/matrix';
import { BorderPolicy, GrayImage, Kernel2D, PixelExplanation } from '../core/types';
import { createKernel, rotateKernel180 } from '../core/convolution';
import { computeHistogram } from '../core/histogram';
import { CURRICULAR_CATALOG } from './catalog';

export type OperationId =
  | 'matrix'
  | 'negative'
  | 'threshold'
  | 'stretching'
  | 'gamma'
  | 'log'
  | 'dissolve'
  | 'histogram'
  | 'mean'
  | 'median'
  | 'adaptive'
  | 'sobel'
  | 'roberts'
  | 'kirsch'
  | 'laplacian'
  | 'sharpenLaplacian'
  | 'highBoost'
  | 'convolution'
  | 'tc01'
  | 'tc02'
  | 'tc03';

export interface ExplainParams {
  T?: number;
  gamma?: number;
  c?: number;
  d?: number;
  k?: number;
  size?: number;
  variant?: 'h1' | 'h2' | 'h3' | 'h4';
  rmin?: number;
  rmax?: number;
  smin?: number;
  smax?: number;
  t?: number;
  secondaryVal?: number;
  dissolveMode?: 'uniform' | 'horizontal' | 'vertical' | 'diagonal';
  mode?: 'centerNegative' | 'centerPositive';
  offset?: number;
  kernel?: Kernel2D;
  component?: string;
  histogramMode?: 'equalize' | 'expand' | 'original';
}

/**
 * Convolução de um único pixel (x, y) com rotação formal de 180° da máscara.
 */
function convolvePixel(
  img: GrayImage,
  kernel: Kernel2D,
  x: number,
  y: number,
  offset = 0,
  border: BorderPolicy = 'replication'
): number {
  const rotK = rotateKernel180(kernel);
  const { rows, cols, anchorX, anchorY, weights } = rotK;
  let sum = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const imgX = x + (c - anchorX);
      const imgY = y + (r - anchorY);
      sum += getPixel(img, imgX, imgY, border) * weights[r][c];
    }
  }
  return sum + offset;
}

/**
 * Inspetor "Entenda este Pixel" (RE-01 a RE-04):
 * Avaliador sob demanda que reproduz com fidelidade absoluta os cálculos,
 * incluindo vizinhança real, substituições numéricas e quantização final Q(v).
 */
export function explainPixel(
  img: GrayImage,
  x: number,
  y: number,
  op: OperationId,
  params: ExplainParams = {},
  border: BorderPolicy = 'replication'
): PixelExplanation {
  const r = getPixel(img, x, y, border);
  const n3 = getNeighbors3x3(img, x, y, border);

  let valRaw = r;
  let formulaText = '';
  let stepsText: string[] = [];
  let didacticNote = '';
  let lessonRef = '';
  let appliedKernel: Kernel2D | undefined;
  let kernelWeights: number[][] | undefined = undefined;

  switch (op) {
    case 'matrix': {
      valRaw = r;
      formulaText = 'f(x, y) = r';
      stepsText = [
        `Coordenadas espaciais: x = ${x} (coluna), y = ${y} (linha)`,
        `Intensidade quantizada: ${r} (escala uint8 [0..255])`,
        `Em formato binário: ${r.toString(2).padStart(8, '0')}₂`
      ];
      didacticNote = 'Representação matricial onde cada pixel armazena a intensidade média de luz refletida amostrada espacialmente.';
      lessonRef = CURRICULAR_CATALOG.C02.source;
      break;
    }

    case 'negative': {
      valRaw = 255 - r;
      formulaText = 's = 255 - r';
      stepsText = [
        `Intensidade original: r = ${r}`,
        `Subtração direta: s = 255 - ${r} = ${valRaw}`
      ];
      didacticNote = 'Inversão linear do espectro de cinza: 0 (preto) torna-se 255 (branco), revelando detalhes em regiões escuras.';
      lessonRef = CURRICULAR_CATALOG.C10.source;
      break;
    }

    case 'threshold': {
      const T = params.T ?? 128;
      valRaw = r >= T ? 255 : 0;
      formulaText = `s = (r ≥ T) ? 255 : 0  [onde T = ${T}]`;
      stepsText = [
        `Intensidade original: r = ${r}`,
        `Comparação: ${r} ≥ ${T} → ${r >= T ? 'Verdadeiro (s = 255)' : 'Falso (s = 0)'}`
      ];
      didacticNote = 'Segmentação binária estrita: divide a imagem entre objeto (255) e fundo (0).';
      lessonRef = CURRICULAR_CATALOG.C11.source;
      break;
    }

    case 'stretching': {
      let rmin = params.rmin;
      let rmax = params.rmax;
      if (rmin === undefined || rmax === undefined) {
        const histData = computeHistogram(img);
        rmin = histData.min;
        rmax = histData.max;
      }
      const smin = params.smin ?? 0;
      const smax = params.smax ?? 255;
      if (rmax <= rmin) {
        valRaw = r;
      } else {
        valRaw = ((smax - smin) * (r - rmin)) / (rmax - rmin) + smin;
      }
      formulaText = `s = (smax - smin) · (r - rmin) / (rmax - rmin) + smin  [rmin=${rmin}, rmax=${rmax}, smin=${smin}, smax=${smax}]`;
      stepsText = [
        `Intensidade de entrada: r = ${r}`,
        `Faixa observada na imagem: [${rmin}, ${rmax}]`,
        `Faixa linear de saída desejada: [${smin}, ${smax}]`,
        `Mapeamento linear: (${smax} - ${smin}) · (${r} - ${rmin}) / (${rmax} - ${rmin}) + ${smin} = ${valRaw.toFixed(2)}`
      ];
      didacticNote = 'O alargamento de contraste redistribui linearmente a faixa dinâmica observada para ocupar o intervalo desejado [smin, smax].';
      lessonRef = CURRICULAR_CATALOG.C12.source;
      break;
    }

    case 'gamma': {
      const gamma = params.gamma ?? 1.0;
      const c = params.c ?? 1.0;
      const u = r / 255.0;
      valRaw = 255.0 * c * Math.pow(u, gamma);
      formulaText = `s = 255 · c · (r / 255)^γ  [com γ = ${gamma}, c = ${c}]`;
      stepsText = [
        `Intensidade normalizada: u = ${r} / 255 = ${u.toFixed(4)}`,
        `Potência gamma: (${u.toFixed(4)})^${gamma} = ${Math.pow(u, gamma).toFixed(4)}`,
        `Resultado escalonado: 255 · ${c} · ${Math.pow(u, gamma).toFixed(4)} = ${valRaw.toFixed(2)}`
      ];
      didacticNote = gamma < 1
        ? 'Gamma < 1 expande a faixa de níveis escuros (clareamento suave).'
        : 'Gamma > 1 comprime níveis escuros e acentua tons claros (escurecimento).';
      lessonRef = CURRICULAR_CATALOG.C14.source;
      break;
    }

    case 'log': {
      const factor = params.c ?? (255.0 / Math.log(256.0));
      valRaw = factor * Math.log(1.0 + r);
      formulaText = 's = c · ln(1 + r)';
      stepsText = [
        `Intensidade original: r = ${r}`,
        `Logaritmo natural: ln(1 + ${r}) = ${Math.log(1 + r).toFixed(4)}`,
        `Multiplicação pelo ganho: ${factor.toFixed(2)} · ${Math.log(1 + r).toFixed(4)} = ${valRaw.toFixed(2)}`
      ];
      didacticNote = 'A função logarítmica expande valores baixos de intensidade e comprime valores altos de alta variação dinâmica.';
      lessonRef = CURRICULAR_CATALOG.C13.source;
      break;
    }

    case 'dissolve': {
      const secVal = params.secondaryVal ?? 128;
      let weight = params.t ?? 0.5;
      const dMode = params.dissolveMode ?? 'uniform';
      if (dMode === 'horizontal') {
        weight = img.width > 1 ? x / (img.width - 1) : 0.5;
      } else if (dMode === 'vertical') {
        weight = img.height > 1 ? y / (img.height - 1) : 0.5;
      } else if (dMode === 'diagonal') {
        const denom = (img.width - 1) + (img.height - 1);
        weight = denom > 0 ? (x + y) / denom : 0.5;
      }
      weight = Math.max(0, Math.min(1, weight));
      valRaw = (1.0 - weight) * r + weight * secVal;
      formulaText = `h(x, y) = (1 - t)·f(x, y) + t·g(x, y)  [t = ${weight.toFixed(3)}]`;
      stepsText = [
        `Intensidade da Imagem 1: f(${x}, ${y}) = ${r}`,
        `Intensidade da Imagem 2: g(${x}, ${y}) = ${secVal}`,
        `Fator de mistura t: ${weight.toFixed(3)} (${dMode === 'uniform' ? 'uniforme' : `mapa espacial ${dMode}`})`,
        `Combinação linear ponderada: (1 - ${weight.toFixed(3)})·${r} + ${weight.toFixed(3)}·${secVal} = ${valRaw.toFixed(2)}`
      ];
      didacticNote = 'O dissolve realiza uma interpolação linear pixel a pixel entre duas imagens de mesmas dimensões.';
      lessonRef = dMode === 'uniform' ? CURRICULAR_CATALOG.C07.source : CURRICULAR_CATALOG.C08.source;
      break;
    }

    case 'histogram': {
      const histData = computeHistogram(img);
      if (params.histogramMode === 'expand') {
        const rmin = histData.min;
        const rmax = histData.max;
        const range = rmax - rmin;
        valRaw = range > 0 ? Math.round((255 * (r - rmin)) / range) : r;
        formulaText = 's = round( 255 · (r - r_min) / (r_max - r_min) )';
        stepsText = [
          `Intensidade de entrada: r = ${r}`,
          `Limites globais observados: r_min = ${rmin}, r_max = ${rmax} (intervalo: ${range})`,
          `Fator de escala linear: 255 / ${range} = ${(255 / (range || 1)).toFixed(3)}`,
          `Mapeamento esticado: round( 255 · (${r} - ${rmin}) / ${range} ) = ${valRaw}`
        ];
        didacticNote = 'A expansão linear de histograma estica o contraste ao mapear o menor valor observado para 0 e o maior para 255.';
        lessonRef = CURRICULAR_CATALOG.C16.source;
        break;
      }
      if (params.histogramMode === 'original') {
        valRaw = r;
        formulaText = 's = r (Identidade / Original)';
        stepsText = [
          `Intensidade de entrada: r = ${r}`,
          `Ocorrências do nível ${r} na imagem: H[${r}] = ${histData.counts[r]} pixels`,
          `Nenhuma transformação aplicada ao nível de intensidade.`
        ];
        didacticNote = 'Exibição da imagem original para análise direta do histograma de entrada.';
        lessonRef = CURRICULAR_CATALOG.C15.source;
        break;
      }
      const count = histData.counts[r];
      const cumSum = histData.cdf[r];
      const len = histData.totalPixels;
      const cdf = len > 0 ? cumSum / len : 0;
      valRaw = len > 0 ? Math.round((255 / len) * cumSum) : 0;
      formulaText = 's = round((255 / N) · ∑ H[k]) = round(255 · CDF(r))';
      stepsText = [
        `Intensidade de entrada: r = ${r}`,
        `Ocorrências do nível ${r} na imagem: H[${r}] = ${count} pixels`,
        `Frequência acumulada até ${r}: ∑ H[k] = ${cumSum} de ${len} pixels (CDF = ${(cdf * 100).toFixed(2)}%)`,
        `Intensidade equalizada: round(255 · ${cdf.toFixed(4)}) = ${valRaw}`
      ];
      didacticNote = 'A equalização global de histograma usa a distribuição de probabilidade acumulada (CDF) para esticar faixas densamente povoadas.';
      lessonRef = CURRICULAR_CATALOG.C17.source;
      break;
    }

    case 'mean': {
      const size = params.size ?? 3;
      const neigh = getNeighborhood(img, x, y, size, border);
      const total = neigh.length;
      const sum = neigh.reduce((acc, v) => acc + v, 0);
      valRaw = sum / total;
      formulaText = `s = (1 / ${total}) · ∑ x_i`;
      stepsText = [
        `Vizinhança ${size}×${size} (${total} amostras coletadas com borda '${border}')`,
        `Soma aritmética: ${neigh.slice(0, 9).join(' + ')}${total > 9 ? ' + ...' : ''} = ${sum}`,
        `Divisão pela quantidade: ${sum} / ${total} = ${valRaw.toFixed(2)}`
      ];
      didacticNote = 'Como filtro linear passa-baixas, a média reduz ruídos de alta frequência mas atenua arestas nítidas.';
      lessonRef = CURRICULAR_CATALOG.C22.source;
      break;
    }

    case 'median': {
      const size = params.size ?? 3;
      const neigh = getNeighborhood(img, x, y, size, border);
      const sorted = [...neigh].sort((a, b) => a - b);
      const centerIdx = Math.floor(sorted.length / 2);
      valRaw = sorted[centerIdx];
      formulaText = `s = elemento central ordenado [posição ${centerIdx + 1} de ${sorted.length}]`;
      stepsText = [
        `Vizinhança coletada: [${neigh.slice(0, 9).join(', ')}${neigh.length > 9 ? ', ...' : ''}]`,
        `Vetor ordenado numericamente: [${sorted.slice(0, 9).join(', ')}${sorted.length > 9 ? ', ...' : ''}]`,
        `Elemento mediano central selecionado: ${valRaw}`
      ];
      didacticNote = 'A mediana é um operador não-linear: valores discrepantes (sal e pimenta) são empurrados para os extremos da lista e descartados.';
      lessonRef = CURRICULAR_CATALOG.C23.source;
      break;
    }

    case 'adaptive': {
      const size = params.size ?? 3;
      const c = params.c ?? 1.0;
      const neigh = getNeighborhood(img, x, y, size, border);
      const N = neigh.length;
      const mean = neigh.reduce((acc, v) => acc + v, 0) / N;
      const varSum = neigh.reduce((acc, v) => acc + (v - mean) * (v - mean), 0);
      const sigma = Math.sqrt(varSum / N);
      if (sigma > 1e-6) {
        valRaw = mean + (c / sigma) * (r - mean);
      } else {
        valRaw = r;
      }
      formulaText = 'g(x, y) = μ + (c / σ) · (f(x, y) - μ)  [se σ > 0]';
      stepsText = [
        `Vizinhança ${size}×${size} (${N} pixels amostrados)`,
        `Média local: μ = ${mean.toFixed(2)}`,
        `Desvio padrão local: σ = ${sigma.toFixed(2)}`,
        `Fator de ganho local (c / σ): ${sigma > 1e-6 ? (c / sigma).toFixed(2) : '1.00 (desvio nulo)'}`,
        `Resultado amplificado: ${mean.toFixed(2)} + ${sigma > 1e-6 ? (c / sigma).toFixed(2) : '1.00'} · (${r} - ${mean.toFixed(2)}) = ${valRaw.toFixed(2)}`
      ];
      didacticNote = 'O contraste adaptativo amplifica variações locais onde o desvio padrão é baixo, revelando detalhes sutis em áreas homogêneas.';
      lessonRef = CURRICULAR_CATALOG.C18.source;
      break;
    }

    case 'sobel': {
      const kx = createKernel([[-1,0,1],[-2,0,2],[-1,0,1]]);
      const ky = createKernel([[1,2,1],[0,0,0],[-1,-2,-1]]);
      const gx = convolvePixel(img, kx, x, y, 0, border);
      const gy = convolvePixel(img, ky, x, y, 0, border);
      const magnitude = Math.hypot(gx, gy);
      valRaw = params.component === 'gx' ? gx : params.component === 'gy' ? gy : magnitude;
      appliedKernel = params.component === 'gx' ? kx : params.component === 'gy' ? ky : undefined;
      formulaText = appliedKernel ? `${params.component} = ∑ pixel · peso rotacionado` : '|∇f| = √(Gx² + Gy²)';
      stepsText = [`Convolução com rotação de 180°: Gx = ${gx}; Gy = ${gy}`,
        `Magnitude: √((${gx})² + (${gy})²) = ${magnitude.toFixed(2)}`,
        `Resposta exibida: ${params.component === 'gx' ? 'Gx' : params.component === 'gy' ? 'Gy' : 'magnitude'} = ${valRaw.toFixed(2)}`];
      didacticNote = 'O operador Sobel atenua ruídos ortogonais com o vetor [1, 2, 1]ᵀ e mede a variação de brilho máxima na direção perpendicular.';
      lessonRef = CURRICULAR_CATALOG.C26.source;
      break;
    }

    case 'roberts': {
      const k1 = createKernel([[0, 1], [-1, 0]], 0, 0);
      const k2 = createKernel([[1, 0], [0, -1]], 0, 0);
      const r1 = convolvePixel(img, k1, x, y, 0, border);
      const r2 = convolvePixel(img, k2, x, y, 0, border);
      const magnitude = Math.hypot(r1, r2);
      valRaw = params.component === 'r1' ? r1 : params.component === 'r2' ? r2 : magnitude;
      appliedKernel = params.component === 'r1' ? k1 : params.component === 'r2' ? k2 : undefined;
      formulaText = appliedKernel ? `${params.component} = ∑ pixel · peso rotacionado` : '|∇f| = √(R1² + R2²)';
      stepsText = [
        `Diferença diagonal 45° (R1): ${r1.toFixed(2)}`,
        `Diferença diagonal 135° (R2): ${r2.toFixed(2)}`,
        `Magnitude Euclidiana: √(${r1.toFixed(2)}² + ${r2.toFixed(2)}²) = ${magnitude.toFixed(2)}`,
        `Resposta exibida: ${params.component ?? 'magnitude'} = ${valRaw.toFixed(2)}`
      ];
      didacticNote = 'O operador de Roberts utiliza máscaras diagonais 2×2 com âncora em (0, 0). Por não possuir suavização, é extremamente sensível ao ruído.';
      lessonRef = CURRICULAR_CATALOG.C25.source;
      break;
    }

    case 'kirsch': {
      const kirschMasks = [
        { name: 'Norte (N)', kernel: createKernel([[ 5,  5,  5], [-3,  0, -3], [-3, -3, -3]]) },
        { name: 'Noroeste (NW)', kernel: createKernel([[ 5,  5, -3], [ 5,  0, -3], [-3, -3, -3]]) },
        { name: 'Oeste (W)', kernel: createKernel([[ 5, -3, -3], [ 5,  0, -3], [ 5, -3, -3]]) },
        { name: 'Sudoeste (SW)', kernel: createKernel([[-3, -3, -3], [ 5,  0, -3], [ 5,  5, -3]]) },
        { name: 'Sul (S)', kernel: createKernel([[-3, -3, -3], [-3,  0, -3], [ 5,  5,  5]]) },
        { name: 'Sudeste (SE)', kernel: createKernel([[-3, -3, -3], [-3,  0,  5], [-3,  5,  5]]) },
        { name: 'Leste (E)', kernel: createKernel([[-3, -3,  5], [-3,  0,  5], [-3, -3,  5]]) },
        { name: 'Nordeste (NE)', kernel: createKernel([[-3,  5,  5], [-3,  0,  5], [-3, -3, -3]]) }
      ];
      let maxResp = -Infinity;
      let winningDir = '';
      let winningWeights = kirschMasks[0].kernel.weights;
      const responses: string[] = [];

      for (const km of kirschMasks) {
        const resp = convolvePixel(img, km.kernel, x, y, 0, border);
        responses.push(`${km.name}: ${resp.toFixed(0)}`);
        if (resp > maxResp) {
          maxResp = resp;
          winningDir = km.name;
          winningWeights = km.kernel.weights;
        }
      }
      const selected = Number(params.component);
      const chosen = params.component !== undefined && params.component !== 'max' && Number.isInteger(selected) && selected >= 0 && selected < 8;
      appliedKernel = chosen ? kirschMasks[selected].kernel : createKernel(winningWeights);
      valRaw = chosen ? convolvePixel(img, appliedKernel, x, y, 0, border) : maxResp;
      formulaText = 's = max(R_N, R_NW, R_W, R_SW, R_S, R_SE, R_E, R_NE)';
      stepsText = [
        `Respostas das 8 direções: ${responses.slice(0, 4).join(', ')}`,
        `Demais direções: ${responses.slice(4).join(', ')}`,
        `Máxima resposta encontrada: ${maxResp.toFixed(2)} (Direção dominante: ${winningDir})`
      ];
      if (chosen) { formulaText = `K${selected + 1} = ∑ pixel · peso rotacionado`; stepsText.push(`Selecionada K${selected + 1}: ${valRaw}`); }
      didacticNote = 'As direções nomeiam as máscaras antes da rotação de 180°. O operador de Kirsch aplica 8 máscaras direcionais rotacionadas de 45° e seleciona a maior resposta, indicando a orientação da borda dominante.';
      lessonRef = CURRICULAR_CATALOG.C29.source;
      break;
    }

    case 'laplacian': {
      kernelWeights = [
        [0,  1, 0],
        [1, -4, 1],
        [0,  1, 0]
      ];
      valRaw = n3[1] + n3[3] - 4 * n3[4] + n3[5] + n3[7];
      formulaText = 'L(f) = (1·n_cima) + (1·n_esq) + (-4·n_centro) + (1·n_dir) + (1·n_baixo)';
      stepsText = [
        `Vizinhos de cruz: cima=${n3[1]}, esquerda=${n3[3]}, centro=${n3[4]}, direita=${n3[5]}, baixo=${n3[7]}`,
        `Cálculo da 2ª derivada: ${n3[1]} + ${n3[3]} - 4·(${n3[4]}) + ${n3[5]} + ${n3[7]} = ${valRaw}`
      ];
      didacticNote = 'O Laplaciano é uma 2ª derivada isotrópica. Em regiões homogêneas é zero; em arestas transita entre valores positivos e negativos.';
      lessonRef = CURRICULAR_CATALOG.C27.source;
      break;
    }

    case 'sharpenLaplacian': {
      const isCenterNeg = params.mode !== 'centerPositive';
      kernelWeights = isCenterNeg
        ? [[0, 1, 0], [1, -4, 1], [0, 1, 0]]
        : [[0, -1, 0], [-1, 4, -1], [0, -1, 0]];
      const L = isCenterNeg
        ? (n3[1] + n3[3] - 4 * n3[4] + n3[5] + n3[7])
        : (-n3[1] - n3[3] + 4 * n3[4] - n3[5] - n3[7]);
      valRaw = isCenterNeg ? r - L : r + L;
      formulaText = isCenterNeg ? 'g = f - L(f)  [com centro -4]' : 'g = f + L(f)  [com centro +4]';
      stepsText = [
        `Intensidade original: f = ${r}`,
        `Resposta do Laplaciano: L = ${L}`,
        `Combinação de nitidez: ${isCenterNeg ? `${r} - (${L})` : `${r} + (${L})`} = ${valRaw}`
      ];
      didacticNote = isCenterNeg
        ? 'Como a máscara possui centro negativo (-4), a resposta laplaciana deve ser subtraída da imagem original para somar detalhes finos.'
        : 'Com centro positivo (+4), a resposta laplaciana já tem fase direta e deve ser somada à imagem original.';
      if (params.component === 'original') { valRaw = r; formulaText = 'f(x,y) = r'; kernelWeights = undefined; }
      if (params.component === 'laplacian') { valRaw = L; formulaText = 'L(f) = ∑ pixel · peso'; }
      stepsText.push(`Etapa exibida: ${params.component ?? 'result'} = ${valRaw}`);
      lessonRef = CURRICULAR_CATALOG.C27.source;
      break;
    }

    case 'highBoost': {
      const k = params.k ?? 1.0;
      const neigh = getNeighborhood(img, x, y, 3, border);
      const meanVal = neigh.reduce((acc, v) => acc + v, 0) / 9.0;
      const maskVal = r - meanVal;
      valRaw = r + k * maskVal;
      formulaText = `g = f + k · (f - b)  [com k = ${k}]`;
      stepsText = [
        `Intensidade original: f = ${r}`,
        `Versão suavizada (média 3×3): b = ${meanVal.toFixed(2)}`,
        `Máscara de detalhes finos: m = f - b = ${r} - ${meanVal.toFixed(2)} = ${maskVal.toFixed(2)}`,
        `Resultado final: ${r} + ${k} · (${maskVal.toFixed(2)}) = ${valRaw.toFixed(2)}`
      ];
      didacticNote = k === 1
        ? 'k = 1 corresponde à máscara de nitidez clássica (Unsharp Masking).'
        : `k = ${k} (> 1) corresponde ao High-Boost, amplificando os detalhes sobre a imagem original.`;
      lessonRef = CURRICULAR_CATALOG.C28.source;
      break;
    }

    case 'convolution': {
      const kernel = params.kernel ?? createKernel([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]]);
      const offset = params.offset ?? 0;
      appliedKernel = kernel;
      valRaw = convolvePixel(img, kernel, x, y, offset, border);
      formulaText = `g = ∑ (pixel · peso_rotacionado) + offset  [offset = ${offset}]`;
      stepsText = [
        `Máscara ${kernel.rows}×${kernel.cols} com âncora em (${kernel.anchorX}, ${kernel.anchorY})`,
        `Convolução espacial bidimensional calculada com rotação prévia de 180°`,
        `Soma ponderada dos produtos + offset: ${valRaw.toFixed(2)}`
      ];
      didacticNote = 'A convolução espacial exige a rotação da máscara em 180° antes de multiplicar pelos pixels vizinhos.';
      lessonRef = CURRICULAR_CATALOG.C20.source;
      break;
    }

    case 'tc01': {
      const c = params.c ?? 1;
      const d = params.d ?? 1;
      const center = 8 * c + d;
      kernelWeights = [
        [-c, -c,     -c],
        [-c, center, -c],
        [-c, -c,     -c]
      ];
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        if (i === 4) sum += center * n3[4];
        else sum += -c * n3[i];
      }
      valRaw = sum;
      formulaText = `TC-01: Aguçamento Paramétrico (c=${c}, d=${d}, centro=${center})`;
      stepsText = [
        `Soma dos vizinhos periféricos (-c): -${c} · (${n3.filter((_, i) => i !== 4).join(' + ')})`,
        `Termo central ponderado: ${center} · ${n3[4]} = ${center * n3[4]}`,
        `Soma de produtos bruta: ${valRaw}`,
        `Soma dos coeficientes = ${d} (em região constante r: resposta teórica = ${d}·r)`
      ];
      didacticNote = 'O parâmetro c pondera a intensidade das bordas e d preserva o nível médio original da imagem.';
      lessonRef = CURRICULAR_CATALOG.C31.source;
      break;
    }

    case 'tc02': {
      const variant = params.variant ?? 'h1';
      const offset = params.offset ?? 0;
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
      kernelWeights = weights;
      valRaw = convolvePixel(img, kernel, x, y, offset, border);
      formulaText = `TC-02: Filtro de Relevo (${variant.toUpperCase()}) com offset ${offset}`;
      stepsText = [
        `Máscara ${variant.toUpperCase()}: soma dos coeficientes = 0`,
        `Convolução espacial no pixel (${x}, ${y}): ${(valRaw - offset).toFixed(2)}`,
        `Soma do offset: ${(valRaw - offset).toFixed(2)} + ${offset} = ${valRaw.toFixed(2)}`
      ];
      didacticNote = 'Máscaras de relevo com soma zero resultam em zero em áreas constantes; o offset centraliza os tons em cinza neutro.';
      lessonRef = CURRICULAR_CATALOG.C31.source;
      break;
    }

    case 'tc03': {
      const variant = params.variant ?? 'h4';
      if (variant === 'h4') {
        kernelWeights = [
          [ 0, -1,  0],
          [-1, -4, -1],
          [ 0, -1,  0]
        ];
        valRaw = 0 * n3[0] - 1 * n3[1] + 0 * n3[2] -
                 1 * n3[3] - 4 * n3[4] - 1 * n3[5] +
                 0 * n3[6] - 1 * n3[7] + 0 * n3[8];
        formulaText = 'TC-03 h4: soma dos coeficientes = -8';
        stepsText = [
          `Coeficientes todos negativos: -(${n3[1]}) - (${n3[3]}) - 4·(${n3[4]}) - (${n3[5]}) - (${n3[7]}) = ${valRaw}`,
          `Valor bruto assinado: ${valRaw}`,
          `Quantização uint8: Q(${valRaw}) = ${quantize(valRaw)} (Satura em preto!)`
        ];
        didacticNote = 'CUIDADO CONCEITUAL: Com soma -8 e entradas não-negativas, todos os valores são negativos ou nulos. Na conversão direta para 8 bits satura em 0!';
      } else {
        kernelWeights = [
          [-1, -1, 0],
          [ 1,  0, 1],
          [ 0,  1, 1]
        ];
        valRaw = -1 * n3[0] - 1 * n3[1] + 0 * n3[2] +
                  1 * n3[3] + 0 * n3[4] + 1 * n3[5] +
                  0 * n3[6] + 1 * n3[7] + 1 * n3[8];
        formulaText = 'TC-03 h3: soma dos coeficientes = +2';
        stepsText = [
          `Soma dos produtos com rotação: ${valRaw}`,
          `Soma da máscara = +2 (ganho assimétrico)`
        ];
        didacticNote = 'Máscara direcional h3 do enunciado com soma positiva +2.';
      }
      lessonRef = CURRICULAR_CATALOG.C31.source;
      break;
    }

    default: {
      valRaw = r;
      formulaText = 'f(x, y) = r';
      stepsText = [`Intensidade no ponto (${x}, ${y}): ${r}`];
      didacticNote = 'Visualização direta da intensidade do pixel.';
      lessonRef = CURRICULAR_CATALOG.C02.source;
      break;
    }
  }

  const rotated = appliedKernel ? rotateKernel180(appliedKernel) : kernelWeights ? rotateKernel180(createKernel(kernelWeights)) : undefined;
  const neighborhoodRows = rotated?.rows ?? 3;
  const neighborhoodCols = rotated?.cols ?? 3;
  const anchorX = rotated?.anchorX ?? 1;
  const anchorY = rotated?.anchorY ?? 1;
  const neighbors = Array.from({length: neighborhoodRows * neighborhoodCols}, (_, i) =>
    getPixel(img, x + i % neighborhoodCols - anchorX, y + Math.floor(i / neighborhoodCols) - anchorY, border));
  return {
    neighborhoodRows, neighborhoodCols, anchorX, anchorY,
    x,
    y,
    valIn: r,
    valRaw,
    valQuant: quantize(valRaw),
    neighbors,
    kernelWeights: rotated?.weights,
    formulaText,
    stepsText,
    didacticNote,
    lessonRef
  };
}
