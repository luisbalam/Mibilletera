import React from 'react';
import { Plus, Minus, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Activity, Sparkles, ChevronRight, Wallet, DollarSign, CreditCard, ShieldCheck } from 'lucide-react';
import { Transaction, SummaryStats } from '../types';
import { formatMXN, formatDateLabel, getCategoryBgColor } from '../utils/formatters';

interface DashboardViewProps {
  stats: SummaryStats;
  recentTransactions: Transaction[];
  onOpenNewTransaction: (type?: 'ingreso' | 'gasto') => void;
  onSelectTab: (tab: any) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  recentTransactions,
  onOpenNewTransaction,
  onSelectTab,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const isPositiveBalance = stats.totalBalance >= 0;
  const isPositiveMonthBalance = stats.monthlyBalance >= 0;

  // Calculate percentage of income spent this month
  const spentRatio = stats.monthlyIncome > 0
    ? Math.min(100, Math.round((stats.monthlyExpense / stats.monthlyIncome) * 100))
    : stats.monthlyExpense > 0 ? 100 : 0;

  return (
    <div className="space-y-6 pb-28 max-w-4xl mx-auto animate-fade-in">
      {/* 1. Apple Wallet / MD3 Expressive Balance Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white p-7 sm:p-9 shadow-2xl shadow-slate-950/40 border border-slate-800/80 group">
        {/* Holographic background sheen / light reflections */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-tr from-emerald-500/20 via-teal-400/20 to-transparent blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-transparent blur-3xl pointer-events-none" />

        {/* Card Header & Chip icon */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-300 p-0.5 shadow-md shadow-emerald-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <span className="text-xs font-bold tracking-widest uppercase text-slate-300">
                Mi Billetera
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Nube / Local</span>
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-slate-200 backdrop-blur-md font-bold tracking-wide border border-white/10">
                MXN
              </span>
            </div>
          </div>

          {/* Main Balance */}
          <div className="pt-2 space-y-1">
            <p className="text-xs text-slate-400 font-medium tracking-wide">Saldo Total Disponible</p>
            <p
              className={`text-4xl sm:text-6xl font-black tracking-tight ${
                isPositiveBalance
                  ? 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-300 to-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {formatMXN(stats.totalBalance)}
            </p>
          </div>

          {/* Card Footer Info */}
          <div className="pt-4 flex flex-wrap items-center justify-between gap-4 text-xs border-t border-slate-800/80 mt-6">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Balance del Mes:</span>
              <span className={`font-extrabold px-2 py-0.5 rounded-lg text-xs ${isPositiveMonthBalance ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                {isPositiveMonthBalance ? '+' : ''}{formatMXN(stats.monthlyBalance)}
              </span>
            </div>

            {stats.monthlyIncome > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Uso del ingreso:</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 rounded-full bg-slate-800 overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full ${spentRatio > 80 ? 'bg-rose-500' : 'bg-emerald-400'}`}
                      style={{ width: `${spentRatio}%` }}
                    />
                  </div>
                  <span className="font-bold text-slate-200">{spentRatio}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Fast MD3 Tonal Action Buttons */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          onClick={() => onOpenNewTransaction('ingreso')}
          id="btn-quick-income"
          className="group relative overflow-hidden p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 text-white font-bold text-sm sm:text-base shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/35 transition-all duration-300 active:scale-[0.98] cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5 z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6 stroke-[3]" />
            </div>
            <div className="text-left">
              <span className="block leading-none text-xs text-emerald-100 font-medium">Registrar</span>
              <span className="block font-black text-base sm:text-lg tracking-tight mt-0.5">Ingreso</span>
            </div>
          </div>
          <ArrowUpRight className="w-6 h-6 opacity-80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform z-10" />
        </button>

        <button
          onClick={() => onOpenNewTransaction('gasto')}
          id="btn-quick-expense"
          className="group relative overflow-hidden p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-rose-600 via-rose-500 to-red-600 text-white font-bold text-sm sm:text-base shadow-xl shadow-rose-600/20 hover:shadow-rose-600/35 transition-all duration-300 active:scale-[0.98] cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5 z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
              <Minus className="w-6 h-6 stroke-[3]" />
            </div>
            <div className="text-left">
              <span className="block leading-none text-xs text-rose-100 font-medium">Registrar</span>
              <span className="block font-black text-base sm:text-lg tracking-tight mt-0.5">Gasto</span>
            </div>
          </div>
          <ArrowDownRight className="w-6 h-6 opacity-80 group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform z-10" />
        </button>
      </div>

      {/* 3. Monthly Summary Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Ingresos del mes */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Ingresos del mes
            </span>
            <div className="w-8 h-8 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
            {formatMXN(stats.monthlyIncome)}
          </p>
        </div>

        {/* Gastos del mes */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Gastos del mes
            </span>
            <div className="w-8 h-8 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
            {formatMXN(stats.monthlyExpense)}
          </p>
        </div>

        {/* Balance del mes */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Balance mensual
            </span>
            <div className="w-8 h-8 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <p className={`text-xl sm:text-2xl font-black truncate ${isPositiveMonthBalance ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {isPositiveMonthBalance ? '+' : ''}{formatMXN(stats.monthlyBalance)}
          </p>
        </div>

        {/* Número de movimientos */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Movimientos
            </span>
            <div className="w-8 h-8 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Activity className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {stats.transactionCount} <span className="text-xs font-semibold text-slate-400">totales</span>
          </p>
        </div>
      </div>

      {/* 4. Recent Transactions Section */}
      <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Últimos Movimientos
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Actividad reciente registrada
            </p>
          </div>
          <button
            onClick={() => onSelectTab('historial')}
            id="btn-view-all-history"
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 flex items-center gap-0.5 cursor-pointer px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 transition-all"
          >
            <span>Ver historial completo</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Wallet className="w-7 h-7" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              Aún no tienes movimientos registrados en tu billetera.
            </p>
            <button
              onClick={() => onOpenNewTransaction('gasto')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              Registrar primer movimiento
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {recentTransactions.slice(0, 5).map(tx => {
              const categoryBg = getCategoryBgColor(tx.category, tx.type);
              return (
                <div
                  key={tx.id}
                  onClick={() => onEditTransaction(tx)}
                  className="py-3.5 flex items-center justify-between gap-3 group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 px-3 rounded-2xl transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border shadow-xs ${categoryBg}`}>
                      {tx.type === 'ingreso' ? '+' : '-'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {tx.concept}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {tx.category}
                        </span>
                        <span>•</span>
                        <span>{formatDateLabel(tx.date)} {tx.time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className={`font-black text-sm sm:text-base ${
                        tx.type === 'ingreso'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {tx.type === 'ingreso' ? '+' : '-'}{formatMXN(tx.amount)}
                    </p>
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 block">
                      {tx.paymentMethod}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

