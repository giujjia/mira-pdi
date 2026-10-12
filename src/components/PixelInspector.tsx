import React from 'react';
import { PixelExplanation } from '../core/types';

interface PixelInspectorProps {
  explanation: PixelExplanation | null;
  onCoordChange: (x: number, y: number) => void;
  maxWidth?: number;
  maxHeight?: number;
}

export const PixelInspector: React.FC<PixelInspectorProps> = ({
  explanation,
  onCoordChange,
  maxWidth = 256,
  maxHeight = 256
}) => {
  if (!explanation) {
    return (
      <div className="bg-white rounded-md border border-slate-200 p-8 shadow-xs text-center text-xs text-slate-400 font-mono">
        <span className="material-symbols-outlined text-[#00875a] text-2xl mb-1.5 block animate-pulse">
          touch_app
        </span>
        Clique em qualquer pixel da imagem para inspecionar
      </div>
    );
  }

  const {
    neighborhoodRows = 3, neighborhoodCols = 3, anchorX = 1, anchorY = 1,
    x,
    y,
    valIn,
    valRaw,
    valQuant,
    neighbors,
    kernelWeights,
    formulaText,
    stepsText,
    didacticNote
  } = explanation;

  const isClippedLow = valRaw < 0;
  const isClippedHigh = valRaw > 255;
  const isLinear = !isClippedLow && !isClippedHigh;
  const delta = valQuant - valIn;

  return (
    <div className="bg-white rounded-md border border-slate-200 p-3.5 shadow-xs space-y-3 sticky top-4">
      {/* Cabeçalho com Inputs Diretos de Coordenadas */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00875a]" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
            ENTENDA ESTE PIXEL
          </span>
        </div>

        {/* Entradas numéricas diretas de precisão (X e Y) */}
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600 shrink-0">
          <label htmlFor="inspector-coord-x" className="text-slate-400 font-bold">
            X:
          </label>
          <input
            id="inspector-coord-x"
            type="number"
            min={0}
            max={maxWidth - 1}
            value={x}
            title={`Coordenada X (0 a ${maxWidth - 1})`}
            onChange={(e) =>
              onCoordChange(Math.max(0, Math.min(maxWidth - 1, parseInt(e.target.value, 10) || 0)), y)
            }
            className="w-12 bg-slate-50 hover:bg-white border border-slate-300 focus:border-[#00875a] focus:ring-2 focus:ring-[#00875a]/20 rounded px-1.5 py-0.5 text-center font-bold text-slate-800 focus:outline-none transition-all shadow-2xs"
          />
          <label htmlFor="inspector-coord-y" className="text-slate-400 font-bold ml-1">
            Y:
          </label>
          <input
            id="inspector-coord-y"
            type="number"
            min={0}
            max={maxHeight - 1}
            value={y}
            title={`Coordenada Y (0 a ${maxHeight - 1})`}
            onChange={(e) =>
              onCoordChange(x, Math.max(0, Math.min(maxHeight - 1, parseInt(e.target.value, 10) || 0)))
            }
            className="w-12 bg-slate-50 hover:bg-white border border-slate-300 focus:border-[#00875a] focus:ring-2 focus:ring-[#00875a]/20 rounded px-1.5 py-0.5 text-center font-bold text-slate-800 focus:outline-none transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Bloco Integrado: Vizinhança Matricial 3×3 & Painel de Transformação */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span className="font-semibold uppercase tracking-wider">Vizinhança {neighborhoodRows}×{neighborhoodCols} {kernelWeights ? '· pesos após rotação' : ''}</span>
          <span className="text-[10px] text-slate-400">Valores em 8 bits</span>
        </div>

        <div className="flex items-stretch justify-between gap-3 p-2.5 bg-slate-50/60 rounded-md border border-slate-200">
          {/* Grade Matricial 3x3 com Pesos de Alto Contraste - Proporção Otimizada */}
          <div style={{ gridTemplateColumns: `repeat(${neighborhoodCols}, minmax(36px, 1fr))`, maxWidth: '60%', overflowX: 'auto' }} className="w-[195px] shrink-0 grid gap-1.5 font-mono text-center text-xs p-2 bg-white rounded border border-slate-200/80 shadow-2xs self-center">
            {neighbors && neighbors.length === neighborhoodRows * neighborhoodCols ? (
              neighbors.map((nbVal, idx) => {
                const isCenter = idx === anchorY * neighborhoodCols + anchorX;
                const weight = kernelWeights ? kernelWeights[Math.floor(idx / neighborhoodCols)][idx % neighborhoodCols] : null;

                // Badges refinados e minimalistas para pesos de convolução
                let weightBadge = null;
                if (weight !== null) {
                  if (weight > 0) {
                    weightBadge = (
                      <span className={`text-[9px] font-bold leading-none px-1 py-0.5 rounded-xs ${
                        isCenter ? 'text-emerald-950 bg-white/90' : 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                      }`}>
                        +{weight}
                      </span>
                    );
                  } else if (weight < 0) {
                    weightBadge = (
                      <span className={`text-[9px] font-bold leading-none px-1 py-0.5 rounded-xs ${
                        isCenter ? 'text-rose-950 bg-rose-100' : 'text-rose-700 bg-rose-50 border border-rose-200/60'
                      }`}>
                        {weight}
                      </span>
                    );
                  } else {
                    weightBadge = (
                      <span className={`text-[9px] font-medium leading-none ${isCenter ? 'text-emerald-200' : 'text-slate-400'}`}>
                        ×0
                      </span>
                    );
                  }
                }

                return (
                  <div
                    key={idx}
                    className={`aspect-square rounded-xs flex flex-col items-center justify-center p-1 transition-all ${
                      isCenter
                        ? 'bg-[#00875a] text-white font-extrabold shadow-xs ring-2 ring-[#00875a]/25'
                        : 'bg-slate-50 hover:bg-slate-100/90 border border-slate-200/70 text-slate-800 font-semibold'
                    }`}
                  >
                    <span className="text-[13px] font-bold leading-tight">{nbVal}</span>
                    {weightBadge && <div className="mt-1">{weightBadge}</div>}
                    {isCenter && weight === null && (
                      <span className="text-[8px] uppercase tracking-tighter opacity-90 mt-0.5 text-emerald-100 font-bold">
                        centro
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="col-span-3 aspect-[3/1] bg-white rounded-xs flex items-center justify-center text-center font-mono text-xs text-slate-600 border border-slate-200">
                Pixel central: {valIn}
              </div>
            )}
          </div>

          {/* Divisor vertical */}
          <div className="w-px bg-slate-200/80 shrink-0 self-stretch my-0.5" />

          {/* Painel Coeso de Transformação de Sinal & Alteração (Design Limpo e Minimalista) */}
          <div className="flex-1 min-w-0 bg-white rounded border border-slate-200/80 p-2.5 shadow-2xs flex flex-col justify-between space-y-1.5">
            {/* Entrada f(x, y) */}
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-xs border border-slate-300 shadow-2xs shrink-0"
                  style={{ backgroundColor: `rgb(${valIn}, ${valIn}, ${valIn})` }}
                  title={`Tom de cinza original: ${valIn}`}
                />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-semibold block leading-none">
                    Entrada f(x,y)
                  </span>
                  <strong className="text-sm font-mono font-extrabold text-slate-900 leading-tight">
                    {valIn}
                  </strong>
                </div>
              </div>
              <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1 py-0.5 rounded-xs border border-slate-200">
                uint8
              </span>
            </div>

            {/* Cálculo Intermediário Bruto (Raw) - Limpo, sem caixa cinza pesada */}
            <div className="flex items-center justify-between py-1 px-1 font-mono text-xs">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-slate-400">functions</span>
                <span>Bruto:</span>
              </span>
              <div className="flex items-center gap-1.5">
                <strong className={`text-xs font-bold ${isLinear ? 'text-slate-800' : 'text-amber-700'}`}>
                  {Number.isInteger(valRaw) ? valRaw : valRaw.toFixed(2)}
                </strong>
                {!isLinear && (
                  <span className="text-[9px] px-1 py-0.2 rounded-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    {valRaw > 255 ? '>255' : '<0'}
                  </span>
                )}
              </div>
            </div>

            {/* Saída Quantizada Q(v) + Destaque de Alteração (Delta) */}
            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-xs border border-slate-300 shadow-2xs shrink-0"
                  style={{ backgroundColor: `rgb(${valQuant}, ${valQuant}, ${valQuant})` }}
                  title={`Tom de cinza processado: ${valQuant}`}
                />
                <div>
                  <span className="text-[10px] text-[#00875a] uppercase font-mono font-bold block leading-none">
                    Saída Q(v)
                  </span>
                  <strong className="text-sm font-mono font-extrabold text-[#00875a] leading-tight">
                    {valQuant}
                  </strong>
                </div>
              </div>

              {/* Badge Proeminente de Alteração / Delta */}
              <div
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs flex items-center gap-0.5 ${
                  delta > 0
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : delta < 0
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
                title={`Diferença de intensidade no pixel: ${delta >= 0 ? `+${delta}` : delta}`}
              >
                <span>Δ</span>
                <span>{delta >= 0 ? `+${delta}` : delta}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dedução Matemática do Pixel */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-mono text-slate-500 font-semibold uppercase tracking-wider">
          Dedução Matemática do Pixel:
        </div>
        <div className="p-3 bg-white rounded border border-slate-200/90 font-mono text-xs space-y-2 leading-relaxed text-slate-700">
          <div className="py-1 px-2 bg-slate-50 border border-slate-200/80 rounded-xs text-center text-[11px] text-[#00875a] font-bold">
            {formulaText}
          </div>
          <div className="space-y-1 pt-0.5">
            {stepsText.map((step, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-[11px]">
                <span className="text-[#00875a] font-bold shrink-0">Passo {idx + 1}:</span>
                <span className="text-slate-600 leading-normal">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Callout de Garantia de Saturação (Quantização Q) - Minimalista */}
      <div className="p-2.5 bg-slate-50/70 border border-slate-200/80 rounded text-xs space-y-1.5">
        <div className="font-bold flex items-center gap-1.5 text-slate-800">
          <span className="material-symbols-outlined text-sm text-[#00875a]">verified</span>
          <span className="text-[11px]">Garantia de Saturação (Quantização Q)</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          O valor calculado é delimitado por{' '}
          <code className="font-mono font-bold text-slate-800 bg-white px-1 py-0.2 rounded-xs border border-slate-200">
            Q(v) = min(255, max(0, round(v)))
          </code>{' '}
          assegurando fidelidade aos limites de 8 bits do padrão monocromático.
        </p>
        <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>Estado atual:</span>
          <span className={isLinear ? 'text-[#00875a] font-bold' : 'text-amber-700 font-bold'}>
            {isLinear
              ? 'Faixa Linear [0..255]'
              : isClippedLow
              ? 'Saturação em 0 (preto)'
              : 'Saturação em 255 (branco)'}
          </span>
        </div>
      </div>

      {/* Dica de Observação Didática - Minimalista */}
      {didacticNote && (
        <div className="p-2.5 bg-slate-50/70 border border-slate-200/80 rounded text-xs space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-slate-800">
            <span className="material-symbols-outlined text-sm text-amber-500">tips_and_updates</span>
            <span className="text-[11px]">Experimente Observar:</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-normal">{didacticNote}</p>
        </div>
      )}
    </div>
  );
};
