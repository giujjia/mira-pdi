# MIRA: Matemática de Imagens, Representação e Aprendizagem

Aplicação interativa de Processamento Digital de Imagens (PDI), desenvolvida para a avaliação prática (AV1) da disciplina de PDI no curso de **Ciência da Computação** da **UNIR** (Universidade Federal de Rondônia), 2026.

**Acesso online:** [https://giujjia.github.io/mira-pdi/](https://giujjia.github.io/mira-pdi/)

## Sobre o Projeto

O **MIRA** é um software de computação visual e laboratório interativo criado com um objetivo de **tornar visível e auditável cada operação matemática que transforma uma imagem digital**.

Ao clicar em qualquer ponto da imagem, a ferramenta **"Entenda este Pixel"** exibe:
* As coordenadas $(x, y)$ e a intensidade original do pixel.
* A vizinhança matricial $3 \times 3$ ao redor dele.
* A fórmula algébrica aplicada com a substituição dos números reais.
* Os valores intermediários (mesmo quando dão negativos ou passam de 255) e a quantização final para 8 bits ($0 \dots 255$).

A interface conta com comparação lado a lado (*split slider*), imagens de teste (Lena, Cameraman, Barco, etc.), matrizes sintéticas e duas abas principais: **Laboratório** (para testar e ajustar parâmetros em tempo real) e **Fundamentação Teórica** (com os conceitos e referências de cada operação).


Toda a matemática reside na pasta **`src/core/`**, implementada em TypeScript, com matrizes alocadas diretamente em buffers numéricos de ponto flutuante assinado (`Float32Array`):

```
src/core/
├── matrix.ts          # Estrutura matricial, leitura e tratamento de bordas
├── pointwise.ts       # Operações pontuais: Negativo, Limiarização, Alargamento, Gamma e Log
├── dissolve.ts        # Mistura de imagens (Dissolve uniforme e não-uniforme)
├── histogram.ts       # Histograma, estatísticas globais e equalização por CDF
├── spatial.ts         # Filtros espaciais: Média, Mediana e Contraste Adaptativo Local
├── convolution.ts     # Convolução 2D genérica com rotação de 180° do kernel
├── edges.ts           # Detecção de bordas: Sobel, Roberts, Kirsch e Laplaciano
├── sharpening.ts      # Aguçamento Laplaciano e High-Boost (Unsharp Masking)
└── mandatoryTests.ts  # Casos de teste obrigatórios da avaliação (TC-01, TC-02, TC-03)
```



## Mapa das Fórmulas Implementadas

Tabela com a correspondência direta entre as operações teóricas e a implementação no código:

| Módulo | Conceito | Arquivo | Fórmula / Algoritmo |
|---|---|---|---|
| **Matriz 8 bits** | Espaço uint8 | `src/core/matrix.ts` | Alocação $W \times H$, acesso linear $(y \cdot W + x)$ e saturação $Q(v) = \min(255, \max(0, \text{round}(v)))$. |
| **Negativo** | Inversão de tons | `src/core/pointwise.ts` | $s = 255 - r$ |
| **Limiarização** | Binarização | `src/core/pointwise.ts` | $s = 255 \text{ se } r \ge T, \text{ senão } 0$ |
| **Alargamento** | Contraste linear | `src/core/pointwise.ts` | $s = \frac{s_{\max} - s_{\min}}{r_{\max} - r_{\min}} (r - r_{\min}) + s_{\min}$ |
| **Curva Gamma** | Lei da potência | `src/core/pointwise.ts` | $s = 255 \cdot c \cdot \left(\frac{r}{255}\right)^\gamma$ |
| **Logarítmica** | Compressão dinâmica | `src/core/pointwise.ts` | $s = c \cdot \ln(1 + r)$ |
| **Dissolve Uniforme** | Média ponderada | `src/core/dissolve.ts` | $h = (1 - t) \cdot f + t \cdot g, \quad 0 \le t \le 1$ |
| **Dissolve Não-Uniforme** | Mapa de pesos espacial | `src/core/dissolve.ts` | $h(x, y) = (1 - t(x, y)) \cdot f + t(x, y) \cdot g$, com rampas horizontal, vertical e diagonal. |
| **Histograma** | Frequência de tons | `src/core/histogram.ts` | Contagem $H[k]$, média $\mu = \frac{1}{N}\sum f$, variância $\sigma^2 = \frac{1}{N}\sum (f - \mu)^2$. |
| **Equalização** | Uniformização via CDF | `src/core/histogram.ts` | $s_k = \text{round}\left( \frac{255}{N} \sum_{j=0}^k H[j] \right)$ |
| **Filtro da Média** | Suavização linear | `src/core/spatial.ts` | Média aritmética dos vizinhos em janelas $3 \times 3$, $5 \times 5$ e $7 \times 7$. |
| **Filtro da Mediana** | Remoção de ruído | `src/core/spatial.ts` | Ordenação da vizinhança e seleção do elemento central (ideal para ruído sal e pimenta). |
| **Contraste Local** | Ganho adaptativo | `src/core/spatial.ts` | $g = \mu + \frac{c}{\sigma} (f - \mu)$, tratando com segurança o caso de desvio padrão zero ($\sigma = 0$). |
| **Convolução 2D** | Filtragem espacial | `src/core/convolution.ts` | Rotação formal de 180° do kernel antes do produto interno: $g = f * h + \text{offset}$. |
| **Sobel 3×3** | Bordas ortogonais | `src/core/edges.ts` | Gradientes $G_x$ e $G_y$, magnitude $|\nabla f| = \sqrt{G_x^2 + G_y^2}$. |
| **Roberts 2×2** | Bordas diagonais | `src/core/edges.ts` | Derivadas cruzadas $R_1$ e $R_2$, magnitude $|\nabla f| = \sqrt{R_1^2 + R_2^2}$. |
| **Kirsch** | Bordas direcionais | `src/core/edges.ts` | 8 máscaras em passos de 45°: resposta máxima $R = \max_{k=0..7} \{ f * K_k \}$. |
| **Laplaciano** | 2ª derivada | `src/core/edges.ts` | Operador diferencial de segunda ordem para realçar transições bruscas de intensidade. |
| **Aguçamento** | Realce de detalhes | `src/core/sharpening.ts` | Combina a imagem com o Laplaciano: $g = f - L$ (centro -4) ou $g = f + L$ (centro +4). |
| **High-Boost** | Unsharp masking | `src/core/sharpening.ts` | Gera máscara de detalhe $m = f - f_{\text{suave}}$ e soma amplificada: $g = f + k \cdot m$. |

---

## Casos de Teste Obrigatórios (AV1)

Para a avaliação prática da convolução, foram implementadas as máscaras exigidas no roteiro da disciplina (em `src/core/mandatoryTests.ts`):

* **TC-01: Aguçamento Paramétrico**
  $$\begin{bmatrix} -c & -c & -c \\ -c & 8c+d & -c \\ -c & -c & -c \end{bmatrix}$$
  A soma dos coeficientes é exatamente $d$. Quando $d = 1$, a imagem preserva o nível de cinza original em regiões lisas e realça transições de borda.

* **TC-02: Efeito de Relevo (Emboss)**
  $$h_1 = \begin{bmatrix} 0 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & -1 \end{bmatrix}, \qquad h_2 = \begin{bmatrix} 0 & 0 & 2 \\ 0 & -1 & 0 \\ -1 & 0 & 0 \end{bmatrix}$$
  Ambas as máscaras possuem soma zero ($\Sigma = 0$). Em áreas planas o resultado numérico é zero; com o acréscimo de um offset (como 128), transições diagonais criam um efeito visual de relevo sombreado.

* **TC-03: Máscaras Especiais de Borda**
  $$h_3 = \begin{bmatrix} -1 & -1 & 0 \\ 1 & 0 & 1 \\ 0 & 1 & 1 \end{bmatrix} \quad (\Sigma = +2), \qquad h_4 = \begin{bmatrix} 0 & -1 & 0 \\ -1 & -4 & -1 \\ 0 & -1 & 0 \end{bmatrix} \quad (\Sigma = -8)$$
  Na máscara $h_4$, todos os pesos são negativos (soma $-8$). Sem offset, qualquer entrada positiva produz valores negativos, saturando a imagem inteira em preto no formato 8 bits tradicional. O MIRA mantém os valores reais no inspetor para permitir analisar exatamente esse comportamento na arguição.



## Como Executar Localmente

### Pré-requisitos
* Node.js (versão 18 ou superior)
* npm

### 1. Clonar e instalar dependências
```bash
git clone https://github.com/giujjia/mira-pdi.git
cd mira-pdi
npm install
```

### 2. Iniciar em modo de desenvolvimento
```bash
npm run dev
```
A aplicação abrirá no navegador em `http://localhost:3000` (ou porta configurada pelo Vite).

### 3. Rodar os testes automatizados
```bash
npm test
```
Executa a suíte de **43 testes unitários** via Vitest, testando operações pontuais, espaciais, bordas, convolução e casos limite.

### 4. Gerar build de produção
```bash
npm run build
```

---

## Estrutura do Código

```
mira-pdi/
├── public/
│   ├── mira-cube.svg      # Logo oficial
│   └── examples/          # Banco de imagens de teste (Cameraman, Lena, Barco, etc.)
├── src/
│   ├── core/              # Implementações matemáticas em TypeScript
│   ├── components/        # Componentes de UI (Canvas, PixelInspector, Sidebar, etc.)
│   ├── education/         # Textos didáticos e passo a passo algébrico
│   ├── App.tsx            # Componente central e gerenciador de estado
│   └── main.tsx           # Ponto de montagem React
└── tests/                 # testes unitários com Vitest
```

## Identificação

* **Instituição:** Fundação Universidade Federal de Rondônia (UNIR)
* **Curso:** Bacharelado em Ciência da Computação
* **Disciplina:** Processamento Digital de Imagens (PDI) : 2026
* **Professor:** Lucas Marques da Cunha
* **Avaliação:** AV1 (Sistema Prático e Arguição)
