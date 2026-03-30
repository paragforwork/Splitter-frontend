import React from 'react';
import '../styles/loadingSpinner.css';

const LoadingSpinner = ({ fullScreen = false }) => {
  return (
    <div
      className={fullScreen ? 'spinner-screen' : 'spinner-inline'}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="app-spinner" />
    </div>
  );
};

export default LoadingSpinner;
