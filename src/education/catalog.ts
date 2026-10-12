interface LessonContent {
  id: string;
  title: string;
  source: string;
  description: string;
  guideQuestion: string;
}

export const CURRICULAR_CATALOG: Record<string, LessonContent> = {
  C02: {
    id: 'C02',
    title: 'Imagem como Matriz e 8 Bits',
    source: 'MIRA · Fundamentos',
    description: 'A imagem monocromática digital é uma grade bidimensional onde cada amostra espacial armazena um valor de intensidade quantizado em 256 níveis (2^8 = 256, de 0 a 255).',
    guideQuestion: 'Como a amostragem espacial e a quantização de intensidade definem a qualidade e o tamanho de uma imagem digital?'
  },
  C07: {
    id: 'C07',
    title: 'Dissolve Uniforme',
    source: 'MIRA · Álgebra de Imagens',
    description: 'Combinação linear ponderada de duas imagens de mesmas dimensões: h(i,j) = (1-t)f(i,j) + t*g(i,j), com peso constante t em [0, 1].',
    guideQuestion: 'Por que combinar pixels correspondentes não equivale ao produto matricial linear?'
  },
  C08: {
    id: 'C08',
    title: 'Dissolve Não-Uniforme',
    source: 'MIRA · Álgebra de Imagens',
    description: 'Substitui o peso escalar t por uma matriz de pesos t(i,j) que varia espacialmente na horizontal, vertical ou diagonal.',
    guideQuestion: 'Como uma matriz de pesos espaciais cria transições graduais entre duas cenas?'
  },
  C10: {
    id: 'C10',
    title: 'Negativo Digital',
    source: 'MIRA · Operações Pontuais',
    description: 'Transformação pontual inversível s = 255 - r, invertendo a escala tonal de pretos para brancos e destacando detalhes escuros.',
    guideQuestion: 'Em quais cenários práticos (ex: mamografia) a inversão de tons facilita a interpretação humana?'
  },
  C11: {
    id: 'C11',
    title: 'Limiarização (Thresholding)',
    source: 'MIRA · Operações Pontuais',
    description: 'Segmentação binária que mapeia pixels com r >= T para 255 (branco) e abaixo de T para 0 (preto).',
    guideQuestion: 'Como escolher o limiar T ideal a partir da inspeção dos vales do histograma?'
  },
  C12: {
    id: 'C12',
    title: 'Alargamento de Contraste',
    source: 'MIRA · Operações Pontuais',
    description: 'Mapeamento linear que expande uma faixa estreita [rmin, rmax] para uma faixa desejada [smin, smax].',
    guideQuestion: 'Qual a diferença conceitual entre alargamento com faixas arbitrárias e expansão pelos extremos observados?'
  },
  C14: {
    id: 'C14',
    title: 'Transformação de Potência / Gamma',
    source: 'MIRA · Operações Pontuais',
    description: 's = 255 * c * (r/255)^gamma. Curvas com gamma < 1 expandem tons escuros; gamma > 1 expandem tons claros.',
    guideQuestion: 'Por que valores de gamma menores que 1 clareiam imagens escuras mantendo a escala normalizada?'
  },
  C13: {
    id: 'C13',
    title: 'Transformação Logarítmica',
    source: 'MIRA · Operações Pontuais',
    description: 's = c * ln(1 + r), expandindo a visualização de pixels escuros enquanto comprime valores muito brilhantes.',
    guideQuestion: 'Por que a transformação logarítmica é padrão para exibir o espectro de Fourier?'
  },
  C15: {
    id: 'C15',
    title: 'Histograma e Estatísticas Globais',
    source: 'MIRA · Histograma',
    description: 'Contagem discreta H[k] da frequência de cada um dos 256 níveis de intensidade na imagem.',
    guideQuestion: 'O que o desvio padrão e a forma do histograma revelam sobre o contraste global da cena?'
  },
  C16: {
    id: 'C16',
    title: 'Expansão Linear de Histograma',
    source: 'MIRA · Histograma',
    description: 'Mapeamento linear que ajusta os extremos observados [rmin, rmax] para ocupar todo o espectro [0, 255].',
    guideQuestion: 'Por que a expansão preserva a forma relativa do histograma apenas esticando seus intervalos?'
  },
  C17: {
    id: 'C17',
    title: 'Equalização Global de Histograma',
    source: 'MIRA · Histograma',
    description: 'Transformação baseada na probabilidade acumulada (CDF): s = round((255/N) * ∑ H[l]). Redistribui as intensidades de forma mais uniforme.',
    guideQuestion: 'Por que em imagens digitais discretas o histograma resultante nunca fica perfeitamente plano?'
  },
  C18: {
    id: 'C18',
    title: 'Contraste Adaptativo Local',
    source: 'MIRA · Filtragem Espacial',
    description: 'g(i,j) = μ(i,j) + [c / σ(i,j)] * [f(i,j) - μ(i,j)], amplificando variações em regiões de baixo desvio padrão.',
    guideQuestion: 'Por que é indispensável tratar o caso de desvio padrão populacional zero para evitar divisão por zero?'
  },
  C22: {
    id: 'C22',
    title: 'Filtro da Média (Passa-Baixas Linear)',
    source: 'MIRA · Filtragem Espacial',
    description: 'Substitui o pixel central pela média aritmética de sua vizinhança. Suaviza ruído gaussiano mas borra bordas nítidas.',
    guideQuestion: 'Como o aumento da janela (3x3 para 7x7) acentua a perda de detalhes de alta frequência?'
  },
  C23: {
    id: 'C23',
    title: 'Filtro da Mediana (Não-Linear)',
    source: 'MIRA · Filtragem Espacial',
    description: 'Ordena a vizinhança e escolhe o elemento mediano central. Excelente para remover ruído sal e pimenta sem degradar transições de arestas.',
    guideQuestion: 'Por que a mediana rejeita valores discrepantes extremos (outliers) ao contrário da média?'
  },
  C20: {
    id: 'C20',
    title: 'Convolução vs Correlação',
    source: 'MIRA · Convolução 2D',
    description: 'A convolução legítima exige a rotação prévia de 180° da máscara antes da soma ponderada dos produtos.',
    guideQuestion: 'Qual o impacto visual de aplicar uma máscara assimétrica sem a rotação de 180°?'
  },
  C26: {
    id: 'C26',
    title: 'Operador de Sobel 3×3',
    source: 'MIRA · Detecção de Bordas',
    description: 'Combina derivadas direcionais ortogonais Gx e Gy com alisamento integrado [1, 2, 1], computando a magnitude |∇f| = √(Gx² + Gy²).',
    guideQuestion: 'Como o gradiente bidimensional quantifica a direção e a taxa máxima de variação espacial?'
  },
  C25: {
    id: 'C25',
    title: 'Operador de Roberts 2×2',
    source: 'MIRA · Detecção de Bordas',
    description: 'Duas máscaras 2x2 compactas com derivadas calculadas nas direções diagonais de 45° e 135°.',
    guideQuestion: 'Por que Roberts é mais sensível a ruído do que Sobel?'
  },
  C27: {
    id: 'C27',
    title: 'Operador Laplaciano (2ª Derivada)',
    source: 'MIRA · Detecção de Bordas',
    description: 'Segunda derivada isotrópica invariante à rotação, gerando cruzamento por zero nas arestas e valores positivos/negativos.',
    guideQuestion: 'Qual o sinal correto de combinação entre a imagem original e o Laplaciano para aguçar arestas?'
  },
  C28: {
    id: 'C28',
    title: 'Máscara de Nitidez e High-Boost',
    source: 'MIRA · Aguçamento Espacial',
    description: 'Extrai detalhes finos subtraindo a versão suavizada (m = f - b) e soma à imagem original amplificada: g = f + k*m.',
    guideQuestion: 'O que acontece quando o fator k é igual a 1 (unsharp masking) versus k > 1 (high-boost)?'
  },
  C29: {
    id: 'C29',
    title: 'Bússola Direcional de Kirsch',
    source: 'MIRA · Detecção de Bordas',
    description: 'Aplica 8 máscaras direcionais (N, NW, W, SW, S, SE, E, NE) e atribui a cada pixel a maior resposta encontrada.',
    guideQuestion: 'Como identificar qual das 8 direções produziu a borda dominante em um pixel?'
  },
  C31: {
    id: 'C31',
    title: 'Máscaras Especiais & Relevo',
    source: 'MIRA · Casos de Teste',
    description: 'Testes de aguçamento paramétrico (TC-01 com c, d), relevo (TC-02 com h1 e h2) e máscaras h3 (soma +2) e h4 (soma -8).',
    guideQuestion: 'Por que a máscara h4 produz imagem preta na quantização direta sem offset?'
  }
};
