import React from 'react';
import { LayoutDashboard, History, Plus, PieChart, Settings, Bot } from 'lucide-react';
import { ViewTab } from '../types';

interface BottomNavProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onOpenNewTransactionModal: () => void;
  onOpenAssistant?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenNewTransactionModal,
  onOpenAssistant,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/85 dark:bg-[#0b0f19]/85 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 pb-safe shadow-2xl">
      <div className="max-w-md mx-auto px-2 py-2 flex items-center justify-between">
        {/* Dashboard */}
        <button
          onClick={() => onSelectTab('dashboard')}
          id="nav-tab-dashboard"
          className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-2xl transition-all cursor-pointer ${
            currentTab === 'dashboard'
              ? 'text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] tracking-tight">Inicio</span>
        </button>

        {/* Historial */}
        <button
          onClick={() => onSelectTab('historial')}
          id="nav-tab-historial"
          className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-2xl transition-all cursor-pointer ${
            currentTab === 'historial'
              ? 'text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <History className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] tracking-tight">Historial</span>
        </button>

        {/* Central Action Button: Nuevo Movimiento */}
        <button
          onClick={onOpenNewTransactionModal}
          id="nav-tab-nuevo-movimiento"
          aria-label="Registrar nuevo movimiento"
          className="flex flex-col items-center justify-center -mt-6 cursor-pointer group"
        >
          <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/35 group-hover:scale-105 active:scale-95 transition-all ring-4 ring-slate-50 dark:ring-[#0b0f19]">
            <Plus className="w-6 h-6 stroke-[3]" />
          </div>
          <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
            Nuevo
          </span>
        </button>

        {/* Assistant */}
        {onOpenAssistant && (
          <button
            onClick={onOpenAssistant}
            id="nav-tab-asistente"
            className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-2xl transition-all cursor-pointer text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold"
            title="Abrir Asistente Financiero"
          >
            <Bot className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[10px] tracking-tight font-extrabold">Asistente</span>
          </button>
        )}

        {/* Resumen */}
        <button
          onClick={() => onSelectTab('resumen')}
          id="nav-tab-resumen"
          className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-2xl transition-all cursor-pointer ${
            currentTab === 'resumen'
              ? 'text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <PieChart className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] tracking-tight">Análisis</span>
        </button>
      </div>
    </div>
  );
};


