import React, { useState, useMemo } from 'react';
import { computeHistogram, histogramEqualization, histogramExpansion } from '../core/histogram';
import { GrayImage } from '../core/types';

interface HistogramPanelProps {
  inputImage: GrayImage;
  onApplyEqualization: (outImg: GrayImage) => void;
  onApplyExpansion: (outImg: GrayImage) => void;
}

export const HistogramPanel: React.FC<HistogramPanelProps> = ({
  inputImage,
  onApplyEqualization,
  onApplyExpansion
}) => {
  const [hoverBin, setHoverBin] = useState<number | null>(128);

  const { hist, eqResult, lut, eqHist, maxCountIn, maxCountEq } = useMemo(() => {
    const hIn = computeHistogram(inputImage);
    const eq = histogramEqualization(inputImage);
    const hEq = computeHistogram(eq.result);
    return {
      hist: hIn,
      eqResult: eq.result,
      lut: eq.lut,
      eqHist: hEq,
      maxCountIn: Math.max(...hIn.counts, 1),
      maxCountEq: Math.max(...hEq.counts, 1)
    };
  }, [inputImage]);

  const selectedIntensity = hoverBin ?? 128;
  const countIn = hist.counts[selectedIntensity];
  const cdfIn = hist.cdf[selectedIntensity];
  const eqMappedVal = lut[selectedIntensity];

  return (
    <div className="w-full bg-white rounded-md border border-slate-200 p-6 space-y-6 shadow-xs">
      
      {/* Top Actions */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Análise de Histogramas & Estatísticas Globais</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Distribuição de frequências $H[r]$, probabilidade acumulada (CDF) e Look-Up Table (LUT) de equalização.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            onClick={() => onApplyExpansion(histogramExpansion(inputImage))}
            className="px-3 py-1.5 rounded-lg border border-slate-300 hover:border-teal-600 hover:text-teal-700 bg-white font-medium transition-colors"
          >
            Aplicar Expansão Linear
          </button>
          <button
            onClick={() => onApplyEqualization(eqResult)}
            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors shadow-xs"
          >
            Aplicar Equalização Global
          </button>
        </div>
      </div>

      {/* Estatísticas Globais */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs font-mono">
        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-[10px] text-slate-400">Total de Pixels N</div>
          <div className="text-sm font-bold text-slate-800">{hist.totalPixels.toLocaleString()}</div>
        </div>
        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-[10px] text-slate-400">Mínimo Observado</div>
          <div className="text-sm font-bold text-slate-800">r_min = {hist.min}</div>
        </div>
        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-[10px] text-slate-400">Máximo Observado</div>
          <div className="text-sm font-bold text-slate-800">r_max = {hist.max}</div>
        </div>
        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-[10px] text-slate-400">Média Global (μ)</div>
          <div className="text-sm font-bold text-teal-700">{hist.mean.toFixed(2)}</div>
        </div>
        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-[10px] text-slate-400">Desvio Padrão (σ)</div>
          <div className="text-sm font-bold text-slate-800">{hist.stdDev.toFixed(2)}</div>
        </div>
      </div>

      {/* Gráficos de Histograma SVG */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Histograma Original */}
        <div className="p-3 bg-slate-50 rounded-md border border-slate-200 flex flex-col items-center">
          <div className="text-xs font-semibold text-slate-700 mb-2">Histograma de Entrada H[r]</div>
          <div className="w-full h-36 relative">
            <svg viewBox="0 0 256 100" className="w-full h-full" preserveAspectRatio="none">
              {hist.counts.map((cnt, r) => {
                const h = (cnt / maxCountIn) * 95;
                const isSelected = r === selectedIntensity;
                return (
                  <rect
                    key={r}
                    x={r}
                    y={100 - h}
                    width={1}
                    height={h}
                    fill={isSelected ? '#2563eb' : '#94a3b8'}
                    onMouseEnter={() => setHoverBin(r)}
                    className="cursor-pointer"
                  />
                );
              })}
            </svg>
          </div>
          <div className="flex justify-between w-full text-[10px] font-mono text-slate-400 mt-1">
            <span>0</span>
            <span>r = {selectedIntensity}</span>
            <span>255</span>
          </div>
        </div>

        {/* Função de Mapeamento CDF T(r) */}
        <div className="p-3 bg-slate-50 rounded-md border border-slate-200 flex flex-col items-center">
          <div className="text-xs font-semibold text-teal-700 mb-2">Curva CDF T(r) = round((255/N)·∑H)</div>
          <div className="w-full h-36 relative">
            <svg viewBox="0 0 256 256" className="w-full h-full">
              {/* Linha diagonal de referência 1:1 */}
              <line x1="0" y1="256" x2="256" y2="0" stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth="1" />
              {/* Curva CDF */}
              <polyline
                fill="none"
                stroke="#2563eb"
                strokeWidth="2"
                points={lut.map((s, r) => `${r},${256 - s}`).join(' ')}
              />
              {/* Ponto selecionado */}
              <circle
                cx={selectedIntensity}
                cy={256 - eqMappedVal}
                r="4"
                fill="#2563eb"
              />
            </svg>
          </div>
          <div className="flex justify-between w-full text-[10px] font-mono text-slate-400 mt-1">
            <span>(0, 0)</span>
            <span>T({selectedIntensity}) = {eqMappedVal}</span>
            <span>(255, 255)</span>
          </div>
        </div>

        {/* Histograma Equalizado */}
        <div className="p-3 bg-slate-50 rounded-md border border-slate-200 flex flex-col items-center">
          <div className="text-xs font-semibold text-emerald-700 mb-2">Histograma Equalizado H[s]</div>
          <div className="w-full h-36 relative">
            <svg viewBox="0 0 256 100" className="w-full h-full" preserveAspectRatio="none">
              {eqHist.counts.map((cnt, s) => {
                const h = (cnt / maxCountEq) * 95;
                const isSelected = s === eqMappedVal;
                return (
                  <rect
                    key={s}
                    x={s}
                    y={100 - h}
                    width={1}
                    height={h}
                    fill={isSelected ? '#059669' : '#64748b'}
                    className="cursor-pointer"
                  />
                );
              })}
            </svg>
          </div>
          <div className="flex justify-between w-full text-[10px] font-mono text-slate-400 mt-1">
            <span>0</span>
            <span>s = {eqMappedVal}</span>
            <span>255</span>
          </div>
        </div>

      </div>

      {/* Inspeção do Bin Selecionado */}
      <div className="p-4 bg-teal-50/60 rounded-md border border-blue-100 text-xs font-mono space-y-2">
        <div className="flex items-center justify-between text-blue-900 font-bold">
          <span>Dedução da Look-Up Table (LUT) para o Nível r = {selectedIntensity}:</span>
          <span className="text-emerald-700">Mapeado em s = {eqMappedVal}</span>
        </div>
        <div className="text-slate-700 space-y-1">
          <div>• Frequência absoluta no nível {selectedIntensity}: <strong>H[{selectedIntensity}] = {countIn} pixels</strong> ({((countIn / hist.totalPixels) * 100).toFixed(2)}% da imagem).</div>
          <div>• Contagem acumulada até {selectedIntensity}: <strong>∑ H[l] = {cdfIn} pixels</strong> ({((cdfIn / hist.totalPixels) * 100).toFixed(2)}% da massa).</div>
          <div>• Fórmula (A5 p. 38): s = round( (255 / {hist.totalPixels}) · {cdfIn} ) = round( {((255 / hist.totalPixels) * cdfIn).toFixed(2)} ) = <strong>{eqMappedVal}</strong>.</div>
        </div>
      </div>

    </div>
  );
};
