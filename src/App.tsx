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
import { histogramEqualization } from './core/histogram';
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
  const [customKernel, setCustomKernel] = useState<Kernel2D | null>(null);
  const [customOffset, setCustomOffset] = useState<number>(0);

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

  // Módulo 06: Smoothing
  const [smoothingOp, setSmoothingOp] = useState<'mean' | 'median' | 'adaptive'>('mean');
  const [smoothingSize, setSmoothingSize] = useState<number>(3);
  const [adaptiveC, setAdaptiveC] = useState<number>(1.0);

  // Módulo 07: Edges
  const [edgeOp, setEdgeOp] = useState<'sobel' | 'roberts' | 'kirsch' | 'laplacian'>('sobel');
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

  // Pipeline de Processamento como ESTADO DERIVADO (useMemo)
  // Elimina render duplo de useEffect
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
        if (edgeOp === 'roberts') return robertsFilter(primaryImage, borderPolicy).magnitude;
        if (edgeOp === 'kirsch') return kirschFilter(primaryImage, borderPolicy).maxResponse;
        return laplacianFilter(primaryImage, 'centerNegative4', borderPolicy);

      case 'sharpening':
        if (sharpenOp === 'laplacian') return laplacianSharpen(primaryImage, laplacianMode, borderPolicy).result;
        return highBoostFilter(primaryImage, highBoostK, highBoostBlurSize, borderPolicy).result;

      case 'convolution':
        return convolve2D(
          primaryImage,
          customKernel ?? createKernel([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]]),
          customOffset,
          borderPolicy
        );

      case 'mandatory':
        if (mandatoryTC === 'TC-01') return runTC01Sharpening(primaryImage, tc01C, tc01D, tc01Offset, borderPolicy).output;
        if (mandatoryTC === 'TC-02') return runTC02Emboss(primaryImage, tc02Variant, tc02Offset, borderPolicy).output;
        return runTC03EdgeDetection(primaryImage, tc03Variant, tc03Offset, borderPolicy).output;

      default:
        return primaryImage;
    }
  }, [
    activeModule,
    primaryImage,
    secondaryImage,
    borderPolicy,
    pointwiseOp,
    thresholdVal,
    smin,
    smax,
    gammaOp,
    gammaVal,
    logConst,
    dissolveMode,
    dissolveT,
    smoothingOp,
    smoothingSize,
    adaptiveC,
    edgeOp,
    sobelComp,
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
    tc03Offset
  ]);

  const processedImage = manualProcessedImage ?? pipelineProcessedImage;

  // Explicação Pedagógica "Entenda este Pixel"
  const currentExplanation = useMemo<PixelExplanation | null>(() => {
    if (!selectedCoord || !primaryImage || primaryImage.width === 0) return null;
    const { x, y } = selectedCoord;

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
        } else if (edgeOp === 'laplacian') {
          opId = 'laplacian';
        } else if (edgeOp === 'roberts') {
          opId = 'roberts';
        } else if (edgeOp === 'kirsch') {
          opId = 'kirsch';
        }
        break;
      case 'sharpening':
        if (sharpenOp === 'laplacian') {
          opId = 'sharpenLaplacian';
          p = { mode: laplacianMode };
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
    smoothingOp,
    smoothingSize,
    adaptiveC,
    edgeOp,
    sobelComp,
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
        return CURRICULAR_CATALOG.C15;
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
  }, [activeModule, pointwiseOp, gammaOp, dissolveMode, smoothingOp, edgeOp, sharpenOp]);

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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8fafc] text-slate-800 font-sans">
      {/* 1. Sidebar Lateral */}
      <Sidebar activeModule={activeModule} onSelectModule={handleSelectModule} />

      {/* 2. Área Central */}
      <div className="min-w-0 flex-1 flex flex-col h-full overflow-hidden">
        {/* Topbar */}
        <header className="min-h-16 px-4 py-3 md:px-8 gap-3 flex-wrap border-b border-slate-200/80 bg-white flex items-center justify-between shrink-0">
          <div>
            <div className="text-[11px] font-mono text-[#00875a] font-semibold">
              MÓDULO ATIVO · {activeLessonInfo?.id ?? 'PDI'}
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">{activeLessonInfo?.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            <button
              onClick={() => setIsExportOpen(true)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-medium transition-colors"
            >
              Exportar
            </button>
            <span className="text-xs text-slate-500">
              {activeModule === 'convolution' ? 'Execute a máscara no editor' : 'Alterações aplicadas automaticamente'}
            </span>
          </div>
        </header>

        {/* Sub-bar: Filtros de Operação */}
        <div className="min-h-12 py-2 px-4 md:px-8 gap-3 flex-wrap bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {activeModule === 'pointwise' && (
              <>
                <button
                  onClick={() => setPointwiseOp('negative')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    pointwiseOp === 'negative'
                      ? 'bg-[#00875a] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Negativo
                </button>
                <button
                  onClick={() => setPointwiseOp('threshold')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    pointwiseOp === 'threshold'
                      ? 'bg-[#00875a] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Limiarização
                </button>
                <button
                  onClick={() => setPointwiseOp('stretching')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    pointwiseOp === 'stretching'
                      ? 'bg-[#00875a] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Contraste
                </button>
              </>
            )}

            {activeModule === 'gamma' && (
              <>
                <button
                  onClick={() => setGammaOp('gamma')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    gammaOp === 'gamma'
                      ? 'bg-[#00875a] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Potência / Gamma (γ)
                </button>
                <button
                  onClick={() => setGammaOp('log')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    gammaOp === 'log'
                      ? 'bg-[#00875a] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Logarítmica: c·ln(1+r)
                </button>
              </>
            )}

            {activeModule === 'smoothing' && (
              <>
                <button
                  onClick={() => setSmoothingOp('mean')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    smoothingOp === 'mean'
                      ? 'bg-[#00875a] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Filtro da Média
                </button>
                <button
                  onClick={() => setSmoothingOp('median')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    smoothingOp === 'median'
                      ? 'bg-[#00875a] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Filtro da Mediana
                </button>
                <button
                  onClick={() => setSmoothingOp('adaptive')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    smoothingOp === 'adaptive'
                      ? 'bg-[#00875a] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Contraste Adaptativo
                </button>
              </>
            )}

            {activeModule === 'edges' && (
              <>
                <button
                  onClick={() => setEdgeOp('sobel')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    edgeOp === 'sobel'
                      ? 'bg-[#00875a] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Sobel 3×3
                </button>
                <button
                  onClick={() => setEdgeOp('roberts')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    edgeOp === 'roberts'
                      ? 'bg-[#00875a] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Roberts 2×2
                </button>
                <button
                  onClick={() => setEdgeOp('laplacian')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    edgeOp === 'laplacian'
                      ? 'bg-[#00875a] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Laplaciano
                </button>
              </>
            )}

            {activeModule === 'sharpening' && (
              <>
                <button
                  onClick={() => setSharpenOp('laplacian')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    sharpenOp === 'laplacian'
                      ? 'bg-[#00875a] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Laplaciano
                </button>
                <button
                  onClick={() => setSharpenOp('highBoost')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    sharpenOp === 'highBoost'
                      ? 'bg-[#00875a] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  High-Boost
                </button>
              </>
            )}

            {activeModule === 'mandatory' && (
              <>
                <button
                  onClick={() => setMandatoryTC('TC-01')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    mandatoryTC === 'TC-01'
                      ? 'bg-[#00875a] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  TC-01 (c, d)
                </button>
                <button
                  onClick={() => setMandatoryTC('TC-02')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    mandatoryTC === 'TC-02'
                      ? 'bg-[#00875a] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  TC-02 (Relevo)
                </button>
                <button
                  onClick={() => setMandatoryTC('TC-03')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    mandatoryTC === 'TC-03'
                      ? 'bg-[#00875a] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  TC-03 (Bordas)
                </button>
              </>
            )}

            {activeModule !== 'pointwise' &&
              activeModule !== 'gamma' &&
              activeModule !== 'smoothing' &&
              activeModule !== 'edges' &&
              activeModule !== 'sharpening' &&
              activeModule !== 'mandatory' && (
                <span className="text-xs text-slate-500 font-mono">{activeLessonInfo?.title}</span>
              )}
          </div>

          {/* Alternador Lado a Lado / Divisor */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setViewMode('sideBySide')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'sideBySide' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lado a lado
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'split' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Divisor
            </button>
          </div>
        </div>

        {/* 3. Área Principal */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f8fafc]">
          <ErrorBoundary>
            {/* Seletor Mobile */}
            <div className="lg:hidden mb-4">
              <div className="flex items-center gap-2 mb-3">
                <img src="./mira-cube.svg" alt="" className="w-8 h-8" />
                <strong>MIRA</strong>
              </div>
              <label htmlFor="module-select" className="block text-sm font-semibold mb-2">
                Explorar o laboratório
              </label>
              <select
                id="module-select"
                value={activeModule}
                onChange={(e) => {
                  const val = e.target.value as ModuleKey;
                  handleSelectModule(val);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white p-3"
              >
                {NAV_ITEMS.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Slide Didático */}
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

            <div className="experiment-heading">
              <h2>Agora observe na imagem</h2>
              <p>
                Ajuste os controles para explorar o efeito na imagem completa. O exemplo didático acima mantém seus próprios parâmetros.
              </p>
            </div>

            {/* Módulos com Layout Específico */}
            {activeModule === 'histogram' ? (
              <div className="max-w-5xl mx-auto">
                <HistogramPanel
                  inputImage={primaryImage}
                  onApplyEqualization={(out) => setManualProcessedImage(out)}
                  onApplyExpansion={(out) => setManualProcessedImage(out)}
                />
              </div>
            ) : activeModule === 'convolution' ? (
              <div className="max-w-5xl mx-auto space-y-6">
                <MaskEditor
                  inputImage={primaryImage}
                  borderPolicy={borderPolicy}
                  onApplyResult={(out, k, off) => {
                    setCustomKernel(k);
                    setCustomOffset(off);
                    setManualProcessedImage(out);
                  }}
                />
                <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
                  <SplitCanvas
                    beforeImg={primaryImage}
                    afterImg={processedImage}
                    selectedCoord={selectedCoord}
                    onSelectPixel={(x, y) => setSelectedCoord({ x, y })}
                    viewMode={viewMode}
                  />
                </div>
              </div>
            ) : (
              <div className="max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                {/* Coluna Esquerda: Controles + Canvas */}
                <div className="xl:col-span-8 space-y-3">
                  <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs">
                    <div
                      className={`grid grid-cols-1 ${
                        hasModuleControls ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
                      } gap-3 items-end`}
                    >
                      {/* Seletor de Imagem */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                          IMAGEM DE TESTE
                        </label>
                        <select
                          value={selectedPreset}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedPreset(val);
                            const p = PRESET_IMAGES.find((x) => x.id === val);
                            if (p) loadImage(p.path);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00875a] cursor-pointer"
                        >
                          {PRESET_IMAGES.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Política de Borda */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                          POLÍTICA DE BORDA
                        </label>
                        <select
                          aria-label="Política de borda"
                          value={borderPolicy}
                          onChange={(e) => setBorderPolicy(e.target.value as BorderPolicy)}
                          className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-800"
                          title="Como tratar pixels fora dos limites da imagem"
                        >
                          <option value="replication">Replicar pixels da borda</option>
                          <option value="zeros">Preencher com zeros</option>
                        </select>
                      </div>

                      {/* Controles Dinâmicos Extraídos */}
                      {hasModuleControls && (
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
                      )}
                    </div>
                  </div>

                  {/* Comparação Visual Hero */}
                  <div className="bg-white rounded-lg border border-slate-200 p-6 flex flex-col shadow-xs">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                      <div>
                        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                          COMPARAÇÃO VISUAL
                        </h2>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Selecione um ponto para inspecionar o pixel
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {primaryImage.width} × {primaryImage.height} · 8-bit
                      </span>
                    </div>

                    <div className="w-full flex items-center justify-center">
                      <SplitCanvas
                        beforeImg={primaryImage}
                        afterImg={processedImage}
                        selectedCoord={selectedCoord}
                        onSelectPixel={(x, y) => setSelectedCoord({ x, y })}
                        viewMode={viewMode}
                      />
                    </div>
                  </div>
                </div>

                {/* Coluna Direita: Entenda este Pixel */}
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
          sobelComp,
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
