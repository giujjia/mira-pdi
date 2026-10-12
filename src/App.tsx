import React, { useEffect, useState, useMemo } from 'react';
import { Sidebar, ModuleKey, NAV_ITEMS } from './components/Sidebar';
import { SplitCanvas } from './components/SplitCanvas';
import { PixelInspector } from './components/PixelInspector';
import { HistogramPanel } from './components/HistogramPanel';
import { MaskEditor } from './components/MaskEditor';
import { ExportModal } from './components/ExportModal';
import { TeachingSlide } from './components/TeachingSlide';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ModuleControls } from './components/ModuleControls';

import { GrayImage, BorderPolicy, PixelExplanation, Kernel2D } from './core/types';
import { cloneImage, fromImageData, createSyntheticPattern, getPixel } from './core/matrix';
import { negative, threshold, contrastStretching, gammaTransform, logTransform } from './core/pointwise';
import { dissolveUniform, dissolveNonUniform } from './core/dissolve';
import { histogramEqualization, histogramExpansion } from './core/histogram';
import { meanFilter, medianFilter, adaptiveContrast } from './core/spatial';
import { sobelFilter, robertsFilter, kirschFilter, laplacianFilter } from './core/edges';
import { laplacianSharpen, highBoostFilter } from './core/sharpening';
import { runTC01Sharpening, runTC02Emboss, runTC03EdgeDetection } from './core/mandatoryTests';
import { convolve2D, createKernel } from './core/convolution';
import { explainPixel, ExplainParams, OperationId } from './education/explainer';
import { CURRICULAR_CATALOG } from './education/catalog';

const PRESET_IMAGES = [
  { id: 'cameraman', label: 'Cameraman (256×256) · Contraste e Segmentação', path: './examples/cameraman.png' },
  { id: 'lena', label: 'Lena (256×256) · Texturas e Frequências', path: './examples/lena_256.png' },
  { id: 'barbara', label: 'Bárbara (256×256) · Altas Frequências e Listras', path: './examples/barbara.png' },
  { id: 'lua', label: 'Lua (Textbook) · Aguçamento e Laplaciano', path: './examples/lua.jpg' },
  { id: 'mamografia', label: 'Mamografia · Baixo Contraste e Negativo', path: './examples/mamografia.png' },
  { id: 'fratura', label: 'Fratura Óssea · Radiografia e High-Boost', path: './examples/fratura.png' },
  { id: 'noisy_fingerprint', label: 'Digital Ruidosa · Ruído Sal-e-Pimenta', path: './examples/noisy_fingerprint.png' },
  { id: 'synthetic_gradient', label: 'Sintético: Gradiente Linear (0..255)', path: 'synthetic:gradient' },
  { id: 'synthetic_step', label: 'Sintético: Degrau Binário (Borda Pura)', path: 'synthetic:step' },
  { id: 'synthetic_impulse', label: 'Sintético: Impulso Unitário (PSF)', path: 'synthetic:impulse' }
];

const SYNTHETIC_TYPES = ['gradient', 'step', 'impulse', 'noise', 'constant'] as const;
type SyntheticPatternType = typeof SYNTHETIC_TYPES[number];

function isSyntheticType(val: string): val is SyntheticPatternType {
  return (SYNTHETIC_TYPES as readonly string[]).includes(val);
}

/**
 * Carrega e converte imagem para GrayImage garantindo um teto de resolução seguro (1024x1024)
 * para evitar congelamento da thread de renderização em imagens massivas.
 */
function fetchGrayImage(
  path: string,
  onSuccess: (gray: GrayImage) => void,
  onError?: () => void
): void {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const MAX_DIM = 1024;
    let targetW = img.width;
    let targetH = img.height;

    if (targetW > MAX_DIM || targetH > MAX_DIM) {
      const scale = Math.min(MAX_DIM / targetW, MAX_DIM / targetH);
      targetW = Math.max(1, Math.round(targetW * scale));
      targetH = Math.max(1, Math.round(targetH * scale));
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, targetW, targetH);
      const imgData = ctx.getImageData(0, 0, targetW, targetH);
      onSuccess(fromImageData(imgData));
    }
  };
  img.onerror = () => {
    if (onError) onError();
  };
  img.src = path;
}

