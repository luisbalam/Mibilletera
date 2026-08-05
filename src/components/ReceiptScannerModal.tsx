import React, { useState, useRef } from 'react';
import { X, Upload, Camera, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Receipt } from 'lucide-react';
import { scanReceiptImage, ScannedReceiptResult } from '../services/ocr';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanned: (result: ScannedReceiptResult) => void;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onScanned,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    setErrorMsg(null);
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor selecciona una imagen de ticket válida (JPG, PNG, WEBP).');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleScan = async () => {
    if (!selectedFile) return;

    setIsScanning(true);
    setErrorMsg(null);

    try {
      const result = await scanReceiptImage(selectedFile);
      onScanned(result);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err?.message || 'No se pudo leer el ticket. Intenta con una foto más clara y con buena iluminación.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Escanear Ticket / Recibo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lectura inteligente de gastos con Gemini AI
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isScanning}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {!previewUrl ? (
            /* Upload Box */
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-8 text-center bg-slate-50 dark:bg-slate-800/40 transition-all cursor-pointer space-y-3 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Camera className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  Sube o toma una foto del ticket
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Arrastra tu archivo aquí o haz clic para abrir la cámara/galería
                </p>
              </div>
              <span className="inline-block px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                Soporta JPG, PNG, WEBP
              </span>
            </div>
          ) : (
            /* Preview Box & Scanning Animation */
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 max-h-64 flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Ticket escaneado"
                  className="max-h-64 object-contain"
                />

                {isScanning && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center space-y-3">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <div className="absolute inset-0 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                      <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-white">Analizando ticket con Gemini AI...</p>
                      <p className="text-xs text-slate-400">Extrayendo monto, concepto, categoría y fecha</p>
                    </div>
                  </div>
                )}
              </div>

              {!isScanning && (
                <div className="flex justify-end">
                  <button
                    onClick={handleReset}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Cambiar imagen
                  </button>
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isScanning}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            onClick={handleScan}
            disabled={!selectedFile || isScanning}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
          >
            {isScanning ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Escanear con IA</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
