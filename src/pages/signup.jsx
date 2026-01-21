import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google'; // Standard Component
import { jwtDecode } from "jwt-decode";
import '../styles/login.css';

const Signup = () => {
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSuccess = async (credentialResponse) => {
    setError('');
    
    try {
      // 1. Decode locally for debugging (optional)
      const decoded = jwtDecode(credentialResponse.credential);
      console.log("User:", decoded);

      // 2. Send to unified authentication endpoint
      const response = await fetch('http://localhost:4000/api/auth/authenticate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            token: credentialResponse.credential 
          })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Save token and user info to localStorage
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/');
      } else {
        setError(data.message || "Authentication failed");
      }

    } catch (err) {
      console.error(err);
      setError("Server connection failed.");
    }
  };

  const handleError = () => {
    setError("Google authentication failed.");
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
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '16px' }}>
          <GoogleLogin 
            onSuccess={handleSuccess} 
            onError={handleError}
            theme="filled_blue"
            size="large"
            shape="rectangular"
            text="continue_with"
            width="320"
            useOneTap
          />
        </div>

        <div className="footer-links">
          <span>Sign in or sign up with Google</span>
        </div>
      </div>
    </div>
  );
};

export default Signup;