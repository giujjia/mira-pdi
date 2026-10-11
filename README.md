# MIRA — Matemática de Imagens: Representação e Aprendizagem
> Laboratório Didático e Interativo de Processamento Digital de Imagens (PDI)  
> **Universidade Federal de Rondônia (UNIR)** • Avaliação Individual AV1 • 2026  
> **Discente:** Projeto Individual de PDI

---

## 📖 Visão Geral do Projeto

O **MIRA** é um ambiente interativo de laboratório voltado para a compreensão visual, algorítmica e matemática rigorosa das operações fundamentais de Processamento Digital de Imagens no domínio espacial. 

Projetado sob uma estética acadêmica limpa e minimalista (**Light Mode** em tons de slate, branco e verde esmeralda), o sistema organiza o laboratório em **10 módulos práticos**, integrando um visualizador com divisor interativo (*split slider*) e o card contextual **"Entenda este Pixel"**, que decompõe a matemática exata de qualquer pixel clicado.

---

## ⚡ Princípios e Invariantes Numéricos

1. **Zero Caixas-Pretas (Black-Box Free):**
   - Nenhuma biblioteca de processamento de imagens (como OpenCV, Jimp ou Canvas Filters) foi utilizada para operações de PDI.
   - Todos os algoritmos (convolução 2D, histograma, transformações pontuais, filtros espaciais e derivadas) foram implementados do zero em **TypeScript puro**.
   - A API Canvas HTML5 é empregada estritamente para extração inicial do `ImageData` e renderização em tela.

2. **Precisão Numérica de Ponto Flutuante:**
   - Imagens são mantidas internamente em buffers matriciais de ponto flutuante assinado (`Float32Array`).
   - A quantização $Q(v) = \min(255, \max(0, \text{round}(v)))$ é postergada até o momento da renderização em tela ou exportação PNG, evitando perda precoce de precisão ou truncamento em derivadas negativas.

3. **Convolução Bidimensional Formal (com rotação de 180°):**
   - Conforme a teoria formal de sinais, a convolução espacial gira o núcleo em 180° ($w(-s, -t)$) antes do produto interno, distinguindo-se matematicamente da correlação cruzada.

4. **Tratamento de Borda:**
   - Suporte transparente a **Replicação de Borda** (*Clamp-to-edge*) e **Zero-Padding**.

---

## 🧭 Estrutura dos 10 Módulos de PDI

| Módulo | Conteúdo e Operações | Domínio Matemático |
|---|---|---|
| **01. Imagem como Matriz** | Grade bidimensional, amostragem, quantização uint8 e padrões sintéticos (degrau, gradiente, impulso). | Representação Matricial Discreta |
| **02. Negativo & Limiar** | Negativo $s = 255 - r$, Limiarização binária $r \ge T$, Alargamento de contraste com preservação de escala. | Transformações Pontuais Lineares e Binárias |
| **03. Curvas Gamma & Log** | Transformação de potência $s = 255 \cdot c \cdot (r/255)^\gamma$ e logarítmica $s = c \cdot \ln(1+r)$. | Transformações Não-Lineares de Intensidade |
| **04. Dissolve & Mistura** | Dissolve uniforme $h = (1-t)f + tg$ e mapas espaciais não-uniformes (horizontal, vertical, diagonal). | Operações Algébricas Ponderadas |
| **05. Histograma & Equaliz.** | Cálculo de frequências $H[r]$, probabilidade acumulada (CDF), Look-Up Table (LUT) e equalização global. | Estatística Global e Função de Distribuição Acumulada |
| **06. Média vs Mediana** | Filtro da média (linear) vs mediana (estatística de ordem para ruído impulsivo) e contraste adaptativo local. | Filtragem Espacial Passa-Baixas |
| **07. Bordas: Sobel & Roberts** | Gradiente espacial 1ª ordem: Sobel 3×3 ($G_x, G_y, \|\nabla f\|$), Roberts 2×2 diagonal e Laplaciano de 2ª ordem. | Operadores Diferenciais de 1ª e 2ª Ordem |
| **08. Aguçamento & High-Boost** | Laplaciano ($g = f \mp L(f)$) e máscara de nitidez / High-Boost ($g = f + k \cdot m$). | Realce de Altas Frequências e Unsharp Masking |
| **09. Convolução 2D Genérica** | Editor matricial dinâmico com inserção de pesos arbitrários, offset ajustável e indicador visual de rotação 180°. | Filtragem Linear no Domínio Espacial |
| **10. Casos Obrigatórios AV1** | Execução e validação dos casos de teste normativos da prova (TC-01, TC-02, TC-03). | Avaliação de Respostas Convolucionais |

---

## 🧪 Casos de Teste Obrigatórios da AV1

- **TC-01 — Aguçamento Paramétrico:**
  $$\begin{bmatrix} -c & -c & -c \\ -c & 8c+d & -c \\ -c & -c & -c \end{bmatrix}$$
  Soma dos coeficientes igual a $d$. Demonstra conservação do nível médio em regiões homogêneas.

- **TC-02 — Efeito de Relevo (Emboss):**
  $$h_1 = \begin{bmatrix} 0 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & -1 \end{bmatrix}, \quad h_2 = \begin{bmatrix} 0 & 0 & 2 \\ 0 & -1 & 0 \\ -1 & 0 & 0 \end{bmatrix}$$
  Ambas com soma zero. O MIRA permite ajustar o offset (recomendado 128) para evidenciar a textura sombreada sem saturação em zero.

