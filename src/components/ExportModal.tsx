import React, { useEffect, useRef } from 'react';
import { toImageData } from '../core/matrix';
import { GrayImage } from '../core/types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: GrayImage;
  operationName: string;
  parameters: Record<string, unknown>;
  borderPolicy: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  image,
  operationName,
  parameters,
  borderPolicy
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement;
    modalRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownloadPNG = () => {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const idata = toImageData(image, ctx);
      ctx.putImageData(idata, 0, 0);

      const link = document.createElement('a');
      link.download = `mira_${operationName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const handleDownloadJSON = () => {
    const meta = {
      project: 'MIRA: Laboratório de PDI (UNIR)',
      timestamp: new Date().toISOString(),
      dimensions: { width: image.width, height: image.height },
      operation: operationName,
      parameters,
      borderPolicy,
      quantizationRule: 'Q(v) = min(255, max(0, round(v)))'
    };

    const blob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `mira_registro_${operationName.toLowerCase().replace(/\s+/g, '_')}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        tabIndex={-1}
        className="bg-white rounded-md border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 focus:outline-none"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <span className="material-symbols-outlined text-teal-600">download</span>
            <span id="export-modal-title">Exportação Reproduzível (RE-10)</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar modal de exportação"
            className="text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded p-0.5"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs font-mono space-y-1">
          <div>Operação: <strong className="text-teal-700">{operationName}</strong></div>
          <div>Dimensões: <strong>{image.width} × {image.height} px</strong></div>
          <div>Política de Borda: <strong>{borderPolicy}</strong></div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleDownloadPNG}
            className="w-full py-2.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-sm">image</span>
            <span>Salvar Imagem (PNG)</span>
          </button>

          <button
            onClick={handleDownloadJSON}
            className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">description</span>
            <span>Salvar Metadados (JSON)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
