import { Transaction } from '../types';
import { getCurrentDateStr, getCurrentTimeStr } from '../utils/formatters';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEY = 'mi_billetera_transactions_v1';

/**
 * Initial sample data in MXN for instant demonstration
 */
export const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    type: 'ingreso',
    amount: 24500,
    concept: 'Nómina Quincenal',
    category: 'Nómina',
    date: getCurrentDateStr(),
    time: '09:00',
    paymentMethod: 'Transferencia',
    notes: 'Depósito quincenal de nómina empresa',
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
  },
  {
    id: 'tx-2',
    type: 'gasto',
    amount: 1450.50,
    concept: 'Supermercado Walmart',
    category: 'Alimentos',
    date: getCurrentDateStr(),
    time: '12:30',
    paymentMethod: 'Tarjeta Débito',
    notes: 'Despensa de la semana y fruta',
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
  },
  {
    id: 'tx-3',
    type: 'gasto',
    amount: 850,
    concept: 'Carga de Gasolina Pemex',
    category: 'Gasolina',
    date: getCurrentDateStr(),
    time: '08:15',
    paymentMethod: 'Tarjeta Crédito',
    notes: 'Tanque lleno coche',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: 'tx-4',
    type: 'ingreso',
    amount: 3200,
    concept: 'Proyecto Freelance Web',
    category: 'Freelance',
    date: getPastDateStr(2),
    time: '16:45',
    paymentMethod: 'Transferencia',
    notes: 'Abono cliente por diseño',
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
  },
  {
    id: 'tx-5',
    type: 'gasto',
    amount: 349,
    concept: 'Suscripción Netflix & Spotify',
    category: 'Suscripciones',
    date: getPastDateStr(3),
    time: '10:00',
    paymentMethod: 'Tarjeta Crédito',
    notes: 'Cargo automático mensual',
    createdAt: Date.now() - 1000 * 60 * 60 * 72,
  },
  {
    id: 'tx-6',
    type: 'gasto',
    amount: 680,
    concept: 'Cena Restaurante La Cantina',
    category: 'Restaurantes',
    date: getPastDateStr(4),
    time: '21:30',
    paymentMethod: 'Tarjeta Crédito',
    notes: 'Cena con amigos',
    createdAt: Date.now() - 1000 * 60 * 60 * 96,
  },
  {
    id: 'tx-7',
    type: 'gasto',
    amount: 1200,
    concept: 'Recibo de Luz CFE',
    category: 'Luz',
    date: getPastDateStr(6),
    time: '11:20',
    paymentMethod: 'Transferencia',
    notes: 'Bimestre verano',
    createdAt: Date.now() - 1000 * 60 * 60 * 140,
  },
  {
    id: 'tx-8',
    type: 'ingreso',
    amount: 1500,
    concept: 'Reembolso Gastos Médicos',
    category: 'Reembolso',
    date: getPastDateStr(8),
    time: '14:00',
    paymentMethod: 'Transferencia',
    notes: 'Seguro de gastos médicos',
    createdAt: Date.now() - 1000 * 60 * 60 * 190,
  },
  {
    id: 'tx-9',
    type: 'gasto',
    amount: 450,
    concept: 'Consulta Veterinaria Pelusa',
    category: 'Mascotas',
    date: getPastDateStr(10),
    time: '17:10',
    paymentMethod: 'Efectivo',
    notes: 'Vacuna anual perro',
    createdAt: Date.now() - 1000 * 60 * 60 * 240,
  }
];

function getPastDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Repository interface for storage abstraction (Memory / LocalStorage / Cloud DB)
 */
export interface ITransactionRepository {
  getAll(): Promise<Transaction[]>;
  add(tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction>;
  update(id: string, tx: Partial<Transaction>): Promise<Transaction | null>;
  delete(id: string): Promise<boolean>;
  resetToSampleData(): Promise<Transaction[]>;
  clearAll(): Promise<void>;
  importData(importedTx: Transaction[]): Promise<Transaction[]>;
}

/**
 * In-Memory & LocalStorage Repository
 */
class MemoryTransactionRepository implements ITransactionRepository {
  private transactions: Transaction[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.transactions = JSON.parse(stored);
      } else {
        this.transactions = [...SAMPLE_TRANSACTIONS];
        this.saveToStorage();
      }
    } catch {
      this.transactions = [...SAMPLE_TRANSACTIONS];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.transactions));
    } catch {
      // Memory state fallback
    }
  }

  async getAll(): Promise<Transaction[]> {
    return [...this.transactions].sort((a, b) => {
      const dateA = `${a.date}T${a.time || '00:00'}`;
      const dateB = `${b.date}T${b.time || '00:00'}`;
      return dateB.localeCompare(dateA) || b.createdAt - a.createdAt;
    });
  }

  async add(txData: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const newTx: Transaction = {
      ...txData,
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      createdAt: Date.now(),
    };
    this.transactions.unshift(newTx);
    this.saveToStorage();
    return newTx;
  }

  async update(id: string, updatedFields: Partial<Transaction>): Promise<Transaction | null> {
    const index = this.transactions.findIndex(t => t.id === id);
    if (index === -1) return null;

    this.transactions[index] = {
      ...this.transactions[index],
      ...updatedFields,
    };
    this.saveToStorage();
    return this.transactions[index];
  }

  async delete(id: string): Promise<boolean> {
    const initialLen = this.transactions.length;
    this.transactions = this.transactions.filter(t => t.id !== id);
    const deleted = this.transactions.length < initialLen;
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  async resetToSampleData(): Promise<Transaction[]> {
    this.transactions = [...SAMPLE_TRANSACTIONS];
    this.saveToStorage();
    return this.getAll();
  }

  async clearAll(): Promise<void> {
    this.transactions = [];
    this.saveToStorage();
  }

  async importData(importedTx: Transaction[]): Promise<Transaction[]> {
    if (Array.isArray(importedTx)) {
      this.transactions = importedTx;
      this.saveToStorage();
    }
    return this.getAll();
  }
}

