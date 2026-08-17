import React, { useState, useMemo } from 'react';
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Wallet,
  PiggyBank,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Tag,
  Info
} from 'lucide-react';
import { Transaction, SummaryStats, PaymentMethod } from '../types';
import { formatMXN, formatMonthName, formatDateLabel, getCategoryBgColor, PAYMENT_METHODS } from '../utils/formatters';

interface SummaryViewProps {
  stats: SummaryStats;
  transactions: Transaction[];
  theme: 'light' | 'dark';
}

const CATEGORY_PALETTE = [
  '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6',
  '#06b6d4', '#ef4444', '#f97316', '#14b8a6', '#6366f1',
  '#84cc16', '#e11d48', '#0ea5e9', '#d946ef', '#a855f7',
  '#eab308', '#64748b', '#059669', '#2563eb', '#d97706'
];

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  'Efectivo': '#10b981',
  'Tarjeta Débito': '#3b82f6',
  'Tarjeta Crédito': '#8b5cf6',
  'Transferencia': '#06b6d4',
  'Otro': '#f59e0b',
};

export const SummaryView: React.FC<SummaryViewProps> = ({
  stats,
  transactions,
  theme,
}) => {
  const isDark = theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const headingColor = isDark ? '#f8fafc' : '#0f172a';
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  // 1. Available unique months (sorted descending: e.g. "2026-08", "2026-07")
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => {
      if (t.date && t.date.length >= 7) {
        set.add(t.date.substring(0, 7));
      }
    });
    // Always include current month
    const now = new Date();
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    set.add(currentYM);
    return Array.from(set).sort().reverse();
  }, [transactions]);

  // Default to current month or latest available month
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return currentYM;
  });

  // Filter transactions according to selectedMonth ('all' or 'YYYY-MM')
  const periodTransactions = useMemo(() => {
    if (selectedMonth === 'all') return transactions;
    return transactions.filter(t => t.date && t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // 2. Period KPIs Calculation
  const periodStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let largestExp: Transaction | null = null;
    let largestInc: Transaction | null = null;

    periodTransactions.forEach(t => {
      if (t.type === 'ingreso') {
        income += t.amount;
        if (!largestInc || t.amount > largestInc.amount) {
          largestInc = t;
        }
      } else if (t.type === 'gasto') {
        expense += t.amount;
        if (!largestExp || t.amount > largestExp.amount) {
          largestExp = t;
        }
      }
    });

    const balance = income - expense;
    const savingsRate = income > 0 ? Math.max(-100, Math.min(100, ((income - expense) / income) * 100)) : (expense > 0 ? -100 : 0);

    // Days in selected period
    let daysCount = 30;
    if (selectedMonth !== 'all') {
      const [y, m] = selectedMonth.split('-').map(Number);
      daysCount = new Date(y, m, 0).getDate();
    }
    const dailyAverage = expense > 0 ? expense / daysCount : 0;

    return {
      income,
      expense,
      balance,
      savingsRate,
      dailyAverage,
      count: periodTransactions.length,
      largestExpense: largestExp,
      largestIncome: largestInc,
    };
  }, [periodTransactions, selectedMonth]);

  // 3. Real Category Expense Distribution for selected period
  const categoryExpensesData = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    let totalExpenseAmount = 0;

    periodTransactions
      .filter(t => t.type === 'gasto')
      .forEach(t => {
        totalExpenseAmount += t.amount;
        if (!map[t.category]) {
          map[t.category] = { total: 0, count: 0 };
        }
        map[t.category].total += t.amount;
        map[t.category].count += 1;
      });

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        value: data.total,
        count: data.count,
        percentage: totalExpenseAmount > 0 ? (data.total / totalExpenseAmount) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [periodTransactions]);

  // 4. Expense Distribution by Payment Method for selected period
  const paymentMethodData = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    let totalExpenseAmount = 0;

    periodTransactions
      .filter(t => t.type === 'gasto')
      .forEach(t => {
        const method = t.paymentMethod || 'Otro';
        totalExpenseAmount += t.amount;
        if (!map[method]) {
          map[method] = { total: 0, count: 0 };
        }
        map[method].total += t.amount;
        map[method].count += 1;
      });

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        value: data.total,
        count: data.count,
        percentage: totalExpenseAmount > 0 ? (data.total / totalExpenseAmount) * 100 : 0,
        fill: PAYMENT_METHOD_COLORS[name] || '#64748b',
      }))
      .sort((a, b) => b.value - a.value);
  }, [periodTransactions]);

  // 5. Monthly History Overview across all available months
  const monthlyHistoryData = useMemo(() => {
    const map: Record<string, { income: number; expense: number; balance: number }> = {};

    transactions.forEach(t => {
      if (!t.date || t.date.length < 7) return;
      const ym = t.date.substring(0, 7);
      if (!map[ym]) {
        map[ym] = { income: 0, expense: 0, balance: 0 };
      }
      if (t.type === 'ingreso') {
        map[ym].income += t.amount;
      } else {
        map[ym].expense += t.amount;
      }
      map[ym].balance = map[ym].income - map[ym].expense;
    });

    // Sort chronologically ascending
    return Object.keys(map)
      .sort()
      .map(ym => ({
        monthKey: ym,
        monthLabel: formatMonthName(ym),
        Ingresos: map[ym].income,
        Gastos: map[ym].expense,
        Balance: map[ym].balance,
      }));
  }, [transactions]);

  // 6. Daily Spending Flow in selected month
  const dailySpendingData = useMemo(() => {
    if (selectedMonth === 'all') return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    const dailyMap: Record<number, number> = {};
    for (let i = 1; i <= daysInMonth; i++) {
      dailyMap[i] = 0;
    }

    periodTransactions
      .filter(t => t.type === 'gasto')
      .forEach(t => {
        const day = Number(t.date.split('-')[2]);
        if (day && dailyMap[day] !== undefined) {
          dailyMap[day] += t.amount;
        }
      });

    return Object.entries(dailyMap).map(([day, amount]) => ({
      day: `Día ${day}`,
      dayNum: Number(day),
      Gasto: amount,
    }));
  }, [periodTransactions, selectedMonth]);

  // 7. Top 5 Largest Expenses of the selected period
  const topExpenses = useMemo(() => {
    return periodTransactions
      .filter(t => t.type === 'gasto')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [periodTransactions]);

  // Month navigation step
  const handlePrevMonth = () => {
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[currentIndex + 1]);
    }
  };

  const handleNextMonth = () => {
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex > 0) {
      setSelectedMonth(availableMonths[currentIndex - 1]);
    }
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'Efectivo':
        return <Banknote className="w-4 h-4 text-emerald-500" />;
      case 'Tarjeta Débito':
        return <CreditCard className="w-4 h-4 text-blue-500" />;
      case 'Tarjeta Crédito':
        return <CreditCard className="w-4 h-4 text-purple-500" />;
      case 'Transferencia':
        return <ArrowRightLeft className="w-4 h-4 text-cyan-500" />;
      default:
        return <Wallet className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto animate-fade-in">
      {/* Top Header & Interactive Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Resumen Financiero & Análisis
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visualización detallada de categorías, métodos de pago y evolución mensual
              </p>
            </div>
          </div>
        </div>

        {/* Month Selector Controls */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700">
          <button
            onClick={handlePrevMonth}
            disabled={selectedMonth === 'all' || availableMonths.indexOf(selectedMonth) >= availableMonths.length - 1}
            className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 px-2 py-1 outline-none cursor-pointer"
          >
            <option value="all" className="dark:bg-slate-800">
              🗓️ Todo el Histórico
            </option>
            {availableMonths.map(ym => (
              <option key={ym} value={ym} className="dark:bg-slate-800">
                📅 {formatMonthName(ym)}
              </option>
            ))}
          </select>

          <button
            onClick={handleNextMonth}
            disabled={selectedMonth === 'all' || availableMonths.indexOf(selectedMonth) <= 0}
            className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Month Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Periodo:
        </span>
        <button
          onClick={() => setSelectedMonth('all')}
          className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
            selectedMonth === 'all'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
              : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400'
          }`}
        >
          Todo el Histórico
        </button>
        {availableMonths.slice(0, 6).map(ym => (
          <button
            key={ym}
            onClick={() => setSelectedMonth(ym)}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
              selectedMonth === ym
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400'
            }`}
          >
            {formatMonthName(ym)}
          </button>
        ))}
      </div>

      {/* KPI Stats Cards for the Selected Period */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Ingresos del Periodo */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Ingresos
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatMXN(periodStats.income)}
          </p>
          <span className="text-[10px] text-slate-400 block">
            {periodTransactions.filter(t => t.type === 'ingreso').length} ingresos registrados
          </span>
        </div>

        {/* Gastos del Periodo */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Gastos
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400">
            {formatMXN(periodStats.expense)}
          </p>
          <span className="text-[10px] text-slate-400 block">
            {periodTransactions.filter(t => t.type === 'gasto').length} compras/pagos
          </span>
        </div>

        {/* Balance Neto del Periodo */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Balance Neto
            </span>
            <div className={`p-1.5 rounded-lg ${periodStats.balance >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
              <PiggyBank className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className={`text-lg sm:text-xl font-bold ${periodStats.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatMXN(periodStats.balance)}
          </p>
          <span className="text-[10px] text-slate-400 block">
            {periodStats.balance >= 0 ? 'Superávit / Ahorro' : 'Déficit en el periodo'}
          </span>
        </div>

        {/* Tasa de Ahorro / Promedio */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Tasa de Ahorro
            </span>
            <div className={`p-1.5 rounded-lg ${periodStats.savingsRate >= 20 ? 'bg-emerald-500/10 text-emerald-600' : periodStats.savingsRate >= 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600'}`}>
              {periodStats.savingsRate >= 20 ? (
                <ShieldCheck className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
            </div>
          </div>
          <p className={`text-lg sm:text-xl font-bold ${periodStats.savingsRate >= 20 ? 'text-emerald-600 dark:text-emerald-400' : periodStats.savingsRate >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {periodStats.savingsRate.toFixed(1)}%
          </p>
          <span className="text-[10px] text-slate-400 block truncate">
            {periodStats.savingsRate >= 20 ? 'Saludable (≥20%)' : periodStats.savingsRate >= 0 ? 'Moderado' : 'Gastos > Ingresos'}
          </span>
        </div>
      </div>

      {/* GRID 1: Distribución por Categoría & Distribución por Método de Pago */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfica 1: Distribución Real de Gastos por Categoría */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-500" />
                Gastos por Categoría
              </h3>
              <p className="text-[11px] text-slate-400">
                {selectedMonth === 'all' ? 'Histórico completo' : formatMonthName(selectedMonth)} • Total: {formatMXN(periodStats.expense)}
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {categoryExpensesData.length} categorías
            </span>
          </div>

          {categoryExpensesData.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-xs">No hay gastos registrados en este período.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Donut Chart */}
              <div className="h-56 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={categoryExpensesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryExpensesData.map((entry, index) => (
                        <Cell
                          key={`cat-cell-${index}`}
                          fill={CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]}
                          stroke={isDark ? '#0f172a' : '#ffffff'}
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [
                        `${formatMXN(val)} (${((val / (periodStats.expense || 1)) * 100).toFixed(1)}%)`,
                        'Gasto Total'
                      ]}
                      contentStyle={{
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        borderColor: isDark ? '#334155' : '#cbd5e1',
                        borderRadius: '16px',
                        color: headingColor,
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                  </RePieChart>
                </ResponsiveContainer>
                {/* Center metric */}
                <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Gastado</span>
                  <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    {formatMXN(periodStats.expense)}
                  </span>
                </div>
              </div>

              {/* Categorías Legend list with percentages and progress bars */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {categoryExpensesData.map((item, index) => {
                  const color = CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
                  return (
                    <div key={item.name} className="p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({item.count} {item.count === 1 ? 'mov.' : 'movs.'})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatMXN(item.value)}
                          </span>
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                            {item.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      {/* Visual progress bar */}
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(2, item.percentage))}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Gráfica 2: Distribución de Gastos por Método de Pago */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-500" />
                Gastos por Método de Pago
              </h3>
              <p className="text-[11px] text-slate-400">
                Efectivo, Débito, Crédito y Transferencias del periodo
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {paymentMethodData.length} métodos
            </span>
          </div>

          {paymentMethodData.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-xs">No hay gastos para clasificar métodos de pago.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Donut Chart Métodos de Pago */}
              <div className="h-56 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {paymentMethodData.map((entry) => (
                        <Cell
                          key={`pay-cell-${entry.name}`}
                          fill={entry.fill}
                          stroke={isDark ? '#0f172a' : '#ffffff'}
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [
                        `${formatMXN(val)} (${((val / (periodStats.expense || 1)) * 100).toFixed(1)}%)`,
                        'Gasto'
                      ]}
                      contentStyle={{
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        borderColor: isDark ? '#334155' : '#cbd5e1',
                        borderRadius: '16px',
                        color: headingColor,
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                  </RePieChart>
                </ResponsiveContainer>
                {/* Center icon */}
                <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center">
                  <CreditCard className="w-5 h-5 text-slate-400 mb-0.5" />
                  <span className="text-[10px] uppercase font-bold text-slate-400">Cuentas</span>
                </div>
              </div>

              {/* Payment Methods Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {paymentMethodData.map((item) => (
                  <div
                    key={item.name}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {getPaymentIcon(item.name)}
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {item.name}
                        </span>
                      </div>
                      <span
                        className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md text-white"
                        style={{ backgroundColor: item.fill }}
                      >
                        {item.percentage.toFixed(0)}%
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-0.5">
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {formatMXN(item.value)}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {item.count} {item.count === 1 ? 'pago' : 'pagos'}
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(3, item.percentage))}%`,
                          backgroundColor: item.fill,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gráfica 3: Evolución y Comparativa Mensual Histórica (Distribución Mensual) */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              Comparativa y Evolución Mensual (Ingresos vs Gastos)
            </h3>
            <p className="text-[11px] text-slate-400">
              Comportamiento histórico mes a mes. Haz clic en un mes para seleccionarlo.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block" /> Ingresos
            </span>
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <span className="w-3 h-3 rounded-md bg-rose-500 inline-block" /> Gastos
            </span>
          </div>
        </div>

        {monthlyHistoryData.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">
            Aún no hay suficientes registros mensuales para mostrar la comparativa histórica.
          </p>
        ) : (
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyHistoryData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const payload = e.activePayload[0].payload;
                    if (payload && payload.monthKey) {
                      setSelectedMonth(payload.monthKey);
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="monthLabel"
                  stroke={textColor}
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke={textColor}
                  fontSize={10}
                  tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [formatMXN(value), name]}
                  labelFormatter={(label) => `Mes: ${label}`}
                  contentStyle={{
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#cbd5e1',
                    borderRadius: '16px',
                    color: headingColor,
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar dataKey="Ingresos" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={36} />
                <Bar dataKey="Gastos" fill="#f43f5e" radius={[8, 8, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* GRID 2: Ritmo de Gasto Diario del Mes & Top 5 Mayores Gastos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfica 4: Flujo y Ritmo de Gasto Diario */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-500" />
              Ritmo de Gasto Diario ({selectedMonth === 'all' ? 'Todos los meses' : formatMonthName(selectedMonth)})
            </h3>
            <p className="text-[11px] text-slate-400">
              Picos de gasto por día del mes • Promedio diario: {formatMXN(periodStats.dailyAverage)}
            </p>
          </div>

          {dailySpendingData.length === 0 || dailySpendingData.every(d => d.Gasto === 0) ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-xs">
                {selectedMonth === 'all'
                  ? 'Selecciona un mes específico arriba para ver el desglose día a día.'
                  : 'No hay gastos registrados en los días de este mes.'}
              </p>
            </div>
          ) : (
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dailySpendingData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="dayNum"
                    stroke={textColor}
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(d) => `${d}`}
                  />
                  <YAxis
                    stroke={textColor}
                    fontSize={10}
                    tickFormatter={(v) => `$${v}`}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val: number) => [formatMXN(val), 'Gasto del Día']}
                    labelFormatter={(label) => `Día ${label}`}
                    contentStyle={{
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#cbd5e1',
                      borderRadius: '16px',
                      color: headingColor,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Gasto"
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#expenseGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top 5 Mayores Gastos del Periodo */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                Mayores Gastos del Periodo
              </h3>
              <p className="text-[11px] text-slate-400">
                Top transacciones que demandaron mayor presupuesto
              </p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
              Top {topExpenses.length}
            </span>
          </div>

          {topExpenses.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-xs">No hay gastos para rankear en este periodo.</p>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {topExpenses.map((tx, idx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      idx === 0 ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30' :
                      idx === 1 ? 'bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-slate-200' :
                      idx === 2 ? 'bg-amber-700 text-amber-100' :
                      'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {tx.concept}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                          {tx.category}
                        </span>
                        <span>•</span>
                        <span>{formatDateLabel(tx.date)}</span>
                        <span>•</span>
                        <span>{tx.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <p className="text-xs sm:text-sm font-extrabold text-rose-600 dark:text-rose-400">
                      -{formatMXN(tx.amount)}
                    </p>
                    <span className="text-[9px] text-slate-400">
                      {((tx.amount / (periodStats.expense || 1)) * 100).toFixed(1)}% del total
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
