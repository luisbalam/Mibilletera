import React, { useState, useEffect } from 'react';
import { X, ArrowDownRight, ArrowUpRight, DollarSign, Calendar, Clock, CreditCard, Tag, FileText, Check } from 'lucide-react';
import { Transaction, TransactionType, Category, PaymentMethod } from '../types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, getCurrentDateStr, getCurrentTimeStr } from '../utils/formatters';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, 'id' | 'createdAt'>, editingId?: string) => void;
  initialData?: Transaction | null;
  defaultType?: TransactionType;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultType = 'gasto',
}) => {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState<string>('');
  const [concept, setConcept] = useState<string>('');
  const [category, setCategory] = useState<Category>('Alimentos');
  const [date, setDate] = useState<string>(getCurrentDateStr());
  const [time, setTime] = useState<string>(getCurrentTimeStr());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tarjeta Débito');
  const [notes, setNotes] = useState<string>('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setAmount(initialData.amount.toString());
      setConcept(initialData.concept);
      setCategory(initialData.category);
      setDate(initialData.date);
      setTime(initialData.time || getCurrentTimeStr());
      setPaymentMethod(initialData.paymentMethod || 'Tarjeta Débito');
      setNotes(initialData.notes || '');
      setErrors({});
    } else {
      setType(defaultType);
      setAmount('');
      setConcept('');
      setCategory(defaultType === 'gasto' ? 'Alimentos' : 'Nómina');
      setDate(getCurrentDateStr());
      setTime(getCurrentTimeStr());
      setPaymentMethod('Tarjeta Débito');
      setNotes('');
      setErrors({});
    }
  }, [initialData, defaultType, isOpen]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'gasto') {
      setCategory('Alimentos');
    } else {
      setCategory('Nómina');
    }
    setErrors(prev => ({ ...prev, amount: '', concept: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate amount
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount)) {
      newErrors.amount = 'Por favor ingresa un monto válido.';
    } else if (numAmount <= 0) {
      newErrors.amount = 'El monto debe ser un número positivo mayor a $0.';
    }

    // Validate concept
    if (!concept.trim()) {
      newErrors.concept = 'Por favor escribe un concepto o descripción.';
    }

    // Validate date
    if (!date) {
      newErrors.date = 'Selecciona una fecha válida.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSave(
      {
        type,
        amount: Math.abs(parseFloat(amount)),
        concept: concept.trim(),
        category,
        date,
        time,
        paymentMethod,
        notes: notes.trim(),
      },
      initialData?.id
    );

    onClose();
  };

  if (!isOpen) return null;

  const currentCategoryList = type === 'gasto' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {initialData ? 'Editar Movimiento' : 'Registrar Movimiento'}
          </h2>
          <button
            onClick={onClose}
            id="modal-close-btn"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Scrollable Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Type Selector (Gasto / Ingreso) */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-2xl">
            <button
              type="button"
              onClick={() => handleTypeChange('gasto')}
              id="type-gasto-btn"
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                type === 'gasto'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>➖ Gasto</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('ingreso')}
              id="type-ingreso-btn"
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                type === 'ingreso'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>➕ Ingreso</span>
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Monto (MXN) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-bold text-xl">
                $
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                id="input-monto"
                className={`w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border rounded-2xl text-2xl font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all ${
                  errors.amount ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-slate-700'
                }`}
                autoFocus
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-rose-500 font-medium mt-1">{errors.amount}</p>
            )}
          </div>

          {/* Concept Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Concepto *
            </label>
            <input
              type="text"
              placeholder={type === 'gasto' ? 'Ej. Supermercado, Cine, Gasolina' : 'Ej. Nómina quincenal, Venta freelance'}
              value={concept}
              onChange={e => setConcept(e.target.value)}
              id="input-concepto"
              className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all ${
                errors.concept ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-slate-700'
              }`}
            />
            {errors.concept && (
              <p className="text-xs text-rose-500 font-medium mt-1">{errors.concept}</p>
            )}
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider flex items-center justify-between">
              <span>Categoría *</span>
              <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400">{category}</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
              {currentCategoryList.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat as Category)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold text-left truncate transition-all flex items-center justify-between cursor-pointer ${
                    category === cat
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <span className="truncate">{cat}</span>
                  {category === cat && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Fecha
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                id="input-fecha"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Hora
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                id="input-hora"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Forma de Pago
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_METHODS.map(pm => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setPaymentMethod(pm)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    paymentMethod === pm
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {pm}
                </button>
              ))}
            </div>
          </div>

          {/* Notes (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Notas (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Detalles adicionales, ticket o notas..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              id="input-notas"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              id="save-transaction-btn"
              className={`w-full py-3.5 rounded-2xl text-white font-bold text-sm shadow-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 ${
                type === 'gasto'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25'
              }`}
            >
              <span>{initialData ? 'Guardar Cambios' : 'Guardar Movimiento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
