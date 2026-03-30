import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { clearResolvedApiBase } from './apiBase.js';

export const clearLocalSession = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  clearResolvedApiBase();
};

export const logoutEverywhere = async () => {
  clearLocalSession();
  if (!Capacitor.isNativePlatform()) return;
  try {
    await FirebaseAuthentication.signOut();
  } catch {
    // Keep local logout deterministic even if provider signout fails.
  }
};
