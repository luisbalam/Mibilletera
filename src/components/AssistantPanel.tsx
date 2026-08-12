import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  AlertTriangle, 
  CheckCircle, 
  Sparkles, 
  RefreshCw, 
  DollarSign, 
  Calendar, 
  Tag, 
  CreditCard,
  Camera,
  Mic,
  FileAudio,
  Trash2,
  StopCircle,
  Paperclip
} from 'lucide-react';
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

interface AttachedMedia {
  type: 'image' | 'audio';
  previewUrl: string;
  base64: string;
  mimeType: string;
  fileName: string;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const getSupportedAudioMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  const types = ['audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav'];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return 'audio/webm';
};

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

  // Multimodal state
  const [attachedMedia, setAttachedMedia] = useState<AttachedMedia | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  const userName = 'Luis';

  // Clear memory on open / close
  useEffect(() => {
    if (isOpen) {
      setMessages([
        {
          id: 'welcome-' + Date.now(),
          sender: 'assistant',
          text: `¡Hola ${userName}! 👋 Soy tu Asistente Financiero de Mi Billetera. Puedes escribirme, enviarme una foto de tu ticket/recibo o usar una nota de voz. ¿En qué te ayudo hoy?`,
          timestamp: Date.now(),
        },
      ]);
      setInputText('');
      setAttachedMedia(null);
      setIsRecording(false);
    } else {
      setMessages([]);
      if (isRecording) {
        cancelRecording();
      }
    }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing, attachedMedia, isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  if (!isOpen) return null;

  // File Handlers
  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await blobToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      setAttachedMedia({
        type: 'image',
        previewUrl,
        base64,
        mimeType: file.type || 'image/jpeg',
        fileName: file.name || 'Ticket_Gasto.jpg',
      });
      showToast('Imagen de ticket/recibo cargada', 'success');
    } catch (err) {
      showToast('Error al procesar la imagen', 'info');
    }
    e.target.value = '';
  };

  const handleAudioSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await blobToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      setAttachedMedia({
        type: 'audio',
        previewUrl,
        base64,
        mimeType: file.type || 'audio/mp3',
        fileName: file.name || 'Nota_de_voz.mp3',
      });
      showToast('Audio de gasto cargado', 'success');
    } catch (err) {
      showToast('Error al procesar el archivo de audio', 'info');
    }
    e.target.value = '';
  };

  // Recording Handlers
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('El micrófono no está disponible en este navegador.', 'info');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size > 0) {
          const base64 = await blobToBase64(audioBlob);
          const previewUrl = URL.createObjectURL(audioBlob);
          setAttachedMedia({
            type: 'audio',
            previewUrl,
            base64,
            mimeType,
            fileName: 'Nota_de_voz_grabada.webm',
          });
          showToast('Nota de voz lista para enviar', 'success');
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(200);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error al acceder al micrófono:', err);
      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
        showToast('Permiso de micrófono denegado. Permite el acceso o sube un archivo de audio con 📎', 'info');
      } else {
        showToast('No se pudo acceder al micrófono. Intenta subir tu nota de voz con el botón 📎', 'info');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      if ((mediaRecorderRef.current as any).stream) {
        (mediaRecorderRef.current as any).stream.getTracks().forEach((t: any) => t.stop());
      }
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      showToast('Grabación cancelada', 'info');
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if ((!text && !attachedMedia) || isProcessing) return;

    let mediaInput = undefined;
    let userMediaAttachment = undefined;

    if (attachedMedia) {
      mediaInput = {
        type: attachedMedia.type,
        base64: attachedMedia.base64,
        mimeType: attachedMedia.mimeType,
        fileName: attachedMedia.fileName,
      };

      userMediaAttachment = {
        type: attachedMedia.type,
        url: attachedMedia.previewUrl,
        name: attachedMedia.fileName,
        mimeType: attachedMedia.mimeType,
      };
    }

    const displayText = text || (
      attachedMedia?.type === 'image'
        ? '📷 [Imagen de gasto o ticket adjunta]'
        : '🎙️ [Nota de voz enviada]'
    );

    const userMsg: AssistantMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: displayText,
      timestamp: Date.now(),
      mediaAttachment: userMediaAttachment,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setAttachedMedia(null);
    setIsProcessing(true);

    try {
      const result = await askAssistant(text, messages, transactions, stats, mediaInput);

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
          text: `Hola ${userName}, no pude procesar tu solicitud en este momento. Por favor inténtalo de nuevo.`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmTransaction = async (msgId: string, pendingTx: AssistantPendingTransaction) => {
    if (processingTxId) return;
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

      // Success message using person's name
      setMessages(prev => [
        ...prev,
        {
          id: 'conf-done-' + Date.now(),
          sender: 'assistant',
          text: `¡Listo, ${userName}! ✅ Se ha guardado correctamente tu ${pendingTx.type === 'ingreso' ? 'ingreso' : 'gasto'} de ${formatMXN(pendingTx.amount)} ("${pendingTx.concept}") en la categoría "${pendingTx.category}".\n\nTu Dashboard, Movimientos, Presupuesto disponible y Gráficas han sido actualizados en tiempo real.`,
          timestamp: Date.now(),
        },
      ]);

      showToast(`¡Movimiento guardado con éxito, ${userName}!`, 'success');
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
        text: `Entendido, ${userName}. He cancelado la operación y no he guardado ningún cambio.`,
        timestamp: Date.now(),
      },
    ]);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-slate-950/50 backdrop-blur-xs transition-opacity animate-fade-in">
      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Main Drawer Container */}
      <div className="w-full sm:w-[440px] max-w-full h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-left">
        
        {/* Header */}
        <div className="pt-[max(1rem,env(safe-area-inset-top,16px))] pb-3.5 px-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <Bot className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2 leading-tight">
                ASISTENTE
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  MULTIMODAL IA
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Hola {userName}, ¿qué deseas registrar o consultar?
              </p>
            </div>
          </div>

          <button
            onClick={(e) => {
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
                  {/* Render attached media in message if present */}
                  {msg.mediaAttachment && (
                    <div className="mb-2">
                      {msg.mediaAttachment.type === 'image' ? (
                        <div className="rounded-xl overflow-hidden border border-white/20 bg-black/20 max-h-48">
                          <img
                            src={msg.mediaAttachment.url}
                            alt="Ticket o Recibo"
                            className="w-full h-auto max-h-48 object-contain"
                          />
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl bg-black/20 border border-white/20 flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-white/90">
                            <FileAudio className="w-4 h-4 text-emerald-300" />
                            <span className="truncate max-w-[180px]">{msg.mediaAttachment.name}</span>
                          </div>
                          <audio
                            src={msg.mediaAttachment.url}
                            controls
                            className="w-full h-7 mt-1 rounded"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Confirmation Preview Card if pending transaction to record */}
                  {msg.action === 'PREVIEW_CONFIRM' && pendingTx && Number(pendingTx.amount) > 0 && pendingTx.concept && !msg.confirmed && !msg.cancelled && (
                    <div className="mt-3 p-3 rounded-xl bg-white dark:bg-slate-950 border border-emerald-500/30 text-slate-900 dark:text-slate-100 space-y-2.5 shadow-xs">
                      {msg.isRiskyPurchase && (
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-2 text-xs font-semibold">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Atención {userName}: Impacta tu saldo o presupuesto.</span>
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
              <span>Procesando solicitud de {userName}...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom,16px))] border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md shrink-0 space-y-2">
          
          {/* Quick prompt suggestions if not recording or attaching */}
          {!attachedMedia && !isRecording && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
              <button
                onClick={() => handleSend('¿Cuánto dinero tengo?')}
                className="px-2.5 py-1 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap cursor-pointer shrink-0"
              >
                ¿Cuánto dinero tengo?
              </button>
              <button
                onClick={() => imageInputRef.current?.click()}
                className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1 font-semibold"
              >
                <Camera className="w-3 h-3" />
                Subir Ticket
              </button>
              <button
                onClick={startRecording}
                className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1 font-semibold"
              >
                <Mic className="w-3 h-3" />
                Grabar Voz
              </button>
            </div>
          )}

          {/* Attached Media Preview Box */}
          {attachedMedia && (
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/30 flex items-center justify-between gap-3 shadow-sm animate-fade-in">
              <div className="flex items-center gap-2.5 overflow-hidden">
                {attachedMedia.type === 'image' ? (
                  <img
                    src={attachedMedia.previewUrl}
                    alt="Vista previa"
                    className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FileAudio className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {attachedMedia.type === 'image' ? 'Ticket / Recibo listo' : 'Nota de Voz lista'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {attachedMedia.fileName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAttachedMedia(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                title="Quitar archivo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Live Recording UI Box */}
          {isRecording ? (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                <span className="font-bold text-xs text-rose-600 dark:text-rose-400">
                  Grabando audio ({formatTimer(recordingTime)})
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-500 cursor-pointer"
                  title="Cancelar grabación"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1"
                >
                  <StopCircle className="w-4 h-4" />
                  <span>Listo</span>
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-1.5"
            >
              {/* Media input buttons */}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isProcessing}
                className="p-2.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer shrink-0 active:scale-95"
                title="Subir ticket o recibo en foto"
              >
                <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </button>

              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                disabled={isProcessing}
                className="p-2.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer shrink-0 active:scale-95"
                title="Subir archivo de audio"
              >
                <Paperclip className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </button>

              <button
                type="button"
                onClick={startRecording}
                disabled={isProcessing}
                className="p-2.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer shrink-0 active:scale-95"
                title="Grabar nota de voz con micrófono"
              >
                <Mic className="w-4 h-4 text-rose-500" />
              </button>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelected}
                className="hidden"
              />

              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={handleAudioSelected}
                className="hidden"
              />

              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={attachedMedia ? "Añadir nota opcional..." : "Consulta o gasto (texto, imagen o voz)..."}
                disabled={isProcessing}
                id="assistant-input-field"
                className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={(!inputText.trim() && !attachedMedia) || isProcessing}
                id="assistant-send-btn"
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center shrink-0"
                title="Enviar"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
