import { Transaction, SummaryStats, AssistantMessage, AssistantPendingTransaction } from '../types';
import { getCurrentDateStr, getCurrentTimeStr } from '../utils/formatters';
import { getAllBudgetStatuses } from './budget';

export interface AssistantApiResponse {
  reply: string;
  action: 'NONE' | 'ASK_MISSING' | 'PREVIEW_CONFIRM' | 'RECORD_DIRECT' | 'OUT_OF_SCOPE' | 'PURCHASE_EVALUATION';
  pendingTransaction?: AssistantPendingTransaction;
  isRiskyPurchase?: boolean;
  riskReason?: string;
}

export async function askAssistant(
  userMessage: string,
  history: AssistantMessage[],
  transactions: Transaction[],
  stats: SummaryStats
): Promise<AssistantApiResponse> {
  try {
    // Calculate per-account balances from actual transactions
    const paymentMethods = ['Efectivo', 'Tarjeta Débito', 'Tarjeta Crédito', 'Transferencia', 'Otro'];
    const accountBalances = paymentMethods.map(pm => {
      const balance = transactions
        .filter(t => t.paymentMethod === pm)
        .reduce((sum, t) => (t.type === 'ingreso' ? sum + t.amount : sum - t.amount), 0);
      return { name: pm, balance };
    });

    const budgets = getAllBudgetStatuses(transactions);

    const categories = [
      'Alimentos', 'Restaurantes', 'Transporte', 'Gasolina', 'Servicios',
      'Luz', 'Agua', 'Internet', 'Teléfono', 'Renta', 'Hipoteca', 'Salud',
      'Medicinas', 'Consultas', 'Educación', 'Ropa', 'Entretenimiento', 'Viajes',
      'Mascotas', 'Regalos', 'Impuestos', 'Suscripciones', 'Tecnología',
      'Compras', 'Hogar', 'Otros'
    ];

    // Format top 30 recent transactions for concise AI context
    const recentTransactions = transactions.slice(0, 30).map(t => ({
      type: t.type,
      amount: t.amount,
      concept: t.concept,
      category: t.category,
      date: t.date,
      paymentMethod: t.paymentMethod,
    }));

    const transientHistory = history.slice(-6).map(m => ({
      role: m.sender,
      content: m.text,
    }));

    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage,
        history: transientHistory,
        context: {
          currentDate: getCurrentDateStr(),
          totalBalance: stats.totalBalance,
          accountBalances,
          monthlyStats: {
            monthlyIncome: stats.monthlyIncome,
            monthlyExpense: stats.monthlyExpense,
            monthlyBalance: stats.monthlyBalance,
          },
          budgets,
          categories,
          recentTransactions,
        },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al comunicarse con el servicio del asistente.');
    }

    const json = await response.json();
    if (json.success && json.data) {
      return json.data as AssistantApiResponse;
    }

    throw new Error('Respuesta inválida del asistente.');
  } catch (error: any) {
    console.error('Error al consultar el asistente AI:', error);
    return {
      reply: 'No pude procesar tu solicitud en este momento. Por favor verifica tu conexión e inténtalo nuevamente.',
      action: 'NONE',
    };
  }
}
