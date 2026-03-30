import { Capacitor } from '@capacitor/core';

const trimBase = (value) => String(value || '').trim().replace(/\/+$/, '');
const RESOLVED_API_KEY = 'resolvedApiBaseUrl';
const MANUAL_API_KEY = 'apiBaseUrl';
const DEFAULT_PORTS = [4000];
const PRIMARY_PORT = DEFAULT_PORTS[0];

const getStoredBase = () => trimBase(localStorage.getItem(RESOLVED_API_KEY));
const getManualBase = () => trimBase(localStorage.getItem(MANUAL_API_KEY));
const getEnvFallbacks = () =>
  String(import.meta.env.VITE_API_FALLBACK_URLS || '')
    .split(',')
    .map(trimBase)
    .filter(Boolean);

export const setResolvedApiBase = (base) => {
  const cleaned = trimBase(base);
  if (!cleaned) return;
  localStorage.setItem(RESOLVED_API_KEY, cleaned);
};

export const clearResolvedApiBase = () => {
  localStorage.removeItem(RESOLVED_API_KEY);
};

export const getApiBase = () => {
  const envBase = trimBase(import.meta.env.VITE_API_BASE_URL);
  if (envBase) return envBase;

  const manualBase = getManualBase();
  if (manualBase) return manualBase;

  const storedBase = getStoredBase();
  if (storedBase) return storedBase;

  if (Capacitor.isNativePlatform()) {
    // Prefer localhost on native; works on physical devices with adb reverse,
    // and emulator fallback is handled by candidate probing in request bridge.
    return `http://localhost:${PRIMARY_PORT}`;
  }

  return `http://localhost:${PRIMARY_PORT}`;
};

export const getApiBaseCandidates = () => {
  const envBase = trimBase(import.meta.env.VITE_API_BASE_URL);
  const envFallbacks = getEnvFallbacks();
  const manualBase = getManualBase();
  const storedBase = getStoredBase();
  const candidates = [];
  const isNative = Capacitor.isNativePlatform();

  if (envBase) candidates.push(envBase);
  candidates.push(...envFallbacks);
  if (manualBase) candidates.push(manualBase);
  if (storedBase) candidates.push(storedBase);

  if (isNative) {
    for (const port of DEFAULT_PORTS) {
      candidates.push(`http://localhost:${port}`); // Works on emulator/phone when adb reverse is configured
      candidates.push(`http://10.0.2.2:${port}`); // Android emulator -> host fallback
    }
  } else {
    for (const port of DEFAULT_PORTS) {
      candidates.push(`http://localhost:${port}`);
    }
  }

  return [...new Set(candidates.map(trimBase).filter(Boolean))];
};
