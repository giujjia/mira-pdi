import React, { useState } from 'react';
import { convolve2D, createKernel } from '../core/convolution';
import { BorderPolicy, GrayImage, Kernel2D } from '../core/types';

interface MaskEditorProps {
  initialKernel?: Kernel2D | null;
  initialOffset?: number;
  inputImage: GrayImage;
  borderPolicy: BorderPolicy;
  onApplyResult: (out: GrayImage, k: Kernel2D, offset: number) => void;
}

export const MaskEditor: React.FC<MaskEditorProps> = ({
  initialKernel, initialOffset = 0,
  inputImage,
  borderPolicy,
  onApplyResult
}) => {
  const [weights, setWeights] = useState<number[][]>(initialKernel?.weights ?? [
    [-1, -1, -1],
    [-1,  9, -1],
    [-1, -1, -1]
  ]);
  const [offset, setOffset] = useState<number>(initialOffset);
  const [anchorX, setAnchorX] = useState(initialKernel?.anchorX ?? 1);
  const [anchorY, setAnchorY] = useState(initialKernel?.anchorY ?? 1);

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

  const handleApply = (currentWeights = weights, currentOffset = offset) => {
    const k = createKernel(currentWeights, anchorX, anchorY);
    const out = convolve2D(inputImage, k, currentOffset, borderPolicy);
    onApplyResult(out, k, currentOffset);
  };

  const loadPreset = (presetWeights: number[][], presetOffset = 0) => {
    setWeights(presetWeights);
    setOffset(presetOffset);
    const k = createKernel(presetWeights);
    setAnchorX(k.anchorX); setAnchorY(k.anchorY);
    onApplyResult(convolve2D(inputImage, k, presetOffset, borderPolicy), k, presetOffset);
  };

  const handleOffsetChange = (newOffset: number) => {
    setOffset(newOffset);

  };

  return (
    <div className="w-full bg-white rounded-md border border-slate-200 p-4 space-y-4 shadow-xs">
      
      {/* Cabeçalho do Editor */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base text-[#00875a]">grid_view</span>
            <span>Controles da Máscara de Convolução 2D</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Coeficientes arbitrários, âncora, offset e máscaras personalizadas (RF-07, C19 e C20).
          </p>
        </div>

        <button
          onClick={() => handleApply()}
          className="px-3 py-1.5 bg-[#00875a] hover:bg-[#00704a] text-white font-semibold text-xs rounded shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">play_arrow</span>
          <span>Executar Convolução</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {(['Linhas', 'Colunas'] as const).map((label, i) => <label key={label}>{label} (1–15)
          <input aria-label={label} className="border rounded p-1 w-16 ml-1" type="number" min={1} max={15} value={i === 0 ? rows : cols} onChange={e => {
            const n = Math.max(1, Math.min(15, Math.trunc(Number(e.target.value)) || 1));
            const nr = i === 0 ? n : rows, nc = i === 1 ? n : cols;
            setWeights(Array.from({length:nr}, (_,r) => Array.from({length:nc}, (_,c) => weights[r]?.[c] ?? 0)));
            setAnchorX(Math.min(anchorX,nc-1)); setAnchorY(Math.min(anchorY,nr-1));
          }} /></label>)}
        <label>Âncora X <input aria-label="Âncora X" className="border rounded p-1 w-16" type="number" min={0} max={cols-1} value={anchorX} onChange={e => setAnchorX(Math.max(0, Math.min(cols-1, Math.trunc(Number(e.target.value)) || 0)))} /></label>
        <label>Âncora Y <input aria-label="Âncora Y" className="border rounded p-1 w-16" type="number" min={0} max={rows-1} value={anchorY} onChange={e => setAnchorY(Math.max(0, Math.min(rows-1, Math.trunc(Number(e.target.value)) || 0)))} /></label>
        <p className="w-full text-slate-500">Índices começam em zero. A célula verde é a âncora antes da rotação. Após editar, clique em Executar Convolução para atualizar a imagem e o inspetor.</p>
      </div>
      {/* Presets Rápidos da Disciplina */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
          Carregar Presets Oficiais da Disciplina:
        </span>
        <div className="flex flex-wrap gap-1.5 text-xs font-mono">
          <button
            onClick={() => loadPreset([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]], 0)}
            className="px-2 py-1 rounded-sm bg-slate-100 hover:bg-emerald-50 hover:text-[#00875a] border border-slate-200 text-[11px] transition-colors cursor-pointer"
          >
            TC-01: Aguçamento (c=1, d=1)
          </button>
          <button
            onClick={() => loadPreset([[0, 0, 0], [0, 1, 0], [0, 0, -1]], 128)}
            className="px-2 py-1 rounded-sm bg-slate-100 hover:bg-emerald-50 hover:text-[#00875a] border border-slate-200 text-[11px] transition-colors cursor-pointer"
          >
            TC-02: Relevo h1 (+128)
          </button>
          <button
            onClick={() => loadPreset([[0, 0, 2], [0, -1, 0], [-1, 0, 0]], 128)}
            className="px-2 py-1 rounded-sm bg-slate-100 hover:bg-emerald-50 hover:text-[#00875a] border border-slate-200 text-[11px] transition-colors cursor-pointer"
          >
            TC-02: Relevo h2 (+128)
          </button>
          <button
            onClick={() => loadPreset([[-1, -1, 0], [1, 0, 1], [0, 1, 1]], 0)}
            className="px-2 py-1 rounded-sm bg-slate-100 hover:bg-emerald-50 hover:text-[#00875a] border border-slate-200 text-[11px] transition-colors cursor-pointer"
          >
            TC-03: Borda h3 (+2)
          </button>
          <button
            onClick={() => loadPreset([[0, -1, 0], [-1, -4, -1], [0, -1, 0]], 0)}
            className="px-2 py-1 rounded-sm bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200 text-[11px] font-semibold transition-colors cursor-pointer"
          >
            TC-03: Borda h4 (-8)
          </button>
          <button
            onClick={() => loadPreset([[0, 1, 0], [1, -4, 1], [0, 1, 0]], 0)}
            className="px-2 py-1 rounded-sm bg-slate-100 hover:bg-emerald-50 hover:text-[#00875a] border border-slate-200 text-[11px] transition-colors cursor-pointer"
          >
            Laplaciano 4-viz
          </button>
        </div>
      </div>

      {/* Grid de Edição da Máscara & Parâmetros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-1">
        
        {/* Editor de Células Matriciais 3x3 */}
        <div className="p-3 bg-slate-50/70 rounded-md border border-slate-200/80 flex flex-col items-center overflow-x-auto">
          <div className="text-[11px] font-mono text-slate-500 mb-2 font-semibold">
            Matriz {rows}×{cols} de Coeficientes:
          </div>

          <div
            className="grid gap-1.5 p-1.5 bg-white rounded border border-slate-200 shadow-2xs"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {weights.map((row, r) =>
              row.map((val, c) => {
                const isCenter = r === anchorY && c === anchorX;
                return (
                  <input
                    key={`${r}-${c}`}
                    aria-label={`Peso linha ${r}, coluna ${c}`}
                    type="number"
                    step="any"
                    value={val}
                    onChange={e => handleCellChange(r, c, e.target.value)}
                    className={`w-11 h-9 sm:w-12 sm:h-10 text-center font-mono text-xs font-bold rounded border focus:outline-none focus:border-[#00875a] transition-colors ${
                      isCenter
                        ? 'bg-emerald-50 border-[#00875a] text-[#00875a] ring-1 ring-[#00875a]/30'
                        : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  />
                );
              })
            )}
          </div>

          <div className="mt-2.5 flex items-center justify-between w-full text-[11px] font-mono px-1">
            <span className="text-slate-500">Soma ∑:</span>
            <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
              sum === 0 
                ? 'bg-slate-200 text-slate-700' 
                : sum > 0 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-amber-100 text-amber-800'
            }`}>
              ∑ h_ij = {sum}
            </span>
          </div>
        </div>

        {/* Parâmetros Adicionais & Offset */}
        <div className="space-y-3 text-xs font-mono">
          <div className="p-3 bg-slate-50/70 rounded-md border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-semibold text-[11px]">Offset Adicionado:</span>
              <span className="text-[#00875a] font-bold text-xs bg-white px-2 py-0.5 rounded border border-slate-200">
                {offset}
              </span>
            </div>
            <input
              aria-label="Offset"
              type="number"
              step="any"
              value={offset}
              onChange={e => handleOffsetChange(Number(e.target.value) || 0)}
              className="w-full accent-[#00875a] cursor-pointer"
            />
            <p className="text-[10px] text-slate-400 font-sans leading-tight">
              Somado após a soma ponderada para acomodar valores negativos (ex: relevo com offset 128).
            </p>
          </div>

          {/* Callout de Rotação Formal de 180° */}
          <div className="p-2.5 bg-emerald-50/50 rounded-md border border-emerald-100 text-slate-700 text-[11px] leading-relaxed">
            <div className="flex items-center gap-1 font-bold text-emerald-900 mb-0.5 text-[11px]">
              <span className="material-symbols-outlined text-xs text-[#00875a]">sync</span>
              <span>Rotação Automática de 180°</span>
            </div>
            <p className="text-[10px] text-slate-600 font-sans leading-snug">
              O MIRA rotaciona internamente o kernel em 180° antes dos produtos, garantindo convolução legítima e não mera correlação.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
