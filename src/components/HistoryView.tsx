import React, { useState, useMemo } from 'react';
import { Search, Filter, Edit3, Trash2, Copy, Calendar, CreditCard, ArrowDownRight, ArrowUpRight, X, Layers, Plus } from 'lucide-react';
import { Transaction, FilterOptions, Category, PaymentMethod } from '../types';
import { formatMXN, formatDateLabel, EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, getCategoryBgColor } from '../utils/formatters';

interface HistoryViewProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDeleteRequest: (tx: Transaction) => void;
  onDuplicate: (tx: Transaction) => void;
  onOpenNewTransaction: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  transactions,
  onEdit,
  onDeleteRequest,
  onDuplicate,
  onOpenNewTransaction,
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    month: 'all',
    category: 'all',
    type: 'all',
    paymentMethod: 'all',
  });

  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Extract unique available YYYY-MM months from transactions
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => {
      if (t.date && t.date.length >= 7) {
        set.add(t.date.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [transactions]);

  // Combine all categories for filter options
  const allCategories = useMemo(() => {
    return Array.from(new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]));
  }, []);

  // Filtered transactions logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Search match
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchConcept = t.concept.toLowerCase().includes(query);
        const matchNotes = (t.notes || '').toLowerCase().includes(query);
        const matchCategory = t.category.toLowerCase().includes(query);
        if (!matchConcept && !matchNotes && !matchCategory) return false;
      }

      // Type match
      if (filters.type !== 'all' && t.type !== filters.type) {
        return false;
      }

      // Month match
      if (filters.month !== 'all' && (!t.date || !t.date.startsWith(filters.month))) {
        return false;
      }

      // Category match
      if (filters.category !== 'all' && t.category !== filters.category) {
        return false;
      }

      // Payment method match
      if (filters.paymentMethod !== 'all' && t.paymentMethod !== filters.paymentMethod) {
        return false;
      }

      return true;
    });
  }, [transactions, filters]);

  const activeFilterCount =
    (filters.month !== 'all' ? 1 : 0) +
    (filters.category !== 'all' ? 1 : 0) +
    (filters.type !== 'all' ? 1 : 0) +
    (filters.paymentMethod !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setFilters({
      search: '',
      month: 'all',
      category: 'all',
      type: 'all',
      paymentMethod: 'all',
    });
  };

  return (
    <div className="space-y-5 pb-24 max-w-4xl mx-auto animate-fade-in">
      {/* Search & Filter Header controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Historial de Movimientos
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {filteredTransactions.length} {filteredTransactions.length === 1 ? 'movimiento' : 'movimientos'} registrados
            </p>
          </div>

          <button
            onClick={onOpenNewTransaction}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Movimiento</span>
          </button>
        </div>

        {/* Search bar & filter toggle button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por concepto, notas o categoría..."
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
              id="history-search-input"
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm transition-all"
            />
            {filters.search && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            id="toggle-filters-btn"
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
              activeFilterCount > 0
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Expandable Filter Panel */}
        {showFilters && (
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-3 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Filtros de búsqueda
              </span>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-rose-500 font-semibold hover:underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Filter by Type */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Tipo
                </label>
                <select
                  value={filters.type}
                  onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                >
                  <option value="all">Todos los tipos</option>
                  <option value="ingreso">Solo Ingresos</option>
                  <option value="gasto">Solo Gastos</option>
                </select>
              </div>

              {/* Filter by Month */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Mes
                </label>
                <select
                  value={filters.month}
                  onChange={e => setFilters(prev => ({ ...prev, month: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                >
                  <option value="all">Todos los meses</option>
                  {availableMonths.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Category */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Categoría
                </label>
                <select
                  value={filters.category}
                  onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                >
                  <option value="all">Todas las categorías</option>
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Payment Method */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Forma de Pago
                </label>
                <select
                  value={filters.paymentMethod}
                  onChange={e => setFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                >
                  <option value="all">Todas las formas</option>
                  {PAYMENT_METHODS.map(pm => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transaction List */}
      {filteredTransactions.length === 0 ? (
        <div className="py-16 px-4 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            No se encontraron movimientos
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Intenta cambiar los filtros de búsqueda o registra un nuevo movimiento en tu billetera.
          </p>
          {(activeFilterCount > 0 || filters.search) && (
            <button
              onClick={resetFilters}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Restablecer búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map(tx => {
            const categoryBg = getCategoryBgColor(tx.category, tx.type);
            return (
              <div
                key={tx.id}
                className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                {/* Left info */}
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 border ${categoryBg}`}
                  >
                    {tx.type === 'ingreso' ? '+' : '-'}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {tx.concept}
                      </h4>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${categoryBg}`}>
                        {tx.category}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDateLabel(tx.date)} {tx.time}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <CreditCard className="w-3 h-3" />
                        {tx.paymentMethod}
                      </span>
                    </div>

                    {tx.notes && (
                      <p className="text-[11px] italic text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg inline-block border border-slate-200/50 dark:border-slate-700/50">
                        "{tx.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Right amount & action controls */}
                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                  <div className="text-left sm:text-right">
                    <p
                      className={`font-black text-base sm:text-lg ${
                        tx.type === 'ingreso'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {tx.type === 'ingreso' ? '+' : '-'}{formatMXN(tx.amount)}
                    </p>
                  </div>

                  {/* Actions: Edit, Duplicate, Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onDuplicate(tx)}
                      title="Duplicar movimiento"
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(tx)}
                      title="Editar movimiento"
                      className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteRequest(tx)}
                      title="Eliminar movimiento"
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
