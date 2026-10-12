import React, { useMemo } from 'react';
import { computeHistogram, histogramEqualization, histogramExpansion } from '../core/histogram';
import { GrayImage } from '../core/types';

interface HistogramPanelProps {
  inputImage: GrayImage;
  activeOp: 'equalize' | 'expand' | 'original';
  onSelectOp: (op: 'equalize' | 'expand' | 'original') => void;
  selectedLevel: number;
  onSelectLevel: (lvl: number) => void;
}

export const HistogramPanel: React.FC<HistogramPanelProps> = ({
  inputImage,
  activeOp,
  onSelectOp,
  selectedLevel,
  onSelectLevel
}) => {
  const { histIn, histOut, lut, maxCountIn, maxCountOut } = useMemo(() => {
    const hIn = computeHistogram(inputImage);
    const eq = histogramEqualization(inputImage);
    const exp = histogramExpansion(inputImage);

    let hOut = hIn;
    let currentLut: number[] = new Array<number>(256).fill(0);

    if (activeOp === 'equalize') {
      hOut = computeHistogram(eq.result);
      currentLut = eq.lut;
    } else if (activeOp === 'expand') {
      hOut = computeHistogram(exp);
      const rmin = hIn.min;
      const rmax = hIn.max;
      const range = rmax - rmin;
      currentLut = Array.from({ length: 256 }, (_, r) =>
        range > 0 ? Math.round((255 * (r - rmin)) / range) : r
      );
    } else {
      hOut = hIn;
      currentLut = Array.from({ length: 256 }, (_, r) => r);
    }

    return {
      histIn: hIn,
      histOut: hOut,
      lut: currentLut,
      maxCountIn: Math.max(...hIn.counts, 1),
      maxCountOut: Math.max(...hOut.counts, 1)
    };
  }, [inputImage, activeOp]);

  const selectedIntensity = Math.max(0, Math.min(255, selectedLevel ?? 128));
  const countIn = histIn.counts[selectedIntensity];
  const cdfIn = histIn.cdf[selectedIntensity];
  const mappedVal = lut[selectedIntensity] ?? selectedIntensity;

  return (
    <div className="w-full bg-white rounded-md border border-slate-200 p-4 space-y-4 shadow-xs">
      
      {/* Cabeçalho e Seletores de Operação */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base text-[#00875a]">bar_chart</span>
            <span>Análise de Histogramas & Estatísticas Globais</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Distribuição de frequências H[r], probabilidade acumulada (CDF) e Look-Up Table (LUT).
          </p>
        </div>

        {/* Pílulas de Seleção de Operação */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded text-xs font-medium">
          <button
            onClick={() => onSelectOp('equalize')}
            className={`px-2.5 py-1 rounded-sm transition-all cursor-pointer ${
              activeOp === 'equalize'
                ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Equalização (CDF)
          </button>
          <button
            onClick={() => onSelectOp('expand')}
            className={`px-2.5 py-1 rounded-sm transition-all cursor-pointer ${
              activeOp === 'expand'
                ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Expansão Linear
          </button>
          <button
            onClick={() => onSelectOp('original')}
            className={`px-2.5 py-1 rounded-sm transition-all cursor-pointer ${
              activeOp === 'original'
                ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Original
          </button>
        </div>
      </div>

      {/* Seletor Deslizante de Intensidade Inspecionada r */}
      <div className="flex items-center gap-3 bg-slate-50/80 p-2.5 rounded-md border border-slate-200/80 text-xs font-mono">
        <span className="text-[11px] text-slate-600 font-semibold shrink-0">
          Intensidade r:
        </span>
        <input
          type="range"
          min="0"
          max="255"
          value={selectedIntensity}
          onChange={(e) => onSelectLevel(parseInt(e.target.value) || 0)}
          className="flex-1 accent-[#00875a] cursor-pointer"
        />
        <span className="text-xs font-bold text-[#00875a] bg-white px-2 py-0.5 rounded border border-slate-200 w-12 text-center shrink-0">
          {selectedIntensity}
        </span>
      </div>

      {/* Estatísticas Globais da Imagem */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs font-mono">
        <div className="p-2 bg-slate-50 rounded border border-slate-200">
          <div className="text-[10px] text-slate-400">Total N</div>
          <div className="text-xs font-bold text-slate-800">{histIn.totalPixels.toLocaleString()}</div>
        </div>
        <div className="p-2 bg-slate-50 rounded border border-slate-200">
          <div className="text-[10px] text-slate-400">Mínimo</div>
          <div className="text-xs font-bold text-slate-800">r_min = {histIn.min}</div>
        </div>
        <div className="p-2 bg-slate-50 rounded border border-slate-200">
          <div className="text-[10px] text-slate-400">Máximo</div>
          <div className="text-xs font-bold text-slate-800">r_max = {histIn.max}</div>
        </div>
        <div className="p-2 bg-slate-50 rounded border border-slate-200">
          <div className="text-[10px] text-slate-400">Média (μ)</div>
          <div className="text-xs font-bold text-[#00875a]">{histIn.mean.toFixed(2)}</div>
        </div>
        <div className="p-2 bg-slate-50 rounded border border-slate-200">
          <div className="text-[10px] text-slate-400">Desvio (σ)</div>
          <div className="text-xs font-bold text-slate-800">{histIn.stdDev.toFixed(2)}</div>
        </div>
      </div>

      {/* Gráficos SVG Conectados */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* 1. Histograma Original H[r] */}
        <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200 flex flex-col items-center">
          <div className="text-[11px] font-semibold text-slate-700 mb-1.5 flex items-center justify-between w-full">
            <span>Entrada H[r]</span>
            <span className="text-[10px] font-mono text-[#00875a]">r = {selectedIntensity}</span>
          </div>
          <div className="w-full h-28 relative">
            <svg viewBox="0 0 256 100" className="w-full h-full" preserveAspectRatio="none">
              {histIn.counts.map((cnt, r) => {
                const h = (cnt / maxCountIn) * 95;
                const isSelected = r === selectedIntensity;
                return (
                  <rect
                    key={r}
                    x={r}
                    y={100 - h}
                    width={1}
                    height={h}
                    fill={isSelected ? '#00875a' : '#94a3b8'}
                    onClick={() => onSelectLevel(r)}
                    onMouseEnter={() => onSelectLevel(r)}
                    className="cursor-pointer"
                  />
                );
              })}
            </svg>
          </div>
          <div className="flex justify-between w-full text-[9px] font-mono text-slate-400 mt-1">
            <span>0</span>
            <span>H[{selectedIntensity}] = {countIn}</span>
            <span>255</span>
          </div>
        </div>

        {/* 2. Curva CDF / Mapeamento T(r) */}
        <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200 flex flex-col items-center">
          <div className="text-[11px] font-semibold text-[#00875a] mb-1.5 flex items-center justify-between w-full">
            <span>Curva T(r)</span>
            <span className="text-[10px] font-mono">T({selectedIntensity}) = {mappedVal}</span>
          </div>
          <div className="w-full h-28 relative">
            <svg viewBox="0 0 256 256" className="w-full h-full">
              {/* Linha diagonal de referência 1:1 */}
              <line x1="0" y1="256" x2="256" y2="0" stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth="1.5" />
              {/* Curva CDF / LUT */}
              <polyline
                fill="none"
                stroke="#00875a"
                strokeWidth="2.5"
                points={lut.map((s, r) => `${r},${256 - s}`).join(' ')}
              />
              {/* Ponto selecionado */}
              <circle
                cx={selectedIntensity}
                cy={256 - mappedVal}
                r="5"
                fill="#00875a"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <div className="flex justify-between w-full text-[9px] font-mono text-slate-400 mt-1">
            <span>(0, 0)</span>
            <span>CDF = {((cdfIn / histIn.totalPixels) * 100).toFixed(1)}%</span>
            <span>(255, 255)</span>
          </div>
        </div>

        {/* 3. Histograma Equalizado / Processado H[s] */}
        <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200 flex flex-col items-center">
          <div className="text-[11px] font-semibold text-emerald-800 mb-1.5 flex items-center justify-between w-full">
            <span>Saída H[s]</span>
            <span className="text-[10px] font-mono text-emerald-700">s = {mappedVal}</span>
          </div>
          <div className="w-full h-28 relative">
            <svg viewBox="0 0 256 100" className="w-full h-full" preserveAspectRatio="none">
              {histOut.counts.map((cnt, s) => {
                const h = (cnt / maxCountOut) * 95;
                const isSelected = s === mappedVal;
                return (
                  <rect
                    key={s}
                    x={s}
                    y={100 - h}
                    width={1}
                    height={h}
                    fill={isSelected ? '#059669' : '#64748b'}
                    onClick={() => onSelectLevel(s)}
                    className="cursor-pointer"
                  />
                );
              })}
            </svg>
          </div>
          <div className="flex justify-between w-full text-[9px] font-mono text-slate-400 mt-1">
            <span>0</span>
            <span>H[{mappedVal}] = {histOut.counts[mappedVal] ?? 0}</span>
            <span>255</span>
          </div>
        </div>

      </div>

      {/* Inspeção do Nível e Dedução Matemática */}
      <div className="p-3 bg-emerald-50/50 rounded-md border border-emerald-100 text-xs font-mono space-y-1.5">
        <div className="flex items-center justify-between text-emerald-950 font-bold">
          <span>Dedução da Look-Up Table (LUT) para r = {selectedIntensity}:</span>
          <span className="text-[#00875a]">Mapeado em s = {mappedVal}</span>
        </div>
        <div className="text-slate-700 space-y-0.5 text-[11px] leading-relaxed">
          <div>• Frequência no nível {selectedIntensity}: <strong>H[{selectedIntensity}] = {countIn} pixels</strong> ({((countIn / histIn.totalPixels) * 100).toFixed(2)}% da imagem).</div>
          <div>• Contagem acumulada até {selectedIntensity}: <strong>∑ H[l] = {cdfIn} pixels</strong> ({((cdfIn / histIn.totalPixels) * 100).toFixed(2)}% da massa total).</div>
          {activeOp === 'equalize' && (
            <div>• Fórmula (CDF Global): s = round( (255 / {histIn.totalPixels}) · {cdfIn} ) = round( {((255 / histIn.totalPixels) * cdfIn).toFixed(2)} ) = <strong>{mappedVal}</strong>.</div>
          )}
          {activeOp === 'expand' && (
            <div>• Fórmula (Expansão Linear): s = round( 255 · ({selectedIntensity} - {histIn.min}) / ({histIn.max} - {histIn.min}) ) = <strong>{mappedVal}</strong>.</div>
          )}
          {activeOp === 'original' && (
            <div>• Fórmula: Imagem original sem transformação aplicada (s = r = {selectedIntensity}).</div>
          )}
        </div>
      </div>

    </div>
  );
};