/**
 * Supabase Cloud Storage Repository
 */
class SupabaseTransactionRepository implements ITransactionRepository {
  private fallbackMemory = new MemoryTransactionRepository();

  async getAll(): Promise<Transaction[]> {
    if (!supabase) return this.fallbackMemory.getAll();

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error || !data) {
        console.warn('Supabase fetch error, falling back to local storage:', error?.message);
        return this.fallbackMemory.getAll();
      }

      return data.map(item => ({
        id: item.id,
        type: item.type,
        amount: Number(item.amount),
        concept: item.concept,
        category: item.category,
        date: item.date,
        time: item.time || '00:00',
        paymentMethod: item.payment_method,
        notes: item.notes || '',
        createdAt: Number(item.created_at || Date.now()),
      }));
    } catch (err) {
      console.warn('Supabase error:', err);
      return this.fallbackMemory.getAll();
    }
  }

  async add(txData: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const newTx: Transaction = {
      ...txData,
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      createdAt: Date.now(),
    };

    if (supabase) {
      try {
        await supabase.from('transactions').insert([{
          id: newTx.id,
          type: newTx.type,
          amount: newTx.amount,
          concept: newTx.concept,
          category: newTx.category,
          date: newTx.date,
          time: newTx.time,
          payment_method: newTx.paymentMethod,
          notes: newTx.notes,
          created_at: newTx.createdAt,
        }]);
      } catch (err) {
        console.warn('Supabase insert failed:', err);
      }
    }

    // Always mirror in fallback memory so offline/local state is instant
    await this.fallbackMemory.add(txData);
    return newTx;
  }

  async update(id: string, updatedFields: Partial<Transaction>): Promise<Transaction | null> {
    if (supabase) {
      try {
        const payload: Record<string, any> = {};
        if (updatedFields.type) payload.type = updatedFields.type;
        if (updatedFields.amount !== undefined) payload.amount = updatedFields.amount;
        if (updatedFields.concept) payload.concept = updatedFields.concept;
        if (updatedFields.category) payload.category = updatedFields.category;
        if (updatedFields.date) payload.date = updatedFields.date;
        if (updatedFields.time) payload.time = updatedFields.time;
        if (updatedFields.paymentMethod) payload.payment_method = updatedFields.paymentMethod;
        if (updatedFields.notes !== undefined) payload.notes = updatedFields.notes;

        await supabase.from('transactions').update(payload).eq('id', id);
      } catch (err) {
        console.warn('Supabase update failed:', err);
      }
    }

    return this.fallbackMemory.update(id, updatedFields);
  }

  async delete(id: string): Promise<boolean> {
    if (supabase) {
      try {
        await supabase.from('transactions').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase delete failed:', err);
      }
    }

    return this.fallbackMemory.delete(id);
  }

  async resetToSampleData(): Promise<Transaction[]> {
    if (supabase) {
      try {
        await supabase.from('transactions').delete().neq('id', '');
        for (const sample of SAMPLE_TRANSACTIONS) {
          await supabase.from('transactions').insert([{
            id: sample.id,
            type: sample.type,
            amount: sample.amount,
            concept: sample.concept,
            category: sample.category,
            date: sample.date,
            time: sample.time,
            payment_method: sample.paymentMethod,
            notes: sample.notes,
            created_at: sample.createdAt,
          }]);
        }
      } catch (err) {
        console.warn('Supabase reset failed:', err);
      }
    }

    return this.fallbackMemory.resetToSampleData();
  }

  async clearAll(): Promise<void> {
    if (supabase) {
      try {
        await supabase.from('transactions').delete().neq('id', '');
      } catch (err) {
        console.warn('Supabase clear failed:', err);
      }
    }
    return this.fallbackMemory.clearAll();
  }

  async importData(importedTx: Transaction[]): Promise<Transaction[]> {
    if (supabase && Array.isArray(importedTx)) {
      try {
        for (const tx of importedTx) {
          await supabase.from('transactions').upsert([{
            id: tx.id || 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            type: tx.type,
            amount: tx.amount,
            concept: tx.concept,
            category: tx.category,
            date: tx.date,
            time: tx.time || '00:00',
            payment_method: tx.paymentMethod,
            notes: tx.notes || '',
            created_at: tx.createdAt || Date.now(),
          }]);
        }
      } catch (err) {
        console.warn('Supabase import failed:', err);
      }
    }

    return this.fallbackMemory.importData(importedTx);
  }
}

// Instantiate storage: Use Supabase if configured, otherwise fallback smoothly to local storage
export const transactionRepo: ITransactionRepository = isSupabaseConfigured
  ? new SupabaseTransactionRepository()
  : new MemoryTransactionRepository();

/**
 * Utility to export data to JSON
 */
export function exportToJSON(transactions: Transaction[]) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `Mi_Billetera_Respando_${getCurrentDateStr()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Utility to export data to CSV
 */
export function exportToCSV(transactions: Transaction[]) {
  const headers = ['ID', 'Tipo', 'Monto (MXN)', 'Concepto', 'Categoria', 'Fecha', 'Hora', 'Forma de Pago', 'Notas'];
  const rows = transactions.map(t => [
    t.id,
    t.type === 'ingreso' ? 'Ingreso' : 'Gasto',
    t.amount.toFixed(2),
    `"${t.concept.replace(/"/g, '""')}"`,
    `"${t.category}"`,
    t.date,
    t.time,
    `"${t.paymentMethod}"`,
    `"${(t.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Mi_Billetera_Movimientos_${getCurrentDateStr()}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