- **TC-03 — Máscaras de Borda (Caso Especial Acadêmico $h_4$):**
  $$h_3 = \begin{bmatrix} -1 & -1 & 0 \\ 1 & 0 & 1 \\ 0 & 1 & 1 \end{bmatrix} \quad (\Sigma = +2), \qquad h_4 = \begin{bmatrix} 0 & -1 & 0 \\ -1 & -4 & -1 \\ 0 & -1 & 0 \end{bmatrix} \quad (\Sigma = -8)$$
  > **Nota de Arguição:** Como $h_4$ possui todos os coeficientes não-positivos ($\Sigma = -8$) e o offset padrão é zero, a saída teórica para qualquer imagem não-negativa é menor ou igual a zero. Em formato uint8 tradicional, a imagem satura completamente em preto ($0$). O MIRA preserva o buffer com sinal e explica exatamente esse comportamento no inspetor "Entenda este Pixel".

---

## 🚀 Como Executar

### Pré-requisitos
- Node.js (v18+)
- npm ou pnpm

### 1. Instalação das Dependências
```bash
npm install
```

### 2. Executar em Modo de Desenvolvimento
```bash
npm run dev
```
Acesse a aplicação no navegador em `http://localhost:5173`.

### 3. Executar a Suíte de Testes Automatizados
```bash
npm test
```
Executa **23 testes unitários** com 100% de cobertura sobre os núcleos matemáticos (`vitest`).

### 4. Compilar para Produção (GitHub Pages / Deploy Estático)
```bash
npm run build
```
Os arquivos otimizados serão gerados na pasta `dist/` com caminhos relativos prontos para hospedagem.

---

## 📁 Estrutura de Arquivos

```
mira-pdi/
├── index.html                 # Ponto de montagem HTML5 e tipografia Inter/JetBrains
├── vite.config.ts             # Configuração do Vite e caminhos relativos
├── tailwind.config.js         # Configurações do Tailwind CSS
├── public/
│   ├── favicon.svg            # Favicon temático MIRA
│   └── examples/              # Imagens de referência (Cameraman, Lena, Bárbara, Mamografia, etc.)
├── src/
│   ├── main.tsx               # Entrada do React 18
│   ├── App.tsx                # Orquestrador de estado e layout principal
│   ├── index.css              # Regras base de estilo
│   ├── core/                  # Motores matemáticos puros (Zero bibliotecas externas)
│   │   ├── types.ts           # Interfaces GrayImage, Kernel2D, PixelExplanation
│   │   ├── matrix.ts          # Alocação, quantização, conversão ImageData e bordas
│   │   ├── pointwise.ts       # Negativo, limiar, contraste, gamma e log
│   │   ├── dissolve.ts        # Mistura linear e mapas de pesos
│   │   ├── histogram.ts       # Frequências, CDF, expansão e equalização global
│   │   ├── spatial.ts         # Média, mediana e contraste adaptativo local
│   │   ├── convolution.ts     # Convolução 2D com rotação 180° e offset
│   │   ├── edges.ts           # Sobel, Roberts, Kirsch e Laplaciano
│   │   ├── sharpening.ts      # Aguçamento laplaciano e High-Boost
│   │   └── mandatoryTests.ts  # Casos normativos TC-01, TC-02 e TC-03
│   ├── education/             # Camada didática e catálogo conceitual
│   │   ├── catalog.ts         # Catálogo dos conceitos normativos de PDI
│   │   ├── explainer.ts       # Avaliador matemático "Entenda este Pixel"
│   │   └── slides.ts          # Slides conceituais interativos
│   └── components/            # Interface em React (Tailwind CSS puro)
│       ├── Sidebar.tsx        # Navegação pelos 11 módulos
│       ├── SplitCanvas.tsx    # Divisor Antes/Depois com retículo e clique
│       ├── PixelInspector.tsx # Card com matriz 3x3, fórmula e cálculo passo a passo
│       ├── HistogramPanel.tsx # Gráficos SVG interativos de frequências, CDF e LUT
│       ├── MaskEditor.tsx     # Editor de convoluções arbitrárias
│       ├── TeachingSlide.tsx  # Demonstração didática interativa
│       └── ExportModal.tsx    # Exportação reproduzível (PNG + JSON)
└── tests/                     # 23 Testes unitários com Vitest
    ├── matrix.test.ts
    ├── pointwise.test.ts
    ├── spatial.test.ts
    ├── convolution.test.ts
    └── mandatory.test.ts
```

---

## 🏛️ Conformidade com os Requisitos da Avaliação (AV1)

- **RF-01:** Representação matricial 8 bits com conversão precisa de canais coloridos.
- **RF-02 a RF-09:** Suporte completo e fidedigno a todas as transformações de intensidade, operações aritméticas e filtros espaciais lecionados.
- **RF-10:** Três casos de testes obrigatórios com parâmetros fiéis às seções 2.1, 2.2 e 2.3.
- **RE-01 a RE-04:** Inspetor "Entenda este Pixel" com vizinhança real, fórmula explícita e quantização tardia.
- **RE-10:** Exportação de metadados em JSON para reprodutibilidade científica.
- **Arguição:** Guia didático cobrindo integralmente as 10 perguntas conceituais para obtenção da pontuação mínima de validação.

## Crédito do ícone

Cubo pixelado: Arthur Shlain, The Noun Project. Arquivo original fornecido: `public/noun_pixelart_98945.svg`. A versão `public/mira-cube.svg` adapta a cor e o enquadramento para a marca e o favicon. A licença não foi incluída no SVG; registrar seus termos antes da distribuição pública.
