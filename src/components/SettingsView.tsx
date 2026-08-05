import React, { useRef, useState } from 'react';
import {
  Sun,
  Moon,
  DollarSign,
  Download,
  Upload,
  RefreshCw,
  Bell,
  Shield,
  Smartphone,
  Cloud,
  Database,
  Receipt,
  CreditCard,
  Target,
  Sparkles,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Transaction } from '../types';
import { exportToJSON, exportToCSV } from '../services/storage';

interface SettingsViewProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  transactions: Transaction[];
  onResetSampleData: () => void;
  onImportData: (txs: Transaction[]) => void;
  onShowMessage: (msg: string, type?: 'success' | 'info') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  onToggleTheme,
  transactions,
  onResetSampleData,
  onImportData,
  onShowMessage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const handleExportJSON = () => {
    exportToJSON(transactions);
    onShowMessage('Respaldo descargado en formato JSON correctamente.', 'success');
  };

  const handleExportCSV = () => {
    exportToCSV(transactions);
    onShowMessage('Historial exportado a CSV en Pesos Mexicanos (MXN).', 'success');
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportData(parsed);
          onShowMessage('¡Datos importados con éxito!', 'success');
        } else {
          onShowMessage('Formato de archivo inválido.', 'info');
        }
      } catch {
        onShowMessage('Error al leer el archivo JSON.', 'info');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Ajustes & Configuración
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Personaliza tu experiencia, gestiona respaldos y conoce la arquitectura
        </p>
      </div>

      {/* 1. Theme & Currency */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          Preferencias de la Aplicación
        </h3>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {/* Theme Toggle */}
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-semibold text-xs text-slate-900 dark:text-white">Tema Visual</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {theme === 'dark' ? 'Modo Oscuro activado' : 'Modo Claro activado'}
                </p>
              </div>
            </div>

            <button
              onClick={onToggleTheme}
              id="settings-theme-btn"
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
            >
              Cambiar a {theme === 'dark' ? 'Claro' : 'Oscuro'}
            </button>
          </div>

          {/* Currency */}
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                $
              </div>
              <div>
                <p className="font-semibold text-xs text-slate-900 dark:text-white">Moneda Principal</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Pesos Mexicanos (MXN)</p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/20">
              MXN ($1,250.50)
            </span>
          </div>

          {/* Notifications Toggle */}
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-xs text-slate-900 dark:text-white">Notificaciones & Recordatorios</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">PWA push / Recordatorios de pago</p>
              </div>
            </div>

            <button
              onClick={() => {
                setNotificationsEnabled(!notificationsEnabled);
                onShowMessage(
                  !notificationsEnabled
                    ? 'Notificaciones preparadas para la versión PWA.'
                    : 'Notificaciones desactivadas.',
                  'info'
                );
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                notificationsEnabled
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {notificationsEnabled ? 'Activadas' : 'Activar'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Data Backup & Restore */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          Gestión de Datos & Respaldos
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleExportJSON}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-left flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-900 dark:text-white">Exportar JSON</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Descargar copia de seguridad completa</p>
            </div>
          </button>

          <button
            onClick={handleExportCSV}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-left flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-900 dark:text-white">Exportar Excel (CSV)</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Reporte de movimientos para hojas de cálculo</p>
            </div>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-left flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-900 dark:text-white">Importar Datos</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Cargar archivo JSON de respaldo</p>
            </div>
          </button>

          <button
            onClick={() => {
              onResetSampleData();
              onShowMessage('Se han restaurado los datos de prueba en MXN.', 'success');
            }}
            className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all text-left flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-amber-700 dark:text-amber-300">Restablecer Datos de Prueba</p>
              <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80">Recargar movimientos de demostración en MXN</p>
            </div>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* 3. Future Architecture Showcase */}
      <div className="p-5 rounded-3xl bg-slate-900 text-white space-y-4 shadow-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-sm sm:text-base">
            Arquitectura Preparada para Futuras Versiones
          </h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Esta aplicación está diseñada modularmente con la capa de repositorio limpia, permitiendo conectar sin esfuerzo:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
          {[
            { name: 'LocalStorage / SQLite', desc: 'Persistencia nativa offline', icon: Database },
            { name: 'Firebase / Supabase', desc: 'Sincronización en la nube', icon: Cloud },
            { name: 'Escaneo OCR', desc: 'Lectura inteligente de tickets', icon: Receipt },
            { name: 'Presupuestos & Metas', desc: 'Control de ahorro automático', icon: Target },
            { name: 'Biometría / Face ID', desc: 'Bloqueo PIN o Huella dactilar', icon: Shield },
            { name: 'PWA Nativa', desc: 'Instalable en iOS & Android', icon: Smartphone },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1"
              >
                <Icon className="w-4 h-4 text-emerald-400" />
                <p className="font-bold text-xs">{item.name}</p>
                <p className="text-[10px] text-slate-400">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* App Info Footer */}
      <div className="text-center py-4 space-y-1 text-slate-400 dark:text-slate-500 text-xs">
        <p className="font-semibold text-slate-700 dark:text-slate-300">Mi Billetera v1.0.0 — MXN</p>
        <p className="text-[11px]">Diseño Senior Full Stack • React + TypeScript + Tailwind CSS</p>
      </div>
    </div>
  );
};
