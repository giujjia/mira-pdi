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
  code: string;
}

interface NavGroup {
  title: string;
  icon: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: '1. Representação Digital',
    icon: 'grid_on',
    items: [
      { key: 'matrix', code: 'C02', label: 'Matriz & Espaço 8-bits' },
      { key: 'dissolve', code: 'C07', label: 'Dissolve & Mistura' }
    ]
  },
  {
    title: '2. Domínio Pontual',
    icon: 'tune',
    items: [
      { key: 'pointwise', code: 'C10', label: 'Negativo & Limiarização' },
      { key: 'gamma', code: 'C14', label: 'Curvas Gamma & Log' },
      { key: 'histogram', code: 'C15', label: 'Histograma & Equaliz.' }
    ]
  },
  {
    title: '3. Filtragem Espacial',
    icon: 'blur_on',
    items: [
      { key: 'smoothing', code: 'C22', label: 'Suavização (Média/Mediana)' },
      { key: 'edges', code: 'C26', label: 'Detecção de Bordas (Sobel)' },
      { key: 'sharpening', code: 'C27', label: 'Aguçamento Laplaciano' },
      { key: 'convolution', code: 'C20', label: 'Convolução 2D Genérica' },
      { key: 'mandatory', code: 'C31', label: 'Máscaras Especiais' }
    ]
  }
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap(group => group.items);

export const Sidebar: React.FC<SidebarProps> = ({ activeModule, onSelectModule }) => {
  return (
    <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200/80 flex flex-col shrink-0 select-none">
      {/* Topo da Sidebar */}
      <div className="h-14 px-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="./mira-cube.svg" alt="" className="w-8 h-8 shrink-0" />
          <div>
            <div className="font-extrabold text-sm tracking-tight text-slate-900 leading-tight">MIRA</div>
            <div className="text-[10px] font-mono text-slate-400">PDI · Lab UNIR</div>
          </div>
        </div>
      </div>

      {/* Navegação Categorizada em 3 Etapas */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
        {NAV_GROUPS.map((group, groupIdx) => (
          <div key={groupIdx}>
            <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-xs">{group.icon}</span>
              <span>{group.title}</span>
            </div>
            <div className="space-y-0.5 mt-1">
              {group.items.map(item => {
                const isActive = activeModule === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => onSelectModule(item.key)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-all ${
                      isActive
                        ? 'font-bold text-[#00875a] bg-[#e6f4ea] border border-emerald-200/80 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <span className="truncate">
                      <span className="font-mono text-[10px] opacity-75 mr-1">{item.code} ·</span>
                      {item.label}
                    </span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ml-1.5 transition-all ${
                        isActive ? 'bg-[#00875a] ring-2 ring-[#00875a]/30' : 'bg-slate-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Rodapé da Barra de Navegação */}
      <div className="p-3 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 font-mono flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
          Ambiente Conectado
        </span>
        <span className="font-bold text-slate-600">UNIR · 2026</span>
      </div>
      <a
        href="https://thenounproject.com/"
        target="_blank"
        rel="noreferrer"
        className="px-4 pb-2 pt-1 text-[10px] text-slate-400 hover:underline bg-slate-50"
      >
        Ícone: Arthur Shlain · Noun Project
      </a>
    </aside>
  );
};
