import React from 'react';
import { Plus, Minus, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Activity, Sparkles, ChevronRight, Wallet, DollarSign } from 'lucide-react';
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
    <div className="space-y-6 pb-24 max-w-4xl mx-auto animate-fade-in">
      {/* 1. Large Top Balance Card */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-xl shadow-slate-900/10 border border-slate-800">
        {/* Glow ambient background decoration */}
        <div
          className={`absolute -right-10 -bottom-10 w-48 h-48 rounded-full blur-3xl opacity-25 pointer-events-none ${
            isPositiveBalance ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
        />
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <Wallet className="w-32 h-32" />
        </div>

        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Saldo Disponible
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-slate-300 backdrop-blur-md font-medium border border-white/10">
              MXN ($)
            </span>
          </div>

          <div className="pt-1">
            <p
              className={`text-3xl sm:text-5xl font-black tracking-tight ${
                isPositiveBalance ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatMXN(stats.totalBalance)}
            </p>
          </div>

          <div className="pt-3 flex flex-wrap items-center gap-4 text-xs text-slate-300 border-t border-white/10 mt-4">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Balance del mes:</span>
              <span className={`font-bold ${isPositiveMonthBalance ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPositiveMonthBalance ? '+' : ''}{formatMXN(stats.monthlyBalance)}
              </span>
            </div>
            {stats.monthlyIncome > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Gasto del mes:</span>
                <span className="font-semibold text-slate-200">{spentRatio}% del ingreso</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Fast Action Buttons */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          onClick={() => onOpenNewTransaction('ingreso')}
          id="btn-quick-income"
          className="group p-4 sm:p-5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all active:scale-98 cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6 stroke-[3]" />
            </div>
            <div className="text-left">
              <span className="block leading-none text-xs text-emerald-100 font-normal">Registrar</span>
              <span className="block font-extrabold">Ingreso</span>
            </div>
          </div>
          <ArrowUpRight className="w-5 h-5 opacity-80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>

        <button
          onClick={() => onOpenNewTransaction('gasto')}
          id="btn-quick-expense"
          className="group p-4 sm:p-5 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 transition-all active:scale-98 cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
              <Minus className="w-6 h-6 stroke-[3]" />
            </div>
            <div className="text-left">
              <span className="block leading-none text-xs text-rose-100 font-normal">Registrar</span>
              <span className="block font-extrabold">Gasto</span>
            </div>
          </div>
          <ArrowDownRight className="w-5 h-5 opacity-80 group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform" />
        </button>
      </div>

      {/* 3. Monthly Summary Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Ingresos del mes */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Ingresos del mes
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
            {formatMXN(stats.monthlyIncome)}
          </p>
        </div>

        {/* Gastos del mes */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Gastos del mes
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
            {formatMXN(stats.monthlyExpense)}
          </p>
        </div>

        {/* Balance del mes */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Balance del mes
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-lg sm:text-xl font-bold truncate ${isPositiveMonthBalance ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {isPositiveMonthBalance ? '+' : ''}{formatMXN(stats.monthlyBalance)}
          </p>
        </div>

        {/* Número de movimientos */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Movimientos
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            {stats.transactionCount} <span className="text-xs font-normal text-slate-400">registros</span>
          </p>
        </div>
      </div>

      {/* 4. Recent Transactions Preview Section */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Últimos Movimientos
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Actividad reciente de tu billetera
            </p>
          </div>
          <button
            onClick={() => onSelectTab('historial')}
            id="btn-view-all-history"
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>Ver todos</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Aún no tienes movimientos registrados.
            </p>
            <button
              onClick={() => onOpenNewTransaction('gasto')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 underline cursor-pointer"
            >
              Empieza registrando un gasto o ingreso
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentTransactions.slice(0, 5).map(tx => {
              const categoryBg = getCategoryBgColor(tx.category, tx.type);
              return (
                <div
                  key={tx.id}
                  className="py-3.5 flex items-center justify-between gap-3 group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 px-2 rounded-2xl transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border ${categoryBg}`}>
                      {tx.type === 'ingreso' ? '+' : '-'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {tx.concept}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{tx.category}</span>
                        <span>•</span>
                        <span>{formatDateLabel(tx.date)} {tx.time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className={`font-bold text-sm sm:text-base ${
                        tx.type === 'ingreso'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {tx.type === 'ingreso' ? '+' : '-'}{formatMXN(tx.amount)}
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
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
