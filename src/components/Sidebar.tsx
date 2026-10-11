import React from 'react';

export type ModuleKey =
  | 'matrix'
  | 'pointwise'
  | 'gamma'
  | 'dissolve'
  | 'histogram'
  | 'smoothing'
  | 'edges'
  | 'sharpening'
  | 'convolution'
  | 'mandatory';

interface SidebarProps {
  activeModule: ModuleKey;
  onSelectModule: (key: ModuleKey) => void;
}

interface NavItem {
  key: ModuleKey;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'matrix', label: 'Imagem como Matriz' },
  { key: 'pointwise', label: 'Negativo & Limiar' },
  { key: 'gamma', label: 'Curvas Gamma & Log' },
  { key: 'dissolve', label: 'Dissolve & Mistura' },
  { key: 'histogram', label: 'Histograma & Equaliz.' },
  { key: 'smoothing', label: 'Suavização e contraste' },
  { key: 'edges', label: 'Detectar bordas' },
  { key: 'sharpening', label: 'Aguçamento & High-Boost' },
  { key: 'convolution', label: 'Convolução 2D Genérica' },
  { key: 'mandatory', label: 'Máscaras Especiais' }
];

export const Sidebar: React.FC<SidebarProps> = ({ activeModule, onSelectModule }) => (
 <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200/80 flex flex-col shrink-0 select-none">
  <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between"><div className="flex items-center gap-3"><img src="./mira-cube.svg" alt="" className="w-9 h-9 shrink-0" /><div><div className="font-bold text-sm tracking-tight text-slate-900 leading-tight">MIRA</div><div className="text-[11px] font-mono text-slate-400">PDI · Lab UNIR</div></div></div></div>
  <nav className="flex-1 overflow-y-auto p-4 space-y-1 text-xs"><div className="px-2 pt-1 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">MÓDULOS</div>{NAV_ITEMS.map(item => {const isActive=activeModule===item.key;return <button key={item.key} onClick={()=>onSelectModule(item.key)} aria-current={isActive?'page':undefined} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-all ${isActive?'font-bold text-[#00875a] bg-[#e6f4ea]':'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}><span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive?'bg-[#00875a]':'bg-slate-300'}`}></span><span className="truncate">{item.label}</span></button>})}</nav>
  <div className="p-4 border-t border-slate-100 text-xs text-slate-400 font-mono flex items-center justify-between bg-slate-50/50"><span>PDI · UNIR</span><span className="font-bold text-slate-500">2026</span></div>
 <a href="https://thenounproject.com/" target="_blank" rel="noreferrer" className="px-4 pb-3 text-[10px] text-slate-500 hover:underline">Ícone: Arthur Shlain · Noun Project</a>
 </aside>
);
