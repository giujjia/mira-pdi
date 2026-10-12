import React from 'react';
import { ModuleKey } from './Sidebar';

interface ModuleControlsProps {
  activeModule: ModuleKey;
  // Pointwise
  pointwiseOp: 'negative' | 'threshold' | 'stretching';
  thresholdVal: number;
  setThresholdVal: (val: number) => void;
  smin: number;
  setSmin: (val: number) => void;
  smax: number;
  setSmax: (val: number) => void;
  // Gamma & Log
  gammaOp: 'gamma' | 'log';
  setGammaOp: (op: 'gamma' | 'log') => void;
  gammaVal: number;
  setGammaVal: (val: number) => void;
  logConst: number;
  setLogConst: (val: number) => void;
  // Dissolve
  dissolveMode: 'uniform' | 'horizontal' | 'vertical' | 'diagonal';
  setDissolveMode: (mode: 'uniform' | 'horizontal' | 'vertical' | 'diagonal') => void;
  dissolveT: number;
  setDissolveT: (val: number) => void;
  // Smoothing
  smoothingOp: 'mean' | 'median' | 'adaptive';
  smoothingSize: number;
  setSmoothingSize: (size: number) => void;
  adaptiveC: number;
  setAdaptiveC: (val: number) => void;
  // Edges
  edgeOp: 'sobel' | 'roberts' | 'kirsch' | 'laplacian';
  sobelComp: 'magnitude' | 'gx' | 'gy';
  setSobelComp: (comp: 'magnitude' | 'gx' | 'gy') => void;
  // Sharpening
  sharpenOp: 'laplacian' | 'highBoost';
  laplacianMode: 'centerNegative' | 'centerPositive';
  setLaplacianMode: (mode: 'centerNegative' | 'centerPositive') => void;
  highBoostK: number;
  setHighBoostK: (val: number) => void;
  // Mandatory
  mandatoryTC: 'TC-01' | 'TC-02' | 'TC-03';
  tc01C: number;
  setTc01C: (val: number) => void;
  tc01D: number;
  setTc01D: (val: number) => void;
  tc01Offset: number;
  setTc01Offset: (val: number) => void;
  tc02Variant: 'h1' | 'h2';
  setTc02Variant: (v: 'h1' | 'h2') => void;
  tc02Offset: number;
  setTc02Offset: (val: number) => void;
  tc03Variant: 'h3' | 'h4';
  setTc03Variant: (v: 'h3' | 'h4') => void;
  tc03Offset: number;
  setTc03Offset: (val: number) => void;
}

