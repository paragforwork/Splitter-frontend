import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { clearLocalSession } from '../lib/authSession.js';

const isTokenValid = () => {
  const token = localStorage.getItem('authToken');
  const user = localStorage.getItem('user');

  // 1. Check if credentials exist
  if (!token || !user) return false;

  try {
    // 2. Decode using the library (Handles all formatting/errors for you)
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;

    // 3. Check if expired
    if (decoded.exp < currentTime) {
      console.log('Token expired - clearing storage');
      clearLocalSession();
      return false;
    }

    return true;
  } catch (error) {
    // Returns false if token is invalid or corrupt
    clearLocalSession();
    return false;
  }
};

const PrivateRoute = () => {
  // Check auth instantly
  const isAuthenticated = isTokenValid();

  // Render or Redirect
  return isAuthenticated ? <Outlet /> : <Navigate to="/signup" replace />;
};

export default PrivateRoute;
