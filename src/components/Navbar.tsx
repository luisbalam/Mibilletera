import React from 'react';
import { Wallet, Sun, Moon, Sparkles } from 'lucide-react';
import { formatMXN } from '../utils/formatters';

interface NavbarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  totalBalance: number;
  onOpenNewTransaction: (type?: 'ingreso' | 'gasto') => void;
  onOpenReceiptScanner?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  theme,
  onToggleTheme,
  totalBalance,
  onOpenNewTransaction,
  onOpenReceiptScanner,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand logo & title */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              Mi Billetera
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                MXN
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Finanzas Personales</p>
          </div>
        </div>

        {/* Top Quick Actions & Balance Badge & Theme Switcher */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end mr-1">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">
              Disponible
            </span>
            <span
              className={`font-bold text-sm ${
                totalBalance >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatMXN(totalBalance)}
            </span>
          </div>

          {onOpenReceiptScanner && (
            <button
              onClick={onOpenReceiptScanner}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Escanear ticket de compra con IA Gemini"
              id="scan-ticket-header-btn"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Escanear Ticket</span>
            </button>
          )}

          <button
            onClick={() => onOpenNewTransaction('gasto')}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-all active:scale-95 cursor-pointer"
            id="quick-expense-header-btn"
          >
            <span>➖ Gasto</span>
          </button>

          <button
            onClick={() => onOpenNewTransaction('ingreso')}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all active:scale-95 cursor-pointer"
            id="quick-income-header-btn"
          >
            <span>➕ Ingreso</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            aria-label="Cambiar tema"
            id="theme-toggle-btn"
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-slate-200/60 dark:border-slate-700/60"
            title={theme === 'dark' ? 'Cambiar a Tema Claro' : 'Cambiar a Tema Oscuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400 animate-spin-once" />
            ) : (
              <Moon className="w-5 h-5 text-slate-700" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
