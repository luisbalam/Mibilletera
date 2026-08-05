import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, ViewTab, SummaryStats, TransactionType } from './types';
import { transactionRepo } from './services/storage';
import { getCurrentDateStr, getCurrentTimeStr } from './utils/formatters';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { HistoryView } from './components/HistoryView';
import { SummaryView } from './components/SummaryView';
import { SettingsView } from './components/SettingsView';
import { TransactionModal } from './components/TransactionModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { LockScreen } from './components/LockScreen';
import { Toast } from './components/Toast';
import { getSecuritySettings, syncRemoteSecurityState } from './services/security';
import { ScannedReceiptResult } from './services/ocr';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('mi_billetera_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [currentTab, setCurrentTab] = useState<ViewTab>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // App Security Lock state
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const settings = getSecuritySettings();
    return settings.isLockEnabled && settings.hasPinSet;
  });

  // Check remote cloud security settings on initial load
  useEffect(() => {
    async function checkCloudSecurity() {
      const hasPin = await syncRemoteSecurityState();
      if (hasPin) {
        setIsLocked(true);
      }
    }
    checkCloudSecurity();
  }, []);

  // Receipt Scanner Modal state
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState<boolean>(false);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [defaultModalType, setDefaultModalType] = useState<TransactionType>('gasto');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  // Toast message
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
  }, []);

  // Theme Syncing to document root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('mi_billetera_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Load transactions
  const reloadTransactions = useCallback(async () => {
    setLoading(true);
    const data = await transactionRepo.getAll();
    setTransactions(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    reloadTransactions();
  }, [reloadTransactions]);

  // Calculate Summary Statistics
  const stats = useMemo<SummaryStats>(() => {
    const totalBalance = transactions.reduce((acc, t) => {
      return t.type === 'ingreso' ? acc + t.amount : acc - t.amount;
    }, 0);

    const currentYearMonth = getCurrentDateStr().substring(0, 7);

    const monthlyTransactions = transactions.filter(t => t.date && t.date.startsWith(currentYearMonth));

    const monthlyIncome = monthlyTransactions
      .filter(t => t.type === 'ingreso')
      .reduce((acc, t) => acc + t.amount, 0);

    const monthlyExpense = monthlyTransactions
      .filter(t => t.type === 'gasto')
      .reduce((acc, t) => acc + t.amount, 0);

    const monthlyBalance = monthlyIncome - monthlyExpense;

    // Daily average expense for current month
    const today = new Date();
    const currentDayOfMonth = today.getDate();
    const dailyAverageExpense = currentDayOfMonth > 0 ? monthlyExpense / currentDayOfMonth : 0;

    // Largest expense and income overall
    const expenses = transactions.filter(t => t.type === 'gasto');
    const incomes = transactions.filter(t => t.type === 'ingreso');

    const largestExpense = expenses.length > 0
      ? expenses.reduce((max, t) => (t.amount > max.amount ? t : max), expenses[0])
      : null;

    const largestIncome = incomes.length > 0
      ? incomes.reduce((max, t) => (t.amount > max.amount ? t : max), incomes[0])
      : null;

    return {
      totalBalance,
      monthlyIncome,
      monthlyExpense,
      monthlyBalance,
      transactionCount: transactions.length,
      dailyAverageExpense,
      largestExpense,
      largestIncome,
    };
  }, [transactions]);

  const handleScannedReceipt = (scanned: ScannedReceiptResult) => {
    // Open Transaction Modal populated with scanned values
    setEditingTransaction({
      id: '', // temporary
      type: scanned.type,
      amount: scanned.amount,
      concept: scanned.concept,
      category: scanned.category as any,
      date: scanned.date,
      time: scanned.time,
      paymentMethod: scanned.paymentMethod as any,
      notes: scanned.notes,
      createdAt: Date.now(),
    });
    setDefaultModalType(scanned.type);
    setIsModalOpen(true);
    showToast(`Ticket escaneado: ${scanned.concept} ($${scanned.amount.toFixed(2)} MXN)`, 'success');
  };

  // Handlers
  const handleOpenNewModal = (type: TransactionType = 'gasto') => {
    setEditingTransaction(null);
    setDefaultModalType(type);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setDefaultModalType(tx.type);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (
    txData: Omit<Transaction, 'id' | 'createdAt'>,
    editingId?: string
  ) => {
    if (editingId) {
      await transactionRepo.update(editingId, txData);
      showToast('Movimiento actualizado correctamente.', 'success');
    } else {
      await transactionRepo.add(txData);
      showToast(
        txData.type === 'ingreso' ? '¡Ingreso registrado con éxito!' : 'Gasto registrado con éxito.',
        'success'
      );
    }
    reloadTransactions();
  };

  const handleDeleteRequest = (tx: Transaction) => {
    setTransactionToDelete(tx);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (transactionToDelete) {
      await transactionRepo.delete(transactionToDelete.id);
      showToast('Movimiento eliminado.', 'info');
      setIsDeleteModalOpen(false);
      setTransactionToDelete(null);
      reloadTransactions();
    }
  };

  const handleDuplicate = async (tx: Transaction) => {
    await transactionRepo.add({
      type: tx.type,
      amount: tx.amount,
      concept: `${tx.concept} (Copia)`,
      category: tx.category,
      date: getCurrentDateStr(),
      time: getCurrentTimeStr(),
      paymentMethod: tx.paymentMethod,
      notes: tx.notes,
    });
    showToast('Movimiento duplicado con la fecha de hoy.', 'success');
    reloadTransactions();
  };

  const handleResetSampleData = async () => {
    await transactionRepo.resetToSampleData();
    reloadTransactions();
  };

  const handleImportData = async (importedTxs: Transaction[]) => {
    await transactionRepo.importData(importedTxs);
    reloadTransactions();
  };

  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      {/* Toast alert banner */}
      <Toast
        message={toastMessage?.text || null}
        type={toastMessage?.type}
        onClose={() => setToastMessage(null)}
      />

      {/* Top Navbar */}
      <Navbar
        theme={theme}
        onToggleTheme={toggleTheme}
        totalBalance={stats.totalBalance}
        onOpenNewTransaction={handleOpenNewModal}
        onOpenReceiptScanner={() => setIsReceiptScannerOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 pt-6 pb-20">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500">Cargando Billetera...</p>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                stats={stats}
                recentTransactions={transactions}
                onOpenNewTransaction={handleOpenNewModal}
                onSelectTab={setCurrentTab}
                onEditTransaction={handleOpenEditModal}
                onDeleteTransaction={handleDeleteRequest}
              />
            )}

            {currentTab === 'historial' && (
              <HistoryView
                transactions={transactions}
                onEdit={handleOpenEditModal}
                onDeleteRequest={handleDeleteRequest}
                onDuplicate={handleDuplicate}
                onOpenNewTransaction={() => handleOpenNewModal('gasto')}
              />
            )}

            {currentTab === 'resumen' && (
              <SummaryView
                stats={stats}
                transactions={transactions}
                theme={theme}
              />
            )}

            {currentTab === 'configuracion' && (
              <SettingsView
                theme={theme}
                onToggleTheme={toggleTheme}
                transactions={transactions}
                onResetSampleData={handleResetSampleData}
                onImportData={handleImportData}
                onShowMessage={showToast}
              />
            )}
          </>
        )}
      </main>

      {/* Modal to Add / Edit Transaction */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransaction}
        initialData={editingTransaction}
        defaultType={defaultModalType}
        onOpenScanner={() => {
          setIsModalOpen(false);
          setIsReceiptScannerOpen(true);
        }}
      />

      {/* Modal to Scan Receipt with Gemini AI */}
      <ReceiptScannerModal
        isOpen={isReceiptScannerOpen}
        onClose={() => setIsReceiptScannerOpen(false)}
        onScanned={handleScannedReceipt}
      />

      {/* Modal to Confirm Deletion */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        transaction={transactionToDelete}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTransactionToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />

      {/* Bottom Floating Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenNewTransactionModal={() => handleOpenNewModal('gasto')}
      />
    </div>
  );
}
