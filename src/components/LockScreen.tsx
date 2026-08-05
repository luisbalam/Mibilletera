import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Lock, Fingerprint, Delete, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { verifyPin, authenticateBiometrics, getSecuritySettings } from '../services/security';

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAuthenticatingBio, setIsAuthenticatingBio] = useState<boolean>(false);
  const settings = getSecuritySettings();

  const handleBiometrics = useCallback(async () => {
    if (!settings.isBiometricsEnabled) return;
    setIsAuthenticatingBio(true);
    setErrorMsg(null);
    try {
      const success = await authenticateBiometrics();
      if (success) {
        onUnlock();
      } else {
        setErrorMsg('Autenticación biométrica no reconocida.');
      }
    } catch {
      setErrorMsg('No se pudo verificar la huella o Face ID.');
    } finally {
      setIsAuthenticatingBio(false);
    }
  }, [onUnlock, settings.isBiometricsEnabled]);

  // Attempt automatic biometrics prompt when lock screen mounts if biometrics enabled
  useEffect(() => {
    if (settings.isBiometricsEnabled) {
      const timer = setTimeout(() => {
        handleBiometrics();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [handleBiometrics, settings.isBiometricsEnabled]);

  const handleKeyPress = (digit: string) => {
    setErrorMsg(null);
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);

      if (newPin.length === 4) {
        setTimeout(() => {
          if (verifyPin(newPin)) {
            onUnlock();
          } else {
            setErrorMsg('PIN incorrecto. Inténtalo de nuevo.');
            setPin('');
          }
        }, 150);
      }
    }
  };

  const handleDelete = () => {
    setErrorMsg(null);
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col items-center justify-between p-6 sm:p-10 select-none animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col items-center text-center pt-8 space-y-3">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
          <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center">
            <Lock className="w-8 h-8 text-emerald-400" />
          </div>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Mi Billetera Bloqueada
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Ingresa tu PIN de 4 dígitos o usa tu huella / Face ID para acceder
          </p>
        </div>
      </div>

      {/* PIN Dots Display */}
      <div className="my-auto flex flex-col items-center space-y-4">
        <div className="flex items-center gap-4">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-emerald-400 scale-125 shadow-lg shadow-emerald-400/50'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {errorMsg ? (
          <p className="text-xs font-semibold text-rose-400 flex items-center gap-1.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </p>
        ) : (
          <p className="text-[11px] text-slate-500 font-medium">
            Datos protegidos con cifrado local
          </p>
        )}
      </div>

      {/* Keypad */}
      <div className="w-full max-w-xs space-y-4 pb-6">
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleKeyPress(digit)}
              className="h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-slate-700 border border-slate-800/80 text-xl font-bold text-white transition-all duration-150 flex items-center justify-center active:scale-95 cursor-pointer"
            >
              {digit}
            </button>
          ))}

          {/* Biometrics button */}
          <button
            onClick={handleBiometrics}
            disabled={!settings.isBiometricsEnabled || isAuthenticatingBio}
            className={`h-16 rounded-2xl border transition-all duration-150 flex items-center justify-center cursor-pointer ${
              settings.isBiometricsEnabled
                ? 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-800/60 text-emerald-400 active:scale-95'
                : 'bg-slate-900/40 border-slate-800/40 text-slate-600 opacity-40 cursor-not-allowed'
            }`}
            title="Usar Face ID / Huella Dactilar"
          >
            <Fingerprint className={`w-7 h-7 ${isAuthenticatingBio ? 'animate-pulse' : ''}`} />
          </button>

          {/* Key 0 */}
          <button
            onClick={() => handleKeyPress('0')}
            className="h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-slate-700 border border-slate-800/80 text-xl font-bold text-white transition-all duration-150 flex items-center justify-center active:scale-95 cursor-pointer"
          >
            0
          </button>

          {/* Delete key */}
          <button
            onClick={handleDelete}
            className="h-16 rounded-2xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 text-slate-400 hover:text-white transition-all duration-150 flex items-center justify-center active:scale-95 cursor-pointer"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
