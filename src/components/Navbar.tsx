import React from 'react';
import { Wallet, Sun, Moon, Sparkles, Plus, Minus, Bot } from 'lucide-react';
import { formatMXN } from '../utils/formatters';

interface NavbarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  totalBalance: number;
  onOpenNewTransaction: (type?: 'ingreso' | 'gasto') => void;
  onOpenReceiptScanner?: () => void;
  onOpenAssistant?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  theme,
  onToggleTheme,
  totalBalance,
  onOpenNewTransaction,
  onOpenReceiptScanner,
  onOpenAssistant,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full glass-nav transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand logo & title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 ring-1 ring-white/20">
            <Wallet className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-extrabold text-base sm:text-lg leading-none tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Mi Billetera
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                PRO
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 flex items-center gap-1">
              <span>Control Inteligente MXN</span>
              <span className="hidden xs:inline">•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold hidden xs:inline">Mtro. Luis A. Balam M.</span>
            </p>
          </div>
        </div>

        {/* Top Quick Actions & Balance Badge & Theme Switcher */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex flex-col items-end mr-2">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
              Disponible
            </span>
            <span
              className={`font-black text-sm tracking-tight ${
                totalBalance >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatMXN(totalBalance)}
            </span>
          </div>

          {/* ASISTENTE Button */}
          {onOpenAssistant && (
            <button
              onClick={onOpenAssistant}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
              title="Abrir Asistente Financiero"
              id="assistant-header-btn"
            >
              <Bot className="w-4 h-4" />
              <span>ASISTENTE</span>
            </button>
          )}

          {onOpenReceiptScanner && (
            <button
              onClick={onOpenReceiptScanner}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Escanear ticket de compra con IA Gemini"
              id="scan-ticket-header-btn"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span className="hidden md:inline">Escanear Ticket</span>
            </button>
          )}

          <button
            onClick={() => onOpenNewTransaction('gasto')}
            className="hidden xl:inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-all active:scale-95 cursor-pointer"
            id="quick-expense-header-btn"
          >
            <Minus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Gasto</span>
          </button>

          <button
            onClick={() => onOpenNewTransaction('ingreso')}
            className="hidden xl:inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all active:scale-95 cursor-pointer"
            id="quick-income-header-btn"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Ingreso</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            aria-label="Cambiar tema"
            id="theme-toggle-btn"
            className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-slate-200/60 dark:border-slate-700/60 shadow-xs"
            title={theme === 'dark' ? 'Cambiar a Tema Claro' : 'Cambiar a Tema Oscuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};