export const App: React.FC = () => {
  // Navegação e Layout
  const [activeModule, setActiveModule] = useState<ModuleKey>('pointwise');
  const [activeTab, setActiveTab] = useState<'lab' | 'theory'>('lab');
  const [viewMode, setViewMode] = useState<'split' | 'sideBySide' | 'beforeOnly' | 'afterOnly'>('split');
  const [borderPolicy, setBorderPolicy] = useState<BorderPolicy>('replication');
  const [selectedCoord, setSelectedCoord] = useState<{ x: number; y: number } | null>({ x: 128, y: 128 });
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Imagens
  const [selectedPreset, setSelectedPreset] = useState<string>('cameraman');
  const [primaryImage, setPrimaryImage] = useState<GrayImage>(() => createSyntheticPattern('gradient', 256, 256));
  const [secondaryImage, setSecondaryImage] = useState<GrayImage>(() => createSyntheticPattern('step', 256, 256));
  const [manualProcessedImage, setManualProcessedImage] = useState<GrayImage | null>(null);

  // Convolução Personalizada
  const [maskEditorVersion, setMaskEditorVersion] = useState(0);
  const [customKernel, setCustomKernel] = useState<Kernel2D | null>(null);
  const [customOffset, setCustomOffset] = useState<number>(0);
  const [convolutionRightTab, setConvolutionRightTab] = useState<'both' | 'mask' | 'pixel'>('both');

  // Parâmetros de Módulos
  // Módulo 02: Pointwise
  const [pointwiseOp, setPointwiseOp] = useState<'negative' | 'threshold' | 'stretching'>('negative');
  const [thresholdVal, setThresholdVal] = useState<number>(128);
  const [smin, setSmin] = useState<number>(0);
  const [smax, setSmax] = useState<number>(255);

  // Módulo 03: Gamma & Log
  const [gammaOp, setGammaOp] = useState<'gamma' | 'log'>('gamma');
  const [gammaVal, setGammaVal] = useState<number>(0.5);
  const [logConst, setLogConst] = useState<number>(1.0);

  // Módulo 04: Dissolve
  const [dissolveMode, setDissolveMode] = useState<'uniform' | 'horizontal' | 'vertical' | 'diagonal'>('uniform');
  const [dissolveT, setDissolveT] = useState<number>(0.5);

  // Módulo 05: Histograma
  const [histogramOp, setHistogramOp] = useState<'equalize' | 'expand' | 'original'>('equalize');
  const [histogramSelectedBin, setHistogramSelectedBin] = useState<number>(128);
  const [histogramRightTab, setHistogramRightTab] = useState<'both' | 'charts' | 'pixel'>('both');

  // Módulo 06: Smoothing
  const [smoothingOp, setSmoothingOp] = useState<'mean' | 'median' | 'adaptive'>('mean');
  const [smoothingSize, setSmoothingSize] = useState<number>(3);
  const [adaptiveC, setAdaptiveC] = useState<number>(1.0);

  // Módulo 07: Edges
  const [edgeOp, setEdgeOp] = useState<'sobel' | 'roberts' | 'kirsch' | 'laplacian'>('sobel');
  const [robertsComp, setRobertsComp] = useState<'magnitude' | 'r1' | 'r2'>('magnitude');
  const [kirschComp, setKirschComp] = useState('max');
  const [sharpenView, setSharpenView] = useState<'original' | 'laplacian' | 'result'>('result');
  const [sobelComp, setSobelComp] = useState<'magnitude' | 'gx' | 'gy'>('magnitude');

  // Módulo 08: Sharpening
  const [sharpenOp, setSharpenOp] = useState<'laplacian' | 'highBoost'>('laplacian');
  const [laplacianMode, setLaplacianMode] = useState<'centerNegative' | 'centerPositive'>('centerNegative');
  const [highBoostK, setHighBoostK] = useState<number>(1.5);
  const highBoostBlurSize = 3;

  // Módulo 10: Mandatory AV1
  const [mandatoryTC, setMandatoryTC] = useState<'TC-01' | 'TC-02' | 'TC-03'>('TC-01');
  const [tc01C, setTc01C] = useState<number>(1);
  const [tc01D, setTc01D] = useState<number>(1);
  const [tc01Offset, setTc01Offset] = useState<number>(0);
  const [tc02Variant, setTc02Variant] = useState<'h1' | 'h2'>('h1');
  const [tc02Offset, setTc02Offset] = useState<number>(128);
  const [tc03Variant, setTc03Variant] = useState<'h3' | 'h4'>('h3');
  const [tc03Offset, setTc03Offset] = useState<number>(0);

  // Carregamento de imagens
  const loadImage = (path: string) => {
    setManualProcessedImage(null);
    if (path.startsWith('synthetic:')) {
      const rawType = path.split(':')[1];
      const type = isSyntheticType(rawType) ? rawType : 'gradient';
      setPrimaryImage(createSyntheticPattern(type, 256, 256));
      return;
    }

    fetchGrayImage(
      path,
      (gray) => setPrimaryImage(gray),
      () => {
        console.warn(`Falha ao carregar ${path}, gerando padrão sintético fallback.`);
        setPrimaryImage(createSyntheticPattern('gradient', 256, 256));
      }
    );
  };

  const loadSecondaryImage = (path: string) => {
    fetchGrayImage(path, (gray) => setSecondaryImage(gray));
  };

  useEffect(() => {
    loadImage('./examples/cameraman.png');
    loadSecondaryImage('./examples/lena_256.png');
  }, []);

  // Limpa imagem manual ao alternar módulo
  const handleSelectModule = (key: ModuleKey) => {
    setActiveModule(key);
    setManualProcessedImage(null);
  };

  // Restaura parâmetros do módulo atual para o estado padrão (Heurística de Nielsen)
  const resetCurrentOperation = () => {
    setSelectedCoord({ x: 128, y: 128 });
    setViewMode('split');
    setSelectedPreset('cameraman');
    loadImage('./examples/cameraman.png');
    setBorderPolicy('replication');

    setPointwiseOp('negative');
    setThresholdVal(128);
    setSmin(0);
    setSmax(255);
    setGammaOp('gamma');
    setGammaVal(0.5);
    setLogConst(1.0);
    setDissolveMode('uniform');
    setDissolveT(0.5);
    setHistogramOp('equalize');
    setHistogramSelectedBin(128);
    setSmoothingOp('mean');
    setSmoothingSize(3);
    setAdaptiveC(1.0);
    setEdgeOp('sobel');
    setSobelComp('magnitude');
    setRobertsComp('magnitude'); setKirschComp('max'); setSharpenView('result');
    setMaskEditorVersion(v => v + 1);
    setSharpenOp('laplacian');
    setLaplacianMode('centerNegative');
    setHighBoostK(1.5);
    setMandatoryTC('TC-01');
    setTc01C(1);
    setTc01D(1);
    setTc01Offset(0);
    setTc02Variant('h1');
    setTc02Offset(128);
    setTc03Variant('h3');
    setTc03Offset(0);
    setCustomKernel(null);
    setCustomOffset(0);
    setManualProcessedImage(null);
  };

  // Pipeline de Processamento como ESTADO DERIVADO (useMemo)
  const pipelineProcessedImage = useMemo<GrayImage>(() => {
    if (!primaryImage || primaryImage.width === 0) return primaryImage;

    switch (activeModule) {
      case 'matrix':
        return cloneImage(primaryImage);

      case 'pointwise':
        if (pointwiseOp === 'negative') return negative(primaryImage);
        if (pointwiseOp === 'threshold') return threshold(primaryImage, thresholdVal);
        return contrastStretching(primaryImage, smin, smax);

      case 'gamma':
        if (gammaOp === 'gamma') return gammaTransform(primaryImage, gammaVal, 1.0);
        return logTransform(primaryImage, logConst === 1.0 ? undefined : logConst * (255 / Math.log(256)));

      case 'dissolve':
        if (
          secondaryImage &&
          secondaryImage.width === primaryImage.width &&
          secondaryImage.height === primaryImage.height
        ) {
          return dissolveMode === 'uniform'
            ? dissolveUniform(primaryImage, secondaryImage, dissolveT)
            : dissolveNonUniform(primaryImage, secondaryImage, dissolveMode);
        }
        return primaryImage;

      case 'histogram':
        if (histogramOp === 'expand') return histogramExpansion(primaryImage);
        if (histogramOp === 'original') return primaryImage;
        return histogramEqualization(primaryImage).result;

      case 'smoothing':
        if (smoothingOp === 'mean') return meanFilter(primaryImage, smoothingSize, borderPolicy);
        if (smoothingOp === 'median') return medianFilter(primaryImage, smoothingSize, borderPolicy);
        return adaptiveContrast(primaryImage, smoothingSize, adaptiveC, borderPolicy);

      case 'edges':
        if (edgeOp === 'sobel') {
          const s = sobelFilter(primaryImage, borderPolicy);
          return sobelComp === 'magnitude' ? s.magnitude : sobelComp === 'gx' ? s.gx : s.gy;
        }
        if (edgeOp === 'roberts') return robertsFilter(primaryImage, borderPolicy)[robertsComp];
        if (edgeOp === 'kirsch') { const k = kirschFilter(primaryImage, borderPolicy); return kirschComp === 'max' ? k.maxResponse : k.directionResponses[Number(kirschComp)]; }
        return laplacianFilter(primaryImage, 'centerNegative4', borderPolicy);

      case 'sharpening':
        if (sharpenOp === 'laplacian') return sharpenView === 'original' ? primaryImage : laplacianSharpen(primaryImage, laplacianMode, borderPolicy)[sharpenView];
        return highBoostFilter(primaryImage, highBoostK, highBoostBlurSize, borderPolicy).result;

      case 'mandatory':
        if (mandatoryTC === 'TC-01') return runTC01Sharpening(primaryImage, tc01C, tc01D, tc01Offset, borderPolicy).output;
        if (mandatoryTC === 'TC-02') return runTC02Emboss(primaryImage, tc02Variant, tc02Offset, borderPolicy).output;
        return runTC03EdgeDetection(primaryImage, tc03Variant, tc03Offset, borderPolicy).output;

      case 'convolution':
        return convolve2D(
          primaryImage,
          customKernel ?? createKernel([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]]),
          customOffset,
          borderPolicy
        );

      default:
        return primaryImage;
    }
  }, [
    activeModule,
    primaryImage,
    secondaryImage,
    pointwiseOp,
    thresholdVal,
    smin,
    smax,
    gammaOp,
    gammaVal,
    logConst,
    dissolveMode,
    dissolveT,
    histogramOp,
    smoothingOp,
    smoothingSize,
    adaptiveC,
    edgeOp,
    sobelComp, robertsComp, kirschComp, sharpenView,
    sharpenOp,
    laplacianMode,
    highBoostK,
    mandatoryTC,
    tc01C,
    tc01D,
    tc01Offset,
    tc02Variant,
    tc02Offset,
    tc03Variant,
    tc03Offset,
    customKernel,
    customOffset,
    borderPolicy
  ]);

  const processedImage = manualProcessedImage ?? pipelineProcessedImage;

  // Explicação Pedagógica "Entenda este Pixel"
  const currentExplanation = useMemo<PixelExplanation | null>(() => {
    if (!selectedCoord || !primaryImage || primaryImage.width === 0) return null;
    const { x, y } = selectedCoord;
    if (x < 0 || x >= primaryImage.width || y < 0 || y >= primaryImage.height) return null;

    let opId: OperationId = 'matrix';
    let p: ExplainParams = {};

    switch (activeModule) {
      case 'matrix':
        opId = 'matrix';
        break;
      case 'pointwise':
        if (pointwiseOp === 'negative') {
          opId = 'negative';
        } else if (pointwiseOp === 'threshold') {
          opId = 'threshold';
          p = { T: thresholdVal };
        } else {
          opId = 'stretching';
          p = { smin, smax };
        }
        break;
      case 'gamma':
        if (gammaOp === 'gamma') {
          opId = 'gamma';
          p = { gamma: gammaVal, c: 1.0 };
        } else {
          opId = 'log';
          p = { c: logConst * (255 / Math.log(256)) };
        }
        break;
      case 'dissolve':
        opId = 'dissolve';
        p = {
          t: dissolveT,
          dissolveMode,
          secondaryVal: secondaryImage ? getPixel(secondaryImage, x, y, borderPolicy) : 128
        };
        break;
      case 'histogram':
        opId = 'histogram';
        p = { histogramMode: histogramOp };
        break;
      case 'smoothing':
        if (smoothingOp === 'mean') {
          opId = 'mean';
          p = { size: smoothingSize };
        } else if (smoothingOp === 'median') {
          opId = 'median';
          p = { size: smoothingSize };
        } else {
          opId = 'adaptive';
          p = { size: smoothingSize, c: adaptiveC };
        }
        break;
      case 'edges':
        if (edgeOp === 'sobel') {
          opId = 'sobel';
          p = { component: sobelComp === 'magnitude' ? 'mag' : sobelComp };
        } else if (edgeOp === 'roberts') {
          opId = 'roberts'; p = { component: robertsComp };
        } else if (edgeOp === 'kirsch') {
          opId = 'kirsch'; p = { component: kirschComp };
        } else {
          opId = 'laplacian';
        }
        break;
      case 'sharpening':
        if (sharpenOp === 'laplacian') {
          opId = 'sharpenLaplacian';
          p = { mode: laplacianMode, component: sharpenView };
        } else {
          opId = 'highBoost';
          p = { k: highBoostK };
        }
        break;
      case 'convolution':
        opId = 'convolution';
        p = {
          kernel: customKernel ?? createKernel([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]]),
          offset: customOffset
        };
        break;
      case 'mandatory':
        if (mandatoryTC === 'TC-01') {
          opId = 'tc01';
          p = { c: tc01C, d: tc01D, offset: tc01Offset };
        } else if (mandatoryTC === 'TC-02') {
          opId = 'tc02';
          p = { variant: tc02Variant, offset: tc02Offset };
        } else {
          opId = 'tc03';
          p = { variant: tc03Variant, offset: tc03Offset };
        }
        break;
      default:
        opId = 'matrix';
    }

    try {
      return explainPixel(primaryImage, x, y, opId, p, borderPolicy);
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [
    selectedCoord,
    primaryImage,
    secondaryImage,
    activeModule,
    pointwiseOp,
    thresholdVal,
    smin,
    smax,
    gammaOp,
    gammaVal,
    logConst,
    dissolveMode,
    dissolveT,
    histogramOp,
    smoothingOp,
    smoothingSize,
    adaptiveC,
    edgeOp,
    sobelComp, robertsComp, kirschComp, sharpenView,
    sharpenOp,
    laplacianMode,
    highBoostK,
    customKernel,
    customOffset,
    mandatoryTC,
    tc01C,
    tc01D,
    tc01Offset,
    tc02Variant,
    tc02Offset,
    tc03Variant,
    tc03Offset,
    borderPolicy
  ]);

  // Informações Curriculares
  const activeLessonInfo = useMemo(() => {
    switch (activeModule) {
      case 'matrix':
        return CURRICULAR_CATALOG.C02;
      case 'pointwise':
        return pointwiseOp === 'negative'
          ? CURRICULAR_CATALOG.C10
          : pointwiseOp === 'threshold'
          ? CURRICULAR_CATALOG.C11
          : CURRICULAR_CATALOG.C12;
      case 'gamma':
        return gammaOp === 'gamma' ? CURRICULAR_CATALOG.C14 : CURRICULAR_CATALOG.C13;
      case 'dissolve':
        return dissolveMode === 'uniform' ? CURRICULAR_CATALOG.C07 : CURRICULAR_CATALOG.C08;
      case 'histogram':
        return histogramOp === 'expand'
          ? CURRICULAR_CATALOG.C16
          : histogramOp === 'original'
          ? CURRICULAR_CATALOG.C15
          : CURRICULAR_CATALOG.C17;
      case 'smoothing':
        return smoothingOp === 'mean'
          ? CURRICULAR_CATALOG.C22
          : smoothingOp === 'median'
          ? CURRICULAR_CATALOG.C23
          : CURRICULAR_CATALOG.C18;
      case 'edges':
        return edgeOp === 'sobel'
          ? CURRICULAR_CATALOG.C26
          : edgeOp === 'roberts'
          ? CURRICULAR_CATALOG.C25
          : edgeOp === 'kirsch'
          ? CURRICULAR_CATALOG.C29
          : CURRICULAR_CATALOG.C27;
      case 'sharpening':
        return sharpenOp === 'laplacian' ? CURRICULAR_CATALOG.C27 : CURRICULAR_CATALOG.C28;
      case 'convolution':
        return CURRICULAR_CATALOG.C20;
      case 'mandatory':
        return CURRICULAR_CATALOG.C31;
    }
  }, [activeModule, pointwiseOp, gammaOp, dissolveMode, histogramOp, smoothingOp, edgeOp, sharpenOp]);

  const activeCategory = useMemo(() => {
    switch (activeModule) {
      case 'matrix':
      case 'dissolve':
        return 'Representação Digital';
      case 'pointwise':
      case 'gamma':
      case 'histogram':
        return 'Domínio Pontual';
      default:
        return 'Filtragem Espacial';
    }
  }, [activeModule]);

  const activeEquation = useMemo(() => {
    switch (activeModule) {
      case 'matrix':
        return 'f(x, y) = intensidade ∈ [0, 255]';
      case 'pointwise':
        return pointwiseOp === 'negative'
          ? 's = 255 - r'
          : pointwiseOp === 'threshold'
          ? 's = (r ≥ T) ? 255 : 0'
          : 's = round((r - r_min) / (r_max - r_min) · 255)';
      case 'gamma':
        return gammaOp === 'gamma'
          ? 's = 255 · (r / 255)^γ'
          : 's = c · ln(1 + r)';
      case 'dissolve':
        return 'h(x, y) = (1 - t) · f + t · g';
      case 'histogram':
        return histogramOp === 'expand'
          ? 's = round(255 · (r - r_min) / (r_max - r_min))'
          : histogramOp === 'original'
          ? 's = r (Distribuição H[r])'
          : 's = round((255 / N) · ∑ H[k])';
      case 'smoothing':
        return smoothingOp === 'mean'
          ? 's = (1 / 9) · ∑ x_i  (Média)'
          : smoothingOp === 'median'
          ? 's = med(Vizinhança(r))'
          : 's = m + c · σ';
      case 'edges':
        return edgeOp === 'sobel'
          ? '|∇f| = √(Gx² + Gy²)'
          : edgeOp === 'roberts'
          ? '|∇f| = √(R1² + R2²)'
          : '|∇f| = max_k(f * H_k)';
      case 'sharpening':
        return sharpenOp === 'laplacian'
          ? 'g(x, y) = f(x, y) - ∇²f(x, y)'
          : 'g = f + k · (f - f_borrada)';
      case 'convolution':
        return 'g(x, y) = ∑∑ f(x-s, y-t) · h(s, t) + off';
      case 'mandatory':
        return mandatoryTC === 'TC-01'
          ? 'g = c · f + d · (f * Laplaciano) + off'
          : mandatoryTC === 'TC-02'
          ? 'g = f * h_emboss + 128'
          : 'g = f * h_assimétrico + off';
    }
  }, [
    activeModule,
    pointwiseOp,
    gammaOp,
    histogramOp,
    smoothingOp,
    edgeOp,
    sharpenOp,
    mandatoryTC
  ]);

  const hasModuleControls = useMemo(() => {
    return (
      (activeModule === 'pointwise' && (pointwiseOp === 'threshold' || pointwiseOp === 'stretching')) ||
      activeModule === 'gamma' ||
      activeModule === 'dissolve' ||
      activeModule === 'smoothing' ||
      (activeModule === 'edges' && edgeOp === 'sobel') ||
      activeModule === 'sharpening' ||
      activeModule === 'mandatory'
    );
  }, [activeModule, pointwiseOp, edgeOp]);

  const responseLabel = activeModule === 'edges'
    ? edgeOp === 'sobel' ? (sobelComp === 'magnitude' ? 'Magnitude Sobel' : sobelComp.toUpperCase())
      : edgeOp === 'roberts' ? (robertsComp === 'magnitude' ? 'Magnitude Roberts' : robertsComp.toUpperCase())
      : edgeOp === 'kirsch' ? (kirschComp === 'max' ? 'Máximo Kirsch' : `Kirsch K${Number(kirschComp) + 1}`) : 'Laplaciano L(f)'
    : activeModule === 'sharpening' && sharpenOp === 'laplacian'
      ? sharpenView === 'original' ? 'Original f' : sharpenView === 'laplacian' ? 'Laplaciano L(f)' : 'Resultado f ± L(f)'
      : 'g(x, y) Processada';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8fafc] text-slate-800 font-sans">
      {/* 1. Sidebar Lateral com 3 Categorias de PDI */}
      <Sidebar activeModule={activeModule} onSelectModule={handleSelectModule} />

      {/* 2. Área Central de Trabalho */}
      <div className="min-w-0 flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Topbar com Visibilidade de Estado Global e Heurísticas de Nielsen */}
        <header className="h-14 px-5 border-b border-slate-200/90 bg-white flex items-center justify-between shrink-0 z-40">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono font-bold uppercase text-[#00875a] bg-[#e6f4ea] px-2 py-0.5 rounded border border-emerald-200">
              {activeLessonInfo?.id ?? 'PDI'} · MÓDULO ATIVO
            </span>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold text-slate-900">{activeLessonInfo?.title}</h1>
              <span className="text-xs text-slate-400 font-normal hidden sm:inline">
                | {activeCategory}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Restaurar Parâmetros (Nielsen: Liberdade de Exploração) */}
            <button
              onClick={resetCurrentOperation}
              className="px-2.5 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium flex items-center gap-1 transition-colors"
              title="Restaurar parâmetros padrão do módulo"
            >
              <span className="material-symbols-outlined text-base text-slate-400">restart_alt</span>
              <span className="hidden sm:inline">Restaurar</span>
            </button>

            {/* Exportar Relatório */}
            <button
              onClick={() => setIsExportOpen(true)}
              className="px-3 py-1.5 rounded bg-[#00875a] hover:bg-[#00704a] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span>Exportar</span>
            </button>
          </div>
        </header>

        {/* Sub-bar com Abas Cognitivas (Laboratório vs Teoria) & Seletor de Comparação */}
        <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between shrink-0">
          
          {/* Abas Cognitivas: Foco de Tarefa (Reduz Carga Vertical) */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded text-xs font-medium">
            <button
              onClick={() => setActiveTab('lab')}
              className={`px-3 py-1 rounded-sm transition-all flex items-center gap-1.5 ${
                activeTab === 'lab'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-sm text-[#00875a]">science</span>
              <span>Laboratório Interativo</span>
            </button>
            <button
              onClick={() => setActiveTab('theory')}
              className={`px-3 py-1 rounded-sm transition-all flex items-center gap-1.5 ${
                activeTab === 'theory'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-sm text-slate-400">menu_book</span>
              <span>Fundamentação Teórica</span>
            </button>
          </div>

          {/* Seletor de Modos de Comparação */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400 uppercase font-semibold hidden sm:inline">
              Comparação:
            </span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 text-slate-600 text-xs font-mono">
              <button
                onClick={() => setViewMode('split')}
                className={`px-2.5 py-1 rounded-sm transition-all flex items-center gap-1 ${
                  viewMode === 'split' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-sm text-[#00875a]">vertical_split</span>
                <span>Divisor</span>
              </button>
              <button
                onClick={() => setViewMode('sideBySide')}
                className={`px-2 py-1 rounded-sm transition-all flex items-center gap-1 ${
                  viewMode === 'sideBySide' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-sm text-slate-500">splitscreen</span>
                <span>Lado a Lado</span>
              </button>
              <button
                onClick={() => setViewMode('beforeOnly')}
                className={`px-2 py-1 rounded-sm transition-all ${
                  viewMode === 'beforeOnly' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Antes (f)
              </button>
              <button
                onClick={() => setViewMode('afterOnly')}
                className={`px-2 py-1 rounded-sm transition-all ${
                  viewMode === 'afterOnly' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Depois (g)
              </button>
            </div>
          </div>
        </div>

        {/* 3. Área Principal com Scroll Suave */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f8fafc]">
          <ErrorBoundary>
            {/* Seletor Mobile Dropdown */}
            <div className="lg:hidden mb-4">
              <label htmlFor="module-select" className="block text-xs font-mono uppercase font-bold text-slate-600 mb-1.5">
                Módulo Ativo de PDI
              </label>
              <select
                id="module-select"
                value={activeModule}
                onChange={(e) => handleSelectModule(e.target.value as ModuleKey)}
                className="w-full rounded border border-slate-300 bg-white p-2.5 text-xs font-semibold"
              >
                {NAV_ITEMS.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.code} · {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* ABA: FUNDAMENTAÇÃO TEÓRICA COMPLETA */}
            {activeTab === 'theory' && (
              <div className="max-w-4xl mx-auto space-y-4">
                <TeachingSlide
                  key={
                    activeModule === 'pointwise'
                      ? pointwiseOp
                      : activeModule === 'gamma'
                      ? gammaOp
                      : activeModule === 'smoothing'
                      ? smoothingOp
                      : activeModule === 'edges'
                      ? edgeOp
                      : activeModule === 'sharpening'
                      ? sharpenOp
                      : activeModule
                  }
                  topic={
                    activeModule === 'pointwise'
                      ? pointwiseOp
                      : activeModule === 'gamma'
                      ? gammaOp
                      : activeModule === 'smoothing'
                      ? smoothingOp
                      : activeModule === 'edges'
                      ? edgeOp
                      : activeModule === 'sharpening'
                      ? sharpenOp === 'laplacian'
                        ? 'sharpen'
                        : 'highBoost'
                      : activeModule
                  }
                />
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setActiveTab('lab')}
                    className="px-4 py-2 bg-[#00875a] hover:bg-[#00704a] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">science</span>
                    <span>Ir para o Laboratório Interativo</span>
                  </button>
                </div>
              </div>
            )}

            {/* ABA: LABORATÓRIO INTERATIVO */}
            {activeTab === 'lab' && (
              <div className="space-y-5">
                
                {/* BANNER COMPACTO DE OBJETIVO + EQUAÇÃO GOVERNANTE */}
                <div className="bg-white border border-slate-200/90 rounded-md p-4 shadow-xs relative transition-all">
                  <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded bg-emerald-50 text-[#00875a] border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-xl">lightbulb</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase font-bold text-[#00875a] tracking-wider">
                            OBJETIVO DO MÓDULO
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">• Interação direta e feedback instantâneo</span>
                        </div>
                        <h2 className="text-sm font-bold text-slate-900 mt-0.5">
                          {activeLessonInfo?.title}
                        </h2>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-3xl">
                          {activeLessonInfo?.description}
                        </p>
                      </div>
                    </div>

                    {/* Equação Formal em Destaque Compacto */}
                    <div className="shrink-0 bg-slate-900 text-emerald-300 font-mono text-xs px-3.5 py-2.5 rounded border border-slate-800 shadow-xs flex flex-col items-start md:items-end w-full md:w-auto">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-sans">
                        Equação Governante
                      </span>
                      <span className="font-bold text-sm text-emerald-400 mt-0.5">
                        {activeEquation}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Módulos com Layout Especial (Histograma / Convolução com Editor) */}
                {activeModule === 'histogram' ? (
                  /* MÓDULO DE HISTOGRAMA: IMAGEM E PAINEL ANALÍTICO ALINHADOS VERTICALMENTE LADO A LADO */
                  <div className="max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    
                    {/* COLUNA ESQUERDA (7 cols): PAINEL DE ENTRADA & CANVAS HERO */}
                    <div className="xl:col-span-7 space-y-4">
                      
                      {/* PAINEL UNIFICADO DE ENTRADA & OPERAÇÃO DE HISTOGRAMA */}
                      <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-500 uppercase flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-slate-400">photo</span>
                              Entrada:
                            </span>
                            <select
                              value={selectedPreset}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSelectedPreset(val);
                                const p = PRESET_IMAGES.find((x) => x.id === val);
                                if (p) loadImage(p.path);
                              }}
                              className="text-xs bg-slate-50 hover:bg-white border border-slate-300 rounded px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00875a]/20 focus:border-[#00875a] transition-all cursor-pointer"
                            >
                              {PRESET_IMAGES.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Seletor de Operação de Histograma */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Operação:</span>
                            <div className="flex items-center bg-slate-100 p-0.5 rounded text-xs font-medium">
                              <button
                                onClick={() => {
                                  setManualProcessedImage(null);
                                  setHistogramOp('equalize');
                                }}
                                className={`px-2.5 py-1 rounded-sm transition-all cursor-pointer ${
                                  histogramOp === 'equalize'
                                    ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                Equalização Global
                              </button>
                              <button
                                onClick={() => {
                                  setManualProcessedImage(null);
                                  setHistogramOp('expand');
                                }}
                                className={`px-2.5 py-1 rounded-sm transition-all cursor-pointer ${
                                  histogramOp === 'expand'
                                    ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                Expansão Linear
                              </button>
                              <button
                                onClick={() => {
                                  setManualProcessedImage(null);
                                  setHistogramOp('original');
                                }}
                                className={`px-2.5 py-1 rounded-sm transition-all cursor-pointer ${
                                  histogramOp === 'original'
                                    ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                Original
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* CANVAS HERO COMPARATIVO */}
                      <div className="bg-white rounded-md border border-slate-200 p-5 shadow-xs space-y-3">
                        <div className="flex items-center justify-between text-xs font-mono px-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                            <span className="font-bold text-slate-700">f(x, y) Original</span>
                          </div>
                          
                          <span className="text-[11px] text-slate-400 font-sans hidden sm:inline flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-[#00875a]">touch_app</span>
                            Clique no canvas para inspecionar qualquer pixel
                          </span>

                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#00875a]">
                              g(x, y) {histogramOp === 'expand' ? 'Expandida' : histogramOp === 'original' ? 'Original' : 'Equalizada'}
                            </span>
                            <span className="w-2.5 h-2.5 rounded-full bg-[#00875a]" />
                          </div>
                        </div>

                        <div className="w-full flex items-center justify-center">
                          <SplitCanvas
                            beforeImg={primaryImage}
                            afterImg={processedImage}
                            labels={{before: 'ORIGINAL', after: responseLabel}}
                            selectedCoord={selectedCoord}
                            onSelectPixel={(x, y) => {
                              setSelectedCoord({ x, y });
                              const r = getPixel(primaryImage, x, y, borderPolicy);
                              setHistogramSelectedBin(r);
                            }}
                            viewMode={viewMode}
                          />
                        </div>

                        {/* Atalhos de Salto Rápido */}
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 font-mono">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span>Ponto Atual:</span>
                            <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                              ({selectedCoord?.x ?? 0}, {selectedCoord?.y ?? 0})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-slate-400">Saltos rápidos:</span>
                            <button
                              onClick={() => {
                                setSelectedCoord({ x: 64, y: 64 });
                                setHistogramSelectedBin(getPixel(primaryImage, 64, 64, borderPolicy));
                              }}
                              className="hover:text-[#00875a] hover:underline px-1.5 py-0.5 rounded bg-slate-100 cursor-pointer"
                            >
                              Fundo (64, 64)
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCoord({ x: 120, y: 110 });
                                setHistogramSelectedBin(getPixel(primaryImage, 120, 110, borderPolicy));
                              }}
                              className="hover:text-[#00875a] hover:underline px-1.5 py-0.5 rounded bg-slate-100 cursor-pointer"
                            >
                              Objeto (120, 110)
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCoord({ x: 170, y: 120 });
                                setHistogramSelectedBin(getPixel(primaryImage, 170, 120, borderPolicy));
                              }}
                              className="hover:text-[#00875a] hover:underline px-1.5 py-0.5 rounded bg-slate-100 cursor-pointer"
                            >
                              Borda (170, 120)
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* COLUNA DIREITA (5 cols): PAINEL DE HISTOGRAMAS E ABA DE EXPLICAÇÃO */}
                    <div className="xl:col-span-5 space-y-4">
                      
                      {/* BARRA DE NAVEGAÇÃO DA LATERAL DE HISTOGRAMA */}
                      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-md p-1.5 shadow-2xs text-xs font-medium">
                        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 px-2 font-bold uppercase">
                          <span className="material-symbols-outlined text-sm text-[#00875a]">analytics</span>
                          <span>Painel Analítico:</span>
                        </div>
                        <div className="flex items-center bg-slate-100 p-0.5 rounded text-xs">
                          <button
                            onClick={() => setHistogramRightTab('both')}
                            className={`px-2 py-1 rounded-sm transition-all cursor-pointer ${histogramRightTab === 'both' ? 'bg-white text-[#00875a] font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            Ambos
                          </button>
                          <button
                            onClick={() => setHistogramRightTab('charts')}
                            className={`px-2 py-1 rounded-sm transition-all cursor-pointer ${histogramRightTab === 'charts' ? 'bg-white text-[#00875a] font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            Histograma & LUT
                          </button>
                          <button
                            onClick={() => setHistogramRightTab('pixel')}
                            className={`px-2 py-1 rounded-sm transition-all cursor-pointer ${histogramRightTab === 'pixel' ? 'bg-white text-[#00875a] font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            Microscópio
                          </button>
                        </div>
                      </div>

                      {/* CARD 1: PAINEL DE HISTOGRAMAS COM GRÁFICOS SVG & LUT */}
                      {(histogramRightTab === 'both' || histogramRightTab === 'charts') && (
                        <HistogramPanel
                          inputImage={primaryImage}
                          activeOp={histogramOp}
                          onSelectOp={(op) => {
                            setManualProcessedImage(null);
                            setHistogramOp(op);
                          }}
                          selectedLevel={histogramSelectedBin}
                          onSelectLevel={setHistogramSelectedBin}
                        />
                      )}

                      {/* CARD 2: ABA DE EXPLICAÇÃO MATEMÁTICA */}
                      {(histogramRightTab === 'both' || histogramRightTab === 'pixel') && (
                        <PixelInspector
                          explanation={currentExplanation}
                          onCoordChange={(x, y) => {
                            setSelectedCoord({ x, y });
                            const r = getPixel(primaryImage, x, y, borderPolicy);
                            setHistogramSelectedBin(r);
                          }}
                          maxWidth={primaryImage.width}
                          maxHeight={primaryImage.height}
                        />
                      )}

                    </div>

                  </div>
                ) : activeModule === 'convolution' ? (
                  /* MÓDULO DE CONVOLUÇÃO: IMAGEM E ABA DE CONTROLES/EXPLICAÇÃO ALINHADOS VERTICALMENTE LADO A LADO */
                  <div className="max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    
                    {/* COLUNA ESQUERDA (7 cols): PAINEL DE ENTRADA & CANVAS HERO */}
                    <div className="xl:col-span-7 space-y-4">
                      
                      {/* PAINEL UNIFICADO DE ENTRADA & POLÍTICA DE BORDA */}
                      <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-500 uppercase flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-slate-400">photo</span>
                              Entrada:
                            </span>
                            <select
                              value={selectedPreset}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSelectedPreset(val);
                                const p = PRESET_IMAGES.find((x) => x.id === val);
                                if (p) loadImage(p.path);
                              }}
                              className="text-xs bg-slate-50 hover:bg-white border border-slate-300 rounded px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00875a]/20 focus:border-[#00875a] transition-all cursor-pointer"
                            >
                              {PRESET_IMAGES.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-500 uppercase flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-slate-400">crop_square</span>
                              Borda:
                            </span>
                            <select
                              aria-label="Política de borda"
                              value={borderPolicy}
                              onChange={(e) => setBorderPolicy(e.target.value as BorderPolicy)}
                              className="text-xs bg-slate-50 hover:bg-white border border-slate-300 rounded px-2 py-1.5 font-medium text-slate-700 focus:outline-none focus:border-[#00875a]"
                            >
                              <option value="replication">Replicação (Clamp)</option>
                              <option value="zeros">Preencher com Zeros</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* CANVAS HERO COMPARATIVO */}
                      <div className="bg-white rounded-md border border-slate-200 p-5 shadow-xs space-y-3">
                        <div className="flex items-center justify-between text-xs font-mono px-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                            <span className="font-bold text-slate-700">f(x, y) Original</span>
                          </div>
                          
                          <span className="text-[11px] text-slate-400 font-sans hidden sm:inline flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-[#00875a]">touch_app</span>
                            Clique no canvas para inspecionar qualquer pixel
                          </span>

                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#00875a]">g(x, y) Convoluída</span>
                            <span className="w-2.5 h-2.5 rounded-full bg-[#00875a]" />
                          </div>
                        </div>

                        <div className="w-full flex items-center justify-center">
                          <SplitCanvas
                            beforeImg={primaryImage}
                            afterImg={processedImage}
                            labels={{before: 'ORIGINAL', after: responseLabel}}
                            selectedCoord={selectedCoord}
                            onSelectPixel={(x, y) => setSelectedCoord({ x, y })}
                            viewMode={viewMode}
                          />
                        </div>

                        {/* Atalhos de Salto Rápido */}
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 font-mono">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span>Ponto Atual:</span>
                            <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                              ({selectedCoord?.x ?? 0}, {selectedCoord?.y ?? 0})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-slate-400">Saltos rápidos:</span>
                            <button
                              onClick={() => setSelectedCoord({ x: 64, y: 64 })}
                              className="hover:text-[#00875a] hover:underline px-1.5 py-0.5 rounded bg-slate-100 cursor-pointer"
                            >
                              Fundo (64, 64)
                            </button>
                            <button
                              onClick={() => setSelectedCoord({ x: 120, y: 110 })}
                              className="hover:text-[#00875a] hover:underline px-1.5 py-0.5 rounded bg-slate-100 cursor-pointer"
                            >
                              Objeto (120, 110)
                            </button>
                            <button
                              onClick={() => setSelectedCoord({ x: 170, y: 120 })}
                              className="hover:text-[#00875a] hover:underline px-1.5 py-0.5 rounded bg-slate-100 cursor-pointer"
                            >
                              Borda (170, 120)
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* COLUNA DIREITA (5 cols): CONTROLES E ABA DE EXPLICAÇÃO ALINHADOS VERTICALMENTE */}
                    <div className="xl:col-span-5 space-y-4">
                      
                      {/* BARRA DE NAVEGAÇÃO DA LATERAL DE CONVOLUÇÃO */}
                      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-md p-1.5 shadow-2xs text-xs font-medium">
                        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 px-2 font-bold uppercase">
                          <span className="material-symbols-outlined text-sm text-[#00875a]">tune</span>
                          <span>Painel Lateral:</span>
                        </div>
                        <div className="flex items-center bg-slate-100 p-0.5 rounded text-xs">
                          <button
                            onClick={() => setConvolutionRightTab('both')}
                            className={`px-2 py-1 rounded-sm transition-all cursor-pointer ${convolutionRightTab === 'both' ? 'bg-white text-[#00875a] font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            Ambos
                          </button>
                          <button
                            onClick={() => setConvolutionRightTab('mask')}
                            className={`px-2 py-1 rounded-sm transition-all cursor-pointer ${convolutionRightTab === 'mask' ? 'bg-white text-[#00875a] font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            Controles
                          </button>
                          <button
                            onClick={() => setConvolutionRightTab('pixel')}
                            className={`px-2 py-1 rounded-sm transition-all cursor-pointer ${convolutionRightTab === 'pixel' ? 'bg-white text-[#00875a] font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            Explicação
                          </button>
                        </div>
                      </div>

                      {/* CARD 1: CONTROLES DA MÁSCARA */}
                      {(convolutionRightTab === 'both' || convolutionRightTab === 'mask') && (
                        <MaskEditor key={maskEditorVersion}
                          initialKernel={customKernel} initialOffset={customOffset}
                          inputImage={primaryImage}
                          borderPolicy={borderPolicy}
                          onApplyResult={(out, k, off) => {
                            setCustomKernel(k);
                            setCustomOffset(off);
                            setManualProcessedImage(out);
                          }}
                        />
                      )}

                      {/* CARD 2: ABA DE EXPLICAÇÃO MATEMÁTICA */}
                      {(convolutionRightTab === 'both' || convolutionRightTab === 'pixel') && (
                        <PixelInspector
                          explanation={currentExplanation}
                          onCoordChange={(x, y) => setSelectedCoord({ x, y })}
                          maxWidth={primaryImage.width}
                          maxHeight={primaryImage.height}
                        />
                      )}

                    </div>

                  </div>
                ) : (
                  /* GRID PADRÃO: 7 COLUNAS PALCO + 5 COLUNAS MICROSCÓPIO */
                  <div className="max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    
                    {/* COLUNA ESQUERDA (8 / 7 cols): CONTROLES UNIFICADOS + CANVAS HERO */}
                    <div className="xl:col-span-8 space-y-4">
                      
                      {/* PAINEL UNIFICADO DE ENTRADA & PARÂMETROS (Lei de Proximidade de Gestalt) */}
                      <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs space-y-3.5">
                        
                        {/* Linha 1: Seletores de Imagem & Condição de Contorno */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-500 uppercase flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-slate-400">photo</span>
                              Entrada:
                            </span>
                            <select
                              value={selectedPreset}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSelectedPreset(val);
                                const p = PRESET_IMAGES.find((x) => x.id === val);
                                if (p) loadImage(p.path);
                              }}
                              className="text-xs bg-slate-50 hover:bg-white border border-slate-300 rounded px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00875a]/20 focus:border-[#00875a] transition-all cursor-pointer"
                            >
                              {PRESET_IMAGES.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-500 uppercase flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-slate-400">crop_square</span>
                              Borda:
                            </span>
                            <select
                              aria-label="Política de borda"
                              value={borderPolicy}
                              onChange={(e) => setBorderPolicy(e.target.value as BorderPolicy)}
                              className="text-xs bg-slate-50 hover:bg-white border border-slate-300 rounded px-2 py-1.5 font-medium text-slate-700 focus:outline-none focus:border-[#00875a]"
                            >
                              <option value="replication">Replicação (Clamp)</option>
                              <option value="zeros">Preencher com Zeros</option>
                            </select>
                          </div>
                        </div>

                        {/* Linha 2: Sub-operações em Formato Pill Buttons */}
                        <div className="space-y-3">
                          {activeModule === 'pointwise' && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-mono font-bold text-slate-500 uppercase">Sub-Operação:</span>
                              <div className="flex items-center bg-slate-100 p-0.5 rounded text-xs font-medium">
                                <button
                                  onClick={() => setPointwiseOp('negative')}
                                  className={`px-2.5 py-1 rounded-sm transition-all ${
                                    pointwiseOp === 'negative'
                                      ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Negativo (255 - r)
                                </button>
                                <button
                                  onClick={() => setPointwiseOp('threshold')}
                                  className={`px-2.5 py-1 rounded-sm transition-all ${
                                    pointwiseOp === 'threshold'
                                      ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Limiarização (T)
                                </button>
                                <button
                                  onClick={() => setPointwiseOp('stretching')}
                                  className={`px-2.5 py-1 rounded-sm transition-all ${
                                    pointwiseOp === 'stretching'
                                      ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Alargamento
                                </button>
                              </div>
                            </div>
                          )}

                          {activeModule === 'smoothing' && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-mono font-bold text-slate-500 uppercase">Filtro:</span>
                              <div className="flex items-center bg-slate-100 p-0.5 rounded text-xs font-medium">
                                <button
                                  onClick={() => setSmoothingOp('mean')}
                                  className={`px-2.5 py-1 rounded-sm transition-all ${
                                    smoothingOp === 'mean'
                                      ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Filtro da Média
                                </button>
                                <button
                                  onClick={() => setSmoothingOp('median')}
                                  className={`px-2.5 py-1 rounded-sm transition-all ${
                                    smoothingOp === 'median'
                                      ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Filtro da Mediana
                                </button>
                                <button
                                  onClick={() => setSmoothingOp('adaptive')}
                                  className={`px-2.5 py-1 rounded-sm transition-all ${
                                    smoothingOp === 'adaptive'
                                      ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Contraste Local
                                </button>
                              </div>
                            </div>
                          )}

                          {activeModule === 'edges' && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-mono font-bold text-slate-500 uppercase">Operador:</span>
                              <div className="flex items-center bg-slate-100 p-0.5 rounded text-xs font-medium">
                                <button
                                  onClick={() => setEdgeOp('sobel')}
                                  className={`px-2.5 py-1 rounded-sm transition-all ${
                                    edgeOp === 'sobel'
                                      ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Sobel
                                </button>
                                <button
                                  onClick={() => setEdgeOp('roberts')}
                                  className={`px-2.5 py-1 rounded-sm transition-all ${
                                    edgeOp === 'roberts'
                                      ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Roberts
                                </button>
                                <button
                                  onClick={() => setEdgeOp('kirsch')}
                                  className={`px-2.5 py-1 rounded-sm transition-all ${
                                    edgeOp === 'kirsch'
                                      ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Kirsch
                                </button>
                                <button
                                  onClick={() => setEdgeOp('laplacian')}
                                  className={`px-2.5 py-1 rounded-sm transition-all ${
                                    edgeOp === 'laplacian'
                                      ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Laplaciano
                                </button>
                              </div>
                            </div>
                          )}

                          {activeModule === 'sharpening' && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-mono font-bold text-slate-500 uppercase">Método:</span>
                              <div className="flex items-center bg-slate-100 p-0.5 rounded text-xs font-medium">
                                <button
                                  onClick={() => setSharpenOp('laplacian')}
                                  className={`px-2.5 py-1 rounded-sm transition-all ${
                                    sharpenOp === 'laplacian'
                                      ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Laplaciano
                                </button>
                                <button
                                  onClick={() => setSharpenOp('highBoost')}
                                  className={`px-2.5 py-1 rounded-sm transition-all ${
                                    sharpenOp === 'highBoost'
                                      ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  High-Boost
                                </button>
                              </div>
                            </div>
                          )}

                          {activeModule === 'mandatory' && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-mono font-bold text-slate-500 uppercase">Máscara:</span>
                              <div className="flex items-center bg-slate-100 p-0.5 rounded text-xs font-medium">
                                <button
                                  onClick={() => setMandatoryTC('TC-01')}
                                  className={`px-2.5 py-1 rounded-sm transition-all ${
                                    mandatoryTC === 'TC-01'
                                      ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  TC-01 (c, d)
                                </button>
                                <button
                                  onClick={() => setMandatoryTC('TC-02')}
                                  className={`px-2.5 py-1 rounded-sm transition-all ${
                                    mandatoryTC === 'TC-02'
                                      ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  TC-02 (Relevo)
                                </button>
                                <button
                                  onClick={() => setMandatoryTC('TC-03')}
                                  className={`px-2.5 py-1 rounded-sm transition-all ${
                                    mandatoryTC === 'TC-03'
                                      ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  TC-03 (Bordas)
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Sliders Dinâmicos Reativos */}
                          {hasModuleControls && (
                            <div className="pt-2 border-t border-slate-100">
                              <ModuleControls
                                activeModule={activeModule}
                                pointwiseOp={pointwiseOp}
                                thresholdVal={thresholdVal}
                                setThresholdVal={setThresholdVal}
                                smin={smin}
                                setSmin={setSmin}
                                smax={smax}
                                setSmax={setSmax}
                                gammaOp={gammaOp}
                                setGammaOp={setGammaOp}
                                gammaVal={gammaVal}
                                setGammaVal={setGammaVal}
                                logConst={logConst}
                                setLogConst={setLogConst}
                                dissolveMode={dissolveMode}
                                setDissolveMode={setDissolveMode}
                                dissolveT={dissolveT}
                                setDissolveT={setDissolveT}
                                smoothingOp={smoothingOp}
                                smoothingSize={smoothingSize}
                                setSmoothingSize={setSmoothingSize}
                                adaptiveC={adaptiveC}
                                setAdaptiveC={setAdaptiveC}
                                edgeOp={edgeOp}
                                sobelComp={sobelComp}
                                setSobelComp={setSobelComp}
                                sharpenOp={sharpenOp}
                                laplacianMode={laplacianMode}
                                setLaplacianMode={setLaplacianMode}
                                highBoostK={highBoostK}
                                setHighBoostK={setHighBoostK}
                                mandatoryTC={mandatoryTC}
                                tc01C={tc01C}
                                setTc01C={setTc01C}
                                tc01D={tc01D}
                                setTc01D={setTc01D}
                                tc01Offset={tc01Offset}
                                setTc01Offset={setTc01Offset}
                                tc02Variant={tc02Variant}
                                setTc02Variant={setTc02Variant}
                                tc02Offset={tc02Offset}
                                setTc02Offset={setTc02Offset}
                                tc03Variant={tc03Variant}
                                setTc03Variant={setTc03Variant}
                                tc03Offset={tc03Offset}
                                setTc03Offset={setTc03Offset}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {((activeModule === 'edges' && (edgeOp === 'roberts' || edgeOp === 'kirsch')) || (activeModule === 'sharpening' && sharpenOp === 'laplacian')) && (
                        <label className="block text-sm p-3 bg-white border border-slate-200 rounded">
                          Resposta exibida e explicada: {' '}
                          <select aria-label="Resposta exibida" className="border rounded p-1" value={activeModule === 'sharpening' ? sharpenView : edgeOp === 'roberts' ? robertsComp : kirschComp}
                            onChange={e => { if (activeModule === 'sharpening') setSharpenView(e.target.value as typeof sharpenView); else if (edgeOp === 'roberts') setRobertsComp(e.target.value as typeof robertsComp); else setKirschComp(e.target.value); }}>
                            {activeModule === 'sharpening' ? <><option value="original">Original f</option><option value="laplacian">Laplaciano L(f)</option><option value="result">Resultado f ± L(f)</option></> : edgeOp === 'roberts' ? <><option value="magnitude">Magnitude √(R1² + R2²)</option><option value="r1">R1</option><option value="r2">R2</option></> : <><option value="max">Máximo das 8 respostas</option>{['N','NW','W','SW','S','SE','E','NE'].map((d,i) => <option key={d} value={i}>K{i+1} ({d}, antes da rotação)</option>)}</>}
                          </select>
                          {activeModule === 'sharpening' && <p className="text-xs mt-2">Centro −4: subtraímos L. Centro +4: somamos L. As duas convenções produzem o mesmo aguçamento; apenas o sinal do Laplaciano muda.</p>}
                        </label>
                      )}
                      {/* CANVAS HERO COMPARATIVO */}
                      <div className="bg-white rounded-md border border-slate-200 p-5 shadow-xs space-y-3">
                        <div className="flex items-center justify-between text-xs font-mono px-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                            <span className="font-bold text-slate-700">f(x, y) Original</span>
                          </div>
                          
                          <span className="text-[11px] text-slate-400 font-sans hidden sm:inline flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-[#00875a]">touch_app</span>
                            Clique no canvas para inspecionar qualquer pixel
                          </span>

                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#00875a]">{responseLabel}</span>
                            <span className="w-2.5 h-2.5 rounded-full bg-[#00875a]" />
                          </div>
                        </div>

                        <div className="w-full flex items-center justify-center">
                          <SplitCanvas
                            beforeImg={primaryImage}
                            afterImg={processedImage}
                            labels={{before: 'ORIGINAL', after: responseLabel}}
                            selectedCoord={selectedCoord}
                            onSelectPixel={(x, y) => setSelectedCoord({ x, y })}
                            viewMode={viewMode}
                          />
                        </div>

                        {/* Atalhos de Salto Rápido de PDI (Fitts' Law) */}
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 font-mono">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span>Ponto Atual:</span>
                            <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                              ({selectedCoord?.x ?? 0}, {selectedCoord?.y ?? 0})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-slate-400">Saltos rápidos:</span>
                            <button
                              onClick={() => setSelectedCoord({ x: 64, y: 64 })}
                              className="hover:text-[#00875a] hover:underline px-1.5 py-0.5 rounded bg-slate-100"
                            >
                              Fundo (64, 64)
                            </button>
                            <button
                              onClick={() => setSelectedCoord({ x: 120, y: 110 })}
                              className="hover:text-[#00875a] hover:underline px-1.5 py-0.5 rounded bg-slate-100"
                            >
                              Objeto (120, 110)
                            </button>
                            <button
                              onClick={() => setSelectedCoord({ x: 170, y: 120 })}
                              className="hover:text-[#00875a] hover:underline px-1.5 py-0.5 rounded bg-slate-100"
                            >
                              Borda (170, 120)
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* COLUNA DIREITA (4 / 5 cols): MICROSCÓPIO DE PIXEL */}
                    <div className="xl:col-span-4">
                      <PixelInspector
                        explanation={currentExplanation}
                        onCoordChange={(x, y) => setSelectedCoord({ x, y })}
                        maxWidth={primaryImage.width}
                        maxHeight={primaryImage.height}
                      />
                    </div>

                  </div>
                )}

              </div>
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Modal de Exportação */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        image={processedImage}
        operationName={activeLessonInfo?.title ?? activeModule}
        parameters={{
          module: activeModule,
          preset: selectedPreset,
          borderPolicy,
          pointwiseOp,
          thresholdVal,
          smin,
          smax,
          gammaOp,
          gammaVal,
          dissolveMode,
          dissolveT,
          smoothingOp,
          smoothingSize,
          edgeOp,
          sobelComp, robertsComp, kirschComp, sharpenView,
          sharpenOp,
          laplacianMode,
          highBoostK,
          mandatoryTC,
          tc01C,
          tc01D,
          tc02Variant,
          tc02Offset,
          tc03Variant,
          tc03Offset
        }}
        borderPolicy={borderPolicy}
      />
    </div>
  );
};

export default App;
