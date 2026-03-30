import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google'; // Standard Component
import { jwtDecode } from "jwt-decode";
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { getApiBase, getApiBaseCandidates, setResolvedApiBase } from '../lib/apiBase.js';
import '../styles/login.css';

const Signup = () => {
  const [error, setError] = useState('');
  const [nativeLoading, setNativeLoading] = useState(false);
  const navigate = useNavigate();
  const isNativeApp = Capacitor.isNativePlatform();
  const useNativeSignIn = isNativeApp;
  const apiBase = getApiBase();

  const authenticateToken = async (base, token) => {
    const url = `${base}/api/auth/authenticate`;
    if (isNativeApp) {
      const result = await CapacitorHttp.post({
        url,
        headers: { 'Content-Type': 'application/json' },
        data: { token },
        connectTimeout: 8000,
        readTimeout: 8000
      });
      return { ok: result.status >= 200 && result.status < 300, status: result.status, data: result.data };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  };

  const postAuthenticateWithFallback = async (token) => {
    const candidates = getApiBaseCandidates();
    let lastError = null;

    for (const base of candidates) {
      try {
        const result = await authenticateToken(base, token);
        if (!result.ok || !result.data?.success) {
          lastError = new Error(result.data?.message || `Authentication failed (${base})`);
          continue;
        }
        setResolvedApiBase(base);
        return result.data;
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Authentication failed');
  };

  const handleSuccess = async (credentialResponse) => {
    setError('');
    
    try {
      // 1. Decode locally for debugging (optional)
      const decoded = jwtDecode(credentialResponse.credential);
      console.log("User:", decoded);

      // 2. Send to unified authentication endpoint
      const data = await postAuthenticateWithFallback(credentialResponse.credential);
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');

    } catch (err) {
      console.error(err);
      setError(`Server connection failed (${apiBase}).`);
    }
  };

  const handleError = () => {
    setError("Google authentication failed.");
  };

  const handleNativeGoogleSignIn = async () => {
    setError('');
    setNativeLoading(true);
    try {
      await FirebaseAuthentication.signOut();

      const googleAttempts = [
        () => FirebaseAuthentication.signInWithGoogle({ useCredentialManager: false }),
        () => FirebaseAuthentication.signInWithGoogle()
      ];
      let result = null;
      let lastGoogleError = null;
      for (const attempt of googleAttempts) {
        try {
          result = await attempt();
          if (result?.credential?.idToken) break;
        } catch (googleErr) {
          lastGoogleError = googleErr;
        }
      }
      if (!result?.credential?.idToken && lastGoogleError) {
        throw lastGoogleError;
      }

      const idToken = result?.credential?.idToken;
      if (!idToken) {
        throw new Error('Google token not received. Check Android Google Sign-In setup.');
      }

       const data = await postAuthenticateWithFallback(idToken);

      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      console.error(err);
      const message = String(err?.message || '').trim();
      const messageLower = message.toLowerCase();
      const loopbackInMessage = messageLower.includes('127.0.0.1') || messageLower.includes('localhost');
      const isGoogleError10 =
        /^10:?$/i.test(message) ||
        /status[\s:=]+10\b/i.test(message) ||
        /\bcode[\s:=]+10\b/i.test(message) ||
        messageLower.includes('developer error');
      if (isGoogleError10) {
        setError('Google Sign-In error 10: SHA key mismatch in Firebase. Add this SHA1 to Firebase Android app: 5A:15:7F:E6:27:2F:B5:A2:B0:EF:B7:86:32:1D:97:83:D6:2E:AF:00, then download new google-services.json and sync Android.');
      } else if (
        message === '7:' ||
        message.startsWith('7:') ||
        messageLower.includes('network error') ||
        messageLower.includes('sign_in_failed')
      ) {
        setError('Google Sign-In failed due to Google Play network/auth issue (code 7). Check internet on the device, enable automatic date/time, update Google Play Services, then try again.');
      } else if (loopbackInMessage) {
        setError('Cannot reach backend from Android loopback. For physical phone, run: adb -s <deviceId> reverse tcp:4000 tcp:4000. For emulator, ensure backend is running and 10.0.2.2:4000 is reachable.');
      } else if (messageLower.includes('failed to fetch') || messageLower.includes('network request failed')) {
        setError('Cannot reach backend. Start server on port 4000 and ensure emulator/device can access your machine.');
      } else {
        setError(err.message || `Native Google sign-in failed. Check Firebase setup/server URL (${apiBase}) and ensure Play Services is available.`);
      }
    } finally {
      setNativeLoading(false);
    }
  };

  return (
    <div className="login-container">
      
      {/* BRANDING: Visual center of the top half (Unchanged) */}
      <div className="brand-section">
        <div className="logo-wrapper">
          <img src="/logo.png" alt="App Logo" className="app-logo" />
        </div>
        <h1 className="app-title">Splitter</h1>
        <p className="app-subtitle">Track expenses together.</p>
      </div>

      {/* ACTIONS: Fixed at the bottom for thumb reach */}
      <div className="action-section">
        
        {error && <div className="error-banner">{error}</div>}

        {/* REPLACEMENT: The <button> is replaced by the Google Component.
           We wrap it in a div to maintain your layout spacing.
        */}
        {!useNativeSignIn && (
          <div className="google-login-wrap">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={handleError}
              theme="filled_blue"
              size="large"
              shape="rectangular"
              text="continue_with"
              width="320"
            />
          </div>
        )}

        <div className="footer-links">
          <span>Sign in or sign up with Google</span>
        </div>
        {useNativeSignIn && <p className="native-signin-note">Android app uses native Google login. Server: {apiBase}</p>}
      </div>

      {useNativeSignIn && (
        <div className="native-login-dock">
          <button className="native-google-btn" onClick={handleNativeGoogleSignIn} disabled={nativeLoading}>
            {nativeLoading ? 'Signing in...' : 'Continue with Google'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Signup;
