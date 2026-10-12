import { signedDisplay } from '../core/display';
import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { toImageData } from '../core/matrix';
import { GrayImage } from '../core/types';

interface SplitCanvasProps {
  beforeImg: GrayImage;
  afterImg: GrayImage;
  selectedCoord: { x: number; y: number } | null;
  onSelectPixel: (x: number, y: number) => void;
  viewMode: 'split' | 'sideBySide' | 'beforeOnly' | 'afterOnly';
  labels?: { before: string; after: string };
  
}

export const SplitCanvas: React.FC<SplitCanvasProps> = ({
  beforeImg,
  afterImg,
  selectedCoord,
  onSelectPixel,
  viewMode,
  labels = { before: 'ANTES', after: 'DEPOIS' },
  
}) => {
  const [showSigned, setShowSigned] = useState(false);
  const signed = useMemo(() => showSigned ? signedDisplay(afterImg) : null, [afterImg, showSigned]);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasBeforeRef = useRef<HTMLCanvasElement>(null);
  const canvasAfterRef = useRef<HTMLCanvasElement>(null);

  const [splitPos, setSplitPos] = useState<number>(50); // porcentagem 0..100
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 540, height: 540 });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [viewMode]);

  // Desenho fidedigno no canvas
  const drawImages = useCallback(() => {
    if (canvasBeforeRef.current) {
      const ctx = canvasBeforeRef.current.getContext('2d');
      if (ctx) {
        const idata = toImageData(beforeImg, ctx);
        ctx.putImageData(idata, 0, 0);
      }
    }
    if (canvasAfterRef.current) {
      const ctx = canvasAfterRef.current.getContext('2d');
      if (ctx) {
        const idata = toImageData(signed?.image ?? afterImg, ctx);
        ctx.putImageData(idata, 0, 0);
      }
    }
  }, [beforeImg, afterImg, viewMode, signed]);

  useEffect(() => {
    const animId = requestAnimationFrame(drawImages);
    return () => cancelAnimationFrame(animId);
  }, [drawImages, viewMode]);

  // Arraste do divisor (apenas na linha divisória ou alça)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewMode !== 'split') return;
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
  };

  const updateSplitFromClientX = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const p = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100));
    setSplitPos(p);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) updateSplitFromClientX(e.clientX);
    };
    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Clique na imagem para selecionar o pixel
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const scaleX = beforeImg.width / rect.width;
    const scaleY = beforeImg.height / rect.height;

    const pxX = Math.floor(clickX * scaleX);
    const pxY = Math.floor(clickY * scaleY);

    if (pxX >= 0 && pxX < beforeImg.width && pxY >= 0 && pxY < beforeImg.height) {
      onSelectPixel(pxX, pxY);
    }
  };

  const imgW = beforeImg.width;
  const imgH = beforeImg.height;

  return (
    <div className="w-full min-w-0">
      <label className="block text-xs text-slate-600 mb-2"><input type="checkbox" checked={showSigned} onChange={e => setShowSigned(e.target.checked)} /> Visualizar resposta com sinal (escala simétrica)</label>
      {signed && <p className="text-xs text-slate-500 mb-2">Saída: preto = −{signed.extent.toFixed(1)} · cinza = 0 · branco = +{signed.extent.toFixed(1)}. Escala apenas visual; inspetor, histograma e exportação mantêm os valores originais e Q(v).</p>}
    <div className="w-full flex flex-col items-center justify-center">
      
      {/* MODO LADO A LADO */}
      {viewMode === 'sideBySide' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {/* Antes */}
          <div className="p-3 bg-slate-50/80 rounded border border-slate-200 flex flex-col items-center">
            <span className="text-xs font-mono text-slate-600 mb-2 font-bold tracking-wider">{labels.before}</span>
            <div className="relative border border-slate-300 rounded overflow-hidden shadow-xs bg-white">
              <canvas
                ref={canvasBeforeRef}
                width={imgW}
                height={imgH}
                style={{ width: '100%', maxWidth: '320px', height: 'auto', aspectRatio: `${imgW}/${imgH}`, imageRendering: 'pixelated' }}
                onClick={handleCanvasClick}
                className="cursor-crosshair block"
              />
              {selectedCoord && (
                <div
                  className="absolute pointer-events-none rounded-xs z-30 flex items-center justify-center"
                  style={{
                    left: `${(selectedCoord.x / imgW) * 100}%`,
                    top: `${(selectedCoord.y / imgH) * 100}%`,
                    width: '16px',
                    height: '16px',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div className="w-full h-full border-2 border-[#00875a] ring-2 ring-white/95 rounded-xs shadow-[0_0_10px_rgba(0,135,90,0.9)]" />
                  <div className="absolute w-1.5 h-1.5 bg-[#00875a] ring-1 ring-white rounded-full" />
                </div>
              )}
            </div>
          </div>

          {/* Depois */}
          <div className="p-3 bg-slate-50/80 rounded border border-slate-200 flex flex-col items-center">
            <span className="text-xs font-mono text-[#00875a] mb-2 font-bold tracking-wider">{labels.after}</span>
            <div className="relative border border-slate-300 rounded overflow-hidden shadow-xs bg-white">
              <canvas
                ref={canvasAfterRef}
                width={imgW}
                height={imgH}
                style={{ width: '100%', maxWidth: '320px', height: 'auto', aspectRatio: `${imgW}/${imgH}`, imageRendering: 'pixelated' }}
                onClick={handleCanvasClick}
                className="cursor-crosshair block"
              />
              {selectedCoord && (
                <div
                  className="absolute pointer-events-none rounded-xs z-30 flex items-center justify-center"
                  style={{
                    left: `${(selectedCoord.x / imgW) * 100}%`,
                    top: `${(selectedCoord.y / imgH) * 100}%`,
                    width: '16px',
                    height: '16px',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div className="w-full h-full border-2 border-[#00875a] ring-2 ring-white/95 rounded-xs shadow-[0_0_10px_rgba(0,135,90,0.9)]" />
                  <div className="absolute w-1.5 h-1.5 bg-[#00875a] ring-1 ring-white rounded-full" />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : viewMode === 'beforeOnly' ? (
        /* MODO ANTES APENAS */
        <div
          ref={containerRef}
          style={{ aspectRatio: `${imgW}/${imgH}` }}
          className="relative rounded border border-slate-200 overflow-hidden shadow-xs flex items-center justify-center select-none bg-slate-900 w-full max-w-[540px]"
        >
          <canvas
            ref={canvasBeforeRef}
            width={imgW}
            height={imgH}
            style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }}
            onClick={handleCanvasClick}
            className="cursor-crosshair block"
          />
          <div className="absolute top-4 left-4 text-[10px] font-mono px-2.5 py-1 rounded-xs bg-white/95 text-slate-900 border border-slate-200 font-bold tracking-wider shadow-sm">
            {labels.before}
          </div>
          {selectedCoord && (
            <div
              className="absolute pointer-events-none rounded-xs z-40 flex items-center justify-center"
              style={{
                left: `${(selectedCoord.x / imgW) * 100}%`,
                top: `${(selectedCoord.y / imgH) * 100}%`,
                width: '18px',
                height: '18px',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="w-full h-full border-2 border-[#00875a] ring-2 ring-white/95 rounded-xs shadow-[0_0_12px_rgba(0,135,90,0.9)]" />
              <div className="absolute w-1.5 h-1.5 bg-[#00875a] ring-1 ring-white rounded-full" />
            </div>
          )}
        </div>
      ) : viewMode === 'afterOnly' ? (
        /* MODO DEPOIS APENAS */
        <div
          ref={containerRef}
          style={{ aspectRatio: `${imgW}/${imgH}` }}
          className="relative rounded border border-slate-200 overflow-hidden shadow-xs flex items-center justify-center select-none bg-slate-900 w-full max-w-[540px]"
        >
          <canvas
            ref={canvasAfterRef}
            width={imgW}
            height={imgH}
            style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }}
            onClick={handleCanvasClick}
            className="cursor-crosshair block"
          />
          <div className="absolute top-4 right-4 text-[10px] font-mono px-2.5 py-1 rounded-xs bg-[#00875a] text-white font-bold tracking-wider shadow-sm">
            {labels.after}
          </div>
          {selectedCoord && (
            <div
              className="absolute pointer-events-none rounded-xs z-40 flex items-center justify-center"
              style={{
                left: `${(selectedCoord.x / imgW) * 100}%`,
                top: `${(selectedCoord.y / imgH) * 100}%`,
                width: '18px',
                height: '18px',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="w-full h-full border-2 border-[#00875a] ring-2 ring-white/95 rounded-xs shadow-[0_0_12px_rgba(0,135,90,0.9)]" />
              <div className="absolute w-1.5 h-1.5 bg-[#00875a] ring-1 ring-white rounded-full" />
            </div>
          )}
        </div>
      ) : (
        /* MODO SPLIT SLIDER VERTICAL HERO (1:1 Quadrado Perfeito) */
        <div
          ref={containerRef}
          style={{ aspectRatio: `${imgW}/${imgH}` }}
          className="relative rounded border border-slate-200 overflow-hidden shadow-xs flex items-center justify-center select-none bg-slate-900 w-full max-w-[540px]"
        >
          {/* Camada do "Depois" (Fundo total) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <canvas
              ref={canvasAfterRef}
              width={imgW}
              height={imgH}
              style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }}
              onClick={handleCanvasClick}
              className="cursor-crosshair block"
            />
            <div className="absolute top-4 right-4 text-[10px] font-mono px-2.5 py-1 rounded-xs bg-[#00875a] text-white font-bold tracking-wider shadow-sm">
              {labels.after}
            </div>
          </div>

          {/* Camada do "Antes" (Recortada pela largura splitPos) */}
          <div
            className="absolute inset-y-0 left-0 overflow-hidden"
            style={{ width: `${splitPos}%` }}
          >
            <div style={{ width: `${containerSize.width}px`, height: `${containerSize.height}px` }} className="relative flex items-center justify-center">
              <canvas
                ref={canvasBeforeRef}
                width={imgW}
                height={imgH}
                style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }}
                onClick={handleCanvasClick}
                className="cursor-crosshair block"
              />
            </div>
            <div className="absolute top-4 left-4 text-[10px] font-mono px-2.5 py-1 rounded-xs bg-white/95 text-slate-900 border border-slate-200 font-bold tracking-wider shadow-sm">
              {labels.before}
            </div>
          </div>

          {/* Linha Divisória & Alça Quadrada Verde (Arraste exclusivo pela linha/alça) */}
          <div
            onMouseDown={handleMouseDown}
            className="absolute top-0 bottom-0 cursor-ew-resize z-30 flex items-center justify-center group"
            style={{
              left: `${splitPos}%`,
              transform: 'translateX(-50%)',
              width: '20px',
            }}
          >
            {/* Linha visual fina de 2px */}
            <div className="w-0.5 h-full bg-[#00875a] shadow-md group-hover:bg-emerald-400 transition-colors pointer-events-none" />

            {/* Alça quadrada centralizada */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-[#00875a] rounded-sm shadow-sm cursor-ew-resize group-hover:scale-110 transition-transform pointer-events-none"
              title="Arraste para comparar"
            />
          </div>

          {/* Retículo do Pixel Selecionado de Alto Contraste */}
          {selectedCoord && (
            <div
              className="absolute pointer-events-none rounded-xs z-40 flex items-center justify-center"
              style={{
                left: `${(selectedCoord.x / imgW) * 100}%`,
                top: `${(selectedCoord.y / imgH) * 100}%`,
                width: '18px',
                height: '18px',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="w-full h-full border-2 border-[#00875a] ring-2 ring-white/95 rounded-xs shadow-[0_0_12px_rgba(0,135,90,0.9)]" />
              <div className="absolute w-1.5 h-1.5 bg-[#00875a] ring-1 ring-white rounded-full" />
            </div>
          )}
        </div>
      )}
      {viewMode === 'split' && <label className="mt-4 w-full max-w-[540px] text-xs text-slate-600">
        Comparação: mova o divisor para revelar o antes e o depois
        <input aria-label="Posição do divisor antes e depois" type="range" min={0} max={100} value={splitPos} onChange={e => setSplitPos(Number(e.target.value))} className="mt-2 w-full accent-emerald-700" />
      </label>}
    </div>
    </div>
  );
};
