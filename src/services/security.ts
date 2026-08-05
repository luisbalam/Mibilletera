/**
 * Security & Biometric Authentication Manager
 * Handles PIN verification, WebAuthn (Face ID / Touch ID / Fingerprint) and lock state.
 */

import { supabase } from './supabase';

const PIN_STORAGE_KEY = 'mi_billetera_pin_hash';
const LOCK_ENABLED_KEY = 'mi_billetera_lock_enabled';
const BIOMETRICS_ENABLED_KEY = 'mi_billetera_biometrics_enabled';
const WEBAUTHN_CREDENTIAL_ID_KEY = 'mi_billetera_webauthn_id';

export interface SecuritySettings {
  isLockEnabled: boolean;
  isBiometricsEnabled: boolean;
  hasPinSet: boolean;
  isBiometricsSupported: boolean;
}

// Check if WebAuthn platform biometrics (Face ID, Touch ID, Fingerprint) is supported
export async function checkBiometricSupport(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// Get current security settings
export function getSecuritySettings(): SecuritySettings {
  const isLockEnabled = localStorage.getItem(LOCK_ENABLED_KEY) === 'true';
  const isBiometricsEnabled = localStorage.getItem(BIOMETRICS_ENABLED_KEY) === 'true';
  const hasPinSet = Boolean(localStorage.getItem(PIN_STORAGE_KEY));

  return {
    isLockEnabled,
    isBiometricsEnabled,
    hasPinSet,
    isBiometricsSupported: typeof window !== 'undefined' && Boolean(window.PublicKeyCredential),
  };
}

// Simple PIN hashing helper for client-side storage
function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'pin_' + Math.abs(hash).toString(16) + '_' + pin.split('').reverse().join('');
}

// Set up a new 4-digit PIN and sync with Supabase Cloud if available
export async function savePin(pin: string): Promise<void> {
  if (pin.length !== 4) throw new Error('El PIN debe constar de 4 dígitos.');
  const hashed = hashPin(pin);
  localStorage.setItem(PIN_STORAGE_KEY, hashed);
  localStorage.setItem(LOCK_ENABLED_KEY, 'true');

  if (supabase) {
    try {
      await supabase.from('app_settings').upsert({
        key: 'master_pin_hash',
        value: hashed,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Could not sync PIN to Supabase:', err);
    }
  }
}

// Fetch remote PIN hash from Supabase if present
export async function syncRemoteSecurityState(): Promise<boolean> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'master_pin_hash')
        .single();

      if (!error && data && data.value) {
        localStorage.setItem(PIN_STORAGE_KEY, data.value);
        localStorage.setItem(LOCK_ENABLED_KEY, 'true');
        return true;
      }
    } catch (err) {
      console.warn('Error fetching remote PIN setting:', err);
    }
  }
  return Boolean(localStorage.getItem(PIN_STORAGE_KEY));
}

// Verify entered 4-digit PIN against local or synced remote hash
export function verifyPin(pin: string): boolean {
  const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
  if (!storedHash) return false;
  return storedHash === hashPin(pin);
}

// Enable/Disable Lock
export function setLockEnabled(enabled: boolean): void {
  localStorage.setItem(LOCK_ENABLED_KEY, enabled ? 'true' : 'false');
}

// Enable/Disable Biometrics
export function setBiometricsEnabled(enabled: boolean): void {
  localStorage.setItem(BIOMETRICS_ENABLED_KEY, enabled ? 'true' : 'false');
}

// Clear all security settings
export function clearSecurity(): void {
  localStorage.removeItem(PIN_STORAGE_KEY);
  localStorage.removeItem(LOCK_ENABLED_KEY);
  localStorage.removeItem(BIOMETRICS_ENABLED_KEY);
  localStorage.removeItem(WEBAUTHN_CREDENTIAL_ID_KEY);
}

// Register WebAuthn Biometrics (Face ID / Fingerprint / Touch ID)
export async function registerBiometrics(): Promise<boolean> {
  if (!window.PublicKeyCredential) {
    throw new Error('Tu navegador no soporta autenticación biométrica WebAuthn.');
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const userID = new Uint8Array(16);
  window.crypto.getRandomValues(userID);

  const createOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: 'Mi Billetera App',
      id: window.location.hostname || 'localhost',
    },
    user: {
      id: userID,
      name: 'usuario@mibilletera',
      displayName: 'Usuario Mi Billetera',
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' }, // ES256
      { alg: -257, type: 'public-key' }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Face ID / Touch ID / Fingerprint
      userVerification: 'required',
    },
    timeout: 60000,
  };

  try {
    const credential = (await navigator.credentials.create({
      publicKey: createOptions,
    })) as PublicKeyCredential;

    if (credential) {
      const credIdBase64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      localStorage.setItem(WEBAUTHN_CREDENTIAL_ID_KEY, credIdBase64);
      setBiometricsEnabled(true);
      return true;
    }
    return false;
  } catch (err: any) {
    console.warn('Error al registrar biométricos:', err);
    throw new Error(err?.message || 'Se canceló o falló el registro de la huella/Face ID.');
  }
}

// Authenticate via WebAuthn Biometrics (Face ID / Fingerprint / Touch ID)
export async function authenticateBiometrics(): Promise<boolean> {
  if (!window.PublicKeyCredential) {
    throw new Error('Biometría no soportada en este dispositivo.');
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const credIdBase64 = localStorage.getItem(WEBAUTHN_CREDENTIAL_ID_KEY);
  let allowCredentials: PublicKeyCredentialDescriptor[] = [];

  if (credIdBase64) {
    const rawId = Uint8Array.from(atob(credIdBase64), c => c.charCodeAt(0));
    allowCredentials = [
      {
        id: rawId,
        type: 'public-key',
      },
    ];
  }

  const getOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    timeout: 60000,
    userVerification: 'required',
    allowCredentials,
  };

  try {
    const assertion = await navigator.credentials.get({
      publicKey: getOptions,
    });
    return Boolean(assertion);
  } catch (err: any) {
    console.warn('Error en autenticación biométrica:', err);
    return false;
  }
}
