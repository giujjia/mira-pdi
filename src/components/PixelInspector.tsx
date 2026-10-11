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
  maxWidth = 512,
  maxHeight = 512
}) => {
  if (!explanation) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-xs text-center text-xs text-slate-400 font-mono">
        <span className="material-symbols-outlined text-[#00875a] text-2xl mb-1.5 block animate-pulse">
          touch_app
        </span>
        Clique em um pixel da imagem para inspecionar
      </div>
    );
  }

  const {
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
  const isLinear = !isClippedLow && valRaw <= 255;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Cabeçalho com Coordenadas */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#00875a]">
            ENTENDA ESTE PIXEL
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600 shrink-0">
          <label htmlFor="inspector-coord-x" className="text-slate-500 font-bold">
            x=
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
            className="w-14 bg-slate-50 hover:bg-white border border-slate-300 focus:border-[#00875a] focus:ring-2 focus:ring-[#00875a]/20 rounded-md px-1.5 py-0.5 text-center font-bold text-slate-900 focus:outline-none transition-all shadow-2xs"
          />
          <label htmlFor="inspector-coord-y" className="text-slate-500 font-bold ml-1">
            y=
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
            className="w-14 bg-slate-50 hover:bg-white border border-slate-300 focus:border-[#00875a] focus:ring-2 focus:ring-[#00875a]/20 rounded-md px-1.5 py-0.5 text-center font-bold text-slate-900 focus:outline-none transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Vizinhança 3x3 */}
      <div className="space-y-1">
        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider text-center font-semibold">
          Vizinhança 3×3 dos Pixels (1:1)
        </div>
        <div className="grid grid-cols-3 gap-2 font-mono text-center text-xs pt-1 max-w-[270px] mx-auto w-full">
          {neighbors && neighbors.length === 9 ? (
            neighbors.map((nbVal, idx) => {
              const isCenter = idx === 4;
              const weight = kernelWeights ? kernelWeights[Math.floor(idx / 3)][idx % 3] : null;
              return (
                <div
                  key={idx}
                  className={`aspect-square rounded-md flex flex-col items-center justify-center transition-all ${
                    isCenter
                      ? 'bg-[#00875a] text-white font-bold text-sm shadow-xs'
                      : 'bg-slate-50/80 border border-slate-200 text-slate-700 font-medium'
                  }`}
                >
                  <div className="leading-none">{nbVal}</div>
                  {weight !== null && (
                    <div
                      className={`text-[9px] font-mono mt-1 leading-none ${
                        isCenter ? 'text-emerald-100' : 'text-slate-400'
                      }`}
                    >
                      ×{weight}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-3 aspect-[3/1] bg-slate-50 rounded-md flex items-center justify-center text-center font-mono text-xs text-slate-600">
              Pixel central: {valIn}
            </div>
          )}
        </div>
      </div>

      {/* Valores: Entrada -> Saída Bruta -> Quantizado */}
      <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200/80 font-mono text-xs flex items-center justify-between">
        <div>
          <span className="text-slate-400 text-[10px] block">Entrada f</span>
          <strong className="text-slate-900 font-bold">{valIn}</strong>
        </div>
        <span className="text-slate-300">→</span>
        <div>
          <span className="text-slate-400 text-[10px] block">Saída Bruta</span>
          <strong className="text-[#00875a] font-bold">
            {Number.isInteger(valRaw) ? valRaw : valRaw.toFixed(2)}
          </strong>
        </div>
        <span className="text-slate-300">→</span>
        <div>
          <span className="text-slate-400 text-[10px] block">Quantizado</span>
          <strong className="text-emerald-700 font-bold">Q = {valQuant}</strong>
        </div>
      </div>

      {/* Fórmula e Passos de Dedução */}
      <div className="space-y-2 pt-1 font-mono text-xs">
        <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg text-center text-[11px] text-[#00875a] font-bold">
          {formulaText}
        </div>
        <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-1.5 text-[10px] text-slate-600 leading-relaxed overflow-x-auto">
          {stepsText.map((step, idx) => (
            <div key={idx} className="flex items-start gap-1.5">
              <span className="text-[#00875a] font-bold">•</span>
              <span className="text-slate-700">{step}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-slate-200/70 text-slate-500 flex items-center justify-between font-semibold">
            <span>Quantização Q(v):</span>
            <span className={isLinear ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
              {isLinear
                ? 'Faixa Linear [0..255]'
                : isClippedLow
                ? 'Saturação em 0 (preto)'
                : 'Saturação em 255 (branco)'}
            </span>
          </div>
        </div>
      </div>

      {/* Interpretação Didática */}
      <div className="p-3 bg-slate-50/80 rounded-md border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-1 font-sans">
        <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-[11px]">
          <span className="material-symbols-outlined text-xs text-[#00875a]">insights</span>
          <span>Interpretação Matemática:</span>
        </div>
        <p className="text-[11px] text-slate-500 pl-4 leading-normal">{didacticNote}</p>
      </div>
    </div>
  );
};
