import React, { useState } from 'react';
import { convolve2D, createKernel } from '../core/convolution';
import { BorderPolicy, GrayImage, Kernel2D } from '../core/types';

interface MaskEditorProps {
  inputImage: GrayImage;
  borderPolicy: BorderPolicy;
  onApplyResult: (out: GrayImage, k: Kernel2D, offset: number) => void;
}

export const MaskEditor: React.FC<MaskEditorProps> = ({
  inputImage,
  borderPolicy,
  onApplyResult
}) => {
  const [weights, setWeights] = useState<number[][]>([
    [-1, -1, -1],
    [-1,  9, -1],
    [-1, -1, -1]
  ]);
  const [offset, setOffset] = useState<number>(0);

  const rows = weights.length;
  const cols = weights[0].length;

  const sum = weights.reduce((acc, row) => acc + row.reduce((rAcc, val) => rAcc + val, 0), 0);

  const handleCellChange = (r: number, c: number, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    const next = weights.map((row, rIdx) =>
      row.map((cell, cIdx) => (rIdx === r && cIdx === c ? val : cell))
    );
    setWeights(next);
  };

  const handleApply = () => {
    const k = createKernel(weights);
    const out = convolve2D(inputImage, k, offset, borderPolicy);
    onApplyResult(out, k, offset);
  };

  const loadPreset = (presetWeights: number[][], presetOffset = 0) => {
    setWeights(presetWeights);
    setOffset(presetOffset);
  };

  return (
    <div className="w-full bg-white rounded-md border border-slate-200 p-6 space-y-5 shadow-xs">
      
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Editor Interativo de Máscara de Convolução 2D</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure coeficientes arbitrários, âncora, offset e teste máscaras personalizadas (RF-07, C19–C20).
          </p>
        </div>

        <button
          onClick={handleApply}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">play_arrow</span>
          <span>Executar Convolução</span>
        </button>
      </div>

      {/* Presets Rápidos */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
          Carregar Presets Oficiais da Disciplina:
        </span>
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          <button
            onClick={() => loadPreset([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]], 0)}
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-teal-50 hover:text-teal-700 border border-slate-200 transition-colors"
          >
            TC-01: Aguçamento (c=1, d=1)
          </button>
          <button
            onClick={() => loadPreset([[0, 0, 0], [0, 1, 0], [0, 0, -1]], 128)}
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-teal-50 hover:text-teal-700 border border-slate-200 transition-colors"
          >
            TC-02: Relevo h1 (+offset 128)
          </button>
          <button
            onClick={() => loadPreset([[0, 0, 2], [0, -1, 0], [-1, 0, 0]], 128)}
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-teal-50 hover:text-teal-700 border border-slate-200 transition-colors"
          >
            TC-02: Relevo h2 (+offset 128)
          </button>
          <button
            onClick={() => loadPreset([[-1, -1, 0], [1, 0, 1], [0, 1, 1]], 0)}
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-teal-50 hover:text-teal-700 border border-slate-200 transition-colors"
          >
            TC-03: Borda h3 (soma +2)
          </button>
          <button
            onClick={() => loadPreset([[0, -1, 0], [-1, -4, -1], [0, -1, 0]], 0)}
            className="px-2.5 py-1 rounded bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors font-semibold"
          >
            TC-03: Borda h4 (soma -8)
          </button>
          <button
            onClick={() => loadPreset([[0, 1, 0], [1, -4, 1], [0, 1, 0]], 0)}
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-teal-50 hover:text-teal-700 border border-slate-200 transition-colors"
          >
            Laplaciano 4-viz
          </button>
        </div>
      </div>

      {/* Grid de Edição da Máscara */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        
        {/* Editor de Células */}
        <div className="p-4 bg-slate-50 rounded-md border border-slate-200 flex flex-col items-center">
          <div className="text-xs font-mono text-slate-500 mb-3">
            Matriz {rows}×{cols} de Coeficientes:
          </div>

          <div
            className="grid gap-1.5 p-2 bg-white rounded-lg border border-slate-300 shadow-inner"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {weights.map((row, r) =>
              row.map((val, c) => {
                const isCenter = r === Math.floor(rows / 2) && c === Math.floor(cols / 2);
                return (
                  <input
                    key={`${r}-${c}`}
                    type="number"
                    step="any"
                    value={val}
                    onChange={e => handleCellChange(r, c, e.target.value)}
                    className={`w-14 h-12 text-center font-mono text-sm font-bold rounded border focus:outline-none focus:border-teal-600 transition-colors ${
                      isCenter
                        ? 'bg-teal-50 border-blue-500 text-blue-900 ring-1 ring-blue-300'
                        : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  />
                );
              })
            )}
          </div>

          <div className="mt-3 flex items-center justify-between w-full text-xs font-mono px-2">
            <span className="text-slate-500">Soma dos Coeficientes:</span>
            <span className={`font-bold px-2 py-0.5 rounded ${sum === 0 ? 'bg-slate-200 text-slate-700' : sum > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              ∑ h_ij = {sum}
            </span>
          </div>
        </div>

        {/* Parâmetros Adicionais */}
        <div className="space-y-4 text-xs font-mono">
          <div className="p-4 bg-slate-50 rounded-md border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-semibold">Offset Adicionado ao Final:</span>
              <span className="text-teal-700 font-bold text-sm">+{offset}</span>
            </div>
            <input
              type="range"
              min="0"
              max="255"
              value={offset}
              onChange={e => setOffset(parseInt(e.target.value) || 0)}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 font-sans">
              O offset é somado uma única vez à soma ponderada para permitir a visualização de valores negativos (ex: relevo com offset 128).
            </p>
          </div>

          <div className="p-3.5 bg-teal-50/60 rounded-md border border-blue-100 text-slate-700 text-[11px] leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-1">
              <span className="material-symbols-outlined text-sm">sync</span>
              <span>Rotação Automática de 180° Integrada</span>
            </div>
            O MIRA realiza internamente a rotação formal de 180° antes de computar os produtos, garantindo a distinção entre Convolução Legítima e Correlação Cruzada.
          </div>
        </div>

      </div>

    </div>
  );
};
