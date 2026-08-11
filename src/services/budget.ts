import { CategoryBudget, ExpenseCategory, Transaction } from '../types';

const BUDGET_STORAGE_KEY = 'mi_billetera_budgets_v1';

export const DEFAULT_BUDGETS: CategoryBudget[] = [
  { category: 'Alimentos', monthlyLimit: 5000 },
  { category: 'Restaurantes', monthlyLimit: 2000 },
  { category: 'Gasolina', monthlyLimit: 3000 },
  { category: 'Servicios', monthlyLimit: 2500 },
  { category: 'Suscripciones', monthlyLimit: 1000 },
  { category: 'Entretenimiento', monthlyLimit: 1500 },
  { category: 'Ropa', monthlyLimit: 2000 },
  { category: 'Salud', monthlyLimit: 3000 },
  { category: 'Hogar', monthlyLimit: 2500 },
  { category: 'Compras', monthlyLimit: 3000 },
];

export function getCategoryBudgets(): CategoryBudget[] {
  try {
    const stored = localStorage.getItem(BUDGET_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.warn('Error reading budgets:', err);
  }
  return DEFAULT_BUDGETS;
}

export function saveCategoryBudgets(budgets: CategoryBudget[]) {
  try {
    localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budgets));
  } catch (err) {
    console.warn('Error saving budgets:', err);
  }
}

export interface BudgetStatus {
  category: ExpenseCategory;
  monthlyLimit: number;
  spentThisMonth: number;
  available: number;
  percentageUsed: number;
}

export function getBudgetStatus(category: ExpenseCategory, transactions: Transaction[]): BudgetStatus {
  const budgets = getCategoryBudgets();
  const found = budgets.find(b => b.category === category);
  const monthlyLimit = found ? found.monthlyLimit : 3000; // Default fallback if unconfigured

  const currentYearMonth = new Date().toISOString().substring(0, 7);

  const spentThisMonth = transactions
    .filter(t => t.type === 'gasto' && t.category === category && t.date && t.date.startsWith(currentYearMonth))
    .reduce((sum, t) => sum + t.amount, 0);

  const available = monthlyLimit - spentThisMonth;
  const percentageUsed = monthlyLimit > 0 ? Math.round((spentThisMonth / monthlyLimit) * 100) : 0;

  return {
    category,
    monthlyLimit,
    spentThisMonth,
    available,
    percentageUsed,
  };
}

export function getAllBudgetStatuses(transactions: Transaction[]): BudgetStatus[] {
  const budgets = getCategoryBudgets();
  return budgets.map(b => getBudgetStatus(b.category, transactions));
}
