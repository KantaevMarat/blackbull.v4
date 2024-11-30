// src/components/LoadingSpinner.js
import React from 'react';
import './css/LoadingSpinner.css'; // Стили для загрузки

const LoadingSpinner = () => {
  return (
    <div className="spinner-container">
      <div className="loading-spinner"></div>
    </div>
  );
};

export default LoadingSpinner;
