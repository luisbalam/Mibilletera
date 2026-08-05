import React, { useMemo } from 'react';
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
  CartesianGrid,
  Legend,
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Calendar, Award, Flame, Activity } from 'lucide-react';
import { Transaction, SummaryStats } from '../types';
import { formatMXN } from '../utils/formatters';

interface SummaryViewProps {
  stats: SummaryStats;
  transactions: Transaction[];
  theme: 'light' | 'dark';
}

const COLORS = [
  '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6',
  '#ef4444', '#06b6d4', '#64748b', '#84cc16', '#f97316'
];

export const SummaryView: React.FC<SummaryViewProps> = ({
  stats,
  transactions,
  theme,
}) => {
  const isDark = theme === 'dark';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  // 1. Data for Pie Chart: Gastos por Categoría
  const categoryChartData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'gasto')
      .forEach(t => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  // 2. Data for Balance Line Chart (Balance evolution over time)
  const balanceTimelineData = useMemo(() => {
    if (transactions.length === 0) return [];
    
    // Sort transactions chronologically ascending
    const sorted = [...transactions].sort((a, b) => {
      const dateA = `${a.date}T${a.time || '00:00'}`;
      const dateB = `${b.date}T${b.time || '00:00'}`;
      return dateA.localeCompare(dateB);
    });

    let runningBalance = 0;
    const timeline: { date: string; saldo: number; ingreso: number; gasto: number }[] = [];

    sorted.forEach(t => {
      if (t.type === 'ingreso') {
        runningBalance += t.amount;
      } else {
        runningBalance -= t.amount;
      }
      
      // Group by date for cleaner timeline
      const existing = timeline.find(item => item.date === t.date);
      if (existing) {
        existing.saldo = runningBalance;
        if (t.type === 'ingreso') existing.ingreso += t.amount;
        else existing.gasto += t.amount;
      } else {
        timeline.push({
          date: t.date.slice(5), // MM-DD format
          saldo: runningBalance,
          ingreso: t.type === 'ingreso' ? t.amount : 0,
          gasto: t.type === 'gasto' ? t.amount : 0,
        });
      }
    });

    return timeline;
  }, [transactions]);

  // 3. Income vs Expenses Comparison Bar Chart
  const incomeVsExpenseData = useMemo(() => {
    return [
      { name: 'Ingresos', Monto: stats.monthlyIncome, fill: '#10b981' },
      { name: 'Gastos', Monto: stats.monthlyExpense, fill: '#f43f5e' },
    ];
  }, [stats]);

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Resumen Financiero & Estadísticas
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Análisis completo de tus hábitos de gasto e ingresos
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Saldo Actual */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Saldo Actual
          </span>
          <p className={`text-lg font-bold ${stats.totalBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatMXN(stats.totalBalance)}
          </p>
        </div>

        {/* Promedio Diario de Gasto */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Promedio Diario Gasto
          </span>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {formatMXN(stats.dailyAverageExpense)}
          </p>
        </div>

        {/* Mayor Gasto */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Mayor Gasto
          </span>
          <p className="text-lg font-bold text-rose-600 dark:text-rose-400 truncate">
            {stats.largestExpense ? formatMXN(stats.largestExpense.amount) : '$0.00'}
          </p>
          {stats.largestExpense && (
            <span className="text-[10px] text-slate-400 truncate block">
              {stats.largestExpense.concept}
            </span>
          )}
        </div>

        {/* Mayor Ingreso */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Mayor Ingreso
          </span>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 truncate">
            {stats.largestIncome ? formatMXN(stats.largestIncome.amount) : '$0.00'}
          </p>
          {stats.largestIncome && (
            <span className="text-[10px] text-slate-400 truncate block">
              {stats.largestIncome.concept}
            </span>
          )}
        </div>
      </div>

      {/* Chart 1: Gastos por Categoría (Pie Chart) */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
          Distribución de Gastos por Categoría
        </h3>

        {categoryChartData.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">
            Aún no hay gastos registrados para generar gráfica por categorías.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [formatMXN(val), 'Gasto']}
                    contentStyle={{
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#cbd5e1',
                      borderRadius: '12px',
                      color: textColor,
                    }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>

            {/* Category Legend list */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
              {categoryChartData.map((item, index) => {
                const totalExpense = stats.monthlyExpense || 1;
                const pct = Math.round((item.value / totalExpense) * 100);
                return (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 font-medium">{pct}%</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatMXN(item.value)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Chart 2: Evolución del Saldo en el Tiempo (Line Chart) */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
          Evolución del Saldo en el Tiempo
        </h3>

        {balanceTimelineData.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">
            Registra más movimientos para ver la curva del saldo.
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={balanceTimelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" stroke={textColor} fontSize={11} />
                <YAxis stroke={textColor} fontSize={11} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(value: number) => [formatMXN(value), 'Saldo']}
                  contentStyle={{
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#cbd5e1',
                    borderRadius: '12px',
                    color: textColor,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="saldo"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Chart 3: Comparativa Ingresos vs Gastos */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
          Comparativa Ingresos vs Gastos del Mes
        </h3>

        <div className="h-56 w-full max-w-lg mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incomeVsExpenseData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" stroke={textColor} fontSize={12} />
              <YAxis stroke={textColor} fontSize={11} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                formatter={(value: number) => [formatMXN(value), 'Monto']}
                contentStyle={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: isDark ? '#334155' : '#cbd5e1',
                  borderRadius: '12px',
                  color: textColor,
                }}
              />
              <Bar dataKey="Monto" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