export const ModuleControls: React.FC<ModuleControlsProps> = ({
  activeModule,
  pointwiseOp,
  thresholdVal,
  setThresholdVal,
  smin,
  setSmin,
  smax,
  setSmax,
  gammaOp,
  setGammaOp,
  gammaVal,
  setGammaVal,
  logConst,
  setLogConst,
  dissolveMode,
  setDissolveMode,
  dissolveT,
  setDissolveT,
  smoothingOp,
  smoothingSize,
  setSmoothingSize,
  adaptiveC,
  setAdaptiveC,
  edgeOp,
  sobelComp,
  setSobelComp,
  sharpenOp,
  laplacianMode,
  setLaplacianMode,
  highBoostK,
  setHighBoostK,
  mandatoryTC,
  tc01C,
  setTc01C,
  tc01D,
  setTc01D,
  tc01Offset,
  setTc01Offset,
  tc02Variant,
  setTc02Variant,
  tc02Offset,
  setTc02Offset,
  tc03Variant,
  setTc03Variant,
  tc03Offset,
  setTc03Offset
}) => {
  return (
    <div className="space-y-1.5">
      {/* 1. Pointwise: Threshold */}
      {activeModule === 'pointwise' && pointwiseOp === 'threshold' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              LIMIARIZAÇÃO
            </span>
            <span className="text-[#00875a] font-bold">{thresholdVal}</span>
          </div>
          <input
            type="range"
            min={0}
            max={255}
            value={thresholdVal}
            onChange={(e) => setThresholdVal(parseInt(e.target.value, 10) || 0)}
            className="w-full accent-[#00875a] cursor-pointer"
          />
        </div>
      )}

      {/* 2. Pointwise: Contrast Stretching */}
      {activeModule === 'pointwise' && pointwiseOp === 'stretching' && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
            FAIXA DE SAÍDA [smin, smax]
          </span>
          <div className="flex items-center gap-2 font-mono text-xs">
            <input
              type="number"
              min={0}
              max={255}
              value={smin}
              onChange={(e) => setSmin(parseInt(e.target.value, 10) || 0)}
              className="w-16 px-2 py-1.5 rounded border border-slate-200 text-center"
            />
            <span className="text-slate-400">até</span>
            <input
              type="number"
              min={0}
              max={255}
              value={smax}
              onChange={(e) => setSmax(parseInt(e.target.value, 10) || 255)}
              className="w-16 px-2 py-1.5 rounded border border-slate-200 text-center"
            />
          </div>
        </div>
      )}

      {/* 3. Curvas Gamma & Log Transform */}
      {activeModule === 'gamma' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
          {/* Seletor de Operação */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 shrink-0">
              OPERAÇÃO:
            </span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded text-xs font-medium">
              <button
                onClick={() => setGammaOp('gamma')}
                className={`px-2.5 py-1 rounded-sm transition-all ${
                  gammaOp === 'gamma'
                    ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Correção Gamma (γ)
              </button>
              <button
                onClick={() => setGammaOp('log')}
                className={`px-2.5 py-1 rounded-sm transition-all ${
                  gammaOp === 'log'
                    ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Logarítmica: c·ln(1+r)
              </button>
            </div>
          </div>

          {/* Barra de Scrollar (Slider) Alinhada Verticalmente com os Botões */}
          <div className="flex-1 sm:max-w-xs md:max-w-sm flex items-center gap-2.5">
            {gammaOp === 'gamma' ? (
              <>
                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase shrink-0">
                  VALOR γ:
                </span>
                <input
                  type="range"
                  min={0.05}
                  max={4.0}
                  step={0.05}
                  value={gammaVal}
                  onChange={(e) => setGammaVal(parseFloat(e.target.value) || 1.0)}
                  className="w-full accent-[#00875a] cursor-pointer"
                  title="Ajuste do expoente gamma (γ < 1 clareia tons escuros, γ > 1 comprime tons claros)"
                />
                <span className="text-xs font-mono font-bold text-[#00875a] shrink-0 min-w-[36px] text-right">
                  {gammaVal.toFixed(2)}
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase shrink-0">
                  GANHO c:
                </span>
                <input
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={logConst}
                  onChange={(e) => setLogConst(parseFloat(e.target.value) || 1.0)}
                  className="w-full accent-[#00875a] cursor-pointer"
                  title="Constante multiplicativa da curva logarítmica: s = c · ln(1 + r)"
                />
                <span className="text-xs font-mono font-bold text-[#00875a] shrink-0 min-w-[36px] text-right">
                  {logConst.toFixed(1)}x
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* 5. Dissolve */}
      {activeModule === 'dissolve' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
          {/* Seletor de Modo de Mistura */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 shrink-0">
              MODO:
            </span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded text-xs font-medium">
              {(['uniform', 'horizontal', 'vertical', 'diagonal'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setDissolveMode(m)}
                  className={`px-2.5 py-1 rounded-sm capitalize transition-all ${
                    dissolveMode === m
                      ? 'bg-white text-[#00875a] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m === 'uniform' ? 'Uniforme' : m === 'horizontal' ? 'Horizontal' : m === 'vertical' ? 'Vertical' : 'Diagonal'}
                </button>
              ))}
            </div>
          </div>

          {/* Barra de Scrollar do Peso (t) Alinhada Verticalmente com os Botões */}
          <div className="flex-1 sm:max-w-xs md:max-w-sm flex items-center gap-2.5">
            {dissolveMode === 'uniform' ? (
              <>
                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase shrink-0">
                  PESO t:
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={dissolveT}
                  onChange={(e) => setDissolveT(parseFloat(e.target.value) || 0.5)}
                  className="w-full accent-[#00875a] cursor-pointer"
                  title="Ajuste do fator de ponderação t (0 a 1)"
                />
                <span className="text-xs font-mono font-bold text-[#00875a] shrink-0 min-w-[36px] text-right">
                  {(dissolveT * 100).toFixed(0)}%
                </span>
              </>
            ) : (
              <div className="w-full flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded">
                <span className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase">
                  <span className="material-symbols-outlined text-xs text-[#00875a]">gradient</span>
                  <span>Rampa:</span>
                </span>
                <span className="text-slate-700 font-semibold">
                  {dissolveMode === 'horizontal' && 't(x) = x / (W - 1)'}
                  {dissolveMode === 'vertical' && 't(y) = y / (H - 1)'}
                  {dissolveMode === 'diagonal' && 't(x,y) = (x + y) / (W + H - 2)'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Smoothing */}
      {activeModule === 'smoothing' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              TAMANHO DA JANELA
            </span>
            <span className="text-[#00875a] font-bold">
              {smoothingSize}×{smoothingSize}
            </span>
          </div>
          <div className="flex gap-1.5">
            {[3, 5, 7].map((sz) => (
              <button
                key={sz}
                onClick={() => setSmoothingSize(sz)}
                className={`flex-1 py-1 rounded border text-xs font-mono ${
                  smoothingSize === sz
                    ? 'bg-[#00875a] text-white font-bold border-[#00875a]'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                {sz}×{sz}
              </button>
            ))}
          </div>
          {smoothingOp === 'adaptive' && (
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[10px] text-slate-400 font-bold uppercase">FATOR c</span>
                <span className="text-[#00875a] font-bold">{adaptiveC.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={3.0}
                step={0.1}
                value={adaptiveC}
                onChange={(e) => setAdaptiveC(parseFloat(e.target.value) || 1.0)}
                className="w-full accent-[#00875a] cursor-pointer"
              />
            </div>
          )}
        </div>
      )}

      {/* 7. Edges: Sobel Component */}
      {activeModule === 'edges' && edgeOp === 'sobel' && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
            COMPONENTE GRADIENTE
          </span>
          <div className="grid grid-cols-3 gap-1 text-xs font-mono">
            {(['magnitude', 'gx', 'gy'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setSobelComp(c)}
                className={`py-1 rounded border uppercase ${
                  sobelComp === c ? 'bg-[#00875a] text-white border-[#00875a] font-bold' : 'bg-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 8. Sharpening */}
      {activeModule === 'sharpening' && (
        <div className="space-y-2">
          {sharpenOp === 'laplacian' ? (
            <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
              <button
                onClick={() => setLaplacianMode('centerNegative')}
                className={`py-1 rounded border ${
                  laplacianMode === 'centerNegative'
                    ? 'bg-[#00875a] text-white font-bold'
                    : 'bg-white'
                }`}
              >
                Centro -4 (f - L)
              </button>
              <button
                onClick={() => setLaplacianMode('centerPositive')}
                className={`py-1 rounded border ${
                  laplacianMode === 'centerPositive'
                    ? 'bg-[#00875a] text-white font-bold'
                    : 'bg-white'
                }`}
              >
                Centro +4 (f + L)
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  GANHO (k)
                </span>
                <span className="text-[#00875a] font-bold">{highBoostK.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={4.0}
                step={0.1}
                value={highBoostK}
                onChange={(e) => setHighBoostK(parseFloat(e.target.value) || 1.0)}
                className="w-full accent-[#00875a] cursor-pointer"
              />
            </div>
          )}
        </div>
      )}

      {/* 9. Mandatory AV1 Cases */}
      {activeModule === 'mandatory' && (
        <div className="space-y-2 font-mono text-xs">
          {mandatoryTC === 'TC-01' && (
            <div className="flex items-center justify-between gap-1.5">
              <div>
                <span className="text-slate-400 text-[10px] block">c:</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={tc01C}
                  onChange={(e) => setTc01C(parseInt(e.target.value, 10) || 1)}
                  className="w-11 px-1 py-0.5 rounded border border-slate-200 text-center"
                />
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">d:</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={tc01D}
                  onChange={(e) => setTc01D(parseInt(e.target.value, 10) || 1)}
                  className="w-11 px-1 py-0.5 rounded border border-slate-200 text-center"
                />
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">offset:</span>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={tc01Offset}
                  onChange={(e) => setTc01Offset(parseInt(e.target.value, 10) || 0)}
                  className="w-13 px-1 py-0.5 rounded border border-slate-200 text-center"
                />
              </div>
            </div>
          )}

          {mandatoryTC === 'TC-02' && (
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                <button
                  onClick={() => setTc02Variant('h1')}
                  className={`px-2 py-1 rounded border ${
                    tc02Variant === 'h1' ? 'bg-[#00875a] text-white font-bold' : 'bg-white'
                  }`}
                >
                  h1
                </button>
                <button
                  onClick={() => setTc02Variant('h2')}
                  className={`px-2 py-1 rounded border ${
                    tc02Variant === 'h2' ? 'bg-[#00875a] text-white font-bold' : 'bg-white'
                  }`}
                >
                  h2
                </button>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-[10px]">off:</span>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={tc02Offset}
                  onChange={(e) => setTc02Offset(parseInt(e.target.value, 10) || 0)}
                  className="w-13 px-1 py-0.5 rounded border border-slate-200 text-center"
                />
              </div>
            </div>
          )}

          {mandatoryTC === 'TC-03' && (
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                <button
                  onClick={() => setTc03Variant('h3')}
                  className={`px-2 py-1 rounded border ${
                    tc03Variant === 'h3' ? 'bg-[#00875a] text-white font-bold' : 'bg-white'
                  }`}
                >
                  h3 (+2)
                </button>
                <button
                  onClick={() => setTc03Variant('h4')}
                  className={`px-2 py-1 rounded border ${
                    tc03Variant === 'h4' ? 'bg-[#00875a] text-white font-bold' : 'bg-white'
                  }`}
                >
                  h4 (-8)
                </button>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-[10px]">off:</span>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={tc03Offset}
                  onChange={(e) => setTc03Offset(parseInt(e.target.value, 10) || 0)}
                  className="w-13 px-1 py-0.5 rounded border border-slate-200 text-center"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
