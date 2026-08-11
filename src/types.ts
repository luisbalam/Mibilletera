export type TransactionType = 'ingreso' | 'gasto';

export type PaymentMethod = 
  | 'Efectivo'
  | 'Tarjeta Débito'
  | 'Tarjeta Crédito'
  | 'Transferencia'
  | 'Otro';

export type ExpenseCategory =
  | 'Alimentos'
  | 'Restaurantes'
  | 'Transporte'
  | 'Gasolina'
  | 'Servicios'
  | 'Luz'
  | 'Agua'
  | 'Internet'
  | 'Teléfono'
  | 'Renta'
  | 'Hipoteca'
  | 'Salud'
  | 'Medicinas'
  | 'Consultas'
  | 'Educación'
  | 'Ropa'
  | 'Entretenimiento'
  | 'Viajes'
  | 'Mascotas'
  | 'Regalos'
  | 'Impuestos'
  | 'Suscripciones'
  | 'Tecnología'
  | 'Compras'
  | 'Hogar'
  | 'Otros';

export type IncomeCategory =
  | 'Nómina'
  | 'Honorarios'
  | 'Ventas'
  | 'Comisiones'
  | 'Intereses'
  | 'Rendimientos'
  | 'Regalo'
  | 'Reembolso'
  | 'Freelance'
  | 'Bono'
  | 'Otros';

export type Category = ExpenseCategory | IncomeCategory;

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  concept: string;
  category: Category;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: number;
}

export interface FilterOptions {
  search: string;
  month: string; // 'all' or 'YYYY-MM'
  category: string; // 'all' or specific
  type: string; // 'all' | 'ingreso' | 'gasto'
  paymentMethod: string; // 'all' or specific
}

export interface SummaryStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyBalance: number;
  transactionCount: number;
  dailyAverageExpense: number;
  largestExpense: Transaction | null;
  largestIncome: Transaction | null;
}

export type ViewTab = 'dashboard' | 'historial' | 'nuevo' | 'resumen' | 'configuracion';

export interface CategoryBudget {
  category: ExpenseCategory;
  monthlyLimit: number;
}

export interface AssistantPendingTransaction {
  type: TransactionType;
  amount: number;
  concept: string;
  category: Category;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  action?: 'NONE' | 'ASK_MISSING' | 'PREVIEW_CONFIRM' | 'RECORD_DIRECT' | 'OUT_OF_SCOPE' | 'PURCHASE_EVALUATION';
  pendingTransaction?: AssistantPendingTransaction;
  isRiskyPurchase?: boolean;
  riskReason?: string;
  confirmed?: boolean;
  cancelled?: boolean;
}
