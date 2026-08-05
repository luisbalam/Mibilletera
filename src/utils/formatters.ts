import { Category, ExpenseCategory, IncomeCategory, PaymentMethod, TransactionType } from '../types';

/**
 * Formats a number into Mexican Pesos (MXN)
 * Example: 1250.5 -> "$1,250.50"
 */
export function formatMXN(amount: number): string {
  const formatted = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  // Handle minus sign formatting cleanly
  if (amount < 0) {
    return `-${formatted}`;
  }
  return formatted;
}

/**
 * Formats YYYY-MM-DD to readable Spanish date
 */
export function formatDateLabel(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  const today = new Date();
  const isToday = 
    today.getFullYear() === date.getFullYear() &&
    today.getMonth() === date.getMonth() &&
    today.getDate() === date.getDate();

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = 
    yesterday.getFullYear() === date.getFullYear() &&
    yesterday.getMonth() === date.getMonth() &&
    yesterday.getDate() === date.getDate();

  if (isToday) return 'Hoy';
  if (isYesterday) return 'Ayer';

  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Returns current date in YYYY-MM-DD
 */
export function getCurrentDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns current time in HH:mm
 */
export function getCurrentTimeStr(): string {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * List of all expense categories
 */
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Alimentos',
  'Restaurantes',
  'Transporte',
  'Gasolina',
  'Servicios',
  'Luz',
  'Agua',
  'Internet',
  'Teléfono',
  'Renta',
  'Hipoteca',
  'Salud',
  'Medicinas',
  'Consultas',
  'Educación',
  'Ropa',
  'Entretenimiento',
  'Viajes',
  'Mascotas',
  'Regalos',
  'Impuestos',
  'Suscripciones',
  'Tecnología',
  'Compras',
  'Hogar',
  'Otros',
];

/**
 * List of all income categories
 */
export const INCOME_CATEGORIES: IncomeCategory[] = [
  'Nómina',
  'Honorarios',
  'Ventas',
  'Comisiones',
  'Intereses',
  'Rendimientos',
  'Regalo',
  'Reembolso',
  'Freelance',
  'Bono',
  'Otros',
];

/**
 * Payment Methods list
 */
export const PAYMENT_METHODS: PaymentMethod[] = [
  'Efectivo',
  'Tarjeta Débito',
  'Tarjeta Crédito',
  'Transferencia',
  'Otro',
];

/**
 * Category color mappings for badges & icons
 */
export function getCategoryBgColor(category: Category, type: TransactionType): string {
  if (type === 'ingreso') {
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  }
  
  const colors: Record<string, string> = {
    Alimentos: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    Restaurantes: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    Transporte: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    Gasolina: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    Servicios: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    Luz: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
    Agua: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    Internet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
    Teléfono: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    Renta: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    Hipoteca: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
    Salud: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    Medicinas: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    Entretenimiento: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20',
    Suscripciones: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
    Tecnología: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
  };

  return colors[category] || 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
}
