import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, AlertTriangle, CheckCircle, ShieldAlert, Sparkles, RefreshCw, DollarSign, Calendar, Tag, CreditCard } from 'lucide-react';
import { Transaction, SummaryStats, AssistantMessage, AssistantPendingTransaction } from '../types';
import { askAssistant } from '../services/assistant';
import { formatMXN, getCurrentTimeStr } from '../utils/formatters';

interface AssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  stats: SummaryStats;
  onSaveTransaction: (txData: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  showToast: (text: string, type?: 'success' | 'info') => void;
}

export const AssistantPanel: React.FC<AssistantPanelProps> = ({
  isOpen,
  onClose,
  transactions,
  stats,
  onSaveTransaction,
  showToast,
}) => {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingTxId, setProcessingTxId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Clear memory on open / close so NO conversation history is ever stored!
  useEffect(() => {
    if (isOpen) {
      setMessages([
        {
          id: 'welcome-' + Date.now(),
          sender: 'assistant',
          text: '¡Hola! Soy tu Asistente Financiero de Mi Billetera. ¿En qué puedo ayudarte hoy?',
          timestamp: Date.now(),
        },
      ]);
      setInputText('');
    } else {
      setMessages([]);
    }
  }, [isOpen]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isProcessing) return;

    const userMsg: AssistantMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);

    try {
      const result = await askAssistant(text, messages, transactions, stats);

      const assistantMsg: AssistantMessage = {
        id: 'ast-' + Date.now(),
        sender: 'assistant',
        text: result.reply,
        timestamp: Date.now(),
        action: result.action,
        pendingTransaction: result.pendingTransaction,
        isRiskyPurchase: result.isRiskyPurchase,
        riskReason: result.riskReason,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          sender: 'assistant',
          text: 'No pude procesar tu solicitud en este momento. Inténtalo nuevamente.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmTransaction = async (msgId: string, pendingTx: AssistantPendingTransaction) => {
    if (processingTxId) return; // Prevent double click / duplicate submits
    setProcessingTxId(msgId);

    try {
      await onSaveTransaction({
        type: pendingTx.type || 'gasto',
        amount: Number(pendingTx.amount),
        concept: pendingTx.concept,
        category: pendingTx.category as any,
        date: pendingTx.date,
        time: pendingTx.time || getCurrentTimeStr(),
        paymentMethod: (pendingTx.paymentMethod as any) || 'Efectivo',
        notes: pendingTx.notes ? `[Registrado por Asistente] ${pendingTx.notes}` : '[Registrado por Asistente]',
      });

      // Mark message as confirmed
      setMessages(prev =>
        prev.map(m => (m.id === msgId ? { ...m, confirmed: true } : m))
      );

      // Add success message
      setMessages(prev => [
        ...prev,
        {
          id: 'conf-done-' + Date.now(),
          sender: 'assistant',
          text: `✅ ${pendingTx.type === 'ingreso' ? 'Ingreso' : 'Gasto'} de ${formatMXN(pendingTx.amount)} ("${pendingTx.concept}") registrado exitosamente en Mi Billetera.`,
          timestamp: Date.now(),
        },
      ]);

      showToast('Movimiento registrado por el Asistente.', 'success');
    } catch (err) {
      showToast('Error al guardar el movimiento.', 'info');
    } finally {
      setProcessingTxId(null);
    }
  };

  const handleCancelTransaction = (msgId: string) => {
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, cancelled: true } : m))
    );

    setMessages(prev => [
      ...prev,
      {
        id: 'conf-cancel-' + Date.now(),
        sender: 'assistant',
        text: 'Entendido, la operación ha sido cancelada y no se guardó nada en tus datos.',
        timestamp: Date.now(),
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-slate-950/50 backdrop-blur-xs transition-opacity animate-fade-in">
      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Main Drawer Container */}
      <div className="w-full sm:w-[440px] max-w-full h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-left">
        
        {/* Header with Safe Area Top Clearance for iPhone / Mobile */}
        <div className="pt-[max(1rem,env(safe-area-inset-top,16px))] pb-3.5 px-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <Bot className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2 leading-tight">
                ASISTENTE
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  IA
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                ¿En qué puedo ayudarte?
              </p>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 active:scale-95 flex items-center justify-center transition-all cursor-pointer shadow-sm shrink-0 relative z-30"
            title="Cerrar Asistente"
            aria-label="Cerrar Asistente"
            id="close-assistant-btn"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => {
            const isUser = msg.sender === 'user';
            const pendingTx = msg.pendingTransaction;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2`}
              >
                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200/70 dark:border-slate-700/70'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Confirmation Preview Card if pending transaction to record */}
                  {msg.action === 'PREVIEW_CONFIRM' && pendingTx && Number(pendingTx.amount) > 0 && pendingTx.concept && !msg.confirmed && !msg.cancelled && (
                    <div className="mt-3 p-3 rounded-xl bg-white dark:bg-slate-950 border border-emerald-500/30 text-slate-900 dark:text-slate-100 space-y-2.5 shadow-xs">
                      {msg.isRiskyPurchase && (
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-2 text-xs font-semibold">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Atención: Impacta tu saldo o presupuesto.</span>
                        </div>
                      )}

                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                          <span className="font-bold text-slate-500 dark:text-slate-400">Tipo:</span>
                          <span className={`font-black uppercase ${pendingTx.type === 'ingreso' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {pendingTx.type}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" /> Monto:
                          </span>
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            {formatMXN(pendingTx.amount)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Descripción:
                          </span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {pendingTx.concept}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> Fecha:
                          </span>
                          <span className="font-medium">{pendingTx.date}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <CreditCard className="w-3.5 h-3.5" /> Cuenta:
                          </span>
                          <span className="font-medium">{pendingTx.paymentMethod}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5" /> Categoría:
                          </span>
                          <span className="font-medium">{pendingTx.category}</span>
                        </div>
                      </div>

                      {/* Confirmation Action Buttons */}
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          onClick={() => handleCancelTransaction(msg.id)}
                          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleConfirmTransaction(msg.id, pendingTx)}
                          disabled={processingTxId === msg.id}
                          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          {processingTxId === msg.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                          <span>Guardar {pendingTx.type === 'ingreso' ? 'ingreso' : 'gasto'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {msg.confirmed && (
                    <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Registrado en Mi Billetera
                    </div>
                  )}

                  {msg.cancelled && (
                    <div className="mt-2 text-[11px] text-slate-400 font-semibold italic">
                      Cancelado
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 italic p-2">
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>Analizando...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom,16px))] border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md shrink-0">
          {/* Quick prompt suggestions */}
          <div className="mb-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
            <button
              onClick={() => handleSend('¿Cuánto dinero tengo?')}
              className="px-2.5 py-1 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap cursor-pointer shrink-0"
            >
              ¿Cuánto dinero tengo?
            </button>
            <button
              onClick={() => handleSend('¿Cuánto gasté ayer?')}
              className="px-2.5 py-1 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap cursor-pointer shrink-0"
            >
              ¿Cuánto gasté ayer?
            </button>
            <button
              onClick={() => handleSend('¿Cuánto me queda de presupuesto?')}
              className="px-2.5 py-1 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap cursor-pointer shrink-0"
            >
              Presupuestos
            </button>
          </div>

          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Escribe tu consulta o gasto (ej: Hoy gasté $250 en gasolina)..."
              disabled={isProcessing}
              id="assistant-input-field"
              className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isProcessing}
              id="assistant-send-btn"
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center shrink-0"
              title="Enviar consulta"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
