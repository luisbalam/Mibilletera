import React from 'react';
import { LayoutDashboard, History, Plus, PieChart, Settings } from 'lucide-react';
import { ViewTab } from '../types';

interface BottomNavProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onOpenNewTransactionModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenNewTransactionModal,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe shadow-lg">
      <div className="max-w-xl mx-auto px-2 py-2 flex items-center justify-around">
        {/* Dashboard */}
        <button
          onClick={() => onSelectTab('dashboard')}
          id="nav-tab-dashboard"
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
            currentTab === 'dashboard'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Dashboard</span>
        </button>

        {/* Historial */}
        <button
          onClick={() => onSelectTab('historial')}
          id="nav-tab-historial"
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
            currentTab === 'historial'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px]">Historial</span>
        </button>

        {/* Central Action Button: Nuevo Movimiento */}
        <button
          onClick={onOpenNewTransactionModal}
          id="nav-tab-nuevo-movimiento"
          aria-label="Registrar nuevo movimiento"
          className="flex flex-col items-center justify-center -mt-5 cursor-pointer group"
        >
          <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-105 active:scale-95 transition-all ring-4 ring-white dark:ring-slate-900">
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
            Nuevo
          </span>
        </button>

        {/* Resumen */}
        <button
          onClick={() => onSelectTab('resumen')}
          id="nav-tab-resumen"
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
            currentTab === 'resumen'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <PieChart className="w-5 h-5" />
          <span className="text-[10px]">Resumen</span>
        </button>

        {/* Configuración */}
        <button
          onClick={() => onSelectTab('configuracion')}
          id="nav-tab-configuracion"
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
            currentTab === 'configuracion'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px]">Ajustes</span>
        </button>
      </div>
    </div>
  );
};
